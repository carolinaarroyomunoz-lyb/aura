/* Aura · js/registro.js
   Registro rápido (+): hoja de registro y texto libre con reglas locales.
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */
/* ---------- Hoja de registro ---------- */
var TILES=[
  ['period','Me llegó el período','Salud'],['med','Medicamento','Salud'],['meal','Comida','Alimentación'],['water','+1 botella de agua','Alimentación'],
  ['workout','Entrenamiento','Ejercicio'],['beauty','Rutina de belleza','Belleza'],['money','Gasto o ingreso','Finanzas'],['dpay','Pago de deuda','Finanzas'],['task','Tarea, evento o hábito','Organizador'],['exam','Examen','Salud'],['ctrl','Control médico','Salud']
];
function ldField(){return '<div class="field"><label class="label" for="f-ldate">Fecha</label><input id="f-ldate" type="date" required max="'+T()+'" value="'+esc(ui.form.ldate||T())+'"></div>'}
function opt(list,sel){return list.map(function(x){return '<option'+(x===sel?' selected':'')+'>'+esc(x)+'</option>'}).join('')}
function sheetHead(title,sub,back){
  return '<div class="handle"></div><div class="top" style="align-items:flex-start"><div>'+(back?'<button class="link" type="button" data-act="sheet" data-s="menu" style="min-height:28px">← Volver</button>':'')+'<h2 class="serif" style="font-size:1.9rem;font-weight:400">'+title+'</h2>'+(sub?'<p class="muted" style="font-size:.85rem;margin-top:2px">'+sub+'</p>':'')+'</div><button class="close" type="button" data-act="close" aria-label="Cerrar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
}
function renderSheet(){
  var s=ui.sheet, el=$('sheet');
  $('scrim').hidden=!s; el.hidden=!s;
  if(!s){el.innerHTML='';return}
  var f=ui.form||{}, o='';
  if(s==='menu'){
    o=sheetHead('Registro <em>rápido</em>','Cada cosa se guarda en su módulo y aparece en Mi día.');
    o+='<div class="tiles">'+TILES.map(function(t){return '<button class="tile" type="button" data-act="'+(t[0]==='water'?'water':(t[0]==='exam'||t[0]==='ctrl')?'hnew':'sheet')+'" data-s="'+t[0]+'" data-t="'+t[0]+'">'+'<span class="dot" style="width:12px;height:12px;margin:0;flex:0 0 auto;background:'+(MCOL[t[2]]||'#2A2240')+'"></span><span><b>'+t[1]+'</b><small>'+t[2]+'</small></span></button>'}).join('')+'</div>';
    o+='<form id="free-form" class="field"><label class="label" for="f-free">O escríbelo como te salga</label><div style="display:flex;gap:8px"><input class="free" id="f-free" type="text" autocomplete="off" placeholder="Ej: ayer gasté 12.990 en farmacia" value="'+esc(f.free||'')+'"><button class="btn sm" type="submit" style="min-height:50px;border-radius:25px">Listo</button></div><p class="meta">Puedes decir cuándo: ayer, anoche, el lunes, el 14/10, mañana a las 8…</p></form>';
    if(!ui.parsed)o+=fotoMenuHtml();
    if(ui.parsed){
      var p=ui.parsed;
      o+='<div class="parse"><p class="label" style="color:var(--accent);display:flex;gap:6px;align-items:center">'+SPARK+'Lo entendí así</p><div class="chips">'+p.chips.map(function(c){return '<span>'+esc(c)+'</span>'}).join('')+'</div><div class="btns"><button class="btn" type="button" data-act="saveparsed">Guardar</button><button class="btn line" type="button" data-act="fixparsed">Corregir</button></div></div>';
    }
  } else if((o=orgSheet(s))!=null){
  } else if(FS[s]){
    o=FS[s]();
  } else if(CS[s]){
    o=CS[s]();
  } else if(HS[s]){
    o=HS[s]();
  } else if(s==='period'){
    o=sheetHead('Me llegó el <em>período</em>','Anota el primer día. Con eso se ajusta tu ciclo.',true);
    o+='<form id="per-form" class="field" style="gap:12px"><div class="field"><label class="label" for="f-pstart">Primer día</label><input id="f-pstart" type="date" required max="'+T()+'" value="'+esc(f.date||T())+'"></div><button class="btn sal" type="submit">Guardar</button></form>';
  } else if(s==='med'){
    o=sheetHead('Medicamento','Anota lo que tomaste.',true);
    o+='<form id="frm" data-k="med" class="field" style="gap:12px"><div class="field"><label class="label" for="f-name">Nombre</label><input id="f-name" type="text" required maxlength="80" value="'+esc(f.name||'')+'" placeholder="Ej: Vitamina D"></div><div class="two">'+ldField()+'<div class="field"><label class="label" for="f-time">Hora</label><input id="f-time" type="time" value="'+(f.time||nowHM())+'"></div></div><button class="btn acc" type="submit">Guardar</button></form>';
  } else if(s==='beauty'){
    o=sheetHead('Rutina de belleza','',true);
    o+='<form id="frm" data-k="beauty" class="field" style="gap:12px"><div class="field"><label class="label" for="f-area">Área</label><select id="f-area">'+opt(['Cabello','Piel','Uñas','Otro'],f.area)+'</select></div><div class="field"><label class="label" for="f-desc">Qué hiciste o usaste</label><input id="f-desc" type="text" required maxlength="120" value="'+esc(f.desc||'')+'" placeholder="Ej: lavado + Night Serum"></div>'+ldField()+'<button class="btn acc" type="submit">Guardar</button></form>';
  } else if(s==='money'){
    var dir=f.dir||'gasto',med=!!f.eid,mcl=dir==='ingreso'?ICATS:CATS,mcs=mcl.indexOf(f.cat)>-1?f.cat:(dir==='ingreso'?'Otros':mcl[0]);
    if(f.pid){dir='gasto';mcl=['Deudas'];mcs='Deudas'}
    o=sheetHead(med?'Editar <em>movimiento</em>':'Gasto o ingreso',f.pid?'Es un pago de deuda: si cambias el monto o la fecha, también cambia en Deudas.':f.fx?'Pago de un gasto fijo.':'',!med&&!f.direct);
    o+='<form id="frm" data-k="money" class="field" style="gap:12px">'+(f.pid?'':'<div class="chips" role="radiogroup" aria-label="Tipo"><button class="chip" type="button" data-act="dir" data-v="gasto" aria-pressed="'+(dir==='gasto')+'">Gasto</button><button class="chip" type="button" data-act="dir" data-v="ingreso" aria-pressed="'+(dir==='ingreso')+'">Ingreso</button></div>')+
      '<div class="two"><div class="field"><label class="label" for="f-amt">Monto (CLP)</label><input id="f-amt" type="text" inputmode="numeric" required value="'+esc(f.amt||'')+'" placeholder="12.990"></div><div class="field"><label class="label" for="f-cat">Categoría</label><select id="f-cat">'+opt(mcl,mcs)+'</select></div></div>'+
      '<div class="field"><label class="label" for="f-desc">Detalle (opcional)</label><input id="f-desc" type="text" maxlength="100" value="'+esc(f.desc||'')+'"></div>'+ldField()+
      '<div class="btns"><button class="btn acc" type="submit">Guardar</button>'+(med?'<button class="btn line" type="button" data-act="mvdel" style="'+(ui.hdel?'color:var(--warn);border-color:var(--warn)':'')+'">'+(ui.hdel?'Toca de nuevo para borrar':'Borrar')+'</button>':'')+'</div></form>';
  } else if(s==='task'){
    var ty=f.ty||'task',ed=!!f.eid;
    o=sheetHead(ed?'Editar <em>'+(ty==='event'?'evento':ty==='reminder'?'recordatorio':'tarea')+'</em>':'Tarea, evento o <em>hábito</em>',ed?'':'Lo que tenga fecha aparece en el Organizador.',!ed);
    o+='<form id="frm" data-k="task" class="field" style="gap:12px">'+(ed?'':'<div class="chips" aria-label="Tipo">'+[['task','Tarea'],['reminder','Recordatorio'],['event','Evento'],['habit','Hábito diario']].map(function(x){return '<button class="chip" type="button" data-act="ty" data-v="'+x[0]+'" aria-pressed="'+(ty===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>')+
      '<div class="field"><label class="label" for="f-name">'+(ty==='event'?'Qué es':'Nombre')+'</label><input id="f-name" type="text" required maxlength="120" value="'+esc(f.name||'')+'"'+(ty==='event'?' placeholder="Ej: Clase de Barre"':'')+'></div>'+
      '<div class="field"><label class="label" for="f-mod">Módulo</label><select id="f-mod">'+opt(MODS,f.mod)+'</select></div>'+
      (ty==='habit'?'':'<div class="two"><div class="field"><label class="label" for="f-date">Fecha</label><input id="f-date" type="date" value="'+(f.date||T())+'"></div><div class="field"><label class="label" for="f-time">'+(ty==='event'?'Desde':ty==='reminder'?'Hora':'Hora (opcional)')+'</label><input id="f-time" type="time" value="'+esc(f.time||'')+'"'+(ty==='reminder'?' required':'')+'></div></div>')+
      (ty==='event'?'<div class="two"><div class="field"><label class="label" for="f-end">Hasta (opcional)</label><input id="f-end" data-f="end" type="time" value="'+esc(f.end||'')+'"></div><div class="field"><label class="label" for="f-place">Lugar (opcional)</label><input id="f-place" data-f="place" type="text" maxlength="80" value="'+esc(f.place||'')+'"></div></div>':'')+
      '<div class="btns"><button class="btn acc" type="submit">Guardar</button>'+(ed?'<button class="btn line" type="button" data-act="idel" style="'+(ui.hdel?'color:var(--warn);border-color:var(--warn)':'')+'">'+(ui.hdel?'Toca de nuevo para borrar':'Borrar')+'</button>':'')+'</div></form>';
  }
  el.innerHTML=o;
  afterSheet();
}
function guessMeal(h){if(h==null)h=new Date().getHours();return h<11?'Desayuno':h<16?'Almuerzo':h<20?'Once':'Cena'}
function snap(){ // guarda lo escrito antes de re-renderizar la hoja
  var g=function(id){var e=$(id);return e?e.value:undefined}, f=ui.form;
  ['f-free:free','f-note:note','f-name:name','f-time:time','f-meal:meal','f-prot:prot','f-desc:desc','f-min:min','f-area:area','f-amt:amt','f-cat:cat','f-mod:mod','f-date:date','f-ldate:ldate'].forEach(function(p){var a=p.split(':'),v=g(a[0]);if(v!==undefined)f[a[1]]=v});
  gsnap();
}
function openSheet(s){ ui.ret=null; if(s==='menu'){ui.form={};ui.parsed=null} ui.sheet=s; renderSheet(); var first=$('sheet').querySelector('input,button.chip,.tile'); if(first&&s!=='menu') first.focus(); }
function closeSheet(){ui.ret=null;cleanupCtx();ui.stack=[];ui.vfile=null;ui.editId=null;ui.hdel=false;ui.sheet=null;ui.parsed=null;ui.form={};renderSheet()}

function addLog(o){o.id=uid();o.date=o.date||T();o.time=o.time||nowHM();state.logs.push(o)}
function amountOf(s){var m=String(s).replace(/\$/g,'').match(/\d[\d.\s]*(?:,\d+)?/);if(!m)return 0;return parseInt(m[0].replace(/[.\s]/g,'').replace(/,\d+$/,''),10)||0}

/* ---------- Texto libre: fechas y horas (reglas locales, sin IA) ----------
   Reconoce: hoy, ayer, anteayer, mañana, pasado mañana, anoche, hace N días o semanas,
   en N días, la semana pasada o próxima, días de la semana (el lunes, el lunes pasado,
   el próximo lunes), 14/10, 14/10/2026, 14 de octubre, el 14, horas (a las 8, 20:30,
   8 pm, a las 8 de la noche) y partes del día (esta mañana, en la tarde, en la noche).
   Lo que ya pasó (comida, gasto, agua…) busca la fecha hacia atrás; tareas y recordatorios, hacia adelante.
   Supuesto: "a las 1" a "a las 6" sin "de la mañana" se entiende como tarde (13:00 a 18:00). */
var NUMW={un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,quince:15};
var DOWN={domingo:0,lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6};
var DOWS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
var MFULL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','setiembre','octubre','noviembre','diciembre'];
var PARTS={manana:'09:00',mediodia:'13:00',tarde:'16:00',noche:'21:00'};
var LOGK={period:1,water:1,money:1,med:1,workout:1,meal:1,weight:1,dpay:1,bm:1,steps:1};
var NWRE='(\\d{1,3}|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince)';
function fold(x){return String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
function wnum(x){return /^\d+$/.test(x)?+x:(NUMW[x]||0)}
function cap(x){x=String(x||'').trim();return x.charAt(0).toUpperCase()+x.slice(1)}
function dmy(y,m,d){var dt=new Date(y,m-1,d);return dt.getMonth()===m-1&&dt.getDate()===d?ymd(dt):''}
function extractWhen(txt){
  var orig=String(txt).normalize('NFC'),s=fold(orig),cut=[];
  if(s.length!==orig.length)orig=s;
  var w={has:false,off:null,abs:'',dow:null,dm:null,dom:null,h:null,mi:0,amb:false,sf:'',part:'',time:''};
  function take(re,fn){s=s.replace(re,function(){var a=arguments,m=a[0],off=a[a.length-2];if(fn.apply(null,a)===false)return m;cut.push([off,off+m.length]);return new Array(m.length+1).join(' ')})}
  function set(k,v){if(!w.has){w.has=true;w[k]=v}}
  function setTime(h,mi,sf,amb){if(h>23||mi>59)return false;if(w.h!=null)return;w.h=h;w.mi=mi;w.sf=sf||'';w.amb=!!amb}
  function setDM(d,m,y){if(m<1||m>12||d<1||d>31)return false;if(y){y=+y;if(y<100)y+=2000;var ds=dmy(y,m,d);if(!ds)return false;set('abs',ds)}else{if(!dmy(2024,m,d))return false;set('dm',{d:d,m:m})}}
  // 1) Horas
  take(new RegExp('\\ba (?:las|la) '+NWRE+'(?:[:.](\\d{2}))?(?: ?(?:hrs?|horas|h)\\b)?(?: ?(am|pm|de la manana|de la tarde|de la noche|del mediodia))?','g'),function(m,h,mi,sf){return setTime(wnum(h),mi?+mi:0,sf,true)});
  take(/\b(\d{1,2}):(\d{2})(?: ?(am|pm))?\b/g,function(m,h,mi,sf){return setTime(+h,+mi,sf,false)});
  take(/\b(\d{1,2}) ?(am|pm)\b/g,function(m,h,sf){return setTime(+h,0,sf,false)});
  // 2) Fechas con números
  take(/\b(?:el |del )?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g,function(m,d,mo,y){return setDM(+d,+mo,y)});
  take(/\b(?:el |del )?(\d{1,2})(?: de)? ([a-z]{3,10})\.?(?:(?: de| del)? (\d{4}))?\b/g,function(m,d,mn,y){
    if(!MFULL.some(function(f){return f.indexOf(mn)===0}))return false;return setDM(+d,MES[mn.slice(0,3)],y)});
  take(/\bel (?:dia )?(\d{1,2})\b(?![:\/.,]\d)(?! ?(?:vasos?|lucas?|mil|min|minutos|g|gr|gramos|km|kilos?|pesos|horas?|hrs?|dias?|veces|%))/g,function(m,d){d=+d;if(d<1||d>31)return false;set('dom',d)});
  // 3) Relativas
  take(/\bpasado manana\b/g,function(){set('off',2)});
  take(/\b(?:anteayer|antes de ayer|antier)\b/g,function(){set('off',-2)});
  take(/\banoche\b/g,function(){set('off',-1);if(!w.part)w.part='noche'});
  take(new RegExp('\\bhace '+NWRE+' (dias?|semanas?)\\b','g'),function(m,n,u){var k=wnum(n);if(!k)return false;set('off',-k*(u.charAt(0)==='s'?7:1))});
  take(new RegExp('\\b(?:dentro de|en) '+NWRE+' (dias?|semanas?)\\b','g'),function(m,n,u){var k=wnum(n);if(!k)return false;set('off',k*(u.charAt(0)==='s'?7:1))});
  take(/\b(?:la|esta) semana pasada\b/g,function(){set('off',-7)});
  take(/\b(?:la (?:proxima|otra) semana|la semana (?:que viene|siguiente))\b/g,function(){set('off',7)});
  // 4) Partes del día (antes de "mañana" suelta)
  take(/\b(?:esta|en la|por la|de la|a la|durante la) (manana|tarde|noche)\b/g,function(m,pt){if(!w.part)w.part=pt});
  take(/\b(?:al|a|en el|a eso del) mediodia\b/g,function(){if(!w.part)w.part='mediodia'});
  // 5) Palabras sueltas
  take(/\bmanana\b/g,function(){set('off',1)});
  take(/\bayer\b/g,function(){set('off',-1)});
  take(/\bhoy\b/g,function(){set('off',0)});
  // 6) Días de la semana
  take(/\b(?:(el|los|este|esta) )?(?:(proximo|otro) )?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)(?: (pasado|que viene|proximo|siguiente))?\b/g,function(m,pre,nx,d,post){
    if(pre==='los')return false;set('dow',{n:DOWN[d],dir:post==='pasado'?-1:(nx||post)?1:0})});
  if(w.h!=null){var h=w.h,sf=w.sf;
    if(/pm|tarde|noche/.test(sf)){if(h<12)h+=12}else if(/am|manana/.test(sf)){if(h===12)h=0}
    else if(w.amb){if(w.part==='tarde'||w.part==='noche'){if(h<12)h+=12}else if(w.part!=='manana'&&h>=1&&h<=6)h+=12}
    w.time=pad(h)+':'+pad(w.mi)}
  var keep=orig.split('');cut.forEach(function(r){for(var i=r[0];i<r[1];i++)keep[i]=' '});
  var rest=keep.join('').replace(/\s+/g,' ').replace(/\s+([,.;])/g,'$1').trim();
  for(var i=0;i<3;i++)rest=rest.replace(/^(?:el|la|los|para|de|del|a|y|,)\s+/i,'').replace(/\s+(?:el|la|para|de|del|a|y|en|desde|hasta)$/i,'').replace(/^[,;.\s]+|[,;\s]+$/g,'');
  w.rest=rest;
  return w;
}
function resolveWhen(w,bias){
  var t=T(),now=new Date(t+'T12:00'),past=bias==='past';
  if(!w.has)return t;
  if(w.off!=null)return plusDays(t,w.off);
  if(w.abs)return w.abs;
  if(w.dow){var dif=w.dow.n-now.getDay();
    if(w.dow.dir<0){if(dif>=0)dif-=7}else if(w.dow.dir>0){if(dif<=0)dif+=7}else if(past){if(dif>0)dif-=7}else{if(dif<0)dif+=7}
    return plusDays(t,dif)}
  if(w.dm){var y=now.getFullYear(),ds=dmy(y,w.dm.m,w.dm.d)||dmy(y+(past?-1:1),w.dm.m,w.dm.d);
    if(past&&ds>t)ds=dmy(y-1,w.dm.m,w.dm.d)||ds;else if(!past&&ds<t)ds=dmy(y+1,w.dm.m,w.dm.d)||ds;return ds}
  if(w.dom){for(var k=0;k<14;k++){var dd=new Date(now.getFullYear(),now.getMonth()+(past?-k:k),w.dom);if(dd.getDate()!==w.dom)continue;var x=ymd(dd);if(past?x<=t:x>=t)return x}}
  return t;
}
function whenLabel(ds){var n=daysBetween(T(),ds);if(n===0)return 'Hoy';if(n===-1)return 'Ayer';if(n===1)return 'Mañana';if(n===-2)return 'Anteayer';if(n===2)return 'Pasado mañana';return DOWS[new Date(ds+'T12:00').getDay()]+' '+dshort(ds)+(ds.slice(0,4)!==T().slice(0,4)?' '+ds.slice(0,4):'')}

/* ---------- Texto libre: reconocimiento local ---------- */
function classify(txt,w){
  var s=txt.toLowerCase(), n;
  if(/me lleg[oó]|regla|per[ií]odo|menstruaci/.test(s)&&!amountOf(s)) return {k:'period',chips:['Inicio de período','Salud']};
  if(/deposici|fui al ba[nñ]o|hice caca|hice pop[oó]|evacu[eé]/.test(fold(s))) return {k:'bm',chips:['Deposición','Salud']};
  var stm=s.match(/(\d{1,3}(?:[.\s]\d{3})+|\d{3,6})\s*pasos/);if(stm){var nst=parseInt(stm[1].replace(/[.\s]/g,''),10);if(nst>0&&nst<=100000)return {k:'steps',steps:nst,chips:['Pasos',n0(nst),'Total del día']}}
  var wm=s.match(/(?:me pes[eé]|mi peso|peso|pes[eé])\D{0,12}(\d{2,3}(?:[.,]\d{1,2})?)/);if(wm&&!/\$|luca|gast/.test(s)){var wk=parseFloat(wm[1].replace(',','.'));if(wk>=30&&wk<=250)return {k:'weight',kg:wk,chips:['Peso',kgTxt(rd(wk))+' kg','Progreso']}}
  if(/agua|vaso|botella/.test(s)){var wml=0,mm;
    if((mm=s.match(/(\d+(?:[.,]\d+)?)\s*(?:ml|cc|mililitros?)/)))wml=Math.round(parseFloat(mm[1].replace(',','.')));
    else if((mm=s.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|lts|litros?)\b/)))wml=Math.round(parseFloat(mm[1].replace(',','.'))*1000);
    else if(/media botella|1\/2 botella/.test(s))wml=Math.round(bottleMl()/2);
    else if((mm=s.match(/(\d+)\s*botellas?/)))wml=parseInt(mm[1],10)*bottleMl();
    else if(/dos botellas/.test(s))wml=2*bottleMl();
    else if(/botella/.test(s))wml=bottleMl();
    else if((mm=s.match(/(\d+)\s*vasos?/)))wml=parseInt(mm[1],10)*250;
    else wml=250;
    if(wml>0&&wml<=5000)return {k:'water',ml:wml,chips:['Agua',n0(wml)+' ml']}}
  if(amountOf(s)&&(/gast|pagu|compr|ingres|sueldo|me pagaron|recib|\$|luca/.test(s)||/farmac|super|jumbo|l[ií]der|unimarc|tottus|feria|uber|metro|bencina|bip|scooter|taxi|cabify|didi|peluquer|arriendo|cuenta|restaur|cine/.test(s))){
    n=amountOf(s); if(/luca/.test(s)&&n<1000)n*=1000; var dir=/ingres|sueldo|me pagaron|recib/.test(s)?'ingreso':'gasto';
    var cat=dir==='ingreso'?(/sueldo|me pagaron/.test(s)?'Sueldo':/reembols|devolvi/.test(s)?'Reembolso':'Otros'):catOf(s);
    if(dir==='ingreso'){}
    else if(/veterinari|mascota|perro|superzoo/.test(s))cat='Mascotas';
    else if(/netflix|spotify|disney|icloud|storytel|crunchyroll|classpass|suscrip/.test(s))cat='Suscripciones';
    else if(/farmac|m[eé]dic|doctor|vitamina|examen|cl[ií]nica|dentist|remedio/.test(s))cat='Salud';
    else if(/super|jumbo|l[ií]der|unimarc|tottus|feria|almac/.test(s))cat='Supermercado';
    else if(/uber|metro|bencina|bip|scooter|taxi|micro|cabify|didi/.test(s))cat='Transporte';
    else if(/peluquer|k[eé]rastase|crema|matiz|maquill|sérum|serum|shampoo|u[ñn]as/.test(s))cat='Belleza';
    else if(/arriendo|luz|gas |agua potable|internet|hogar|casa/.test(s))cat='Hogar';
    else if(/curso|libro|universidad|estudio|matr[ií]cula/.test(s))cat='Estudio';
    else if(/cine|restaur|bar |salida|concierto/.test(s))cat='Ocio';
    if(dir==='gasto'&&/pagu|abon/.test(s)){var mdb=matchDebt(s);if(mdb)return {k:'dpay',did:mdb.id,amount:n,chips:['Pago de deuda',mdb.n,clp(n)]}}
    var mfx=dir==='gasto'&&matchFixed(s);if(mfx)return {k:'money',dir:'gasto',amount:n,cat:mfx.cat,fx:mfx.id,desc:mfx.n,chips:['Gasto fijo',mfx.n,clp(n)]};
    return {k:'money',dir:dir,amount:n,cat:cat,desc:cap(txt),chips:[dir==='ingreso'?'Ingreso':'Gasto',cat,clp(n)]};
  }
  if(/tom[eé]|pastilla|remedio|vitamina|ibuprofeno|paracetamol/.test(s)) return {k:'med',name:cap(txt.replace(/^(me )?tom[eé]\s*(la|el|una|un)?\s*/i,'')),chips:['Medicamento','Salud']};
  if(/entren|barre|corr[eií]|trot|gym|gimnasio|camin|yoga|pilates|bici|nad[eé]|nataci|spinning|hiit|funcional|zumba|bail[eé]|pesas|estir|sentadill|gl[uú]teo/.test(s)){n=parseInt((s.match(/(\d+)\s*min/)||[])[1]||'0',10);var ex=matchEx(s),mm=n||(ex?ex.min:0);return {k:'workout',desc:cap(txt),min:n||'',ex:ex?ex.id:'',chips:[ex?ex.n:'Entrenamiento','Ejercicio'].concat(n?[n+' min']:[]).concat(ex&&mm?['≈ '+n0(exKcal(metOf(ex,'moderada'),mm))+' kcal']:[])}}
  if(/desayun|almorc|almuerzo|cen[eé]|cena|colaci|\bonce\b|com[ií]|lo de siempre/.test(s)){
    var hh=w&&(w.time||PARTS[w.part])?+String(w.time||PARTS[w.part]).slice(0,2):null;
    var ml=/desayun/.test(s)?'Desayuno':/almorc|almuerzo/.test(s)?'Almuerzo':/colaci/.test(s)?'Colación':/\bonce\b/.test(s)?'Once':/cen/.test(s)?'Cena':guessMeal(hh);
    var fs=fold(s),cb=BD().combos.filter(function(c){return fs.indexOf(fold(c.n))>-1})[0]||(/lo de siempre|lo mismo de siempre/.test(fs)?BD().combos.filter(function(c){return c.meal===ml})[0]:null);
    if(cb)return {k:'meal',meal:cb.meal,desc:cap(txt),combo:cb.id,chips:['Comida',cb.meal,cb.n,n0(comboTot(cb).kcal)+' kcal']};
    return {k:'meal',meal:ml,desc:cap(txt),chips:['Comida',ml,'sin calorías: usa Corregir para calcularlas']}}
  return {k:'task',name:cap(txt),chips:[]};
}
function parseFree(txt){
  var w=extractWhen(txt),clean=w.rest||String(txt).trim(),p=classify(clean,w),t=T();
  var date=resolveWhen(w,LOGK[p.k]?'past':'future');
  if(LOGK[p.k]&&date>t)p={k:'task',name:cap(clean),chips:[]}; // todavía no pasa: queda como pendiente
  if(p.k==='task'){
    if(date<t){date=t;p.name=cap(txt)} // una tarea con fecha pasada queda para hoy con el texto completo
    p.rem=!!w.time;p.date=date;p.time=w.time;
    p.chips=[p.rem?'Recordatorio':'Tarea',whenLabel(date)].concat(w.time?[w.time]:[]);
  } else {
    p.date=date;
    p.time=w.time||PARTS[w.part]||(date===t?nowHM():(p.k==='period'?'09:00':'12:00'));
    p.chips=p.chips.concat([whenLabel(date)+(w.time||w.part?' · '+p.time:'')]);
  }
  return p;
}
function saveParsed(p){
  var d=p.date||T(),tm=p.time||'',msg=d===T()?'Guardado':'Guardado · '+whenLabel(d);
  if(p.k==='period'){return addPeriod(d,tm)?'Período anotado'+(d===T()?'':' · '+whenLabel(d)):'Ese inicio ya estaba anotado'}
  if(p.k==='weight'){addWeight(d,p.kg);return kgTxt(rd(p.kg))+' kg'+(d===T()?'':' · '+whenLabel(d))}
  if(p.k==='dpay'){var pdb=debtById(p.did);if(pdb){addDebtPay(pdb,p.amount,d);return 'Pago anotado · '+pdb.n}return 'No encontré esa deuda'}
  if(p.k==='bm'){addBm(d,tm);return 'Deposición anotada'+(d===T()?'':' · '+whenLabel(d))}
  if(p.k==='steps'){setSteps(d,p.steps);return n0(p.steps)+' pasos'+(d===T()?'':' · '+whenLabel(d))}
  if(p.k==='water'){addLog({kind:'water',module:'Alimentación',title:'Agua',ml:p.ml,date:d,time:tm})}
  else if(p.k==='money'){var pml={kind:'money',module:'Finanzas',title:p.desc,amount:p.amount,dir:p.dir,cat:p.cat,date:d,time:tm};if(p.fx)pml.fx=p.fx;addLog(pml)}
  else if(p.k==='med'){addLog({kind:'med',module:'Salud',title:'Tomé '+p.name,date:d,time:tm})}
  else if(p.k==='workout'){var pe=exById(p.ex),pm=+p.min||(pe?pe.min:0),wl={kind:'workout',module:'Ejercicio',title:pe?pe.n:p.desc,minutes:pm,date:d,time:tm};if(pe){wl.exId=pe.id;wl.int='moderada';wl.met=metOf(pe,'moderada');wl.kcal=exKcal(wl.met,pm)}addLog(wl)}
  else if(p.k==='meal'){var pc=p.combo&&BD().combos.filter(function(c){return c.id===p.combo})[0];if(pc)logCombo(pc,d,tm);else addLog({kind:'meal',module:'Alimentación',meal:p.meal,title:p.meal+': '+p.desc,date:d,time:tm})}
  else if(p.rem){state.items.push({id:uid(),type:'reminder',title:p.name,module:'Casa',date:d,time:tm,done:false,doneOn:''})}
  else {state.items.push({id:uid(),type:'task',title:p.name,module:'Casa',due:d,time:'',done:false,doneOn:''})}
  return msg;
}
function fixParsed(p){
  var f={};
  if(p.k==='money'){f={dir:p.dir,amt:String(p.amount),cat:p.cat,desc:p.desc,fx:p.fx||''}}
  else if(p.k==='dpay'){f={did:p.did,amt:n0(p.amount)}}
  else if(p.k==='med'){f={name:p.name,time:p.time}}
  else if(p.k==='workout'){f={ex:p.ex,min:p.min?String(p.min):'',minTyped:!!p.min,note:p.ex?'':p.desc,it:'moderada'}}
  else if(p.k==='meal'){var fc=p.combo&&BD().combos.filter(function(c){return c.id===p.combo})[0];f={meal:p.meal,desc:fc?'':p.desc,items:fc?fc.items.map(function(x){return {fid:x.fid,q:x.q,u:x.u}}):[],combo:fc?fc.id:null,cname:fc?fc.n:null}}
  else if(p.k==='period'){f={date:p.date}}
  else if(p.k==='weight'){f={kg:dc(p.kg)}}
  else if(p.k==='water'){f={ml:String(p.ml)}}
  else if(p.k==='bm'){f={time:p.time}}
  else if(p.k==='steps'){f={smode:'pasos',steps:String(p.steps)}}
  else if(p.k==='task'){f={ty:p.rem?'reminder':'task',name:p.name,date:p.date,time:p.time||''}}
  if(LOGK[p.k]&&p.k!=='period'){f.ldate=p.date;f.ltime=p.time}
  ui.form=f; ui.parsed=null; ui.sheet=p.k; renderSheet();
}
