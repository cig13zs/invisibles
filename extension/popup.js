// Lives in its own file because MV3's default extension-page CSP is
// script-src 'self', which refuses an inline <script> outright. Inlined, none of
// this ran: the popup rendered and every control was dead.
(function(){
  var I=window.Invisibles;
  var inEl=document.getElementById('in'),cleanBtn=document.getElementById('clean'),
      copyBtn=document.getElementById('copy'),norm=document.getElementById('norm'),
      summary=document.getElementById('summary'),chips=document.getElementById('chips'),
      out=document.getElementById('out'),delta=document.getElementById('delta');

  function render(){
    var text=inEl.value, r=I.scan(text);
    cleanBtn.disabled=!text||(r.total===0&&!norm.checked);
    if(!text){summary.innerHTML='';chips.innerHTML='';return;}
    if(r.total===0){
      summary.innerHTML='<span class="verdict clean">Clean.</span> No hidden characters.'+(norm.checked?' Punctuation will still be normalized.':'');
      chips.innerHTML='';return;
    }
    summary.innerHTML='<span class="verdict dirty">'+r.total+' hidden character'+(r.total>1?'s':'')+'</span> found.';
    var cats=Object.keys(r.counts).sort();
    chips.innerHTML=cats.map(function(c){
      var label=(I.CATEGORIES[c]||c).split(': ')[0];
      return '<span class="chip"><b>'+r.counts[c]+'</b> '+label+'</span>';
    }).join('');
  }
  function doClean(){
    var before=inEl.value, t=I.clean(before);
    if(norm.checked) t=I.normalizePunctuation(t);
    out.value=t; out.hidden=false; copyBtn.hidden=false;
    // A look-alike space becomes a real space, so it never shows up in a length
    // difference. Reporting only that difference read as "found 4, removed 2",
    // which looks like it missed two.
    var r=I.scan(before), swapped=r.counts.space||0, deleted=r.total-swapped, parts=[];
    if(deleted) parts.push(deleted+' removed');
    if(swapped) parts.push(swapped+' turned into a normal space');
    if(!parts.length) delta.textContent=norm.checked?'Punctuation normalized.':'Nothing to change.';
    else delta.textContent=parts.join(', ')+'.'+(norm.checked?' Punctuation normalized.':'');
  }
  copyBtn.addEventListener('click',function(){
    navigator.clipboard.writeText(out.value).then(function(){
      var o=copyBtn.textContent;copyBtn.textContent='Copied ✓';setTimeout(function(){copyBtn.textContent=o;},1300);
    }).catch(function(){out.select();document.execCommand('copy');});
  });
  inEl.addEventListener('input',render);
  norm.addEventListener('change',render);
  cleanBtn.addEventListener('click',doClean);
  render();
})();
