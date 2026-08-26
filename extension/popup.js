// MV3's default extension-page CSP requires this controller to be external.
(function(){
  var I=window.Invisibles;
  var inEl=document.getElementById('in'),cleanBtn=document.getElementById('clean'),
      copyBtn=document.getElementById('copy'),norm=document.getElementById('norm'),
      summary=document.getElementById('summary'),chips=document.getElementById('chips'),
      out=document.getElementById('out'),delta=document.getElementById('delta'),
      preview=document.getElementById('preview'),drop=document.getElementById('drop');

  // Categories the user toggled OFF; they stay in the text when cleaning.
  var skipped=[];

  function render(){
    var text=inEl.value, r=I.scan(text);
    cleanBtn.disabled=!text||(r.total===0&&!norm.checked);
    if(!text){summary.innerHTML='';chips.innerHTML='';preview.style.display='none';return;}
    if(r.total===0){
      summary.innerHTML='<span class="verdict clean">Clean.</span> No hidden characters.'+(norm.checked?' Punctuation will still be normalized.':'');
      chips.innerHTML='';preview.style.display='none';skipped=[];
      return;
    }
    summary.innerHTML='<span class="verdict dirty">'+r.total+' hidden character'+(r.total>1?'s':'')+'</span> found.';
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

  inEl.addEventListener('input',render);
  norm.addEventListener('change',render);
  cleanBtn.addEventListener('click',doClean);
  render();
})();
