/* Aura · js/mi-dia.js
   Hábitos automáticos, avisos del banco, resumen del día, calendario del mes, hojas de Mi día y vistas principales.
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */
/* ---------- Hábitos automáticos (rastreadores) ----------
   money: el día cuenta si hay un gasto o ingreso anotado, o si se marcó «Hoy no tuve gastos» (org.nospend).
   steps: el día cuenta si los pasos llegan a la meta (org.stepGoal). Hoy se anotan a mano; luego los llenará el atajo del iPhone.
   bm: deposiciones (log kind:'bm', con tipo de Bristol opcional). No es un hábito: muestra cuántas hoy y la última. */
function setOf(fn){var s={};state.logs.forEach(function(l){if(fn(l))s[l.date]=1});return s}
function runStreak(ok){var d=new Date(),n=0;if(!ok(ymd(d)))d=addDays(d,-1);while(n<3650&&ok(ymd(d))){n++;d=addDays(d,-1)}return n}
function moneyOk(ds,set){if(OG().nospend.indexOf(ds)>-1)return true;if(set)return !!set[ds];return state.logs.some(function(l){return l.kind==='money'&&l.date===ds})}
function moneyStreak(){var s=setOf(function(l){return l.kind==='money'});return runStreak(function(d){return moneyOk(d,s)})}
function stepStreak(){var g=OG().stepGoal;return runStreak(function(d){return (stepsOn(d)||0)>=g})}
function streakTxt(n){return n?n+(n===1?' día seguido':' días seguidos'):'Sin racha aún'}
function bmOn(d){return logsOn(d,'bm').sort(function(a,b){return a.time<b.time?-1:1})}
function lastBm(){var l=state.logs.filter(function(x){return x.kind==='bm'}).sort(function(a,b){return (a.date+a.time)<(b.date+b.time)?1:-1});return l[0]||null}
var TRK=[['money','Anotar gastos'],['steps','Pasos'],['bm','Deposición']];
function trackers(){
  var o=OG(),t=T(),r=[];
  if(o.trk.money){var mn=logsOn(t,'money'),gs=mn.filter(function(l){return l.dir!=='ingreso'}),sm=gs.reduce(function(s,l){return s+l.amount},0),ns=o.nospend.indexOf(t)>-1;
    r.push({k:'money',on:mn.length>0||ns,n:'Anotar gastos',v:gs.length?clp(sm)+' · '+gs.length+(gs.length===1?' gasto':' gastos'):mn.length?'Ingreso anotado':ns?'Hoy sin gastos':'Aún nada hoy',s:streakTxt(moneyStreak())})}
  if(o.trk.steps){var sp=stepsOn(t)||0,g=o.stepGoal;r.push({k:'steps',on:sp>=g,n:'Pasos',v:n0(sp)+' de '+n0(g),pct:Math.min(100,Math.round(sp*100/g)),s:streakTxt(stepStreak())})}
  if(o.trk.bm){var b=bmOn(t),lb=lastBm();r.push({k:'bm',on:b.length>0,n:'Deposición',v:b.length?b.length+' hoy':'Ninguna hoy',s:lb?(lb.date===t?'Última '+lb.time:'Última '+inDays(lb.date)):'Sin registros',info:1})}
  return r;
}
function trkTile(x){
  return '<div class="habit trk'+(x.on?' on':'')+(x.info?' inf':'')+'"><button type="button" data-act="trk" data-v="'+x.k+'" style="all:unset;display:flex;flex-direction:column;gap:8px;cursor:pointer;width:100%" aria-label="'+esc(x.n+': '+x.v)+'"><span class="c">'+(x.info?'<b class="tn">'+bmOn(T()).length+'</b>':CHECK)+'</span><span class="n">'+x.n+'</span><span class="tv">'+esc(x.v)+'</span>'+(x.pct!=null?'<span class="bar"><span style="width:'+x.pct+'%"></span></span>':'')+'<span class="s">'+x.s+'</span></button>'+(ui.edit?'<span class="hx"><button class="x" type="button" data-act="trkhide" data-v="'+x.k+'">Ocultar</button></span>':'')+'</div>';
}
function habitsHtml(){
  var t=T(),hs=habits(),tr=trackers(),o='<section><div class="sh"><h2>Hábitos</h2><button class="link" type="button" data-act="editmode">'+(ui.edit?'Listo':'Editar')+'</button></div>';
  if(!hs.length&&!tr.length)o+='<div class="empty">Aún no tienes hábitos. Créalos desde el + en «Tarea, hábito o recordatorio».</div>';
  o+='<div class="habits">'+tr.map(trkTile).join('');
  hs.forEach(function(x){
    var on=x.log.indexOf(t)>-1,st=streak(x);
    o+='<div class="habit'+(on?' on':'')+'"><button type="button" data-act="habit" data-id="'+x.id+'" aria-pressed="'+on+'" style="all:unset;display:flex;flex-direction:column;gap:8px;cursor:pointer;width:100%"><span class="c">'+CHECK+'</span><span class="n">'+esc(x.title)+'</span><span class="s">'+streakTxt(st)+'</span></button>'+(ui.edit?'<span class="hx">'+delBtn(x.id,'item')+'</span>':'')+'</div>';
  });
  o+='</div>';
  if(ui.edit){
    var og=OG(),hid=TRK.filter(function(k){return !og.trk[k[0]]});
    o+='<div class="note" style="flex-direction:column;align-items:stretch"><div class="stat" style="align-items:center"><span>Meta de pasos</span><span class="stepper"><button type="button" data-act="sgoal" data-d="-500" aria-label="Bajar meta">−</button><b>'+n0(og.stepGoal)+'</b><button type="button" data-act="sgoal" data-d="500" aria-label="Subir meta">+</button></span></div>'+
      (hid.length?'<div class="chips">'+hid.map(function(k){return '<button class="chip" type="button" data-act="trkshow" data-v="'+k[0]+'">Mostrar '+k[1].toLowerCase()+'</button>'}).join('')+'</div>':'')+'</div>';
  }
  return o+'</section>';
}

/* ---------- Avisos del banco: texto pegado → gastos ----------
   Misma lógica que usará la automatización de correos en la etapa GitHub (Apps Script o Edge Function):
   busca montos ($12.990), comercio («en FARMACIA X», «Comercio: X»), fecha (dd/mm/aaaa o dd-mm-aa) y hora (hh:mm).
   Cada aviso queda como log money con src:'aviso' (luego 'correo' + ext con el id del mensaje para no duplicar). */
