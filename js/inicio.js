/* Aura · js/inicio.js
   Avisos (toast), eventos de la app (toques, formularios) y arranque. Debe cargarse al final.
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */

var toastT;
function toast(m){var e=$('toast');e.textContent=m;e.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){e.classList.remove('show')},2400)}
function done(msg){save();closeSheet();render();toast(msg||'Guardado')}

document.addEventListener('submit',function(e){
  e.preventDefault();
  var fm=e.target;
  if(authSubmit(fm))return;
  if(cuerpoSubmit(fm))return;
  if(finSubmit(fm))return;
  if(orgSubmit(fm))return;
  if(calSubmit(fm))return;
  if(fm.id==='bulk-form'){var br=parseDates($('f-bulk').value),have={},add=0,dup=0;starts().forEach(function(x){have[x.date]=1});br.ok.forEach(function(ds){if(have[ds]){dup++;return}have[ds]=1;addPeriod(ds,'09:00');add++});
    ui.bulkText=br.bad.join('\n');ui.bulkMsg=br.bad.length?'No entendí '+(br.bad.length===1?'esta fecha':'estas fechas')+'. Corrígelas y vuelve a intentar.':'';if(!br.bad.length)ui.bulk=false;save();render();
    toast(add?'Agregué '+add+(add===1?' fecha':' fechas')+(dup?' · '+dup+' ya estaban':''):dup?'Esas fechas ya estaban anotadas':'No encontré fechas válidas');return}
  if(fm.id==='per-form'){var pv=$('f-pstart').value;if(!pv||pv>T()){toast('Elige una fecha de hoy o anterior');return}if(!addPeriod(pv)){toast('Ese inicio ya está anotado');return}if(ui.sheet==='period'){done('Inicio de período anotado');return}save();render();toast('Inicio de período anotado');return}
  if(fm.id==='free-form'){var v=$('f-free').value.trim();if(!v)return;snap();ui.parsed=parseFree(v);renderSheet();return}
  var hk=fm.getAttribute('data-k')||'';
  if(/^(exam|cond|ctrl|treat|tdose)$/.test(hk)){snap();if(saveH(hk))done(hk==='tdose'?'Dosis actualizada':'Guardado');return}
  var k=fm.getAttribute('data-k'), g=function(id){var x=$(id);return x?x.value.trim():''};
  var isLog=/^(med|beauty|money)$/.test(k),ld=g('f-ldate')||T(),lt=ui.form.ltime||(ld===T()?nowHM():'12:00');
  if(isLog&&ld>T()){toast('Elige una fecha de hoy o anterior');return}
  if(k==='med'){addLog({kind:'med',module:'Salud',title:'Tomé '+g('f-name'),date:ld,time:g('f-time')||lt})}
  else if(k==='beauty'){addLog({kind:'beauty',module:'Belleza',title:g('f-area')+': '+g('f-desc'),date:ld,time:lt})}
  else if(k==='money'){var a=amountOf(g('f-amt'));if(!a){toast('Escribe un monto, por ejemplo 12.990');return}
    var mrec={kind:'money',module:'Finanzas',title:g('f-desc')||g('f-cat'),amount:a,dir:ui.form.dir||'gasto',cat:g('f-cat')||'Otros',date:ld,time:lt};
    if(ui.form.fx&&mrec.dir==='gasto')mrec.fx=ui.form.fx;
    var mold=ui.form.eid?state.logs.filter(function(x){return x.id===ui.form.eid})[0]:null;
    if(mold){['did','pid','src','ext'].forEach(function(q){if(mold[q]!=null)mrec[q]=mold[q]});
      if(mold.pid){mrec.dir='gasto';mrec.cat='Deudas';var mp=FN().pays.filter(function(x){return x.id===mold.pid})[0];if(mp){mp.amt=a;mp.date=ld}}
      mrec.id=mold.id;mrec.time=mold.date===ld?mold.time:lt;state.logs=state.logs.map(function(x){return x.id===mold.id?mrec:x})}
    else addLog(mrec)}
  else if(k==='task'){
    var ty=ui.form.ty||'task', nm=g('f-name'), md=g('f-mod'), old=ui.form.eid?find(ui.form.eid):null, rec;
    if(ty==='habit') rec={type:'habit',title:nm,module:md,log:old&&old.log||[]};
    else if(ty==='task') rec={type:'task',title:nm,module:md,due:g('f-date')||T(),time:g('f-time'),done:old?!!old.done:false,doneOn:old?old.doneOn||'':''};
    else if(ty==='event'){var est=g('f-time'),een=g('f-end');if(est&&een&&een<=est){toast('La hora de término debe ser después del inicio');return}
      rec={type:'event',title:nm,module:md,date:g('f-date')||T(),time:est,end:een,place:g('f-place'),src:old&&old.src||'manual'};if(old&&old.ext)rec.ext=old.ext}
    else rec={type:'reminder',title:nm,module:md,date:g('f-date')||T(),time:g('f-time'),done:old?!!old.done:false,doneOn:old?old.doneOn||'':''};
    if(old){rec.id=old.id;state.items=state.items.map(function(x){return x.id===old.id?rec:x})}else{rec.id=uid();state.items.push(rec)}
    if(ty!=='habit'){ui.oday=ty==='task'?rec.due:rec.date;ui.view='dia'}
  }
  done(k==='money'&&ui.form.eid?'Movimiento actualizado':isLog&&ld!==T()?'Guardado · '+whenLabel(ld):undefined);
});

