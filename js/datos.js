/* Aura · js/datos.js
   Datos de Cuerpo (perfil, balance del día), datos de ejemplo, carga local y guardado en la nube (docs).
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */
/* ---------- Cuerpo · datos propios (state.body, documento 'cuerpo' en la nube) ----------
   prof: {kg, cm, birth, act, goal, pkg, agua}   wh: historial de peso [{date,kg}]
   favs: ids de ejercicios predeterminados   exs: ejercicios propios   foods: alimentos propios
   combos: comidas frecuentes [{id,n,meal,days:['1'..'5'],items:[{fid,q,u}]}] (u: 'p' porciones, 'g' gramos) */
function normBody(b){
  if(!b||typeof b!=='object')b={};
  if(!b.prof||typeof b.prof!=='object')b.prof={};
  ['exs','foods','combos','wh'].forEach(function(k){if(!Array.isArray(b[k]))b[k]=[]});
  if(!Array.isArray(b.favs))b.favs=FAV0.slice();
  if(!b.v){b.v=1;
    // Primera vez: su desayuno habitual de lunes a viernes, para que lo ajuste.
    if(!b.combos.length)b.combos.push({id:uid(),n:'Desayuno de semana',meal:'Desayuno',days:['1','2','3','4','5'],items:[{fid:'pan-cleanlabel',q:1,u:'p'},{fid:'cafe',q:1,u:'p'},{fid:'leche-entera',q:40,u:'g'}]});
  }
  normProg(b);
  return b;
}
function BD(){if(!state.body||!state.body.v)state.body=normBody(state.body);return state.body}
function PF(){return BD().prof}
var ACT={sed:[1.2,'Sedentaria','Trabajo sentada y camino poco'],lig:[1.3,'Ligera','Camino a ratos durante el día'],act:[1.45,'Activa','Paso mucho tiempo de pie o caminando']};
var GOALS={mant:[0,'Mantener mi peso'],bajs:[-250,'Bajar de peso suave'],baj:[-500,'Bajar de peso'],recomp:[-250,'Recomposición corporal'],sub:[250,'Subir masa muscular']};
var MTIME={'Desayuno':'08:00','Almuerzo':'13:30','Colación':'11:00','Once':'18:30','Cena':'20:30'};
function kgv(){var w=parseFloat(PF().kg);return w>0?w:0}
function exKg(){return kgv()||60}
function ageOf(){var p=PF();if(!p.birth)return 0;var b=new Date(p.birth+'T12:00'),n=new Date(),a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return a>0&&a<110?a:0}
function profOk(){return kgv()>0&&parseFloat(PF().cm)>0&&ageOf()>0}
// Mifflin-St Jeor, fórmula para mujeres
function bmr(){var m=parseInt(PF().tmb,10);if(m>=800&&m<=4000)return m;return Math.round(10*kgv()+6.25*parseFloat(PF().cm)-5*ageOf()-161)}
function n0(x){return Math.round(x).toLocaleString('es-CL')}
function rd(x){return Math.round(x*10)/10}
function sgn(x){return (x>0?'+':x<0?'−':'')+n0(Math.abs(x))}

/* Ejercicio */
function allEx(){return BD().exs.concat(EXS)}
function exById(id){var l=allEx();for(var i=0;i<l.length;i++)if(l[i].id===id)return l[i];return null}
function isFav(id){return BD().favs.indexOf(id)>-1}
function metOf(ex,it){return ex.met[it==='suave'?0:it==='intensa'?2:1]}
function exKcal(met,min){return Math.max(0,Math.round((met-1)*exKg()*min/60))}
function wkKcal(l){if(typeof l.kcal==='number')return l.kcal;return l.minutes?exKcal(4,l.minutes):0}
function matchEx(txt){var s=fold(txt),best=null;allEx().forEach(function(e){var n=fold(e.n);if(!best&&(s.indexOf(n)>-1))best=e});if(best)return best;
  var map=[[/barre/,'barre'],[/trotadora|cinta/,'trotadora'],[/camin/,'caminar'],[/trot|corr/,'trote'],[/pilates/,'pilates'],[/yoga/,'yoga'],[/spinning|bici.*estatica/,'spinning'],[/hiit|funcional|crossfit/,'hiit'],[/bici/,'bici'],[/nad|natacion|piscina/,'nado'],[/baile|zumba/,'baile'],[/estir|movilidad/,'estirar'],[/gluteo|pierna|bulgara|hip thrust|peso muerto/,'fuerza-inf'],[/brazo|espalda|hombro|pecho/,'fuerza-sup'],[/gym|gimnasio|pesas/,'gym'],[/casa|mancuerna|kettlebell/,'casa']];
  for(var i=0;i<map.length;i++)if(map[i][0].test(s))return exById(map[i][1]);return null}
