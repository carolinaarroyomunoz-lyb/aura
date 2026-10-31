/* Aura · js/avisos.js
   Avisos (notificaciones push) · 31 oct 2026. Solo PWA: hay que abrir Aura desde el ícono de la pantalla de inicio (iOS 16.4+).
   Cómo funciona:
     1. «Activar avisos» pide permiso al iPhone y lo suscribe (Web Push). La suscripción se guarda en push_subs.
     2. avSync() arma la lista de avisos de los próximos 14 días (avLista) y la manda a Supabase (rpc avisos_reemplazar).
        Se vuelve a mandar después de cada cambio (save → avSyncSoon), al abrir Aura y al volver a ella (cada 15 min como máximo).
        Así, si marcas una dosis o anotas un gasto, el aviso que ya no sirve se anula solo.
     3. Una tarea de Supabase revisa cada 5 minutos y la función «avisos» manda los que tocan (cifrados).
   Preferencias en state.org.av (documento estado, viajan entre dispositivos): {activo, on:{…}, t:{…}, antes}.
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */
var AV={st:'',key:'',busy:false,at:0,hash:'',n:null,t:null,checked:false};
var AV_ON={med:true,rec:true,cal:false,salud:true,resumen:true,agua:true,gastos:true,cierre:true,pasos:true};
var AV_T={resumen:'08:00',agua:'16:00',gastos:'20:30',cierre:'21:30',pasos:'13:00'};
function AVC(){
  var o=OG();if(!o.av||typeof o.av!=='object')o.av={};var a=o.av;
  if(!a.on||typeof a.on!=='object')a.on={};if(!a.t||typeof a.t!=='object')a.t={};
  Object.keys(AV_ON).forEach(function(k){if(typeof a.on[k]!=='boolean')a.on[k]=AV_ON[k]});
  Object.keys(AV_T).forEach(function(k){if(!/^\d{2}:\d{2}$/.test(a.t[k]||''))a.t[k]=AV_T[k]});
  var m=parseInt(a.antes,10);a.antes=m>=5&&m<=180?m:30;
  return a;
}
function avStandalone(){return !!(navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches))}
function avIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function avSupport(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window}
function avB64(s){var t=String(s).replace(/-/g,'+').replace(/_/g,'/');var b=atob(t+'==='.slice((t.length+3)%4)),o=new Uint8Array(b.length);for(var i=0;i<b.length;i++)o[i]=b.charCodeAt(i);return o}
function avEquipo(){var u=navigator.userAgent;return /iphone/i.test(u)?'iPhone':/ipad/i.test(u)?'iPad':/android/i.test(u)?'Android':/mac/i.test(u)?'Mac':'Otro'}
function avRefresh(){if(ui.view==='mas'&&ui.msub==='avisos')safeRender()}

