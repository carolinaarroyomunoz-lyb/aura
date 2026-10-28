/* Aura · js/organizador.js
   Ciclo, asistente básica (tarjeta de Mi día) y Organizador (agenda del día).
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */
/* ---------- Ciclo ---------- */
function cfg(){ if(!state.cfg||typeof state.cfg.len!=='number') state.cfg={len:28,per:5,set:false}; return state.cfg }
function addPeriod(ds,tm){if(starts().some(function(x){return x.date===ds}))return false;addLog({kind:'period',module:'Salud',title:'Inicio de período',date:ds,time:tm||(ds===T()?nowHM():'09:00')});return true}
function starts(){var seen={};return state.logs.filter(function(l){return l.kind==='period'}).map(function(l){return {date:l.date,id:l.id}}).sort(function(a,b){return a.date<b.date?-1:1}).filter(function(x){if(seen[x.date])return false;seen[x.date]=1;return true})}
var PH={
  men:{n:'Menstrual',d:function(c){return 'Días de período, según tu ajuste de '+c.per+' días.'}},
  fol:{n:'Folicular',d:function(){return 'Desde el fin del período hasta la ovulación. Muchas personas notan más energía en esta fase.'}},
  ovu:{n:'Ovulación',d:function(){return 'Ventana estimada, unos 14 días antes de tu próximo período.'}},
  lut:{n:'Lútea',d:function(){return 'Desde la ovulación hasta tu próximo período.'}}
};
function bounds(){var c=cfg(),L=c.len,P=c.per,ov=L-14,a=Math.max(P+1,ov-1),b=Math.min(L,Math.max(a,ov+1));return {L:L,P:P,a:a,b:b}}
function phaseOf(day){var B=bounds();if(day<=B.P)return 'men';if(day<B.a)return 'fol';if(day<=B.b)return 'ovu';return 'lut'}
function plusDays(ds,n){return ymd(addDays(new Date(ds+'T12:00'),n))}
function cycleNow(){
  var ss=starts();if(!ss.length)return null;
  var t=T(),L=cfg().len,last=ss[ss.length-1].date,due=plusDays(last,L),late=daysBetween(due,t);
  var next=late>0?plusDays(t,1):due;
  return {last:last,day:daysBetween(last,t)+1,due:due,late:late,next:next,left:daysBetween(t,next)};
}
function dayInfo(ds){
  var ss=starts();if(!ss.length||ds<ss[0].date)return null;
  var ci=cycleNow(),L=cfg().len;
  if(ds>=ci.next) return {day:(daysBetween(ci.next,ds)%L)+1,pred:true};
  for(var i=ss.length-1;i>=0;i--){if(ss[i].date<=ds)return {day:daysBetween(ss[i].date,ds)+1,pred:false}}
  return null;
}
function ring(day){
  var B=bounds(),L=B.L,R=96,C=2*Math.PI*R,g='';
  [['men',1,B.P],['fol',B.P+1,B.a-1],['ovu',B.a,B.b],['lut',B.b+1,L]].forEach(function(x){
    var n=x[2]-x[1]+1;if(n<=0)return;
    var len=Math.max(2,C*n/L-4),off=-C*(x[1]-1)/L;
    g+='<circle cx="120" cy="120" r="'+R+'" style="fill:none;stroke:var(--ph-'+x[0]+')" stroke-width="18" stroke-linecap="round" stroke-dasharray="'+len.toFixed(1)+' '+C.toFixed(1)+'" stroke-dashoffset="'+(off-2).toFixed(1)+'"></circle>';
  });
  var d=Math.min(day,L),ang=((d-.5)/L)*2*Math.PI-Math.PI/2,x=120+R*Math.cos(ang),y=120+R*Math.sin(ang);
  return '<svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="'+R+'" style="fill:none;stroke:var(--line)" stroke-width="18"></circle><g transform="rotate(-90 120 120)">'+g+'</g><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="13" style="fill:var(--sheet);stroke:var(--ink)" stroke-width="3"></circle></svg>';
}
function calendar(){
  var base=new Date();base.setDate(1);base.setMonth(base.getMonth()+ui.cal);
  var y=base.getFullYear(),m=base.getMonth(),first=(base.getDay()+6)%7,nd=new Date(y,m+1,0).getDate(),t=T();
  var title=base.toLocaleDateString('es-CL',{month:'long',year:'numeric'}).replace(/^./,function(c){return c.toUpperCase()});
  var o='<section><div class="sh"><h2>'+esc(title)+'</h2><div class="calnav"><button type="button" data-act="cal" data-d="-1" aria-label="Mes anterior"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>'+(ui.cal?'<button type="button" class="link" data-act="cal" data-d="0" style="width:auto;border:0;background:none;padding:0 6px">Hoy</button>':'')+'<button type="button" data-act="cal" data-d="1" aria-label="Mes siguiente"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div></div><div class="cal">';
  ['L','M','M','J','V','S','D'].forEach(function(d){o+='<div class="dow">'+d+'</div>'});
  for(var i=0;i<first;i++)o+='<div></div>';
  for(var d=1;d<=nd;d++){
    var ds=ymd(new Date(y,m,d)),inf=dayInfo(ds),cl='cd';
    if(inf){cl+=' ph-'+phaseOf(inf.day);if(inf.pred)cl+=' pred'}
    if(ds===t)cl+=' today';
    o+='<div class="'+cl+'">'+d+'</div>';
  }
  o+='</div><div class="legend"><span class="ph-men"><i></i>Período</span><span><i class="dash"></i>Período estimado</span><span class="ph-fol"><i></i>Folicular</span><span class="ph-ovu"><i></i>Ovulación</span><span class="ph-lut"><i></i>Lútea</span></div></section>';
  return o;
}