document.addEventListener('click',function(e){
  var b=e.target.closest('[data-act]');
  if(!b){if(ui.pend){ui.pend=null;render()}return}
  var a=b.getAttribute('data-act'), id=b.getAttribute('data-id');
  if(a!=='del'&&a!=='delok'&&ui.pend){ui.pend=null}
  if(authClick(a,b))return;
  if(cuerpoClick(a,b,id))return;
  if(finClick(a,b,id))return;
  if(a==='logopen'){e.preventDefault();ui.logOpen=!ui.logOpen;render();return}
  if(pasosClick(a,b))return;
  if(calClick(a,b,id))return;
  if(fotoClick(a))return;
  if(orgClick(a,b,id))return;
  var t=T(), it=id?find(id):null;
  switch(a){
    case 'view': ui.view=b.getAttribute('data-v'); ui.edit=false; render(); window.scrollTo(0,0); break;
    case 'sheet': snap(); openSheet(b.getAttribute('data-s')); break;
    case 'close': closeSheet(); break;
    case 'water': addLog({kind:'water',module:'Alimentación',title:'Agua',ml:parseInt(b.getAttribute('data-v'),10)||bottleMl()}); done('Llevas '+n0(water(t))+' ml hoy'); break;
    case 'dir': snap(); ui.form.dir=b.getAttribute('data-v'); renderSheet(); break;
    case 'ty': snap(); ui.form.ty=b.getAttribute('data-v'); renderSheet(); break;
    case 'saveparsed': if(ui.parsed){done(saveParsed(ui.parsed))} break;
    case 'fixparsed': if(ui.parsed) fixParsed(ui.parsed); break;
    case 'habit': if(it){var i=it.log.indexOf(t); if(i>-1) it.log.splice(i,1); else it.log.push(t); save(); render()} break;
    case 'toggle': if(it){it.done=!it.done; it.doneOn=it.done?t:''; save(); render()} break;
    case 'cfg': var cc=cfg(),cf=b.getAttribute('data-f'),cd=+b.getAttribute('data-d'); if(cf==='len') cc.len=Math.min(45,Math.max(Math.max(20,cc.per+10),cc.len+cd)); else cc.per=Math.max(2,Math.min(10,cc.len-10,cc.per+cd)); save(); render(); break;
    case 'bulk': ui.bulk=!ui.bulk; ui.bulkMsg=''; if(!ui.bulk) ui.bulkText=''; render(); if(ui.bulk){var ta=$('f-bulk'); if(ta) ta.focus()} break;
    case 'sub': ui.sub=b.getAttribute('data-v'); render(); window.scrollTo(0,0); break;
    case 'gosalud': closeSheet(); ui.view='salud'; ui.sub=b.getAttribute('data-v'); render(); window.scrollTo(0,0); break;
    case 'hnew': snap(); openH(b.getAttribute('data-t'),null); break;
    case 'hview': openView(b.getAttribute('data-t'),id); break;
    case 'hedit': var hr=findH(b.getAttribute('data-t'),id); if(hr) openH(b.getAttribute('data-t'),hr); break;
    case 'hback': hBack(); break;
    case 'hst': ui.form.st=b.getAttribute('data-v'); rerender(); break;
    case 'tdur': ui.form.dur=b.getAttribute('data-v'); rerender(); break;
    case 'hdel': if(!ui.hdel){ui.hdel=true;rerender();break} if(delH()) done('Borrado'); break;
    case 'hdone': var hc=findH('ctrl',id); if(hc){hc.done=!hc.done; save(); render(); if(hc.done) toast('Control marcado como realizado')} break;
    case 'hnext': var hp=findH('ctrl',id); if(hp){openH('ctrl',null); ui.form={title:hp.title,doc:hp.doc||'',place:hp.place||'',conds:(hp.conds||[]).slice()}; renderSheet(); var hd=$('h-date'); if(hd) hd.focus()} break;
    case 'hagain': var he=findH('exam',id); if(he){openH('exam',null); ui.form={name:he.name,st:'pendiente',rep:String(he.rep||0),place:he.place||'',doc:he.doc||'',conds:(he.conds||[]).slice()}; renderSheet()} break;
    case 'hexdone': var hx=findH('exam',id); if(hx){openH('exam',hx); ui.form.st='realizado'; if(!ui.form.date) ui.form.date=T(); renderSheet()} break;
    case 'pnow': var pc=findH('ctrl',id); if(pc){openH('ctrl',null); ui.form={title:pc.title,doc:pc.doc||'',place:pc.place||'',conds:(pc.conds||[]).slice(),date:T(),fromPend:pc.id}; renderSheet()} break;
    case 'pdis': var pd=findH('ctrl',id); if(pd){pd.nextDone=true; save(); render(); toast('Pendiente descartado')} break;
    case 'dose': var dtm=b.getAttribute('data-v')||'',dk=doseKey(id,dtm); if(D().some(function(x){return x.id===dk})) state.doses=D().filter(function(x){return x.id!==dk}); else D().push({id:dk,date:T(),tid:id,time:dtm,at:nowHM()}); save(); render(); break;
    case 'tdose': ui.stack.push(curSheet()); ui.sheet='tdose'; ui.editId=id; ui.form={from:T()}; ui.hdel=false; renderSheet(); sheetTop(); break;
    case 'tend': var te=findH('treat',id); if(te){var tdy=T(); te.end=te.start&&tdy<te.start?te.start:tdy; save(); render(); toast('Listo: hoy es su último día')} break;
    case 'frm': removeFile(+b.getAttribute('data-u')); break;
    case 'fopen': openFile({id:id,name:b.getAttribute('data-n'),type:b.getAttribute('data-ty')}); break;
    case 'fdl': if(ui.vfile) downloadFile(ui.vfile,b); break;
    case 'zoom': var vb=$('vbox'); if(vb) vb.classList.toggle('zoom'); break;
    case 'cfgok': cfg().set=true; save(); render(); toast('Ajuste guardado'); break;
    case 'cal': var cv=+b.getAttribute('data-d'); ui.cal=cv===0?0:ui.cal+cv; render(); break;
    case 'editmode': ui.edit=!ui.edit; render(); break;
    case 'del': ui.pend=id; render(); break;
    case 'delok':
      if(b.getAttribute('data-k')==='log'){var dl0=state.logs.filter(function(x){return x.id===id})[0]; if(dl0&&dl0.pid) delPay(dl0.pid); state.logs=state.logs.filter(function(x){return x.id!==id})}
      else state.items=state.items.filter(function(x){return x.id!==id});
      ui.pend=null; save(); render(); break;
    case 'clearex': state.items=state.items.filter(function(x){return !x.example}); state.logs=state.logs.filter(function(x){return !x.example}); save(); render(); toast('Ejemplos borrados'); break;
    case 'copy':
      var txt=JSON.stringify(state), fb=function(){var ta=$('f-restore');ta.value=txt;ta.focus();ta.select();toast('Copia el texto seleccionado')};
      try{navigator.clipboard.writeText(txt).then(function(){toast('Respaldo copiado')},fb)}catch(err){fb()}
      break;
    case 'restore':
      try{var d=JSON.parse($('f-restore').value); if(!d||!Array.isArray(d.items)) throw 0;
        state={items:d.items.filter(function(x){return x&&x.id&&x.title&&x.type}),logs:Array.isArray(d.logs)?d.logs.filter(function(x){return x&&x.id&&x.kind}):[],cfg:d.cfg&&typeof d.cfg.len==='number'?d.cfg:undefined,health:normHealth(d.health&&typeof d.health==='object'?d.health:undefined),doses:Array.isArray(d.doses)?d.doses:[],body:normBody(d.body&&typeof d.body==='object'?d.body:undefined),fin:normFin(d.fin&&typeof d.fin==='object'?d.fin:undefined),org:normOrg(d.org&&typeof d.org==='object'?d.org:undefined)};
        migrateLogs(state);
        auth.fresh=false; save(); render(); toast('Respaldo restaurado');
      }catch(err){toast('El texto pegado no es un respaldo válido')}
      break;
  }
});
document.addEventListener('change',function(e){
  var t=e.target;if(!t||!t.matches)return;
  if(fotoChange(t))return;
  if(t.matches('input[type=file][data-slot]')){addFiles(t.files,t.getAttribute('data-slot'));t.value='';return}
  if(t.matches('[data-rer]'))rerender();
});
document.addEventListener('dragover',function(e){if(e.target.closest&&e.target.closest('.drop'))e.preventDefault()});
document.addEventListener('drop',function(e){var z=e.target.closest&&e.target.closest('.drop');if(!z)return;e.preventDefault();addFiles(e.dataTransfer&&e.dataTransfer.files,z.getAttribute('data-slot'))});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ui.sheet)closeSheet()});

/* Estado inicial: se arma aquí, cuando todos los archivos ya cargaron. */
var state=load()||seed();
normHealth(state.health);
state.body=normBody(state.body);
state.fin=normFin(state.fin);
state.org=normOrg(state.org);
render();
startCloud();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(function(){});
setInterval(function(){if(ui.view==='dia'&&!ui.sheet&&!document.activeElement.matches('input,textarea,select'))render()},60000);
window.__parseFree=parseFree; window.__extractWhen=extractWhen; window.__amountOf=amountOf;
