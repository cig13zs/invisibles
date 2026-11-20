// MV3's default extension-page CSP requires this controller to be external.
(function(){
  var I=window.Invisibles;
  var inEl=document.getElementById('in'),cleanBtn=document.getElementById('clean'),
      aiBtn=document.getElementById('ai-clean'),
      copyBtn=document.getElementById('copy'),norm=document.getElementById('norm'),
      pasteEl=document.getElementById('paste'),copyCleanEl=document.getElementById('copyclean'),
      summary=document.getElementById('summary'),chips=document.getElementById('chips'),
      out=document.getElementById('out'),delta=document.getElementById('delta'),
      preview=document.getElementById('preview'),drop=document.getElementById('drop'),
      reportBtn=document.getElementById('report'),reportMsg=document.getElementById('reportmsg'),
      hiddenMsg=document.getElementById('hidden-msg'),
      aiNote=document.getElementById('ai-note'),
      lookalikes=document.getElementById('lookalikes'),
      reviewEl=document.getElementById('review'),
      statsEl=document.getElementById('stats'),
      firstrun=document.getElementById('firstrun'),dismissHint=document.getElementById('dismiss-hint'),
      empty=document.getElementById('empty');

  var REVEAL_LIMIT=20000;
  var FILE_MAX_BYTES=5*1024*1024;

  // Categories the user toggled OFF; they stay in the text when cleaning.
  var skipped=[];
  var removedTotal=0, statsLoaded=false;

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

  function localGet(keys, done){
    try{
      if(typeof chrome!=='undefined'&&chrome.storage&&chrome.storage.local&&chrome.storage.local.get){
        chrome.storage.local.get(keys,function(data){ done(data||{}); });
        return;
      }
    }catch(_){}
    done({});
  }

  function localSet(values){
    try{
      if(typeof chrome!=='undefined'&&chrome.storage&&chrome.storage.local&&chrome.storage.local.set){
        chrome.storage.local.set(values);
      }
    }catch(_){}
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

  function setBadge(n){
    var text=n>0?(n>99?'99+':String(n)):'';
    try{
      if(typeof chrome!=='undefined'&&chrome.action&&chrome.action.setBadgeText){
        chrome.action.setBadgeText({text:text});
        if(n>0&&chrome.action.setBadgeBackgroundColor){
          chrome.action.setBadgeBackgroundColor({color:'#9F2D22'});
        }
      }
    }catch(_){}
  }

  function showStats(){
    if(!statsEl) return;
    statsEl.textContent=removedTotal
      ?'Cleaned '+removedTotal.toLocaleString()+' hidden character'+(removedTotal===1?'':'s')+' on this browser.'
      :'';
  }

  function bumpStats(n){
    n=n|0;
    if(n<=0) return;
    removedTotal+=n;
    if(statsLoaded) localSet({removedTotal:removedTotal});
    showStats();
  }

  function noteLine(parent, text){
    var p=document.createElement('p');
    p.style.unicodeBidi='isolate';
    p.textContent=text;
    parent.appendChild(p);
    return p;
  }

  function renderAi(text){
    if(!aiNote) return;
    var info=text?I.aiStyle(text):null;
    aiNote.replaceChildren();
    if(!info||(!info.punctuation.total&&!info.notable.length)){ aiNote.hidden=true; return; }
    aiNote.hidden=false;
    if(info.punctuation.total){
      var bits=[], punc=info.punctuation;
      if(punc.emDash) bits.push(punc.emDash+' em dash'+(punc.emDash>1?'es':''));
      if(punc.enDash) bits.push(punc.enDash+' en dash'+(punc.enDash>1?'es':''));
      var quotes=punc.smartSingle+punc.smartDouble;
      if(quotes) bits.push(quotes+' smart quote'+(quotes>1?'s':''));
      if(punc.ellipsis) bits.push(punc.ellipsis+' ellipsis');
      if(punc.minus) bits.push(punc.minus+' minus sign'+(punc.minus>1?'s':''));
      noteLine(aiNote, bits.join(', ')+'. Visible punctuation, not a hidden character, and not proof of who wrote it. Clean AI paste turns it into plain ASCII.');
    }
    info.notable.forEach(function(n){
      noteLine(aiNote, n.count+' × '+n.hex+' '+n.name+'. '+n.note);
    });
  }

  function renderLookalikes(text){
    if(!lookalikes) return;
    var h=text?I.homoglyphs(text):{findings:[],urls:[]};
    lookalikes.replaceChildren();
    if(!h.findings.length&&!h.urls.length){ lookalikes.hidden=true; return; }
    lookalikes.hidden=false;
    var title=noteLine(lookalikes, 'Look-alike letters');
    title.className='card-title';
    var seen={}, shown=0;
    h.findings.forEach(function(f){
      if(seen[f.wordIndex]||shown>=4){ seen[f.wordIndex]=true; return; }
      seen[f.wordIndex]=true;
      shown++;
      noteLine(lookalikes, f.hex+' resembles '+f.looksLike+'. The word resembles "'+f.wordSkeleton+'". Letters are not rewritten.');
    });
    h.urls.slice(0,3).forEach(function(u){
      noteLine(lookalikes, 'Hostname resembles "'+u.skeleton+'". DNS form: '+u.ascii+'.');
    });
    if(h.findings.length>shown||h.urls.length>3){
      noteLine(lookalikes, 'More look-alikes are in the text.');
    }
  }

  function renderReview(text){
    if(!reviewEl) return;
    var r=text?I.reviewCode(text):null;
    reviewEl.replaceChildren();
    if(!r||r.verdict==='clean'){ reviewEl.hidden=true; return; }
    reviewEl.hidden=false;
    var title=noteLine(reviewEl, (r.verdict==='block'?'Code review: block':'Code review: look closer')+(r.diff?' (pasted diff)':''));
    title.className='card-title';
    r.findings.slice(0,2).forEach(function(f){
      noteLine(reviewEl, 'Line '+f.line+': '+(f.hex?f.hex+' '+f.name+'. ':'')+f.message);
    });
    if(r.findings.length>2) noteLine(reviewEl, 'and '+(r.findings.length-2)+' more.');
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
      btn.className='chip cat-'+c;
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

  function syncActions(text, total){
    var punct=text?I.aiStyle(text).punctuation.total:0;
    cleanBtn.disabled=!text||(total===0&&!norm.checked);
    if(aiBtn) aiBtn.disabled=!text||(total===0&&punct===0);
  }

  function render(){
    var text=inEl.value,r=I.scan(text);
    var hint=document.getElementById('scan-hint');
    if(hint) hint.hidden=!!text;
    renderHidden(hiddenMsg,r.total?text:'');
    renderAi(text);
    renderLookalikes(text);
    renderReview(text);
    syncActions(text, r.total);
    setBadge(text?r.total:0);
    if(!text){
      setSummary('','','','');
      if(empty) empty.hidden=false;
      summary.hidden=true;
      chips.replaceChildren();
      preview.replaceChildren();
      preview.style.display='none';
      return;
    }
    if(empty) empty.hidden=true;
    summary.hidden=false;
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
        html+='<mark class="mark cat-'+segs[i].category+
          '" title="'+esc(segs[i].label)+' ('+esc(segs[i].hex)+')">&#x25AC;</mark>';
      }else{
        html+=esc(segs[i].text);
      }
    }
    preview.innerHTML=html;
    preview.style.display=html?'block':'none';
  }

  function showClean(before, cleaned, punctuation){
    out.value=cleaned; out.hidden=false; copyBtn.hidden=false;
    var beforeScan=I.scan(before), afterScan=I.scan(cleaned);
    var gone=beforeScan.total-afterScan.total;
    var swapped=Math.max(0,(beforeScan.counts.space||0)-(afterScan.counts.space||0));
    var deleted=Math.max(0, gone-swapped), parts=[];
    if(deleted) parts.push(deleted+' removed');
    if(swapped) parts.push(swapped+' turned into a normal space');
    if(afterScan.total) parts.push(afterScan.total+' left (skipped)');
    if(!parts.length) delta.textContent=punctuation?'Punctuation normalized.':'Nothing to change.';
    else delta.textContent=parts.join(', ')+'.'+(punctuation?' Punctuation normalized.':'');
    bumpStats(gone);
  }

  function doClean(){
    var before=inEl.value;
    showClean(before, I.applyClean(before,{skip:skipped, punctuation:norm.checked}), norm.checked);
  }

  function doAiClean(){
    var before=inEl.value;
    showClean(before, I.applyClean(before,{punctuation:true}), true);
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
    if(!((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter')) return;
    ev.preventDefault();
    if(ev.shiftKey){ if(aiBtn&&!aiBtn.disabled) doAiClean(); }
    else if(!cleanBtn.disabled) doClean();
  });

  inEl.addEventListener('paste',function(ev){
    if(!pasteEl||!pasteEl.checked) return;
    var data=ev.clipboardData&&ev.clipboardData.getData('text');
    if(!data) return;
    var cleaned=I.applyClean(data,{punctuation:!!norm.checked});
    if(cleaned===data) return;
    ev.preventDefault();
    var start=inEl.selectionStart, end=inEl.selectionEnd;
    if(typeof inEl.setRangeText==='function') inEl.setRangeText(cleaned, start, end, 'end');
    else inEl.value=inEl.value.slice(0,start)+cleaned+inEl.value.slice(end);
    render();
    var removed=I.scan(data).total;
    if(removed) delta.textContent='Paste cleaned: '+removed+' hidden character'+(removed>1?'s':'')+' removed.'+(norm.checked?' Punctuation normalized if any.':'');
    else delta.textContent='Paste cleaned: punctuation normalized.';
    bumpStats(removed);
  });

  inEl.addEventListener('copy',function(ev){
    if(!copyCleanEl||!copyCleanEl.checked||!ev.clipboardData) return;
    var start=inEl.selectionStart, end=inEl.selectionEnd;
    if(start===end) return;
    var slice=inEl.value.slice(start, end);
    var cleaned=I.applyClean(slice,{skip:skipped, punctuation:!!norm.checked});
    if(cleaned===slice) return;
    ev.preventDefault();
    ev.clipboardData.setData('text/plain', cleaned);
    var removed=I.scan(slice).total;
    delta.textContent=removed
      ?'Copied a cleaned selection ('+removed+' hidden).'
      :'Copied the selection with punctuation normalized.';
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
    var look=I.homoglyphs(text), seenLike={};
    look.findings.forEach(function(f){
      if(!seenLike[f.hex]) seenLike[f.hex]={n:0,name:f.name};
      seenLike[f.hex].n++;
    });
    look.urls.forEach(function(u){
      u.letters.forEach(function(letter){
        if(!seenLike[letter.hex]) seenLike[letter.hex]={n:0,name:letter.name};
        seenLike[letter.hex].n++;
      });
    });
    Object.keys(seenLike).sort().forEach(function(h){
      lines.push('- '+h+'  '+seenLike[h].name+'  (look-alike) x'+seenLike[h].n);
    });
    lines.push('Code review: '+I.reviewCode(text).verdict);
    lines.push('Look-alike hostnames: '+look.urls.length);

    if(lines.length) body=body.concat(lines,['']);
    body.push('---','Built when the link was pressed. Your text is not included - only the '+
      'code points that were flagged, plus counts. Words and hostnames are not included.');
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
  if(pasteEl) pasteEl.addEventListener('change',function(){
    storageSet({cleanOnPaste:!!pasteEl.checked});
  });
  if(copyCleanEl) copyCleanEl.addEventListener('change',function(){
    storageSet({cleanOnCopy:!!copyCleanEl.checked});
  });

  if(dismissHint&&firstrun){
    dismissHint.addEventListener('click',function(){
      firstrun.hidden=true;
      storageSet({hintDismissed:true});
    });
  }

  inEl.addEventListener('input',function(){
    if(delta) delta.textContent='';
    if(out){ out.hidden=true; out.value=''; }
    if(copyBtn) copyBtn.hidden=true;
    var hint=document.getElementById('scan-hint');
    if(hint) hint.hidden=!!inEl.value;
    render();
  });
  cleanBtn.addEventListener('click',doClean);
  if(aiBtn) aiBtn.addEventListener('click',doAiClean);

  storageGet({normalizePunct:false,hintDismissed:false,cleanOnPaste:false,cleanOnCopy:false},function(data){
    norm.checked=!!data.normalizePunct;
    if(pasteEl) pasteEl.checked=!!data.cleanOnPaste;
    if(copyCleanEl) copyCleanEl.checked=!!data.cleanOnCopy;
    if(firstrun) firstrun.hidden=!!data.hintDismissed;
    render();
  });
  localGet({removedTotal:0},function(data){
    removedTotal=(Number(data&&data.removedTotal)||0)+(statsLoaded?0:removedTotal);
    statsLoaded=true;
    localSet({removedTotal:removedTotal});
    showStats();
  });
})();