function delBtn(id,kind){var c=ui.pend===id;return '<button class="x'+(c?' confirm':'')+'" type="button" data-act="'+(c?'delok':'del')+'" data-id="'+id+'" data-k="'+kind+'">'+(c?'¿Borrar?':'Borrar')+'</button>'}
function dot(m){return '<span class="dot" style="background:'+(MCOL[m]||'#888')+'"></span>'}

/* ---------- Asistente básica (reglas locales, sin IA todavía) ---------- */
function tipText(){
  var t=T(), hm=nowHM(), h=new Date().getHours(), rs=remsToday();
  var late=rs.filter(function(r){return !r.done&&(r.date<t||(r.time&&r.time<hm))});
  if(late.length) return 'Tienes pendiente «'+esc(late[0].title)+'»'+(late[0].time?' de las '+late[0].time:'')+'. Márcalo si ya lo hiciste.';
  var ft=finTipText()||fixTipText(); if(ft) return ft;
  var nc=nextCtrl(); if(nc){var ndd=daysBetween(t,nc.date); if(ndd>=0&&ndd<=2) return 'Tienes control de '+esc(nc.title)+(ndd===0?' hoy':ndd===1?' mañana':' en 2 días')+(nc.time?' a las '+nc.time:'')+'.'}
  var tEnd=endingSoon()[0]; if(tEnd){var tdl=daysBetween(t,tEnd.end); return 'Tu tratamiento de '+esc(tEnd.name)+(tdl===0?' termina hoy':tdl===1?' termina mañana':' termina en '+tdl+' días')+'.'}
  var pdg=pendings().filter(function(c){return daysBetween(t,c.nextDate)<=7})[0]; if(pdg){var pdd=daysBetween(t,pdg.nextDate); return pdd<0?'Tenías que volver a '+esc(pdg.title)+' el '+dshort(pdg.nextDate)+'. Puedes registrarlo o descartarlo más abajo.':'Te toca volver a '+esc(pdg.title)+' '+inDays(pdg.nextDate)+'.'}
  var w=water(t);
  if(h>=15&&w<aguaGoal()/2) return 'Llevas '+n0(w)+' ml de agua hoy, de una meta de '+n0(aguaGoal())+'. Suma una botella con el botón +.';
  var next=rs.filter(function(r){return !r.done&&r.date===t&&r.time&&r.time>=hm})[0];
  if(next) return 'Lo próximo: «'+esc(next.title)+'» a las '+next.time+'.';
  var ci=cycleNow(); if(ci){ if(ci.late>0) return 'Tu período se esperaba el '+dshort(ci.due)+'. Cuando llegue, anótalo en Salud.'; if(ci.left>=0&&ci.left<=3) return 'Tu período podría llegar '+(ci.left===0?'hoy':ci.left===1?'mañana':'en '+ci.left+' días')+' (día '+ci.day+' de '+cfg().len+').'; }
  var s=summary(); if(s.total&&s.done===s.total) return 'Completaste todo lo de hoy.';
  return 'Anota con el + lo que pase en tu día. Con más registros te daré mejores sugerencias.';
}
function summary(){
  var t=T(),hs=habits(),ag=agenda(t).filter(isAct),og=OG(),hd=hs.filter(function(h){return h.log.indexOf(t)>-1}).length,agd=ag.filter(function(o){return o.done}).length,tn=0,td=0;
  if(og.trk.money){tn++;if(moneyOk(t))td++}
  if(og.trk.steps){tn++;if((stepsOn(t)||0)>=og.stepGoal)td++}
  return {total:hs.length+tn+ag.length,done:hd+td+agd,h:[hd+td,hs.length+tn],ag:[agd,ag.length]};
}
/* ---------- Organizador (versión 14) ----------
   Junta en una agenda por día lo que producen las demás herramientas:
     items: task (due), reminder (date+time), event (date, time, end, place, src)
     Salud: dosis de tratamientos activos, controles (date/time), pendientes de volver, exámenes por hacer con fecha,
            último día de un tratamiento, período estimado
     Finanzas: pagos de tarjetas que vencen ese día (o atrasados, solo hoy)
     Alimentación: comidas frecuentes de ese día de la semana («lo de siempre»)
     Lo ya anotado ese día (comidas, entrenamientos, medicamentos sueltos, belleza, cargas, período)
   Versión PWA: los eventos de los calendarios conectados (iCloud, suscripciones, Google) llegan con calSync() y se muestran como k:'cal';
   no se guardan en items. Antes se pensó guardarlos como
   items type:'event' con src:'calendar' y ext (id del evento) para no duplicar. La vista no cambia.
   state.org (documento 'estado'): {trk:{money,steps,bm} (rastreadores visibles en Hábitos), stepGoal, nospend:[fechas sin gastos]} */