function catOf(s){
  s=fold(s);
  if(/farmac|cruz verde|salcobrand|ahumada|medic|doctor|vitamina|examen|clinica|dentist|remedio|isapre|fonasa|laboratorio/.test(s))return 'Salud';
  if(/veterinari|mascota|superzoo|club de perros|petco|perro|gato/.test(s))return 'Mascotas';
  if(/netflix|spotify|disney|hbo|youtube premium|icloud|apple\.com|google one|google storage|storytel|crunchyroll|classpass|suscrip|prime video|amazon prime|chatgpt|claude\.ai/.test(s))return 'Suscripciones';
  if(/super|jumbo|lider|unimarc|tottus|santa isabel|acuenta|feria|almac|oxxo|ok market/.test(s))return 'Supermercado';
  if(/uber|metro|bencina|copec|shell|petrobras|aramco|bip|scooter|taxi|micro|cabify|didi|autopista|tag|estacionam|lime|whoosh/.test(s))return 'Transporte';
  if(/peluquer|kerastase|crema|matiz|maquill|serum|shampoo|unas|sephora|preunic|falabella beauty|dbs/.test(s))return 'Belleza';
  if(/arriendo|luz|enel|gas |metrogas|lipigas|abastible|aguas andinas|agua potable|internet|vtr|movistar|entel|wom|claro|hogar|casa|sodimac|easy|ikea/.test(s))return 'Hogar';
  if(/curso|libro|universidad|estudio|matricula|udemy|coursera/.test(s))return 'Estudio';
  if(/cine|restaur|bar |salida|concierto|netflix|spotify|disney|hbo|max |youtube|rappi|pedidos ?ya|uber eats|starbucks|cafe|sushi|pizza|ticket|puntoticket/.test(s))return 'Ocio';
  if(/pago tarjeta|pago tc|pago de tarjeta/.test(s))return 'Deudas';
  return 'Otros';
}
function parseBank(txt){
  var src=String(txt||'').replace(/\r/g,''),out=[],re=/(?:\$|clp\s?)\s?(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,\d{1,2})?/gi,m,used=[];
  while((m=re.exec(src))){
    var amt=parseInt(m[1].replace(/[.\s]/g,''),10);if(!(amt>0&&amt<100000000))continue;
    var from=Math.max(0,m.index-220),to=Math.min(src.length,m.index+m[0].length+220);
    // corta la ventana en el monto anterior y el siguiente para no mezclar avisos
    var prev=src.lastIndexOf('$',m.index-1),next=src.indexOf('$',m.index+m[0].length);
    if(prev>=from)from=prev+1;if(next>-1&&next<to)to=next;
    var win=src.slice(from,to),after=src.slice(m.index+m[0].length,to),fw=fold(win);
    if(/cupo|saldo|monto minimo|pago minimo|disponible/.test(fold(src.slice(Math.max(prev+1,m.index-40),m.index))))continue;
    var cm=after.match(/\b(?:en|comercio:?|establecimiento:?)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9*][A-Za-zÁÉÍÓÚÑáéíóúñ0-9 .*&'\/\-]{1,40}?)(?=\s+(?:el|con|a las|por|del|fecha|hora|,)\b|[.,\n]|$)/i)||win.match(/(?:comercio|establecimiento|local)\s*:?\s*([^\n,]{2,40})/i);
    var desc=cm?cap(cm[1].replace(/\s+/g,' ').trim().toLowerCase().replace(/\b\w/g,function(c){return c.toUpperCase()})):'Compra con tarjeta';
    var dm=win.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/),ds='';
    if(dm){var y=+dm[3];if(y<100)y+=2000;ds=dmy(y,+dm[2],+dm[1])}
    if(!ds){var dm2=fw.match(/\b(\d{1,2}) de ([a-z]+)(?: de (\d{4}))?/);if(dm2&&MES[dm2[2].slice(0,3)])ds=dmy(dm2[3]?+dm2[3]:+T().slice(0,4),MES[dm2[2].slice(0,3)],+dm2[1])}
    if(!ds||ds>T())ds=T();
    var hm=win.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/),tm=hm&&+hm[1]<24&&+hm[2]<60?pad(+hm[1])+':'+hm[2]:'12:00';
    var dir=/abono|transferencia recibida|deposito recibido|te transfirieron|recibiste/.test(fw)?'ingreso':'gasto';
    var key=ds+'|'+amt+'|'+fold(desc);if(used.indexOf(key)>-1)continue;used.push(key);
    var dup=state.logs.some(function(l){return l.kind==='money'&&l.date===ds&&l.amount===amt});
    out.push({amount:amt,desc:desc,date:ds,time:tm,dir:dir,cat:dir==='ingreso'?'Otros':catOf(desc+' '+win),dup:dup});
  }
  return out;
}

/* ---------- Resumen del día ----------
   Seis áreas, cada una de 0 a 1. El puntaje del día es el promedio de las que aplican.
   Agenda: listas / accionables (tareas, recordatorios, dosis, pagos). Hábitos: los hábitos propios (los rastreadores ya cuentan en Movimiento y Finanzas).
   Alimentación: cercanía a la meta de kcal (±25 % → 0) y proteína alcanzada. Movimiento: pasos/meta × 0,7 + 0,5 si hubo entrenamiento (tope 1).
   Agua: ml / meta. Finanzas: anotó gastos o marcó «sin gastos». */
