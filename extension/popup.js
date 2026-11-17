// MV3's default extension-page CSP requires this controller to be external.
(function(){
  var I=window.Invisibles;
  var inEl=document.getElementById('in'),cleanBtn=document.getElementById('clean'),
      copyBtn=document.getElementById('copy'),norm=document.getElementById('norm'),
      summary=document.getElementById('summary'),chips=document.getElementById('chips'),
      out=document.getElementById('out'),delta=document.getElementById('delta'),
      preview=document.getElementById('preview'),drop=document.getElementById('drop'),
      reportBtn=document.getElementById('report'),reportMsg=document.getElementById('reportmsg'),
      hiddenMsg=document.getElementById('hidden-msg'),
      firstrun=document.getElementById('firstrun'),dismissHint=document.getElementById('dismiss-hint');

  var REVEAL_LIMIT=20000;
  var FILE_MAX_BYTES=5*1024*1024;

  // Categories the user toggled OFF; they stay in the text when cleaning.
  var skipped=[];

  function esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function storageGet(keys, done){
    try{
      if(typeof chrome!=='undefined'&&chrome.storage&&chrome.storage.sync){
        chrome.storage.sync.get(keys,function(data){
          if(chrome.runtime.lastError&&chrome.storage.local){
            chrome.storage.local.get(keys,done);
          }else done(data||{});
        });
        return;
      }
    }catch(_){}
    done({});
  }

  function storageSet(values){
    try{
      if(typeof chrome!=='undefined'&&chrome.storage&&chrome.storage.sync){
        chrome.storage.sync.set(values,function(){
          if(chrome.runtime.lastError&&chrome.storage.local) chrome.storage.local.set(values);
        });
      }
    }catch(_){}
  }

  // Joiners and selectors inside emoji are kept on purpose; say so, so a
  // "Clean." verdict on text full of emoji reads as deliberate.
  function emojiNote(r){
    var n=r.emojiKept||0;
    return n?' Kept '+n+' character'+(n>1?'s':'')+' that hold'+(n>1?'':'s')+' emoji together.':'';
  }

  function setSummary(text,verdictClass,verdictText,rest){
    summary.replaceChildren();
    if(!text&&!verdictText){
      summary.textContent='Paste or drop text to scan for hidden characters.';
      return;
    }
    if(verdictText){
      var v=document.createElement('span');
      v.className='verdict '+verdictClass;
      v.textContent=verdictText;
      summary.appendChild(v);
      summary.appendChild(document.createTextNode((rest||'')+emojiNote(I.scan(text))));
    }
  }

  // Text hidden inside tag characters or variation selectors, decoded and shown
  // as plain text so it can be read. Built with textContent: it is untrusted.
  var KIND={tag:'tag characters',selector:'variation selectors'};
  function renderHidden(el,text){
    var hits=text?I.decodeHidden(text):[];
    el.replaceChildren();
    el.hidden=!hits.length;
    hits.slice(0,3).forEach(function(h){
      var p=document.createElement('p'),q=document.createElement('q');
      p.textContent='Hidden text in '+KIND[h.kind]+': ';
      q.textContent=h.text.length>300?h.text.slice(0,300)+'...':h.text;
      p.appendChild(q);
      el.appendChild(p);
    });
    if(hits.length>3){
      var more=document.createElement('p');
      more.textContent='and '+(hits.length-3)+' more.';
      el.appendChild(more);
    }
  }

  function renderChips(r){
    chips.replaceChildren();
    var cats=Object.keys(r.counts).sort();
    cats.forEach(function(c){
      var btn=document.createElement('button');
      btn.type='button';
      btn.className='chip';
      btn.setAttribute('data-cat',c);
      btn.setAttribute('aria-pressed',skipped.indexOf(c)===-1?'true':'false');
      btn.title=I.CATEGORIES[c]||c;
      var b=document.createElement('b');
      b.textContent=String(r.counts[c]);
      btn.appendChild(b);
      btn.appendChild(document.createTextNode(' '+(I.CATEGORIES[c]||c).split(': ')[0]));
      chips.appendChild(btn);
    });
  }

  function render(){
    var text=inEl.value,r=I.scan(text);
    renderHidden(hiddenMsg,r.total?text:'');
    cleanBtn.disabled=!text||(r.total===0&&!norm.checked);
    if(!text){
      setSummary('','','','');
      chips.replaceChildren();
      preview.replaceChildren();
      preview.style.display='none';
      return;
    }
    if(r.total===0){
      setSummary(text,'clean','Clean.',' No hidden characters.'+(norm.checked?' Punctuation will still be normalized.':''));
      chips.replaceChildren();
      preview.replaceChildren();
      preview.style.display='none';
      skipped=[];
      return;
    }
    setSummary(text,'dirty',r.total+' hidden character'+(r.total>1?'s':''),' found.');
    renderChips(r);
    renderPreview(text);
  }

  function renderPreview(text){
    if(text.length>REVEAL_LIMIT){
      preview.replaceChildren();
      var note=document.createElement('p');
      note.className='hint';
      note.style.margin='0';
      note.textContent='Text is long; preview is hidden, but the counts above are exact. Clean it to strip hidden characters.';
      preview.appendChild(note);
      preview.style.display='block';
      return;
    }
    var segs=I.visualize(text),html='';
    for(var i=0;i<segs.length;i++){
      if(segs[i].hidden){
        html+='<mark class="mark '+(segs[i].category==='zero-width'?'zero-width':'')+
          '" title="'+esc(segs[i].label)+' ('+esc(segs[i].hex)+')">&#x25AC;</mark>';
      }else{
        html+=esc(segs[i].text);
      }
    }
    preview.innerHTML=html;
    preview.style.display=html?'block':'none';
  }

  function doClean(){
    var before=inEl.value,t=I.cleanWith(before,skipped);
    if(norm.checked) t=I.normalizePunctuation(t);
    out.value=t; out.hidden=false; copyBtn.hidden=false;
  // Report replacements separately because they do not change string length.
    var r=I.scan(before),swapped=r.counts.space||0,deleted=r.total-swapped,parts=[];
    if(deleted) parts.push(deleted+' removed');
    if(swapped) parts.push(swapped+' turned into a normal space');
    if(skipped.length&&deleted+swapped<r.total) parts.push((r.total-deleted-swapped)+' left (skipped)');
    if(!parts.length) delta.textContent=norm.checked?'Punctuation normalized.':'Nothing to change.';
    else delta.textContent=parts.join(', ')+'.'+(norm.checked?' Punctuation normalized.':'');
  }

  copyBtn.addEventListener('click',function(){
    navigator.clipboard.writeText(out.value).then(function(){
      var o=copyBtn.textContent;copyBtn.textContent='Copied ✓';
      copyBtn.setAttribute('aria-label','Copied to clipboard');
      setTimeout(function(){copyBtn.textContent=o;copyBtn.removeAttribute('aria-label');},1300);
    }).catch(function(){out.select();document.execCommand('copy');});
  });

  chips.addEventListener('click',function(ev){
    var chip=ev.target.closest('.chip');if(!chip)return;
    var cat=chip.getAttribute('data-cat'),on=chip.getAttribute('aria-pressed')==='true';
    chip.setAttribute('aria-pressed',on?'false':'true');
    skipped=on?skipped.concat([cat]):skipped.filter(function(c){return c!==cat;});
    renderPreview(inEl.value);
  });

  function readFile(file){
    if(!/\.(txt|md|csv|json|log)$/i.test(file.name)){
      delta.textContent='Only .txt .md .csv .json .log files.';
      return;
    }
    if(file.size>FILE_MAX_BYTES){
      delta.textContent='File is larger than 5 MB; paste a smaller excerpt instead.';
      return;
    }
    delta.textContent='Reading file…';
    var reader=new FileReader();
    reader.onload=function(){
      inEl.value=reader.result;
      delta.textContent='';
      render();
    };
    reader.onerror=function(){
      delta.textContent='Could not read that file.';
    };
    reader.readAsText(file);
  }

  function pickFile(){
    var picker=document.createElement('input');
    picker.type='file';
    picker.accept='.txt,.md,.csv,.json,.log';
    picker.addEventListener('change',function(){if(picker.files[0])readFile(picker.files[0]);});
    picker.click();
  }

  drop.addEventListener('click',pickFile);
  drop.addEventListener('keydown',function(ev){
    if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();pickFile();}
  });
  ['dragover','dragenter'].forEach(function(name){
    drop.addEventListener(name,function(ev){ev.preventDefault();drop.classList.add('over');});
  });
  ['dragleave','drop'].forEach(function(name){
    drop.addEventListener(name,function(ev){ev.preventDefault();drop.classList.remove('over');});
  });
  drop.addEventListener('drop',function(ev){
    if(ev.dataTransfer&&ev.dataTransfer.files[0])readFile(ev.dataTransfer.files[0]);
  });

  document.addEventListener('keydown',function(ev){
    if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'&&!cleanBtn.disabled){ev.preventDefault();doClean();}
  });

  // --- reporting a miss ------------------------------------------------------
  function reportBody(){
    var NL=String.fromCharCode(10),text=inEl.value,r=I.scan(text),seen={},lines=[],i,cp;

    for(i=0;i<r.findings.length;i++){
      var f=r.findings[i];
      if(!seen[f.hex]) seen[f.hex]={n:0,name:f.name,cat:f.category};
      seen[f.hex].n++;
    }
    Object.keys(seen).sort().forEach(function(h){
      lines.push('- '+h+'  '+seen[h].name+'  ('+seen[h].cat+') x'+seen[h].n);
    });

    var nonAscii=0;
    for(i=0;i<text.length;){
      cp=text.codePointAt(i);
      if(cp>127) nonAscii++;
      i+=cp>0xFFFF?2:1;
    }

    var v=(typeof chrome!=='undefined'&&chrome.runtime&&chrome.runtime.getManifest)
      ?chrome.runtime.getManifest().version:'?';
    var body=['### What looked wrong','',
      '<!-- Did it miss a hidden character, or flag one it should have kept? -->','',
      '### What the scan saw','',
      'Invisibles '+v,
      'Input: '+text.length+' characters, '+nonAscii+' of them non-ASCII',
      'Flagged: '+r.total,''];
    if(lines.length) body=body.concat(lines,['']);
    body.push('---','Built when the link was pressed. Your text is not included - only the '+
      'code points that were flagged, and the two counts above.');
    return body.join(NL);
  }

  if(reportBtn) reportBtn.addEventListener('click',function(ev){
    ev.preventDefault();
    var text=reportBody();
    try{ navigator.clipboard.writeText(text); }catch(_){}
    window.open('https://github.com/cig13zs/invisibles/issues/new'+
      '?title='+encodeURIComponent('Missed or wrongly flagged character')+
      '&body='+encodeURIComponent(text.slice(0,6000)),'_blank','noopener');
    if(reportMsg) reportMsg.textContent='Copied and opened on GitHub. Your text was not included.';
  });

  norm.addEventListener('change',function(){
    storageSet({normalizePunct:!!norm.checked});
    render();
  });

  if(dismissHint&&firstrun){
    dismissHint.addEventListener('click',function(){
      firstrun.hidden=true;
      storageSet({hintDismissed:true});
    });
  }

  inEl.addEventListener('input',render);
  cleanBtn.addEventListener('click',doClean);

  storageGet({normalizePunct:false,hintDismissed:false},function(data){
    norm.checked=!!data.normalizePunct;
    if(firstrun) firstrun.hidden=!!data.hintDismissed;
    render();
  });
})();