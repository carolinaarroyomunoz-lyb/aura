/* Aura · js/finanzas.js
   Finanzas: deudas, resumen del mes, gastos, fijos, sueldo y «Pegar desde Claude».
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */
/* ---------- Finanzas · Deudas (state.fin, documento 'finanzas' en la nube) ----------
   debts: [{id, n (apodo; nunca el número de tarjeta), ty: 'tc'|'lc'|'cc'|'otro',
            bal (deuda total según el último estado de cuenta), upd (fecha de ese estado de cuenta), updAt (ms al anotarlo),
            min (pago mínimo), fact (monto facturado del mes, opcional), rate (tasa mensual %, opcional), cae (CAE anual %, opcional),
            cupo (cupo total, opcional), due (día de pago 1–31), note,
            cuotas: [{id, n, v (valor cuota), left (cuotas que faltan, incluida la del estado de cuenta), tot}]}]
   pays:  [{id, did, date, amt, at (ms), lid (id del movimiento en logs)}]
   plan:  {budget (monto mensual para deudas), m: 'av' avalancha | 'bn' bola de nieve}
   Saldo de hoy = deuda del estado de cuenta − pagos anotados después (at > updAt).
   Supuestos (se muestran en pantalla): sin tasa anotada se usa 2,5 % mensual; sin mínimo, 5 % de la deuda (mín. $10.000);
   el simulador aplica la tasa a toda la deuda y mantiene fijo el pago mínimo. */
var DTY=[['tc','Tarjeta de crédito'],['lc','Línea de crédito'],['cc','Crédito de consumo'],['otro','Otra deuda']];
var RATE0=2.5;
var MSUBS=[['belleza','Belleza'],['cal','Calendario'],['pasos','Pasos'],['foto','Foto IA'],['datos','Respaldo']];
function normFin(f){
  if(!f||typeof f!=='object')f={};
  ['debts','pays'].forEach(function(k){if(!Array.isArray(f[k]))f[k]=[]});
  f.debts=f.debts.filter(function(d){return d&&d.id});
  f.debts.forEach(function(d){if(!Array.isArray(d.cuotas))d.cuotas=[]});
  if(!f.plan||typeof f.plan!=='object')f.plan={budget:0,m:'av'};
  // v16: sueldo y gastos fijos
  if(!f.inc||typeof f.inc!=='object')f.inc={};
  f.inc={sal:+f.inc.sal||0,day:parseInt(f.inc.day,10)||30,mode:f.inc.mode==='mes'?'mes':'sig',cap:+f.inc.cap||0};
  if(!Array.isArray(f.fixed))f.fixed=[];
  f.fixed=f.fixed.filter(function(x){return x&&x.id});
  f.fixed.forEach(function(x){x.amt=+x.amt||0;x.day=parseInt(x.day,10)||0;x.on=x.on!==false;x.auto=!!x.auto;if(!x.cat)x.cat='Otros';if(!Array.isArray(x.paidMk))x.paidMk=[]});
  f.v=1;return f;
}
function FN(){if(!state.fin||!state.fin.v)state.fin=normFin(state.fin);return state.fin}
function debtById(id){return FN().debts.filter(function(d){return d.id===id})[0]}
function numOf(s){var x=parseFloat(String(s==null?'':s).replace(/\s/g,'').replace(',','.'));return isFinite(x)?x:0}
function pctTxt(x){return dc(Math.round(x*100)/100)+' %'}
function tyName(t){var r=DTY.filter(function(x){return x[0]===t})[0];return r?r[1]:'Deuda'}
function rateOf(d){
  if(d.rate>0)return {r:d.rate/100,est:false,txt:pctTxt(d.rate)+' mensual'};
  if(d.cae>0){var r=Math.pow(1+d.cae/100,1/12)-1;return {r:r,est:false,txt:'≈ '+pctTxt(r*100)+' mensual (desde CAE '+pctTxt(d.cae)+')'}}
  return {r:RATE0/100,est:true,txt:pctTxt(RATE0)+' mensual (supuesto)'};
}
function paysOf(did){return FN().pays.filter(function(p){return p.did===did}).sort(function(a,b){return a.date<b.date?1:-1})}
function debtNow(d){var paid=paysOf(d.id).filter(function(p){return (p.at||0)>(d.updAt||0)}).reduce(function(s,p){return s+p.amt},0);return Math.max(0,(d.bal||0)-paid)}
function minOf(d){var now=debtNow(d);if(d.min>0)return Math.min(d.min,now);return Math.min(now,Math.max(10000,Math.round(now*0.05)))}
function dueOn(y,m,D){var last=new Date(y,m+1,0).getDate();return ymd(new Date(y,m,Math.min(D,last)))}
/* Estado del próximo pago. Lo pagado entre el vencimiento anterior y hoy cuenta para el vencimiento actual. */
function dueStatus(d){
  var D=parseInt(d.due,10);if(!(D>=1&&D<=31))return null;
  var now=debtNow(d);if(now<=0)return null;
  var t=T(),y=+t.slice(0,4),m=+t.slice(5,7)-1,cur=dueOn(y,m,D),prev=dueOn(y,m-1,D),next=dueOn(y,m+1,D),need=minOf(d);
  var paidIn=function(a,b){return paysOf(d.id).filter(function(p){return p.date>a&&p.date<=b}).reduce(function(s,p){return s+p.amt},0)};
  if(t<=cur){var pd=paidIn(prev,t);return {date:cur,days:daysBetween(t,cur),paid:pd,need:need,ok:pd>=need,late:false}}
  var pc=paidIn(prev,t);
  // Si el estado de cuenta es posterior a ese vencimiento, ya lo reemplazó: lo que cuenta es el siguiente.
  if(pc>=need||(d.upd&&d.upd>=cur)){var pn=paidIn(cur,t);return {date:next,days:daysBetween(t,next),paid:pn,need:need,ok:pn>=need,late:false}}
  return {date:cur,days:daysBetween(t,cur),paid:pc,need:need,ok:false,late:true};
}
function upcomingPays(maxDays){
  return FN().debts.map(function(d){return {d:d,s:dueStatus(d)}}).filter(function(x){return x.s&&!x.s.ok&&(x.s.late||x.s.days<=maxDays)}).sort(function(a,b){return a.s.date<b.s.date?-1:1});
}
/* Cuotas: cada vencimiento que pasa desde el estado de cuenta descuenta una cuota. */
function duesSince(d){
  var D=parseInt(d.due,10);if(!(D>=1&&D<=31)||!d.upd)return 0;
  var n=0,y=+d.upd.slice(0,4),m=+d.upd.slice(5,7)-1,t=T();
  for(var k=0;k<120;k++){var dd=dueOn(y,m+k,D);if(dd<=d.upd)continue;if(dd>t)break;n++}
  return n;
}
function cuotaLeft(d,c){return Math.max(0,(parseInt(c.left,10)||0)-duesSince(d))}
function cuotasMonth(){ // monto en cuotas por mes calendario (índice 0 = mes actual), según el próximo vencimiento de cada deuda
  var out=[],t=T();for(var k=0;k<13;k++)out.push(0);
  FN().debts.forEach(function(d){
    var D=parseInt(d.due,10),st=dueStatus(d),nd=st?st.date:(D>=1&&D<=31?(dueOn(+t.slice(0,4),+t.slice(5,7)-1,D)>=t?dueOn(+t.slice(0,4),+t.slice(5,7)-1,D):dueOn(+t.slice(0,4),+t.slice(5,7),D)):plusDays(t,30));
    var off=Math.max(0,(+nd.slice(0,4)-+t.slice(0,4))*12+(+nd.slice(5,7)-+t.slice(5,7)));
    d.cuotas.forEach(function(c){var l=cuotaLeft(d,c);for(var k=0;k<l&&off+k<13;k++)out[off+k]+=c.v||0});
  });
  var st0=0;while(st0<out.length&&!out[st0])st0++;
  return {start:st0,v:out.slice(st0)};
}
function monthLabel(k){var x=new Date();x.setDate(1);x.setMonth(x.getMonth()+k);return x.toLocaleDateString('es-CL',{month:'short',year:'numeric'}).replace('.','')}

/* Simulador. m: 'av' (mayor tasa primero), 'bn' (menor deuda primero) o 'min' (solo pagos mínimos). */
function simulate(list,budget,m){
  var ds=list.map(function(x){return {id:x.id,n:x.n,b:x.b,r:x.r,min:x.min}}).filter(function(x){return x.b>0});
  var tot=function(){return ds.reduce(function(s,x){return s+Math.max(0,x.b)},0)};
  var res={months:0,interest:0,series:[tot()],done:{},order:[],never:false,short:0};
  if(!ds.length)return res;
  var minSum=ds.reduce(function(s,x){return s+Math.min(x.b,x.min)},0);
  if(m!=='min'&&budget<minSum){res.short=minSum-budget;return res}
  while(tot()>0.5&&res.months<600){
    res.months++;
    ds.forEach(function(x){if(x.b>0){var i=x.b*x.r;x.b+=i;res.interest+=i}});
    var avail=m==='min'?Infinity:budget;
    ds.forEach(function(x){if(x.b<=0)return;var p=Math.min(x.b,x.min,avail);x.b-=p;avail-=p});
    if(m!=='min'){
      ds.filter(function(x){return x.b>0.5}).sort(function(a,b){return m==='av'?(b.r-a.r)||(a.b-b.b):(a.b-b.b)||(b.r-a.r)}).forEach(function(x){if(avail<=0)return;var p=Math.min(x.b,avail);x.b-=p;avail-=p});
    }
    ds.forEach(function(x){if(x.b<=0.5&&!res.done[x.id]){res.done[x.id]=res.months;x.b=0;res.order.push(x.id)}});
    res.series.push(tot());
    if(m==='min'&&res.months>=12&&res.series[res.months]>=res.series[res.months-12]-1){res.never=true;break}
  }
  if(res.months>=600)res.never=true;
  return res;
}
function simInput(){return FN().debts.map(function(d){return {id:d.id,n:d.n,b:debtNow(d),r:rateOf(d).r,min:minOf(d)}}).filter(function(x){return x.b>0})}
function monthsTxt(n){var y=Math.floor(n/12),m=n%12;return (y?y+(y===1?' año':' años'):'')+(y&&m?' y ':'')+(m?m+(m===1?' mes':' meses'):'')||'0 meses'}
function freeDate(n){var x=new Date();x.setDate(1);x.setMonth(x.getMonth()+n);return x.toLocaleDateString('es-CL',{month:'long',year:'numeric'})}

function payoffChart(a,b){ // a: plan elegido, b: solo mínimos
  var W=320,H=150,P=8,n=Math.max(a.months,b.never?Math.round(a.months*2)||24:b.months,1),top=Math.max(a.series[0],1);
  var pts=function(s){var o=[];for(var i=0;i<=n;i++){var v=i<s.length?s[i]:(s===b.series&&b.never?s[s.length-1]:0);o.push((P+(W-2*P)*i/n).toFixed(1)+','+(H-P-(H-2*P)*Math.min(v,top*1.2)/(top*1.2)).toFixed(1))}return o.join(' ')};
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Deuda total mes a mes: con tu plan llegas a cero en '+monthsTxt(a.months)+'" style="width:100%;height:auto;display:block">'+
    '<line x1="'+P+'" y1="'+(H-P)+'" x2="'+(W-P)+'" y2="'+(H-P)+'" stroke="var(--line)"/>'+
    '<polyline fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 4" points="'+pts(b.series)+'"/>'+
    '<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" points="'+pts(a.series)+'"/></svg>'+
    '<div class="legend"><span><i class="lg-line"></i>Tu plan</span><span><i class="lg-line" style="background:repeating-linear-gradient(90deg,var(--muted) 0 4px,transparent 4px 7px)"></i>Solo pago mínimo</span><span>'+monthsTxt(n)+' en el eje</span></div>';
}