var AREAS=[['ag','Agenda','--accent'],['hb','Hábitos','--salud'],['fo','Alimentación','--carb'],['mv','Movimiento','--ph-fol'],['wa','Agua','--fat'],['fi','Finanzas','--ok']];
function dayScore(ds){
  var a=agenda(ds).filter(isAct),ad=a.filter(function(o){return o.done}).length,og=OG();
  var hs=habits(),hn=hs.length,hdd=hs.filter(function(h){return h.log.indexOf(ds)>-1}).length;
  var sp=stepsOn(ds)||0,mok=moneyOk(ds);
  var b=dayBal(ds),ml=logsOn(ds,'meal'),wk=logsOn(ds,'workout'),wa=water(ds),ag=aguaGoal();
  var gs=logsOn(ds,'money').filter(function(l){return l.dir!=='ingreso'}),gsum=gs.reduce(function(s,l){return s+l.amount},0);
  var foV=0,foT='Sin comidas anotadas',tp=b.ok?targets(b.goal).p:0,pv=Math.round(b.fo.p);
  if(ml.length){
    if(b.ok&&b.goal>0&&!b.fo.unk){var cl=Math.max(0,1-Math.abs(b.goal-b.eat)/(b.goal*0.25)),pr=tp?Math.min(1,pv/tp):1;foV=(cl+pr)/2;foT=n0(b.eat)+' de '+n0(b.goal)+' kcal · proteína '+pv+' de '+tp+' g'}
    else{foV=0.6;foT=ml.length+(ml.length===1?' comida':' comidas')+(b.eat?' · '+n0(b.eat)+' kcal':'')}
  }
  var mvV=Math.min(1,Math.min(1,sp/og.stepGoal)*0.7+(wk.length?0.5:0));
  var areas={
    ag:{on:a.length>0,v:a.length?ad/a.length:0,t:a.length?ad+' de '+a.length+' listas':'Sin pendientes'},
    hb:{on:hn>0,v:hn?hdd/hn:0,t:hdd+' de '+hn+' cumplidos'},
    fo:{on:ml.length>0||b.ok,v:foV,t:foT},
    mv:{on:true,v:mvV,t:n0(sp)+' pasos'+(wk.length?' · '+wk.map(function(w){return w.title}).join(', '):'')},
    wa:{on:true,v:Math.min(1,wa/ag),t:n0(wa)+' de '+n0(ag)+' ml'},
    fi:{on:og.trk.money||gs.length>0,v:mok?1:0,t:gs.length?clp(gsum)+' en '+gs.length+(gs.length===1?' gasto':' gastos'):og.nospend.indexOf(ds)>-1?'Día sin gastos':'Gastos sin anotar'}
  };
  var on=AREAS.filter(function(x){return areas[x[0]].on}),sc=on.length?Math.round(on.reduce(function(s,x){return s+areas[x[0]].v},0)*100/on.length):0;
  return {areas:areas,score:sc,b:b,sp:sp,wk:wk,gs:gs,gsum:gsum,bm:bmOn(ds),meds:agenda(ds).filter(function(o){return o.k==='med'}),pend:agenda(ds).filter(function(o){return o.act&&!o.done&&(o.k==='task'||o.k==='reminder')})};
}
function scoreWord(s){return s>=85?'Gran día':s>=65?'Buen día':s>=40?'Día a medias':'Día liviano'}
function arcPath(cx,cy,r0,r1,a0,a1){
  function p(r,a){var t=(a-90)*Math.PI/180;return (cx+r*Math.cos(t)).toFixed(1)+' '+(cy+r*Math.sin(t)).toFixed(1)}
  return 'M'+p(r0,a0)+' L'+p(r1,a0)+' A'+r1+' '+r1+' 0 0 1 '+p(r1,a1)+' L'+p(r0,a1)+' A'+r0+' '+r0+' 0 0 0 '+p(r0,a0)+'Z';
}
function petals(ds,sc,size){
  var R0=36,R1=108,o='';
  AREAS.forEach(function(x,i){
    var ar=sc.areas[x[0]],a0=i*60+3,a1=i*60+57,r=R0+(R1-R0)*Math.max(0.04,ar.v);
    o+='<path d="'+arcPath(120,120,R0,R1,a0,a1)+'" style="fill:var('+x[2]+');fill-opacity:'+(ar.on?'.13':'.05')+(ar.on?'':';stroke:var(--line)')+'"'+(ar.on?'':' stroke-dasharray="3 3"')+'></path>';
    if(ar.on)o+='<path d="'+arcPath(120,120,R0,r,a0,a1)+'" style="fill:var('+x[2]+')"></path>';
  });
  return '<svg viewBox="0 0 240 240" width="'+size+'" height="'+size+'" role="img" aria-label="Puntaje del día '+sc.score+' de 100">'+o+
    '<circle cx="120" cy="120" r="'+(R0-4)+'" style="fill:var(--sheet)"></circle><text x="120" y="'+(size<120?131:128)+'" text-anchor="middle" style="fill:var(--ink);font-family:var(--display);font-size:'+(size<120?34:30)+'px">'+sc.score+'</text></svg>';
}
function timeStrip(ds){
  // 6:00 a 24:00. Marcas: lo anotado y lo marcado como hecho, con la hora en que pasó.
  var W=320,H=54,P=10,x=function(m){return P+(W-2*P)*(Math.min(1440,Math.max(360,m))-360)/1080},o='',marks=[];
  state.logs.forEach(function(l){if(l.date===ds&&l.time&&l.kind!=='steps')marks.push([l.time,l.module])});
  D().forEach(function(d){if(d.date===ds&&d.at)marks.push([d.at,'Salud'])});
  state.items.forEach(function(i){if(i.type!=='habit'&&i.done&&i.doneOn===ds&&i.time)marks.push([i.time,i.module])});
  [6,9,12,15,18,21,24].forEach(function(h){var xx=x(h*60).toFixed(1);o+='<line x1="'+xx+'" y1="14" x2="'+xx+'" y2="34" style="stroke:var(--line)"></line><text x="'+xx+'" y="48" text-anchor="middle" style="fill:var(--muted);font-size:10px;font-family:var(--body)">'+(h===24?'24':h)+'</text>'});
  o+='<line x1="'+P+'" y1="24" x2="'+(W-P)+'" y2="24" style="stroke:var(--line)" stroke-width="2"></line>';
  if(ds===T()){var nx=x(hmMin(nowHM())).toFixed(1);o+='<line x1="'+nx+'" y1="8" x2="'+nx+'" y2="38" style="stroke:var(--warn)" stroke-width="1.5"></line>'}
  marks.forEach(function(m){o+='<circle cx="'+x(hmMin(m[0])).toFixed(1)+'" cy="24" r="5" fill="'+(MCOL[m[1]]||'#7A7A8C')+'" fill-opacity=".85" style="stroke:var(--sheet)" stroke-width="1.5"></circle>'});
  return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block" role="img" aria-label="'+marks.length+' registros a lo largo del día">'+o+'</svg>';
}
function dayTips(ds,sc){
  var A=sc.areas,best=null,worst=null,good=[],next=[];
  AREAS.forEach(function(x){var a=A[x[0]];if(!a.on)return;if(!best||a.v>A[best[0]].v)best=x;if(!worst||a.v<A[worst[0]].v)worst=x});
  if(best&&A[best[0]].v>=0.8)good.push(best[1]+': '+A[best[0]].t+'.');
  if(sc.wk.length)good.push('Entrenaste: '+sc.wk.map(function(w){return w.title}).join(', ')+'.');
  var tk=sc.meds.filter(function(m){return m.done}).length;if(sc.meds.length&&tk===sc.meds.length)good.push('Tomaste todas tus dosis ('+tk+').');
  if(A.fi.v===1&&sc.gs.length)good.push('Anotaste tus '+sc.gs.length+(sc.gs.length===1?' gasto':' gastos')+'.');
  var og=OG();
  if(!A.fi.v&&og.trk.money)next.push('Anota los gastos del día o marca «Hoy no tuve gastos» para no perder la racha.');
  if(A.wa.v<0.6)next.push('Agua: quedaste en '+A.wa.t+'. Deja la botella a la vista desde temprano.');
  if(sc.sp<og.stepGoal*0.6)next.push('Pasos: '+n0(sc.sp)+'. Una caminata de 20 minutos suma unos 2.000.');
  if(A.fo.on&&!logsOn(ds,'meal').length)next.push('No hay comidas anotadas. Con «lo de siempre» se anotan en un toque.');
  else if(sc.b.ok&&logsOn(ds,'meal').length&&Math.round(sc.b.fo.p)<targets(sc.b.goal).p*0.8)next.push('Proteína baja ('+Math.round(sc.b.fo.p)+' de '+targets(sc.b.goal).p+' g). Suma una porción en la once o la cena.');
  if(sc.pend.length)next.push(sc.pend.length+(sc.pend.length===1?' pendiente quedó':' pendientes quedaron')+' sin hacer.');
  return {good:good.slice(0,3),next:next.slice(0,3)};
}
function closingCard(){
  var t=T(),h=new Date().getHours();if(h<19)return '';
  var sc=dayScore(t);
  return '<button class="glass closing" type="button" data-act="dsum" data-v="'+t+'"><span class="cpet">'+petals(t,sc,96)+'</span><span class="grow"><span class="label">Cierre del día</span><span class="serif" style="display:block;font-size:1.4rem;line-height:1.15">'+scoreWord(sc.score)+'</span><span class="meta">Mira cómo estuvo cada área y qué dejar listo para mañana.</span></span></button>';
}
/* ---------- Calendario del mes (hoja «mes») ----------
   Se abre tocando la fecha de arriba (en cualquier vista) o con «Mes» en el Organizador. ui.form = {m:'AAAA-MM', sel:'AAAA-MM-DD'}.
   Cada día muestra puntitos: un color por calendario conectado (CAL.ev), Aura (tareas, recordatorios, eventos, controles, exámenes, pagos)
   y Entrenamiento (registros workout o eventos que calMod clasifica como Ejercicio). Los días pasados con registros llevan un anillo
   con el puntaje del día (dayScore). Al tocar un día: su lista, «Ver ese día» (Organizador) y «+ Agregar». */