function stepsOn(d){var s=logsOn(d,'steps');return s.length?(+s[s.length-1].steps||0):null}
function stepKcal(n){return Math.round(n*exKg()*0.0004)}

/* Alimentación */
function allFoods(){var cu=BD().foods,seen={};cu.forEach(function(f){seen[f.id]=1});return cu.concat(FOODS.filter(function(f){return !seen[f.id]}))}
function qn(q){return parseFloat(String(q==null?'':q).replace(',','.'))||0}
var FR=[[0.25,'¼'],[1/3,'⅓'],[0.5,'½'],[2/3,'⅔'],[0.75,'¾']];
function fracTxt(q){q=qn(q);var w=Math.floor(q+1e-9),r=q-w;if(r>0.98){w++;r=0}if(r<0.02)return String(w);for(var i=0;i<FR.length;i++)if(Math.abs(r-FR[i][0])<0.02)return (w?w:'')+FR[i][1];return dc(Math.round(q*100)/100)}
function isCat(id){return FOODS.some(function(x){return x.id===id})}
function foodById(id){var l=allFoods();for(var i=0;i<l.length;i++)if(l[i].id===id)return l[i];return null}
function itemG(it,fd){var q=qn(it.q);return it.u==='p'&&fd?q*fd.pg:q}
function itemVal(it){ // valores de un ítem del plato o de una comida frecuente
  if(it.fx)return it.fx;
  var fd=foodById(it.fid);if(!fd)return {n:'Alimento borrado',g:0,kcal:0,p:0,c:0,f:0};
  var g=itemG(it,fd),r=g/100;return {fid:fd.id,n:fd.n,g:Math.round(g),kcal:Math.round(fd.k*r),p:rd(fd.p*r),c:rd(fd.c*r),f:rd(fd.f*r)};
}
function sumVals(items){var t={kcal:0,p:0,c:0,f:0};(items||[]).forEach(function(it){var v=itemVal(it);t.kcal+=v.kcal;t.p+=v.p;t.c+=v.c;t.f+=v.f});t.p=rd(t.p);t.c=rd(t.c);t.f=rd(t.f);return t}
function qtyTxt(it){if(it.fx)return it.fx.g?it.fx.g+' g':'';var fd=foodById(it.fid),q=qn(it.q);if(!fd)return '';return it.u==='p'?(q===1?fd.pn:fracTxt(q)+' × '+fd.pn):dc(q)+' g'}
function mealOf(l){if(l.meal)return l.meal;var m=String(l.title||'').split(':')[0];return MEALS.indexOf(m)>-1?m:'Colación'}
function comboTot(c){return sumVals(c.items)}
function dayFood(d){var t={kcal:0,p:0,c:0,f:0,unk:0};logsOn(d,'meal').forEach(function(l){if(typeof l.kcal==='number'){t.kcal+=l.kcal;t.p+=l.p||0;t.c+=l.c||0;t.f+=l.f||0}else{t.unk++;t.p+=+l.protein||0}});return t}

/* Balance del día
   Hoy (versión 21) el gasto en reposo se va sumando de a poco: el metabolismo basal (TMB) corre las 24 horas desde la
   medianoche (también se gasta durmiendo) y la «vida diaria» (TMB × (factor − 1)) se reparte entre las horas activas
   (DAYON a DAYOFF). Pasos y ejercicio cuentan lo anotado. La meta del día y «te quedan» siguen usando el día completo
   (baseFull), para que la meta no cambie con la hora. Los días pasados usan siempre el día completo. */