function normOrg(o){
  if(!o||typeof o!=='object')o={};
  if(!o.trk||typeof o.trk!=='object')o.trk={money:true,steps:true,bm:true};
  ['money','steps','bm'].forEach(function(k){if(typeof o.trk[k]!=='boolean')o.trk[k]=true});
  if(!Array.isArray(o.nospend))o.nospend=[];
  var g=parseInt(o.stepGoal,10);o.stepGoal=g>=1000&&g<=50000?g:8000;
  if(!Array.isArray(o.calHide))o.calHide=[]; // eventos de los calendarios conectados que se ocultaron en Aura
  return o;
}
function OG(){if(!state.org||!state.org.trk)state.org=normOrg(state.org);return state.org}
var DOWL=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
function orgDay(){var d=ui.oday;return d&&/^\d{4}-\d{2}-\d{2}$/.test(d)?d:T()}
function dayTitle(ds){var n=daysBetween(T(),ds),dl=DOWL[new Date(ds+'T12:00').getDay()];if(n===0)return 'Hoy, <em>'+dl+'</em>';if(n===1)return 'Mañana, <em>'+dl+'</em>';if(n===-1)return 'Ayer, <em>'+dl+'</em>';return cap(dl)+' <em>'+dshort(ds)+'</em>'}
function hmMin(x){var p=String(x||'').split(':');return (+p[0]||0)*60+(+p[1]||0)}
function logLine(l){
  if(l.kind==='meal')return {t:l.title,s:typeof l.kcal==='number'?n0(l.kcal)+' kcal':''};
  if(l.kind==='workout')return {t:l.title,s:(l.minutes?l.minutes+' min':'')+(wkKcal(l)?' · '+n0(wkKcal(l))+' kcal':'')};
  if(l.kind==='lift')return {t:l.title,s:dc(l.kg)+' kg × '+l.reps};
  return {t:l.title,s:''};
}
function agenda(ds){
  var t=T(),today=ds===t,past=ds<t,out=[];
  function add(o){if(!o.mod)o.mod='Casa';out.push(o)}
  state.items.forEach(function(i){
    if(i.type==='habit')return;
    if(i.type==='event'){if(i.date===ds)add({k:'event',id:i.id,time:i.time||'',end:i.end||'',title:i.title,sub:[i.place,i.src==='calendar'?'Desde Calendar':''].filter(Boolean).join(' · '),mod:i.module});return}
    var d=i.type==='task'?(i.due||''):(i.date||'');
    if(i.done){if(i.doneOn===ds||(!i.doneOn&&d===ds))add({k:i.type,id:i.id,time:i.time||'',title:i.title,mod:i.module,done:true,chk:true,act:1});return}
    var late=today&&d&&d<t?d:'';
    if(d===ds||(!d&&today&&i.type==='task')||late)add({k:i.type,id:i.id,time:late?'':(i.time||''),title:i.title,mod:i.module,chk:true,act:1,late:late});
  });
  calOn(ds).forEach(function(e){var cm=calMod(e.title,e.cal),cn=e.cal||'Calendario';add({k:'cal',id:e.ext,time:e.time||'',end:e.end||'',title:e.title,sub:[e.place,fold(cn)===fold(cm)?'':cn].filter(Boolean).join(' · '),mod:cm})});
  H().treats.forEach(function(x){
    if(tActive(x,ds)){var ts=tTimes(x);(ts.length?ts:['']).forEach(function(tm){
      var dd=D().filter(function(z){return z.id===doseKey(x.id,tm,ds)})[0];
      add({k:'med',id:x.id,v:tm,time:tm,title:x.name,sub:[x.dose,dd?'tomado '+dd.at:''].filter(Boolean).join(' · '),mod:'Salud',done:!!dd,chk:today,act:1,at:dd?dd.at:''});
    })}
    if(x.end===ds&&tActive(x,ds))add({k:'info',title:'Último día de '+x.name,mod:'Salud',info:1});
  });
  H().ctrls.forEach(function(c){if(c.date===ds)add({k:'ctrl',id:c.id,time:c.time||'',title:'Control: '+c.title,sub:[c.doc,c.place].filter(Boolean).join(' · '),mod:'Salud',done:!!c.done})});
  pendings().forEach(function(c){var lt=today&&c.nextDate<t;if(c.nextDate===ds||lt)add({k:'pend',id:c.id,time:'',title:'Volver a '+c.title,sub:'Pedido en el control del '+dshort(c.date),mod:'Salud',late:lt?c.nextDate:''})});
  H().exams.forEach(function(e){if(e.st==='pendiente'&&e.date===ds)add({k:'exam',id:e.id,time:'',title:'Examen: '+e.name,sub:e.place||'',mod:'Salud'})});
  if(!past)FN().debts.forEach(function(d){var s=dueStatus(d);if(!s||s.ok)return;if(s.date===ds||(today&&s.late))add({k:'pay',id:d.id,time:'',title:'Pagar '+d.n,sub:'Mínimo '+clp(s.need)+(s.paid?' · llevas '+clp(s.paid):''),mod:'Finanzas',late:s.late?s.date:'',act:1})});
  agendaFixed(ds,add);
  var ci=cycleNow();if(ci&&!past&&ci.late<=0&&ci.next===ds)add({k:'info',title:'Podría llegar tu período',sub:'Según tu ciclo de '+cfg().len+' días',mod:'Salud',info:1});
  var meals=logsOn(ds,'meal'),dow=String(new Date(ds+'T12:00').getDay()),used={};
  BD().combos.forEach(function(c){
    if((c.days||[]).indexOf(dow)<0)return;
    var hit=meals.filter(function(l){return l.combo===c.id&&!used[l.id]})[0];if(hit)used[hit.id]=1;
    if(past&&!hit)return;
    add({k:'plan',id:c.id,time:hit?hit.time:(MTIME[c.meal]||'12:00'),title:c.n,sub:c.meal+' · '+n0(hit&&typeof hit.kcal==='number'?hit.kcal:comboTot(c).kcal)+' kcal',mod:'Alimentación',done:!!hit,chk:today&&!hit});
  });
  state.logs.forEach(function(l){
    if(l.date!==ds||used[l.id]||!/^(meal|workout|med|beauty|period|lift)$/.test(l.kind))return;
    var ln=logLine(l);add({k:'log',id:l.id,time:l.time||'',title:ln.t,sub:ln.s,mod:l.module,done:true,log:1});
  });
  return out;
}
function isAct(o){return !!o.act}
function orgCount(ds){var all=agenda(ds),a=all.filter(isAct);return {n:a.length,d:a.filter(function(o){return o.done}).length,all:all.filter(function(o){return !o.log}).length}}
function weekStrip(){
  var sel=orgDay(),t=T(),wd=(new Date(sel+'T12:00').getDay()+6)%7,mon=plusDays(sel,-wd),o='<div class="wk"><button type="button" class="wkn" data-act="oweek" data-d="-7" aria-label="Semana anterior"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><div class="wkd" role="group" aria-label="Elegir día">';
  for(var i=0;i<7;i++){
    var ds=plusDays(mon,i),c=orgCount(ds),pend=c.n-c.d,dots='';
    for(var k=0;k<Math.min(3,c.all);k++)dots+='<i class="'+(k<pend?'p':'')+'"></i>';
    o+='<button type="button" class="wkday'+(ds===t?' today':'')+(ds<t?' past':'')+'" data-act="oday" data-v="'+ds+'" aria-pressed="'+(ds===sel)+'" aria-label="'+esc(cap(DOWL[new Date(ds+'T12:00').getDay()])+' '+dshort(ds)+(c.all?', '+c.all+' en la agenda':''))+'"><span>'+'LMMJVSD'.charAt(i)+'</span><b>'+(+ds.slice(8))+'</b><span class="wdots">'+dots+'</span></button>';
  }
  return o+'</div><button type="button" class="wkn" data-act="oweek" data-d="7" aria-label="Semana siguiente"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div>';
}
function chkBtn(act,id,v,on,title){return '<button class="chk" type="button" data-act="'+act+'" data-id="'+id+'"'+(v!=null?' data-v="'+esc(v)+'"':'')+' aria-pressed="'+!!on+'" aria-label="'+(on?'Quitar marca de ':'Marcar como hecho: ')+esc(title)+'">'+CHECK+'</button>'}
function orgRow(e,ds){
  var t=T(),today=ds===t,lateH=today&&!e.done&&e.act&&e.time&&e.time<nowHM();
  var lead,side='',open='';
  if(e.k==='task'||e.k==='reminder')lead=chkBtn('toggle',e.id,null,e.done,e.title);
  else if(e.k==='med'&&e.chk)lead=chkBtn('dose',e.id,e.v,e.done,e.title);
  else lead='<span class="onode'+(e.done?' ok':'')+(e.info?' info':'')+'" style="--m:'+(MCOL[e.mod]||'#7A7A8C')+'" aria-hidden="true">'+(e.done?CHECK:'')+'</span>';
  if(e.k==='pay')side='<button class="btn acc sm" type="button" data-act="dpay" data-id="'+e.id+'">Pagué</button>';
  else if(e.k==='fix')side='<button class="btn acc sm" type="button" data-act="fxpay" data-id="'+e.id+'">'+(e.auto?'Se cobró':'Pagué')+'</button>';
  else if(e.k==='plan'&&e.chk)side='<button class="btn line sm" type="button" data-act="oplan" data-id="'+e.id+'">Anotar</button>';
  else if(e.k==='pend'&&today)side='<button class="btn line sm" type="button" data-act="pnow" data-id="'+e.id+'">Registrar</button>';
  if(e.k==='event'||e.k==='task'||e.k==='reminder')open='data-act="iedit" data-id="'+e.id+'"';
  else if(e.k==='cal')open='data-act="calview" data-id="'+esc(e.id)+'"';
  else if(e.k==='ctrl')open='data-act="hview" data-t="ctrl" data-id="'+e.id+'"';
  else if(e.k==='med')open='data-act="hview" data-t="treat" data-id="'+e.id+'"';
  else if(e.k==='exam')open='data-act="hview" data-t="exam" data-id="'+e.id+'"';
  else if(e.k==='pay')open='data-act="godeudas"';
  else if(e.k==='fix')open='data-act="gofin" data-v="fijos"';
  var tag=e.k==='event'?'Evento':e.k==='reminder'?'Recordatorio':e.k==='plan'?'Lo de siempre':e.k==='log'?'Anotado':e.k==='fix'?'Gasto fijo':'';
  var meta=[tag,e.mod,e.sub].filter(Boolean).map(esc);
  if(e.late)meta.push('<span class="late">'+(e.k==='pay'||e.k==='fix'?'venció ':'era para el ')+dshort(e.late)+'</span>');
  else if(lateH)meta.push('<span class="late">pasó la hora</span>');
  var body='<div class="ttl">'+esc(e.title)+'</div><div class="meta">'+meta.join(' · ')+'</div>';
  var tm=e.time?e.time+(e.end?'<small>'+e.end+'</small>':''):'';
  return '<div class="orow'+(e.done?' done':'')+(e.log?' logd':'')+'"><span class="otime'+(lateH?' late':'')+'">'+tm+'</span><span class="olead">'+lead+'</span>'+
    (open?'<button class="obody" type="button" '+open+'>'+body+'</button>':'<div class="obody">'+body+'</div>')+side+'</div>';
}
function orgHtml(){
  var ds=orgDay(),t=T(),today=ds===t,a=agenda(ds),c=orgCount(ds);
  var late=a.filter(function(o){return o.late&&!o.done}),free=a.filter(function(o){return !o.late&&!o.time}),
      timed=a.filter(function(o){return !o.late&&o.time}).sort(function(x,y){return x.time<y.time?-1:x.time>y.time?1:0});
  var o='<section class="glass org" aria-label="Organizador"><div class="sh"><div><p class="label">Organizador</p><h2 class="serif orgt">'+dayTitle(ds)+'</h2></div><div class="orgtools">'+(today?'':'<button class="link" type="button" data-act="oday" data-v="'+t+'">Hoy</button>')+'<button class="btn sm line" type="button" data-act="month" data-v="'+ds+'">Mes</button><button class="btn sm acc" type="button" data-act="onew">Agregar</button></div></div>';
  o+=weekStrip();
  if(c.n||(ds>t&&c.all)){var pc=Math.round(c.d*100/c.n);o+='<div class="ocount"><span>'+(ds>t?c.all+(c.all===1?' cosa planificada':' cosas planificadas'):c.d+' de '+c.n+' listas')+'</span>'+(ds>t?'':'<div class="bar"><span style="width:'+pc+'%"></span></div>')+'</div>'}
  if(!a.length)o+='<div class="empty">'+(ds>t?'Nada planificado para este día. Agrega una tarea, un evento o un recordatorio.':today?'Tu agenda de hoy está libre. Lo que agregues en las demás secciones aparece aquí.':'No hay nada anotado ese día.')+'</div>';
  function grp(title,list,now){
    if(!list.length)return '';
    var g='<div class="ogrp"><p class="label">'+title+'</p><div class="tl">',put=false,hm=nowHM();
    list.forEach(function(e){if(now&&!put&&e.time>hm){g+='<div class="onow"><span>'+hm+'</span></div>';put=true}g+=orgRow(e,ds)});
    if(now&&!put&&list.length)g+='<div class="onow"><span>'+hm+'</span></div>';
    return g+'</div></div>';
  }
  o+=grp('Atrasado',late)+grp('Durante el día',free)+grp('Por hora',timed,today);
  o+=calLine();
  if(ds<=t&&(a.length||logsOn(ds).length))o+='<button class="btn line sm oend" type="button" data-act="dsum" data-v="'+ds+'">'+(today?'Ver cómo va tu día':'Ver el resumen de ese día')+'</button>';
  return o+'</section>';
}