var MPAL=['#4F86C6','#C2507F','#2F7F86','#D9822B','#7A9A3A','#8A6BD1','#B0668F','#5F7A99'],MAURA='#5A48C8',MWK='#E0A23B';
var MESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function monthAdd(m,n){var y=+m.slice(0,4),mo=+m.slice(5,7)-1+n;y+=Math.floor(mo/12);mo=((mo%12)+12)%12;return y+'-'+pad(mo+1)}
function calNames(){var seen=[];(CAL.cals||[]).forEach(function(c){if(c&&c.ok&&c.name&&seen.indexOf(c.name)<0)seen.push(c.name)});CAL.ev.forEach(function(e){var n=e.cal||'Calendario';if(seen.indexOf(n)<0)seen.push(n)});return seen}
function calColor(n){var l=calNames(),i=l.indexOf(n||'Calendario');return MPAL[(i<0?0:i)%MPAL.length]}
function monthMarks(ds){
  var cols=[],seen={},add=function(c){if(!seen[c]){seen[c]=1;cols.push(c)}},n=0,wk=false;
  calOn(ds).forEach(function(e){n++;if(calMod(e.title,e.cal)==='Ejercicio')wk=true;add(calColor(e.cal))});
  agenda(ds).forEach(function(o){
    if(/^(event|task|reminder|ctrl|exam|pay|pend)$/.test(o.k)){n++;add(MAURA)}
    if(o.k==='log'&&logsOn(ds,'workout').some(function(l){return l.id===o.id}))wk=true;
  });
  if(wk){add(MWK)}
  return {cols:cols.slice(0,4),n:n};
}
function monthRing(ds,t){
  if(ds>t)return '';
  var has=logsOn(ds).some(function(l){return l.kind!=='steps'})||agenda(ds).some(function(o){return o.act&&o.done});
  if(!has)return '';
  var sc=dayScore(ds).score,C=2*Math.PI*15,f=(C*Math.max(0.04,sc/100)).toFixed(1);
  return '<svg viewBox="0 0 34 34" width="34" height="34" aria-hidden="true"><circle cx="17" cy="17" r="15" fill="none" style="stroke:var(--line)" stroke-width="2.2"></circle><circle cx="17" cy="17" r="15" fill="none" style="stroke:var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="'+f+' '+C.toFixed(1)+'" transform="rotate(-90 17 17)"></circle></svg>';
}
function monthDayList(ds){
  var rows=[];
  calOn(ds).forEach(function(e){rows.push({t:e.time||'',e:e.end||'',ttl:e.title,sub:[e.cal||'Calendario',e.place].filter(Boolean).join(' · '),c:calColor(e.cal),act:'data-act="calview" data-id="'+esc(e.ext)+'"'})});
  agenda(ds).forEach(function(o){
    if(o.k==='cal'||o.k==='info'||o.k==='plan')return;
    if(o.k==='log'&&!logsOn(ds,'workout').some(function(l){return l.id===o.id}))return;
    var isWk=o.k==='log',act='';
    if(o.k==='event'||o.k==='task'||o.k==='reminder')act='data-act="iedit" data-id="'+o.id+'"';
    else if(o.k==='ctrl')act='data-act="hview" data-t="ctrl" data-id="'+o.id+'"';
    else if(o.k==='exam')act='data-act="hview" data-t="exam" data-id="'+o.id+'"';
    else if(o.k==='med')act='data-act="hview" data-t="treat" data-id="'+o.id+'"';
    var tag=o.k==='task'?'Tarea':o.k==='reminder'?'Recordatorio':o.k==='event'?'Evento':o.k==='med'?'Dosis':isWk?'Entrenamiento':'';
    rows.push({t:o.time||'',e:o.end||'',ttl:o.title,sub:[tag,o.sub].filter(Boolean).join(' · '),c:isWk?MWK:o.k==='med'?(MCOL.Salud):MAURA,act:act,done:!!o.done});
  });
  rows.sort(function(a,b){return (a.t||'99')<(b.t||'99')?-1:(a.t||'99')>(b.t||'99')?1:0});
  return rows;
}
function monthSheet(){
  var f=ui.form||{},t=T(),m=f.m||t.slice(0,7),sel=f.sel||t,y=+m.slice(0,4),mo=+m.slice(5,7);
  var first=m+'-01',lead=(new Date(first+'T12:00').getDay()+6)%7,start=plusDays(first,-lead),dim=new Date(y,mo,0).getDate();
  var cells=Math.ceil((lead+dim)/7)*7,o='';
  o+='<div class="handle"></div><div class="top" style="align-items:flex-start"><div><p class="label">Calendario</p><h2 class="serif" style="font-size:1.9rem;font-weight:400">Tu <em>mes</em></h2></div><button class="close" type="button" data-act="close" aria-label="Cerrar">'+XMARK+'</button></div>';
  o+='<div class="mhead"><b>'+MESL[mo-1]+' '+y+'</b><div class="mnav">'+(m!==t.slice(0,7)?'<button class="link" type="button" data-act="mtoday">Hoy</button>':'')+'<button class="nv" type="button" data-act="mmon" data-d="-1" aria-label="Mes anterior">‹</button><button class="nv" type="button" data-act="mmon" data-d="1" aria-label="Mes siguiente">›</button></div></div>';
  o+='<div class="mgrid" role="grid" aria-label="'+MESL[mo-1]+' '+y+'">'+['L','M','M','J','V','S','D'].map(function(d){return '<span class="mdw" aria-hidden="true">'+d+'</span>'}).join('');
  for(var i=0;i<cells;i++){
    var ds=plusDays(start,i),inM=ds.slice(0,7)===m,mk=monthMarks(ds),dots=mk.cols.map(function(c){return '<i style="background:'+c+'"></i>'}).join('');
    o+='<button type="button" class="mcell'+(inM?'':' out')+(ds===t?' today':'')+'" data-act="mday" data-v="'+ds+'" aria-pressed="'+(ds===sel)+'" aria-label="'+esc(cap(DOWL[new Date(ds+'T12:00').getDay()])+' '+dshort(ds)+(mk.n?', '+mk.n+(mk.n===1?' cosa':' cosas'):''))+'"><span class="mn">'+(inM?monthRing(ds,t):'')+'<span>'+(+ds.slice(8))+'</span></span><span class="mdots">'+dots+'</span></button>';
  }
  o+='</div>';
  var leg=calNames().map(function(n){return '<span><i style="background:'+calColor(n)+'"></i>'+esc(n)+'</span>'});
  leg.push('<span><i style="background:'+MAURA+'"></i>Aura</span>','<span><i style="background:'+MWK+'"></i>Entrenamiento</span>','<span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.6" fill="none" style="stroke:var(--accent)" stroke-width="1.6"></circle></svg>Cómo te fue</span>');
  o+='<div class="mleg">'+leg.join('')+'</div>';
  // Día elegido
  var rows=monthDayList(sel);
  o+='<section id="mlist"><div class="sh" style="align-items:center"><h2 class="serif" style="font-size:1.4rem;font-weight:400">'+dayTitle(sel)+'</h2></div>';
  o+=rows.length?'<div class="mlist">'+rows.map(function(r){var inner='<span class="mt">'+(r.t||'Todo el día')+(r.e?'<br>'+r.e:'')+'</span><i class="md" style="background:'+r.c+'"></i><span class="mb"><span class="ttl" style="display:block">'+esc(r.ttl)+'</span>'+(r.sub?'<span class="meta">'+esc(r.sub)+'</span>':'')+'</span>';return r.act?'<button class="mrow'+(r.done?' done':'')+'" type="button" '+r.act+'>'+inner+'</button>':'<div class="mrow'+(r.done?' done':'')+'">'+inner+'</div>'}).join('')+'</div>':'<p class="muted" style="font-size:.9rem">'+(sel<t?'No hay nada anotado ese día.':'Nada planificado para este día.')+'</p>';
  if(sel<=t&&logsOn(sel).some(function(l){return l.kind!=='steps'})){var sc=dayScore(sel);o+='<button class="link" type="button" data-act="dsum" data-v="'+sel+'" style="align-self:flex-start">Resumen: '+scoreWord(sc.score).toLowerCase()+' · '+sc.score+'/100</button>'}
  o+='<div class="btns"><button class="btn acc" type="button" data-act="mgo">Ver ese día</button><button class="btn line" type="button" data-act="madd2">+ Agregar</button></div></section>';
  if(CAL.st==='ok')o+='<p class="meta">Tus calendarios llegan desde unos 2 meses atrás hasta 6 meses adelante.</p>';
  else if(CAL.st!=='err')o+='<p class="meta">Conecta tus calendarios del iPhone en Más → Calendario para verlos aquí.</p>';
  return o;
}
function sumSheet(){
  var ds=ui.form.ds||T(),t=T(),sc=dayScore(ds),tips=dayTips(ds,sc),o='';
  o+='<div class="handle"></div><div class="top" style="align-items:flex-start"><div><p class="label">Resumen del día</p><h2 class="serif" style="font-size:1.9rem;font-weight:400">'+dayTitle(ds)+'</h2></div><button class="close" type="button" data-act="close" aria-label="Cerrar">'+XMARK+'</button></div>';
  o+='<div class="daynav"><button type="button" data-act="dsum" data-v="'+plusDays(ds,-1)+'" aria-label="Día anterior">‹</button><b>'+scoreWord(sc.score)+' · '+sc.score+'/100</b><button type="button" data-act="dsum" data-v="'+plusDays(ds,1)+'" aria-label="Día siguiente"'+(ds>=t?' disabled':'')+'>›</button></div>';
  o+='<div class="sumtop">'+petals(ds,sc,200)+'</div>';
  o+='<div class="areas">'+AREAS.map(function(x){var a=sc.areas[x[0]],pc=Math.round(a.v*100);return '<div class="area'+(a.on?'':' off')+'"><div class="stat"><span><i class="adot" style="background:var('+x[2]+')"></i>'+x[1]+'</span><b>'+(a.on?pc+' %':'—')+'</b></div><div class="bar"><span style="width:'+(a.on?pc:0)+'%;background:var('+x[2]+')"></span></div><p class="meta">'+esc(a.t)+'</p></div>'}).join('')+'</div>';
  o+='<section><p class="label">Tu día en horas</p>'+timeStrip(ds)+'</section>';
  var ex=[];
  if(sc.bm.length)ex.push('Deposiciones: '+sc.bm.length+(sc.bm.some(function(b){return b.bristol})?' · tipo'+(sc.bm.filter(function(b){return b.bristol}).length>1?'s ':' ')+sc.bm.filter(function(b){return b.bristol}).map(function(b){return b.bristol}).join(', '):''));
  else if(OG().trk.bm)ex.push('Deposiciones: ninguna anotada');
  if(sc.meds.length)ex.push('Dosis: '+sc.meds.filter(function(m){return m.done}).length+' de '+sc.meds.length);
  var ci=cycleNow();if(ci&&ds===t)ex.push('Ciclo: día '+ci.day+' · fase '+PH[phaseOf(Math.min(ci.day,cfg().len))].n.toLowerCase());
  if(ex.length)o+='<p class="meta">'+ex.map(esc).join(' · ')+'</p>';
  if(tips.good.length)o+='<div class="sumtips ok"><p class="label">Lo que salió bien</p>'+tips.good.map(function(x){return '<p>'+esc(x)+'</p>'}).join('')+'</div>';
  if(tips.next.length)o+='<div class="sumtips"><p class="label">'+(ds===t?'Para cerrar hoy o mañana':'Para la próxima')+'</p>'+tips.next.map(function(x){return '<p>'+esc(x)+'</p>'}).join('')+'</div>';
  if(ds===t&&sc.pend.length)o+='<button class="btn line" type="button" data-act="tmove">Pasar '+sc.pend.length+(sc.pend.length===1?' pendiente':' pendientes')+' a mañana</button>';
  // Últimos 7 días
  var bars='',days=[];for(var i=6;i>=0;i--)days.push(plusDays(ds,-i));
  days.forEach(function(d){var s=dayScore(d).score;bars+='<button type="button" class="d7'+(d===ds?' on':'')+'" data-act="dsum" data-v="'+d+'" aria-label="'+esc(dshort(d))+': '+s+' de 100"><span class="d7b"><span style="height:'+Math.max(4,s)+'%"></span></span><small>'+'DLMMJVS'.charAt(new Date(d+'T12:00').getDay())+'</small><b>'+s+'</b></button>'});
  o+='<section><p class="label">Últimos 7 días</p><div class="d7s">'+bars+'</div></section>';
  return o;
}