// Estado de este dispositivo: nosoporta | safari | denegado | off | on
function avCheck(){
  if(!avSupport()){AV.st=avIOS()&&!avStandalone()?'safari':'nosoporta';avRefresh();return Promise.resolve()}
  if(avIOS()&&!avStandalone()){AV.st='safari';avRefresh();return Promise.resolve()}
  // Si el service worker no queda listo en 6 segundos (por ejemplo, sin conexión la primera vez), se avisa en vez de quedar en «Revisando…».
  var listo=Promise.race([navigator.serviceWorker.ready,new Promise(function(res,rej){setTimeout(rej,6000)})]);
  return listo.then(function(reg){return reg.pushManager.getSubscription()}).then(function(s){
    if(s){AV.st='on';if(!AV.checked){AV.checked=true;avGuardarSub(s)}}
    else AV.st=Notification.permission==='denied'?'denegado':'off';
    avRefresh();
  },function(){AV.st='nosoporta';avRefresh()});
}
function avGuardarSub(s){
  if(!sb||!auth.user)return Promise.resolve({error:'sesion'});
  var j=s.toJSON(),k=j.keys||{};
  return sb.from('push_subs').upsert({endpoint:j.endpoint,user_id:auth.user.id,p256dh:k.p256dh,auth:k.auth,equipo:avEquipo()},{onConflict:'endpoint'});
}
function avClave(){
  if(AV.key||!sb||!auth.user)return Promise.resolve(AV.key);
  return sb.functions.invoke('avisos',{body:{modo:'clave'}}).then(function(r){var d=r&&r.data;if(d&&d.ok&&d.clave)AV.key=d.clave;return AV.key},function(){return ''});
}
// Debe llamarse directo desde el toque (el iPhone solo pide permiso si viene de un toque).
function avActivar(){
  if(AV.busy)return;if(!sb||!auth.user){toast('Inicia sesión primero');return}
  AV.busy=true;avRefresh();
  var perm=Notification.requestPermission();
  Promise.resolve(perm).then(function(p){
    if(p!=='granted'){AV.busy=false;AV.st=p==='denied'?'denegado':'off';avRefresh();toast(p==='denied'?'Bloqueaste los avisos':'No se activaron');return null}
    return avClave().then(function(key){
      if(!key)throw new Error('clave');
      return navigator.serviceWorker.ready.then(function(reg){return reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:avB64(key)})});
    }).then(function(s){return avGuardarSub(s)}).then(function(r){
      AV.busy=false;if(r&&r.error){AV.st='off';avRefresh();toast('No se pudo guardar este iPhone. Intenta de nuevo.');return}
      AV.st='on';AV.checked=true;AVC().activo=true;save();AV.hash='';avSync(true);avRefresh();toast('Avisos activados. Toca «Mandarme una prueba».');
    });
  }).catch(function(){AV.busy=false;avCheck();toast('No se pudieron activar los avisos. Intenta de nuevo.')});
}
function avDesactivar(){
  AV.busy=true;avRefresh();
  navigator.serviceWorker.ready.then(function(reg){return reg.pushManager.getSubscription()}).then(function(s){
    if(!s)return null;var ep=s.endpoint;
    return s.unsubscribe().then(function(){return sb&&auth.user?sb.from('push_subs').delete().eq('endpoint',ep):null});
  }).then(function(){
    AV.busy=false;AV.st='off';AV.checked=false;AVC().activo=false;save();avSync(true);avRefresh();toast('Avisos desactivados en este dispositivo');
  },function(){AV.busy=false;avCheck()});
}
function avPrueba(){
  if(!sb||!auth.user)return;AV.busy=true;avRefresh();
  sb.functions.invoke('avisos',{body:{modo:'prueba'}}).then(function(r){
    AV.busy=false;avRefresh();var d=r&&r.data;
    if(d&&d.ok)toast('Enviado. Debería llegarte en unos segundos.');
    else toast(d&&d.error==='sin-equipos'?'Este iPhone no está registrado. Desactiva y vuelve a activar.':'No llegó. Revisa tu conexión e intenta de nuevo.');
  },function(){AV.busy=false;avRefresh();toast('No se pudo enviar la prueba')});
}