/* Más: pestañas */
function viewMas(){
  var s=/^(datos|cal|pasos|foto)$/.test(ui.msub||'')?ui.msub:'belleza',o=header('Belleza, calendario, pasos, fotos y respaldo','Más');
  o+='<div class="seg cu" role="group" aria-label="Secciones de Más">'+MSUBS.map(function(x){return '<button type="button" data-act="msub" data-v="'+x[0]+'" aria-pressed="'+(s===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  if(s==='datos')o+=viewRespaldo();else if(s==='foto')o+=viewFoto();else if(s==='cal')o+=viewCal();else if(s==='pasos')o+=viewPasos();else o+=listSection('Belleza · últimos 30 días',recent(function(l){return l.module==='Belleza'},30),'Sin rutinas de belleza anotadas.');
  return o+'<p class="disc">Finanzas ahora tiene su propia pestaña abajo. Esta sección se abre con la «C» de arriba.</p>';
}
function viewRespaldo(){
  var mail=auth.user&&auth.user.email?esc(auth.user.email):'';
  return (auth.fresh?'<div class="note" style="flex-direction:column;align-items:stretch"><b>Trae tus datos del artefacto</b><span>Copia el respaldo que guardaste en Notas, pégalo abajo y toca Restaurar. Las fotos y los PDF de exámenes se vuelven a subir a mano.</span></div>':'')+
    '<section><div class="sh"><h2>Dónde se guardan tus datos</h2></div><p class="muted" style="font-size:.88rem">'+
    (cloud.status==='nube'?'<b style="color:var(--ok)">Guardado en tu cuenta de Aura.</b> Lo que anotas se guarda en tu base de datos privada y aparece igual en todos tus dispositivos. Solo tú puedes verlo.':
     cloud.status==='error'?'<b class="late">Sin conexión.</b> Lo último quedó guardado en este dispositivo y se sube con tu próximo cambio.':
     cloud.status==='cargando'?'Conectando con tu cuenta…':
     'No se pudo cargar la conexión con tu cuenta. Por ahora se guarda solo en este dispositivo.')+
    ' También puedes copiar un respaldo y guardarlo en tus notas.</p>'+
    '<div class="btns"><button class="btn line sm" type="button" data-act="copy">Copiar respaldo</button></div>'+
    '<div class="field"><label class="label" for="f-restore">Pegar un respaldo para restaurarlo</label><textarea id="f-restore" spellcheck="false"></textarea></div>'+
    '<div class="btns"><button class="btn line sm" type="button" data-act="restore">Restaurar</button></div></section>'+
    (mail?'<section><div class="sh"><h2>Tu cuenta</h2></div><div class="row"><div class="grow"><div class="ttl">'+mail+'</div><div class="meta">Al cerrar sesión se borra la copia de este dispositivo. Tus datos quedan en tu cuenta.</div></div><button class="btn line sm" type="button" data-act="logout">Cerrar sesión</button></div></section>':'');
}

function dueLine(st){
  if(!st)return '';
  var when=st.late?'<span class="late">Venció el '+dshort(st.date)+'</span>':st.days===0?'<span class="late">Vence hoy</span>':'Vence '+dshort(st.date)+(st.days<=7?' · en '+st.days+(st.days===1?' día':' días'):'');
  return when+' · mínimo '+clp(st.need)+(st.paid?' · pagado '+clp(st.paid):'');
}
function payRow(x){
  var st=x.s,d=x.d;
  return '<div class="row"><div class="grow"><div class="ttl">'+esc(d.n)+'</div><div class="meta">'+dueLine(st)+'</div></div>'+(st.late?'<span class="badge warn">Atrasado</span>':dueBadge(st.date))+'<button class="btn acc sm" type="button" data-act="dpay" data-id="'+d.id+'">Pagué</button></div>';
}
function finTipText(){
  var u=upcomingPays(2)[0];if(!u)return '';
  return u.s.late?'El pago de '+esc(u.d.n)+' venció el '+dshort(u.s.date)+'. Si ya pagaste, anótalo en Finanzas · Deudas.':'El pago de '+esc(u.d.n)+(u.s.days===0?' vence hoy':u.s.days===1?' vence mañana':' vence en 2 días')+'. El mínimo es '+clp(u.s.need)+'.';
}
function finTodayHtml(){
  var ps=upcomingPays(5);if(!ps.length)return '';
  return '<section><div class="sh"><h2>Pagos de tarjetas</h2><button class="link" type="button" data-act="godeudas">Deudas</button></div>'+ps.map(payRow).join('')+'</section>';
}
function debtCalUrl(d,st){
  var D=parseInt(d.due,10),t=T(),dd=st?st.date:dueOn(+t.slice(0,4),+t.slice(5,7)-1,D);
  return gcalUrl('Pagar '+d.n,dd,'','Día de pago de '+d.n+'. Revisa el mínimo en tu estado de cuenta y anótalo en la app.')+'&recur='+encodeURIComponent('RRULE:FREQ=MONTHLY');
}
/* Deudas (rediseño v16): fichas plegables agrupadas por tipo. Cerrada, la ficha muestra apodo, deuda de hoy y estado del pago;
   abierta, el detalle completo. Qué ficha está abierta se recuerda en este dispositivo (FUI.d). Plan de salida y Cuotas también se pliegan (FUI.s). */
function debtBadge(d,st,now){
  if(now<=0)return '<span class="badge ok">Pagada</span>';
  if(!st)return d.due?'':'<span class="badge mut">Sin día de pago</span>';
  if(st.late)return '<span class="badge warn">Atrasado</span>';
  if(st.ok)return '<span class="badge ok">Al día</span>';
  return dueBadge(st.date);
}
function debtCard(d){
  var now=debtNow(d),rt=rateOf(d),st=dueStatus(d),ps=paysOf(d.id),open=!!FUI.d[d.id],o='';
  var meta=st?(st.late?'Venció el '+dshort(st.date)+' · mínimo '+clp(st.need):st.ok?'Mínimo cubierto · próximo pago '+dshort(st.date):'Vence el '+dshort(st.date)+' · mínimo '+clp(st.need)):(now<=0?'Sin saldo':d.due?'':'Agrega el día de pago');
  o+='<div class="glass debt'+(open?' open':'')+'"><button class="dsum" type="button" data-act="dtog" data-id="'+d.id+'" aria-expanded="'+open+'"><span class="grow"><span class="ttl">'+esc(d.n)+'</span><span class="meta">'+esc(meta)+'</span></span><span class="damt"><b>'+clp(now)+'</b>'+debtBadge(d,st,now)+'</span>'+CHEV+'</button>';
  if(d.cupo>0&&now>0){var u=Math.min(100,Math.round(now*100/d.cupo));o+='<div class="bar dcup" role="progressbar" aria-label="Cupo usado de '+esc(d.n)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+u+'"><span style="width:'+u+'%;'+(u>=90?'background:var(--warn)':'')+'"></span></div>'}
  if(open){
    o+='<div class="dbody">';
    o+='<p class="meta">'+tyName(d.ty)+(d.upd?' · estado de cuenta del '+dshort(d.upd):'')+(now<(d.bal||0)?' · era '+clp(d.bal):'')+(d.cupo>0?' · usas '+Math.min(100,Math.round(now*100/d.cupo))+' % de '+clp(d.cupo):'')+'</p>';
    o+=facts([['Pago mínimo',clp(minOf(d))+(d.min>0?'':' (estimado)')],['Facturado del mes',d.fact>0?clp(d.fact):''],['Tasa',rt.txt],['Intereses al mes',now?'≈ '+clp(now*rt.r):''],['Próximo pago',st?dueLine(st):d.due?'':'Agrega el día de pago']]);
    if(rt.est)o+='<p class="meta late">Sin tasa anotada: uso '+pctTxt(RATE0)+' mensual. Cópiala de tu estado de cuenta («tasa de interés vigente», rotativo).</p>';
    var cs=d.cuotas.filter(function(c){return cuotaLeft(d,c)>0});
    if(cs.length)o+='<div><p class="label">Compras en cuotas · '+clp(cs.reduce(function(s,c){return s+(c.v||0)},0))+' al mes</p>'+cs.map(function(c){var l=cuotaLeft(d,c);return '<div class="row"><div class="grow"><div class="ttl">'+esc(c.n||'Compra en cuotas')+'</div><div class="meta">Faltan '+l+(c.tot?' de '+c.tot:'')+' · termina '+monthLabel(l-1)+'</div></div><b class="mvamt">'+clp(c.v||0)+'</b></div>'}).join('')+'</div>';
    if(d.note)o+='<p class="meta">'+esc(d.note)+'</p>';
    o+='<div class="btns"><button class="btn acc sm" type="button" data-act="dpay" data-id="'+d.id+'">Anotar pago</button><button class="btn line sm" type="button" data-act="dedit" data-id="'+d.id+'">Editar</button></div>';
    if(d.due)o+='<a class="link" href="'+esc(debtCalUrl(d,st))+'" target="_blank" rel="noopener" style="align-self:flex-start;display:inline-flex;align-items:center">Aviso mensual en Google Calendar</a>';
    if(ps.length){
      o+='<details class="dh"><summary class="meta">Pagos anotados ('+ps.length+')</summary>';
      ps.slice(0,12).forEach(function(p){o+='<div class="row"><div class="grow"><div class="ttl">'+clp(p.amt)+'</div><div class="meta">'+dshort(p.date)+' '+p.date.slice(0,4)+((p.at||0)>(d.updAt||0)?'':' · ya incluido en el estado de cuenta')+'</div></div>'+delBtn(p.id,'pay')+'</div>'});
      o+='</details>';
    }
    o+='</div>';
  }
  return o+'</div>';
}
function viewDeudas(){
  var F=FN(),ds=F.debts,o='';
  if(!ds.length){
    o+='<div class="glass cycard"><div><h2>Ordena tus <em>deudas</em></h2><p class="muted" style="font-size:.9rem;margin-top:4px">Agrega cada tarjeta o crédito con los datos de su último estado de cuenta. Con eso verás cuánto debes en total, cuándo vence cada pago y en qué fecha podrías quedar libre.</p></div>'+
      '<div class="parse"><p class="label">Qué copiar del estado de cuenta</p><ul class="clist"><li>Monto total facturado y deuda total</li><li>Monto mínimo a pagar</li><li>Fecha «pagar hasta»</li><li>Tasa de interés vigente (rotativo, mensual) o CAE</li><li>Cupo total</li><li>Compras en cuotas: valor de la cuota y cuántas faltan</li></ul><p class="meta">No necesitas el número de tarjeta. Usa un apodo, como «CMR» o «la del banco».</p></div>'+
      '<div class="btns"><button class="btn acc" type="button" data-act="dnew">Agregar tarjeta o deuda</button><button class="btn line" type="button" data-act="clopen">Pegar desde Claude</button></div></div>';
    return o+'<p class="disc">Los cálculos son estimaciones con tus datos y algunos supuestos. No reemplazan la asesoría de un profesional.</p>';
  }
  var act=ds.filter(function(d){return debtNow(d)>0}),paidOff=ds.filter(function(d){return debtNow(d)<=0});
  var total=act.reduce(function(s,d){return s+debtNow(d)},0),mins=act.reduce(function(s,d){return s+minOf(d)},0),intr=act.reduce(function(s,d){return s+debtNow(d)*rateOf(d).r},0);
  var mk=T().slice(0,7),paidM=sumAmt(state.logs.filter(function(l){return l.kind==='money'&&l.dir!=='ingreso'&&!l.fx&&l.cat==='Deudas'&&mkOf(l.date)===mk}));
  o+='<div class="glass dtot"><div><p class="label">Deuda total hoy</p><p class="big">'+clp(total)+'</p><p class="meta">'+act.length+(act.length===1?' deuda activa':' deudas activas')+(intr?' · ≈ '+(total?Math.round(intr*100/Math.max(mins,1)):0)+' % de los mínimos se va en intereses':'')+'</p></div>'+
    '<div class="mini" style="padding:0"><div><b>'+clp(mins)+'</b><span class="meta">mínimos del mes</span></div><div><b>'+clp(paidM)+'</b><span class="meta">pagado en '+mkName(mk)+'</span></div><div><b>≈ '+clp(intr)+'</b><span class="meta">intereses al mes</span></div></div></div>';
  o+='<button class="btn line" type="button" data-act="clopen">Pegar estado de cuenta desde Claude</button>';
  var ps=upcomingPays(31);
  o+=csec('dpays','Próximos <em>pagos</em>',ps.length?ps.length+(ps.length===1?' pendiente':' pendientes'):'al día',(ps.length?ps.map(payRow).join(''):'<div class="empty">'+(act.some(function(d){return d.due})?'Todo al día. Los pagos del mes ya cubren el mínimo.':'Agrega el día de pago de cada tarjeta para ver aquí sus vencimientos.')+'</div>'),true);
  var anyOpen=ds.some(function(d){return FUI.d[d.id]});
  o+='<section><div class="sh"><h2>Tus <em>deudas</em></h2><span class="orgtools"><button class="link" type="button" data-act="dall" data-v="'+(anyOpen?'0':'1')+'">'+(anyOpen?'Cerrar todas':'Abrir todas')+'</button><button class="link" type="button" data-act="dnew">Agregar</button></span></div>';
  DTY.forEach(function(ty){
    var l=act.filter(function(d){return (d.ty||'tc')===ty[0]}).sort(function(a,b){return debtNow(b)-debtNow(a)});if(!l.length)return;
    o+='<div class="dgrp"><p class="label dgl"><span>'+DTYP[ty[0]]+'</span><span>'+clp(l.reduce(function(s,d){return s+debtNow(d)},0))+'</span></p><div class="dlist">'+l.map(debtCard).join('')+'</div></div>';
  });
  if(paidOff.length)o+='<details class="fin"><summary>Pagadas ('+paidOff.length+')</summary><div class="dlist">'+paidOff.map(debtCard).join('')+'</div></details>';
  o+='</section>';
  o+=planHtml();
  o+=cuotasHtml();
  return o+'<p class="disc">Los cálculos son estimaciones con tus datos y algunos supuestos. No reemplazan la asesoría de un profesional. Si las cuotas ya no te alcanzan, en Chile existe la renegociación gratuita ante la Superintendencia de Insolvencia y Reemprendimiento.</p>';
}
function planHtml(){
  var F=FN(),li=simInput();if(!li.length)return '';
  var minSum=li.reduce(function(s,x){return s+x.min},0),bud=F.plan.budget>0?F.plan.budget:minSum,m=F.plan.m==='bn'?'bn':'av';
  var av=simulate(li,bud,'av'),bn=simulate(li,bud,'bn'),mn=simulate(li,0,'min'),cur=m==='av'?av:bn;
  var o='<div class="glass plan">',aside=cur.short?'no alcanza para los mínimos':'libre en '+freeDate(cur.months);
  o+='<form id="plan-form" class="field" style="gap:10px"><label class="label" for="f-budget">¿Cuánto puedes pagar al mes en total?</label><div style="display:flex;gap:8px"><input id="f-budget" type="text" inputmode="numeric" autocomplete="off" value="'+esc(n0(bud))+'"><button class="btn sm" type="submit" style="min-height:48px">Calcular</button></div>'+
    '<div class="chips" role="group" aria-label="Montos rápidos">'+[[0,'Solo mínimos'],[20000,'+20 mil'],[50000,'+50 mil'],[100000,'+100 mil']].map(function(c){var v=minSum+c[0];return '<button class="chip" type="button" data-act="dbud" data-v="'+v+'" aria-pressed="'+(Math.round(bud)===Math.round(v))+'">'+c[1]+'</button>'}).join('')+'</div><p class="meta">La suma de tus mínimos es '+clp(minSum)+'. Lo que pongas por sobre eso acelera la salida.</p></form>';
  if(cur.short){return csec('plan','Plan de <em>salida</em>',aside,o+'<div class="note"><span>Ese monto no alcanza a cubrir los mínimos: faltan '+clp(cur.short)+'. Pagar menos del mínimo genera intereses de mora y gastos de cobranza.</span></div></div>',false)}
  var card=function(k,r,t,sub){var best=(k==='av'?av.interest<=bn.interest:bn.interest<av.interest);return '<button type="button" class="sim'+(m===k?' on':'')+'" data-act="dmeth" data-v="'+k+'" aria-pressed="'+(m===k)+'"><span class="label">'+t+(best?' · menos intereses':'')+'</span><b>'+monthsTxt(r.months)+'</b><span class="meta">libre en '+freeDate(r.months)+'</span><span class="meta">Intereses ≈ '+clp(r.interest)+'</span><span class="meta">'+sub+'</span></button>'};
  o+='<div class="sims">'+card('av',av,'Avalancha','Primero la de tasa más alta')+card('bn',bn,'Bola de nieve','Primero la deuda más chica')+'</div>';
  var diff=Math.abs(av.interest-bn.interest);
  o+='<p class="meta">'+(diff<1000?'Con tus deudas, las dos estrategias cuestan casi lo mismo. Elige la que te mantenga motivada.':'Avalancha te ahorra ≈ '+clp(diff)+(av.months!==bn.months?' y '+monthsTxt(Math.abs(bn.months-av.months))+' ':' ')+'en intereses. Bola de nieve te da victorias más rápidas.')+'</p>';
  o+=payoffChart(cur,mn);
  o+='<div class="parse" style="gap:4px">'+(mn.never?'<p><b>Solo con el pago mínimo, la deuda casi no baja.</b> Los intereses se comen casi todo el mínimo.</p>':'<p><b>Solo con el pago mínimo:</b> '+monthsTxt(mn.months)+' e intereses ≈ '+clp(mn.interest)+'.</p><p class="meta">Con tu plan pagas ≈ '+clp(Math.max(0,mn.interest-cur.interest))+' menos en intereses.</p>')+'</div>';
  o+='<p class="label" style="margin-top:6px">Orden de pago</p>';
  cur.order.forEach(function(id,i){var d=debtById(id);if(!d)return;o+='<div class="row"><span class="badge">'+(i+1)+'</span><div class="grow"><div class="ttl">'+esc(d.n)+'</div><div class="meta">'+(i===0?'Aquí va todo lo extra. ':'')+'Pagada en '+freeDate(cur.done[id])+' · '+rateOf(d).txt+'</div></div></div>'});
  o+='<p class="disc">Supuestos: la tasa se aplica a toda la deuda (las compras en cuotas sin interés hacen que el costo real sea algo menor) y el pago mínimo se mantiene fijo. En la práctica el mínimo baja cuando debes menos, así que pagar solo el mínimo demora todavía más. Mientras sigas el plan, no sumes compras nuevas a las tarjetas.</p>';
  return csec('plan','Plan de <em>salida</em>',aside,o+'</div>',false);
}
function cuotasHtml(){
  var cm=cuotasMonth(),mm=cm.v;if(!mm.length)return '';
  var o='<div class="glass" style="padding:6px 16px 10px">';
  for(var k=0;k<mm.length;k++){var v=mm[k],fr=k?mm[k-1]-v:0;if(k&&!fr&&k<mm.length-1)continue;var p=Math.round(v*100/mm[0]);
    o+='<div class="row" style="flex-direction:column;align-items:stretch;gap:6px"><div class="stat"><span style="font-weight:600">'+monthLabel(cm.start+k).replace(/^./,function(c){return c.toUpperCase()})+'</span><b>'+clp(v)+'</b></div><div class="bar"><span style="width:'+p+'%"></span></div>'+(fr>0?'<span class="meta" style="color:var(--ok)">Se liberan '+clp(fr)+' al mes</span>':'')+'</div>';
    if(!v)break;}
  return csec('cuotas','Cuotas que se <em>liberan</em>',clp(mm[0])+' al mes',o+'</div><p class="meta">Monto en cuotas que te cobran cada mes. Solo aparecen los meses en que algo cambia. Cuando una compra termina, ese monto puede ir a tu plan de salida.</p>',false);
}
/* Hojas */
var FS={
  debt:function(){
    var f=ui.form,num='type="text" inputmode="numeric" autocomplete="off"',dec='type="text" inputmode="decimal" autocomplete="off"';if(!Array.isArray(f.cuotas))f.cuotas=[];
    var o=cHead(f.did?'Editar <em>deuda</em>':'Nueva <em>deuda</em>','Con los datos de tu último estado de cuenta.');
    o+='<form id="debt-form" class="field" style="gap:12px">'+fIn('n','Apodo','type="text" required maxlength="40" placeholder="Ej: CMR, Ripley, la del banco"')+fSel('ty','Tipo',DTY)+
      '<div class="two">'+fIn('bal','Deuda total ($)',num+' required placeholder="1.250.000"')+fIn('min','Pago mínimo ($)',num+' placeholder="85.000"')+'</div>'+
      '<div class="two">'+fIn('fact','Facturado del mes ($)',num+' placeholder="Opcional"')+fIn('due','Día de pago','type="number" inputmode="numeric" min="1" max="31" placeholder="Ej: 5"')+'</div>'+
      '<div class="two">'+fIn('rate','Tasa mensual (%)',dec+' placeholder="Ej: 2,9"')+fIn('cae','CAE anual (%)',dec+' placeholder="Opcional"')+'</div>'+
      '<div class="two">'+fIn('cupo','Cupo total ($)',num+' placeholder="Opcional"')+fIn('upd','Fecha del estado de cuenta','type="date" max="'+T()+'"')+'</div>'+
      '<p class="meta">La tasa mensual aparece como «tasa de interés vigente» o «rotativo». Si solo tienes el CAE, la calculo desde ahí.</p>'+
      '<div class="field"><span class="label">Compras en cuotas</span>';
    if(!f.cuotas.length)o+='<p class="meta">Opcional. Sirve para ver cuándo se liberan montos.</p>';
    f.cuotas.forEach(function(c,i){o+='<div class="row"><div class="grow"><div class="ttl">'+esc(c.n||'Compra en cuotas')+'</div><div class="meta">'+clp(c.v||0)+' al mes · faltan '+c.left+(c.tot?' de '+c.tot:'')+'</div></div><button class="x" type="button" data-act="dcqdel" data-v="'+i+'">Quitar</button></div>'});
    o+='<button class="btn line sm" type="button" data-act="dcq">Agregar compra en cuotas</button></div>'+
      fIn('note','Nota (opcional)','type="text" maxlength="100"')+
      '<div class="btns"><button class="btn acc" type="submit">Guardar</button>'+(f.did?'<button class="btn line" type="button" data-act="ddel" style="'+(ui.hdel?'color:var(--warn);border-color:var(--warn)':'')+'">'+(ui.hdel?'Toca de nuevo para borrar':'Borrar')+'</button>':'')+'</div></form>';
    return o;
  },
  dcuota:function(){
    var num='type="text" inputmode="numeric" autocomplete="off"';
    return cHead('Compra en <em>cuotas</em>','Copia la línea del detalle de cuotas.')+'<form id="dcuota-form" class="field" style="gap:12px">'+fIn('n','Qué compraste','type="text" maxlength="50" placeholder="Ej: Notebook"')+fIn('v','Valor de la cuota ($)',num+' required')+'<div class="two">'+fIn('left','Cuotas que faltan',num+' required placeholder="Incluida la de este mes"')+fIn('tot','Total de cuotas',num+' placeholder="Opcional"')+'</div><p class="meta">Ejemplo: si el estado dice «cuota 4 de 12», faltan 9 (la 4 y ocho más).</p><div class="btns"><button class="btn acc" type="submit">Agregar</button></div></form>';
  },
  dpay:function(){
    var f=ui.form,ds=FN().debts;
    if(!ds.length)return cHead('Pago de <em>deuda</em>','')+'<p class="muted">Primero agrega tus tarjetas o deudas en Finanzas · Deudas.</p><button class="btn acc" type="button" data-act="dnew">Agregar tarjeta o deuda</button>';
    if(!f.did||!debtById(f.did))f.did=ds[0].id;
    var d=debtById(f.did),st=dueStatus(d),mn=minOf(d),ch=[[String(Math.round(mn)),'Mínimo · '+clp(mn)]];
    if(d.fact>0)ch.push([String(d.fact),'Facturado · '+clp(d.fact)]);
    var now=debtNow(d);if(now>0&&now!==d.fact&&now!==mn)ch.push([String(Math.round(now)),'Todo · '+clp(now)]);
    var o=cHead('Anotar <em>pago</em>',st?dueLine(st):'');
    o+='<form id="dpay-form" class="field" style="gap:12px">'+fSel('did','Deuda',ds.map(function(x){return [x.id,x.n]})).replace('data-f="did"','data-f="did" data-rer="1"')+
      '<div class="chips" role="group" aria-label="Montos rápidos">'+ch.map(function(c){return '<button class="chip" type="button" data-act="dpamt" data-v="'+c[0]+'" aria-pressed="'+(String(amountOf(f.amt))===c[0])+'">'+c[1]+'</button>'}).join('')+'</div>'+
      '<div class="two">'+fIn('amt','Monto pagado ($)','type="text" inputmode="numeric" autocomplete="off" required')+ldField()+'</div>'+
      '<p class="meta">Se descuenta de lo que debes y queda como gasto en la categoría Deudas.</p><div class="btns"><button class="btn acc" type="submit">Guardar</button></div></form>';
    return o;
  }
};
function debtForm(d){
  if(!d)return {direct:true,ty:'tc',upd:T(),cuotas:[]};
  var s=function(x){return x>0?n0(x):''};
  return {direct:true,did:d.id,n:d.n,ty:d.ty||'tc',bal:s(d.bal),min:s(d.min),fact:s(d.fact),due:d.due?String(d.due):'',rate:d.rate>0?dc(d.rate):'',cae:d.cae>0?dc(d.cae):'',cupo:s(d.cupo),upd:d.upd||'',note:d.note||'',cuotas:d.cuotas.map(function(c){return {id:c.id,n:c.n,v:c.v,left:cuotaLeft(d,c),tot:c.tot}})};
}
function addDebtPay(d,amt,date){
  var p={id:uid(),did:d.id,date:date,amt:amt,at:Date.now()},tm=date===T()?nowHM():'12:00';
  var l={kind:'money',module:'Finanzas',title:'Pago '+d.n,amount:amt,dir:'gasto',cat:'Deudas',did:d.id,pid:p.id,date:date,time:tm};
  addLog(l);p.lid=l.id;FN().pays.push(p);return p;
}
function delPay(pid){var F=FN(),p=F.pays.filter(function(x){return x.id===pid})[0];F.pays=F.pays.filter(function(x){return x.id!==pid});state.logs=state.logs.filter(function(l){return !(l.pid===pid||(p&&p.lid&&l.id===p.lid))})}
function finSubmit(fm){
  var id=fm.id,f=ui.form;
  if(id==='plan-form'){var b=amountOf($('f-budget').value);FN().plan.budget=b;save();render();toast(b?'Plan calculado con '+clp(b)+' al mes':'Escribe un monto');return true}
  if(/^(inc|salary|fixed|fxpay|claude)-form$/.test(id)){gsnap();return fin16Submit(id)}
  if(!/^(debt|dcuota|dpay)-form$/.test(id))return false;
  gsnap();
  if(id==='dcuota-form'){
    var v=amountOf(f.v),left=parseInt(f.left,10)||0;if(!v||left<1){toast('Escribe el valor de la cuota y cuántas faltan');return true}
    var r=ui.ret;if(!r){closeSheet();return true}
    r.form.cuotas.push({id:uid(),n:String(f.n||'').trim(),v:v,left:left,tot:parseInt(f.tot,10)||0});
    ui.ret=null;ui.form=r.form;ui.hdel=false;ui.sheet=r.sheet;renderSheet();toast('Compra en cuotas agregada');return true;
  }
  if(id==='dpay-form'){
    var d=debtById(f.did),a=amountOf(f.amt),dt=($('f-ldate')&&$('f-ldate').value)||T();
    if(!d)return true;if(!a){toast('Escribe el monto que pagaste');return true}if(dt>T()){toast('Elige una fecha de hoy o anterior');return true}
    addDebtPay(d,a,dt);var left=debtNow(d);done(left>0?'Pago anotado · te quedan '+clp(left)+' en '+d.n:'¡'+d.n+' quedó en cero!');return true;
  }
  var n=String(f.n||'').trim(),bal=amountOf(f.bal);
  if(!n){toast('Ponle un apodo');return true}
  var F=FN(),d0=f.did?debtById(f.did):null,d=d0||{id:uid(),cuotas:[]};
  var upd=f.upd&&f.upd<=T()?f.upd:T(),changed=!d0||d0.bal!==bal||d0.upd!==upd;
  var due=parseInt(f.due,10);
  d.n=n;d.ty=f.ty||'tc';d.bal=bal;d.min=amountOf(f.min);d.fact=amountOf(f.fact);d.due=due>=1&&due<=31?due:0;
  d.rate=Math.max(0,Math.min(20,numOf(f.rate)));d.cae=Math.max(0,Math.min(300,numOf(f.cae)));d.cupo=amountOf(f.cupo);d.note=String(f.note||'').trim();
  if(changed){d.upd=upd;d.updAt=Date.now()}
  // Las cuotas del formulario vienen contadas a hoy; se guardan contadas desde el estado de cuenta actual.
  var ds=duesSince(d);d.cuotas=(f.cuotas||[]).map(function(c){return {id:c.id||uid(),n:c.n||'',v:c.v||0,left:(parseInt(c.left,10)||0)+ds,tot:c.tot||0}});
  if(!d0)F.debts.push(d);
  done(d0?'Deuda actualizada':'Deuda agregada');return true;
}
function finClick(a,b,id){
  var v=b.getAttribute('data-v'),f=ui.form;
  if(fin16Click(a,b,id))return true;
  switch(a){
    case 'msub': ui.msub=v; render(); window.scrollTo(0,0); return true;
    case 'godeudas': closeSheet(); ui.view='fin'; ui.fsub='deudas'; render(); window.scrollTo(0,0); return true;
    case 'dnew': ui.ret=null; goSheet('debt',debtForm(null)); return true;
    case 'dedit': var de=debtById(id); if(de){ui.ret=null;goSheet('debt',debtForm(de))} return true;
    case 'dcq': gsnap(); ui.ret={sheet:'debt',form:ui.form}; goSheet('dcuota',{}); return true;
    case 'dcqdel': gsnap(); (f.cuotas||[]).splice(+v,1); rerender(); return true;
    case 'ddel': if(!ui.hdel){ui.hdel=true;rerender();return true} var F=FN(),did=f.did; F.debts=F.debts.filter(function(x){return x.id!==did}); F.pays.filter(function(p){return p.did===did}).forEach(function(p){delPay(p.id)}); done('Deuda borrada'); return true;
    case 'dpay': ui.ret=null; goSheet('dpay',{direct:true,did:id||'',amt:'',ldate:T()}); return true;
    case 'dpamt': ui.form.amt=n0(+v); var pae=$('h-amt'); if(pae)pae.value=ui.form.amt; rerender(); return true;
    case 'dmeth': FN().plan.m=v; save(); render(); return true;
    case 'dbud': FN().plan.budget=+v; save(); render(); return true;
    case 'delok': if(b.getAttribute('data-k')==='pay'){delPay(id);ui.pend=null;save();render();toast('Pago borrado');return true} return false;
  }
  return false;
}
/* Texto libre: «pagué 80 lucas de la CMR» → pago de esa deuda (busca el apodo en la frase). */
function matchDebt(s){var fs=fold(s);return FN().debts.filter(function(d){var w=fold(d.n).split(/\s+/).filter(function(x){return x.length>=3&&!/^(la|del|de|el|los|las)$/.test(x)});return w.length&&fs.indexOf(fold(d.n))>-1||w.some(function(x){return new RegExp('\\b'+x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(fs)})})[0]}

/* ---------- Finanzas (versión 16): pestaña propia en la barra inferior ----------
   Pestañas (ui.fsub): resumen · gastos · fijos · deudas. Más (Belleza y Respaldo) se abre con el botón «C» del encabezado.
   state.fin suma (normFin):
     inc:   {sal (sueldo líquido esperado), day (día en que llega, 1–31), mode: 'sig' (llega a fin de mes y se usa el mes siguiente) | 'mes', cap (tope para gastos del día a día, opcional)}
     fixed: [{id, n, amt (monto al mes), day (día de pago 1–31, opcional), cat, auto (cargo automático), note, on (activo), paidMk:['AAAA-MM'] (meses marcados pagados sin anotar gasto)}]
   Movimientos (logs kind:'money'): el sueldo es dir:'ingreso', cat:'Sueldo'. El pago de un fijo lleva fx (id del fijo).
   Mes de presupuesto (budKey): con mode 'sig', un sueldo que llega desde el día 20 cuenta para el mes siguiente. Todo lo demás cuenta en el mes de su fecha.
   Disponible del mes = ingresos (o el sueldo esperado si aún no se anota) − fijos (lo pagado, o el monto si falta pagar)
                        − deudas (lo mayor entre el plan de salida o la suma de mínimos y lo ya pagado) − gastos del día a día (todo lo demás). */
var ICATS=['Sueldo','Reembolso','Aporte','Venta','Otros'];
var FSUBS=[['resumen','Resumen'],['gastos','Gastos'],['fijos','Fijos'],['deudas','Deudas']];
var FXIDEAS=[['Instituto','Estudio'],['Internet','Hogar'],['Teléfono','Hogar'],['Gas','Hogar'],['Comida de la casa','Supermercado'],['Movilización','Transporte'],['Medicamentos','Salud'],['Comida de los perros','Mascotas'],['iCloud','Suscripciones'],['Google One','Suscripciones']];
var DTYP={tc:'Tarjetas de crédito',lc:'Líneas de crédito',cc:'Créditos de consumo',otro:'Otras deudas'};
var CHEV='<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
// Qué fichas y secciones de Finanzas están abiertas: preferencia de este dispositivo (no viaja a la nube).
var FUI=(function(){try{var x=JSON.parse(localStorage.getItem('aura-fin-ui'));return x&&typeof x==='object'?x:{}}catch(e){return {}}})();
if(!FUI.d||typeof FUI.d!=='object')FUI.d={};if(!FUI.s||typeof FUI.s!=='object')FUI.s={};
function saveFUI(){try{localStorage.setItem('aura-fin-ui',JSON.stringify(FUI))}catch(e){}}
function INC(){return FN().inc}
function mkOf(ds){return String(ds||'').slice(0,7)}
function mkAdd(mk,n){var d=new Date(+mk.slice(0,4),+mk.slice(5,7)-1+n,1);return d.getFullYear()+'-'+pad(d.getMonth()+1)}
function dueMk(mk,D){return dueOn(+mk.slice(0,4),+mk.slice(5,7)-1,D)}
function curMk(){return mkAdd(T().slice(0,7),Math.min(0,ui.fmon||0))}
function mkName(mk,yr){return new Date(+mk.slice(0,4),+mk.slice(5,7)-1,1).toLocaleDateString('es-CL',yr?{month:'long',year:'numeric'}:{month:'long'})}
function isSal(l){return l.kind==='money'&&l.dir==='ingreso'&&l.cat==='Sueldo'}
function budKey(l){var mk=mkOf(l.date);if(isSal(l)&&INC().mode==='sig'&&+String(l.date).slice(8,10)>=20)return mkAdd(mk,1);return mk}
function moneyIn(mk){return state.logs.filter(function(l){return l.kind==='money'&&l.date&&budKey(l)===mk})}
function sumAmt(l){return l.reduce(function(s,x){return s+(+x.amount||0)},0)}
function salDate(mk){var I=INC(),D=parseInt(I.day,10)||30;return dueMk(I.mode==='sig'?mkAdd(mk,-1):mk,D)}
function salHist(){return state.logs.filter(isSal).sort(function(a,b){return a.date<b.date?1:-1})}
function fixById(id){return FN().fixed.filter(function(x){return x.id===id})[0]}
function fixedLogs(x,mk){return state.logs.filter(function(l){return l.kind==='money'&&l.fx===x.id&&mkOf(l.date)===mk})}
function fixedDone(x,mk){return fixedLogs(x,mk).length>0||(x.paidMk||[]).indexOf(mk)>-1}
function fixedPaid(x,mk){var l=fixedLogs(x,mk);return l.length?sumAmt(l):((x.paidMk||[]).indexOf(mk)>-1?x.amt:0)}
function fixNext(x){ // próximo cobro del fijo que falta pagar
  if(!x.on||!x.day)return null;var t=T(),mk=t.slice(0,7),due=dueMk(mk,x.day);
  if(!fixedDone(x,mk))return {date:due,late:due<t,days:daysBetween(t,due),mk:mk};
  var nm=mkAdd(mk,1),nd=dueMk(nm,x.day);return {date:nd,late:false,days:daysBetween(t,nd),mk:nm,paidNow:true};
}
function matchFixed(s){var fs=fold(s);return FN().fixed.filter(function(x){if(!x.on)return false;var n=fold(x.n).trim();if(!n)return false;if(new RegExp('\\b'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(fs))return true;return n.split(/\s+/).some(function(w){return w.length>=5&&fs.indexOf(w)>-1})})[0]}
function monthFin(mk){
  var F=FN(),I=F.inc,t=T(),tm=t.slice(0,7),past=mk<tm,cur=mk===tm,ls=moneyIn(mk);
  var sal=ls.filter(isSal),salAmt=sumAmt(sal),oth=sumAmt(ls.filter(function(l){return l.dir==='ingreso'&&!isSal(l)}));
  var salExp=!sal.length&&I.sal>0?I.sal:0,inc=salAmt+oth+salExp;
  var gs=ls.filter(function(l){return l.dir!=='ingreso'}),act={};
  var fx=F.fixed.filter(function(x){return x.on}).map(function(x){act[x.id]=1;var dn=fixedDone(x,mk),pd=fixedPaid(x,mk);return {x:x,done:dn,paid:pd,due:x.day?dueMk(mk,x.day):''}});
  var fxOther=sumAmt(gs.filter(function(l){return l.fx&&!act[l.fx]}));
  var fxTot=fx.reduce(function(s,o){return s+(o.done?o.paid:(past?0:o.x.amt))},0)+fxOther,fxPaid=fx.reduce(function(s,o){return s+o.paid},0)+fxOther;
  var dLogs=gs.filter(function(l){return !l.fx&&l.cat==='Deudas'}),dPaid=sumAmt(dLogs);
  var actD=F.debts.filter(function(d){return debtNow(d)>0}),mins=actD.reduce(function(s,d){return s+minOf(d)},0);
  var dPlan=past?dPaid:(F.plan.budget>0?F.plan.budget:mins),dTot=Math.max(dPlan,dPaid);
  var vLogs=gs.filter(function(l){return !l.fx&&l.cat!=='Deudas'}),vTot=sumAmt(vLogs);
  var nd=new Date(+mk.slice(0,4),+mk.slice(5,7),0).getDate(),dleft=cur?nd-(+t.slice(8,10))+1:0;
  return {mk:mk,past:past,cur:cur,sal:sal,salAmt:salAmt,salExp:salExp,oth:oth,inc:inc,fx:fx,fxTot:fxTot,fxPaid:fxPaid,dPlan:dPlan,dPaid:dPaid,dTot:dTot,mins:mins,vLogs:vLogs,vTot:vTot,gs:gs,ls:ls,left:inc-fxTot-dTot-vTot,dleft:dleft};
}
function monthNav(){
  var off=Math.min(0,ui.fmon||0),mk=curMk();
  return '<div class="daynav"><button type="button" data-act="fmon" data-d="-1" aria-label="Mes anterior">‹</button><b>'+cap(mkName(mk,mk.slice(0,4)!==T().slice(0,4)))+'</b><button type="button" data-act="fmon" data-d="1" aria-label="Mes siguiente"'+(off>=0?' disabled':'')+'>›</button></div>';
}
function csec(k,title,aside,body,def){
  var open=FUI.s[k]!=null?!!FUI.s[k]:!!def;
  return '<section class="csec"><h2 class="csh2"><button class="csh" type="button" data-act="fsec" data-v="'+k+'" aria-expanded="'+open+'"><span class="grow">'+title+'</span>'+(aside?'<span class="meta">'+aside+'</span>':'')+CHEV+'</button></h2>'+(open?body:'')+'</section>';
}
function viewFin(){
  var s=ui.fsub||'resumen',o=header('Sueldo, gastos y deudas','<em>Finanzas</em>');
  o+='<div class="seg cu" role="group" aria-label="Secciones de Finanzas">'+FSUBS.map(function(x){return '<button type="button" data-act="fsub" data-v="'+x[0]+'" aria-pressed="'+(s===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  return o+(s==='gastos'?viewGastos():s==='fijos'?viewFijos():s==='deudas'?viewDeudas():viewFinResumen());
}

/* Resumen del mes */
function flowBar(M){
  var segs=[['Fijos',M.fxTot,'--fat'],['Deudas',M.dTot,'--salud'],['Día a día',M.vTot,'--carb'],['Disponible',Math.max(0,M.left),'--ok']],base=Math.max(M.inc,M.fxTot+M.dTot+M.vTot,1);
  return '<div class="flow" role="img" aria-label="'+esc(segs.map(function(x){return x[0]+' '+clp(x[1])}).join(', '))+'">'+segs.map(function(x){return x[1]>0?'<span style="width:'+(x[1]*100/base).toFixed(2)+'%;background:var('+x[2]+')"></span>':''}).join('')+'</div>'+
    '<div class="fleg">'+segs.map(function(x){return '<span><span><i class="adot" style="background:var('+x[2]+')"></i>'+x[0]+'</span><b>'+clp(x[1])+'</b></span>'}).join('')+'</div>';
}
function upcomingFin(days){
  var out=[];
  upcomingPays(days).forEach(function(x){out.push({k:'d',id:x.d.id,n:x.d.n,date:x.s.date,late:x.s.late,sub:'Mínimo '+clp(x.s.need)+(x.s.paid?' · llevas '+clp(x.s.paid):''),auto:false})});
  FN().fixed.forEach(function(x){var s=fixNext(x);if(!s||s.paidNow)return;if(s.late||s.days<=days)out.push({k:'f',id:x.id,n:x.n,date:s.date,late:s.late,sub:clp(x.amt)+' · '+(x.auto?'cargo automático':'gasto fijo'),auto:!!x.auto})});
  return out.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0});
}
function upRow(u){
  return '<div class="row"><div class="grow"><div class="ttl">'+esc(u.n)+'</div><div class="meta">'+esc(u.sub)+'</div></div>'+(u.late?'<span class="badge warn">Atrasado</span>':dueBadge(u.date))+
    '<button class="btn acc sm" type="button" data-act="'+(u.k==='d'?'dpay':'fxpay')+'" data-id="'+u.id+'">'+(u.auto?'Se cobró':'Pagué')+'</button></div>';
}
function catBars(gs,act,sel){
  var cats={},tot=sumAmt(gs);gs.forEach(function(l){var c=l.cat||'Otros';cats[c]=(cats[c]||0)+(+l.amount||0)});
  var ks=Object.keys(cats).sort(function(a,b){return cats[b]-cats[a]});
  return ks.map(function(c){var p=tot?Math.round(cats[c]*100/tot):0,on=sel===c;
    return '<button type="button" class="catb'+(on?' on':'')+'"'+(act?' data-act="'+act+'" data-v="'+esc(c)+'" aria-pressed="'+on+'"':'')+'><span class="stat"><span>'+esc(c)+'</span><b>'+clp(cats[c])+' <small class="meta">'+p+' %</small></b></span><span class="bar"><span style="width:'+p+'%"></span></span></button>'}).join('');
}
function viewFinResumen(){
  var mk=curMk(),M=monthFin(mk),I=INC(),F=FN(),o=monthNav(),mn=mkName(mk);
  if(!I.sal&&!M.inc){
    o+='<div class="glass cycard"><div><h2>Arma tu <em>mes</em></h2><p class="muted" style="font-size:.9rem;margin-top:4px">Con tu sueldo, tus gastos fijos y tus deudas calculo cuánto te queda para el día a día y cuánto puedes gastar por día.</p></div>'+
      '<ol class="clist"><li>Tu sueldo líquido y el día que llega</li><li>Tus gastos fijos (instituto, internet, teléfono…)</li><li>Tus deudas, que ya están en la pestaña Deudas</li></ol>'+
      '<div class="btns"><button class="btn acc" type="button" data-act="incedit">Agregar mi sueldo</button><button class="btn line" type="button" data-act="fsub" data-v="fijos">Gastos fijos</button></div></div>';
  }
  var neg=M.left<0,perDay=M.cur&&M.left>0?Math.floor(M.left/Math.max(1,M.dleft)):0;
  o+='<div class="glass dtot"><div><p class="label">'+(M.past?'Así cerró '+mn:'Disponible de '+mn)+'</p><p class="big'+(neg?' late':'')+'">'+(neg?'−':'')+clp(Math.abs(M.left))+'</p><p class="meta">'+
    (M.past?(neg?'Gastaste '+clp(-M.left)+' más de lo que entró':'Te sobraron '+clp(M.left)):neg?'Te pasaste por '+clp(-M.left)+'. Revisa los gastos del día a día.':M.inc?'≈ '+clp(perDay)+' por día · quedan '+M.dleft+(M.dleft===1?' día':' días'):'Agrega tu sueldo para calcularlo.')+'</p></div>'+flowBar(M);
  if(I.cap>0){var cp=Math.min(100,Math.round(M.vTot*100/I.cap));o+='<div class="goal"><div class="stat"><span>Tope del día a día</span><b>'+clp(M.vTot)+' de '+clp(I.cap)+'</b></div><div class="bar big"><span style="width:'+cp+'%'+(M.vTot>I.cap?';background:var(--warn)':'')+'"></span></div><p class="meta">'+(M.vTot>I.cap?'Pasaste el tope por '+clp(M.vTot-I.cap):'Te quedan '+clp(I.cap-M.vTot)+' del tope')+'</p></div>'}
  o+='</div>';
  // Cuentas del mes
  var fxN=M.fx.length,fxD=M.fx.filter(function(x){return x.done}).length;
  o+='<section><div class="sh"><h2>Cuentas del <em>mes</em></h2></div><div class="glass" style="padding:6px 16px">'+
    eqRow('Sueldo',M.salAmt||M.salExp?clp(M.salAmt||M.salExp):'—',M.salAmt?(M.sal.length===1?'llegó el '+dshort(M.sal[0].date):M.sal.length+' depósitos'):M.salExp?'esperado el '+dshort(salDate(mk))+' · aún no lo anotas':'sin sueldo anotado')+
    (M.oth?eqRow('Otros ingresos','+'+clp(M.oth),''):'')+
    eqRow('Gastos fijos','−'+clp(M.fxTot),fxN?'pagados '+fxD+' de '+fxN+' · '+clp(M.fxPaid):'aún no agregas fijos')+
    eqRow('Deudas','−'+clp(M.dTot),(M.past?'pagado en el mes':(F.plan.budget>0?'plan de salida':'suma de mínimos')+' · pagado '+clp(M.dPaid)))+
    eqRow('Día a día','−'+clp(M.vTot),M.vLogs.length+(M.vLogs.length===1?' movimiento':' movimientos'))+
    '<div class="eqr tot"><span>Disponible</span><b'+(neg?' class="late"':'')+'>'+(neg?'−':'')+clp(Math.abs(M.left))+'</b></div></div></section>';
  // Sueldo
  var hs=salHist(),avg=hs.length?Math.round(sumAmt(hs.slice(0,6))/Math.min(6,hs.length)):0;
  o+='<section><div class="sh"><h2>Sueldo</h2><button class="link" type="button" data-act="incedit">'+(I.sal?'Editar':'Agregar')+'</button></div>';
  if(!I.sal&&!hs.length)o+='<div class="empty">Agrega tu sueldo líquido y el día en que llega. Cada mes lo marcas con «Me llegó el sueldo».</div>';
  else{
    var sd=salDate(mk);
    o+='<div class="row"><div class="grow"><div class="ttl">'+(M.salAmt?'Sueldo de '+mn+' anotado':'Sueldo de '+mn)+'</div><div class="meta">'+(M.salAmt?clp(M.salAmt)+' · '+dshort(M.sal[0].date):(I.sal?'Esperado '+clp(I.sal)+' el '+dshort(sd)+(sd<=T()?' · ¿ya llegó?':''):''))+'</div></div>'+(M.salAmt?'<span class="badge ok">Listo</span>':(!M.past?'<button class="btn acc sm" type="button" data-act="salgot">Me llegó</button>':''))+'</div>';
    if(M.cur&&M.salAmt&&I.sal)o+='<div class="row"><div class="grow"><div class="ttl">Próximo sueldo</div><div class="meta">≈ '+dshort(salDate(mkAdd(mk,1)))+(I.mode==='sig'?' · para '+mkName(mkAdd(mk,1)):'')+'</div></div><span class="badge mut">'+inDays(salDate(mkAdd(mk,1)))+'</span></div>';
    if(hs.length)o+='<details class="fin"><summary>Historial ('+hs.length+')'+(hs.length>1?' · promedio '+clp(avg):'')+'</summary>'+hs.slice(0,12).map(function(l){return '<div class="row"><div class="grow"><div class="ttl">'+clp(l.amount)+'</div><div class="meta">'+dlong(l.date)+(INC().mode==='sig'&&budKey(l)!==mkOf(l.date)?' · para '+mkName(budKey(l)):'')+'</div></div><button class="link" type="button" data-act="mvedit" data-id="'+l.id+'">Editar</button></div>'}).join('')+'</details>';
  }
  o+='</section>';
  // Próximos pagos
  if(M.cur){var up=upcomingFin(10);o+='<section><div class="sh"><h2>Próximos <em>pagos</em></h2><span class="meta">10 días</span></div>'+(up.length?up.map(upRow).join(''):'<div class="empty">Nada por pagar en los próximos 10 días.</div>')+'</section>'}
  // Por categoría
  if(M.gs.length)o+='<section><div class="sh"><h2>En qué se fue</h2><button class="link" type="button" data-act="fsub" data-v="gastos">Ver gastos</button></div><div class="catl">'+catBars(M.gs,'fcatgo','')+'</div></section>';
  if(OG().trk.money)o+='<p class="meta">Racha de anotar gastos: '+streakTxt(moneyStreak()).toLowerCase()+'.</p>';
  return o+'<p class="disc">'+(I.mode==='sig'?'El sueldo que llega desde el día 20 cuenta para el mes siguiente. ':'')+'Deudas cuenta tu plan de salida (o la suma de mínimos) y, si pagaste más, lo pagado. Son cuentas para ordenarte, no asesoría financiera.</p>';
}

/* Gastos: movimientos del mes, por categoría y por día */
function mvRow(l){
  var ing=l.dir==='ingreso',tags=[l.pid?'Pago de deuda':l.fx?'Gasto fijo':'',l.cat,l.time].filter(Boolean);
  return '<div class="row"><button class="rowbtn" type="button" data-act="mvedit" data-id="'+l.id+'"><div class="ttl">'+esc(l.title||l.cat||'Movimiento')+'</div><div class="meta">'+esc(tags.join(' · '))+'</div></button>'+(l.src?'<span class="badge mut">'+(l.src==='correo'?'correo':l.src==='claude'?'Claude':'aviso')+'</span>':'')+'<b class="mvamt'+(ing?' in':'')+'">'+(ing?'+':'−')+clp(l.amount)+'</b></div>';
}
function viewGastos(){
  var mk=curMk(),M=monthFin(mk),sel=ui.fcat||'',o=monthNav();
  var ing=M.ls.filter(function(l){return l.dir==='ingreso'});
  o+='<div class="glass dtot"><div><p class="label">Gastado en '+mkName(mk)+'</p><p class="big">'+clp(sumAmt(M.gs))+'</p><p class="meta">Entró '+clp(sumAmt(ing))+(M.salExp&&!M.salAmt?' (falta anotar el sueldo)':'')+'</p></div>'+
    '<div class="mini" style="padding:0"><div><b>'+clp(M.vTot)+'</b><span class="meta">día a día</span></div><div><b>'+clp(M.fxPaid)+'</b><span class="meta">fijos pagados</span></div><div><b>'+clp(M.dPaid)+'</b><span class="meta">a deudas</span></div></div></div>';
  o+='<div class="btns"><button class="btn acc" type="button" data-act="mvnew">Anotar gasto</button><button class="btn line" type="button" data-act="sheet" data-s="aviso">Pegar aviso del banco</button><button class="btn line" type="button" data-act="clopen">Pegar desde Claude</button></div>';
  if(M.gs.length)o+=csec('fcats','Por <em>categoría</em>',sel?'filtro: '+esc(sel):'toca una para filtrar','<div class="catl">'+catBars(M.gs,'fcat',sel)+'</div>',true);
  var ls=M.ls.filter(function(l){return !sel||l.cat===sel}).sort(function(a,b){return (a.date+(a.time||''))<(b.date+(b.time||''))?1:-1});
  o+='<section><div class="sh"><h2>'+(sel?esc(sel):'Movimientos')+'</h2>'+(sel?'<button class="link" type="button" data-act="fcat" data-v="'+esc(sel)+'">Ver todos</button>':'<button class="link" type="button" data-act="mvnew" data-v="ingreso">Anotar ingreso</button>')+'</div>';
  if(!ls.length)o+='<div class="empty">'+(M.cur?'Aún no anotas movimientos este mes. Usa «Anotar gasto» o el + de abajo.':'Sin movimientos ese mes.')+'</div>';
  var lastD='';ls.forEach(function(l){if(l.date!==lastD){lastD=l.date;var dg=sumAmt(ls.filter(function(x){return x.date===l.date&&x.dir!=='ingreso'}));o+='<p class="label mvday"><span>'+whenLabel(l.date)+'</span><span>'+(dg?'−'+clp(dg):'')+'</span></p>'}o+=mvRow(l)});
  return o+'</section><p class="disc">Toca un movimiento para corregirlo o borrarlo. «Día a día» es todo lo que no es gasto fijo ni pago de deuda.</p>';
}

/* Gastos fijos */
function fixRow(x,mk){
  var dn=fixedDone(x,mk),pd=fixedPaid(x,mk),t=T(),due=x.day?dueMk(mk,x.day):'',late=!dn&&due&&due<t&&mk===t.slice(0,7);
  var meta=[x.cat,x.auto?'cargo automático':'',x.day?'día '+x.day:'sin día fijo',dn?'pagado '+clp(pd):''].filter(Boolean).join(' · ');
  return '<div class="row'+(dn?' done':'')+'">'+(x.day?'<div class="cdate"><b>'+x.day+'</b><span>día</span></div>':'<div class="cdate"><b>—</b><span>día</span></div>')+
    '<button class="rowbtn" type="button" data-act="fxedit" data-id="'+x.id+'"><div class="ttl">'+esc(x.n)+'</div><div class="meta">'+esc(meta)+(late?' · <span class="late">atrasado</span>':'')+'</div></button>'+
    '<b class="mvamt">'+clp(x.amt)+'</b>'+(dn?'<span class="badge ok">Pagado</span>':mk===t.slice(0,7)?'<button class="btn '+(late?'acc':'line')+' sm" type="button" data-act="fxpay" data-id="'+x.id+'">'+(x.auto?'Se cobró':'Pagué')+'</button>':'')+'</div>';
}
function viewFijos(){
  var F=FN(),mk=curMk(),act=F.fixed.filter(function(x){return x.on}).sort(function(a,b){return (a.day||99)-(b.day||99)}),off=F.fixed.filter(function(x){return !x.on});
  var tot=act.reduce(function(s,x){return s+(+x.amt||0)},0),dn=act.filter(function(x){return fixedDone(x,mk)}),pd=dn.reduce(function(s,x){return s+fixedPaid(x,mk)},0),o=monthNav();
  o+='<div class="glass dtot"><div><p class="label">Tus gastos fijos</p><p class="big">'+clp(tot)+'</p><p class="meta">al mes · '+act.length+(act.length===1?' gasto':' gastos')+(INC().sal?' · '+Math.round(tot*100/INC().sal)+' % de tu sueldo':'')+'</p></div>'+
    (act.length?'<div class="goal"><div class="stat"><span>Pagados en '+mkName(mk)+'</span><b>'+dn.length+' de '+act.length+'</b></div><div class="bar big"><span style="width:'+Math.round(dn.length*100/act.length)+'%"></span></div><p class="meta">'+clp(pd)+' pagados · faltan '+clp(Math.max(0,tot-act.filter(function(x){return fixedDone(x,mk)}).reduce(function(s,x){return s+x.amt},0)))+'</p></div>':'')+'</div>';
  o+='<section><div class="sh"><h2>Cada <em>mes</em></h2><button class="link" type="button" data-act="fxnew">Agregar</button></div>';
  if(!act.length)o+='<div class="empty">Agrega lo que pagas todos los meses. Con el día de pago te aviso en el Organizador y lo marcas pagado con un toque.</div>';
  o+=act.map(function(x){return fixRow(x,mk)}).join('')+'</section>';
  var have={};F.fixed.forEach(function(x){have[fold(x.n)]=1});var ideas=FXIDEAS.filter(function(i){return !have[fold(i[0])]});
  if(ideas.length)o+='<section><p class="label">Agregar rápido</p><div class="chips">'+ideas.map(function(i){return '<button class="chip" type="button" data-act="fxnew" data-v="'+esc(i[0])+'" data-c="'+esc(i[1])+'">+ '+esc(i[0])+'</button>'}).join('')+'</div></section>';
  if(off.length)o+='<details class="fin"><summary>Pausados ('+off.length+')</summary>'+off.map(function(x){return '<div class="row"><button class="rowbtn" type="button" data-act="fxedit" data-id="'+x.id+'"><div class="ttl">'+esc(x.n)+'</div><div class="meta">'+esc(x.cat)+' · no cuenta en el mes</div></button><b class="mvamt">'+clp(x.amt)+'</b></div>'}).join('')+'</details>';
  return o+'<p class="disc">Al marcar «Pagué» queda como gasto en su categoría y en el mes. Si ya lo habías anotado (por ejemplo, desde un aviso del banco), usa «solo marcar pagado» para no contarlo dos veces.</p>';
}

/* Hojas de Finanzas */
FS.inc=function(){
  var f=ui.form,num='type="text" inputmode="numeric" autocomplete="off"';
  return cHead('Mi <em>sueldo</em>','Líquido: lo que llega a tu cuenta.')+'<form id="inc-form" class="field" style="gap:12px">'+
    '<div class="two">'+fIn('sal','Sueldo líquido ($)',num+' required placeholder="Ej: 1.000.000"')+fIn('day','Día en que llega','type="number" inputmode="numeric" min="1" max="31" required placeholder="Ej: 30"')+'</div>'+
    '<div class="field"><span class="label">¿Para qué mes lo usas?</span>'+chipsSel('incmode',f.mode||'sig',[['sig','El mes siguiente'],['mes','El mismo mes']])+'<p class="meta">Si te pagan a fin de mes y con eso vives el mes que viene, elige «el mes siguiente». Así el sueldo del 30 de septiembre cuenta para octubre.</p></div>'+
    fIn('cap','Tope para el día a día ($, opcional)',num+' placeholder="Ej: 100.000"')+'<p class="meta">El día a día es todo lo que no es fijo ni deuda: supermercado, transporte, salidas, antojos.</p>'+
    '<div class="btns"><button class="btn acc" type="submit">Guardar</button></div></form>';
};
FS.salary=function(){
  var num='type="text" inputmode="numeric" autocomplete="off"',I=INC();
  return cHead('Me llegó el <em>sueldo</em>',I.mode==='sig'?'Si llega desde el día 20, cuenta para el mes siguiente.':'')+'<form id="salary-form" class="field" style="gap:12px"><div class="two">'+fIn('amt','Monto líquido ($)',num+' required')+ldField()+'</div>'+
    '<p class="meta">Si cambió respecto de lo habitual, el monto esperado de los próximos meses no se toca. Lo cambias en «Editar» de Sueldo.</p><div class="btns"><button class="btn acc" type="submit">Guardar</button></div></form>';
};
FS.fixed=function(){
  var f=ui.form,num='type="text" inputmode="numeric" autocomplete="off"';
  var o=cHead(f.xid?'Editar <em>gasto fijo</em>':'Nuevo <em>gasto fijo</em>','Lo que pagas todos los meses.')+'<form id="fixed-form" class="field" style="gap:12px">'+
    fIn('n','Nombre','type="text" required maxlength="40" placeholder="Ej: Internet"')+
    '<div class="two">'+fIn('amt','Monto al mes ($)',num+' required placeholder="Ej: 13.000"')+fIn('day','Día de pago (opcional)','type="number" inputmode="numeric" min="1" max="31" placeholder="Ej: 5"')+'</div>'+
    fSel('cat','Categoría',CATS.filter(function(c){return c!=='Deudas'}).map(function(c){return [c,c]}))+
    '<div class="field"><span class="label">Cómo se paga</span>'+chipsSel('fxauto',f.auto||'0',[['0','Lo pago yo'],['1','Cargo automático']])+'</div>';
  if(f.xid)o+='<div class="field"><span class="label">Estado</span>'+chipsSel('fxon',f.on||'1',[['1','Activo'],['0','Pausado']])+'<p class="meta">Pausado no cuenta en el mes. Sirve para algo que se corta un tiempo, como el instituto en vacaciones.</p></div>';
  else o+='<div class="field"><span class="label">¿Ya lo pagaste este mes?</span>'+chipsSel('fxnow',f.now||'0',[['1','Sí, ya lo pagué'],['0','Todavía no']])+'<p class="meta">Si dices que sí, queda marcado pagado este mes sin anotar otro gasto.</p></div>';
  o+=fIn('note','Nota (opcional)','type="text" maxlength="80"')+
    '<div class="btns"><button class="btn acc" type="submit">Guardar</button>'+(f.xid?'<button class="btn line" type="button" data-act="fxdel" style="'+(ui.hdel?'color:var(--warn);border-color:var(--warn)':'')+'">'+(ui.hdel?'Toca de nuevo para borrar':'Borrar')+'</button>':'')+'</div></form>';
  return o;
};
FS.fxpay=function(){
  var f=ui.form,x=fixById(f.xid),num='type="text" inputmode="numeric" autocomplete="off"';
  if(!x)return cHead('Gasto fijo','')+'<p class="muted">No encontré ese gasto fijo.</p>';
  return cHead((x.auto?'Se cobró ':'Pagué ')+'<em>'+esc(x.n)+'</em>','Queda como gasto de '+esc(x.cat)+' y se marca pagado este mes.')+
    '<form id="fxpay-form" class="field" style="gap:12px"><div class="two">'+fIn('amt','Monto ($)',num+' required')+ldField()+'</div><div class="btns"><button class="btn acc" type="submit">Guardar</button></div>'+
    '<button class="link" type="button" data-act="fxmark" data-id="'+x.id+'" style="align-self:flex-start">Ya lo había anotado como gasto: solo marcar pagado</button></form>';
};
function incForm(){var I=INC();return {direct:true,sal:I.sal?n0(I.sal):'',day:I.day?String(I.day):'30',mode:I.mode||'sig',cap:I.cap?n0(I.cap):''}}
function fixForm(x,name,cat){
  if(!x)return {direct:true,n:name||'',cat:cat||catOf(name||''),auto:'0',now:'0',amt:'',day:''};
  return {direct:true,xid:x.id,n:x.n,amt:n0(x.amt),day:x.day?String(x.day):'',cat:x.cat,auto:x.auto?'1':'0',on:x.on?'1':'0',note:x.note||''};
}
function fin16Submit(id){
  var f=ui.form,F=FN(),t=T(),dt=($('f-ldate')&&$('f-ldate').value)||t;
  if(id==='claude-form'){f.cl=parseClaude(f.cltxt);Object.keys(f).forEach(function(k){if(/^tgt_/.test(k))delete f[k]});renderSheet();return true}
  if(id==='inc-form'){var sal=amountOf(f.sal),day=parseInt(f.day,10);if(!sal){toast('Escribe tu sueldo líquido');return true}
    F.inc={sal:sal,day:day>=1&&day<=31?day:30,mode:f.mode==='mes'?'mes':'sig',cap:amountOf(f.cap)};done('Sueldo guardado');return true}
  if(id==='salary-form'){var a=amountOf(f.amt);if(!a){toast('Escribe el monto que llegó');return true}if(dt>t){toast('Elige una fecha de hoy o anterior');return true}
    var sl={kind:'money',module:'Finanzas',title:'Sueldo',amount:a,dir:'ingreso',cat:'Sueldo',date:dt,time:dt===t?nowHM():'12:00'};addLog(sl);
    done('Sueldo anotado'+(budKey(sl)!==mkOf(dt)?' · cuenta para '+mkName(budKey(sl)):''));return true}
  if(id==='fixed-form'){var n=String(f.n||'').trim(),am=amountOf(f.amt),dd=parseInt(f.day,10);if(!n){toast('Ponle un nombre');return true}if(!am){toast('Escribe el monto al mes');return true}
    var x=f.xid?fixById(f.xid):null,isNew=!x;if(!x)x={id:uid(),paidMk:[]};
    x.n=n;x.amt=am;x.day=dd>=1&&dd<=31?dd:0;x.cat=f.cat||'Otros';x.auto=f.auto==='1';x.note=String(f.note||'').trim();x.on=isNew?true:f.on!=='0';
    if(isNew){if(f.now==='1')x.paidMk.push(t.slice(0,7));F.fixed.push(x)}
    done(isNew?'Gasto fijo agregado':'Gasto fijo actualizado');return true}
  if(id==='fxpay-form'){var fx=fixById(f.xid),pa=amountOf(f.amt);if(!fx)return true;if(!pa){toast('Escribe el monto');return true}if(dt>t){toast('Elige una fecha de hoy o anterior');return true}
    addLog({kind:'money',module:'Finanzas',title:fx.n,amount:pa,dir:'gasto',cat:fx.cat,fx:fx.id,date:dt,time:dt===t?nowHM():'12:00'});done(fx.n+' pagado');return true}
  return false;
}
function fin16Click(a,b,id){
  var v=b.getAttribute('data-v'),f=ui.form,x;
  switch(a){
    case 'fsub': ui.fsub=v; if(v!=='gastos')ui.fcat=''; render(); window.scrollTo(0,0); return true;
    case 'clopen': ui.ret=null; goSheet('claude',{direct:true,cltxt:''}); return true;
    case 'clsave': gsnap(); clSave(); return true;
    case 'gofin': closeSheet(); ui.view='fin'; ui.fsub=v||'resumen'; render(); window.scrollTo(0,0); return true;
    case 'fmon': var dm=+b.getAttribute('data-d'); ui.fmon=Math.min(0,(ui.fmon||0)+dm); render(); return true;
    case 'fsec': var cur=b.getAttribute('aria-expanded')==='true'; FUI.s[v]=!cur; saveFUI(); render(); return true;
    case 'dtog': FUI.d[id]=!FUI.d[id]; if(!FUI.d[id])delete FUI.d[id]; saveFUI(); render(); return true;
    case 'dall': FUI.d={}; if(v==='1')FN().debts.forEach(function(d){FUI.d[d.id]=true}); saveFUI(); render(); return true;
    case 'fcat': ui.fcat=ui.fcat===v?'':v; render(); return true;
    case 'fcatgo': ui.fsub='gastos'; ui.fcat=v; render(); window.scrollTo(0,0); return true;
    case 'incedit': ui.ret=null; goSheet('inc',incForm()); return true;
    case 'incmode': gsnap(); ui.form.mode=v; rerender(); return true;
    case 'salgot': ui.ret=null; goSheet('salary',{direct:true,amt:INC().sal?n0(INC().sal):'',ldate:T()}); return true;
    case 'fxnew': ui.ret=null; goSheet('fixed',fixForm(null,v||'',b.getAttribute('data-c')||'')); return true;
    case 'fxedit': x=fixById(id); if(x){ui.ret=null;goSheet('fixed',fixForm(x))} return true;
    case 'fxauto': gsnap(); ui.form.auto=v; rerender(); return true;
    case 'fxon': gsnap(); ui.form.on=v; rerender(); return true;
    case 'fxnow': gsnap(); ui.form.now=v; rerender(); return true;
    case 'fxdel': if(!ui.hdel){ui.hdel=true;rerender();return true} FN().fixed=FN().fixed.filter(function(z){return z.id!==f.xid}); done('Gasto fijo borrado. Lo que ya pagaste sigue en Gastos.'); return true;
    case 'fxpay': x=fixById(id); if(x){ui.ret=null;goSheet('fxpay',{direct:true,xid:x.id,amt:n0(x.amt),ldate:T()})} return true;
    case 'fxmark': x=fixById(id); if(x){var mk=T().slice(0,7);if(!Array.isArray(x.paidMk))x.paidMk=[];if(x.paidMk.indexOf(mk)<0)x.paidMk.push(mk);x.paidMk=x.paidMk.filter(function(m){return m>=mkAdd(mk,-24)});done(x.n+' marcado pagado')} return true;
    case 'mvnew': snap(); ui.ret=null; goSheet('money',{direct:true,dir:v==='ingreso'?'ingreso':'gasto',cat:v==='ingreso'?'Otros':(ui.fcat||''),ldate:T()}); return true;
    case 'mvedit': var l=state.logs.filter(function(z){return z.id===id})[0]; if(l){ui.ret=null;goSheet('money',{direct:true,eid:l.id,dir:l.dir||'gasto',amt:n0(l.amount),cat:l.cat,desc:l.title||'',ldate:l.date,ltime:l.time,pid:l.pid||'',fx:l.fx||''})} return true;
    case 'mvdel': if(!ui.hdel){ui.hdel=true;rerender();return true} var ml=state.logs.filter(function(z){return z.id===f.eid})[0]; if(ml){if(ml.pid)delPay(ml.pid);state.logs=state.logs.filter(function(z){return z.id!==ml.id})} done('Movimiento borrado'); return true;
  }
  return false;
}

/* Organizador: gastos fijos con día de pago (los atrasados del mes aparecen solo hoy). */
function agendaFixed(ds,add){
  var t=T();if(ds<t)return;
  FN().fixed.forEach(function(x){
    if(!x.on||!x.day)return;var mk=mkOf(ds),due=dueMk(mk,x.day);if(fixedDone(x,mk))return;
    var late=ds===t&&due<t;
    if(due===ds||late)add({k:'fix',id:x.id,time:'',title:(x.auto?'Se cobra ':'Pagar ')+x.n,sub:clp(x.amt)+(x.auto?' · cargo automático':''),mod:'Finanzas',late:late?due:'',act:1,auto:!!x.auto});
  });
}
function fixTipText(){
  var u=FN().fixed.map(function(x){return {x:x,s:fixNext(x)}}).filter(function(o){return o.s&&!o.s.paidNow&&!o.x.auto&&(o.s.late||o.s.days<=1)}).sort(function(a,b){return a.s.date<b.s.date?-1:1})[0];
  if(!u)return '';
  return u.s.late?'Tenías que pagar '+esc(u.x.n)+' el '+dshort(u.s.date)+'. Si ya lo pagaste, márcalo en Finanzas · Fijos.':(u.s.days===0?'Hoy':'Mañana')+' toca pagar '+esc(u.x.n)+' ('+clp(u.x.amt)+').';
}

/* ---------- Pegar desde Claude (versión 17) ----------
   Carolina le pasa a Claude un estado de cuenta o una cartola en el chat del proyecto. Claude responde con un código
   que empieza con AURA y trae JSON. Se pega en Finanzas («Pegar desde Claude»), se muestra «Lo entendí así» y se guarda.
   Formato (claves en español; los montos pueden venir como número o como texto «1.250.000»):
     AURA {"aura":1,"items":[
       {"tipo":"deuda","apodo":"CMR Falabella","clase":"tc|lc|cc|otro","fecha_estado":"AAAA-MM-DD","deuda_total":0,"facturado":0,
        "minimo":0,"pagar_hasta":"AAAA-MM-DD" (o "dia_pago":5),"tasa_mensual":3.1,"cae":45.2,"cupo":0,"nota":"",
        "cuotas":[{"compra":"Notebook","valor":45000,"faltan":9,"total":12}]},
       {"tipo":"movimientos","origen":"Cartola Banco de Chile","lista":[{"fecha":"AAAA-MM-DD","monto":12990,"detalle":"Farmacia","categoria":"Salud","tipo":"gasto|ingreso"}]}
     ]}
   Deuda: se busca por apodo (en la vista previa se puede elegir otra o crear una nueva). Solo cambian los campos que vienen.
     Si trae cuotas, reemplazan a las anteriores («faltan» contadas desde ese estado de cuenta, incluida la de ese mes).
     updAt = fin del día del estado de cuenta: los pagos hechos después siguen descontándose de la deuda.
   Movimientos: logs money con src:'claude'. Se salta un movimiento si ya hay otro con la misma fecha y monto.
     Un gasto de categoría Deudas que nombra una deuda queda como pago de esa deuda, fechado el día del pago.
   Etapa GitHub: la lectura automática con IA puede devolver este mismo JSON y usar parseClaude() y clSave(). */
var CLTY={tc:1,lc:1,cc:1,otro:1};
function clNum(v){if(v==null||v==='')return null;if(typeof v==='number')return isFinite(v)?Math.abs(Math.round(v)):null;if(!/\d/.test(String(v)))return null;return amountOf(v)}
function clDec(v){if(v==null||v==='')return null;var x=numOf(v);return isFinite(x)&&x>0?x:null}
function clDate(v){var s=String(v||'').trim(),m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return dmy(+m[1],+m[2],+m[3]);m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);if(m){var y=+m[3];if(y<100)y+=2000;return dmy(y,+m[2],+m[1])}return ''}
function parseClaude(txt){
  var s=String(txt||'').replace(/[“”„«»]/g,'"').replace(/[‘’]/g,"'"),a=s.indexOf('{'),b=s.lastIndexOf('}'),j;
  if(a>=0&&b<a)return {err:'El código está incompleto o se cortó al copiarlo. Vuelve a copiarlo entero.'};
  if(a<0)return {err:'No encontré el código. Copia todo el bloque que te dio Claude, desde AURA hasta la última llave.'};
  try{j=JSON.parse(s.slice(a,b+1))}catch(e){return {err:'El código está incompleto o se cortó al copiarlo. Vuelve a copiarlo entero.'}}
  var list=Array.isArray(j.items)?j.items:[j],out=[],t=T();
  list.forEach(function(it){
    if(!it||typeof it!=='object')return;var ty=fold(it.tipo||'');
    if(ty==='deuda'){
      var n=String(it.apodo||it.nombre||'').trim().slice(0,40);if(!n)return;
      var ph=clDate(it.pagar_hasta),due=ph?+ph.slice(8,10):parseInt(it.dia_pago,10),upd=clDate(it.fecha_estado);if(upd>t)upd=t;
      var x={k:'deuda',n:n,ty:CLTY[it.clase]?it.clase:'',upd:upd,ph:ph,bal:clNum(it.deuda_total),min:clNum(it.minimo),fact:clNum(it.facturado),cupo:clNum(it.cupo),
        rate:clDec(it.tasa_mensual),cae:clDec(it.cae),due:due>=1&&due<=31?due:null,note:it.nota?String(it.nota).trim().slice(0,100):''};
      if(Array.isArray(it.cuotas))x.cuotas=it.cuotas.map(function(c){return {n:String(c.compra||c.n||'').trim().slice(0,50),v:clNum(c.valor)||0,left:parseInt(c.faltan,10)||0,tot:parseInt(c.total,10)||0}}).filter(function(c){return c.v>0&&c.left>0});
      var ex=FN().debts.filter(function(d){return fold(d.n).trim()===fold(n).trim()})[0]||matchDebt(n);
      x.tgt=ex?ex.id:'_new';out.push(x);
    } else if(ty==='movimientos'||ty==='movimiento'||ty==='gastos'){
      var cnt={};state.logs.forEach(function(l){if(l.kind==='money'){var k=l.date+'|'+l.amount;cnt[k]=(cnt[k]||0)+1}});
      var mv=(Array.isArray(it.lista)?it.lista:[]).map(function(m){
        if(!m||typeof m!=='object')return null;
        var d=clDate(m.fecha),am=clNum(m.monto);if(!d||!am||d>t)return null;
        var dir=fold(m.tipo||'')==='ingreso'?'ingreso':'gasto',desc=cap(String(m.detalle||'').trim().slice(0,100))||(dir==='ingreso'?'Ingreso':'Gasto');
        var cl=dir==='ingreso'?ICATS:CATS,cat=cl.filter(function(c){return fold(c)===fold(m.categoria||'')})[0]||(dir==='ingreso'?'Otros':catOf(desc));
        var k=d+'|'+am,dup=cnt[k]>0;if(dup)cnt[k]--;
        var o={date:d,amount:am,dir:dir,cat:cat,desc:desc,dup:dup};
        if(dir==='gasto'&&cat==='Deudas'){var db=matchDebt(desc);if(db)o.did=db.id}
        return o;
      }).filter(Boolean).sort(function(p,q){return p.date<q.date?1:-1});
      if(mv.length)out.push({k:'mov',org:String(it.origen||'').trim().slice(0,60),list:mv});
    }
  });
  if(!out.length)return {err:'El código no trae nada que Aura sepa guardar todavía (por ahora: estados de cuenta y movimientos).'};
  return {items:out};
}
function clDebtHtml(x,i){
  var f=ui.form,tg=f['tgt_'+i]||x.tgt,d=tg!=='_new'?debtById(tg):null,rows=[];
  var opts=FN().debts.map(function(z){return [z.id,z.n]}).concat([['_new','Crear deuda nueva: '+x.n]]);
  function row(lab,ov,nv,fmt){if(nv==null||nv==='')return;var nt=fmt(nv),ot=d&&ov!=null&&ov!==''&&ov!==0?fmt(ov):'';rows.push('<div class="eqr"><span>'+lab+(ot&&ot!==nt?'<small>antes '+esc(ot)+'</small>':'')+'</span><b>'+esc(nt)+'</b></div>')}
  row('Estado de cuenta',d&&d.upd,x.upd,dlong);
  row('Deuda total',d&&d.bal,x.bal,clp);
  row('Facturado del mes',d&&d.fact,x.fact,clp);
  row('Pago mínimo',d&&d.min,x.min,clp);
  if(x.ph)row('Pagar hasta',null,x.ph,dlong);else row('Día de pago',d&&d.due,x.due,function(v){return 'día '+v});
  row('Tasa mensual',d&&d.rate,x.rate,pctTxt);
  row('CAE',d&&d.cae,x.cae,pctTxt);
  row('Cupo total',d&&d.cupo,x.cupo,clp);
  if(x.ty)row('Tipo',d&&d.ty,x.ty,tyName);
  if(x.cuotas){var cs=x.cuotas.reduce(function(s,c){return s+c.v},0);rows.push('<div class="eqr"><span>Compras en cuotas<small>'+(x.cuotas.length?esc(x.cuotas.map(function(c){return (c.n||'Compra')+' · faltan '+c.left}).join(', ')):'sin cuotas pendientes')+(d&&d.cuotas.length?' · reemplaza las anteriores':'')+'</small></span><b>'+(x.cuotas.length?clp(cs)+' al mes':'—')+'</b></div>')}
  if(x.note)row('Nota',d&&d.note,x.note,String);
  var o='<div class="glass" style="padding:14px 16px;display:flex;flex-direction:column;gap:10px"><p class="label">Estado de cuenta · '+esc(x.n)+'</p>'+
    '<div class="field"><label class="label" for="h-tgt_'+i+'">Se guarda en</label><select id="h-tgt_'+i+'" data-f="tgt_'+i+'" data-rer="1">'+opts.map(function(p){return '<option value="'+esc(p[0])+'"'+(p[0]===tg?' selected':'')+'>'+esc(p[1])+'</option>'}).join('')+'</select></div>'+
    '<div class="eq">'+(rows.join('')||'<p class="meta">No trae datos para cambiar.</p>')+'</div>';
  if(!d&&x.bal==null)o+='<p class="late" style="font-size:.85rem">Para crear una deuda nueva falta la deuda total. Elige una deuda existente o pídele a Claude el código de nuevo.</p>';
  if(d&&x.bal!=null)o+='<p class="meta">Los pagos que anotes después del '+dshort(x.upd||T())+' se siguen descontando de esta deuda.</p>';
  return o+'</div>';
}
function clMovHtml(x){
  var nw=x.list.filter(function(m){return !m.dup}),g=sumAmt(nw.filter(function(m){return m.dir!=='ingreso'})),inn=sumAmt(nw.filter(function(m){return m.dir==='ingreso'}));
  var o='<div class="glass" style="padding:14px 16px;display:flex;flex-direction:column;gap:4px"><p class="label">'+(x.org?esc(x.org)+' · ':'')+nw.length+(nw.length===1?' movimiento nuevo':' movimientos nuevos')+'</p>'+
    '<p class="meta">'+(g?'Gastos '+clp(g):'')+(g&&inn?' · ':'')+(inn?'ingresos '+clp(inn):'')+(x.list.length>nw.length?' · '+(x.list.length-nw.length)+' ya estaban':'')+'</p>';
  x.list.forEach(function(m){var db=m.did&&debtById(m.did);
    o+='<div class="row'+(m.dup?' done':'')+'"><div class="grow"><div class="ttl">'+esc(m.desc)+'</div><div class="meta">'+whenLabel(m.date)+' · '+esc(db?'Pago de '+db.n:m.cat)+(m.dup?' · <span class="late">ya estaba, no se suma</span>':'')+'</div></div><b class="mvamt'+(m.dir==='ingreso'?' in':'')+'">'+(m.dir==='ingreso'?'+':'−')+clp(m.amount)+'</b></div>'});
  return o+'</div>';
}
FS.claude=function(){
  var f=ui.form,r=f.cl,o=cHead('Pegar desde <em>Claude</em>','Pásale tu estado de cuenta o tu cartola a Claude en el proyecto de Aura. Te dará un código que empieza con AURA: cópialo entero y pégalo aquí.');
  o+='<form id="claude-form" class="field" style="gap:10px"><label class="label" for="h-cltxt">Código de Claude</label><textarea id="h-cltxt" data-f="cltxt" spellcheck="false" autocomplete="off" autocapitalize="off" style="min-height:110px" placeholder="AURA {…}">'+esc(f.cltxt||'')+'</textarea><button class="btn" type="submit">Leer código</button></form>';
  if(r&&r.err)o+='<p class="late" style="font-size:.88rem">'+esc(r.err)+'</p>';
  if(r&&r.items){
    o+='<div class="parse"><p class="label" style="color:var(--accent);display:flex;gap:6px;align-items:center">'+SPARK+'Lo entendí así</p>';
    r.items.forEach(function(x,i){o+=x.k==='deuda'?clDebtHtml(x,i):clMovHtml(x)});
    o+='<div class="btns"><button class="btn acc" type="button" data-act="clsave">Guardar</button></div></div>';
  }
  return o+'<p class="meta">El código no trae números de tarjeta ni de cuenta. Solo cambia lo que ves en «Lo entendí así».</p>';
};
function clSave(){
  var f=ui.form,r=f.cl,msg=[],skip=0;if(!r||!r.items)return;
  r.items.forEach(function(x,i){
    if(x.k==='deuda'){
      var tg=f['tgt_'+i]||x.tgt,d=tg!=='_new'?debtById(tg):null,isNew=!d;
      if(isNew){if(x.bal==null){skip++;return}d={id:uid(),n:x.n,ty:x.ty||'tc',bal:0,min:0,fact:0,due:0,rate:0,cae:0,cupo:0,note:'',cuotas:[]}}
      if(x.ty)d.ty=x.ty;
      if(x.bal!=null)d.bal=x.bal;if(x.min!=null)d.min=x.min;if(x.fact!=null)d.fact=x.fact;if(x.cupo!=null)d.cupo=x.cupo;
      if(x.rate!=null)d.rate=Math.min(20,x.rate);if(x.cae!=null)d.cae=Math.min(300,x.cae);if(x.due!=null)d.due=x.due;if(x.note)d.note=x.note;
      if(x.bal!=null||x.upd){var up=x.upd||T();d.upd=up;d.updAt=Math.min(Date.now(),new Date(up+'T23:59:59').getTime())}
      if(x.cuotas)d.cuotas=x.cuotas.map(function(c){return {id:uid(),n:c.n,v:c.v,left:c.left,tot:c.tot}});
      if(isNew)FN().debts.push(d);
      msg.push((isNew?'nueva deuda ':'')+d.n);
    } else if(x.k==='mov'){
      var k=0;
      x.list.forEach(function(m){if(m.dup)return;var db=m.did&&debtById(m.did);
        if(db){var p=addDebtPay(db,m.amount,m.date);p.at=Math.min(Date.now(),new Date(m.date+'T12:00:00').getTime());state.logs.forEach(function(l){if(l.id===p.lid)l.src='claude'})}
        else addLog({kind:'money',module:'Finanzas',title:m.desc,amount:m.amount,dir:m.dir,cat:m.cat,date:m.date,time:'12:00',src:'claude'});
        k++});
      msg.push(k+(k===1?' movimiento':' movimientos'));
    }
  });
  if(!msg.length){toast(skip?'Elige una deuda existente: falta la deuda total para crear una nueva':'Nada que guardar');return}
  done('Guardado · '+msg.join(' · '));
}

