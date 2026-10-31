/* Aura · js/nube.js
   Supabase: conexión, sesión (correo y contraseña), lectura y tiempo real.
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */
/* ---------- Supabase (versión PWA) ----------
   Proyecto «aura» (ref xgzoooasopaxoyvtyqya). La URL y la clave «anon» son públicas por diseño: la protección son las reglas RLS
   (cada persona solo ve sus filas de la tabla docs y su carpeta del bucket «archivos»).
   docs: (user_id, id, data jsonb) con los mismos documentos del artefacto: estado, salud, cuerpo, finanzas, logs-AAAA-MM, dosis-AAAA-MM.
   Tiempo real: cuando otro dispositivo cambia algo, se vuelve a leer todo (si no hay cambios propios pendientes). */
var SB_URL='https://xgzoooasopaxoyvtyqya.supabase.co',
    SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnem9vb2Fzb3BheG95dnR5cXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3OTc4NjgsImV4cCI6MjEwODM3Mzg2OH0._V5Q_5ZSPw56KW5VOr_onXIKtlmhil9OCfXwIDINtqU';
var sb=null,auth={user:null,checked:false,mode:'in',msg:'',err:false,busy:false,recovery:false,fresh:false};
function sbCol(uid){return {doc:function(id){return {set:function(data){return sb.from('docs').upsert({user_id:uid,id:id,data:data},{onConflict:'user_id,id'}).then(function(r){if(r.error)throw r.error})}}}}}
function sbFetch(){return sb.from('docs').select('id,data').limit(5000).then(function(r){if(r.error)throw r.error;return {empty:!r.data.length,metadata:{},docs:r.data.map(function(x){return {id:x.id,data:function(){return x.data}}})}})}
function sameAsLast(snap){var ids={},same=true;snap.docs.forEach(function(d){ids[d.id]=1;if(canon(d.data())!==cloud.last[d.id])same=false});Object.keys(cloud.last).forEach(function(k){if(!ids[k])same=false});return same}
var refreshT=null;
function refreshCloud(){clearTimeout(refreshT);refreshT=setTimeout(function(){
  if(!cloud.ready||!auth.user)return;
  if(cloud.dirty||cloud.writing){refreshCloud();return}
  sbFetch().then(function(snap){if(cloud.dirty||cloud.writing||sameAsLast(snap))return;applyDocs(snap);setStatus('nube');safeRender()},function(){setStatus('error')});
},700)}
function startCloud(){
  if(!window.supabase||!window.supabase.createClient){setStatus('local');auth.checked=true;render();return}
  sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange(function(ev,session){
    if(ev==='PASSWORD_RECOVERY'){auth.recovery=true;auth.checked=true;render();return}
    var u=session&&session.user;
    if(u&&(!auth.user||auth.user.id!==u.id)){auth.user=u;auth.checked=true;beginSync()}
    else if(!u&&ev==='SIGNED_OUT'){endSession()}
  });
  sb.auth.getSession().then(function(r){var ss=r.data&&r.data.session;if(ss&&ss.user){if(!auth.user){auth.user=ss.user;auth.checked=true;beginSync()}}else{auth.checked=true;render()}},function(){auth.checked=true;render()});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){refreshCloud();calSync(false);pasosSync(false);avSync(false)}});
  window.addEventListener('online',function(){if(cloud.ready){cloud.chain=cloud.chain.then(syncNow);refreshCloud()}});
}
function beginSync(){
  var uid=auth.user.id;
  FILES.assets=sbAssets(uid);FILES.downloads=sbDownloads();
  cloud.col=sbCol(uid);cloud.ready=false;setStatus('cargando');render();
  sbFetch().then(function(snap){
    cloud.ready=true;
    if(snap.empty){
      // Cuenta nueva: no se suben los datos de ejemplo. Se abre Respaldo para pegar el respaldo del artefacto.
      cloud.last={};auth.fresh=true;state.items=state.items.filter(function(x){return !x.example});state.logs=state.logs.filter(function(x){return !x.example});
      ui.view='mas';ui.msub='datos';setStatus('nube');render();toast('Cuenta lista. Pega tu respaldo para traer tus datos.');return}
    applyDocs(snap);setStatus('nube');safeRender();calSync(true);pasosSync(true);fotoCheck();avCheck();avSync(false);
  },function(){setStatus('error');render()});
  if(cloud.ch)sb.removeChannel(cloud.ch);
  cloud.ch=sb.channel('docs-'+uid).on('postgres_changes',{event:'*',schema:'public',table:'docs',filter:'user_id=eq.'+uid},function(){refreshCloud()}).subscribe();
}
function endSession(){
  if(cloud.ch&&sb)sb.removeChannel(cloud.ch);cloud.ch=null;
  auth.user=null;auth.fresh=false;cloud.ready=false;cloud.col=null;cloud.last={};FILES.assets=null;
  try{localStorage.removeItem(KEY);localStorage.removeItem('aura-fin-ui')}catch(e){}
  calReset();avReset();PS.at=0;PS.last=null;PS.hasKey=null;PS.key='';try{localStorage.removeItem('aura-atajo-clave')}catch(e){}
  state=seed();normHealth(state.health);state.body=normBody(state.body);state.fin=normFin(state.fin);state.org=normOrg(state.org);
  closeSheet();ui.view='dia';render();
}
/* Inicio de sesión: correo y contraseña (funciona dentro de la app instalada en el iPhone; un enlace mágico se abriría en Safari). */
function needLogin(){return !!sb&&auth.checked&&(!auth.user||auth.recovery)}
var LOGO='<img class="lg" src="apple-touch-icon.png" alt="">';
function loginView(){
  var m=auth.mode,o='<div class="glass login">'+LOGO+'<div><h1>Aura</h1><p class="muted">Tu bienestar, en un solo lugar. Solo tú puedes ver tus datos.</p></div>';
  if(auth.recovery){
    o+='<form id="newpass-form" class="field" style="gap:12px"><div class="field"><label class="label" for="a-pass">Nueva contraseña</label><input id="a-pass" type="password" autocomplete="new-password" minlength="8" required></div><button class="btn acc" type="submit"'+(auth.busy?' disabled':'')+'>Guardar contraseña</button></form>';
  } else {
    o+='<form id="login-form" class="field" style="gap:12px"><div class="field"><label class="label" for="a-mail">Correo</label><input id="a-mail" type="email" autocomplete="email" autocapitalize="off" required value="'+esc(auth.mail||'')+'"></div>';
    if(m!=='reset')o+='<div class="field"><label class="label" for="a-pass">Contraseña</label><input id="a-pass" type="password" autocomplete="'+(m==='up'?'new-password':'current-password')+'" minlength="'+(m==='up'?8:6)+'" required></div>';
    o+='<button class="btn acc" type="submit"'+(auth.busy?' disabled':'')+'>'+(m==='up'?'Crear mi cuenta':m==='reset'?'Enviarme un enlace':'Entrar')+'</button></form>';
    o+='<div class="btns">'+(m!=='in'?'<button class="link" type="button" data-act="amode" data-v="in">Ya tengo cuenta: entrar</button>':'<button class="link" type="button" data-act="amode" data-v="up">Es mi primera vez: crear cuenta</button>')+(m==='in'?'<button class="link" type="button" data-act="amode" data-v="reset">Olvidé mi contraseña</button>':'')+'</div>';
    if(m==='up')o+='<p class="meta">Usa una contraseña de al menos 8 caracteres. Te llegará un correo para confirmar tu cuenta.</p>';
  }
  if(auth.msg)o+='<p class="amsg'+(auth.err?' err':'')+'" role="status">'+esc(auth.msg)+'</p>';
  return o+'</div>';
}
function authErr(e){var m=String(e&&e.message||'');
  if(/invalid login credentials/i.test(m))return 'Correo o contraseña incorrectos.';
  if(/email not confirmed/i.test(m))return 'Falta confirmar tu correo. Busca el mensaje de Supabase (revisa también spam), toca el enlace y vuelve a entrar.';
  if(/at least|password should|weak/i.test(m))return 'La contraseña es muy corta o muy simple. Usa al menos 8 caracteres.';
  if(/already registered|already exists/i.test(m))return 'Ese correo ya tiene cuenta. Entra con tu contraseña.';
  if(/rate limit|too many|security purposes/i.test(m))return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.';
  if(/fetch|network/i.test(m))return 'Sin conexión. Revisa tu internet y vuelve a probar.';
  return 'No se pudo: '+m;}