/* ---------- Lista de avisos de los próximos 14 días ---------- */
function avAt(ds,hm,menos){var d=new Date(ds+'T'+(hm||'09:00')+':00');if(menos)d=new Date(d.getTime()-menos*60000);return d}
function avDia(ds){var n=daysBetween(T(),ds);return n===0?'hoy':n===1?'mañana':DOWL[new Date(ds+'T12:00').getDay()]+' '+dshort(ds)}
function avResumen(ag){
  var meds=ag.filter(function(e){return e.k==='med'}).length,parts=[];
  if(meds)parts.push(meds+(meds===1?' dosis':' dosis'));
  ag.filter(function(e){return e.time&&/^(event|cal|ctrl|reminder|task)$/.test(e.k)&&!e.done&&!e.late}).sort(function(a,b){return a.time<b.time?-1:1}).slice(0,3).forEach(function(e){parts.push(e.time+' '+e.title)});
  ag.filter(function(e){return /^(pay|fix|exam|pend)$/.test(e.k)&&!e.late}).slice(0,2).forEach(function(e){parts.push(e.title)});
  var nTask=ag.filter(function(e){return e.k==='task'&&!e.time&&!e.done&&!e.late}).length;if(nTask)parts.push(nTask+(nTask===1?' tarea':' tareas'));
  return parts.length?parts.join(' · '):'Día despejado. No olvides tu agua.';
}
function avLista(){
  var c=AVC(),on=c.on,tt=c.t,now=Date.now(),out=[],t0=T(),seen={};
  var conPasos=state.logs.some(function(l){return l.kind==='steps'&&l.src==='iphone'});
  function push(k,d,titulo,cuerpo,tag,cond){
    if(seen[k]||!d||isNaN(d.getTime())||d.getTime()<=now+30000||d.getTime()>now+15*86400000)return;seen[k]=1;
    out.push({k:k,at:d.toISOString(),titulo:String(titulo).slice(0,120),cuerpo:String(cuerpo||'').slice(0,300),tag:(tag||k).slice(0,60),cond:cond||''});
  }
  for(var i=0;i<14;i++){
    var ds=plusDays(t0,i),ag=agenda(ds),dw=DOWL[new Date(ds+'T12:00').getDay()];
    ag.forEach(function(e){
      if(e.k==='med'&&on.med&&e.time&&!e.done)push('med:'+e.id+':'+ds+':'+e.time,avAt(ds,e.time),'Hora de '+e.title,(e.sub?e.sub+' · ':'')+'Márcala en Aura cuando la tomes.','med-'+e.id);
      else if((e.k==='reminder'||e.k==='task')&&on.rec&&e.time&&!e.done&&!e.late)push('rec:'+e.id+':'+ds+':'+e.time,avAt(ds,e.time),e.title,'Recordatorio · '+e.time);
      else if(e.k==='event'&&on.rec&&e.time)push('ev:'+e.id+':'+ds+':'+e.time,avAt(ds,e.time,c.antes),e.title,'En '+c.antes+' min · '+e.time+(e.sub?' · '+e.sub:''));
      else if(e.k==='cal'&&on.cal&&e.time)push('cal:'+e.id+':'+e.time,avAt(ds,e.time,c.antes),e.title,'En '+c.antes+' min · '+e.time+(e.sub?' · '+e.sub:''));
      else if(on.salud){
        if(e.k==='ctrl'&&!e.done){
          var cn=e.title.replace(/^Control: /,'');
          push('ctrlv:'+e.id+':'+ds,avAt(plusDays(ds,-1),'20:00'),'Mañana: control de '+cn,(e.time?'A las '+e.time:'Sin hora anotada')+(e.sub?' · '+e.sub:''),'ctrl-'+e.id);
          push('ctrl:'+e.id+':'+ds,e.time?avAt(ds,e.time,120):avAt(ds,'09:00'),'Hoy: control de '+cn,(e.time?'A las '+e.time:'Hoy')+(e.sub?' · '+e.sub:''),'ctrl-'+e.id);
        }
        else if(e.k==='pend'&&!e.late)push('pend:'+e.id+':'+ds,avAt(ds,'10:00'),e.title,'Agenda tu hora. '+(e.sub||''));
        else if(e.k==='exam')push('exam:'+e.id+':'+ds,avAt(ds,'09:00'),e.title,'Lo tienes para hoy'+(e.sub?' · '+e.sub:''));
        else if(e.k==='info')push('info:'+fold(e.title).replace(/[^a-z0-9]+/g,'-').slice(0,40)+':'+ds,avAt(ds,'09:00'),e.title,e.sub||'');
      }
    });
    if(on.resumen)push('res:'+ds,avAt(ds,tt.resumen),'Buenos días · '+dw+' '+(+ds.slice(8)),avResumen(ag),'resumen');
    if(on.agua&&water(ds)<aguaGoal()/2)push('agua:'+ds,avAt(ds,tt.agua),'¿Y el agua?','Llevas '+n0(water(ds))+' ml de '+n0(aguaGoal())+'. Una botella más y vas bien.','agua');
    if(on.gastos&&OG().trk.money&&!moneyOk(ds))push('gastos:'+ds,avAt(ds,tt.gastos),'¿Anotaste tus gastos de hoy?','Anótalos o marca «Hoy no tuve gastos» para no cortar tu racha.','gastos');
    if(on.cierre)push('cierre:'+ds,avAt(ds,tt.cierre),'Cierre del día','¿Cómo estuvo tu día? Míralo en Aura.','cierre');
    if(on.pasos&&conPasos&&OG().trk.steps&&!logsOn(ds,'steps').some(function(l){return l.src==='iphone'}))push('pasos:'+ds,avAt(ds,tt.pasos),'Tus pasos no han llegado','Abre WhatsApp o toca «Actualizar desde el iPhone» en Aura → Pasos.','pasos','pasos');
  }
  out.sort(function(a,b){return a.at<b.at?-1:1});
  return out.slice(0,450);
}
function avSync(force){
  if(!sb||!auth.user||!cloud.ready)return Promise.resolve();
  var c=AVC(),lista=c.activo?avLista():[],h=JSON.stringify(lista);
  if(!force&&h===AV.hash&&Date.now()-AV.at<15*60000)return Promise.resolve();
  if(!c.activo&&!AV.hash&&!force)return Promise.resolve();
  return sb.rpc('avisos_reemplazar',{p_lista:lista}).then(function(r){
    if(r.error)return;AV.hash=h;AV.at=Date.now();AV.n=typeof r.data==='number'?r.data:lista.length;avRefresh();
  },function(){});
}
function avSyncSoon(){clearTimeout(AV.t);AV.t=setTimeout(function(){avSync(false)},4000)}
function avReset(){AV.st='';AV.key='';AV.hash='';AV.at=0;AV.n=null;AV.checked=false;clearTimeout(AV.t)}

