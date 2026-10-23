// MV3's default extension-page CSP requires this controller to be external.
(function(){
  var I=window.Invisibles;
  var inEl=document.getElementById('in'),cleanBtn=document.getElementById('clean'),
      copyBtn=document.getElementById('copy'),norm=document.getElementById('norm'),
      summary=document.getElementById('summary'),chips=document.getElementById('chips'),
      out=document.getElementById('out'),delta=document.getElementById('delta'),
      preview=document.getElementById('preview'),drop=document.getElementById('drop'),
      reportBtn=document.getElementById('report'),reportMsg=document.getElementById('reportmsg'),
      hiddenMsg=document.getElementById('hidden-msg');

  // Categories the user toggled OFF; they stay in the text when cleaning.
  var skipped=[];

  // Joiners and selectors inside emoji are kept on purpose; say so, so a
  // "Clean." verdict on text full of emoji reads as deliberate.
  function emojiNote(r){
    var n=r.emojiKept||0;
    return n?' Kept '+n+' character'+(n>1?'s':'')+' that hold'+(n>1?'':'s')+' emoji together.':'';
  }

  // Text hidden inside tag characters or variation selectors, decoded and shown
  // as plain text so it can be read. Built with textContent: it is untrusted.
  var KIND = {tag:'tag characters', selector:'variation selectors'};
  function renderHidden(el, text){
    var hits=text?I.decodeHidden(text):[];
    el.replaceChildren();
    el.hidden=!hits.length;
    hits.slice(0,3).forEach(function(h){
      var p=document.createElement('p'), q=document.createElement('q');
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

  function render(){
    var text=inEl.value, r=I.scan(text);
    renderHidden(hiddenMsg, r.total?text:'');
    cleanBtn.disabled=!text||(r.total===0&&!norm.checked);
    if(!text){summary.innerHTML='';chips.innerHTML='';preview.style.display='none';return;}
    if(r.total===0){
      summary.innerHTML='<span class="verdict clean">Clean.</span> No hidden characters.'+emojiNote(r)+(norm.checked?' Punctuation will still be normalized.':'');
      chips.innerHTML='';preview.style.display='none';skipped=[];
      return;
    }
    summary.innerHTML='<span class="verdict dirty">'+r.total+' hidden character'+(r.total>1?'s':'')+'</span> found.'+emojiNote(r);
    var cats=Object.keys(r.counts).sort();
    chips.innerHTML=cats.map(function(c){
      var label=(I.CATEGORIES[c]||c).split(': ')[0];
      return '<button type="button" class="chip" data-cat="'+c+'" aria-pressed="true" title="'+
        (I.CATEGORIES[c]||c)+'"><b>'+r.counts[c]+'</b> '+label+'</button>';
    }).join('');
    renderPreview(text);
  }

  function renderPreview(text){
    var segs=I.visualize(text), html='';
    for(var i=0;i<segs.length;i++){
      if(segs[i].hidden){
        html+='<mark class="mark '+(segs[i].category==='zero-width'?'zero-width':'')+
          '" title="'+segs[i].label+' ('+segs[i].hex+')">&#x25AC;</mark>';
      }else{
        // Only < and & are dangerous here; escape them and pass the rest through.
        html+=segs[i].text.replace(/&/g,'&amp;').replace(/</g,'&lt;');
      }
    }
    preview.innerHTML=html;
    preview.style.display=html?'block':'none';
  }

  function doClean(){
    var before=inEl.value, t=I.cleanWith(before, skipped);
    if(norm.checked) t=I.normalizePunctuation(t);
    out.value=t; out.hidden=false; copyBtn.hidden=false;
    // Report replacements separately because they do not change string length.
    var r=I.scan(before), swapped=r.counts.space||0, deleted=r.total-swapped, parts=[];
    if(deleted) parts.push(deleted+' removed');
    if(swapped) parts.push(swapped+' turned into a normal space');
    if(skipped.length&&deleted+swapped<r.total) parts.push((r.total-deleted-swapped)+' left (skipped)');
    if(!parts.length) delta.textContent=norm.checked?'Punctuation normalized.':'Nothing to change.';
    else delta.textContent=parts.join(', ')+'.'+(norm.checked?' Punctuation normalized.':'');
  }

  copyBtn.addEventListener('click',function(){
    navigator.clipboard.writeText(out.value).then(function(){
      var o=copyBtn.textContent;copyBtn.textContent='Copied ✓';setTimeout(function(){copyBtn.textContent=o;},1300);
    }).catch(function(){out.select();document.execCommand('copy');});
  });

  chips.addEventListener('click',function(ev){
    var chip=ev.target.closest('.chip');if(!chip)return;
    var cat=chip.getAttribute('data-cat'), on=chip.getAttribute('aria-pressed')==='true';
    chip.setAttribute('aria-pressed',on?'false':'true');
    skipped=on?skipped.concat([cat]):skipped.filter(function(c){return c!==cat;});
    renderPreview(inEl.value);
  });

  function readFile(file){
    if(!/\.(txt|md|csv|json|log)$/i.test(file.name)){delta.textContent='Only .txt .md .csv .json .log files.';return;}
    var reader=new FileReader();
    reader.onload=function(){inEl.value=reader.result;render();};
    reader.readAsText(file);
  }

  drop.addEventListener('click',function(){
    var picker=document.createElement('input');picker.type='file';
    picker.accept='.txt,.md,.csv,.json,.log';
    picker.addEventListener('change',function(){if(picker.files[0])readFile(picker.files[0]);});
    picker.click();
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
    if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'&&!cleanBtn.disabled){doClean();}
  });

  // --- reporting a miss ------------------------------------------------------
  // The only feedback channel this extension has, and the only thing in it that
  // can leave the browser. It runs when the link is pressed and never before.
  //
  // What it must NOT contain is the text. The whole promise here is that your
  // text stays put, and a bug report that quietly shipped it would break that
  // promise at the exact moment someone is trying to help. So the note carries
  // only the code points that were flagged, plus two counts - enough to add a
  // missing rule, useless to anyone reading it as content.
  function reportBody(){
    var NL=String.fromCharCode(10), text=inEl.value, r=I.scan(text), seen={}, lines=[], i, cp;

    for(i=0;i<r.findings.length;i++){
      var f=r.findings[i];
      if(!seen[f.hex]) seen[f.hex]={n:0,name:f.name,cat:f.category};
      seen[f.hex].n++;
    }
    Object.keys(seen).sort().forEach(function(h){
      lines.push('- '+h+'  '+seen[h].name+'  ('+seen[h].cat+') x'+seen[h].n);
    });

    // A count, not the characters. A missed character is almost always
    // non-ASCII, so the gap between this number and the flagged total is the
    // first thing worth looking at.
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
    // Clipboard first, so someone without a GitHub account can still paste it
    // into a store review or a message.
    try{ navigator.clipboard.writeText(text); }catch(_){}
    window.open('https://github.com/cig13zs/invisibles/issues/new'+
      '?title='+encodeURIComponent('Missed or wrongly flagged character')+
      '&body='+encodeURIComponent(text.slice(0,6000)),'_blank','noopener');
    if(reportMsg) reportMsg.textContent='Copied and opened on GitHub. Your text was not included.';
  });

  inEl.addEventListener('input',render);
  norm.addEventListener('change',render);
  cleanBtn.addEventListener('click',doClean);
  render();
})();