function authSubmit(fm){
  if(fm.id!=='login-form'&&fm.id!=='newpass-form')return false;
  var mail=($('a-mail')||{}).value,pass=($('a-pass')||{}).value,back=location.origin+location.pathname,pr;
  auth.mail=mail;auth.busy=true;auth.msg='';auth.err=false;render();
  function fin(msg,err){auth.busy=false;auth.msg=msg||'';auth.err=!!err;render()}
  if(fm.id==='newpass-form'){sb.auth.updateUser({password:pass}).then(function(r){if(r.error)return fin(authErr(r.error),true);auth.recovery=false;fin('');toast('Contraseña guardada')});return true}
  if(auth.mode==='up')pr=sb.auth.signUp({email:mail,password:pass,options:{emailRedirectTo:back}}).then(function(r){if(r.error)return fin(authErr(r.error),true);if(r.data&&r.data.session)return fin('');auth.mode='in';fin('Listo. Te mandé un correo para confirmar tu cuenta: ábrelo, toca el enlace y luego vuelve aquí a entrar.')});
  else if(auth.mode==='reset')pr=sb.auth.resetPasswordForEmail(mail,{redirectTo:back}).then(function(r){if(r.error)return fin(authErr(r.error),true);fin('Te mandé un enlace para crear una contraseña nueva. Ábrelo en este mismo teléfono.')});
  else pr=sb.auth.signInWithPassword({email:mail,password:pass}).then(function(r){if(r.error)return fin(authErr(r.error),true);fin('')});
  pr.catch(function(e){fin(authErr(e),true)});
  return true;
}
function authClick(a,b){
  if(a==='amode'){auth.mode=b.getAttribute('data-v');auth.msg='';auth.err=false;render();return true}
  if(a==='logout'){if(!sb)return true;var go=function(){sb.auth.signOut().then(endSession,endSession)};if(cloud.dirty||cloud.writing){cloud.chain.then(go,go)}else go();return true}
  return false;
}