/* ---------- Hojas nuevas: gastos de hoy, aviso del banco, deposición ---------- */
var BRISTOL=[[1,'Bolitas duras'],[2,'Dura, en trozos'],[3,'Con grietas'],[4,'Suave y lisa'],[5,'Trozos blandos'],[6,'Pastosa'],[7,'Líquida']];
function orgSheet(s){
  var f=ui.form||{},t=T(),o;
  if(s==='hgasto'){
    var ml=logsOn(t,'money').sort(function(a,b){return a.time<b.time?1:-1}),ns=OG().nospend.indexOf(t)>-1;
    o=sheetHead('Gastos de <em>hoy</em>','La racha sigue si anotas tus gastos o marcas que hoy no tuviste. Racha: '+streakTxt(moneyStreak()).toLowerCase()+'.');
    o+='<div class="btns"><button class="btn acc" type="button" data-act="sheet" data-s="money">Anotar gasto</button><button class="btn line" type="button" data-act="sheet" data-s="aviso">Pegar aviso del banco</button></div>';
    o+=ml.length?'<section>'+ml.map(function(l){return logRow(l)}).join('')+'</section>':'<button class="btn line" type="button" data-act="nospend" style="'+(ns?'border-color:var(--ok);color:var(--ok)':'')+'">'+(ns?'Marcado: hoy no tuve gastos · quitar':'Hoy no tuve gastos')+'</button>';
    o+='<p class="meta">Más adelante, al pasar la app a GitHub, los correos de tus tarjetas se podrán leer solos y estos gastos aparecerán sin escribirlos.</p>';
    return o;
  }
  if(s==='aviso'){
    o=sheetHead('Aviso del <em>banco</em>','Pega el texto del correo o la notificación de compra. Leo monto, comercio, fecha y hora.',true);
    o+='<form id="aviso-form" class="field" style="gap:10px"><label class="label" for="f-aviso">Texto del aviso</label><textarea id="f-aviso" data-f="aviso" spellcheck="false" style="font-family:var(--body);font-size:.92rem;min-height:120px" placeholder="Ej: Se realizó una compra por $12.990 en FARMACIAS CRUZ VERDE el 22/10/2026 a las 13:45">'+esc(f.aviso||'')+'</textarea><p class="meta">Puedes pegar varios avisos juntos. No guardo números de tarjeta.</p><button class="btn" type="submit">Leer aviso</button></form>';
    if(f.found){
      if(!f.found.length)o+='<p class="late" style="font-size:.88rem">No encontré montos con $. Revisa que el texto tenga el monto, por ejemplo $12.990.</p>';
      else{
        o+='<div class="parse"><p class="label" style="color:var(--accent);display:flex;gap:6px;align-items:center">'+SPARK+'Encontré '+f.found.length+(f.found.length===1?' movimiento':' movimientos')+'</p>';
        f.found.forEach(function(x,i){o+='<div class="row"><div class="grow"><div class="ttl">'+esc(x.desc)+'</div><div class="meta">'+whenLabel(x.date)+' · '+x.time+' · '+esc(x.cat)+(x.dup?' · <span class="late">ya hay un movimiento igual ese día</span>':'')+'</div></div><span class="badge">'+(x.dir==='ingreso'?'+':'−')+clp(x.amount)+'</span><button class="x" type="button" data-act="avfix" data-v="'+i+'">Corregir</button></div>'});
        var nw=f.found.filter(function(x){return !x.dup}).length;
        o+='<div class="btns"><button class="btn acc" type="button" data-act="avsave"'+(nw?'':' disabled')+'>'+(nw?'Guardar '+nw+(nw===1?' movimiento':' movimientos'):'Todo ya estaba anotado')+'</button></div></div>';
      }
    }
    return o;
  }
  if(s==='bm'){
    var br=f.bris||'',td=bmOn(f.ldate||t);
    o=sheetHead('Deposición','Anota la hora. El tipo es opcional.');
    o+='<form id="bm-form" class="field" style="gap:12px"><div class="two">'+ldField()+'<div class="field"><label class="label" for="f-time">Hora</label><input id="f-time" type="time" value="'+esc(f.time||nowHM())+'"></div></div>';
    o+='<div class="field"><span class="label">Tipo (escala de Bristol, opcional)</span><div class="bris" role="group" aria-label="Tipo">'+BRISTOL.map(function(b){return '<button class="chip" type="button" data-act="bris" data-v="'+b[0]+'" aria-pressed="'+(String(b[0])===String(br))+'"><b>'+b[0]+'</b> '+b[1]+'</button>'}).join('')+'</div><p class="meta">Los tipos 3 y 4 son los más habituales. Si notas cambios que duran, coméntalo en tu próximo control.</p></div>';
    o+='<div class="field"><label class="label" for="f-note">Nota (opcional)</label><input id="f-note" type="text" maxlength="100" value="'+esc(f.note||'')+'"></div><button class="btn acc" type="submit">Guardar</button></form>';
    if(td.length)o+='<section><p class="label">'+((f.ldate||t)===t?'Hoy':whenLabel(f.ldate))+'</p>'+td.map(function(l){return logRow(l)}).join('')+'</section>';
    return o;
  }
  if(s==='daysum')return sumSheet();
  if(s==='calev')return calEvSheet();
  if(s==='mes')return monthSheet();
  return null;
}
function addBm(d,tm,bris,note){var l={kind:'bm',module:'Salud',title:'Deposición',date:d,time:tm};if(bris)l.bristol=+bris;if(note)l.note=note;addLog(l);return l}
function setSteps(d,n){state.logs=state.logs.filter(function(x){return !(x.kind==='steps'&&x.date===d)});addLog({kind:'steps',module:'Ejercicio',title:'Pasos',steps:n,date:d,time:d===T()?nowHM():'21:00'})}
function orgSubmit(fm){
  var f=ui.form;
  if(fm.id==='aviso-form'){snap();f.found=parseBank(f.aviso);rerender();return true}
  if(fm.id==='bm-form'){snap();var d=f.ldate||T();if(d>T()){toast('Elige una fecha de hoy o anterior');return true}
    addBm(d,f.time||nowHM(),f.bris,String(f.note||'').trim());done('Deposición anotada'+(d===T()?' · '+bmOn(d).length+' hoy':' · '+whenLabel(d)));return true}
  return false;
}
function orgClick(a,b,id){
  var v=b.getAttribute('data-v'),f=ui.form||{},og;
  switch(a){
    case 'oday': ui.oday=v; render(); return true;
    case 'oweek': ui.oday=plusDays(orgDay(),+b.getAttribute('data-d')); render(); return true;
    case 'onew': goSheet('task',{ty:'task',date:orgDay()<T()?T():orgDay(),mod:'Casa'}); return true;
    case 'iedit': var it=find(id); if(it){goSheet('task',{eid:it.id,ty:it.type,name:it.title,mod:it.module,date:it.type==='task'?(it.due||T()):it.date,time:it.time||'',end:it.end||'',place:it.place||''})} return true;
    case 'idel': if(!ui.hdel){ui.hdel=true;rerender();return true} state.items=state.items.filter(function(x){return x.id!==f.eid}); done('Borrado'); return true;
    case 'oplan': var c=BD().combos.filter(function(x){return x.id===id})[0]; if(c){var lo=logCombo(c,T());save();render();toast('Anotado: '+c.n+' · '+n0(lo.kcal)+' kcal')} return true;
    case 'trk': if(v==='money')goSheet('hgasto',{}); else if(v==='steps')goSheet('steps',{direct:true,ldate:T(),smode:'min'}); else goSheet('bm',{ldate:T()}); return true;
    case 'trkhide': OG().trk[v]=false; save(); render(); return true;
    case 'trkshow': OG().trk[v]=true; save(); render(); return true;
    case 'sgoal': og=OG(); og.stepGoal=Math.max(1000,Math.min(50000,og.stepGoal+(+b.getAttribute('data-d')))); save(); render(); return true;
    case 'nospend': og=OG(); var t=T(),ix=og.nospend.indexOf(t); if(ix>-1)og.nospend.splice(ix,1); else og.nospend.push(t); og.nospend=og.nospend.filter(function(d){return d>=plusDays(t,-400)}); save(); render(); toast(ix>-1?'Quitado':'Listo: día sin gastos'); return true;
    case 'avsave': var n=0; (f.found||[]).forEach(function(x){if(x.dup)return;addLog({kind:'money',module:'Finanzas',title:x.desc,amount:x.amount,dir:x.dir,cat:x.cat,date:x.date,time:x.time,src:'aviso'});n++}); done(n+(n===1?' movimiento guardado':' movimientos guardados')); return true;
    case 'avfix': var x=(f.found||[])[+v]; if(x){goSheet('money',{dir:x.dir,amt:String(x.amount),cat:x.cat,desc:x.desc,ldate:x.date,ltime:x.time})} return true;
    case 'bris': snap(); f.bris=f.bris===v?'':v; rerender(); return true;
    case 'month': var md=v&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:T(); goSheet('mes',{m:md.slice(0,7),sel:md}); return true;
    case 'mmon': f.m=monthAdd(f.m||T().slice(0,7),+b.getAttribute('data-d')); f.sel=f.m===T().slice(0,7)?T():f.m+'-01'; renderSheet(); return true;
    case 'mtoday': f.m=T().slice(0,7); f.sel=T(); renderSheet(); return true;
    case 'mday': f.sel=v; if(v.slice(0,7)!==f.m)f.m=v.slice(0,7); renderSheet(); var ml=$('mlist'); if(ml&&ml.scrollIntoView)ml.scrollIntoView({block:'nearest'}); return true;
    case 'mgo': ui.oday=f.sel||T(); ui.view='dia'; closeSheet(); render(); setTimeout(function(){var og=document.querySelector('.org');if(og&&og.scrollIntoView)og.scrollIntoView({block:'start'})},30); return true;
    case 'madd2': goSheet('task',{ty:'task',date:(f.sel||T())<T()?T():(f.sel||T()),mod:'Casa'}); return true;
    case 'dsum': if(v>T())return true; if(ui.sheet!=='daysum'){goSheet('daysum',{ds:v})} else {ui.form.ds=v; renderSheet()} return true;
    case 'tmove': var tm=plusDays(T(),1),k=0; state.items.forEach(function(i){if(i.done)return;if(i.type==='task'&&(!i.due||i.due<=T())){i.due=tm;k++}else if(i.type==='reminder'&&i.date<=T()){i.date=tm;k++}}); save(); render(); renderSheet(); toast(k+(k===1?' pendiente pasó':' pendientes pasaron')+' a mañana'); return true;
  }
  return false;
}