/* ---------- Más → Avisos ----------
   La pestaña se suma aquí (antes de «Foto IA») para no tocar finanzas.js, donde están MSUBS y viewMas. */
MSUBS.splice(Math.max(0,MSUBS.length-2),0,['avisos','Avisos']);
var viewMasBase=viewMas;
viewMas=function(){
  if(ui.msub!=='avisos')return viewMasBase();
  var o=header('Belleza, calendario, pasos, avisos, fotos y respaldo','Más');
  o+='<div class="seg cu" role="group" aria-label="Secciones de Más">'+MSUBS.map(function(x){return '<button type="button" data-act="msub" data-v="'+x[0]+'" aria-pressed="'+(x[0]==='avisos')+'">'+x[1]+'</button>'}).join('')+'</div>';
  return o+viewAvisos()+'<p class="disc">Finanzas ahora tiene su propia pestaña abajo. Esta sección se abre con la «C» de arriba.</p>';
};
var AV_ROWS=[
  ['med','Medicamentos','A la hora de cada dosis. Si ya la marcaste, no avisa.'],
  ['rec','Recordatorios y eventos','Recordatorios y tareas con hora, a su hora. Tus eventos de Aura, antes de que empiecen.'],
  ['cal','Eventos de tus calendarios','Los del iPhone (Casa, Trabajo, partidos), antes de que empiecen. Apagado al inicio: el iPhone ya suele avisarlos.'],
  ['salud','Salud','Controles: la noche antes (20:00) y 2 horas antes. Volver a un control, exámenes, último día de un tratamiento y período estimado: en la mañana.']];
var AV_HAB=[
  ['resumen','Resumen de la mañana','Agenda, dosis y pagos del día.'],
  ['agua','Agua','Solo si llevas menos de la mitad de tu meta.'],
  ['gastos','Anotar gastos','Solo si ese día no has anotado ninguno.'],
  ['cierre','Cierre del día','Para revisar cómo estuvo tu día.'],
  ['pasos','Pasos','Solo si a esa hora no han llegado los del iPhone.']];
