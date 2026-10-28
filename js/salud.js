/* Aura · js/salud.js
   Salud: ciclo (vista), tratamientos, controles, exámenes, patologías y archivos (bucket «archivos»).
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */
/* ---------- Salud: datos y migración ---------- */
var EXAMS=['Hemograma','Perfil lipídico','Perfil bioquímico','Glicemia','Hemoglobina glicosilada','Perfil tiroideo (TSH, T4)','Vitamina D','Vitamina B12','Ferritina','Orina completa','PAP','Mamografía','Ecografía mamaria','Ecografía transvaginal','Electrocardiograma'];
var SPECS=['Medicina general','Ginecología','Dermatología','Endocrinología','Nutrición','Odontología','Oftalmología','Psicología','Psiquiatría','Traumatología','Cardiología','Gastroenterología'];
var REPS=[[0,'No se repite'],[3,'Cada 3 meses'],[6,'Cada 6 meses'],[12,'Cada 1 año'],[24,'Cada 2 años'],[36,'Cada 3 años']];
var CSTAT={activa:['Activa','warn'],controlada:['Controlada','ok'],resuelta:['Resuelta','mut']};
var MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
var HOWS=['','En ayunas','Con comida','Después de comer'];
var CAM='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
var XMARK='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

function H(){var h=state.health;if(!h||typeof h!=='object')h=state.health={};['exams','conds','ctrls','treats'].forEach(function(k){if(!Array.isArray(h[k]))h[k]=[]});return h}
function D(){if(!Array.isArray(state.doses))state.doses=[];return state.doses}
// Migración: suma los campos nuevos a los registros que no los tienen. No borra registros.
function normHealth(h){
  if(!h||typeof h!=='object')return h;
  (h.exams||[]).forEach(function(e){if(!Array.isArray(e.files))e.files=[];if(!Array.isArray(e.conds))e.conds=[];if(!e.vals||typeof e.vals!=='object')e.vals={}});
  (h.ctrls||[]).forEach(function(c){if(!Array.isArray(c.conds))c.conds=c.cond?[c.cond]:[];delete c.cond;if(!Array.isArray(c.files))c.files=[];if(c.nextDate==null)c.nextDate='';c.nextDone=!!c.nextDone});
  (h.conds||[]).forEach(function(c){if(!Array.isArray(c.indicators))c.indicators=[]});
  (h.treats||[]).forEach(function(t){['times','conds','files','history'].forEach(function(k){if(!Array.isArray(t[k]))t[k]=[]})});
  return h;
}
function listOf(t){var h=H();return t==='exam'?h.exams:t==='cond'?h.conds:t==='ctrl'?h.ctrls:h.treats}
function findH(t,id){return listOf(t).filter(function(x){return x.id===id})[0]}
function put(list,rec,old){if(old){rec.id=old.id;for(var i=0;i<list.length;i++)if(list[i].id===old.id)list[i]=rec}else{rec.id=uid();list.push(rec)}}
function uniq(a){var s={};return a.filter(function(x){x=String(x||'').trim();if(!x||s[x.toLowerCase()])return false;s[x.toLowerCase()]=1;return true})}

/* ---------- Formato ---------- */
function addMonths(ds,n){var d=new Date(ds+'T12:00'),day=d.getDate();d.setMonth(d.getMonth()+n);if(d.getDate()!==day)d.setDate(0);return ymd(d)}
function dlong(ds){return ds?dshort(ds)+' '+ds.slice(0,4):''}
function inDays(ds){var n=daysBetween(T(),ds);return n===0?'hoy':n===1?'mañana':n===-1?'ayer':n>0?'en '+n+' días':'hace '+(-n)+' días'}
function cdate(ds){if(!ds)return '<div class="cdate"><b>—</b><span>sin fecha</span></div>';var p=ds.split('-');return '<div class="cdate"><b>'+(+p[2])+'</b><span>'+MESES[+p[1]-1]+'</span></div>'}
function condNames(ids){return (ids||[]).map(function(id){var c=findH('cond',id);return c?c.name:''}).filter(Boolean)}
function fmtV(n){return Number(n).toLocaleString('es-CL',{maximumFractionDigits:2})}
function fmtRange(lo,hi){if(lo!=null&&hi!=null)return fmtV(lo)+'–'+fmtV(hi);if(hi!=null)return '< '+fmtV(hi);if(lo!=null)return '> '+fmtV(lo);return ''}
function fmtSize(n){n=+n||0;return n<1048576?Math.max(1,Math.round(n/1024))+' KB':(n/1048576).toFixed(1).replace('.',',')+' MB'}
function slug(t){var x=String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');return x||'valor'}
function normT(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/^(control|examen|receta)\s*[:·-]?\s*/,'').replace(/[^a-z0-9]+/g,' ').trim()}
function num(v){if(v==null)return null;var s=String(v).trim().replace(/\s/g,'').replace(',','.');if(s==='')return null;var n=Number(s);return isNaN(n)?NaN:n}
function dueBadge(ds){var d=daysBetween(T(),ds);if(d<0)return '<span class="badge warn">Atrasado '+(-d)+(d===-1?' día':' días')+'</span>';if(d===0)return '<span class="badge warn">Hoy</span>';if(d<=14)return '<span class="badge">En '+d+(d===1?' día':' días')+'</span>';return '<span class="badge mut">'+dshort(ds)+'</span>'}

/* ---------- Google Calendar ---------- */
function gcalUrl(text,date,time,details){
  var dates;
  if(time){var s=new Date(date+'T'+time),e=new Date(s.getTime()+3600000);var f=function(d){return ymd(d).replace(/-/g,'')+'T'+pad(d.getHours())+pad(d.getMinutes())+'00'};dates=f(s)+'/'+f(e)}
  else dates=date.replace(/-/g,'')+'/'+plusDays(date,1).replace(/-/g,'');
  var q='action=TEMPLATE&text='+encodeURIComponent(text)+'&dates='+dates+'&ctz=America%2FSantiago';
  if(details)q+='&details='+encodeURIComponent(details);
  return 'https://calendar.google.com/calendar/render?'+q;
}
function gcalLink(text,date,time,details,cls){return '<a class="'+(cls||'btn line sm')+'" href="'+esc(gcalUrl(text,date,time,details))+'" target="_blank" rel="noopener">Agregar a Google Calendar</a>'}

/* ---------- Controles y pendientes ---------- */
function upcomingCtrls(){return H().ctrls.filter(function(c){return !c.done}).sort(function(a,b){return (a.date+(a.time||''))<(b.date+(b.time||''))?-1:1})}
function nextCtrl(){var t=T();return upcomingCtrls().filter(function(c){return c.date>=t})[0]||null}
function linkedExams(c){var k=c&&c.linkKey;return k?H().exams.filter(function(e){return e.fromKey===k}):[]}
function isResolved(r){
  if(!r||!r.nextDate||r.nextDone)return true;
  var conds=r.conds||[],nt=normT(r.title);
  return H().ctrls.some(function(x){
    if(x.id===r.id||!(x.date>r.date))return false;
    if(conds.length)return (x.conds||[]).some(function(c){return conds.indexOf(c)>=0});
    var xt=normT(x.title);return !!(xt&&nt&&(xt===nt||xt.indexOf(nt)>=0||nt.indexOf(xt)>=0));
  });
}
function pendings(){return H().ctrls.filter(function(c){return c.nextDate&&!isResolved(c)}).sort(function(a,b){return a.nextDate<b.nextDate?-1:1})}
function pendingExams(){return H().exams.filter(function(e){return e.st==='pendiente'}).sort(function(a,b){return (a.date||'9999')<(b.date||'9999')?-1:1})}
function repeatDue(){
  var last={},pend={};
  H().exams.forEach(function(e){var k=e.name.trim().toLowerCase();if(e.st==='pendiente'){pend[k]=1;return}if(!e.date)return;if(!last[k]||last[k].date<e.date)last[k]=e});
  return Object.keys(last).filter(function(k){return +last[k].rep>0&&!pend[k]}).map(function(k){var e=last[k];return {e:e,due:addMonths(e.date,+e.rep)}}).sort(function(a,b){return a.due<b.due?-1:1});
}

/* ---------- Tratamientos ---------- */
function tTimes(t){var seen={};return (t.times||[]).filter(function(x){if(!/^\d{2}:\d{2}$/.test(x)||seen[x])return false;seen[x]=1;return true}).sort()}
function tActive(t,day){day=day||T();return !!t&&(!t.start||t.start<=day)&&(!t.end||t.end>=day)}
function tEnded(t){return !!t.end&&t.end<T()}
function tLastChange(t){return (t.history||[]).filter(function(h){return h.date>(t.start||'')}).sort(function(a,b){return a.date<b.date?1:-1})[0]||null}
function tNewDose(t){var c=tLastChange(t),td=T();return c&&c.date<=td&&daysBetween(c.date,td)<=7?c:null}
function tProgress(t){
  var td=T();
  if(t.start&&t.start>td)return {txt:'Empieza el '+dshort(t.start),cls:'mut'};
  if(!t.end)return {txt:'Permanente',cls:'mut'};
  if(t.end<td)return {txt:'Terminó el '+dshort(t.end),cls:'mut',done:true};
  var left=daysBetween(td,t.end);
  if(!t.start)return {txt:'Hasta el '+dshort(t.end),cls:left<=3?'warn':'ok'};
  var n=daysBetween(t.start,td)+1,tot=daysBetween(t.start,t.end)+1;
  return {txt:'Día '+n+' de '+tot,cls:left<=3?'warn':'ok',pct:Math.round(n/tot*100),sub:left===0?'Hoy es el último día':left===1?'Termina mañana':'Termina el '+dlong(t.end)};
}
function endingSoon(){var td=T();return H().treats.filter(function(x){return x.end&&tActive(x)&&daysBetween(td,x.end)<=7}).sort(function(a,b){return a.end<b.end?-1:1})}
function doseKey(tid,time,day){return (day||T())+'_'+tid+'_'+String(time||'dia').replace(':','')}
function doseOf(tid,time){var k=doseKey(tid,time);return D().filter(function(d){return d.id===k})[0]}

