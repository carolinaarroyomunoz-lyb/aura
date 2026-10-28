/* Aura · js/calendario-pasos.js
   Calendarios conectados (iCloud, Google, suscripciones) y pasos del iPhone (atajo «Aura pasos»).
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */
/* ---------- Calendarios del iPhone, iCloud, Google y suscripciones (solo lectura) ----------
   Los enlaces de cada calendario (hasta 10) se guardan en la tabla cal_cfg (RLS: solo la dueña los ve). Se AGREGAN de a uno.
     · Calendarios de iCloud (Casa, Trabajo…): enlace de «Calendario público» (webcal://pXX-caldav.icloud.com/published/…).
     · Suscripciones (por ejemplo, partidos de Universidad Católica): la URL de la suscripción.
     · Google Calendar: «Dirección secreta en formato iCal».
   La función de Supabase «calendario» los descarga y devuelve los eventos desde 62 días atrás hasta 185 adelante (vista del mes).
   Aura no cambia ni borra nada en el calendario: «Ocultar en Aura» guarda el evento en org.calHide [{x (ext), d (fecha), t (título)}].
   Los eventos se guardan solo en este dispositivo (localStorage 'aura-cal') para verlos sin conexión; se actualizan
   al abrir la app, al volver a ella (cada 10 minutos como máximo) y con «Actualizar». */