var DAYON=7,DAYOFF=23;
function dayPart(){var n=new Date(),m=n.getHours()*60+n.getMinutes();return {all:Math.min(1,m/1440),act:Math.max(0,Math.min(1,(m-DAYON*60)/((DAYOFF-DAYON)*60))),hm:nowHM()}}
function dayBal(d){
  var p=PF(),ok=profOk(),b=ok?bmr():0,st=stepsOn(d),fac=st!=null?1.2:(ACT[p.act]||ACT.sed)[0];
  var baseFull=Math.round(b*fac),stK=st!=null&&ok?stepKcal(st):0;
  var live=ok&&d===T(),pt=live?dayPart():null,bNow=live?Math.round(b*pt.all):b,aNow=live?Math.round(b*(fac-1)*pt.act):baseFull-b;
  var base=live?bNow+aNow:baseFull;
  var ex=logsOn(d,'workout').reduce(function(s,l){return s+wkKcal(l)},0);
  var fo=dayFood(d),burn=base+stK+ex,full=baseFull+stK+ex,adj=(GOALS[p.goal]||GOALS.mant)[0];
  return {ok:ok,bmr:b,fac:fac,base:base,baseFull:baseFull,live:live,bNow:bNow,aNow:aNow,hm:live?pt.hm:'',steps:st,stK:stK,ex:ex,eat:fo.kcal,fo:fo,burn:burn,full:full,adj:adj,goal:full+adj,left:full+adj-fo.kcal,bal:fo.kcal-burn};
}
function targets(goalK){var pk=parseFloat(PF().pkg)||1.6,pr=Math.round(pk*exKg()),fat=Math.round(goalK*0.3/9),cb=Math.max(0,Math.round((goalK-pr*4-fat*9)/4));return {p:pr,c:cb,f:fat}}
function aguaGoal(){var a=parseInt(PF().agua,10)||0;return a>=500?a:(a>0?a*250:2000)}
function bottleMl(){var b=parseInt(PF().bot,10)||0;return b>=100&&b<=3000?b:850}
function balWord(x){return Math.abs(x)<=50?'equilibrio':x<0?'déficit':'superávit'}
function dc(x){return String(x).replace('.',',')}

