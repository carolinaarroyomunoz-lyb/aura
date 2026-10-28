/* Aura · js/base.js
   Constantes y utilidades comunes (fechas, formato, escape de texto).
   Todos los archivos de js/ comparten las mismas variables: el orden de carga está en index.html. */
var KEY='mi-dia-v1'; // Clave de guardado: NO cambiar al renombrar la app a Aura (se perderían los datos locales).
var MODS=['Salud','Alimentación','Ejercicio','Belleza','Finanzas','Casa','Estudio'];
var MCOL={'Salud':'#C2507F','Alimentación':'#D9822B','Ejercicio':'#5A48C8','Belleza':'#A8577E','Finanzas':'#2F7F86','Casa':'#7A7A8C','Estudio':'#4F86C6'};
var CATS=['Supermercado','Transporte','Hogar','Suscripciones','Salud','Belleza','Mascotas','Estudio','Ocio','Deudas','Otros'];
var MEALS=['Desayuno','Colación','Almuerzo','Once','Cena'];
var CHECK='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l4 4 10-10"/></svg>';
var SPARK='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>';
var $=function(id){return document.getElementById(id)};

function pad(n){return n<10?'0'+n:''+n}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function addDays(d,n){var x=new Date(d.getTime());x.setDate(x.getDate()+n);return x}
function T(){return ymd(new Date())}
function nowHM(){var d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())}
function uid(){return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function clp(n){return '$'+Math.round(n).toLocaleString('es-CL')}
function dshort(s){var p=s.split('-');var m=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];return (+p[2])+' '+m[+p[1]-1]}
function daysBetween(a,b){return Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/86400000)}