/* ---------- Valores a seguir ---------- */
function parseIndicators(text,existing){
  var used={};
  return String(text||'').split('\n').map(function(l){return l.trim()}).filter(Boolean).map(function(l){
    var parts=l.split('|'),label=parts[0].trim(),unit=(parts[1]||'').trim(),found=null;
    (existing||[]).forEach(function(e){if(!found&&!used[e.id]&&e.label===label)found=e});
    var id=found?found.id:slug(label),base=id,k=2;
    if(!found)while(used[id]){id=base+'_'+k;k++}
    used[id]=1;return {id:id,label:label,unit:unit};
  }).filter(function(x){return x.label});
}
function indById(id){var r=null;H().conds.forEach(function(c){(c.indicators||[]).forEach(function(i){if(!r&&i.id===id)r=i})});return r}
function indsFor(condIds){var seen={},out=[];(condIds||[]).forEach(function(cid){var c=findH('cond',cid);(c&&c.indicators||[]).forEach(function(i){if(!seen[i.id]){seen[i.id]=1;out.push(i)}})});return out}
function indPoints(cond,ind){
  var pts=[];
  H().exams.forEach(function(e){if((e.conds||[]).indexOf(cond.id)<0||!e.vals||!e.vals[ind.id]||!e.date)return;var x=e.vals[ind.id];if(typeof x.v!=='number'||isNaN(x.v))return;pts.push({date:e.date,v:x.v,lo:x.lo==null?null:x.lo,hi:x.hi==null?null:x.hi})});
  return pts.sort(function(a,b){return a.date<b.date?-1:1});
}
function flagOf(p){if(p.hi!=null&&p.v>p.hi)return 'Alto';if(p.lo!=null&&p.v<p.lo)return 'Bajo';return ''}
function lastRange(indId,skipId){var best=null;H().exams.forEach(function(e){if(e.id===skipId||!e.vals||!e.vals[indId])return;var x=e.vals[indId];if(x.lo==null&&x.hi==null)return;if(!best||e.date>best.date)best={date:e.date,lo:x.lo,hi:x.hi}});return best||{}}
function sparkline(pts,W,Hh){
  if(pts.length<2)return '';
  var px=W<100?4:7,py=W<100?4:7,small=W<100,tm=function(p){return new Date(p.date+'T12:00').getTime()};
  var t0=tm(pts[0]),t1=tm(pts[pts.length-1]),last=pts[pts.length-1];
  var vs=pts.map(function(p){return p.v});if(last.lo!=null)vs.push(last.lo);if(last.hi!=null)vs.push(last.hi);
  var mn=Math.min.apply(null,vs),mx=Math.max.apply(null,vs);if(mx-mn<1e-9){mn-=1;mx+=1}var pv=(mx-mn)*.1;mn-=pv;mx+=pv;
  var X=function(t){return t1===t0?W/2:px+(t-t0)/(t1-t0)*(W-2*px)},Y=function(v){return py+(mx-v)/(mx-mn)*(Hh-2*py)};
  var s='<svg class="spark" viewBox="0 0 '+W+' '+Hh+'" width="'+W+'" height="'+Hh+'" aria-hidden="true" focusable="false">';
  if(last.lo!=null||last.hi!=null){var yT=last.hi!=null?Y(last.hi):0,yB=last.lo!=null?Y(last.lo):Hh;s+='<rect class="band" x="0" y="'+yT.toFixed(1)+'" width="'+W+'" height="'+Math.max(2,yB-yT).toFixed(1)+'" rx="3"></rect>'}
  s+='<path class="ln" d="'+pts.map(function(p,i){return (i?'L':'M')+X(tm(p)).toFixed(1)+' '+Y(p.v).toFixed(1)}).join(' ')+'"></path>';
  pts.forEach(function(p,i){var lst=i===pts.length-1;s+='<circle class="pt'+(lst?' last':'')+(flagOf(p)?' out':'')+'" cx="'+X(tm(p)).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="'+(small?(lst?3:2):(lst?4:3))+'"></circle>'});
  return s+'</svg>';
}
function indRows(cond){
  var rows=(cond.indicators||[]).map(function(ind){
    var pts=indPoints(cond,ind);if(!pts.length)return '';
    var last=pts[pts.length-1],prev=pts.length>1?pts[pts.length-2]:null,fl=flagOf(last),range=fmtRange(last.lo,last.hi),tr='';
    if(fl)tr='<span class="tr out">'+fl+(range?' · ref. '+esc(range):'')+'</span>';
    else if(prev){var dv=last.v-prev.v;tr='<span class="tr">'+(Math.abs(dv)<1e-9?'= igual que antes':(dv>0?'↑ ':'↓ ')+esc(fmtV(Math.abs(dv)))+' vs anterior')+'</span>'}
    else if(range)tr='<span class="tr">Ref. '+esc(range)+'</span>';
    var hist=pts.slice().reverse().map(function(p){var f=flagOf(p);return '<div><span>'+dlong(p.date)+'</span><b>'+esc(fmtV(p.v))+(ind.unit?' '+esc(ind.unit):'')+'</b>'+(f?'<span class="badge warn">'+f+'</span>':'<span></span>')+'</div>'}).join('');
    return '<details class="ind"><summary><span class="grow"><span class="ttl" style="display:block">'+esc(ind.label)+'</span><span class="meta">'+dlong(last.date)+(pts.length>1?' · '+pts.length+' mediciones':'')+'</span></span>'+
      '<span class="vv"><b class="'+(fl?'late':'')+'">'+esc(fmtV(last.v))+(ind.unit?' <small>'+esc(ind.unit)+'</small>':'')+'</b>'+tr+'</span>'+sparkline(pts,72,30)+'</summary>'+
      '<div class="ihist">'+sparkline(pts,300,90)+hist+(range?'<p class="meta">Rango de referencia del último examen: '+esc(range)+(ind.unit?' '+esc(ind.unit):'')+'</p>':'')+'</div></details>';
  }).join('');
  return rows?'<p class="meta">Último valor medido · toca para ver el historial</p>'+rows:((cond.indicators||[]).length?'<p class="meta">Todavía no hay valores. Se agregan al registrar un examen vinculado a esta patología.</p>':'');
}
function examVals(e){
  var ks=Object.keys(e.vals||{});if(!ks.length)return '';
  return ks.map(function(k){var x=e.vals[k],ind=indById(k)||{label:k,unit:''},fl=flagOf(x),rg=fmtRange(x.lo,x.hi);
    return '<div class="row"><div class="grow"><div class="ttl">'+esc(ind.label)+'</div>'+(rg?'<div class="meta">Ref. '+esc(rg)+'</div>':'')+'</div><b class="'+(fl?'late':'')+'" style="font-variant-numeric:tabular-nums">'+esc(fmtV(x.v))+(ind.unit?' '+esc(ind.unit):'')+'</b>'+(fl?'<span class="badge warn">'+fl+'</span>':'')+'</div>'}).join('');
}

/* ---------- Archivos: almacén del artefacto (cambiar aquí al pasar a Supabase) ---------- */
var FILES={assets:null,downloads:null};
var MAX_BYTES=20*1024*1024,OK_TYPES={'application/pdf':1,'image/jpeg':1,'image/png':1,'image/webp':1,'image/gif':1};
function isImg(t){return /^image\//.test(t||'')}
/* Archivos en Supabase Storage (bucket privado «archivos», ruta <uid>/<nombre>; el id del archivo es esa ruta).
   Las imágenes se muestran con enlaces firmados que duran 1 hora. Mientras llega el enlace se muestra un marcador vacío
   que lleva el id adentro, y swapImgs() lo reemplaza. Los archivos subidos en el artefacto no se migran solos. */
var SIGN={},pendSign={},signT=null,PIXP='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22/%3E%3C!--';
function signOk(id){var c=SIGN[id];return c&&c.exp>Date.now()?c.url:''}
function fileUrl(id){var u=signOk(id);if(u)return u;pendSign[id]=1;clearTimeout(signT);signT=setTimeout(flushSign,40);return PIXP+encodeURIComponent(encodeURIComponent(id))+'--%3E'}
function flushSign(){var ids=Object.keys(pendSign);pendSign={};if(!ids.length||!sb||!auth.user)return;
  sb.storage.from('archivos').createSignedUrls(ids,3600).then(function(r){(r.data||[]).forEach(function(x){if(x&&x.signedUrl&&x.path)SIGN[x.path]={url:x.signedUrl,exp:Date.now()+3300000}});swapImgs()})}
function swapImgs(){Array.prototype.forEach.call(document.querySelectorAll('img'),function(im){var s0=im.getAttribute('src')||'';if(s0.indexOf(PIXP)!==0)return;var id=decodeURIComponent(decodeURIComponent(s0.slice(PIXP.length).replace(/--%3E$/,'')));var u=signOk(id);if(u)im.setAttribute('src',u)})}
function getUrl(id){var u=signOk(id);if(u)return Promise.resolve(u);return sb.storage.from('archivos').createSignedUrl(id,3600).then(function(r){if(r.error||!r.data)throw {code:'fetch'};SIGN[id]={url:r.data.signedUrl,exp:Date.now()+3300000};return r.data.signedUrl})}
var SEXT={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
function sbAssets(uid){return {
  upload:function(file,o){var ty=(o&&o.type)||file.type,path=uid+'/'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)+'.'+(SEXT[ty]||'bin');
    return sb.storage.from('archivos').upload(path,file,{contentType:ty,upsert:false}).then(function(r){
      if(r.error){var m=String(r.error.message||'');throw {code:/size|large/i.test(m)?'too_large':/mime|type/i.test(m)?'bad_type':/quota/i.test(m)?'quota_or_state':'up'}}
      try{SIGN[path]={url:URL.createObjectURL(file),exp:Date.now()+3300000}}catch(e){}
      return {id:path,sizeBytes:file.size}})},
  delete:function(id){return sb.storage.from('archivos').remove([id])}
}}
function sbDownloads(){return {save:function(o){var u=URL.createObjectURL(o.data),a=document.createElement('a');a.href=u;a.download=o.filename;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},4000);return Promise.resolve()}}}
function uploadFile(file,type){return FILES.assets.upload(file,{type:type})}
function deleteFile(id){if(!FILES.assets||!id)return Promise.resolve();return FILES.assets.delete(id).catch(function(){})}
function deleteFilesOf(list){(list||[]).forEach(function(f){deleteFile(f.id)})}
function extType(name){var m=String(name).toLowerCase().match(/\.([a-z0-9]+)$/),e=m?m[1]:'';return {pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',heic:'image/heic',heif:'image/heif'}[e]||''}
function errMsg(e){var c=e&&e.code;if(c==='too_large')return 'Pesa más de 20 MB.';if(c==='bad_type'||c==='unsupported_type')return 'Formato no admitido. Usa PDF, JPG o PNG.';if(c==='quota_or_state')return 'Se llenó el espacio de almacenamiento.';if(c==='rate_limited')return 'Demasiados archivos seguidos. Espera unos segundos.';if(c==='convert')return 'No se pudo leer esta foto. Prueba con JPG o PNG.';return 'No se pudo subir. Intenta de nuevo.'}
function toJpeg(file){
  return new Promise(function(resolve,reject){
    var url=URL.createObjectURL(file),im=new Image();
    im.onload=function(){try{var s=Math.min(1,3000/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*s);c.height=Math.round(im.naturalHeight*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      c.toBlob(function(b){URL.revokeObjectURL(url);if(!b)return reject({code:'convert'});resolve(new File([b],String(file.name).replace(/\.\w+$/,'')+'.jpg',{type:'image/jpeg'}))},'image/jpeg',.88)}catch(e){URL.revokeObjectURL(url);reject({code:'convert'})}};
    im.onerror=function(){URL.revokeObjectURL(url);reject({code:'convert'})};
    im.src=url;
  });
}
var EXT={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
function dlName(f){var n=String(f.name||'archivo').trim()||'archivo',m=n.match(/\.([a-z0-9]+)$/i);if(m&&['pdf','jpg','jpeg','png','webp','gif'].indexOf(m[1].toLowerCase())>=0)return n;return n+'.'+(EXT[f.type]||'pdf')}
function downloadFile(f,btn){
  if(!FILES.downloads)return;if(btn)btn.disabled=true;
  getUrl(f.id).then(function(u){return fetch(u)}).then(function(r){if(!r.ok)throw {code:'fetch'};return r.blob()}).then(function(b){return FILES.downloads.save({filename:dlName(f),data:b})}).then(function(){toast('Descarga lista')},function(e){var c=e&&e.code;if(c==='declined')return;toast(c==='rate_limited'?'Ya hay una descarga esperando confirmación.':'No se pudo descargar el archivo.')}).then(function(){if(btn)btn.disabled=false});
}
// Contexto de archivos del formulario abierto
var fuid=0;
function newCtx(files,slot){return {files:(files||[]).map(function(f){return {id:f.id,name:f.name,type:f.type,size:f.size,kind:f.kind,slot:slot,status:'ok',uid:++fuid}}),uploaded:[],removed:[],saved:false}}
function cleanupCtx(){var c=ui.fctx;if(c&&!c.saved)c.uploaded.forEach(deleteFile);ui.fctx=null}
function pendingUp(){return !!(ui.fctx&&ui.fctx.files.some(function(f){return f.status==='up'}))}
function savedFiles(slot,kind){var c=ui.fctx;if(!c)return [];return c.files.filter(function(f){return f.status==='ok'&&f.id&&f.slot===slot}).map(function(f){var o={id:f.id,name:f.name,type:f.type,size:f.size};if(kind)o.kind=kind;return o})}
function addFiles(list,slot){
  var ctx=ui.fctx,files=Array.prototype.slice.call(list||[]);if(!ctx||!files.length)return;
  if(!FILES.assets){toast('Subir archivos no está disponible en esta vista.');return}
  var run=Promise.resolve();
  files.forEach(function(f){
    var type=f.type||extType(f.name),en={name:f.name,type:type,size:f.size,status:'up',uid:++fuid,slot:slot};
    ctx.files.push(en);refreshFiles(slot);
    run=run.then(function(){
      var up=f;
      return Promise.resolve().then(function(){
        if(!(type==='application/pdf'||(isImg(type)&&type!=='image/svg+xml')))throw {code:'bad_type'};
        if(isImg(type)&&!OK_TYPES[type])return toJpeg(f).then(function(j){up=j;en.type='image/jpeg';en.name=j.name});
      }).then(function(){if(up.size>MAX_BYTES)throw {code:'too_large'};return uploadFile(up,en.type)})
      .then(function(res){en.id=res.id;en.size=res.sizeBytes||up.size;en.status='ok';if(ui.fctx!==ctx||ctx.saved)deleteFile(res.id);else ctx.uploaded.push(res.id)})
      .catch(function(e){en.status='err';en.err=errMsg(e)}).then(function(){refreshFiles(slot)});
    });
  });
}
function removeFile(uidv){
  var c=ui.fctx;if(!c)return;var en=c.files.filter(function(f){return f.uid===uidv})[0];if(!en)return;
  if(en.id){var i=c.uploaded.indexOf(en.id);if(i>-1){c.uploaded.splice(i,1);deleteFile(en.id)}else c.removed.push(en.id)}
  c.files=c.files.filter(function(f){return f!==en});refreshFiles(en.slot);
}
function filesList(slot){
  var c=ui.fctx;if(!c)return '';
  return c.files.filter(function(f){return f.slot===slot}).map(function(f){
    var th=f.status==='ok'&&isImg(f.type)?'<img src="'+fileUrl(f.id)+'" alt="">':'<span class="fic">'+(f.type==='application/pdf'?'PDF':'IMG')+'</span>';
    var st=f.status==='up'?'Subiendo…':f.status==='err'?'<span class="late">'+esc(f.err)+'</span>':fmtSize(f.size);
    return '<li>'+th+'<span class="grow"><span class="ttl fname">'+esc(f.name)+'</span><span class="meta">'+st+'</span></span><button class="x" type="button" data-act="frm" data-u="'+f.uid+'">Quitar</button></li>';
  }).join('');
}
function refreshFiles(slot){var el=$('filelist-'+slot);if(el)el.innerHTML=filesList(slot)}
function filesZone(slot,title,hint){
  var id='f-files-'+slot,zone=FILES.assets?
    '<div class="fz"><label class="drop" for="'+id+'" data-slot="'+slot+'"><b>Adjuntar '+title.toLowerCase()+'</b><span>PDF o foto · toca o arrastra aquí</span></label><input id="'+id+'" class="sr" type="file" accept="application/pdf,image/*" multiple data-slot="'+slot+'">'+
    '<label class="btn line sm camb" for="f-cam-'+slot+'">'+CAM+'Tomar foto</label><input id="f-cam-'+slot+'" class="sr" type="file" accept="image/*" capture="environment" data-slot="'+slot+'"></div>':
    '<p class="meta">Subir archivos no está disponible en esta vista.</p>';
  return '<div class="field"><span class="label">'+title+'</span>'+(hint?'<span class="meta">'+hint+'</span>':'')+zone+'<ul class="files" id="filelist-'+slot+'">'+filesList(slot)+'</ul></div>';
}
function fileChips(files){
  return '<div class="fgrid">'+(files||[]).map(function(f){return '<button type="button" class="ftile" data-act="fopen" data-id="'+esc(f.id)+'" data-n="'+esc(f.name)+'" data-ty="'+esc(f.type)+'">'+(isImg(f.type)?'<img src="'+fileUrl(f.id)+'" alt="">':'<span class="fic">PDF</span>')+'<span class="fname">'+esc(f.name)+'</span></button>'}).join('')+'</div>';
}
// Visor de PDF con pdf.js (sin worker propio: se carga el worker como script)
var PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/',pdfP=null;
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
function loadPdfLib(){if(!pdfP){pdfP=loadScript(PDFJS+'pdf.worker.min.js').then(function(){return loadScript(PDFJS+'pdf.min.js')}).then(function(){if(!window.pdfjsLib)throw 0;return window.pdfjsLib});pdfP.catch(function(){pdfP=null})}return pdfP}
function renderPdf(box,url){
  if(!box)return;box.innerHTML='<p class="meta" style="padding:14px">Cargando PDF…</p>';
  loadPdfLib().then(function(L){return L.getDocument({url:url,isEvalSupported:false}).promise}).then(function(doc){
    box.innerHTML='';var w=box.clientWidth||340,chain=Promise.resolve();
    for(var i=1;i<=doc.numPages;i++)(function(n){chain=chain.then(function(){return doc.getPage(n).then(function(pg){
      var v1=pg.getViewport({scale:1}),dpr=Math.min(2,window.devicePixelRatio||1),vp=pg.getViewport({scale:w/v1.width*dpr});
      var c=document.createElement('canvas');c.width=Math.floor(vp.width);c.height=Math.floor(vp.height);c.className='pdfpg';
      var cap=document.createElement('p');cap.className='meta';cap.style.padding='4px 10px 10px';cap.textContent='Página '+n+' de '+doc.numPages;
      box.appendChild(c);box.appendChild(cap);return pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
    })})})(i);
    return chain;
  }).catch(function(){box.innerHTML='<p class="meta" style="padding:14px">No se pudo mostrar este PDF aquí. Puedes descargarlo.</p>'});
}

/* ---------- Filas y tarjetas ---------- */
function ctrlRow(c){
  var t=T(),late=!c.done&&c.date<t,nf=(c.files||[]).length+linkedExams(c).reduce(function(s,e){return s+(e.files||[]).length},0);
  var meta=[c.time,c.doc,c.place].filter(Boolean).map(esc).concat(condNames(c.conds).map(esc)).join(' · ');
  if(nf)meta+=(meta?' · ':'')+nf+(nf===1?' archivo':' archivos');
  return '<div class="row'+(c.done?' done':'')+'"><button class="chk" type="button" data-act="hdone" data-id="'+c.id+'" aria-pressed="'+!!c.done+'" aria-label="Marcar '+esc(c.title)+' como realizado">'+CHECK+'</button>'+cdate(c.date)+
    '<button class="rowbtn" type="button" data-act="hview" data-t="ctrl" data-id="'+c.id+'"><div class="ttl">'+esc(c.title)+'</div><div class="meta">'+(meta||'Toca para ver el detalle')+'</div></button>'+
    (c.done?'<button class="link" type="button" data-act="hnext" data-id="'+c.id+'" style="flex:0 0 auto">Agendar otro</button>':'<span class="badge'+(late?' warn':'')+'">'+(late?'pendiente':inDays(c.date))+'</span>')+'</div>';
}
function examRow(e,extra){
  var nf=(e.files||[]).length,meta=[e.place,e.doc].filter(Boolean).map(esc).concat(condNames(e.conds).map(esc));
  if(nf)meta.push(nf+(nf===1?' archivo':' archivos'));
  var fl=Object.keys(e.vals||{}).some(function(k){return flagOf(e.vals[k])});
  if(!meta.length&&e.notes)meta.push(esc(e.notes.length>60?e.notes.slice(0,60)+'…':e.notes));
  return '<div class="row">'+cdate(e.date)+'<button class="rowbtn" type="button" data-act="hview" data-t="exam" data-id="'+e.id+'"><div class="ttl">'+esc(e.name)+'</div><div class="meta">'+(meta.join(' · ')||(e.st==='pendiente'?'Por hacer':'Sin notas'))+(fl?' · <span class="late">valores fuera de rango</span>':'')+'</div></button>'+(extra||'')+'</div>';
}
function pendRow(c){
  return '<div class="row pend">'+cdate(c.nextDate)+'<button class="rowbtn" type="button" data-act="hview" data-t="ctrl" data-id="'+c.id+'"><div class="ttl">Volver a '+esc(c.title)+'</div><div class="meta">Lo pidió el control del '+dshort(c.date)+'</div></button>'+dueBadge(c.nextDate)+
    '<div class="pacts"><button class="btn acc sm" type="button" data-act="pnow" data-id="'+c.id+'">Registrar ahora</button><button class="btn line sm" type="button" data-act="pdis" data-id="'+c.id+'">Descartar</button>'+gcalLink('Control: '+c.title,c.nextDate,'','Pedido en el control del '+dlong(c.date),'link')+'</div></div>';
}
function treatCard(t){
  var pr=tProgress(t),nd=tNewDose(t);
  var tags=tTimes(t).map(function(x){return '<span class="tt">'+x+'</span>'}).join('')+(t.how?'<span class="badge mut">'+esc(t.how)+'</span>':'')+condNames(t.conds).map(function(n){return '<span class="badge mut">'+esc(n)+'</span>'}).join('')+(nd?'<span class="badge">Dosis nueva desde '+dshort(nd.date)+'</span>':'')+((t.files||[]).length?'<span class="badge mut">Con receta</span>':'');
  return '<button type="button" class="glass tcard'+(pr.done?' ended':'')+'" data-act="hview" data-t="treat" data-id="'+t.id+'"><span class="tc1"><span class="grow"><b class="ttl" style="display:block">'+esc(t.name)+'</b>'+(t.dose?'<span class="meta">'+esc(t.dose)+'</span>':'')+'</span><span class="badge '+pr.cls+'">'+esc(pr.txt)+'</span></span>'+
    (tags?'<span class="tags">'+tags+'</span>':'')+(pr.pct!=null?'<span class="bar"><span style="width:'+pr.pct+'%"></span></span><span class="meta">'+esc(pr.sub)+'</span>':'')+'</button>';
}
function addBtn(t,label){return '<button class="link" type="button" data-act="hnew" data-t="'+t+'">'+label+'</button>'}

/* ---------- Mi día: dosis y pendientes ---------- */
function medsTodayHtml(){
  var td=T(),rows=[];
  H().treats.forEach(function(x){if(!tActive(x,td))return;var ts=tTimes(x);(ts.length?ts:['']).forEach(function(tm){rows.push([tm,x])})});
  if(!rows.length)return '';
  rows.sort(function(a,b){return (a[0]||'99')<(b[0]||'99')?-1:1});
  var o='<section><div class="sh"><h2>Medicamentos de hoy</h2><button class="link" type="button" data-act="gosalud" data-v="tratamientos">Tratamientos</button></div>';
  rows.forEach(function(r){
    var tm=r[0],x=r[1],d=doseOf(x.id,tm),nd=tNewDose(x),pr=tProgress(x),tags=[];
    if(nd)tags.push('<span class="badge">Dosis nueva desde '+dshort(nd.date)+'</span>');
    if(x.end)tags.push('<span class="badge mut">'+esc(pr.txt)+'</span>');
    o+='<div class="row med'+(d?' taken':'')+'"><button class="chk" type="button" data-act="dose" data-id="'+x.id+'" data-v="'+tm+'" aria-pressed="'+!!d+'" aria-label="'+(d?'Quitar marca de ':'Marcar como tomado: ')+esc(x.name)+'">'+CHECK+'</button><span class="time">'+(tm||'Hoy')+'</span>'+
      '<button class="rowbtn" type="button" data-act="hview" data-t="treat" data-id="'+x.id+'"><div class="ttl">'+esc(x.name)+'</div><div class="meta">'+[esc(x.dose||''),esc(x.how||''),d?'Tomado · '+d.at:''].filter(Boolean).join(' · ')+'</div>'+(tags.length?'<div class="tags">'+tags.join('')+'</div>':'')+'</button></div>';
  });
  return o+'</section>';
}
function pendTodayHtml(){
  var td=T(),ps=pendings().filter(function(c){return daysBetween(td,c.nextDate)<=14});
  if(!ps.length)return '';
  return '<section><div class="sh"><h2>Salud pendiente</h2><button class="link" type="button" data-act="gosalud" data-v="controles">Controles</button></div>'+ps.map(pendRow).join('')+'</section>';
}

/* ---------- Pestañas de Salud ---------- */
/* Resumen (opción B del lienzo): panel de tarjetas. Cada tarjeta lleva a su pestaña o ficha. */
function dosesToday(){
  var td=T(),rows=[];
  H().treats.forEach(function(x){if(!tActive(x,td))return;var ts=tTimes(x);(ts.length?ts:['']).forEach(function(tm){rows.push({t:x,tm:tm,d:doseOf(x.id,tm)})})});
  return rows.sort(function(a,b){return (a.tm||'99')<(b.tm||'99')?-1:1});
}
function viewResumen(){
  var t=T(),ci=cycleNow(),o='<div class="bento">';
  // Ciclo
  o+='<div class="btile wide cyt">';
  if(ci){
    var ph=phaseOf(ci.day),L=cfg().len;
    o+='<button class="minicyc" type="button" data-act="sub" data-v="ciclo" aria-label="Día '+ci.day+' de '+L+', fase '+PH[ph].n.toLowerCase()+'. Ver ciclo">'+ring(ci.day)+'<span class="mid"><b>'+ci.day+'</b><span>de '+L+'</span></span></button>'+
      '<div class="grow" style="display:flex;flex-direction:column;gap:5px;min-width:0"><p class="label">Ciclo</p><span class="phchip ph-'+ph+'"><i class="pdot"></i>Fase '+PH[ph].n.toLowerCase()+'</span>'+
      '<p class="meta">'+(ci.late>0?'Se esperaba el '+dshort(ci.due)+' · '+ci.late+(ci.late===1?' día':' días')+' de diferencia':ci.left===0?'Tu período podría llegar hoy':'Período en ~'+ci.left+(ci.left===1?' día':' días')+' · '+dshort(ci.next))+'</p>'+
      '<button class="btn sal sm" type="button" data-act="sheet" data-s="period" style="align-self:flex-start;margin-top:2px">Me llegó el período</button></div>';
  } else {
    o+='<div class="grow" style="display:flex;flex-direction:column;gap:5px"><p class="label">Ciclo</p><p class="ttl">Aún no hay períodos anotados</p><p class="meta">Anota el día que te llegue y calculo tu día del ciclo, tu fase y el próximo período.</p>'+
      '<button class="btn sal sm" type="button" data-act="sheet" data-s="period" style="align-self:flex-start;margin-top:2px">Me llegó el período</button></div>';
  }
  o+='</div>';
  // Medicamentos de hoy
  var ds=dosesToday(),tk=ds.filter(function(r){return r.d}).length,nx=ds.filter(function(r){return !r.d})[0];
  o+='<div class="btile"><p class="label">Medicamentos</p>';
  if(ds.length){
    o+='<p class="big">'+tk+'<small>/'+ds.length+'</small></p><div class="bar" role="progressbar" aria-label="Dosis tomadas hoy" aria-valuemin="0" aria-valuemax="'+ds.length+'" aria-valuenow="'+tk+'"><span style="width:'+Math.round(tk*100/ds.length)+'%"></span></div>';
    if(nx)o+='<p class="meta">Falta '+esc(nx.t.name)+(nx.tm?' · '+nx.tm:'')+'</p><button class="btn line sm" type="button" data-act="dose" data-id="'+nx.t.id+'" data-v="'+nx.tm+'" style="align-self:flex-start">Ya lo tomé</button>';
    else o+='<p class="meta">Todo tomado hoy</p>';
    o+='<button class="link end" type="button" data-act="sub" data-v="tratamientos">Tratamientos</button>';
  } else o+='<p class="meta">Sin dosis para hoy.</p><button class="link end" type="button" data-act="hnew" data-t="treat">Agregar tratamiento</button>';
  o+='</div>';
  // Próxima cita
  var nc=nextCtrl();
  o+='<div class="btile dark"><p class="label">Próxima cita</p>';
  if(nc){var dd=daysBetween(t,nc.date);
    o+='<p class="big">'+(dd===0?'Hoy':dd===1?'Mañana':dshort(nc.date))+'</p><p class="ttl" style="font-size:.88rem">'+esc(nc.title)+'</p><p class="meta">'+([nc.time,nc.place].filter(Boolean).map(esc).join(' · ')||'Sin hora')+'</p>'+
      '<button class="link end" type="button" data-act="hview" data-t="ctrl" data-id="'+nc.id+'">Ver detalle</button>';
  } else o+='<p class="meta">Sin controles agendados.</p><button class="link end" type="button" data-act="hnew" data-t="ctrl">Agendar control</button>';
  o+='</div>';
  // Último examen
  var ex=H().exams.filter(function(e){return e.st!=='pendiente'&&e.date}).sort(function(a,b){return a.date<b.date?1:-1})[0],pe=pendingExams().length;
  o+='<div class="btile"><p class="label">Último examen</p>';
  if(ex){var fl=Object.keys(ex.vals||{}).some(function(k){return flagOf(ex.vals[k])});
    o+='<p class="ttl">'+esc(ex.name)+'</p><p class="meta">'+dlong(ex.date)+(fl?' · <span class="late">valores fuera de rango</span>':'')+'</p>'+(pe?'<span class="badge" style="align-self:flex-start">'+pe+' por hacer</span>':'')+
      '<button class="link end" type="button" data-act="hview" data-t="exam" data-id="'+ex.id+'">Ver examen</button>';
  } else o+='<p class="meta">'+(pe?pe+(pe===1?' examen por hacer.':' exámenes por hacer.'):'Aún no registras exámenes.')+'</p><button class="link end" type="button" data-act="'+(pe?'sub':'hnew')+'" data-v="examenes" data-t="exam">'+(pe?'Ver exámenes':'Agregar examen')+'</button>';
  o+='</div>';
  // Patologías (antecedentes)
  var ac=H().conds.filter(function(x){return x.st!=='resuelta'});
  o+='<div class="btile"><p class="label">Patologías</p>';
  if(ac.length)o+='<p class="ttl">'+ac.length+(ac.length===1?' activa':' activas')+'</p><p class="meta">'+esc(ac.slice(0,2).map(function(x){return x.name}).join(', '))+(ac.length>2?'…':'')+'</p><button class="link end" type="button" data-act="sub" data-v="controles">Ver y editar</button>';
  else o+='<p class="meta">Diagnósticos, especialista y valores a seguir.</p><button class="link end" type="button" data-act="hnew" data-t="cond">Agregar</button>';
  o+='</div></div>';
  // Pendientes que pidió un control (solo si hay)
  var ps=pendings();
  if(ps.length)o+='<section><div class="sh"><h2>Pendientes</h2></div>'+ps.map(pendRow).join('')+'</section>';
  return o;
}
function viewTratamientos(){
  var ts=H().treats,act=ts.filter(function(x){return !tEnded(x)}).sort(function(a,b){return a.name<b.name?-1:1}),fin=ts.filter(tEnded).sort(function(a,b){return a.end<b.end?1:-1});
  var o='<p class="muted" style="font-size:.88rem">Cada medicamento se anota una sola vez aquí. Mi día arma solo la lista de dosis de cada día.</p><div class="btns"><button class="btn acc" type="button" data-act="hnew" data-t="treat">Agregar tratamiento</button></div>';
  o+='<section><div class="sh"><h2>Activos</h2></div>'+(act.length?'<div class="tlist">'+act.map(treatCard).join('')+'</div>':'<div class="empty">No tienes tratamientos activos.</div>')+'</section>';
  if(fin.length)o+='<details class="fin"><summary>Terminados ('+fin.length+')</summary><div class="tlist">'+fin.map(treatCard).join('')+'</div></details>';
  return o;
}
function viewExamenes(){
  var t=T(),o='<div class="btns"><button class="btn acc" type="button" data-act="hnew" data-t="exam">Agregar examen</button></div>';
  var pe=pendingExams();
  o+='<section><div class="sh"><h2>Por hacer</h2></div>';
  if(!pe.length)o+='<div class="empty">No tienes exámenes pendientes.</div>';
  pe.forEach(function(e){o+=examRow(e,'<span class="badge">'+(e.date?inDays(e.date):'sin fecha')+'</span>')});
  o+='</section>';
  var rd=repeatDue();
  if(rd.length){
    o+='<section><div class="sh"><h2>Para repetir</h2></div>';
    rd.forEach(function(r){var late=r.due<t,rp=REPS.filter(function(x){return x[0]===+r.e.rep})[0];
      o+='<div class="row">'+cdate(r.due)+'<button class="rowbtn" type="button" data-act="hview" data-t="exam" data-id="'+r.e.id+'"><div class="ttl">'+esc(r.e.name)+'</div><div class="meta">Último: '+dlong(r.e.date)+(rp?' · '+esc(rp[1].toLowerCase()):'')+'</div></button><button class="link" type="button" data-act="hagain" data-id="'+r.e.id+'" style="flex:0 0 auto">'+(late?'Agendar ya':'Agendar')+'</button></div>'});
    o+='</section>';
  }
  var done=H().exams.filter(function(e){return e.st!=='pendiente'}).sort(function(a,b){return a.date<b.date?1:-1});
  o+='<section><div class="sh"><h2>Historial</h2></div>';
  if(!done.length)o+='<div class="empty">Cuando registres un examen realizado aparecerá aquí con su resultado.</div>';
  done.forEach(function(e){o+=examRow(e,'<span class="badge mut">'+(e.date||'').slice(0,4)+'</span>')});
  o+='</section>';
  return o;
}
function viewControles(){
  var t=T(),o='<div class="btns"><button class="btn acc" type="button" data-act="hnew" data-t="ctrl">Agendar control</button><button class="btn line" type="button" data-act="hnew" data-t="cond">Agregar patología</button></div>';
  var ps=pendings();
  if(ps.length)o+='<section><div class="sh"><h2>Pendientes</h2></div>'+ps.map(pendRow).join('')+'</section>';
  var up=upcomingCtrls();
  o+='<section><div class="sh"><h2>Próximos controles</h2></div>';
  if(!up.length)o+='<div class="empty">No tienes controles agendados.</div>';
  up.forEach(function(x){o+=ctrlRow(x)});
  o+='</section>';
  var cs=H().conds.slice().sort(function(a,b){var r={activa:0,controlada:1,resuelta:2};return (r[a.st]||0)-(r[b.st]||0)||(a.name<b.name?-1:1)});
  o+='<section><div class="sh"><h2>Mis patologías</h2></div>';
  if(!cs.length)o+='<div class="empty">Registra tus diagnósticos con su especialista y tratamiento. Luego puedes vincularles controles, exámenes y tratamientos.</div>';
  cs.forEach(function(x){
    var nx=upcomingCtrls().filter(function(c){return (c.conds||[]).indexOf(x.id)>-1&&c.date>=t})[0],st=CSTAT[x.st]||CSTAT.activa;
    var outs=(x.indicators||[]).filter(function(i){var p=indPoints(x,i);return p.length&&flagOf(p[p.length-1])}).length;
    var meta=[esc(x.doc||''),x.since?'desde '+dlong(x.since):'',nx?'próximo control '+dshort(nx.date):'',outs?'<span class="late">'+outs+(outs===1?' valor fuera de rango':' valores fuera de rango')+'</span>':''].filter(Boolean).join(' · ');
    o+='<div class="row"><button class="rowbtn" type="button" data-act="hview" data-t="cond" data-id="'+x.id+'"><div class="ttl">'+esc(x.name)+'</div><div class="meta">'+(meta||'Toca para ver el detalle')+'</div></button><span class="badge '+st[1]+'">'+st[0]+'</span></div>';
  });
  o+='</section>';
  var past=H().ctrls.filter(function(c){return c.done}).sort(function(a,b){return a.date<b.date?1:-1});
  if(past.length){o+='<section><div class="sh"><h2>Controles anteriores</h2></div>';past.forEach(function(x){o+=ctrlRow(x)});o+='</section>'}
  return o;
}
var SUBS=[['resumen','Resumen'],['ciclo','Ciclo'],['tratamientos','Tratamientos'],['controles','Controles'],['examenes','Exámenes']];
function viewSalud(){
  var o=header('Todo tu bienestar físico, de un vistazo','<em>Salud</em>');
  o+='<div class="seg" role="group" aria-label="Secciones de Salud">'+SUBS.map(function(x){return '<button type="button" data-act="sub" data-v="'+x[0]+'" aria-pressed="'+(ui.sub===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  var s=ui.sub;
  o+=s==='ciclo'?viewCiclo():s==='tratamientos'?viewTratamientos():s==='examenes'?viewExamenes():s==='controles'?viewControles():viewResumen();
  return o;
}

/* ---------- Hojas: formularios y fichas ---------- */
function hHead(title,sub){
  return '<div class="handle"></div><div class="top" style="align-items:flex-start"><div style="min-width:0">'+(ui.stack.length?'<button class="link" type="button" data-act="hback" style="min-height:28px">← Volver</button>':'')+'<h2 class="serif" style="font-size:1.9rem;font-weight:400;overflow-wrap:anywhere">'+title+'</h2>'+(sub?'<p class="muted" style="font-size:.88rem;margin-top:2px">'+sub+'</p>':'')+'</div><button class="close" type="button" data-act="close" aria-label="Cerrar">'+XMARK+'</button></div>';
}
function FV(k){var v=ui.form[k];return v==null?'':v}
function fIn(k,lab,attrs){return '<div class="field"><label class="label" for="h-'+k+'">'+lab+'</label><input id="h-'+k+'" data-f="'+k+'" '+(attrs||'type="text"')+' value="'+esc(FV(k))+'"></div>'}
function fTa(k,lab,ph,hint){return '<div class="field"><label class="label" for="h-'+k+'">'+lab+'</label>'+(hint?'<span class="meta">'+hint+'</span>':'')+'<textarea class="plain" id="h-'+k+'" data-f="'+k+'" maxlength="2000" placeholder="'+esc(ph||'')+'">'+esc(FV(k))+'</textarea></div>'}
function fSel(k,lab,opts){var v=String(FV(k));return '<div class="field"><label class="label" for="h-'+k+'">'+lab+'</label><select id="h-'+k+'" data-f="'+k+'">'+opts.map(function(o){return '<option value="'+esc(o[0])+'"'+(String(o[0])===v?' selected':'')+'>'+esc(o[1])+'</option>'}).join('')+'</select></div>'}
function fChecks(k,lab,opts,rer){
  var sel=Array.isArray(ui.form[k])?ui.form[k]:[];
  return '<fieldset class="field cks"><legend class="label">'+lab+'</legend><div class="chips">'+opts.map(function(o){return '<label class="ck"><input id="h-'+k+'-'+esc(o[0])+'" type="checkbox" data-f="'+k+'" value="'+esc(o[0])+'"'+(sel.indexOf(o[0])>-1?' checked':'')+(rer?' data-rer="1"':'')+'><span>'+esc(o[1])+'</span></label>'}).join('')+'</div></fieldset>';
}
function chipsSel(act,cur,opts){return '<div class="chips" role="group">'+opts.map(function(o){return '<button class="chip" type="button" data-act="'+act+'" data-v="'+o[0]+'" aria-pressed="'+(cur===o[0])+'">'+o[1]+'</button>'}).join('')+'</div>'}
function saveBtns(){return '<div class="btns"><button class="btn acc" type="submit">Guardar</button>'+(ui.editId?'<button class="btn line" type="button" data-act="hdel" style="'+(ui.hdel?'color:var(--warn);border-color:var(--warn)':'')+'">'+(ui.hdel?'Toca de nuevo para borrar':'Borrar')+'</button>':'')+'</div>'}
function dl(id,list){return '<datalist id="'+id+'">'+list.map(function(x){return '<option value="'+esc(x)+'">'}).join('')+'</datalist>'}
function facts(arr){arr=arr.filter(function(x){return x[1]});return arr.length?'<dl class="facts">'+arr.map(function(x){return '<div><dt>'+x[0]+'</dt><dd>'+x[1]+'</dd></div>'}).join('')+'</dl>':''}
function condOpts(){return H().conds.map(function(c){return [c.id,c.name]})}

function valRows(){
  var inds=indsFor(ui.form.conds);if(!inds.length)return '';
  return '<div class="field"><span class="label">Valores</span>'+inds.map(function(ind){
    var lr=lastRange(ind.id,ui.editId),lo=ui.form['lo_'+ind.id],hi=ui.form['hi_'+ind.id];
    if(lo==null)lo=lr.lo!=null?String(lr.lo).replace('.',','):'';if(hi==null)hi=lr.hi!=null?String(lr.hi).replace('.',','):'';
    var inp=function(p,lab,v){return '<label><span>'+lab+'</span><input id="h-'+p+'_'+ind.id+'" data-f="'+p+'_'+ind.id+'" type="text" inputmode="decimal" autocomplete="off" value="'+esc(v)+'"></label>'};
    return '<div class="irow"><div class="ttl">'+esc(ind.label)+(ind.unit?' <span class="meta">('+esc(ind.unit)+')</span>':'')+'</div><div class="ig">'+inp('v','Valor',FV('v_'+ind.id))+inp('lo','Ref. mín',lo)+inp('hi','Ref. máx',hi)+'</div></div>';
  }).join('')+'<p class="meta">Si el informe trae rango de referencia, anótalo para que la app marque los valores fuera de rango.</p></div>';
}
var HS={
  exam:function(){
    var f=ui.form,st=f.st||'realizado',cs=condOpts();
    return hHead(ui.editId?'Editar <em>examen</em>':'Nuevo <em>examen</em>','')+
      '<form id="frm" data-k="exam" class="field" style="gap:14px">'+dl('dl-exams',uniq(EXAMS.concat(H().exams.map(function(e){return e.name}))))+
      fIn('name','Examen','type="text" list="dl-exams" required maxlength="80" placeholder="Ej: Perfil lipídico"')+
      chipsSel('hst',st,[['realizado','Ya me lo hice'],['pendiente','Por hacer']])+
      '<div class="two">'+fIn('date',st==='pendiente'?'Fecha (opcional)':'Fecha','type="date"')+fSel('rep','Repetir',REPS.map(function(x){return [String(x[0]),x[1]]}))+'</div>'+
      '<div class="two">'+fIn('place','Lugar (opcional)','type="text" maxlength="60" placeholder="Ej: laboratorio"')+fIn('doc','Lo pidió (opcional)','type="text" maxlength="60" placeholder="Ej: ginecóloga"')+'</div>'+
      (cs.length?fChecks('conds','Patologías relacionadas',cs,true):'')+valRows()+
      fTa('notes','Resultado o notas','Ej: colesterol total 180, todo normal')+
      filesZone('main','Archivos','Foto o PDF del examen. Puedes agregar varios.')+saveBtns()+'</form>';
  },
  cond:function(){
    var f=ui.form;
    return hHead(ui.editId?'Editar <em>patología</em>':'Nueva <em>patología</em>','')+
      '<form id="frm" data-k="cond" class="field" style="gap:14px">'+dl('dl-specs',SPECS)+fIn('name','Nombre','type="text" required maxlength="80" placeholder="Ej: hipotiroidismo"')+
      chipsSel('hst',f.st||'activa',Object.keys(CSTAT).map(function(k){return [k,CSTAT[k][0]]}))+
      '<div class="two">'+fIn('since','Desde (opcional)','type="date"')+fIn('doc','Especialista (opcional)','type="text" list="dl-specs" maxlength="60"')+'</div>'+
      fTa('inds','Valores a seguir','TSH | mUI/L','Una línea por valor: nombre | unidad. Aparecen para anotar al registrar un examen de esta patología.')+
      fTa('notes','Tratamiento o notas','Ej: control cada 6 meses')+saveBtns()+'</form>';
  },
  ctrl:function(){
    var cs=condOpts();
    return hHead(ui.editId?'Editar <em>control</em>':'Agendar <em>control</em>','')+
      '<form id="frm" data-k="ctrl" class="field" style="gap:14px">'+dl('dl-specs',uniq(SPECS.concat(H().ctrls.map(function(c){return c.title}))))+
      fIn('title','Especialidad o motivo','type="text" list="dl-specs" required maxlength="80" placeholder="Ej: Ginecología"')+
      '<div class="two">'+fIn('date','Fecha','type="date" required')+fIn('time','Hora (opcional)','type="time"')+'</div>'+
      '<div class="two">'+fIn('doc','Profesional (opcional)','type="text" maxlength="60"')+fIn('place','Lugar (opcional)','type="text" maxlength="60"')+'</div>'+
      (cs.length?fChecks('conds','Patologías relacionadas',cs,false):'')+
      '<div class="field"><label class="label" for="h-nextDate">Próxima fecha (opcional)</label><span class="meta">Si te pidieron volver, queda como pendiente en Resumen y en Mi día.</span><input id="h-nextDate" data-f="nextDate" type="date" value="'+esc(FV('nextDate'))+'"></div>'+
      fTa('notes','Notas','Ej: llevar resultados de exámenes')+
      filesZone('ex','Examen','Opcional. Se guarda también en Exámenes, vinculado a este control.')+
      filesZone('rx','Receta','Opcional. Foto o PDF de la receta.')+saveBtns()+'</form>';
  },
  treat:function(){
    var f=ui.form,dur=f.dur||'perm',cs=condOpts();
    return hHead(ui.editId?'Editar <em>tratamiento</em>':'Nuevo <em>tratamiento</em>','')+
      '<form id="frm" data-k="treat" class="field" style="gap:14px">'+dl('dl-meds',uniq(H().treats.map(function(t){return t.name})))+
      fIn('name','Medicamento','type="text" list="dl-meds" required maxlength="80" placeholder="Ej: Levotiroxina"')+
      fIn('dose','Dosis','type="text" maxlength="60" placeholder="Ej: 50 mcg o ½ comprimido"')+
      '<div class="field"><span class="label">Horarios</span><span class="meta">Hasta 3. Deja vacíos los que no uses.</span><div class="three">'+['t1','t2','t3'].map(function(k,i){return '<input id="h-'+k+'" data-f="'+k+'" type="time" aria-label="Horario '+(i+1)+'" value="'+esc(FV(k))+'">'}).join('')+'</div></div>'+
      fSel('how','Indicación',HOWS.map(function(x){return [x,x||'Sin indicación']}))+
      '<div class="field"><span class="label">Duración</span>'+chipsSel('tdur',dur,[['perm','Permanente'],['dias','Por días'],['fecha','Hasta una fecha']])+'</div>'+
      '<div class="two">'+fIn('start','Empieza','type="date"')+(dur==='dias'?fIn('days','Cuántos días','type="number" min="1" max="3650" inputmode="numeric"'):dur==='fecha'?fIn('end','Último día','type="date"'):'')+'</div>'+
      (cs.length?fChecks('conds','Para qué es',cs,false):'')+
      fTa('notes','Notas','Ej: tomar con un vaso de agua')+
      filesZone('rx','Receta','Opcional. Foto o PDF de la receta.')+saveBtns()+'</form>';
  },
  tdose:function(){
    var t=findH('treat',ui.editId);if(!t)return hHead('Tratamiento no encontrado','');
    return hHead('Cambiar <em>dosis</em>',esc(t.name))+'<p class="muted" style="font-size:.88rem">La dosis anterior ('+esc(t.dose||'sin dosis')+') queda en el historial. Durante una semana Mi día mostrará «Dosis nueva».</p>'+
      '<form id="frm" data-k="tdose" class="field" style="gap:14px">'+fIn('newdose','Nueva dosis','type="text" required maxlength="60"')+'<div class="two">'+fIn('from','Desde','type="date"')+fIn('note','Motivo (opcional)','type="text" maxlength="80"')+'</div><div class="btns"><button class="btn acc" type="submit">Guardar</button></div></form>';
  },
  vexam:function(){
    var e=findH('exam',ui.editId);if(!e)return hHead('Examen no encontrado','');
    var c=e.fromKey?H().ctrls.filter(function(x){return x.linkKey===e.fromKey})[0]:null,rp=REPS.filter(function(x){return x[0]===+e.rep})[0];
    var o=hHead(esc(e.name),(e.date?dlong(e.date):'Sin fecha')+' · '+(e.st==='pendiente'?'Por hacer':'Realizado'));
    o+=facts([['Lugar',esc(e.place||'')],['Lo pidió',esc(e.doc||'')],['Repetir',+e.rep&&rp?esc(rp[1]):''],['Patologías',esc(condNames(e.conds).join(', '))],['Viene del control',c?'<button class="link" type="button" data-act="hview" data-t="ctrl" data-id="'+c.id+'" style="min-height:0;padding:0">'+esc(c.title)+' · '+dshort(c.date)+'</button>':'']]);
    var v=examVals(e);if(v)o+='<section><p class="label">Valores</p>'+v+'</section>';
    if(e.notes)o+='<section><p class="label">Resultado o notas</p><p class="prewrap">'+esc(e.notes)+'</p></section>';
    if((e.files||[]).length)o+='<section><p class="label">Archivos</p>'+fileChips(e.files)+'</section>';
    return o+'<div class="btns"><button class="btn acc" type="button" data-act="hedit" data-t="exam" data-id="'+e.id+'">Editar</button>'+(e.st==='pendiente'?'<button class="btn line" type="button" data-act="hexdone" data-id="'+e.id+'">Ya me lo hice</button>':'')+'</div>';
  },
  vctrl:function(){
    var c=findH('ctrl',ui.editId);if(!c)return hHead('Control no encontrado','');
    var lx=linkedExams(c),st=c.done?'Realizado':c.date<T()?'Pendiente de marcar':'Agendado';
    var o=hHead(esc(c.title),dlong(c.date)+(c.time?' · '+c.time:'')+' · '+st);
    o+=facts([['Profesional',esc(c.doc||'')],['Lugar',esc(c.place||'')],['Patologías',esc(condNames(c.conds).join(', '))],['Próxima fecha',c.nextDate?dlong(c.nextDate)+(c.nextDone?' · descartada':isResolved(c)?' · ya registrada':' · pendiente'):'']]);
    if(c.notes)o+='<section><p class="label">Notas</p><p class="prewrap">'+esc(c.notes)+'</p></section>';
    if((c.files||[]).length)o+='<section><p class="label">Receta</p>'+fileChips(c.files)+'</section>';
    lx.forEach(function(e){o+='<section><div class="sh"><p class="label">Examen vinculado</p><button class="link" type="button" data-act="hview" data-t="exam" data-id="'+e.id+'">Ver examen</button></div>'+((e.files||[]).length?fileChips(e.files):'<p class="meta">Sin archivos.</p>')+'</section>'});
    o+='<div class="btns"><button class="btn acc" type="button" data-act="hedit" data-t="ctrl" data-id="'+c.id+'">Editar</button><button class="btn line" type="button" data-act="hdone" data-id="'+c.id+'">'+(c.done?'Marcar como no realizado':'Marcar realizado')+'</button></div>';
    o+=(c.done?'<div class="btns"><button class="btn line" type="button" data-act="hnext" data-id="'+c.id+'">Agendar otro</button></div>':c.date>=T()?'<div class="btns">'+gcalLink('Control: '+c.title,c.date,c.time,[c.doc,c.place].filter(Boolean).join(' · '))+'</div>':'');
    return o;
  },
  vtreat:function(){
    var t=findH('treat',ui.editId);if(!t)return hHead('Tratamiento no encontrado','');
    var pr=tProgress(t),nd=tNewDose(t),td=T();
    var o=hHead(esc(t.name),esc(t.dose||''));
    o+='<div style="display:flex;flex-direction:column;gap:6px"><span class="badge '+pr.cls+'" style="align-self:flex-start">'+esc(pr.txt)+'</span>'+(pr.pct!=null?'<div class="bar big"><span style="width:'+pr.pct+'%"></span></div><span class="meta">'+esc(pr.sub)+'</span>':'')+'</div>';
    o+=facts([['Dosis actual',esc(t.dose||'—')+(nd?' · nueva desde '+dshort(nd.date):'')],['Horario',tTimes(t).join(' y ')],['Indicación',esc(t.how||'')],['Desde',dlong(t.start)],t.end?['Último día',dlong(t.end)]:['Duración','Permanente'],['Para',esc(condNames(t.conds).join(', '))]]);
    if(t.notes)o+='<section><p class="label">Notas</p><p class="prewrap">'+esc(t.notes)+'</p></section>';
    var hs=(t.history||[]).slice().sort(function(a,b){return a.date<b.date?1:-1});
    if(hs.length)o+='<section><p class="label">Historial de dosis</p>'+hs.map(function(h,i){return '<div class="row"><div class="grow"><div class="ttl">'+esc(h.dose||'—')+(i===0?' <span class="meta">· actual</span>':'')+'</div>'+(h.note?'<div class="meta">'+esc(h.note)+'</div>':'')+'</div><span class="meta">'+dlong(h.date)+'</span></div>'}).join('')+'</section>';
    if((t.files||[]).length)o+='<section><p class="label">Receta</p>'+fileChips(t.files)+'</section>';
    o+='<div class="btns">'+(!tEnded(t)?'<button class="btn acc" type="button" data-act="tdose" data-id="'+t.id+'">Cambiar dosis</button>':'')+(tActive(t)&&t.end!==td?'<button class="btn line" type="button" data-act="tend" data-id="'+t.id+'">Terminar hoy</button>':'')+'<button class="btn line" type="button" data-act="hedit" data-t="treat" data-id="'+t.id+'">Editar</button></div>';
    return o;
  },
  vcond:function(){
    var c=findH('cond',ui.editId);if(!c)return hHead('Patología no encontrada','');
    var st=CSTAT[c.st]||CSTAT.activa,has=function(x){return (x.conds||[]).indexOf(c.id)>-1};
    var o=hHead(esc(c.name),'<span class="badge '+st[1]+'">'+st[0]+'</span>');
    o+=facts([['Desde',dlong(c.since)],['Especialista',esc(c.doc||'')]]);
    if(c.notes)o+='<section><p class="label">Tratamiento o notas</p><p class="prewrap">'+esc(c.notes)+'</p></section>';
    var ir=indRows(c);if(ir)o+='<section><p class="label">Valores</p>'+ir+'</section>';
    var ts=H().treats.filter(has);
    if(ts.length)o+='<section><p class="label">Tratamientos</p>'+ts.map(function(t){var pr=tProgress(t);return '<div class="row"><button class="rowbtn" type="button" data-act="hview" data-t="treat" data-id="'+t.id+'"><div class="ttl">'+esc(t.name)+'</div><div class="meta">'+esc(t.dose||'')+'</div></button><span class="badge '+pr.cls+'">'+esc(pr.txt)+'</span></div>'}).join('')+'</section>';
    var cs=H().ctrls.filter(has).sort(function(a,b){return a.date<b.date?1:-1});
    if(cs.length)o+='<section><p class="label">Controles</p>'+cs.map(function(x){return '<div class="row">'+cdate(x.date)+'<button class="rowbtn" type="button" data-act="hview" data-t="ctrl" data-id="'+x.id+'"><div class="ttl">'+esc(x.title)+'</div><div class="meta">'+(x.done?'Realizado':x.date<T()?'Pendiente de marcar':inDays(x.date))+'</div></button></div>'}).join('')+'</section>';
    var es=H().exams.filter(has).sort(function(a,b){return (a.date||'')<(b.date||'')?1:-1});
    if(es.length)o+='<section><p class="label">Exámenes</p>'+es.map(function(e){return examRow(e)}).join('')+'</section>';
    return o+'<div class="btns"><button class="btn acc" type="button" data-act="hedit" data-t="cond" data-id="'+c.id+'">Editar</button></div>';
  },
  file:function(){
    var f=ui.vfile;if(!f)return hHead('Archivo no encontrado','');
    var o=hHead(esc(f.name),'');
    o+=isImg(f.type)?'<div class="vbox" id="vbox"><img src="'+fileUrl(f.id)+'" alt="'+esc(f.name)+'" data-act="zoom"></div><p class="meta">Toca la imagen para ampliarla.</p>':'<div class="vbox" id="pdfbox"></div>';
    return o+(FILES.downloads?'<div class="btns"><button class="btn acc" type="button" data-act="fdl">Descargar</button></div>':'');
  }
};
function isViewSheet(s){return s==='file'||/^v(exam|ctrl|treat|cond)$/.test(s||'')}
function curSheet(){return {sheet:ui.sheet,editId:ui.editId,vfile:ui.vfile,form:ui.form}}
function sheetTop(){var sh=$('sheet');if(sh)sh.scrollTop=0}
function rerender(){var sh=$('sheet'),y=sh?sh.scrollTop:0;snap();renderSheet();if(sh)sh.scrollTop=y}
function afterSheet(){if(ui.sheet==='file'&&ui.vfile&&!isImg(ui.vfile.type)){var bx=$('pdfbox');if(bx)bx.innerHTML='<p class="meta" style="padding:14px">Cargando PDF…</p>';getUrl(ui.vfile.id).then(function(u){renderPdf($('pdfbox'),u)},function(){var b2=$('pdfbox');if(b2)b2.innerHTML='<p class="meta" style="padding:14px">No encontré este archivo. Si venía del artefacto, súbelo de nuevo.</p>'})}}
function openView(t,id){
  if(ui.sheet&&isViewSheet(ui.sheet))ui.stack.push(curSheet());else{cleanupCtx();ui.stack=[]}
  ui.sheet='v'+t;ui.editId=id;ui.hdel=false;renderSheet();sheetTop();
}
function openFile(f){ui.stack.push(curSheet());ui.sheet='file';ui.vfile=f;renderSheet();sheetTop()}
function hBack(){
  if(ui.sheet&&!isViewSheet(ui.sheet))cleanupCtx();
  var p=ui.stack.pop();if(!p){closeSheet();return}
  ui.sheet=p.sheet;ui.editId=p.editId;ui.vfile=p.vfile;ui.form=p.form||{};ui.hdel=false;renderSheet();sheetTop();
}
function openH(t,rec){
  if(ui.sheet&&isViewSheet(ui.sheet))ui.stack.push(curSheet());else{cleanupCtx();ui.stack=[]}
  ui.editId=rec?rec.id:null;ui.hdel=false;ui.parsed=null;
  var f={};
  if(t==='exam'){
    f=rec?{name:rec.name,st:rec.st,date:rec.date||'',rep:String(rec.rep||0),place:rec.place||'',doc:rec.doc||'',notes:rec.notes||'',conds:(rec.conds||[]).slice()}:{st:'realizado',rep:'0',conds:[]};
    if(rec)Object.keys(rec.vals||{}).forEach(function(k){var x=rec.vals[k];f['v_'+k]=String(x.v).replace('.',',');f['lo_'+k]=x.lo==null?'':String(x.lo).replace('.',',');f['hi_'+k]=x.hi==null?'':String(x.hi).replace('.',',')});
    ui.fctx=newCtx(rec?rec.files:[],'main');
  } else if(t==='cond'){
    f=rec?{name:rec.name,st:rec.st||'activa',since:rec.since||'',doc:rec.doc||'',notes:rec.notes||'',inds:(rec.indicators||[]).map(function(i){return i.label+(i.unit?' | '+i.unit:'')}).join('\n')}:{st:'activa'};
    ui.fctx=null;
  } else if(t==='ctrl'){
    f=rec?{title:rec.title,date:rec.date||'',time:rec.time||'',doc:rec.doc||'',place:rec.place||'',conds:(rec.conds||[]).slice(),notes:rec.notes||'',nextDate:rec.nextDate||''}:{conds:[]};
    ui.fctx=newCtx(rec?rec.files:[],'rx');
  } else if(t==='treat'){
    var tm=rec?tTimes(rec):[];
    f=rec?{name:rec.name,dose:rec.dose||'',t1:tm[0]||'',t2:tm[1]||'',t3:tm[2]||'',how:rec.how||'',dur:rec.end?'fecha':'perm',end:rec.end||'',start:rec.start||'',conds:(rec.conds||[]).slice(),notes:rec.notes||''}:{dur:'perm',start:T(),conds:[],how:''};
    ui.fctx=newCtx(rec?rec.files:[],'rx');
  }
  ui.form=f;ui.sheet=t;renderSheet();sheetTop();
  if(!rec){var n=$('h-name')||$('h-title');if(n)n.focus()}
}
function saveH(k){
  var f=ui.form,h=H(),old=ui.editId?findH(k==='tdose'?'treat':k,ui.editId):null,td=T(),rec;
  var s=function(x){return String(f[x]==null?'':f[x]).trim()};
  if(pendingUp()){toast('Espera a que terminen de subir los archivos');return false}
  if(k==='exam'){
    var st=f.st||'realizado',date=s('date');
    if(st==='realizado'&&!date){toast('Agrega la fecha en que te lo hiciste');return false}
    if(st==='realizado'&&date>td){toast('Un examen realizado no puede tener fecha futura');return false}
    var conds=Array.isArray(f.conds)?f.conds.slice():[],vals={},bad=false;
    indsFor(conds).forEach(function(ind){var v=num(f['v_'+ind.id]);if(v===null)return;if(isNaN(v)){bad=true;return}var lo=num(f['lo_'+ind.id]),hi=num(f['hi_'+ind.id]);if((lo!==null&&isNaN(lo))||(hi!==null&&isNaN(hi))){bad=true;return}vals[ind.id]={v:v,lo:lo,hi:hi}});
    if(bad){toast('Revisa los valores: usa solo números, por ejemplo 2,1');return false}
    rec={name:s('name'),st:st,date:date,rep:+s('rep')||0,place:s('place'),doc:s('doc'),notes:s('notes'),conds:conds,vals:vals,files:savedFiles('main')};
    if(old&&old.fromKey)rec.fromKey=old.fromKey;
    put(h.exams,rec,old);
  } else if(k==='cond'){
    rec={name:s('name'),st:f.st||'activa',since:s('since'),doc:s('doc'),notes:s('notes'),indicators:parseIndicators(f.inds,old?old.indicators:[])};
    put(h.conds,rec,old);
  } else if(k==='ctrl'){
    var cd=s('date'),nx=s('nextDate');
    if(!cd){toast('Agrega la fecha del control');return false}
    if(nx&&nx<=cd){toast('La próxima fecha tiene que ser posterior al control');return false}
    var key=old?(old.linkKey||old.id):'k'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    rec={title:s('title'),date:cd,time:s('time'),doc:s('doc'),place:s('place'),conds:Array.isArray(f.conds)?f.conds.slice():[],notes:s('notes'),nextDate:nx,nextDone:!!(old&&old.nextDate===nx&&old.nextDone),files:savedFiles('rx','receta'),linkKey:key,done:old?!!old.done:false};
    put(h.ctrls,rec,old);
    var ex=savedFiles('ex');
    if(ex.length){var le=h.exams.filter(function(e){return e.fromKey===key})[0];
      if(le)le.files=(le.files||[]).concat(ex);
      else h.exams.push({id:uid(),name:'Examen · '+rec.title,st:'realizado',date:cd<=td?cd:td,rep:0,place:rec.place,doc:rec.doc,notes:'',conds:rec.conds.slice(),vals:{},files:ex,fromKey:key})}
    if(f.fromPend){var pc=findH('ctrl',f.fromPend);if(pc)pc.nextDone=true}
  } else if(k==='treat'){
    var dur=f.dur||'perm',start=s('start')||td,end='';
    if(dur==='dias'){var nd=Math.round(+s('days')||0);if(nd<1){toast('Indica cuántos días dura');return false}end=plusDays(start,nd-1)}
    if(dur==='fecha'){end=s('end');if(!end){toast('Indica el último día');return false}if(end<start)end=start}
    var seen={},times=[s('t1'),s('t2'),s('t3')].filter(function(x){if(!/^\d{2}:\d{2}$/.test(x)||seen[x])return false;seen[x]=1;return true}).sort();
    var dose=s('dose'),hist=old?(old.history||[]).slice():[];
    if(!hist.length)hist.push({date:start,dose:old?(old.dose||dose):dose});
    if(old&&dose!==(old.dose||''))hist.push({date:td,dose:dose,note:''});
    rec={name:s('name'),dose:dose,times:times,how:s('how'),start:start,end:end,conds:Array.isArray(f.conds)?f.conds.slice():[],notes:s('notes'),files:savedFiles('rx','receta'),history:hist,createdAt:old&&old.createdAt?old.createdAt:Date.now()};
    put(h.treats,rec,old);
  } else if(k==='tdose'){
    if(!old)return false;
    var nd2=s('newdose'),fr=s('from')||td;
    if(!nd2){toast('Escribe la nueva dosis');return false}
    var hh=(old.history||[]).slice();if(!hh.length)hh.push({date:old.start||fr,dose:old.dose||''});
    hh.push({date:fr,dose:nd2,note:s('note')});old.dose=nd2;old.history=hh;
  }
  if(ui.fctx){ui.fctx.saved=true;ui.fctx.removed.forEach(deleteFile)}
  return true;
}
function delH(){
  var k=ui.sheet,id=ui.editId,h=H(),r=findH(k,id);if(!r)return false;
  if(ui.fctx){ui.fctx.uploaded.forEach(deleteFile);ui.fctx.saved=true}
  deleteFilesOf(r.files);
  var keep=function(x){return x.id!==id};
  if(k==='exam')h.exams=h.exams.filter(keep);
  else if(k==='ctrl')h.ctrls=h.ctrls.filter(keep);
  else if(k==='treat'){h.treats=h.treats.filter(keep);state.doses=D().filter(function(d){return d.tid!==id})}
  else if(k==='cond'){h.conds=h.conds.filter(keep);[h.exams,h.ctrls,h.treats].forEach(function(l){l.forEach(function(x){if(Array.isArray(x.conds))x.conds=x.conds.filter(function(c){return c!==id})})})}
  return true;
}
function gsnap(){
  var sh=$('sheet');if(!sh||!ui.form)return;var arrs={},hasArr={};
  Array.prototype.forEach.call(sh.querySelectorAll('[data-f]'),function(el){
    var k=el.getAttribute('data-f');
    if(el.type==='checkbox'){hasArr[k]=1;(arrs[k]=arrs[k]||[]);if(el.checked)arrs[k].push(el.value)}
    else ui.form[k]=el.value;
  });
  Object.keys(hasArr).forEach(function(k){ui.form[k]=arrs[k]||[]});
}

function viewCiclo(){
  var t=T(), c=cfg(), ci=cycleNow(), o='';
  var form='<form id="per-form" class="inline"><div class="field"><label class="label" for="f-pstart">Inicio de período</label><input id="f-pstart" type="date" max="'+t+'" value="'+t+'"></div><button class="btn acc" type="submit">Registrar</button></form>'+bulkHtml();
  var settings='<section class="glass" style="padding:6px 16px 12px"><div class="row"><div class="grow"><div class="ttl">Duración del ciclo</div><div class="meta">Desde un inicio de período al siguiente</div></div><div class="stepper"><button type="button" data-act="cfg" data-f="len" data-d="-1" aria-label="Restar un día al ciclo">−</button><b>'+c.len+' días</b><button type="button" data-act="cfg" data-f="len" data-d="1" aria-label="Sumar un día al ciclo">+</button></div></div>'+
    '<div class="row"><div class="grow"><div class="ttl">Duración del período</div><div class="meta">Días de sangrado</div></div><div class="stepper"><button type="button" data-act="cfg" data-f="per" data-d="-1" aria-label="Restar un día al período">−</button><b>'+c.per+' días</b><button type="button" data-act="cfg" data-f="per" data-d="1" aria-label="Sumar un día al período">+</button></div></div>'+
    (c.set?'':'<div class="note" style="margin-top:8px"><span>Ajusta estos valores a tu ciclo habitual. La app los usará siempre para estimar.</span><button class="btn acc sm" type="button" data-act="cfgok">Usar estos valores</button></div>')+'</section>';
  var setHead='<div class="sh"><h2>Mi <em>ciclo</em></h2></div>';

  if(ci){
    var ph=phaseOf(ci.day), P=PH[ph];
    var nxt=ci.late>0?'<span>Se esperaba el '+dshort(ci.due)+'</span><b>'+ci.late+(ci.late===1?' día':' días')+' de diferencia</b>':
      ci.left===0?'<span>Próximo período</span><b>Podría llegar hoy</b>':'<span>Próximo período · '+dshort(ci.next)+'</span><b>en '+ci.left+(ci.left===1?' día':' días')+'</b>';
    o+='<div class="glass cycard"><div class="cyc" role="img" aria-label="Día '+ci.day+' de '+c.len+', fase '+P.n.toLowerCase()+'">'+ring(ci.day)+'<div class="mid"><span class="label">Día del ciclo</span><b>'+ci.day+'</b><span class="muted" style="font-size:.85rem">de '+c.len+' días</span></div></div>'+
      '<div class="phase ph-'+ph+'"><p class="label"><i class="pdot"></i>Fase actual</p><p class="serif">'+P.n+'</p><p class="muted" style="font-size:.88rem">'+P.d(c)+'</p></div>'+
      '<div class="nextp">'+nxt+'</div>'+form+'</div>';
  } else {
    o+='<div class="glass cycard"><div><h2>Empieza con tu último período</h2><p class="muted" style="font-size:.9rem;margin-top:4px">Anota la fecha en que empezó tu período más reciente. Con eso calculo tu día del ciclo, tu fase y las próximas fechas.</p></div>'+form+'</div>';
  }
  if(!c.set) o+='<section>'+setHead+settings+'</section>';

  if(ci){
    o+=calendar();
    o+='<section><div class="sh"><h2>Próximos períodos</h2></div>';
    for(var k=0;k<3;k++){
      var st=plusDays(ci.next,k*c.len), en=plusDays(st,c.per-1);
      o+='<div class="row"><span class="pdot ph-men" style="margin:0"></span><div class="grow"><div class="ttl">'+dshort(st)+' – '+dshort(en)+'</div><div class="meta">'+(k===0?'Estimado':'Estimado · ciclo de '+c.len+' días')+'</div></div><span class="badge">'+(function(n){return n===0?'hoy':'en '+n+(n===1?' día':' días')})(Math.max(0,daysBetween(t,st)))+'</span></div>';
    }
    o+='</section>';
  }
  if(c.set) o+='<section>'+setHead+settings+'</section>';

  var ss=starts();
  if(ss.length){
    var lens=[];for(var i=0;i<ss.length-1;i++)lens.push(daysBetween(ss[i].date,ss[i+1].date));
    o+='<section><div class="sh"><h2>Historial y <em>patrones</em></h2></div>';
    if(lens.length){
      var avg=Math.round(lens.reduce(function(a,b){return a+b},0)/lens.length), mn=Math.min.apply(null,lens), mx=Math.max.apply(null,lens);
      o+='<div class="glass mini"><div><b>'+avg+' días</b><span class="meta">promedio real</span></div><div><b>'+(mn===mx?mn:mn+'–'+mx)+'</b><span class="meta">rango en días</span></div><div><b>'+lens.length+'</b><span class="meta">'+(lens.length===1?'ciclo completo':'ciclos completos')+'</span></div></div>';
      var diff=avg-c.len;
      o+='<p class="muted" style="font-size:.88rem">'+(Math.abs(diff)<=1?'Tus ciclos anotados coinciden con tu ajuste de '+c.len+' días.':'Tus ciclos anotados promedian '+avg+' días y tu ajuste es de '+c.len+'. Puedes cambiarlo en Mi ciclo si lo prefieres.')+(mx-mn>7?' Tus ciclos variaron más de una semana entre sí.':'')+'</p>';
    } else {
      o+='<p class="muted" style="font-size:.88rem">Cuando anotes tu próximo inicio verás aquí la duración real de cada ciclo.</p>';
    }
    for(var j=ss.length-1;j>=0;j--){
      var len=j<ss.length-1?daysBetween(ss[j].date,ss[j+1].date):null;
      o+='<div class="row"><div class="grow"><div class="ttl">'+dshort(ss[j].date)+' '+ss[j].date.slice(0,4)+'</div><div class="meta">'+(len?'Ciclo de '+len+' días':'Ciclo actual · día '+ci.day)+'</div></div>'+delBtn(ss[j].id,'log')+'</div>';
    }
    o+='</section>';
  }
  o+='<p class="disc">Las fechas son estimaciones con tus valores fijos. No sirven como método anticonceptivo.</p>';
  return o;
}