var CAL={ev:[],at:0,cals:[],st:'',busy:false,cfg:null,cfgLoaded:false,del:false,rm:-1,msg:''};
try{var calRaw=JSON.parse(localStorage.getItem('aura-cal')||'null');if(calRaw&&Array.isArray(calRaw.ev)){CAL.ev=calRaw.ev;CAL.at=calRaw.at||0;CAL.cals=calRaw.cals||[];CAL.st=calRaw.st||''}}catch(e){}
function calSave(){try{localStorage.setItem('aura-cal',JSON.stringify({ev:CAL.ev,at:CAL.at,cals:CAL.cals,st:CAL.st}))}catch(e){}}
function calReset(){CAL.ev=[];CAL.at=0;CAL.cals=[];CAL.st='';CAL.cfg=null;CAL.cfgLoaded=false;try{localStorage.removeItem('aura-cal')}catch(e){}}
function calRefreshView(){if(ui.sheet==='calev'){renderSheet();return}safeRender()}
function calSync(force){
  if(!sb||!auth.user||CAL.busy)return Promise.resolve();
  if(!force&&Date.now()-CAL.at<600000)return Promise.resolve();
  CAL.busy=true;if(force)calRefreshView();
  return sb.functions.invoke('calendario',{body:{}}).then(function(r){
    CAL.busy=false;var d=r&&r.data;
    if(r.error||!d||!d.ok){CAL.st=CAL.st==='off'?'off':'err';calRefreshView();return}
    if(!d.configured){CAL.st='off';CAL.ev=[];CAL.cals=[]}else{CAL.st='ok';CAL.ev=Array.isArray(d.events)?d.events:[];CAL.cals=Array.isArray(d.cals)?d.cals:[]}
    CAL.at=Date.now();calSave();calRefreshView();
  },function(){CAL.busy=false;CAL.st=CAL.st==='off'?'off':'err';calRefreshView()});
}
function calHide(){var o=OG();if(!Array.isArray(o.calHide))o.calHide=[];return o.calHide}
function calHidden(x){return calHide().some(function(h){return h.x===x})}
function calOn(ds){return CAL.ev.filter(function(e){return e.date===ds&&!calHidden(e.ext)})}
function calFind(x){return CAL.ev.filter(function(e){return e.ext===x})[0]||null}
function calIsGoogle(e){return !!e&&e.src==='google'}
function calMod(t,cal){
  var s=fold(t||''),c=fold(cal||'');
  if(/classpass|barre|pilates|yoga|spinning|gimnasio|\bgym\b|entren|reformer|crossfit|funcional|hiit|zumba|trote|running|\bclass\b|workout|sculpt|cycle|stretch|natacion|boxeo/.test(s))return 'Ejercicio';
  if(/medic|doctor|\bdra?\b|control|examen|clinica|dentista|ginec|psicolog|nutri|kine|vacuna/.test(s))return 'Salud';
  if(/pago|banco|tarjeta|cuota/.test(s))return 'Finanzas';
  if(/certamen|prueba|universidad de|curso|ramo|tarea de|entrega|catedra|rrhh/.test(s)&&!/catolica|\bvs\.?\b| - /.test(s))return 'Estudio';
  if(/peluquer|manicure|unas|depila|facial|matiz/.test(s))return 'Belleza';
  if(/trabajo|oficina/.test(c))return 'Trabajo';
  return 'Casa';
}
function calMins(e){if(!e.time||!e.end)return 0;var m=hmMin(e.end)-hmMin(e.time);return m>0?m:0}
function hmAt(ms){var d=new Date(ms);return pad(d.getHours())+':'+pad(d.getMinutes())}
function calAgo(){if(!CAL.at)return '';var m=Math.round((Date.now()-CAL.at)/60000);return m<1?'recién':m<60?'hace '+m+' min':'a las '+hmAt(CAL.at)+(new Date(CAL.at).toDateString()===new Date().toDateString()?'':' del '+dshort(ymd(new Date(CAL.at))))}
function calKind(u){var s=String(u||'');if(/icloud\.com/i.test(s))return 'iCloud';if(/calendar\.google\.com/i.test(s))return 'Google';if(/outlook\./i.test(s))return 'Outlook';return 'Suscripción'}
function calMask(u){var s=String(u||'');try{var x=new URL(s.replace(/^webcal:/i,'https:'));return x.hostname+' · …'+s.slice(-10)}catch(e){return '…'+s.slice(-10)}}
// Misma regla que la función: http, https o webcal; nada de direcciones locales ni IP.
function calUrlOk(u){try{var x=new URL(String(u).trim().replace(/^webcal:\/\//i,'https://'));var h=x.hostname.toLowerCase();return /^https?:$/.test(x.protocol)&&h.indexOf('.')>0&&h!=='localhost'&&!/\.(local|internal|localhost)$/.test(h)&&!/^[\d.]+$/.test(h)&&h.indexOf(':')<0}catch(e){return false}}
function calCfgLoad(force){
  if(!sb||!auth.user||(CAL.cfgLoaded&&!force))return Promise.resolve(CAL.cfg||[]);CAL.cfgLoaded=true;
  return sb.from('cal_cfg').select('urls').maybeSingle().then(function(r){CAL.cfg=(r&&r.data&&r.data.urls)||[];safeRender();return CAL.cfg},function(){CAL.cfg=null;CAL.cfgLoaded=false;return null});
}
function calStore(urls){
  if(!urls.length)return sb.from('cal_cfg').delete().eq('user_id',auth.user.id);
  return sb.from('cal_cfg').upsert({user_id:auth.user.id,urls:urls,updated_at:new Date().toISOString()},{onConflict:'user_id'});
}
var CAL_ERR={'direccion-no-valida':'El enlace no es válido.','direccion-vencida':'El calendario ya no acepta este enlace (quizás se dejó de compartir). Quítalo y agrega el nuevo.','no-responde':'Este calendario no respondió. Prueba con Actualizar.','no-es-calendario':'Este enlace no devolvió un calendario.','muy-grande':'Este calendario es demasiado grande para leerlo.'};
function calLine(){
  var o='<div class="ocal">';
  if(CAL.st==='ok')o+='<span class="meta">Tus calendarios · '+(CAL.busy?'actualizando…':'actualizados '+calAgo())+'</span><button class="link" type="button" data-act="calsync"'+(CAL.busy?' disabled':'')+'>Actualizar</button>';
  else if(CAL.st==='err')o+='<span class="meta late">No pude actualizar tus calendarios</span><button class="link" type="button" data-act="calsync">Reintentar</button>';
  else o+='<span class="meta">Trae aquí los eventos de tu iPhone</span><button class="link" type="button" data-act="gocal">Conectar calendarios</button>';
  return o+'</div>';
}
function viewCal(){
  calCfgLoad(false);
  var saved=CAL.cfg||[],has=saved.length>0,o='';
  o+='<section class="glass" style="padding:16px;display:flex;flex-direction:column;gap:10px"><p class="label">Tus calendarios</p>';
  if(!CAL.cfgLoaded||CAL.cfg===null)o+='<p class="muted">Cargando…</p>';
  else if(!has)o+='<p class="muted">Aún no conectas ninguno. Agrega abajo los calendarios de tu iPhone, de a uno. Aura solo los lee: no cambia ni borra nada.</p>';
  else{
    if(CAL.st==='ok'){var nx=CAL.ev.filter(function(e){return e.date>=T()}).length;o+='<p><b style="color:var(--ok)">Conectados.</b> '+nx+(nx===1?' evento':' eventos')+' en los próximos meses · actualizado '+calAgo()+'.</p>'}
    else o+='<p class="muted">'+(CAL.busy?'Leyendo tus calendarios…':CAL.st==='err'?'<span class="late">No pude leer tus calendarios.</span> Toca Actualizar.':'Toca Actualizar para traer tus eventos.')+'</p>';
    saved.forEach(function(u,i){
      var c=CAL.cals[i],nm=c&&c.ok?c.name:calKind(u),sub=c?(c.ok?c.n+(c.n===1?' evento':' eventos'):'<span class="late">'+esc(CAL_ERR[c.error]||'No se pudo leer.')+'</span>'):calMask(u);
      o+='<div class="row"><div class="grow"><div class="ttl">'+esc(nm)+'</div><div class="meta">'+calKind(u)+' · '+sub+'</div></div><button class="x'+(CAL.rm===i?' confirm':'')+'" type="button" data-act="calrm" data-v="'+i+'">'+(CAL.rm===i?'¿Quitar?':'Quitar')+'</button></div>';
    });
    o+='<div class="btns"><button class="btn acc sm" type="button" data-act="calsync"'+(CAL.busy?' disabled':'')+'>'+(CAL.busy?'Actualizando…':'Actualizar ahora')+'</button></div>';
  }
  o+='</section>';
  o+='<form id="cal-form" class="glass" style="padding:16px;display:flex;flex-direction:column;gap:10px"><label class="label" for="f-calurls">Agregar un calendario</label><textarea id="f-calurls" spellcheck="false" autocapitalize="off" autocomplete="off" style="font-size:.85rem;min-height:84px;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:var(--field);width:100%" placeholder="Pega aquí el enlace (webcal://… o https://…)"></textarea>'+
    (CAL.msg?'<p class="late" style="font-size:.85rem">'+esc(CAL.msg)+'</p>':'')+
    '<button class="btn acc" type="submit">Agregar calendario</button><p class="meta">Se suma a los que ya tienes. Repite con cada calendario.</p></form>';
  o+='<section><div class="sh"><h2>Cómo copiar el <em>enlace</em></h2></div>'+
    '<details class="fin" open><summary>Calendarios de tu iPhone (Casa, Trabajo…)</summary><ol class="clist" style="gap:6px"><li>Abre el app <b>Calendario</b> y toca <b>Calendarios</b> (abajo al centro).</li><li>En la sección <b>iCloud</b>, toca la <b>(i)</b> del calendario.</li><li>Baja hasta el final y activa <b>Calendario público</b>.</li><li>Toca <b>Compartir enlace…</b> → <b>Copiar</b>.</li><li>Vuelve a Aura, pégalo arriba y toca <b>Agregar calendario</b>.</li></ol></details>'+
    '<details class="fin"><summary>Suscripciones (partidos de Universidad Católica, feriados…)</summary><ol class="clist" style="gap:6px"><li>En <b>Calendario → Calendarios</b>, toca la <b>(i)</b> de la suscripción.</li><li>Toca el campo <b>URL</b>, mantén el dedo → <b>Seleccionar todo</b> → <b>Copiar</b>.</li><li>Pégalo arriba y toca <b>Agregar calendario</b>.</li></ol></details>'+
    '<details class="fin"><summary>Google Calendar (calendario de Gmail)</summary><ol class="clist" style="gap:6px"><li>En un computador, abre <b>calendar.google.com</b>.</li><li>Junto a tu calendario, tres puntos → <b>Configuración y uso compartido</b>.</li><li>En <b>Integrar el calendario</b>, copia la <b>Dirección secreta en formato iCal</b>.</li></ol></details>'+
    '<p class="disc">Cumpleaños, Recordatorios programados y Sugerencias de Siri no se pueden compartir desde el iPhone, así que no llegan a Aura. Quien tenga el enlace de un calendario puede ver sus eventos: no lo compartas. Para cortar el acceso, desactiva «Calendario público» en el iPhone (o «Restablecer» en Google) y quita el calendario aquí. Aura guarda los enlaces en tu base de datos privada y no los muestra completos.</p></section>';
  var hid=calHide().slice().sort(function(a,b){return a.d<b.d?-1:1});
  if(hid.length){
    o+='<section><div class="sh"><h2>Ocultos en <em>Aura</em></h2></div>';
    hid.forEach(function(h){o+='<div class="row"><div class="grow"><div class="ttl">'+esc(h.t||'Evento')+'</div><div class="meta">'+(h.d?whenLabel(h.d):'')+' · sigue en tu calendario</div></div><button class="btn line sm" type="button" data-act="calshow" data-id="'+esc(h.x)+'">Mostrar</button></div>'});
    o+='</section>';
  }
  return o;
}
function calEvSheet(){
  var f=ui.form||{},e=calFind(f.x),hid=e&&calHidden(e.ext);
  if(!e)return sheetHead('Evento','')+'<p class="muted">Este evento ya no está en tu calendario. Puede que lo hayan cancelado o movido.</p>';
  var mod=calMod(e.title,e.cal),mins=calMins(e),p=e.date.split('-');
  var o=sheetHead(esc(e.title),dayTitle(e.date).replace(/<\/?em>/g,'')+' · '+(e.allDay?'todo el día':e.time+(e.end?'–'+e.end:'')));
  o+=facts([['Lugar',esc(e.place||'')],['Calendario',esc(e.cal||'Calendario')],['Duración',mins?mins+' min':''],['Módulo',esc(mod)]]);
  o+='<div class="btns">';
  if(mod==='Ejercicio'&&e.date<=T())o+='<button class="btn acc" type="button" data-act="calwk" data-id="'+esc(e.ext)+'">Ya fui: anotar entrenamiento</button>';
  o+='<button class="btn line" type="button" data-act="calhide" data-id="'+esc(e.ext)+'">'+(hid?'Volver a mostrar':'Ocultar en Aura')+'</button></div>';
  if(calIsGoogle(e))o+='<a class="btn line sm" style="align-self:flex-start" href="https://calendar.google.com/calendar/r/day/'+p[0]+'/'+(+p[1])+'/'+(+p[2])+'" target="_blank" rel="noopener">Abrir este día en Google Calendar</a>';
  o+='<p class="disc">Aura solo lee tu calendario. Para borrar el evento de verdad, hazlo en el app Calendario del iPhone (o en ClassPass); aquí desaparece en la próxima actualización. «Ocultar en Aura» lo saca solo de tu Organizador.</p>';
  return o;
}
function calSubmit(fm){
  if(fm.id!=='cal-form')return false;
  var lines=String(($('f-calurls')||{}).value||'').split(/\s+/).map(function(x){return x.trim()}).filter(Boolean);
  if(!lines.length){CAL.msg='Pega el enlace de un calendario.';render();return true}
  var bad=lines.filter(function(u){return !calUrlOk(u)});
  if(bad.length){CAL.msg='Eso no parece un enlace de calendario. Debe empezar con webcal:// o https://';render();return true}
  if(!sb||!auth.user){toast('Inicia sesión para conectar tus calendarios');return true}
  CAL.msg='';toast('Guardando…');
  calCfgLoad(true).then(function(cur){
    if(cur===null){CAL.msg='No se pudo guardar. Revisa tu conexión e intenta de nuevo.';render();return}
    var norm=function(u){return String(u).trim().replace(/^webcal:\/\//i,'https://').toLowerCase()},have={},all=[];
    cur.concat(lines).forEach(function(u){var k=norm(u);if(!have[k]){have[k]=1;all.push(String(u).trim())}});
    var added=all.length-cur.length;
    if(!added){toast('Ese calendario ya estaba agregado');var t0=$('f-calurls');if(t0)t0.value='';return}
    if(all.length>10){CAL.msg='Hasta 10 calendarios.';render();return}
    calStore(all).then(function(r){
      if(r.error){CAL.msg='No se pudo guardar. Revisa tu conexión e intenta de nuevo.';render();return}
      CAL.cfg=all;var ta=$('f-calurls');if(ta)ta.value='';render();toast('Agregado. Leyendo tus calendarios…');
      calSync(true).then(function(){if(CAL.st==='ok'){var c=CAL.cals[all.length-1];toast(c&&c.ok?c.name+': '+c.n+(c.n===1?' evento':' eventos'):'Listo')}else toast('No pude leer el calendario. Revisa el enlace.')});
    });
  });
  return true;
}
function calClick(a,b,id){
  switch(a){
    case 'calview': goSheet('calev',{x:id}); return true;
    case 'calsync': calSync(true).then(function(){if(CAL.st==='err')toast('No pude actualizar tus calendarios');}); return true;
    case 'gocal': closeSheet(); ui.view='mas'; ui.msub='cal'; render(); window.scrollTo(0,0); return true;
    case 'calhide': var e=calFind(id),h=calHide(),ix=-1; h.forEach(function(x,i){if(x.x===id)ix=i}); if(ix>-1){h.splice(ix,1);toast('Vuelve a aparecer en tu Organizador')}else if(e){h.push({x:e.ext,d:e.date,t:e.title});toast('Oculto en Aura. Sigue en tu calendario.')} OG().calHide=h.filter(function(x){return x.d>=plusDays(T(),-60)}); save(); closeSheet(); render(); return true;
    case 'calshow': OG().calHide=calHide().filter(function(x){return x.x!==id}); save(); render(); toast('Vuelve a aparecer en tu Organizador'); return true;
    case 'calwk': var w=calFind(id); if(w){var wx=matchEx(w.title),mn=calMins(w)||(wx?wx.min:45); goSheet('workout',{ex:wx?wx.id:'',min:String(mn),minTyped:true,lastEx:wx?wx.id:'',it:'moderada',direct:true,ldate:w.date,ltime:w.time||'',note:wx?'':w.title})} return true;
    case 'calrm': var ri=+b.getAttribute('data-v'); if(CAL.rm!==ri){CAL.rm=ri;render();return true} CAL.rm=-1; if(!sb||!auth.user)return true;
      var left=(CAL.cfg||[]).filter(function(u,i){return i!==ri});
      calStore(left).then(function(r){if(r.error){toast('No se pudo quitar');return}CAL.cfg=left;if(!left.length){calReset();CAL.cfg=[];CAL.cfgLoaded=true;CAL.st='off';render()}else{render();calSync(true)}toast('Calendario quitado')}); return true;
  }
  if(CAL.rm>-1&&a!=='calrm'){CAL.rm=-1}
  return false;
}

/* ---------- Pasos del iPhone (atajo «Aura pasos») ----------
   El atajo de la app Atajos lee el total de pasos del día en la app Salud y lo manda a la función de Supabase «pasos»
   (sin iniciar sesión, con una clave personal). La función lo guarda en la tabla pasos (user_id, fecha, pasos, updated_at).
   Aura lee esa tabla al abrirse y al volver a la app (cada 2 minutos como máximo) y deja un registro steps con src:'iphone'
   por día, que reemplaza lo anotado a mano ese día (el iPhone ya cuenta las caminatas).
   La clave se crea aquí: se guarda en atajo_claves solo su huella SHA-256; la clave visible queda en este dispositivo
   ('aura-atajo-clave' en localStorage) para poder copiarla otra vez. Crear una nueva invalida la anterior. */
var PASOS_URL=SB_URL+'/functions/v1/pasos',ATAJO='Aura pasos';
var PS={at:0,busy:false,last:null,hasKey:null,key:'',msg:''};
try{PS.key=localStorage.getItem('aura-atajo-clave')||''}catch(e){}
function pasosSync(force){
  if(!sb||!auth.user||PS.busy)return Promise.resolve();
  if(!force&&Date.now()-PS.at<120000)return Promise.resolve();
  PS.busy=true;
  return sb.from('pasos').select('fecha,pasos,updated_at').gte('fecha',plusDays(T(),-60)).order('fecha',{ascending:true}).then(function(r){
    PS.busy=false;PS.at=Date.now();if(r.error||!Array.isArray(r.data))return;
    var ch=false;
    r.data.forEach(function(x){
      var d=String(x.fecha).slice(0,10),n=+x.pasos||0,cur=logsOn(d,'steps'),c=cur[cur.length-1];
      if(c&&c.src==='iphone'&&+c.steps===n)return;
      state.logs=state.logs.filter(function(l){return !(l.kind==='steps'&&l.date===d)});
      var u=new Date(x.updated_at),tm=isNaN(u)?'21:00':pad(u.getHours())+':'+pad(u.getMinutes());
      addLog({kind:'steps',module:'Ejercicio',title:'Pasos',steps:n,date:d,time:tm,src:'iphone'});ch=true;
    });
    PS.last=r.data.length?r.data[r.data.length-1]:null;
    if(ch)save();
    if(ch||ui.view==='mas')safeRender();
  },function(){PS.busy=false});
}
function pasosKeyLoad(){
  if(!sb||!auth.user||PS.hasKey!==null)return;PS.hasKey='?';
  sb.from('atajo_claves').select('creada,ultimo_uso').maybeSingle().then(function(r){PS.hasKey=r&&r.data?r.data:false;safeRender()},function(){PS.hasKey=null});
}
function hex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2)}).join('')}
function newKey(){var a=new Uint8Array(24);crypto.getRandomValues(a);var abc='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789',s='';for(var i=0;i<a.length;i++)s+=abc[a[i]%abc.length];return 'aura-'+s}
function copyText(txt,fallbackId){
  var fb=function(){var el=$(fallbackId);if(el){el.focus();if(el.select)el.select();else{var rg=document.createRange();rg.selectNodeContents(el);var sl=window.getSelection();sl.removeAllRanges();sl.addRange(rg)}}toast('Selecciónalo y cópialo')};
  try{navigator.clipboard.writeText(txt).then(function(){toast('Copiado')},fb)}catch(e){fb()}
}
function lastSeen(ts){if(!ts)return '';var d=new Date(ts),t=T(),ds=ymd(d);return (ds===t?'hoy':ds===plusDays(t,-1)?'ayer':dshort(ds))+' a las '+pad(d.getHours())+':'+pad(d.getMinutes())}
function viewPasos(){
  pasosKeyLoad();if(!PS.at)pasosSync(true);
  var o='',hk=PS.hasKey,today=stepsOn(T()),lt=logsOn(T(),'steps').filter(function(l){return l.src==='iphone'})[0];
  o+='<section class="glass" style="padding:16px;display:flex;flex-direction:column;gap:8px"><p class="label">Pasos del iPhone</p>';
  if(PS.last)o+='<p><b style="color:var(--ok)">Conectado.</b> Último envío: '+n0(PS.last.pasos)+' pasos ('+(String(PS.last.fecha).slice(0,10)===T()?'hoy':whenLabel(String(PS.last.fecha).slice(0,10)))+'), recibido '+lastSeen(PS.last.updated_at)+'.</p>';
  else if(hk&&hk!=='?'&&hk.ultimo_uso)o+='<p class="muted">El atajo se usó '+lastSeen(hk.ultimo_uso)+'.</p>';
  else o+='<p class="muted">Todavía no llegan pasos desde el iPhone. Crea tu clave y el atajo con los pasos de abajo.</p>';
  o+='<p class="meta">Hoy: '+(today!=null?n0(today)+' pasos'+(lt?' · del iPhone':' · anotados a mano'):'sin pasos')+'</p>';
  o+='<div class="btns"><a class="btn acc sm" href="shortcuts://run-shortcut?name='+encodeURIComponent(ATAJO)+'">Actualizar desde el iPhone</a><button class="btn line sm" type="button" data-act="pssync">Revisar si llegaron</button></div>';
  o+='<p class="meta">«Actualizar desde el iPhone» abre la app Atajos y corre el atajo. Después vuelve a Aura.</p></section>';
  // Paso 1: clave y dirección
  o+='<section class="glass" style="padding:16px;display:flex;flex-direction:column;gap:10px"><p class="label">1 · Tu clave y la dirección</p>';
  if(PS.key)o+='<p class="meta">Clave del atajo</p><div class="pskey" id="ps-key" tabindex="0">'+esc(PS.key)+'</div><div class="btns"><button class="btn line sm" type="button" data-act="pscopy" data-v="key">Copiar clave</button></div>';
  else if(hk&&hk!=='?')o+='<p class="muted">Ya creaste una clave, pero no está guardada en este dispositivo. Si tu atajo ya funciona, no hagas nada. Si necesitas copiarla de nuevo, crea una nueva: la anterior deja de funcionar y hay que pegar la nueva en el atajo.</p>';
  o+='<button class="btn '+(PS.key||hk?'line':'acc')+' sm" type="button" data-act="psnew" style="align-self:flex-start">'+(PS.key||hk?(PS.newc?'Toca de nuevo: la clave anterior dejará de funcionar':'Crear una clave nueva'):'Crear mi clave')+'</button>';
  o+='<p class="meta">Dirección (URL) del atajo</p><div class="pskey" id="ps-url" tabindex="0">'+esc(PASOS_URL)+'</div><div class="btns"><button class="btn line sm" type="button" data-act="pscopy" data-v="url">Copiar dirección</button></div>';
  o+='<p class="disc">La clave solo sirve para mandar pasos a tu Aura; no permite ver tus datos. Igual no la compartas.</p></section>';
  // Paso 2: atajo
  o+='<section><div class="sh"><h2>2 · Crear el <em>atajo</em></h2></div><p class="meta">En el iPhone, abre la app <b>Atajos</b> (ícono de cuadrados de colores). Si no la tienes, descárgala gratis desde la App Store.</p><ol class="clist" style="gap:8px">'+
    '<li>Ve a <b>Biblioteca</b> → <b>Todos los atajos</b> y toca el <b>+</b> de abajo al centro. Arriba toca <b>Nuevo atajo</b> → <b>Renombrar</b> y escribe <b>Aura pasos</b> (igual, con mayúscula y espacio).</li>'+
    '<li>En la barra <b>Buscar</b> de abajo escribe <b>muestras de salud</b> y toca <b>Buscar muestras de Salud</b>. Si dice «no tiene acceso», toca <b>Permitir acceso</b> y activa <b>Pasos</b>.</li>'+
    '<li>En esa acción: <b>Tipo es Steps</b> (Pasos) ya viene puesto. En <b>Fecha de inicio</b> toca «está entre los/las» y elige <b>es hoy</b>. En <b>Agrupar por</b> elige <b>Día</b>. No toques Unidad, Ordenar por ni Límite.</li>'+
    '<li>Busca <b>calcular estadísticas</b> y tócala: debe decir <b>Calcular el Suma de Muestras de Salud</b>.</li>'+
    '<li>Busca <b>redondear</b> y toca <b>Redondear número</b> (queda «Redondear Suma a Número entero»).</li>'+
    '<li>Busca <b>obtener contenido</b> y toca <b>Obtener contenido de URL</b>. En <b>URL</b> pega la dirección de arriba. <b>Método</b> → <b>POST</b>. <b>Solicitar cuerpo</b> → <b>JSON</b>.</li>'+
    '<li><b>Agregar nuevo campo</b> → <b>Número</b>: a la izquierda escribe <b>pasos</b>; toca el <b>0</b> y elige la variable <b>Número redondeado</b> sobre el teclado.</li>'+
    '<li><b>Agregar nuevo campo</b> → <b>Texto</b>: a la izquierda escribe <b>clave</b> y a la derecha pega tu clave.</li>'+
    '<li>(Opcional) Busca <b>mostrar notificación</b>, borra el texto y elige <b>Contenido de URL</b>. Apaga <b>Emitir sonido</b> si no quieres que suene.</li>'+
    '<li><b>Revisa el orden</b>: Buscar muestras → Calcular → Redondear → Obtener contenido de URL → Notificación. Si una acción queda en otro lugar, mantenla presionada y arrástrala. «Número redondeado» en <b>rojo</b> significa que el orden está mal; en azul, bien.</li>'+
    '<li>Toca <b>▶︎</b> (abajo a la derecha). Cuando pregunte si puede enviar muestras de salud a supabase.co, toca <b>Permitir siempre</b>. Luego vuelve aquí y toca <b>Revisar si llegaron</b>.</li></ol></section>';
  // Paso 3: automatización
  o+='<section><div class="sh"><h2>3 · Que corra <em>solo</em></h2></div><ol class="clist" style="gap:8px">'+
    '<li>En Atajos: <b>Biblioteca</b> → <b>Automatización</b> → <b>+</b> de abajo. Se abre un «Nuevo atajo»: es normal.</li>'+
    '<li>En el panel de abajo toca el botón azul <b>Automatización</b> → <b>Hora del día</b>.</li>'+
    '<li>Toca <b>Hora</b> y pon <b>12:00 p.m.</b> Toca la flechita: <b>Repetir: Cada día</b>, <b>Automatización</b> encendida, <b>Notificar</b> apagado.</li>'+
    '<li>Busca <b>ejecutar atajo</b>, tócala y elige <b>Aura pasos</b>. Arriba: <b>Renombrar</b> → <b>Pasos 12:00</b>.</li>'+
    '<li>Repite para <b>6:00 p.m.</b>, <b>9:00 p.m.</b> y <b>11:50 p.m.</b> (la de 11:50 p.m. deja el total final del día).</li></ol>'+
    '<p class="disc">Cada envío reemplaza el total del día, así que da lo mismo cuántas veces corra. Si anotas minutos caminados a mano, el siguiente envío del iPhone los reemplaza (el iPhone ya los cuenta).</p></section>';
  return o;
}
function pasosClick(a,b){
  switch(a){
    case 'gopasos': closeSheet(); ui.view='mas'; ui.msub='pasos'; render(); window.scrollTo(0,0); return true;
    case 'pssync': pasosSync(true).then(function(){toast(PS.last?'Último envío: '+n0(PS.last.pasos)+' pasos':'Todavía no llegan pasos')}); return true;
    case 'pscopy': if(b.getAttribute('data-v')==='key')copyText(PS.key,'ps-key');else copyText(PASOS_URL,'ps-url'); return true;
    case 'psnew':
      if((PS.key||PS.hasKey)&&!PS.newc){PS.newc=true;render();return true}
      PS.newc=false;if(!sb||!auth.user||!window.crypto||!crypto.subtle){toast('No se pudo crear la clave aquí');return true}
      var k=newKey();
      crypto.subtle.digest('SHA-256',new TextEncoder().encode(k)).then(function(h){
        return sb.from('atajo_claves').upsert({user_id:auth.user.id,clave_hash:hex(h),creada:new Date().toISOString(),ultimo_uso:null},{onConflict:'user_id'});
      }).then(function(r){
        if(r&&r.error){toast('No se pudo guardar la clave');return}
        PS.key=k;PS.hasKey={creada:new Date().toISOString()};try{localStorage.setItem('aura-atajo-clave',k)}catch(e){}render();toast('Clave creada. Cópiala en el atajo.');
      },function(){toast('No se pudo crear la clave')});
      return true;
  }
  if(PS.newc&&a!=='psnew'){PS.newc=false}
  return false;
}