/* ---------- Vistas ---------- */
function header(eyebrow,title){
  return '<div class="top"><button class="avatar" type="button" data-act="view" data-v="mas" aria-label="Más: belleza y respaldo">C</button><button class="pill" type="button" data-act="month" aria-label="Ver el calendario del mes">'+esc(new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'short'}).replace(/^./,function(c){return c.toUpperCase()}))+'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/></svg></button></div>'+
    '<div><p class="muted" style="font-size:.9rem;font-weight:500">'+eyebrow+'</p><h1>'+title+'</h1></div>';
}
function exampleNote(){
  var has=state.items.some(function(i){return i.example})||state.logs.some(function(i){return i.example});
  return has?'<div class="note"><span>Los elementos de ejemplo muestran cómo funciona. Bórralos cuando quieras.</span><button class="btn line sm" type="button" data-act="clearex">Borrar ejemplos</button></div>':'';
}

function viewDia(){
  var t=T(), s=summary(), pct=s.total?Math.round(s.done*100/s.total):0, h=new Date().getHours(), sp=stepsOn(t);
  var greet=(h<12?'Buenos días':h<20?'Buenas tardes':'Buenas noches')+', Carolina';
  var out=header(greet,'Mi <em>día</em>');
  out+='<div class="glass hero"><div class="orb" role="img" aria-label="'+s.done+' de '+s.total+' listas"><b>'+s.done+'<small>/'+s.total+'</small></b><span>listas hoy</span></div><div class="stats">'+
    '<div class="stat"><span class="muted">Agenda</span><b>'+s.ag[0]+' de '+s.ag[1]+'</b></div>'+
    '<div class="stat"><span class="muted">Hábitos</span><b>'+s.h[0]+' de '+s.h[1]+'</b></div>'+
    '<div class="stat"><span class="muted">Agua</span><b>'+n0(water(t))+' ml</b></div>'+
    '<div class="stat"><span class="muted">Pasos</span><b>'+(sp!=null?n0(sp):'—')+'</b></div>'+
    '<div class="bar" role="progressbar" aria-label="Avance del día" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span style="width:'+pct+'%"></span></div>'+
    '<button class="link" type="button" data-act="dsum" data-v="'+t+'" style="align-self:flex-start;padding:0;min-height:28px">Ver cómo va tu día</button></div></div>';
  out+='<div class="tip"><div class="ic">'+SPARK+'</div><div><p class="label">Asistente · versión básica</p><p>'+tipText()+'</p></div></div>';
  out+=closingCard();
  out+=orgHtml();
  out+=balStrip();
  out+=exampleNote();
  out+=habitsHtml();
  var lg=logsOn(t).sort(function(a,b){return a.time<b.time?1:-1});
  out+='<section><details class="dh"'+(ui.logOpen?' open':'')+'><summary data-act="logopen"><h2>Anotado <em>hoy</em></h2><span class="badge" style="margin-left:10px">'+lg.length+'</span></summary>';
  if(!lg.length) out+='<div class="empty">Nada todavía. Usa el + para anotar comidas, gastos y más.</div>';
  lg.forEach(function(l){out+=logRow(l)});
  out+='</details></section>';
  return out;
}

