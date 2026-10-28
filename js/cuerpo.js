/* Aura · js/cuerpo.js
   Cuerpo: balance, alimentación, ejercicio y progreso.
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */
/* ---------- Cuerpo · vistas ---------- */
var STAR='<svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>';
var CSUBS=[['balance','Balance'],['comida','Alimentación'],['ejercicio','Ejercicio'],['progreso','Progreso']];
var DAYS=[['1','Lun'],['2','Mar'],['3','Mié'],['4','Jue'],['5','Vie'],['6','Sáb'],['0','Dom']];
function viewCuerpo(){
  var o=header('Alimentación, ejercicio y balance','<em>Cuerpo</em>'),s=ui.csub||'balance';
  o+='<div class="seg cu" role="group" aria-label="Secciones de Cuerpo">'+CSUBS.map(function(x){return '<button type="button" data-act="csub" data-v="'+x[0]+'" aria-pressed="'+(s===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  return o+(s==='comida'?viewComida():s==='ejercicio'?viewEjercicio():s==='progreso'?viewProgreso():viewBalance());
}
function balStrip(){
  var b=dayBal(T());
  if(!b.ok&&!b.eat&&!b.ex)return '';
  return '<button class="glass balstrip" type="button" data-act="gocuerpo" data-v="balance"><span class="label">Balance de hoy · kcal</span><span class="bs3">'+
    '<span><b>'+n0(b.eat)+'</b><small>comido</small></span><span><b>'+(b.ok?n0(b.burn):'—')+'</b><small>'+(b.live?'gastado a las '+b.hm:'gastado')+'</small></span><span><b>'+(b.ok?sgn(b.bal):'—')+'</b><small>'+(b.ok?balWord(b.bal):'faltan tus datos')+'</small></span></span></button>';
}
function eqRow(lab,val,sub){return '<div class="eqr"><span>'+lab+(sub?'<small>'+sub+'</small>':'')+'</span><b>'+val+'</b></div>'}
function macrosHtml(fo,tg){
  var m=[['p','Proteína','prot'],['c','Carbohidratos','carb'],['f','Grasas','fat']];
  return '<div class="glass macros">'+m.map(function(x){var v=Math.round(fo[x[0]]),tv=tg?tg[x[0]]:0,pc=tv?Math.min(100,Math.round(v*100/tv)):0;
    return '<div class="mac '+x[2]+'"><span class="meta">'+x[1]+'</span><b>'+v+'<small>'+(tv?' / '+tv:'')+' g</small></b><div class="bar"><span style="width:'+pc+'%"></span></div></div>'}).join('')+'</div>';
}
function goalBar(b){
  var g=GOALS[PF().goal]||GOALS.mant,pc=b.goal>0?Math.min(100,Math.round(b.eat*100/b.goal)):0;
  return '<div class="goal"><div class="stat"><span>Meta para «'+g[1].toLowerCase()+'»</span><b>'+n0(b.goal)+' kcal</b></div><div class="bar big"><span style="width:'+pc+'%'+(b.left<0?';background:var(--warn)':'')+'"></span></div><p class="meta">'+(b.left>=0?'Te quedan '+n0(b.left)+' kcal':'Pasaste tu meta por '+n0(-b.left)+' kcal')+(b.adj?' · incluye '+sgn(b.adj)+' kcal por tu objetivo':'')+(b.live?' · la meta usa el gasto del día completo':'')+'</p></div>';
}
function protLine(b){var tp=targets(b.goal).p,pv=Math.round(b.fo.p);return '<p class="prot'+(pv>=tp?' okp':'')+'">'+(pv>=tp?'Llegaste a tu proteína: '+pv+' de '+tp+' g':'Proteína: '+pv+' de '+tp+' g · te faltan '+(tp-pv)+' g')+'</p>'}
function viewBalance(){
  var t=T(),b=dayBal(t),o='',nw=logsOn(t,'workout').length;
  if(!b.ok)o+='<div class="note"><span>Completa tu peso, estatura y fecha de nacimiento para calcular cuánto gastas al día.</span><button class="btn sm" type="button" data-act="csub" data-v="datos">Completar mis datos</button></div>';
  o+='<div class="glass bal"><p class="label">Balance de hoy</p>';
  o+=b.ok?'<div><p class="bign">'+sgn(b.bal)+' <small>kcal</small></p><p class="muted">'+cap(balWord(b.bal))+' calórico: comiste '+n0(b.eat)+' y '+(b.live?'llevas gastadas '+n0(b.burn)+' a las '+b.hm:'gastaste '+n0(b.burn))+'.</p></div>'
         :'<div><p class="bign">'+n0(b.eat)+' <small>kcal comidas</small></p></div>';
  o+='<div class="eq">'+
    (b.live?eqRow('Metabolismo basal',n0(b.bNow),'de '+n0(b.bmr)+' en el día · corre las 24 horas, también durmiendo')+
      eqRow('Vida diaria',n0(b.aNow),'de '+n0(b.baseFull-b.bmr)+' · se reparte entre las '+DAYON+':00 y las '+DAYOFF+':00'+(b.steps!=null?' (con pasos anotados)':'')):
      eqRow('Reposo y vida diaria',b.ok?n0(b.base):'—',b.ok?'TMB '+n0(b.bmr)+' × '+String(b.fac).replace('.',',')+(b.steps!=null?' (con pasos anotados)':''):'Faltan tus datos'))+
    eqRow('Pasos',b.steps!=null?'+'+n0(b.stK):'—',b.steps!=null?n0(b.steps)+' pasos':'Sin anotar hoy')+
    eqRow('Ejercicio','+'+n0(b.ex),nw?nw+(nw===1?' entrenamiento':' entrenamientos'):'Sin entrenamientos hoy')+
    '<div class="eqr tot"><span>'+(b.live?'Gasto hasta ahora<small>al final del día, unas '+n0(b.full)+' kcal</small>':'Gasto total')+'</span><b>'+(b.ok?n0(b.burn):'—')+'</b></div>'+
    eqRow('Comido',n0(b.eat),b.fo.unk?b.fo.unk+(b.fo.unk===1?' comida sin calcular':' comidas sin calcular'):'')+
    '</div>';
  if(b.ok)o+=goalBar(b)+protLine(b);
  o+='</div>';
  o+=macrosHtml(b.fo,b.ok?targets(b.goal):null);
  o+='<div class="btns"><button class="btn acc" type="button" data-act="madd" data-v="'+guessMeal()+'">Anotar comida</button><button class="btn line" type="button" data-act="sheet" data-s="workout">Anotar ejercicio</button></div>';
  var w=water(t),wg=aguaGoal(),bt=bottleMl();
  o+='<section><div class="sh"><h2>Agua y <em>pasos</em></h2></div>'+
    '<div class="row" style="flex-direction:column;align-items:stretch;gap:8px"><div class="stat"><div class="ttl">Agua · '+n0(w)+' de '+n0(wg)+' ml</div><span class="meta">'+dc(rd(w/bt))+' botellas</span></div><div class="bar"><span style="width:'+Math.min(100,Math.round(w*100/wg))+'%"></span></div>'+
    '<div class="btns"><button class="btn sm acc" type="button" data-act="water" data-v="'+bt+'">+ Botella · '+n0(bt)+' ml</button><button class="btn sm line" type="button" data-act="water" data-v="'+Math.round(bt/2)+'">+ ½ botella</button><button class="btn sm line" type="button" data-act="wopen">Otra cantidad</button></div></div>'+
    '<div class="row"><div class="grow"><div class="ttl">Pasos · '+(b.steps!=null?n0(b.steps):'sin anotar')+'</div><div class="meta">'+(logsOn(t,'steps').some(function(l){return l.src==='iphone'})?'Del iPhone · se actualizan solos.':'Anota los pasos o los minutos que caminaste, o <button class="link" type="button" data-act="gopasos" style="min-height:0;padding:0">conecta el iPhone</button>.')+'</div></div><button class="btn sm line" type="button" data-act="sheet" data-s="steps">Anotar</button></div></section>';
  var rows='';
  for(var i=1;i<=7;i++){var d=plusDays(t,-i),db=dayBal(d);if(!db.eat&&!db.ex)continue;
    rows+='<div class="row"><div class="grow"><div class="ttl">'+whenLabel(d)+'</div><div class="meta">Comido '+n0(db.eat)+(db.ok?' · gastado '+n0(db.burn):'')+(db.ex?' · ejercicio '+n0(db.ex):'')+'</div></div>'+(db.ok&&db.eat?'<span class="badge'+(Math.abs(db.bal)<=50?' mut':'')+'">'+sgn(db.bal)+'</span>':db.eat?'':'<span class="badge mut">sin comidas</span>')+'</div>'}
  o+='<section><div class="sh"><h2>Días anteriores</h2></div>'+(rows||'<div class="empty">Cuando anotes comidas y ejercicio verás aquí el balance de cada día.</div>')+'</section>';
  o+='<p class="disc">Son estimaciones. El ejercicio y los pasos cuentan solo lo que gastas por sobre el reposo, para no sumarlo dos veces. Si anotas pasos, la vida diaria se calcula con ellos en vez de tu nivel de actividad.</p>';
  return o;
}
function mealRow(l){
  var sub=l.items&&l.items.length?l.items.map(function(x){return x.n}).join(', '):String(l.title||'').replace(/^[^:]+:\s*/,'');
  return '<div class="row"><button class="rowbtn" type="button" data-act="medit" data-id="'+l.id+'"><div class="ttl">'+esc(l.cname||sub)+'</div><div class="meta">'+esc(l.time||'')+(l.cname?' · '+esc(sub):'')+(l.note&&l.items?' · '+esc(l.note):'')+'</div></button>'+
    (typeof l.kcal==='number'?'<span class="badge">'+n0(l.kcal)+' kcal</span>':'<span class="badge mut">sin calcular</span>')+delBtn(l.id,'log')+'</div>';
}
function fDay(){return plusDays(T(),Math.min(0,ui.fday||0))}
function viewComida(){
  var off=Math.min(0,ui.fday||0),d=fDay(),fo=dayFood(d),b=dayBal(d),o='',lg=logsOn(d,'meal');
  o+='<div class="daynav"><button type="button" data-act="fday" data-d="-1" aria-label="Día anterior">‹</button><b>'+(off===0?'Hoy':whenLabel(d))+'</b><button type="button" data-act="fday" data-d="1" aria-label="Día siguiente"'+(off>=0?' disabled':'')+'>›</button></div>';
  o+='<div class="glass bal"><div class="stat"><span class="label">Comido</span>'+(fo.unk?'<span class="meta">'+fo.unk+' sin calcular</span>':'')+'</div><p class="bign">'+n0(fo.kcal)+' <small>kcal</small></p>'+(b.ok?goalBar(b):'<p class="meta">Completa Mis datos para ver tu meta del día.</p>')+'</div>';
  o+=macrosHtml(fo,b.ok?targets(b.goal):null);
  var dow=String(new Date(d+'T12:00').getDay());
  var sug=BD().combos.filter(function(c){return (c.days||[]).indexOf(dow)>-1&&!lg.some(function(l){return l.combo===c.id})});
  if(sug.length){
    o+='<section><div class="sh"><h2>Lo de <em>siempre</em></h2></div>';
    sug.forEach(function(c){var tt=comboTot(c);o+='<div class="row"><div class="grow"><div class="ttl">'+esc(c.n)+'</div><div class="meta">'+esc(c.meal)+' · '+n0(tt.kcal)+' kcal · '+dc(tt.p)+' g prot.</div></div><button class="btn sm acc" type="button" data-act="clog" data-id="'+c.id+'">Anotar</button></div>'});
    o+='</section>';
  }
  MEALS.forEach(function(m){
    var ls=lg.filter(function(l){return mealOf(l)===m}).sort(function(a,c){return a.time<c.time?-1:1}),k=ls.reduce(function(s,l){return s+(l.kcal||0)},0);
    o+='<section><div class="sh"><h2>'+m+(k?' <span class="meta">'+n0(k)+' kcal</span>':'')+'</h2><button class="link" type="button" data-act="madd" data-v="'+m+'">Agregar</button></div>';
    if(!ls.length)o+='<div class="empty">Sin registro.</div>';
    ls.forEach(function(l){o+=mealRow(l)});
    o+='</section>';
  });
  var cb=BD().combos;
  o+='<section><div class="sh"><h2>Mis comidas <em>frecuentes</em></h2><button class="link" type="button" data-act="cbnew">Crear</button></div>';
  if(!cb.length)o+='<div class="empty">Arma lo que comes seguido para anotarlo con un toque.</div>';
  cb.forEach(function(c){var tt=comboTot(c),ds=(c.days||[]).length;o+='<div class="row"><button class="rowbtn" type="button" data-act="cbedit" data-id="'+c.id+'"><div class="ttl">'+esc(c.n)+'</div><div class="meta">'+esc(c.meal)+' · '+daysTxt(c.days)+' · '+c.items.length+(c.items.length===1?' alimento':' alimentos')+'</div></button><span class="badge">'+n0(tt.kcal)+' kcal</span><span class="badge mut">Editar</span></div>'});
  o+='</section>';
  var fs=BD().foods;
  o+='<section><div class="sh"><h2>Mis alimentos</h2><button class="link" type="button" data-act="fdnew">Crear</button></div>';
  if(!fs.length)o+='<div class="empty">Agrega lo que compras envasado copiando la tabla nutricional de la etiqueta.</div>';
  fs.forEach(function(f){o+='<div class="row"><button class="rowbtn" type="button" data-act="fdedit" data-id="'+f.id+'"><div class="ttl">'+esc(f.n)+'</div><div class="meta">Por 100 g: '+n0(f.k)+' kcal · P '+dc(f.p)+' · C '+dc(f.c)+' · G '+dc(f.f)+'</div></button><span class="badge mut">Editar</span></div>'});
  o+='</section>';
  o+='<p class="disc">El catálogo trae '+FOODS.length+' alimentos y preparaciones comunes en Chile con valores aproximados por 100 g. Para productos envasados, la etiqueta es más exacta. Para corregir uno del catálogo, ábrelo desde una comida y toca «Ajustar valores».</p>';
  return o;
}
function daysTxt(ds){ds=ds||[];if(!ds.length)return 'sin días fijos';if(ds.length===7)return 'todos los días';var wk=['1','2','3','4','5'];if(ds.length===5&&wk.every(function(x){return ds.indexOf(x)>-1}))return 'lunes a viernes';return DAYS.filter(function(x){return ds.indexOf(x[0])>-1}).map(function(x){return x[1]}).join(', ')}
function viewEjercicio(){
  var o='',favs=allEx().filter(function(e){return isFav(e.id)});
  o+='<section><div class="sh"><h2>Tus <em>predeterminados</em></h2></div>';
  if(!favs.length)o+='<div class="empty">Marca con la estrella del catálogo los ejercicios que haces seguido.</div>';
  else o+='<div class="favs">'+favs.map(function(e){return '<button class="fav" type="button" data-act="wquick" data-id="'+e.id+'"><b>'+esc(e.n)+'</b><small>'+e.min+' min · ≈ '+n0(exKcal(metOf(e,'moderada'),e.min))+' kcal</small></button>'}).join('')+'</div>';
  o+='</section>';
  var wk=recent(function(l){return l.kind==='workout'},7),mins=0,kc=0,ben={};
  wk.forEach(function(l){mins+=+l.minutes||0;kc+=wkKcal(l);var e=exById(l.exId);(e?e.ben:[]).forEach(function(x){ben[x]=(ben[x]||0)+1})});
  o+='<section><div class="sh"><h2>Últimos 7 días</h2></div><div class="glass mini"><div><b>'+wk.length+'</b><span class="meta">'+(wk.length===1?'sesión':'sesiones')+'</span></div><div><b>'+n0(mins)+'</b><span class="meta">minutos</span></div><div><b>'+n0(kc)+'</b><span class="meta">kcal extra</span></div></div>';
  var bk=Object.keys(ben).sort(function(a,c){return ben[c]-ben[a]});
  if(bk.length){o+='<p class="label" style="margin-top:8px">Lo que trabajaste</p>';bk.forEach(function(x){o+='<div class="row" style="flex-direction:column;align-items:stretch;gap:6px"><div class="stat"><span style="font-weight:600">'+x+'</span><span class="meta">'+ben[x]+(ben[x]===1?' sesión':' sesiones')+'</span></div><div class="bar"><span style="width:'+Math.round(ben[x]*100/wk.length)+'%"></span></div></div>'})}
  o+='</section>';
  var rw=recent(function(l){return l.kind==='workout'||l.kind==='steps'},14).slice(0,12);
  o+=listSection('Registros recientes',rw,'Sin entrenamientos en las últimas dos semanas.');
  o+='<section><div class="sh"><h2>Catálogo de <em>ejercicios</em></h2><button class="link" type="button" data-act="exnew">Agregar</button></div>';
  allEx().forEach(function(e){
    var info='<div class="ttl">'+esc(e.n)+(e.custom?' <span class="badge mut">propio</span>':'')+'</div><div class="meta">'+esc(e.note||e.mus||'')+(e.note&&e.mus?' · '+esc(e.mus):'')+'</div><div class="meta">'+e.min+' min ≈ '+n0(exKcal(metOf(e,'moderada'),e.min))+' kcal · MET '+String(metOf(e,'moderada')).replace('.',',')+'</div><div class="tags">'+e.ben.map(function(x){return '<span class="bt">'+esc(x)+'</span>'}).join('')+'</div>';
    o+='<div class="row exrow"><button class="star" type="button" data-act="exfav" data-id="'+e.id+'" aria-pressed="'+isFav(e.id)+'" aria-label="Predeterminado: '+esc(e.n)+'">'+STAR+'</button>'+
      (e.custom?'<button class="rowbtn" type="button" data-act="exedit" data-id="'+e.id+'">'+info+'</button>':'<div class="grow">'+info+'</div>')+
      '<button class="btn sm line" type="button" data-act="wquick" data-id="'+e.id+'">Anotar</button></div>';
  });
  o+='</section><p class="disc">Gasto estimado con '+(kgv()?'tu peso ('+String(kgv()).replace('.',',')+' kg)':'60 kg hasta que completes tu peso en Mis datos')+' e intensidad moderada, con valores MET del Compendio de Actividades Físicas. Cuenta solo lo que gastas por sobre el reposo.</p>';
  return o;
}
function tmbCard(){
  var p=PF(),med=parseInt(p.tmb,10)>=800;
  if(!profOk()){var miss=[];if(!kgv())miss.push('peso');if(!(parseFloat(p.cm)>0))miss.push('estatura');if(!ageOf())miss.push('fecha de nacimiento');
    return '<div class="glass bal"><p class="label">Metabolismo basal (TMB)</p><p class="muted">Lo calculo yo cuando completes: '+miss.join(', ')+'.</p></div>'}
  return '<div class="glass bal"><p class="label">Metabolismo basal (TMB)</p><p class="bign">'+n0(bmr())+' <small>kcal al día</small></p><p class="muted">'+(med?'Es el valor que mediste tú.':'Es lo que tu cuerpo gasta en reposo. Se calcula solo con tu peso, estatura y edad (fórmula Mifflin-St Jeor).')+'</p></div>';
}
function viewDatos(){
  var p=PF(),o='',fv=function(k){return esc(p[k]==null?'':p[k])};
  function sel(id,lab,opts,v){return '<div class="field"><label class="label" for="'+id+'">'+lab+'</label><select id="'+id+'">'+opts.map(function(x){return '<option value="'+x[0]+'"'+(String(v)===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>'}).join('')+'</select></div>'}
  o+=tmbCard();
  o+='<form id="prof-form" class="glass" style="padding:16px;display:flex;flex-direction:column;gap:12px">'+
    '<div class="two"><div class="field"><label class="label" for="p-kg">Peso (kg)</label><input id="p-kg" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej: 64,6" value="'+esc(p.kg?dc(p.kg):'')+'"></div><div class="field"><label class="label" for="p-cm">Estatura (cm)</label><input id="p-cm" type="number" inputmode="numeric" min="120" max="220" value="'+fv('cm')+'"></div></div>'+
    '<div class="field"><label class="label" for="p-birth">Fecha de nacimiento</label><input id="p-birth" type="date" max="'+T()+'" value="'+fv('birth')+'"></div>'+
    sel('p-act','Actividad diaria sin contar ejercicio',Object.keys(ACT).map(function(k){return [k,ACT[k][1]+' · '+ACT[k][2]]}),p.act||'sed')+
    sel('p-goal','Objetivo',Object.keys(GOALS).map(function(k){return [k,GOALS[k][1]+(GOALS[k][0]?' ('+sgn(GOALS[k][0])+' kcal al día)':'')]}),p.goal||'mant')+
    '<div class="two">'+sel('p-pkg','Proteína por kg',[['1.2','1,2 g · mínimo'],['1.6','1,6 g · si entrenas fuerza'],['1.8','1,8 g · recomposición'],['2','2 g · ganar masa']],p.pkg||'1.6')+
    '<div class="field"><label class="label" for="p-agua">Meta de agua (ml)</label><input id="p-agua" type="text" inputmode="numeric" autocomplete="off" value="'+aguaGoal()+'"></div></div>'+
    '<div class="two"><div class="field"><label class="label" for="p-bot">Mi botella (ml)</label><input id="p-bot" type="text" inputmode="numeric" autocomplete="off" value="'+bottleMl()+'"></div><div class="field"><label class="label" for="p-tmb">TMB medido (opcional)</label><input id="p-tmb" type="text" inputmode="numeric" autocomplete="off" placeholder="Si no, se calcula" value="'+esc(parseInt(p.tmb,10)>=800?p.tmb:'')+'"></div></div>'+
    '<button class="btn acc" type="submit">Guardar mis datos</button></form>';
  if(profOk()){
    var bb=bmr(),base=Math.round(bb*(ACT[p.act]||ACT.sed)[0]),adj=(GOALS[p.goal]||GOALS.mant)[0],tg=targets(base+adj);
    o+=facts([['Edad',ageOf()+' años'],['Metabolismo basal (TMB)',n0(bb)+' kcal'],['Reposo y vida diaria',n0(base)+' kcal'],['Meta sin ejercicio',n0(base+adj)+' kcal'],['Proteína al día',tg.p+' g'],['Agua',n0(aguaGoal())+' ml']]);
    o+='<p class="disc">Gasto basal con la fórmula Mifflin-St Jeor para mujeres. Cada día se suman el ejercicio y los pasos que anotes, y la meta cambia con ellos.</p>';
  }
  var wh=BD().wh.slice().sort(function(a,c){return a.date<c.date?1:-1});
  if(wh.length){o+='<details class="fin"><summary>Historial de peso ('+wh.length+')</summary>';wh.forEach(function(w,i){var nx=wh[i+1],df=nx?rd(w.kg-nx.kg):null;o+='<div class="row"><div class="grow"><div class="ttl">'+dc(w.kg)+' kg</div><div class="meta">'+dshort(w.date)+' '+w.date.slice(0,4)+(df?' · '+(df>0?'+':'−')+dc(Math.abs(df))+' kg':'')+'</div></div>'+delBtn('w-'+w.date,'wh')+'</div>'});o+='</details>'}
  return o;
}

/* ---------- Cuerpo · hojas ---------- */
function cHead(title,sub){
  var back=ui.ret?'<button class="link" type="button" data-act="cret" style="min-height:28px">← Volver</button>':ui.form.direct?'':'<button class="link" type="button" data-act="sheet" data-s="menu" style="min-height:28px">← Volver</button>';
  return '<div class="handle"></div><div class="top" style="align-items:flex-start"><div style="min-width:0">'+back+'<h2 class="serif" style="font-size:1.9rem;font-weight:400">'+title+'</h2>'+(sub?'<p class="muted" style="font-size:.85rem;margin-top:2px">'+sub+'</p>':'')+'</div><button class="close" type="button" data-act="close" aria-label="Cerrar">'+XMARK+'</button></div>';
}
function bkMeta(x){var v=itemVal(x);return (x.fx&&!v.g?'':v.g+' g · ')+n0(v.kcal)+' kcal · P '+dc(v.p)+' g'}
function totTxt(t){return '<b>'+n0(t.kcal)+' kcal</b><span>Proteína '+dc(t.p)+' g · Carbohidratos '+dc(t.c)+' g · Grasas '+dc(t.f)+' g</span>'}
var QCH_P=[0.25,0.5,0.75,1,1.5,2,3],QCH_G=[50,100,150,200];
function szOf(id){var f=FOODS.filter(function(x){return x.id===id})[0];return f&&f.sz||null}
function basketHtml(){
  var it=ui.form.items||[];
  if(!it.length)return '<div class="empty" id="basket">Busca abajo y toca un alimento para agregarlo.</div>';
  var o='<div id="basket" class="basket">';
  it.forEach(function(x,i){var v=itemVal(x),fd=x.fx?null:foodById(x.fid),q=qn(x.q);
    o+='<div class="bi"><div class="bh"><div class="grow"><div class="ttl">'+esc(v.n)+'</div><div class="meta" id="bk'+i+'">'+bkMeta(x)+'</div>'+(fd?'<div class="meta">1 porción = '+esc(fd.pn)+' · '+fd.pg+' g</div>':'')+'</div><button class="x" type="button" data-act="bdel" data-v="'+i+'">Quitar</button></div>';
    if(fd){
      o+='<div class="qrow"><button class="qb" type="button" data-act="bstep" data-v="'+i+':-1" aria-label="Menos">−</button><input class="qin" id="bq'+i+'" type="text" inputmode="decimal" autocomplete="off" data-bi="'+i+'" value="'+esc(String(x.q).replace('.',','))+'" aria-label="Cantidad de '+esc(v.n)+'"><button class="qb" type="button" data-act="bstep" data-v="'+i+':1" aria-label="Más">+</button><select class="qun" id="bu'+i+'" data-bu="'+i+'" aria-label="Unidad de '+esc(v.n)+'"><option value="p"'+(x.u==='p'?' selected':'')+'>porción</option><option value="g"'+(x.u==='g'?' selected':'')+'>gramos o ml</option></select></div>'+
        '<div class="qch" role="group" aria-label="Cantidades rápidas">'+(x.u==='g'?QCH_G:QCH_P).map(function(c){return '<button class="chip" type="button" data-act="bq" data-v="'+i+':'+c+'" aria-pressed="'+(Math.abs(q-c)<0.001)+'">'+(x.u==='g'?c+' g':fracTxt(c))+'</button>'}).join('')+'</div>'+
        (szOf(fd.id)?'<div class="qch" role="group" aria-label="Tamaño"><span class="meta">Tamaño (1 unidad)</span>'+szOf(fd.id).map(function(z){return '<button class="chip" type="button" data-act="bsz" data-v="'+i+':'+z[1]+'" aria-pressed="'+(x.u==='g'&&Math.abs(q-z[1])<0.001)+'">'+z[0]+' · '+z[1]+' g</button>'}).join('')+'</div>':'')+
        '<button class="link" type="button" data-act="bedit" data-v="'+i+'">'+(isCat(fd.id)?'Ajustar valores de este alimento':'Editar este alimento')+'</button>';
    } else o+='<span class="meta">Cantidad guardada</span>';
    o+='</div>';
  });
  return o+'<div class="btot" id="btot">'+totTxt(sumVals(it))+'</div></div>';
}
function foodResults(q,withCombos){
  var s=fold(q||'').trim(),ws=s.split(/\s+/).filter(Boolean),o='';
  function m(n){var f=fold(n);return ws.every(function(w){return f.indexOf(w)>-1})}
  var cbs=withCombos?BD().combos.filter(function(c){return !s||m(c.n)}):[],fs,lab;
  if(!s){
    var seen={},rec=[];
    state.logs.filter(function(l){return l.kind==='meal'&&l.items}).sort(function(a,c){return (a.date+a.time)<(c.date+c.time)?1:-1}).forEach(function(l){l.items.forEach(function(x){var fd=x.fid&&foodById(x.fid);if(fd&&!seen[fd.id]){seen[fd.id]=1;rec.push(fd)}})});
    fs=BD().foods.filter(function(f){return !seen[f.id]}).concat(rec).slice(0,12);
    if(!fs.length)fs=['pan-cleanlabel','huevo','palta','yogur-natural','platano','pollo','arroz','ens-chilena'].map(foodById).filter(Boolean);
    lab=rec.length||BD().foods.length?'Tus alimentos y usados hace poco':'Algunos para empezar';
  } else {fs=allFoods().filter(function(f){return m(f.n)||m(f.cat)}).slice(0,30);lab='Alimentos'}
  if(cbs.length){o+='<p class="label">Comidas frecuentes</p>';cbs.forEach(function(c){var tt=comboTot(c);o+='<button class="fres" type="button" data-act="cadd" data-id="'+c.id+'"><span class="grow"><b>'+esc(c.n)+'</b><small>'+esc(c.meal)+' · '+n0(tt.kcal)+' kcal · '+dc(tt.p)+' g prot.</small></span><span class="pl" aria-hidden="true">+</span></button>'})}
  if(fs.length){o+='<p class="label">'+lab+'</p>';fs.forEach(function(f){o+='<button class="fres" type="button" data-act="fadd" data-id="'+f.id+'"><span class="grow"><b>'+esc(f.n)+'</b><small>'+esc(f.pn)+' ('+f.pg+' g) · '+n0(f.k*f.pg/100)+' kcal · '+dc(rd(f.p*f.pg/100))+' g prot.</small></span><span class="pl" aria-hidden="true">+</span></button>'})}
  else if(s)o+='<div class="empty">No encontré «'+esc(q)+'». Créalo con los datos de la etiqueta.</div>';
  return o+'<button class="link" type="button" data-act="fdnew">+ Crear un alimento nuevo</button>';
}
function searchBlock(withCombos){return '<div class="field"><label class="label" for="f-fq">'+(withCombos?'Buscar alimento o comida frecuente':'Buscar alimento')+'</label><input id="f-fq" type="search" autocomplete="off" enterkeyhint="search" placeholder="Ej: marraqueta, huevo, cazuela" value="'+esc(ui.form.fq||'')+'"></div><div id="fres" class="fresl">'+foodResults(ui.form.fq,withCombos)+'</div>'}
function stEst(){
  var f=ui.form,mn=parseInt(String(f.smin||'').replace(/\D/g,''),10)||0,pc=parseInt(f.pace||'100',10)||100,sd=f.ldate||T(),cur=stepsOn(sd)||0,n=mn*pc;
  if(!mn)return '<p class="meta">Escribe los minutos para ver los pasos aproximados.</p>';
  return '<p><b>≈ '+n0(n)+' pasos</b> <span class="meta">· ≈ '+n0(stepKcal(n))+' kcal</span></p><p class="meta">'+(cur?(sd===T()?'Hoy':'Ese día')+' llevas '+n0(cur)+'; quedarían '+n0(cur+n)+'. ':'')+'Si ya anotaste la caminata como ejercicio, no la sumes aquí.</p>';
}
function wkEst(){
  var f=ui.form,ex=exById(f.ex),mn=parseInt(f.min,10)||0;
  if(!ex)return '<p class="meta">Elige un ejercicio para ver el gasto estimado.</p>';
  return '<p><b>≈ '+n0(exKcal(metOf(ex,f.it||'moderada'),mn))+' kcal</b> <span class="meta">extra en '+mn+' min</span></p><div class="tags">'+ex.ben.map(function(x){return '<span class="bt">'+esc(x)+'</span>'}).join('')+'</div>';
}
var CS={
  meal:function(){
    var f=ui.form;if(!Array.isArray(f.items))f.items=[];if(!f.meal)f.meal=guessMeal();
    var o=cHead(f.edit?'Editar <em>comida</em>':'Anotar <em>comida</em>','');
    o+='<form id="meal-form" class="field" style="gap:14px"><div class="chips" role="group" aria-label="Momento del día">'+MEALS.map(function(m){return '<button class="chip" type="button" data-act="mk" data-v="'+m+'" aria-pressed="'+(f.meal===m)+'">'+m+'</button>'}).join('')+'</div>';
    o+=fotoMealHtml()+basketHtml()+searchBlock(true);
    o+='<div class="two">'+ldField()+'<div class="field"><label class="label" for="f-desc">Nota (opcional)</label><input id="f-desc" type="text" maxlength="120" value="'+esc(f.desc||'')+'"></div></div>';
    o+='<div class="btns"><button class="btn acc" type="submit">Guardar</button>'+(f.items.length?'<button class="btn line" type="button" data-act="tocombo">Guardar como frecuente</button>':'')+'</div></form>';
    return o;
  },
  combo:function(){
    var f=ui.form;if(!Array.isArray(f.items))f.items=[];if(!f.meal)f.meal='Desayuno';if(!Array.isArray(f.days))f.days=[];
    var o=cHead(f.cid?'Comida <em>frecuente</em>':'Nueva comida <em>frecuente</em>','Queda calculada para anotarla con un toque.');
    o+='<form id="combo-form" class="field" style="gap:14px">'+fIn('n','Nombre','type="text" required maxlength="60" placeholder="Ej: Desayuno de semana"')+
      '<div class="chips" role="group" aria-label="Momento del día">'+MEALS.map(function(m){return '<button class="chip" type="button" data-act="mk" data-v="'+m+'" aria-pressed="'+(f.meal===m)+'">'+m+'</button>'}).join('')+'</div>'+
      fChecks('days','Días en que la sueles comer',DAYS)+basketHtml()+searchBlock(false)+
      '<div class="btns"><button class="btn acc" type="submit">Guardar</button>'+(f.cid?'<button class="btn line" type="button" data-act="cbdel" style="'+(ui.hdel?'color:var(--warn);border-color:var(--warn)':'')+'">'+(ui.hdel?'Toca de nuevo para borrar':'Borrar')+'</button>':'')+'</div></form>';
    return o;
  },
  food:function(){
    var f=ui.form,num='type="text" inputmode="decimal" autocomplete="off"';
    var o=cHead(f.orig?'Ajustar <em>alimento</em>':f.fid?'Editar <em>alimento</em>':'Nuevo <em>alimento</em>',f.orig?'Es del catálogo: tu versión lo reemplaza. Usa la tabla de la etiqueta, columna «100 g».':'Copia la tabla nutricional de la etiqueta, columna «100 g» (o 100 ml).');
    o+='<form id="food-form" class="field" style="gap:12px">'+fIn('n','Nombre','type="text" required maxlength="80" placeholder="Ej: Yogur protein frutilla"')+fSel('cat','Categoría',FCATS.map(function(c){return [c,c]}))+
      '<div class="two">'+fIn('k','Calorías (kcal)',num+' required')+fIn('p','Proteínas (g)',num)+'</div>'+
      '<div class="two">'+fIn('c','Carbohidratos disp. (g)',num)+fIn('f','Grasas totales (g)',num)+'</div>'+
      '<div class="two">'+fIn('pn','Porción','type="text" maxlength="40" placeholder="1 pote"')+fIn('pg','Gramos de la porción','type="text" inputmode="decimal" autocomplete="off" placeholder="155"')+'</div>'+
      '<div class="btns"><button class="btn acc" type="submit">Guardar</button>'+(f.fid&&(!f.orig||BD().foods.some(function(x){return x.id===f.fid}))?'<button class="btn line" type="button" data-act="fddel" style="'+(ui.hdel?'color:var(--warn);border-color:var(--warn)':'')+'">'+(ui.hdel?'Toca de nuevo para confirmar':f.orig?'Volver al original':'Borrar')+'</button>':'')+'</div></form>';
    return o;
  },
  workout:function(){
    var f=ui.form,ex=exById(f.ex);if(!f.it)f.it='moderada';
    if(ex&&f.lastEx!==ex.id){f.lastEx=ex.id;if(!f.minTyped)f.min=String(ex.min)}
    var favs=allEx().filter(function(e){return isFav(e.id)}),rest=allEx().filter(function(e){return !isFav(e.id)});
    var og=function(lab,l){return l.length?'<optgroup label="'+lab+'">'+l.map(function(e){return '<option value="'+e.id+'"'+(f.ex===e.id?' selected':'')+'>'+esc(e.n)+'</option>'}).join('')+'</optgroup>':''};
    var o=cHead('Anotar <em>ejercicio</em>','');
    o+='<form id="wk-form" class="field" style="gap:12px"><div class="field"><label class="label" for="h-ex">Ejercicio</label><select id="h-ex" data-f="ex" data-rer="1"><option value="">Elige un ejercicio</option>'+og('Tus predeterminados',favs)+og('Catálogo',rest)+'</select></div>'+
      '<div class="field"><span class="label">Intensidad</span>'+chipsSel('wint',f.it,INTS)+'</div>'+
      '<div class="two">'+fIn('min','Minutos','type="number" inputmode="numeric" min="1" max="600" required')+ldField()+'</div>'+
      fIn('note','Nota (opcional)','type="text" maxlength="80" placeholder="Ej: con tobilleras de 1 kg"')+
      '<div class="parse" id="wkest">'+wkEst()+'</div>'+
      '<div class="btns"><button class="btn acc" type="submit">Guardar</button></div><button class="link" type="button" data-act="exnew">¿No está? Agrégalo al catálogo</button></form>';
    return o;
  },
  exnew:function(){
    var f=ui.form;
    var o=cHead(f.eid?'Editar <em>ejercicio</em>':'Nuevo <em>ejercicio</em>','Queda en tu catálogo con su gasto y beneficios.');
    o+='<form id="ex-form" class="field" style="gap:12px">'+fIn('n','Nombre','type="text" required maxlength="60" placeholder="Ej: Clase de reformer"')+
      fSel('met','Esfuerzo',[['2.5','Muy suave · como estirar'],['3.5','Suave · como caminar'],['4.5','Moderado · como Barre o pesas'],['6','Exigente · como spinning'],['8','Muy exigente · como trote o HIIT']])+
      fChecks('ben','Beneficios',BENS.map(function(b){return [b,b]}))+
      fIn('mus','Músculos que trabaja','type="text" maxlength="80" placeholder="Ej: glúteos y core"')+
      '<div class="two">'+fIn('min','Minutos habituales','type="number" inputmode="numeric" min="1" max="600"')+'<div class="field">'+fChecks('fav','Predeterminado',[['1','Dejarlo a mano']])+'</div></div>'+
      '<div class="btns"><button class="btn acc" type="submit">Guardar</button>'+(f.eid?'<button class="btn line" type="button" data-act="exdel" style="'+(ui.hdel?'color:var(--warn);border-color:var(--warn)':'')+'">'+(ui.hdel?'Toca de nuevo para borrar':'Borrar')+'</button>':'')+'</div></form>';
    return o;
  },
  steps:function(){
    var f=ui.form,md=f.smode||'min',pc=f.pace||'100';
    var o=cHead('Anotar <em>pasos</em>','En minutos caminados o en pasos.');
    o+='<form id="steps-form" class="field" style="gap:12px"><div class="chips" role="group" aria-label="Cómo anotar">'+[['min','Minutos caminados'],['pasos','Pasos del día']].map(function(m){return '<button class="chip" type="button" data-act="smode" data-v="'+m[0]+'" aria-pressed="'+(md===m[0])+'">'+m[1]+'</button>'}).join('')+'</div>';
    if(md==='min')o+='<div class="field"><span class="label">Ritmo</span>'+chipsSel('spc',pc,[['80','Tranquilo'],['100','Normal'],['120','Rápido']])+'</div><div class="two">'+fIn('smin','Minutos','type="text" inputmode="numeric" autocomplete="off" required')+ldField()+'</div><div class="parse" id="stest">'+stEst()+'</div>';
    else o+='<div class="two">'+fIn('steps','Pasos','type="text" inputmode="numeric" autocomplete="off" required')+ldField()+'</div><p class="meta">Copia el total del día desde la app Salud del iPhone. Reemplaza lo anotado ese día.</p>';
    return o+'<div class="btns"><button class="btn acc" type="submit">Guardar</button></div></form>';
  },
  water:function(){
    var f=ui.form,bt=bottleMl(),ch=[[String(Math.round(bt/2)),'½ botella'],[String(bt),'1 botella'],['250','1 vaso'],['500','500 ml'],['1000','1 litro']];
    return cHead('Anotar <em>agua</em>','En mililitros. Tu botella es de '+n0(bt)+' ml.')+'<form id="water-form" class="field" style="gap:12px"><div class="chips" role="group" aria-label="Cantidades rápidas">'+ch.map(function(c){return '<button class="chip" type="button" data-act="wml" data-v="'+c[0]+'" aria-pressed="'+(String(f.ml)===c[0])+'">'+c[1]+'</button>'}).join('')+'</div><div class="two">'+fIn('ml','Cantidad (ml)','type="text" inputmode="numeric" autocomplete="off" required')+ldField()+'</div><div class="btns"><button class="btn acc" type="submit">Guardar</button></div></form>';
  }
};

/* ---------- Cuerpo · acciones ---------- */
function mealFormFromLog(l){
  return {edit:l.id,direct:true,meal:mealOf(l),ldate:l.date,ltime:l.time,combo:l.combo,cname:l.cname,desc:l.note||(l.items?'':String(l.title||'').replace(/^[^:]+:\s*/,'')),
    items:(l.items||[]).map(function(x){return x.fid&&foodById(x.fid)&&x.q!=null?{fid:x.fid,q:x.q,u:x.u||'g'}:{fx:{n:x.n,g:x.g,kcal:x.kcal,p:x.p,c:x.c,f:x.f}}})};
}
function mealFromItems(meal,items,extra){
  var vals=items.map(itemVal),t=sumVals(items);
  var o={kind:'meal',module:'Alimentación',meal:meal,title:meal+': '+(extra.cname||vals.map(function(v){return v.n}).join(', ')),
    items:items.map(function(x,i){var v=vals[i];return {fid:v.fid||null,q:x.fx?null:x.q,u:x.fx?null:x.u,n:v.n,g:v.g,kcal:v.kcal,p:v.p,c:v.c,f:v.f}}),kcal:t.kcal,p:t.p,c:t.c,f:t.f,protein:Math.round(t.p)};
  if(extra.combo){o.combo=extra.combo;o.cname=extra.cname}
  return o;
}
function logCombo(c,d,tm){var o=mealFromItems(c.meal,c.items.map(function(x){return {fid:x.fid,q:x.q,u:x.u}}),{combo:c.id,cname:c.n});o.date=d;o.time=tm||(d===T()?nowHM():MTIME[c.meal]||'12:00');addLog(o);return o}
function goSheet(s,form){ui.form=form;ui.hdel=false;ui.sheet=s;renderSheet();sheetTop()}
function keepRet(){if(ui.sheet==='meal'||ui.sheet==='combo'||ui.sheet==='workout')ui.ret={sheet:ui.sheet,form:ui.form};else ui.ret=null}
function cuerpoClick(a,b,id){
  var v=b.getAttribute('data-v'),f=ui.form;
  switch(a){
    case 'csub': ui.csub=v==='datos'?'progreso':v; render(); var dz=v==='datos'&&$('datos'); if(dz)dz.scrollIntoView(); else window.scrollTo(0,0); return true;
    case 'gocuerpo': closeSheet(); ui.view='cuerpo'; ui.csub=v||'balance'; render(); window.scrollTo(0,0); return true;
    case 'fday': ui.fday=Math.min(0,(ui.fday||0)+(+b.getAttribute('data-d'))); render(); return true;
    case 'madd': ui.ret=null; goSheet('meal',{meal:v||guessMeal(),items:[],ldate:ui.view==='cuerpo'&&ui.csub==='comida'?fDay():T(),direct:true}); return true;
    case 'medit': var ml=state.logs.filter(function(x){return x.id===id})[0]; if(ml){ui.ret=null;goSheet('meal',mealFormFromLog(ml))} return true;
    case 'mk': snap(); ui.form.meal=v; rerender(); return true;
    case 'fadd': snap(); var fd=foodById(id); if(fd){var its=f.items||(f.items=[]),ex=its.filter(function(x){return x.fid===id&&x.u==='p'})[0]; if(ex)ex.q=qn(ex.q)+1; else its.push({fid:id,q:1,u:'p'}); f.fq=''; rerender(); toast('Agregado: '+fd.n)} return true;
    case 'cadd': snap(); var cc=BD().combos.filter(function(x){return x.id===id})[0]; if(cc){var its2=f.items||(f.items=[]); if(!its2.length){f.combo=cc.id;f.cname=cc.n;f.meal=cc.meal} cc.items.forEach(function(x){its2.push({fid:x.fid,q:x.q,u:x.u})}); f.fq=''; rerender(); toast('Agregado: '+cc.n)} return true;
    case 'bstep': snap(); var bs=v.split(':'),bx=(f.items||[])[+bs[0]]; if(bx&&!bx.fx){var q0=qn(bx.q),dr=+bs[1],nq; if(bx.u==='g')nq=Math.max(5,Math.round(q0/5)*5+dr*10); else nq=Math.max(0.25,dr>0?(q0<1?q0+0.25:q0+0.5):(q0>1?q0-0.5:q0-0.25)); bx.q=Math.round(nq*100)/100; rerender()} return true;
    case 'bsz': snap(); var zs=v.split(':'),zx=(f.items||[])[+zs[0]]; if(zx){zx.u='g';zx.q=parseFloat(zs[1]);rerender()} return true;
    case 'bq': snap(); var qs=v.split(':'),qx=(f.items||[])[+qs[0]]; if(qx){qx.q=parseFloat(qs[1]);rerender()} return true;
    case 'bedit': snap(); var be=(f.items||[])[+v],bf=be&&!be.fx&&foodById(be.fid); if(bf){keepRet(); goSheet('food',{fid:bf.id,n:bf.n,cat:bf.cat,k:dc(bf.k),p:dc(bf.p),c:dc(bf.c),f:dc(bf.f),pn:bf.pn,pg:dc(bf.pg),orig:isCat(bf.id),direct:!ui.ret})} return true;
    case 'wopen': ui.ret=null; goSheet('water',{ml:'',direct:true,ldate:T()}); return true;
    case 'wml': snap(); ui.form.ml=v; var wel=$('h-ml'); if(wel)wel.value=v; rerender(); return true;
    case 'smode': snap(); ui.form.smode=v; rerender(); return true;
    case 'spc': snap(); ui.form.pace=v; rerender(); return true;
    case 'bdel': snap(); (f.items||[]).splice(+v,1); if(!(f.items||[]).length){f.combo=null;f.cname=null} rerender(); return true;
    case 'tocombo': snap(); ui.ret={sheet:'meal',form:f}; goSheet('combo',{items:(f.items||[]).filter(function(x){return !x.fx}).map(function(x){return {fid:x.fid,q:x.q,u:x.u}}),meal:f.meal,days:[],n:''}); return true;
    case 'cret': if(ui.ret){var r=ui.ret;ui.ret=null;ui.form=r.form;ui.hdel=false;ui.sheet=r.sheet;renderSheet()} return true;
    case 'cbnew': ui.ret=null; goSheet('combo',{items:[],meal:'Desayuno',days:[],n:'',direct:true}); return true;
    case 'cbedit': var ce=BD().combos.filter(function(x){return x.id===id})[0]; if(ce){ui.ret=null;goSheet('combo',{cid:ce.id,n:ce.n,meal:ce.meal,days:(ce.days||[]).slice(),items:ce.items.map(function(x){return {fid:x.fid,q:x.q,u:x.u}}),direct:true})} return true;
    case 'cbdel': if(!ui.hdel){ui.hdel=true;rerender();return true} BD().combos=BD().combos.filter(function(x){return x.id!==f.cid}); done('Comida frecuente borrada'); return true;
    case 'clog': var cl=BD().combos.filter(function(x){return x.id===id})[0]; if(cl){var lo=logCombo(cl,fDay());save();render();toast('Anotado: '+cl.n+' · '+n0(lo.kcal)+' kcal')} return true;
    case 'fdnew': snap(); var q=ui.sheet==='meal'||ui.sheet==='combo'?(f.fq||''):''; keepRet(); goSheet('food',{n:q,cat:'Otros',pn:'1 porción',pg:'100',direct:!ui.ret&&!ui.sheet}); return true;
    case 'fdedit': var fe=BD().foods.filter(function(x){return x.id===id})[0]; if(fe){ui.ret=null;goSheet('food',{fid:fe.id,n:fe.n,cat:fe.cat,k:dc(fe.k),p:dc(fe.p),c:dc(fe.c),f:dc(fe.f),pn:fe.pn,pg:dc(fe.pg),orig:isCat(fe.id),direct:true})} return true;
    case 'fddel': if(!ui.hdel){ui.hdel=true;rerender();return true} BD().foods=BD().foods.filter(function(x){return x.id!==f.fid}); done(f.orig?'Volvió a los valores originales':'Alimento borrado'); return true;
    case 'wquick': var we=exById(id); if(we){ui.ret=null;goSheet('workout',{ex:id,min:String(we.min),it:'moderada',lastEx:id,direct:true,ldate:T()})} return true;
    case 'wint': snap(); ui.form.it=v; rerender(); return true;
    case 'exfav': var fv=BD().favs,ix=fv.indexOf(id); if(ix>-1)fv.splice(ix,1); else fv.push(id); save(); render(); return true;
    case 'exnew': snap(); keepRet(); goSheet('exnew',{met:'4.5',ben:[],fav:['1'],min:'45',direct:true}); return true;
    case 'exedit': var xe=exById(id); if(xe&&xe.custom){ui.ret=null;goSheet('exnew',{eid:xe.id,n:xe.n,met:String(xe.mb||xe.met[1]),ben:xe.ben.slice(),mus:xe.mus||'',min:String(xe.min),fav:isFav(xe.id)?['1']:[],direct:true})} return true;
    case 'exdel': if(!ui.hdel){ui.hdel=true;rerender();return true} BD().exs=BD().exs.filter(function(x){return x.id!==f.eid}); BD().favs=BD().favs.filter(function(x){return x!==f.eid}); done('Ejercicio borrado'); return true;
  }
  return progresoClick(a,b,id);
}
function backOrDone(msg,apply){ // vuelve a la hoja anterior si se abrió desde otra
  if(ui.ret){var r=ui.ret;ui.ret=null;if(apply)apply(r.form);save();ui.form=r.form;ui.hdel=false;ui.sheet=r.sheet;renderSheet();toast(msg);return}
  done(msg);
}
function cuerpoSubmit(fm){
  var id=fm.id,f=ui.form;
  if(/^(weight|meas|lift|liftnew|photo)-form$/.test(id))return progresoSubmit(fm);
  if(!/^(meal|combo|food|wk|ex|steps|water|prof)-form$/.test(id))return false;
  if(id==='prof-form'){
    var p=PF(),g=function(x){var e=$(x);return e?e.value.trim():''},kg=parseFloat(g('p-kg').replace(',','.'));
    if(kg>0&&kg!==parseFloat(p.kg)){var wh=BD().wh.filter(function(x){return x.date!==T()});wh.push({date:T(),kg:rd(kg)});BD().wh=wh}
    p.kg=kg>0?rd(kg):'';p.cm=parseFloat(g('p-cm'))||'';p.birth=g('p-birth');p.act=g('p-act');var pg0=p.goal;p.goal=g('p-goal');p.pkg=g('p-pkg');if(p.goal==='recomp'&&pg0!=='recomp'&&parseFloat(p.pkg)<1.8)p.pkg='1.8';var ag=parseInt(g('p-agua').replace(/\D/g,''),10)||0;p.agua=ag>=500&&ag<=6000?ag:(ag>0&&ag<=20?ag*250:2000);var bo=parseInt(g('p-bot').replace(/\D/g,''),10)||0;p.bot=bo>=100&&bo<=3000?bo:850;var tm=parseInt(g('p-tmb').replace(/\D/g,''),10)||0;p.tmb=tm>=800&&tm<=4000?tm:'';
    save();render();toast(profOk()?'Datos guardados':'Guardado. Faltan datos para calcular tu gasto');return true;
  }
  snap();
  if(id==='meal-form'){
    if(document.activeElement&&document.activeElement.id==='f-fq'){document.activeElement.blur();return true}
    var its=(f.items||[]).filter(function(x){return x.fx||(parseFloat(x.q)>0&&foodById(x.fid))}),desc=(f.desc||'').trim(),ld=f.ldate||T();
    if(!its.length&&!desc){toast('Agrega un alimento o escribe qué comiste');return true}
    if(ld>T()){toast('Elige una fecha de hoy o anterior');return true}
    var o;
    if(its.length){o=mealFromItems(f.meal,its,{combo:f.combo,cname:f.cname});if(desc)o.note=desc}
    else o={kind:'meal',module:'Alimentación',meal:f.meal,title:f.meal+': '+desc};
    var old=f.edit?state.logs.filter(function(x){return x.id===f.edit})[0]:null;
    o.date=ld;o.time=old&&old.date===ld?old.time:(ld===T()?nowHM():MTIME[f.meal]||'12:00');
    if(old){o.id=old.id;state.logs=state.logs.map(function(x){return x.id===old.id?o:x})}else addLog(o);
    done((typeof o.kcal==='number'?n0(o.kcal)+' kcal · ':'')+(ld===T()?'Guardado':whenLabel(ld)));return true;
  }
  if(id==='combo-form'){
    var ci=(f.items||[]).filter(function(x){return !x.fx&&parseFloat(x.q)>0&&foodById(x.fid)}),nm=(f.n||'').trim();
    if(!nm){toast('Ponle un nombre');return true}
    if(!ci.length){toast('Agrega al menos un alimento');return true}
    var c={id:f.cid||uid(),n:nm,meal:f.meal,days:Array.isArray(f.days)?f.days:[],items:ci.map(function(x){return {fid:x.fid,q:parseFloat(x.q),u:x.u}})};
    if(f.cid)BD().combos=BD().combos.map(function(x){return x.id===c.id?c:x});else BD().combos.push(c);
    backOrDone('Comida frecuente guardada',function(rf){if(rf&&!rf.combo){rf.combo=c.id;rf.cname=c.n}});return true;
  }
  if(id==='food-form'){
    var nb=function(k){return parseFloat(String(f[k]||'').replace(',','.'))||0},fn=(f.n||'').trim();
    if(!fn){toast('Ponle un nombre');return true}
    var food={id:f.fid||'u-'+uid(),n:fn,cat:f.cat||'Otros',k:nb('k'),p:nb('p'),c:nb('c'),f:nb('f'),pn:(f.pn||'').trim()||'1 porción',pg:nb('pg')||100,custom:true};
    if(BD().foods.some(function(x){return x.id===food.id}))BD().foods=BD().foods.map(function(x){return x.id===food.id?food:x});else BD().foods.push(food);
    backOrDone('Alimento guardado',function(rf){if(rf&&Array.isArray(rf.items)&&!f.fid){rf.items.push({fid:food.id,q:1,u:'p'});rf.fq=''}});return true;
  }
  if(id==='wk-form'){
    var ex=exById(f.ex),mn=parseInt(f.min,10)||0,wd=f.ldate||T();
    if(!ex){toast('Elige un ejercicio');return true}
    if(!mn){toast('Escribe los minutos');return true}
    if(wd>T()){toast('Elige una fecha de hoy o anterior');return true}
    var met=metOf(ex,f.it),note=(f.note||'').trim();
    addLog({kind:'workout',module:'Ejercicio',exId:ex.id,title:ex.n+(note?' · '+note:''),minutes:mn,int:f.it||'moderada',met:met,kcal:exKcal(met,mn),date:wd,time:wd===T()?nowHM():(f.ltime||'19:00')});
    done('≈ '+n0(exKcal(met,mn))+' kcal'+(wd===T()?'':' · '+whenLabel(wd)));return true;
  }
  if(id==='ex-form'){
    var en=(f.n||'').trim(),mb=parseFloat(f.met)||4.5;
    if(!en){toast('Ponle un nombre');return true}
    var e={id:f.eid||'u-'+uid(),n:en,mb:mb,met:[rd(Math.max(2,mb*0.8)),mb,rd(mb*1.2)],ben:Array.isArray(f.ben)?f.ben:[],mus:(f.mus||'').trim(),min:parseInt(f.min,10)||45,custom:true};
    if(f.eid)BD().exs=BD().exs.map(function(x){return x.id===e.id?e:x});else BD().exs.unshift(e);
    var fl=BD().favs.filter(function(x){return x!==e.id});if((f.fav||[]).length)fl.push(e.id);BD().favs=fl;
    backOrDone('Ejercicio guardado',function(rf){if(rf&&'ex' in rf&&!f.eid){rf.ex=e.id}});return true;
  }
  if(id==='steps-form'){
    var sd=f.ldate||T(),prev=logsOn(sd,'steps')[0]||null,tot,wmin=0,msg;
    if(sd>T()){toast('Elige una fecha de hoy o anterior');return true}
    if((f.smode||'min')==='min'){
      var mn2=parseInt(String(f.smin||'').replace(/\D/g,''),10)||0;
      if(!(mn2>0&&mn2<=600)){toast('Escribe los minutos caminados');return true}
      var add=mn2*(parseInt(f.pace||'100',10)||100);tot=(prev?+prev.steps||0:0)+add;wmin=(prev?+prev.walkMin||0:0)+mn2;msg='+'+n0(add)+' pasos · total '+n0(tot);
    } else {
      tot=parseInt(String(f.steps||'').replace(/\D/g,''),10);
      if(!(tot>=0&&tot<=100000)){toast('Escribe tus pasos');return true}
      msg=n0(tot)+' pasos';
    }
    state.logs=state.logs.filter(function(x){return !(x.kind==='steps'&&x.date===sd)});
    var sl={kind:'steps',module:'Ejercicio',title:'Pasos',steps:tot,date:sd,time:sd===T()?nowHM():'21:00'};if(wmin)sl.walkMin=wmin;
    addLog(sl);done(msg+(sd===T()?'':' · '+whenLabel(sd)));return true;
  }
  if(id==='water-form'){
    var ml=Math.round(parseFloat(String(f.ml||'').replace(',','.'))),wd=f.ldate||T();
    if(!(ml>0&&ml<=5000)){toast('Escribe los ml (hasta 5.000)');return true}
    if(wd>T()){toast('Elige una fecha de hoy o anterior');return true}
    addLog({kind:'water',module:'Alimentación',title:'Agua',ml:ml,date:wd,time:wd===T()?nowHM():'12:00'});
    done('+'+n0(ml)+' ml · llevas '+n0(water(wd))+' ml'+(wd===T()?'':' · '+whenLabel(wd)));return true;
  }
  return true;
}
document.addEventListener('input',function(e){
  var t=e.target;if(!t||!t.id||!ui.sheet)return;
  if(t.id==='f-fq'){ui.form.fq=t.value;var r=$('fres');if(r)r.innerHTML=foodResults(t.value,ui.sheet==='meal');return}
  if(t.hasAttribute('data-bi')){var it=(ui.form.items||[])[+t.getAttribute('data-bi')];if(!it)return;it.q=t.value.replace(',','.');var m=$('bk'+t.getAttribute('data-bi'));if(m)m.innerHTML=bkMeta(it);var bt=$('btot');if(bt)bt.innerHTML=totTxt(sumVals(ui.form.items));return}
  if(t.id==='h-smin'&&ui.sheet==='steps'){ui.form.smin=t.value;var se=$('stest');if(se)se.innerHTML=stEst();return}
  if(t.id==='h-min'&&ui.sheet==='workout'){ui.form.min=t.value;ui.form.minTyped=true;var we=$('wkest');if(we)we.innerHTML=wkEst()}
});
document.addEventListener('change',function(e){
  var t=e.target;if(!t||!t.hasAttribute||!t.hasAttribute('data-bu'))return;
  var it=(ui.form.items||[])[+t.getAttribute('data-bu')],fd=it&&foodById(it.fid);if(!fd||it.u===t.value)return;
  var q=qn(it.q);it.q=t.value==='g'?Math.round(q*fd.pg):(Math.round(q/fd.pg*100)/100||1);it.u=t.value;rerender();
});

/* ---------- Cuerpo · Progreso (peso, medidas, fuerza, fotos y resumen semanal) ----------
   body.wh: [{date,kg}] peso por día (uno por fecha). prof.kg se mantiene igual al último peso.
   body.meas: [{id,date,v:{cintura,abdomen,cadera,muslo,brazo,grasa}}] en cm (grasa en %).
   body.lifts: [{id,n}] ejercicios de fuerza a seguir. Registros en logs kind 'lift' {lift,kg,reps,sets}.
   body.photos: [{id,date,files:[{id,name,type,size}],note}] archivos en el almacén del artefacto.
   Fuerza: 1RM estimado con la fórmula de Epley = kg × (1 + reps/30). */
var MEAS=[['cintura','Cintura','cm'],['abdomen','Abdomen','cm'],['cadera','Cadera','cm'],['muslo','Muslo','cm'],['brazo','Brazo','cm'],['grasa','Grasa corporal','%']];
function normProg(b){['meas','photos'].forEach(function(k){if(!Array.isArray(b[k]))b[k]=[]});if(!Array.isArray(b.lifts))b.lifts=[{id:'hip',n:'Hip thrust'},{id:'rdl',n:'Peso muerto rumano'},{id:'bulg',n:'Sentadilla búlgara'}];return b}
function WH(){return BD().wh.slice().sort(function(a,c){return a.date<c.date?-1:1})}
function addWeight(d,kg){var wh=BD().wh.filter(function(x){return x.date!==d});wh.push({date:d,kg:rd(kg)});wh.sort(function(a,c){return a.date<c.date?-1:1});BD().wh=wh;PF().kg=wh[wh.length-1].kg}
function avgW(endD,days){var from=plusDays(endD,-(days-1)),l=BD().wh.filter(function(x){return x.date>=from&&x.date<=endD});return l.length?rd(l.reduce(function(s,x){return s+x.kg},0)/l.length):null}
function kgTxt(x){return x==null?'—':dc(x)}
function dTxt(x,u){if(x==null||isNaN(x))return '';x=rd(x);return (x>0?'+':x<0?'−':'±')+dc(Math.abs(x))+' '+u}
function e1rm(kg,reps){return rd(kg*(1+reps/30))}
function liftLogs(id){return state.logs.filter(function(l){return l.kind==='lift'&&l.lift===id}).sort(function(a,c){return (a.date+a.time)<(c.date+c.time)?-1:1})}
function liftName(id){var l=BD().lifts.filter(function(x){return x.id===id})[0];return l?l.n:'Ejercicio de fuerza'}
function nearest(list,d,get){var best=null,bd=1e9;list.forEach(function(x){var v=get(x);if(v==null)return;var dd=Math.abs(daysBetween(x.date,d));if(dd<bd){bd=dd;best={v:v,date:x.date,dd:dd}}});return best&&best.dd<=10?best:null}

/* Gráfico de peso: puntos diarios tenues y línea del promedio de 7 días. Un solo eje. */
function weightChart(){
  var all=WH(),from=plusDays(T(),-89),pts=all.filter(function(x){return x.date>=from});
  if(pts.length<2)return '';
  var W=340,Hh=160,L=36,R=10,Tp=10,B=24,tm=function(d){return new Date(d+'T12:00').getTime()};
  var avg=pts.map(function(p){return {date:p.date,v:avgW(p.date,7)}});
  var vs=pts.map(function(p){return p.kg}).concat(avg.map(function(p){return p.v}));
  var mn=Math.floor(Math.min.apply(null,vs)*2)/2-.5,mx=Math.ceil(Math.max.apply(null,vs)*2)/2+.5;
  var t0=tm(pts[0].date),t1=tm(pts[pts.length-1].date);
  var X=function(d){return t1===t0?(L+W-R)/2:L+(tm(d)-t0)/(t1-t0)*(W-L-R)},Y=function(v){return Tp+(mx-v)/(mx-mn)*(Hh-Tp-B)};
  var step=(mx-mn)>6?2:(mx-mn)>3?1:.5,s='<svg class="wch" viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="Peso de los últimos 90 días: puntos por día y línea del promedio de 7 días">';
  for(var v=Math.ceil(mn/step)*step;v<=mx+1e-9;v+=step){var y=Y(v).toFixed(1);s+='<line class="gl" x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'"></line><text class="ax" x="'+(L-6)+'" y="'+y+'" dy="0.32em" text-anchor="end">'+dc(rd(v))+'</text>'}
  s+='<text class="ax" x="'+L+'" y="'+(Hh-6)+'">'+dshort(pts[0].date)+'</text><text class="ax" x="'+(W-R)+'" y="'+(Hh-6)+'" text-anchor="end">'+dshort(pts[pts.length-1].date)+'</text>';
  pts.forEach(function(p){s+='<circle class="wd" cx="'+X(p.date).toFixed(1)+'" cy="'+Y(p.kg).toFixed(1)+'" r="3"></circle>'});
  s+='<path class="wl" d="'+avg.map(function(p,i){return (i?'L':'M')+X(p.date).toFixed(1)+' '+Y(p.v).toFixed(1)}).join(' ')+'"></path>';
  var la=avg[avg.length-1];s+='<circle class="we" cx="'+X(la.date).toFixed(1)+'" cy="'+Y(la.v).toFixed(1)+'" r="5"></circle>';
  s+='<line class="wx" id="wx" x1="0" x2="0" y1="'+Tp+'" y2="'+(Hh-B)+'" visibility="hidden"></line></svg>';
  var data=pts.map(function(p,i){return [p.date,p.kg,avg[i].v,+X(p.date).toFixed(1)]});
  return '<div class="wbox" data-w="'+W+'" data-pts="'+esc(JSON.stringify(data))+'">'+s+'<div class="wtip" id="wtip" hidden></div></div>'+
    '<div class="legend"><span><i class="lg-dot"></i>Peso del día</span><span><i class="lg-line"></i>Promedio de 7 días</span></div>';
}
function weekStats(end){
  var days=[];for(var i=0;i<7;i++)days.push(plusDays(end,-i));
  var fd=[],ex=0,fu=0,fuDays={};
  days.forEach(function(d){var b=dayBal(d);if(b.eat>0)fd.push(b);
    logsOn(d,'workout').forEach(function(l){ex++;var e=exById(l.exId);if(e&&e.ben.indexOf('Fuerza')>-1)fuDays[d]=1});
    if(logsOn(d,'lift').length)fuDays[d]=1});
  fu=Object.keys(fuDays).length;
  var ok=fd.filter(function(b){return b.ok}),hit=ok.filter(function(b){return b.fo.p>=targets(b.goal).p}).length;
  return {n:fd.length,eat:fd.length?Math.round(fd.reduce(function(s,b){return s+b.eat},0)/fd.length):null,bal:ok.length?Math.round(ok.reduce(function(s,b){return s+b.bal},0)/ok.length):null,hit:hit,nok:ok.length,ex:ex,fu:fu,w:avgW(end,7)};
}
function weekNotes(a,p){
  var o=[];
  if(!a.n)return ['Anota tus comidas unos días para ver cómo va tu semana.'];
  var dw=a.w!=null&&p.w!=null?rd(a.w-p.w):null;
  if(a.n<3)o.push('Llevas '+a.n+(a.n===1?' día':' días')+' con comidas anotadas esta semana. Con 3 o más el resumen es más confiable.');
  else if(a.bal!=null){
    if(a.bal<-150&&dw!=null&&dw<=0)o.push('Vas en línea con tu objetivo: comiste en déficit y tu peso promedio bajó '+dc(Math.abs(dw))+' kg.');
    else if(a.bal<-150&&dw!=null&&dw>0)o.push('Comiste en déficit pero tu peso promedio subió '+dc(dw)+' kg. Suele ser líquido (ciclo, sal, entrenamiento nuevo). Mira la tendencia de 2 a 3 semanas y tus medidas.');
    else if(a.bal<-150)o.push('Comiste en déficit. Pésate 2 o 3 veces por semana para ver el efecto en tu promedio.');
    else o.push('Esta semana quedaste cerca del equilibrio o sobre él. Para bajar grasa, apunta a tu meta diaria.');
  }
  if(a.n>=3&&a.nok&&a.hit<Math.ceil(a.nok/2))o.push('Llegaste a tu proteína '+a.hit+' de '+a.nok+(a.nok===1?' día.':' días.')+' Es lo que más ayuda a conservar músculo mientras bajas de peso.');
  if(a.fu<2)o.push('Para cambiar tu composición corporal ayudan 2 o más sesiones de fuerza por semana. Llevas '+a.fu+'.');
  var ci=typeof cycleNow==='function'?cycleNow():null;
  if(ci){var ph=phaseOf(ci.day);if(ph==='lut'||ph==='men')o.push('Estás en fase '+(ph==='lut'?'lútea':'menstrual')+': es común retener líquido y ver el peso más alto unos días.')}
  return o;
}
function viewProgreso(){
  var t=T(),o='',wh=WH(),last=wh[wh.length-1],wNow=avgW(t,7),w4=avgW(plusDays(t,-28),7),first=wh[0];
  // Peso
  o+='<div class="glass bal"><div class="sh"><p class="label">Peso · promedio de 7 días</p><button class="link" type="button" data-act="pnew" data-v="weight">Anotar peso</button></div>';
  if(last){
    o+='<div><p class="bign">'+kgTxt(wNow!=null?wNow:last.kg)+' <small>kg</small></p><p class="muted">'+
      [w4!=null&&wNow!=null?dTxt(wNow-w4,'kg')+' en 4 semanas':'',first&&first.date!==last.date?dTxt(last.kg-first.kg,'kg')+' desde '+dshort(first.date):'','último: '+kgTxt(last.kg)+' kg el '+dshort(last.date)].filter(Boolean).join(' · ')+'</p></div>';
    o+=weightChart();
  } else o+='<p class="muted">Pésate en la mañana, en ayunas y después de ir al baño, 2 o 3 veces por semana. Aquí verás el promedio, que es más confiable que el número de cada día.</p>';
  o+='</div>';
  // Resumen semanal
  var a=weekStats(plusDays(t,-1)),p=weekStats(plusDays(t,-8)),dw=a.w!=null&&p.w!=null?a.w-p.w:null;
  o+='<section><div class="sh"><h2>Resumen <em>semanal</em></h2><span class="meta">últimos 7 días completos</span></div><div class="glass" style="padding:6px 16px">'+
    eqRow('Comiste en promedio',a.eat!=null?n0(a.eat)+' kcal':'—',a.n?a.n+(a.n===1?' día anotado':' días anotados'):'Sin comidas anotadas')+
    eqRow('Balance promedio',a.bal!=null?sgn(a.bal)+' kcal':'—',a.bal!=null?balWord(a.bal):'Faltan datos')+
    eqRow('Proteína cumplida',a.nok?a.hit+' de '+a.nok+' días':'—','')+
    eqRow('Entrenamientos',String(a.ex),a.fu+(a.fu===1?' día con fuerza':' días con fuerza'))+
    eqRow('Peso promedio',a.w!=null?kgTxt(a.w)+' kg':'—',dw!=null?dTxt(dw,'kg')+' vs semana anterior':'')+
    '</div>'+weekNotes(a,p).map(function(x){return '<p class="wn">'+esc(x)+'</p>'}).join('')+'</section>';
  // Medidas
  var ms=BD().meas.slice().sort(function(x,y){return x.date<y.date?-1:1});
  o+='<section><div class="sh"><h2>Medidas</h2><button class="link" type="button" data-act="pnew" data-v="meas">Anotar medidas</button></div>';
  if(!ms.length)o+='<div class="empty">Mide cada 2 semanas, en la mañana y siempre en el mismo lugar del cuerpo. En la recomposición, la cintura suele bajar antes que el peso.</div>';
  else{
    MEAS.forEach(function(m){
      var pts=ms.filter(function(x){return x.v&&typeof x.v[m[0]]==='number'}).map(function(x){return {date:x.date,v:x.v[m[0]],lo:null,hi:null}});
      if(!pts.length)return;var lv=pts[pts.length-1],fv=pts[0],pv=pts.length>1?pts[pts.length-2]:null;
      o+='<div class="row"><div class="grow"><div class="ttl">'+m[1]+'</div><div class="meta">'+(pv?dTxt(lv.v-pv.v,m[2])+' vs anterior':'Primera medición')+(pts.length>2?' · '+dTxt(lv.v-fv.v,m[2])+' desde '+dshort(fv.date):'')+'</div></div>'+sparkline(pts,72,30)+'<span class="vv"><b>'+dc(lv.v)+' <small>'+m[2]+'</small></b><small>'+dshort(lv.date)+'</small></span></div>';
    });
    o+='<details class="fin"><summary>Historial de mediciones ('+ms.length+')</summary>'+ms.slice().reverse().map(function(x){return '<div class="row"><div class="grow"><div class="ttl">'+dshort(x.date)+' '+x.date.slice(0,4)+'</div><div class="meta">'+MEAS.filter(function(m){return x.v&&typeof x.v[m[0]]==='number'}).map(function(m){return m[1]+' '+dc(x.v[m[0]])+(m[2]==='%'?' %':'')}).join(' · ')+'</div></div>'+delBtn(x.id,'meas')+'</div>'}).join('')+'</details>';
  }
  o+='</section>';
  // Fuerza
  o+='<section><div class="sh"><h2>Fuerza</h2><button class="link" type="button" data-act="pnew" data-v="lift">Anotar carga</button></div>';
  BD().lifts.forEach(function(lf){
    var ls=liftLogs(lf.id),lst=ls[ls.length-1];
    if(!lst){o+='<div class="row"><div class="grow"><div class="ttl">'+esc(lf.n)+'</div><div class="meta">Sin cargas anotadas</div></div><button class="btn sm line" type="button" data-act="pnew" data-v="lift" data-id="'+lf.id+'">Anotar</button></div>';return}
    var pts=ls.map(function(l){return {date:l.date,v:e1rm(l.kg,l.reps),lo:null,hi:null}}),best=Math.max.apply(null,pts.map(function(x){return x.v}));
    var old=pts.filter(function(x){return x.date<=plusDays(T(),-28)}).pop(),cur=pts[pts.length-1].v;
    o+='<div class="row"><button class="rowbtn" type="button" data-act="pnew" data-v="lift" data-id="'+lf.id+'"><div class="ttl">'+esc(lf.n)+'</div><div class="meta">'+dc(lst.kg)+' kg × '+lst.reps+(lst.sets?' · '+lst.sets+' series':'')+' · '+dshort(lst.date)+(old?' · '+dTxt(cur-old.v,'kg')+' en 4 semanas':'')+'</div></button>'+sparkline(pts,72,30)+'<span class="vv"><b>'+dc(cur)+' <small>kg</small></b><small>'+(cur>=best?'tu mejor marca':'mejor '+dc(best))+'</small></span></div>';
  });
  o+='<button class="link" type="button" data-act="pnew" data-v="liftnew" style="align-self:flex-start">+ Seguir otro ejercicio de fuerza</button><p class="disc">El número grande es tu fuerza estimada (1RM con la fórmula de Epley). Si sube mientras bajas de peso, estás conservando o ganando músculo.</p></section>';
  // Fotos
  var ph=BD().photos.slice().sort(function(x,y){return x.date<y.date?1:-1});
  o+='<section><div class="sh"><h2>Fotos de <em>progreso</em></h2><button class="link" type="button" data-act="pnew" data-v="photo">Agregar fotos</button></div>';
  if(!ph.length)o+='<div class="empty">Sácate fotos de frente, perfil y espalda cada 4 semanas, con la misma luz y ropa. Quedan guardadas solo en tu cuenta.</div>';
  else{
    if(ph.length>1)o+='<button class="btn line sm" type="button" data-act="pnew" data-v="pcomp" style="align-self:flex-start">Comparar dos fechas</button>';
    ph.forEach(function(x){var w=nearest(BD().wh,x.date,function(y){return y.kg});o+='<div class="phset"><div class="sh"><p class="ttl">'+dshort(x.date)+' '+x.date.slice(0,4)+(w?' <span class="meta">· '+kgTxt(w.v)+' kg</span>':'')+'</p>'+delBtn(x.id,'photo')+'</div>'+(x.note?'<p class="meta">'+esc(x.note)+'</p>':'')+fileChips(x.files)+'</div>'});
  }
  o+='</section>';
  // Mis datos
  o+='<section id="datos"><div class="sh"><h2>Mis datos y <em>metas</em></h2></div>'+viewDatos()+'</section>';
  return o;
}

/* Hojas de Progreso */
CS.weight=function(){var f=ui.form;return cHead('Anotar <em>peso</em>','En la mañana, en ayunas, es más comparable.')+'<form id="weight-form" class="field" style="gap:12px"><div class="two">'+fIn('kg','Peso (kg)','type="text" inputmode="decimal" required placeholder="'+esc(kgTxt(PF().kg||''))+'"')+ldField()+'</div><div class="btns"><button class="btn acc" type="submit">Guardar</button></div></form>'};
CS.meas=function(){
  var ms=BD().meas.slice().sort(function(x,y){return x.date<y.date?-1:1}),lv=ms.length?ms[ms.length-1].v:{};
  var inp=function(m){return '<label><span>'+m[1]+' ('+m[2]+')</span><input id="h-m_'+m[0]+'" data-f="m_'+m[0]+'" type="text" inputmode="decimal" autocomplete="off" placeholder="'+(lv&&lv[m[0]]!=null?dc(lv[m[0]]):'')+'" value="'+esc(FV('m_'+m[0]))+'"></label>'};
  return cHead('Anotar <em>medidas</em>','Con cinta métrica, sin apretar. Deja vacío lo que no midas.')+'<form id="meas-form" class="field" style="gap:12px"><div class="ig">'+MEAS.map(inp).join('')+'</div><p class="meta">Cintura: la parte más angosta. Abdomen: a la altura del ombligo. Muslo y brazo: el punto más ancho, siempre del mismo lado. Grasa corporal solo si tienes balanza o examen que la mida.</p>'+ldField()+'<div class="btns"><button class="btn acc" type="submit">Guardar</button></div></form>';
};
CS.lift=function(){
  var f=ui.form,ls=BD().lifts;if(!f.lift&&ls.length)f.lift=ls[0].id;
  var lst=liftLogs(f.lift).pop();
  return cHead('Anotar <em>carga</em>',lst?'La última vez: '+dc(lst.kg)+' kg × '+lst.reps+' el '+dshort(lst.date)+'.':'Anota la serie más pesada que hiciste.')+
    '<form id="lift-form" class="field" style="gap:12px">'+fSel('lift','Ejercicio',ls.map(function(x){return [x.id,x.n]})).replace('<select ','<select data-rer="1" ')+
    '<div class="three">'+['kg','reps','sets'].map(function(k,i){return '<div class="field"><label class="label" for="h-'+k+'">'+['Kg','Repeticiones','Series'][i]+'</label><input id="h-'+k+'" data-f="'+k+'" type="text" inputmode="decimal" autocomplete="off" value="'+esc(FV(k))+'"'+(k!=='sets'?' required':'')+'></div>'}).join('')+'</div>'+
    ldField()+'<div class="btns"><button class="btn acc" type="submit">Guardar</button></div></form>';
};
CS.liftnew=function(){return cHead('Seguir un ejercicio <em>de fuerza</em>','Aparece en Progreso con su evolución.')+'<form id="liftnew-form" class="field" style="gap:12px">'+fIn('n','Nombre','type="text" required maxlength="50" placeholder="Ej: Remo con mancuerna"')+'<div class="btns"><button class="btn acc" type="submit">Guardar</button></div></form>'};
CS.photo=function(){return cHead('Fotos de <em>progreso</em>','Frente, perfil y espalda. Solo tú puedes verlas.')+'<form id="photo-form" class="field" style="gap:12px">'+filesZone('ph','Fotos','Puedes subir varias a la vez.')+ldField()+fIn('note','Nota (opcional)','type="text" maxlength="80" placeholder="Ej: misma luz del baño, 8:00"')+'<div class="btns"><button class="btn acc" type="submit">Guardar</button></div></form>'};
CS.pcomp=function(){
  var ph=BD().photos.slice().sort(function(x,y){return x.date<y.date?-1:1}),f=ui.form;
  if(ph.length<2)return cHead('Comparar','')+'<p class="muted">Necesitas fotos de al menos dos fechas.</p>';
  if(!f.pa)f.pa=ph[0].id;if(!f.pb)f.pb=ph[ph.length-1].id;
  var A=ph.filter(function(x){return x.id===f.pa})[0]||ph[0],Bp=ph.filter(function(x){return x.id===f.pb})[0]||ph[ph.length-1],opts=ph.map(function(x){return [x.id,dshort(x.date)+' '+x.date.slice(0,4)]});
  var col=function(x){var w=nearest(BD().wh,x.date,function(y){return y.kg}),c=nearest(BD().meas,x.date,function(y){return y.v&&y.v.cintura});
    return '<div class="pcol"><p class="ttl">'+dshort(x.date)+'</p><p class="meta">'+[w?kgTxt(w.v)+' kg':'',c?'cintura '+dc(c.v)+' cm':''].filter(Boolean).join(' · ')+'</p>'+x.files.filter(function(z){return isImg(z.type)}).map(function(z){return '<button type="button" class="pimg" data-act="fopen" data-id="'+esc(z.id)+'" data-n="'+esc(z.name)+'" data-ty="'+esc(z.type)+'"><img src="'+fileUrl(z.id)+'" alt="Foto del '+dshort(x.date)+'"></button>'}).join('')+'</div>'};
  return cHead('Comparar <em>fotos</em>','')+'<div class="two">'+fSel('pa','Antes',opts).replace('<select ','<select data-rer="1" ')+fSel('pb','Después',opts).replace('<select ','<select data-rer="1" ')+'</div><div class="pcomp">'+col(A)+col(Bp)+'</div>';
};
function numIn(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isNaN(n)?null:n}
function progresoSubmit(fm){
  snap();var f=ui.form,id=fm.id,ld=f.ldate||T();
  if(ld>T()){toast('Elige una fecha de hoy o anterior');return true}
  if(id==='weight-form'){var kg=numIn(f.kg);if(!(kg>=30&&kg<=250)){toast('Escribe tu peso en kg, por ejemplo 63,4');return true}addWeight(ld,kg);done(kgTxt(rd(kg))+' kg'+(ld===T()?'':' · '+whenLabel(ld)));return true}
  if(id==='meas-form'){var v={},n=0;MEAS.forEach(function(m){var x=numIn(f['m_'+m[0]]);if(x!=null&&x>0){v[m[0]]=rd(x);n++}});if(!n){toast('Anota al menos una medida');return true}
    var ms=BD().meas.filter(function(x){return x.date!==ld});ms.push({id:uid(),date:ld,v:v});BD().meas=ms;done('Medidas guardadas');return true}
  if(id==='lift-form'){var k=numIn(f.kg),r=parseInt(f.reps,10),st=parseInt(f.sets,10)||0;if(!(k>0)||!(r>0)){toast('Escribe los kilos y las repeticiones');return true}
    addLog({kind:'lift',module:'Ejercicio',lift:f.lift,title:liftName(f.lift),kg:rd(k),reps:r,sets:st,date:ld,time:ld===T()?nowHM():'19:00'});done(liftName(f.lift)+' · '+dc(rd(k))+' kg × '+r);return true}
  if(id==='liftnew-form'){var nm=(f.n||'').trim();if(!nm){toast('Ponle un nombre');return true}BD().lifts.push({id:'u-'+uid(),n:nm});done('Lo agregué a Fuerza');return true}
  if(id==='photo-form'){if(pendingUp()){toast('Espera a que terminen de subir las fotos');return true}var fl=savedFiles('ph');if(!fl.length){toast('Agrega al menos una foto');return true}
    BD().photos.push({id:uid(),date:ld,files:fl,note:(f.note||'').trim()});if(ui.fctx)ui.fctx.saved=true;done('Fotos guardadas');return true}
  return true;
}
function progresoClick(a,b,id){
  var v=b.getAttribute('data-v');
  if(a==='pnew'){
    ui.ret=null;
    if(v==='photo'){if(!FILES.assets){toast('Subir fotos no está disponible en esta vista.');return true}cleanupCtx();ui.fctx=newCtx([],'ph')}
    var f={direct:true,ldate:T()};
    if(v==='lift'){f.lift=id||(BD().lifts[0]||{}).id;var ll=liftLogs(f.lift).pop();if(ll){f.kg=dc(ll.kg);f.reps=String(ll.reps);f.sets=ll.sets?String(ll.sets):''}else f.sets='3'}
    goSheet(v,f);return true;
  }
  if(a==='delok'){
    var k=b.getAttribute('data-k');
    if(k==='wh'){var wd=String(id).slice(2);BD().wh=BD().wh.filter(function(x){return x.date!==wd});var wl=WH();if(wl.length)PF().kg=wl[wl.length-1].kg;ui.pend=null;save();render();return true}
    if(k==='meas'){BD().meas=BD().meas.filter(function(x){return x.id!==id});ui.pend=null;save();render();return true}
    if(k==='photo'){var pp=BD().photos.filter(function(x){return x.id===id})[0];if(pp)deleteFilesOf(pp.files);BD().photos=BD().photos.filter(function(x){return x.id!==id});ui.pend=null;save();render();toast('Fotos borradas');return true}
  }
  return false;
}
// Información al tocar o pasar sobre el gráfico de peso
function wTip(e){
  var box=e.target.closest&&e.target.closest('.wbox');if(!box)return;
  var data;try{data=JSON.parse(box.getAttribute('data-pts'))}catch(err){return}
  var svg=box.querySelector('svg'),r=svg.getBoundingClientRect(),W=+box.getAttribute('data-w'),x=(e.clientX-r.left)/r.width*W,best=data[0];
  data.forEach(function(d){if(Math.abs(d[3]-x)<Math.abs(best[3]-x))best=d});
  var ln=$('wx'),tp=$('wtip');if(!ln||!tp)return;
  ln.setAttribute('x1',best[3]);ln.setAttribute('x2',best[3]);ln.setAttribute('visibility','visible');
  tp.hidden=false;tp.innerHTML='<b>'+dshort(best[0])+'</b><span>Peso '+kgTxt(best[1])+' kg</span><span>Promedio '+kgTxt(best[2])+' kg</span>';
  var px=best[3]/W*r.width;tp.style.left=Math.max(4,Math.min(r.width-tp.offsetWidth-4,px-tp.offsetWidth/2))+'px';
}
document.addEventListener('pointermove',wTip);
document.addEventListener('pointerdown',wTip);
document.addEventListener('pointerleave',function(e){if(e.target&&e.target.classList&&e.target.classList.contains('wbox')){var tp=$('wtip'),ln=$('wx');if(tp)tp.hidden=true;if(ln)ln.setAttribute('visibility','hidden')}},true);
function render(){
  var v=ui.view,nav=document.querySelector('nav.tabs');
  if(needLogin()){$('app').innerHTML=loginView();if(nav)nav.hidden=true;ui.sheet=null;renderSheet();return}
  if(nav)nav.hidden=false;
  $('app').innerHTML=v==='salud'?viewSalud():v==='cuerpo'?viewCuerpo():v==='fin'?viewFin():v==='mas'?viewMas():viewDia();
  if(v==='salud'||v==='cuerpo'||v==='fin'){var sg=document.querySelector('.seg [aria-pressed="true"]');if(sg){var pp=sg.parentNode;pp.scrollLeft+=sg.getBoundingClientRect().left-pp.getBoundingClientRect().left-24}}
  ['dia','salud','cuerpo','fin'].forEach(function(k){var b=$('tab-'+k); if(!b)return; if(k===v) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current')});
  renderSheet();
}