var ui={view:'dia', oday:'', sub:'resumen', editId:null, hdel:false, stack:[], vfile:null, fctx:null, cal:0, sheet:null, pend:null, edit:false, parsed:null, form:{}};

function find(id){for(var i=0;i<state.items.length;i++){if(state.items[i].id===id)return state.items[i]}return null}
function habits(){return state.items.filter(function(i){return i.type==='habit'})}
function tasksToday(){var t=T();return state.items.filter(function(i){return i.type==='task'&&(i.done?i.doneOn===t:(!i.due||i.due<=t))})}
function remsToday(){var t=T();return state.items.filter(function(i){return i.type==='reminder'&&(i.date===t||(!i.done&&i.date<t))}).sort(function(a,b){return (a.date+(a.time||'99'))<(b.date+(b.time||'99'))?-1:1})}
function logsOn(d,kind){return state.logs.filter(function(l){return l.date===d&&(!kind||l.kind===kind)})}
function waterMl(l){return typeof l.ml==='number'?l.ml:(l.qty||1)*250}
function water(d){return logsOn(d,'water').reduce(function(s,l){return s+waterMl(l)},0)}
function streak(h){var set={};h.log.forEach(function(d){set[d]=1});var d=new Date(),n=0;if(!set[ymd(d)])d=addDays(d,-1);while(set[ymd(d)]){n++;d=addDays(d,-1)}return n}
function monthMoney(){var m=T().slice(0,7),g=0,i=0,cats={};state.logs.forEach(function(l){if(l.kind==='money'&&l.date.slice(0,7)===m){if(l.dir==='ingreso')i+=l.amount;else{g+=l.amount;cats[l.cat]=(cats[l.cat]||0)+l.amount}}});return {g:g,i:i,cats:cats}}