function logRow(l,showDate){
  var main=esc(l.title), extra='';
  if(l.kind==='water') main='Agua · '+n0(waterMl(l))+' ml';
  if(l.kind==='money') extra='<span class="badge" style="'+(l.dir==='ingreso'?'':'')+'">'+(l.dir==='ingreso'?'+':'−')+clp(l.amount)+'</span>';
  if(l.kind==='meal') extra=typeof l.kcal==='number'?'<span class="badge">'+n0(l.kcal)+' kcal</span>':(l.protein?'<span class="badge">'+l.protein+' g prot.</span>':'');
  if(l.kind==='workout'&&l.minutes) extra='<span class="badge">'+l.minutes+' min'+(wkKcal(l)?' · '+n0(wkKcal(l))+' kcal':'')+'</span>';
  if(l.kind==='steps') main='Pasos · '+n0(l.steps||0)+(l.walkMin?' · '+l.walkMin+' min caminando':'');
  if(l.kind==='lift') extra='<span class="badge">'+dc(l.kg)+' kg × '+l.reps+'</span>';
  if(l.kind==='bm') main='Deposición'+(l.bristol?' · tipo '+l.bristol:'')+(l.note?' · '+esc(l.note):'');
  if(l.kind==='money'&&l.src) extra='<span class="badge mut">'+(l.src==='correo'?'correo':l.src==='claude'?'Claude':'aviso')+'</span>'+extra;
  var sub=(showDate?dshort(l.date)+' · ':'')+(l.time||'')+' · '+esc(l.module)+(l.cat&&l.kind==='money'?' · '+esc(l.cat):'');
  return '<div class="row"><div class="grow"><div class="ttl">'+dot(l.module)+main+'</div><div class="meta">'+sub+'</div></div>'+extra+delBtn(l.id,'log')+'</div>';
}
function recent(filter,days){
  var from=ymd(addDays(new Date(),-(days||7)));
  return state.logs.filter(function(l){return l.date>=from&&filter(l)}).sort(function(a,b){return (a.date+a.time)<(b.date+b.time)?1:-1});
}
function listSection(title,list,emptyTxt){
  var o='<section><div class="sh"><h2>'+title+'</h2></div>';
  if(!list.length) o+='<div class="empty">'+emptyTxt+'</div>';
  list.forEach(function(l){o+=logRow(l,true)});
  return o+'</section>';
}