function seed(){
  var t=T(), y=ymd(addDays(new Date(),-1)), a=ymd(addDays(new Date(),-2));
  return {items:[
    {id:uid(),type:'habit',title:'Tomar agua durante el día',module:'Salud',log:[y,a],example:true},
    {id:uid(),type:'habit',title:'Estirar 10 minutos',module:'Ejercicio',log:[y],example:true},
    {id:uid(),type:'habit',title:'Rutina de piel de noche',module:'Belleza',log:[],example:true},
    {id:uid(),type:'task',title:'Pedir hora de control médico',module:'Salud',due:'',time:'',done:false,doneOn:'',example:true},
    {id:uid(),type:'task',title:'Planificar las comidas de la semana',module:'Alimentación',due:t,time:'',done:false,doneOn:'',example:true},
    {id:uid(),type:'reminder',title:'Entrenamiento',module:'Ejercicio',date:t,time:'19:00',done:false,doneOn:'',example:true},
    {id:uid(),type:'reminder',title:'Preparar la colación de mañana',module:'Alimentación',date:t,time:'21:30',done:false,doneOn:'',example:true}
  ],logs:[
    {id:uid(),kind:'water',module:'Alimentación',date:t,time:'10:00',title:'Agua',qty:3,example:true},
    {id:uid(),kind:'meal',module:'Alimentación',date:t,time:'08:00',title:'Desayuno: avena con yogur',protein:18,example:true},
    {id:uid(),kind:'money',module:'Finanzas',date:y,time:'19:20',title:'Supermercado',amount:23450,dir:'gasto',cat:'Supermercado',example:true}
  ]};
}
function load(){
  try{var r=localStorage.getItem(KEY); if(r){var s=JSON.parse(r); if(s&&Array.isArray(s.items)){ if(!Array.isArray(s.logs)) s.logs=[]; if(migrateLogs(s)) localStorage.setItem(KEY,JSON.stringify(s)); return s }}}catch(e){}
  return null;
}
// Migración (22 oct 2026): se quitan los síntomas. "Inicio de período" pasa a kind:'period'; el resto de síntomas se elimina.
// Devuelve true si cambió algo, para subir el cambio a la nube.
function migrateLogs(st){
  if(!st||!Array.isArray(st.logs))return false;var ch=false;
  st.logs=st.logs.filter(function(l){
    if(!l||l.kind!=='symptom')return true;ch=true;
    if(/Inicio de período/.test(l.title||'')){l.kind='period';l.title='Inicio de período';return true}
    return false;
  });
  return ch;
}
/* ---------- Guardado en tu cuenta (db privada por persona) ---------- */
// canon(): JSON con las claves ordenadas. Postgres (jsonb) devuelve las claves en otro orden; sin esto la app reescribiría todo en cada sincronización.
function sortKeys(o){if(Array.isArray(o))return o.map(sortKeys);if(o&&typeof o==='object'){var r={};Object.keys(o).sort().forEach(function(k){r[k]=sortKeys(o[k])});return r}return o}
function canon(o){return JSON.stringify(sortKeys(o))}
var cloud={col:null,ready:false,last:{},timer:null,chain:Promise.resolve(),dirty:false,writing:false,status:'cargando'};
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
  if(cloud.ready){cloud.dirty=true;clearTimeout(cloud.timer);cloud.timer=setTimeout(function(){cloud.chain=cloud.chain.then(syncNow)},500)}
}
function docsOf(st){var o={salud:st.health||{},cuerpo:st.body||{},finanzas:st.fin||{},estado:{items:st.items,cfg:st.cfg||null,org:st.org||null}};st.logs.forEach(function(l){var k='logs-'+String(l.date||'sin-fecha').slice(0,7);(o[k]=o[k]||{logs:[]}).logs.push(l)});(st.doses||[]).forEach(function(d){var k='dosis-'+String(d.date||'sin-fecha').slice(0,7);(o[k]=o[k]||{doses:[]}).doses.push(d)});return o}
function syncNow(){
  cloud.dirty=false;
  var want=docsOf(state),keys={},jobs=[],empty=JSON.stringify({logs:[]});
  Object.keys(want).forEach(function(k){keys[k]=1;var js=canon(want[k]);if(cloud.last[k]!==js)jobs.push([k,js])});
  Object.keys(cloud.last).forEach(function(k){if(keys[k])return;var em=k.indexOf('logs-')===0?empty:k.indexOf('dosis-')===0?canon({doses:[]}):null;if(em&&cloud.last[k]!==em)jobs.push([k,em])});
  if(!jobs.length)return Promise.resolve();
  cloud.writing=true;
  var pr=Promise.resolve();
  jobs.forEach(function(j){pr=pr.then(function(){return cloud.col.doc(j[0]).set(JSON.parse(j[1])).then(function(){cloud.last[j[0]]=j[1]})})});
  return pr.then(function(){cloud.writing=false;setStatus('nube')},function(e){
    cloud.writing=false;setStatus('error');
    toast(e&&e.code==='quota_exceeded'?'Se llenó el espacio de tu cuenta para la app. Lo último quedó solo en este dispositivo.':'No se pudo guardar en tu cuenta. Quedó en este dispositivo y lo reintento en tu próximo cambio.');
  });
}
function applyDocs(snap){
  var items=null,logs=[],doses=[],cf=null,og=null,hl=null,sal=null,bod=null,fin=null,last={};
  snap.docs.forEach(function(d){var b=d.data();if(!b)return;var c=JSON.parse(JSON.stringify(b));last[d.id]=canon(c);
    if(d.id==='estado'){items=Array.isArray(c.items)?c.items:[];cf=c.cfg;og=c.org;hl=c.health&&typeof c.health==='object'?c.health:null}
    else if(d.id==='salud')sal=c;
    else if(d.id==='cuerpo')bod=c;
    else if(d.id==='finanzas')fin=c;
    else if(d.id.indexOf('logs-')===0&&Array.isArray(c.logs))logs=logs.concat(c.logs);
    else if(d.id.indexOf('dosis-')===0&&Array.isArray(c.doses))doses=doses.concat(c.doses)});
  // Migración: si la salud todavía viaja en 'estado', pasa a su propio documento 'salud'.
  // 'estado' se reescribe sin salud solo después de que 'salud' quedó guardado.
  state={items:items||[],logs:logs,doses:doses,cfg:cf&&typeof cf.len==='number'?cf:undefined,health:normHealth(sal||hl||undefined),body:normBody(bod),fin:normFin(fin),org:normOrg(og)};
  cloud.last=last;
  var mig=migrateLogs(state);
  try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
  if(hl||mig){cloud.dirty=true;cloud.chain=cloud.chain.then(syncNow)}
}
function safeRender(){var a=document.activeElement;if(ui.sheet||(a&&a.matches&&a.matches('input,textarea,select')))return;render()}
function setStatus(x){var was=cloud.status;cloud.status=x;if(was!==x&&ui.view==='mas')safeRender()}