var AVIN='flex:0 0 auto;width:auto;min-height:40px;padding:0 10px;border-radius:12px;border:1px solid var(--line);background:var(--field)';
function avTog(k,title,sub,time){
  var c=AVC(),v=c.on[k];
  return '<div class="row">'+chkBtn('avtog',k,null,v,title)+'<div class="grow"><div class="ttl">'+esc(title)+'</div><div class="meta">'+esc(sub)+'</div></div>'+
    (time?'<input type="time" data-avt="'+k+'" value="'+esc(c.t[k])+'" aria-label="Hora de '+esc(title)+'" style="'+AVIN+'"'+(v?'':' disabled')+'>':'')+'</div>';
}
function avCuando(iso){var d=new Date(iso),ds=ymd(d);return avDia(ds).replace(/^./,function(x){return x.toUpperCase()})+' '+pad(d.getHours())+':'+pad(d.getMinutes())}
function viewAvisos(){
  if(!AV.st)avCheck();
  if(AV.st==='off'&&!AV.key)avClave();
  var c=AVC(),o='<section class="glass" style="padding:16px;display:flex;flex-direction:column;gap:10px"><p class="label">Avisos en este dispositivo</p>';
  if(AV.st==='on'){
    o+='<p><b style="color:var(--ok)">Activados.</b> '+(c.activo?(AV.n!=null?AV.n+(AV.n===1?' aviso programado':' avisos programados')+' para las próximas 2 semanas.':'Programando tus avisos…'):'')+'</p>';
    o+='<div class="btns"><button class="btn acc sm" type="button" data-act="avprueba"'+(AV.busy?' disabled':'')+'>Mandarme una prueba</button><button class="btn line sm" type="button" data-act="avoff"'+(AV.busy?' disabled':'')+'>Desactivar</button></div>';
  }
  else if(AV.st==='off')o+='<p class="muted">Aura te puede avisar aunque esté cerrada y el iPhone bloqueado. El iPhone te va a pedir permiso.</p><button class="btn acc" type="button" data-act="avon"'+(AV.busy?' disabled':'')+'>'+(AV.busy?'Activando…':'Activar avisos en este iPhone')+'</button>';
  else if(AV.st==='safari')o+='<p class="muted">El iPhone solo permite avisos si abres Aura <b>desde su ícono en la pantalla de inicio</b>, no desde Safari. Ábrela desde el ícono y vuelve aquí.</p><p class="meta">Si no la tienes en la pantalla de inicio: en Safari, Compartir → Agregar a pantalla de inicio.</p>';
  else if(AV.st==='denegado')o+='<p class="late">Los avisos de Aura están bloqueados en este iPhone.</p><p class="meta">Para activarlos: <b>Ajustes</b> del iPhone → <b>Notificaciones</b> → <b>Aura</b> → <b>Permitir notificaciones</b>. Después vuelve aquí.</p><button class="btn line sm" type="button" data-act="avcheck" style="align-self:flex-start">Ya lo hice: revisar</button>';
  else if(AV.st==='nosoporta')o+='<p class="muted">Este navegador no permite avisos. En el iPhone necesitas iOS 16.4 o más nuevo y abrir Aura desde su ícono.</p>';
  else o+='<p class="muted">Revisando…</p>';
  o+='</section>';
  o+='<section><div class="sh"><h2>Con fecha y <em>hora</em></h2></div>'+AV_ROWS.map(function(r){return avTog(r[0],r[1],r[2],false)}).join('')+
    '<div class="row"><div class="grow"><div class="ttl">Cuánto antes de un evento</div><div class="meta">Para tus eventos y los de tus calendarios.</div></div><select data-avantes="1" aria-label="Cuánto antes de un evento" style="'+AVIN+'">'+[10,15,30,45,60,120].map(function(m){return '<option value="'+m+'"'+(c.antes===m?' selected':'')+'>'+(m<60?m+' min':m/60+(m===60?' hora':' horas'))+'</option>'}).join('')+'</select></div></section>';
  o+='<section><div class="sh"><h2>Para tus <em>hábitos</em></h2></div>'+AV_HAB.map(function(r){return avTog(r[0],r[1],r[2],true)}).join('')+'</section>';
  if(c.activo||AV.st==='on'){
    var nx=avLista().slice(0,8);
    o+='<section><div class="sh"><h2>Próximos <em>avisos</em></h2></div>';
    if(!nx.length)o+='<p class="muted">Nada programado por ahora.</p>';
    nx.forEach(function(a){o+='<div class="row"><div class="grow"><div class="ttl">'+esc(a.titulo)+'</div><div class="meta">'+esc(avCuando(a.at))+(a.cuerpo?' · '+esc(a.cuerpo):'')+'</div></div></div>'});
    o+='</section>';
  }
  o+='<p class="disc">Cómo funciona: Aura guarda en tu base de datos privada solo el título y la hora de cada aviso de las próximas 2 semanas, y los actualiza cada vez que la abres o anotas algo (si marcas una dosis antes, ese aviso se borra solo). Un servicio de Supabase los manda cada 5 minutos, así que pueden llegar hasta 5 minutos tarde. El mensaje viaja cifrado: Apple no puede leerlo. Si pasas más de 2 semanas sin abrir Aura, los avisos se detienen hasta que vuelvas. Para silenciarlos en la noche, usa los modos de Concentración del iPhone.</p>';
  return o;
}
function avClick(a,b){
  switch(a){
    case 'avon': avActivar(); return true;
    case 'avoff': avDesactivar(); return true;
    case 'avprueba': avPrueba(); return true;
    case 'avcheck': AV.st='';avCheck(); return true;
    case 'avtog': var k=b.getAttribute('data-id'),c=AVC();if(k in c.on){c.on[k]=!c.on[k];save();render()} return true;
  }
  return false;
}
function avChange(t){
  if(t.matches('[data-avt]')){var k=t.getAttribute('data-avt');if(/^\d{2}:\d{2}$/.test(t.value)){AVC().t[k]=t.value;save();toast('Hora guardada')}return true}
  if(t.matches('[data-avantes]')){AVC().antes=parseInt(t.value,10)||30;save();render();return true}
  return false;
}
