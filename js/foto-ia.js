/* Aura · js/foto-ia.js
   Foto de comida con IA gratis (Gemini, por la función de Supabase «foto-comida»). Versión 22, 25 oct 2026.
   Solo se manda la foto y la lista de alimentos de Aura; ningún dato personal. La clave de Gemini vive como secreto
   en Supabase (GEMINI_API_KEY), nunca en el teléfono ni en GitHub. Sin clave, los botones de foto no aparecen.
     · Plato → los alimentos se suman a la canasta de «Anotar comida» (del catálogo con sus gramos, o estimados).
     · Etiqueta → abre «Nuevo alimento» con los valores por 100 g; al guardar vuelve a la comida con el alimento.
   Botones: «Foto del plato o etiqueta» en «Anotar comida» (input f-fotocom) y «Foto de comida» en el menú del + (f-fotocom2).
   Más («C») → pestaña «Foto IA» (viewFoto): estado, fotos usadas hoy y cómo activarla.
   FOTO.st: '' (sin revisar) | 'on' | 'off' (falta la clave) | 'err'. Todos los archivos de js/ comparten las mismas variables. */
var FOTO={st:'',hoy:0,tope:0,busy:false};
var FOTO_ERR={'sin-clave':'La foto con IA todavía no está activada. Mira Más → Foto IA.','clave-invalida':'La clave de Gemini no funciona. Revísala en Más → Foto IA.','tope':'Llegaste al tope de fotos por hoy. Mañana se renueva.','limite-google':'Google llegó a su límite gratis por ahora. Prueba en un rato o anota a mano.','no-responde':'La IA no respondió. Intenta de nuevo en un rato.','archivo':'No pude leer esa foto. Prueba con otra (JPG o PNG).','entrada':'Falta la foto.','sesion':'Tu sesión venció. Cierra y vuelve a abrir Aura.','red':'Sin conexión. Revisa tu internet.'};
function fotoOn(){return FOTO.st==='on'}
function fotoErr(e){return FOTO_ERR[e]||FOTO_ERR['no-responde']}
function fotoCall(body){
  if(!sb||!auth.user)return Promise.resolve({ok:false,error:'sesion'});
  return sb.functions.invoke('foto-comida',{body:body}).then(function(r){
    var d=r&&r.data;if(r.error||!d)return {ok:false,error:r.error&&/fetch|network/i.test(String(r.error.message||''))?'red':'no-responde'};
    if(!d.ok&&(d.error==='sin-clave'||d.error==='clave-invalida'))FOTO.st='off';
    return d;
  },function(){return {ok:false,error:'red'}});
}
function fotoCheck(){
  return fotoCall({modo:'estado'}).then(function(d){
    if(d.ok){FOTO.st=d.activa?'on':'off';FOTO.hoy=d.hoy||0;FOTO.tope=d.tope||0}else if(FOTO.st!=='off')FOTO.st='err';
    safeRender();
  });
}
/* Foto → JPEG de máximo 1600 px en base64 (viaja liviana) */
function fotoB64(blob){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(String(r.result).split(',')[1]||'')};r.onerror=rej;r.readAsDataURL(blob)})}
function fotoPrep(file){
  var type=file.type||extType(file.name);
  if(!/^image\//.test(type))return Promise.reject('archivo');
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file),im=new Image();
    im.onload=function(){try{var s=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*s);c.height=Math.round(im.naturalHeight*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);
      c.toBlob(function(b){if(!b)return rej('archivo');fotoB64(b).then(function(d){res({tipo:'image/jpeg',datos:d})},rej)},'image/jpeg',.85)}catch(e){URL.revokeObjectURL(url);rej('archivo')}};
    im.onerror=function(){URL.revokeObjectURL(url);rej('archivo')};
    im.src=url;
  });
}
function fotoNum(v){var x=typeof v==='number'?v:parseFloat(String(v||'').replace(',','.'));return isFinite(x)?x:0}
function fotoFoodList(){return allFoods().map(function(f){return f.id+'|'+f.n+'|'+f.pn+' '+f.pg+' g'})}
// Alimentos de la IA → ítems de la canasta: {fid,q (gramos),u:'g'} si está en el catálogo; si no, {fx:{n,g,kcal,p,c,f}}
function fotoItems(al){
  return (Array.isArray(al)?al:[]).map(function(a){
    var g=Math.max(1,Math.round(fotoNum(a.gramos)||100)),fd=a.id&&foodById(String(a.id));
    if(fd)return {fid:fd.id,q:g,u:'g'};
    return {fx:{n:cap(String(a.nombre||'Alimento').slice(0,60)),g:g,kcal:Math.round(fotoNum(a.kcal)),p:rd(fotoNum(a.proteina)),c:rd(fotoNum(a.carbohidratos)),f:rd(fotoNum(a.grasas))}};
  }).filter(function(x){return x.fid||x.fx.kcal>0||x.fx.p>0});
}
function fotoComida(files){
  var file=files&&files[0];if(!file)return;
  var f=ui.form||{},fromMeal=ui.sheet==='meal';
  if(fromMeal){snap();f.fotoBusy=true;f.fotoMsg='';rerender()}else{FOTO.busy=true;renderSheet()}
  var fin=function(msg){if(fromMeal){f.fotoBusy=false;if(ui.sheet==='meal'){f.fotoMsg=msg||'';rerender()}}else{FOTO.busy=false;if(ui.sheet==='menu')renderSheet()}if(msg)toast(msg)};
  fotoPrep(file).then(function(img){
    return fotoCall({modo:'foto',archivos:[img],hoy:T(),ahora:nowHM(),alimentos:fotoFoodList()});
  }).then(function(d){
    if(!d.ok){fin(fotoErr(d.error));return}
    FOTO.hoy++;
    if(d.tipo==='etiqueta'&&d.etiqueta){
      var e=d.etiqueta;if(fromMeal){f.fotoBusy=false;ui.ret={sheet:'meal',form:f}}else{FOTO.busy=false;ui.ret=null}
      goSheet('food',{n:String(e.nombre||'').slice(0,80),cat:'Otros',k:dc(rd(fotoNum(e.kcal))),p:dc(rd(fotoNum(e.proteina))),c:dc(rd(fotoNum(e.carbohidratos))),f:dc(rd(fotoNum(e.grasas))),pn:String(e.porcion||'1 porción').slice(0,40),pg:dc(rd(fotoNum(e.gramos_porcion)||100)),direct:!ui.ret});
      toast('Revisa los valores de la etiqueta y guarda');return;
    }
    var its=fotoItems(d.alimentos);
    if(!its.length){fin('No reconocí alimentos en la foto.');return}
    var ml=MEALS.filter(function(m){return fold(m)===fold(d.momento||'')})[0],nota=d.nota?'IA: '+String(d.nota).slice(0,200):'';
    if(fromMeal){if(ml&&!(f.items||[]).length)f.meal=ml;f.items=(f.items||[]).concat(its);f.fotoBusy=false;f.fotoMsg=nota;rerender();toast('Agregué '+its.length+(its.length===1?' alimento':' alimentos')+'. Ajusta las cantidades si hace falta.')}
    else{FOTO.busy=false;ui.ret=null;goSheet('meal',{meal:ml||guessMeal(),items:its,ldate:T(),direct:true,fotoMsg:nota})}
  },function(e){fin(fotoErr(typeof e==='string'?e:'archivo'))});
}
/* Botones (solo con la foto activada) */
function fotoMealHtml(){
  var f=ui.form;if(!fotoOn())return '';
  return '<div class="fotobtn">'+(f.fotoBusy?'<p class="meta"><b>Mirando tu foto…</b> Puede tardar unos segundos.</p>':'<label class="btn line sm" for="f-fotocom">'+CAM+'Foto del plato o etiqueta</label><input id="f-fotocom" class="sr" type="file" accept="image/*">')+(f.fotoMsg?'<p class="meta" style="flex:1 1 100%">'+esc(f.fotoMsg)+'</p>':'')+'</div>';
}
function fotoMenuHtml(){
  if(!fotoOn())return '';
  return '<div class="fotobtn">'+(FOTO.busy?'<p class="meta"><b>Mirando tu foto…</b></p>':'<label class="btn line sm" for="f-fotocom2">'+CAM+'Foto de comida</label><input id="f-fotocom2" class="sr" type="file" accept="image/*"><span class="meta">Del plato o de la etiqueta</span>')+'</div>';
}
/* Más → Foto IA */
function viewFoto(){
  if(!FOTO.st)fotoCheck();
  var o='<section class="glass" style="padding:16px;display:flex;flex-direction:column;gap:10px"><p class="label">Foto de comida con IA</p>';
  if(FOTO.st==='on')o+='<p><b style="color:var(--ok)">Activada.</b> Usa Gemini (gratis). Hoy llevas '+FOTO.hoy+' de '+FOTO.tope+' fotos.</p><button class="btn line sm" type="button" data-act="fotocheck" style="align-self:flex-start">Revisar</button>';
  else if(FOTO.st==='off')o+='<p class="muted">Todavía no está activada: falta la clave de Gemini en Supabase.</p><button class="btn line sm" type="button" data-act="fotocheck" style="align-self:flex-start">Ya la agregué: revisar</button>';
  else if(FOTO.st==='err')o+='<p class="late">No pude revisar la foto con IA.</p><button class="btn line sm" type="button" data-act="fotocheck" style="align-self:flex-start">Reintentar</button>';
  else o+='<p class="muted">Revisando…</p>';
  o+='</section>';
  o+='<section><div class="sh"><h2>Qué hace</h2></div><ul class="clist" style="gap:6px">'+
    '<li><b>Foto del plato</b>: en «Anotar comida» (o «Foto de comida» en el +). Reconoce los alimentos, estima los gramos y los pone en la canasta con sus calorías y macros. Tú ajustas y guardas.</li>'+
    '<li><b>Foto de la etiqueta</b>: copia la tabla nutricional (por 100 g) y crea el alimento para que quede en tu catálogo.</li></ul></section>';
  if(FOTO.st!=='on')o+='<section><div class="sh"><h2>Cómo <em>activarla</em></h2></div><ol class="clist" style="gap:8px">'+
    '<li>Entra a <b>aistudio.google.com</b> con tu cuenta de Google (puede ser desde el teléfono).</li>'+
    '<li>Toca <b>Get API key</b> → <b>Create API key</b>. Copia la clave (empieza con AIza). Es gratis y no pide tarjeta.</li>'+
    '<li>Entra a <b>supabase.com</b> → proyecto <b>aura</b> → <b>Edge Functions</b> → <b>Secrets</b>.</li>'+
    '<li>Agrega un secreto: nombre <b>GEMINI_API_KEY</b>, valor = la clave que copiaste. Guarda.</li>'+
    '<li>Vuelve aquí y toca <b>Ya la agregué: revisar</b>.</li></ol>'+
    '<p class="disc">La clave va solo en Supabase: no la pegues en el chat de Claude ni en otro lugar. Si algún día se filtra, bórrala en AI Studio y crea otra.</p></section>';
  o+='<p class="disc">Privacidad: solo se manda la foto (y la lista de alimentos de Aura), nunca tus datos. En el plan gratis Google puede usar las fotos para mejorar sus productos. Aura limita a '+(FOTO.tope||40)+' fotos por día y Google tiene su propio límite diario gratis.</p>';
  return o;
}
function fotoClick(a){
  if(a==='fotocheck'){FOTO.st='';render();fotoCheck().then(function(){toast(FOTO.st==='on'?'Foto con IA activada':FOTO.st==='off'?'Aún no encuentro la clave':'No pude revisar')});return true}
  return false;
}
function fotoChange(t){
  if(t.id==='f-fotocom'||t.id==='f-fotocom2'){var fs=t.files;if(fs&&fs.length)fotoComida(fs);t.value='';return true}
  return false;
}