var MES={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,set:9,oct:10,nov:11,dic:12};
function parseDates(txt){
  var t=T(),cy=+t.slice(0,4),ok=[],bad=[];
  txt.split(/[\n,;]+/).map(function(x){return x.trim()}).filter(Boolean).forEach(function(x){
    var s=x.toLowerCase().replace(/\bde\b/g,' ').replace(/\s+/g,' ').trim(),y,m,d,yr=false,r;
    if((r=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))){y=+r[1];m=+r[2];d=+r[3];yr=true}
    else if((r=s.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/))){d=+r[1];m=+r[2];if(r[3]){y=+r[3];if(y<100)y+=2000;yr=true}}
    else if((r=s.match(/^(\d{1,2}) ([a-záéíóú]+)\.?(?: (\d{4}))?$/))&&MES[r[2].slice(0,3)]){d=+r[1];m=MES[r[2].slice(0,3)];if(r[3]){y=+r[3];yr=true}}
    else {bad.push(x);return}
    if(!yr)y=cy;
    var dt=new Date(y,m-1,d);
    if(dt.getMonth()!==m-1||dt.getDate()!==d){bad.push(x);return}
    var ds=ymd(dt); if(!yr&&ds>t) ds=ymd(new Date(y-1,m-1,d));
    if(ds>t){bad.push(x);return}
    ok.push(ds);
  });
  return {ok:ok,bad:bad};
}
function bulkHtml(){
  if(!ui.bulk) return '<button class="link" type="button" data-act="bulk" style="align-self:flex-start">Agregar varias fechas a la vez</button>';
  return '<form id="bulk-form" class="field" style="gap:10px"><label class="label" for="f-bulk">Varias fechas de inicio</label><p class="muted" style="font-size:.85rem">Una por línea o separadas por coma. Sirven formatos como 14/01, 14/01/2026 o 14 de enero. Si no pones año, uso este año.</p><textarea id="f-bulk" spellcheck="false" style="font-family:var(--body);font-size:.95rem;min-height:130px" placeholder="14/01&#10;11/02&#10;12/03">'+esc(ui.bulkText||'')+'</textarea>'+(ui.bulkMsg?'<p class="late" style="font-size:.85rem">'+esc(ui.bulkMsg)+'</p>':'')+'<div class="btns"><button class="btn acc" type="submit">Agregar fechas</button><button class="btn line" type="button" data-act="bulk">Cancelar</button></div></form>';
}

