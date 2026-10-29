// Motor del Diagnóstico patrimonial (se monta dentro del CRM). Generado a partir de la herramienta aprobada.
/* eslint-disable */
/* ===== Núcleo: utilidades, estado, catálogo, cálculos ===== */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>{const x=parseFloat(String(v==null?'':v).replace(/,/g,''));return isFinite(x)?x:0};
const mx=v=>'$'+Math.round(v||0).toLocaleString('es-MX');
const mxc=v=>{v=v||0;const a=Math.abs(v);return a>=1e6?'$'+(v/1e6).toFixed(a>=1e7?0:1)+' M':a>=1e3?'$'+Math.round(v/1e3)+' mil':'$'+Math.round(v)};
const fmtNum=v=>v===''||v==null?'':Number(v).toLocaleString('es-MX',{maximumFractionDigits:2});
function parseDate(s){const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s||'').trim());if(!m)return null;const d=new Date(+m[3],+m[2]-1,+m[1]);return isNaN(d)||d.getDate()!==+m[1]?null:d}
function ageFrom(s){const d=parseDate(s);if(!d)return null;const t=new Date();let a=t.getFullYear()-d.getFullYear();const m=t.getMonth()-d.getMonth();if(m<0||(m===0&&t.getDate()<d.getDate()))a--;return a}
function getp(o,p){return p.split('.').reduce((a,k)=>a==null?a:a[k],o)}
function setp(o,p,v){const ks=p.split('.');let a=o;ks.slice(0,-1).forEach(k=>{if(a[k]==null||typeof a[k]!=='object')a[k]={};a=a[k]});a[ks[ks.length-1]]=v}

const PRI=[['edu','La educación de mis hijos'],['metas','Ahorrar para concretar mis metas de vida'],['prot','Proteger el futuro económico de mi familia en caso de invalidez y fallecimiento'],['med','Cubrir gastos médicos u hospitalarios, míos o de mi familia'],['ret','Garantizar ingresos de por vida a partir de mi retiro']];
const PREOC=[['ret','Contar con un capital al momento de mi retiro'],['proy','Construir un capital para un proyecto especial'],['inv','Protección para mí y mi familia en caso de invalidez'],['grave','Recursos económicos en caso de una enfermedad grave'],['edu','La educación de mis hijos'],['fam','La protección y manutención de mi familia']];
const TIPOS_PROT=['Vida (propio)','Vida (prestación)','GMM','Ahorro / Retiro','Educación','Autos','Otro'];
const FREC=[['Mensual',12],['Trimestral',4],['Semestral',2],['Anual',1]];
const MONEDA={MXN:'Pesos (MXN)',UDI:'UDIs',USD:'Dólares (USD)'};

/* Estadísticas tomadas de materiales de AXA que están en tu Drive */
const STATS=[
 {v:'8%',t:'de los mexicanos cuenta con un seguro de vida.',s:'AXA México, folleto Vida ProTGT 2023'},
 {v:'2 a 3 años',t:'tarda una familia en recuperar su nivel de vida tras un fallecimiento o una invalidez.',s:'AXA México, folleto Vida ProTGT 2023'},
 {v:'36 de 100',t:'niños que ingresan a primaria terminan la educación media superior. La falta de dinero es la primera causa de abandono.',s:'AXA México, Aliados+ Kids (INEGI, SEP, Reforma)'},
 {v:'$1.3 M',t:'puede costar una carrera en universidad privada.',s:'AXA México, Aliados+ Kids (INEGI, SEP, Reforma)'}
];

/* Catálogo de productos: edítalo para sumar planes. Cada plan define tipos, monedas, plazos y coberturas */
const COB_VIDA=[['ADF','Anticipo por fallecimiento (30%)',1],['ATE','Anticipo por enfermedades terminales (30%)',1],['BI','Exención de pago de primas por invalidez total y permanente'],['PAI','Pago adicional por invalidez total y permanente'],['MA','Muerte accidental y pérdidas orgánicas'],['IAC','Indemnización adicional por cáncer'],['PAE','Pago adicional por enfermedades graves'],['CC','Cobertura conyugal'],['GF','Gastos funerarios'],['PCD','Protección por desempleo']];
const CATALOGO=[
 {id:'protgt',aseg:'AXA',nombre:'Vida ProTGT',fam:'vida',
  tipos:[['TMN','Temporal'],['OV','Ordinario de Vida (ODV)'],['VPL','Vida Pagos Limitados (VPL)']],
  plazos:(t,m)=>t==='TMN'?['1 año','5 años','10 años','15 años','20 años','25 años','30 años']:t==='OV'?['Vitalicio (hasta los 99 años)']:(m==='MXN'?['Pago a 5 años','Pago a 10 años','Pago a 15 años','Pago a 20 años','Pago a edad 60','Pago a edad 65']:['Pago a 5 años','Pago a 10 años','Pago a 15 años','Pago a 20 años','Pago a edad 65']),
  minSA:(t,m)=>({MXN:t==='TMN'?300000:500000,USD:30000,UDI:60000})[m],
  nota:'Referencia AXA (folleto y CTP 2023): suma mínima desde $300,000 en temporal y $500,000 en ODV y VPL; $30,000 en dólares; 60,000 UDIs. Descuento por volumen de suma asegurada: 3% desde 500,000 y 5% desde 1,000,000. Confirma siempre en el cotizador.',
  cob:COB_VIDA},
 {id:'kids',aseg:'AXA',nombre:'Aliados+ Kids',fam:'ahorro',tipos:[['EDU','Ahorro para la educación de tus hijos']],
  plazos:()=>['Hasta que el hijo cumpla 18 años','Hasta que el hijo cumpla 22 años'],minSA:()=>0,
  nota:'Seguro de vida con ahorro para la educación profesional. Indica en "Capital al vencimiento" el monto que arroja tu cotización.',
  cob:[['SOB','Sobrevivencia: entrega del ahorro al final del plazo',1],['FAL','Fallecimiento del contratante',1]]},
 {id:'proyr',aseg:'AXA',nombre:'Mi Proyecto R',fam:'retiro',tipos:[['PPR','Plan personal de retiro (PPR)']],
  plazos:()=>['10 años','15 años','20 años','25 años','30 años','A la edad de retiro'],minSA:()=>0,
  nota:'Plan de ahorro para el retiro con coberturas opcionales de invalidez, cáncer, muerte accidental y gastos funerarios.',
  cob:[['ATE','Anticipo por enfermedades terminales (30%)',1],['INV','Invalidez'],['CAN','Cáncer'],['MA','Muerte accidental y pérdidas orgánicas'],['GF','Gastos funerarios']]},
 {id:'gnptras',aseg:'GNP',nombre:'Trasciende GNP',fam:'vida',tipos:[['VE','Vida entera']],plazos:()=>[],minSA:()=>0,nota:'Protección por fallecimiento toda la vida, con opciones de pago flexibles.',cob:[['INV','Invalidez'],['MA','Muerte accidental']]},
 {id:'gmm',aseg:'',nombre:'Gastos Médicos Mayores',fam:'gmm',tipos:[['IND','Individual o familiar']],plazos:()=>['Anual renovable'],minSA:()=>0,nota:'Indica deducible y coaseguro en las notas del plan.',cob:[]},
 {id:'otro',aseg:'',nombre:'Otro producto',fam:'otro',tipos:[],plazos:()=>[],minSA:()=>0,nota:'',cob:[]}
];
const catOf=id=>CATALOGO.find(c=>c.id===id)||CATALOGO[CATALOGO.length-1];
const RIESGO_COB={inval:['BI','PAI','INV'],cancer:['IAC','CAN'],grave:['PAE']};

function nuevaProp(id){const c=catOf(id||'protgt');return{id:'p'+Date.now()+Math.floor(Math.random()*999),prod:c.id,aseg:c.aseg,nombre:c.nombre,fam:c.fam,tipo:c.tipos[0]?c.tipos[0][0]:'',moneda:'MXN',plazo:'',suma:'',prima:'',frec:'Anual',capFinal:'',cobs:{},notas:''}}

function demo(){
 const p1=nuevaProp('protgt');Object.assign(p1,{tipo:'TMN',plazo:'20 años',suma:'5000000',prima:'21500',frec:'Anual',cobs:{BI:true,IAC:true},notas:'Cifras de ejemplo, no son una cotización.'});
 const p2=nuevaProp('kids');Object.assign(p2,{plazo:'Hasta que el hijo cumpla 18 años',suma:'1000000',prima:'2500',frec:'Mensual',capFinal:'',notas:'Cifras de ejemplo.'});
 const p3=nuevaProp('proyr');Object.assign(p3,{plazo:'A la edad de retiro',prima:'3000',frec:'Mensual',notas:'Cifras de ejemplo.'});
 return {ejemplo:true,step:0,
  nombre:'Cliente de ejemplo',nacimiento:'14/05/1988',ecivil:'Casado/a',tel:'',correo:'',ocupacion:'Gerente de ventas',trabajo:'Coordina un equipo comercial',antig:'14',estudios:'Administración',hobbies:'Ciclismo y cocina',deporte:'Ciclismo recreativo, no profesional',fuma:'No',
  conyuge:'Ana (ejemplo)',conyugeEdad:'35',conyugeOcup:'Diseñadora',conyugeAporte:'35',
  dep:[{nombre:'Hijo 1',par:'Hijo',edad:'8',esc:'Primaria'},{nombre:'Hija 2',par:'Hija',edad:'4',esc:'Preescolar'}],anosInd:'15',
  ingPropio:'55000',ingConyuge:'30000',gFijos:'33000',gSeg:'3500',gDiv:'6000',gOtros:'5500',casa:'Sí',tarjeta:'Sí',cheques:'Sí',ahorra:'Sí',ahorraPct:'5% para el fondo de emergencia',
  ahorro:'250000',inversiones:'150000',casaVal:'2800000',vehiculos:'250000',otrosAct:'0',hipoteca:'1450000',prestamos:'80000',deudasOtras:'0',deudasVig:'La hipoteca seguiría vigente',satisf:'Quisiera ahorrar más',
  prot:[{tipo:'Vida (prestación)',cia:'Empresa (ejemplo)',suma:'1000000',prima:'0'},{tipo:'GMM',cia:'Aseguradora (ejemplo)',suma:'20000000',prima:'38000'}],
  pEstilo:'No por mucho tiempo',pRecurrir:'A sus abuelos',pInstr:'Sí',
  finde:'Salidas en familia',metaC:'Fondo de emergencia',metaM:'Cambio de auto',metaL:'Retiro y universidad de los hijos',dondeAhorro:'Cuenta de ahorro',paraAhorro:'Emergencias',planAhorro:'Sí',
  eduOfrecer:'Universidad privada',eduPlan:'No',eduPlanear:'Sí',
  edadRetiro:'65',retEstilo:'Viajar y mantener mi estilo de vida',retMismo:'Sí',retSabe:'No',retFuentes:'Solo mi ahorro',retDeducir:'Sí',retInstr:'Ninguno',esp:'85',gastoRet:'40000',ahorroRet:'0',
  pri:{edu:{si:'Sí',ord:'2'},metas:{si:'Sí',ord:'4'},prot:{si:'Sí',ord:'1'},med:{si:'Sí',ord:'5'},ret:{si:'Sí',ord:'3'}},
  preoc:{prot:true,fam:true,edu:true,ret:true},
  capacidad:'9000',cAhorro:'',cSeg:'',cOtro:'',
  refs:[{nombre:'',tel:'',edad:'',ocup:'',ecivil:'',hijos:''},{nombre:'',tel:'',edad:'',ocup:'',ecivil:'',hijos:''},{nombre:'',tel:'',edad:'',ocup:'',ecivil:'',hijos:''}],
  props:[p1,p2,p3],notas:{},
  infl:'4',rend:'5',inflEdu:'5',costoCarrera:'1300000',udi:'8.7',tc:'18.5',descConyuge:true,
  asesor:'Joshua Lechuga Plata',asesorTit:'Asesor en protección y planeación patrimonial',asesorWA:'244 107 1011',asesorMail:'jlechuga.seguros@gmail.com'
 };
}
function vacio(){const d=demo();const keep=['infl','rend','inflEdu','costoCarrera','udi','tc','descConyuge','asesor','asesorTit','asesorWA','asesorMail'];const o={ejemplo:false,step:0,dep:[{nombre:'',par:'',edad:'',esc:''}],prot:[{tipo:'Vida (propio)',cia:'',suma:'',prima:''}],pri:{},preoc:{},refs:[1,2,3].map(()=>({nombre:'',tel:'',edad:'',ocup:'',ecivil:'',hijos:''})),props:[],notas:{},esp:'85',descConyuge:true};keep.forEach(k=>o[k]=d[k]);return o}


export const crearCasoVacio=()=>vacio();
export const crearCasoEjemplo=()=>demo();

export function mountDiagnostico(root,opts){


/* ===== Cálculos ===== */
function runway(capital,gMes,infl,rend,maxY){
 maxY=maxY||40;const rm=Math.pow(1+rend,1/12)-1;let b=capital,g=gMes,pts=[capital],months=0,agotado=false;
 if(gMes<=0)return{pts:[capital],months:0,years:0,agotado:false,sinGasto:true};
 for(let m=0;m<maxY*12;m++){
  if(m>0&&m%12===0)g*=1+infl;
  b=b*(1+rm)-g;months=m+1;
  if(b<=0){agotado=true;b=0;pts.push(0);break}
  if((m+1)%12===0)pts.push(b);
 }
 return{pts,months,years:months/12,agotado};
}
function fvFactor(meses,rend){const rm=Math.pow(1+rend,1/12)-1;return rm===0?meses:((Math.pow(1+rm,meses)-1)/rm)*(1+rm)}
function pvNeeded(g0,infl,rend,yTo,yRet){const rm=Math.pow(1+rend,1/12)-1;const g=g0*Math.pow(1+infl,yTo);let pv=0;for(let m=0;m<yRet*12;m++){pv+=g*Math.pow(1+infl,Math.floor(m/12))/Math.pow(1+rm,m)}return pv}
const factor=m=>m==='UDI'?n(S.udi):m==='USD'?n(S.tc):1;

function calc(){
 const C={};
 const eN=ageFrom(S.nacimiento);C.edad=eN!=null?eN:(n(S.edadManual)||null);
 C.ingreso=n(S.ingPropio)+n(S.ingConyuge);
 C.gasto=n(S.gFijos)+n(S.gSeg)+n(S.gDiv)+n(S.gOtros);
 C.pctCony=Math.min(Math.max(n(S.conyugeAporte),0),90)/100;
 C.descuenta=!!S.descConyuge&&C.pctCony>0;
 C.gastoCubrir=C.gasto*(C.descuenta?1-C.pctCony:1);
 C.anos=n(S.anosInd)||10;
 C.requerida=C.gastoCubrir*12*C.anos;
 C.deudas=n(S.hipoteca)+n(S.prestamos)+n(S.deudasOtras);
 C.vidaActual=(S.prot||[]).filter(r=>/^vida/i.test(r.tipo||'')).reduce((a,r)=>a+n(r.suma),0);
 C.liquidos=n(S.ahorro)+n(S.inversiones);
 C.necesidad=C.requerida+C.deudas;
 C.recursos=C.vidaActual+C.liquidos;
 C.brecha=Math.max(0,C.necesidad-C.recursos);
 C.detector=Math.max(0,C.requerida-C.vidaActual);
 C.infl=n(S.infl)/100;C.rend=n(S.rend)/100;
 C.activos=n(S.ahorro)+n(S.inversiones)+n(S.casaVal)+n(S.vehiculos)+n(S.otrosAct);
 C.props=(S.props||[]).map(p=>{const f=factor(p.moneda);const fr=(FREC.find(x=>x[0]===p.frec)||['',1])[1];const primaAnual=n(p.prima)*fr;return Object.assign({},p,{c:catOf(p.prod),f,sumaMXN:n(p.suma)*f,primaAnual,primaAnualMXN:primaAnual*f,capMXN:n(p.capFinal)*f})});
 C.sumaVidaProp=C.props.filter(p=>p.fam==='vida').reduce((a,p)=>a+p.sumaMXN,0);
 C.primaTotal=C.props.reduce((a,p)=>a+p.primaAnualMXN,0);
 /* si faltaras hoy */
 C.rwHoy=runway(C.recursos,C.gastoCubrir,C.infl,C.rend);
 C.rwProp=runway(C.recursos+C.sumaVidaProp,C.gastoCubrir,C.infl,C.rend);
 C.cubreProp=C.necesidad>0?Math.min(1,(C.recursos+C.sumaVidaProp)/C.necesidad):0;
 C.cubreHoy=C.necesidad>0?Math.min(1,C.recursos/C.necesidad):0;
 /* educación */
 const ie=n(S.inflEdu)/100,cc=n(S.costoCarrera);
 C.kids=(S.dep||[]).filter(d=>d&&(/hij/i.test(d.par||'')||(n(d.edad)>0&&n(d.edad)<18))&&d.edad!==''&&n(d.edad)<18).map(d=>{const y=Math.max(0,18-n(d.edad));const fut=cc*Math.pow(1+ie,y);return{nombre:d.nombre||'Hijo/a',edad:n(d.edad),y,hoy:cc,fut,pmt:y>0?fut/fvFactor(y*12,C.rend):fut}});
 C.eduTotal=C.kids.reduce((a,k)=>a+k.fut,0);
 C.eduPlan=C.props.filter(p=>p.fam==='ahorro').reduce((a,p)=>{
   if(p.capMXN>0)return a+p.capMXN;
   const y=C.kids.length?Math.max(...C.kids.map(k=>k.y)):10;return a+(p.primaAnualMXN/12)*fvFactor(Math.max(y,1)*12,C.rend)},0);
 C.eduPlanEstimado=C.props.some(p=>p.fam==='ahorro'&&!(p.capMXN>0));
 /* retiro */
 const er=n(S.edadRetiro),esp=n(S.esp)||85;
 C.ret=null;
 if(er>0&&C.edad&&er>C.edad){
  const yTo=er-C.edad,yRet=Math.max(esp-er,1),g0=n(S.gastoRet)||C.gasto;
  const meta=g0>0?pvNeeded(g0,C.infl,C.rend,yTo,yRet):0;
  const ingA=C.ingreso*12;
  const planProps=C.props.filter(p=>p.fam==='retiro');
  const aporteMes=planProps.reduce((a,p)=>a+p.primaAnualMXN/12,0);
  const planCap=planProps.reduce((a,p)=>a+(p.capMXN>0?p.capMXN:(p.primaAnualMXN/12)*fvFactor(yTo*12,C.rend)),0)+n(S.ahorroRet)*Math.pow(1+C.rend,yTo);
  const serie=[];{let b=n(S.ahorroRet);const rm=Math.pow(1+C.rend,1/12)-1;serie.push(b);for(let m=1;m<=yTo*12;m++){b=b*(1+rm)+aporteMes;if(m%12===0)serie.push(b)}
   const est=planProps.some(p=>p.capMXN>0);if(est&&serie.length){const last=serie[serie.length-1];const k=last>0?planCap/last:1;for(let i=0;i<serie.length;i++)serie[i]*=k}}
  C.ret={er,esp,yTo,yRet,g0,meta,plan:planCap,aporteMes,serie,pmtNec:meta/fvFactor(yTo*12,C.rend),axaGenerar:yTo*ingA,axaNecesitar:ingA*yRet,estimado:planProps.some(p=>!(p.capMXN>0)),hayPlan:planProps.length>0,cubre:meta>0?Math.min(1,planCap/meta):0};
 }
 /* compromiso */
 C.ingAnual=C.ingreso*12;C.recom=C.ingAnual*0.10;C.pctIng=C.ingAnual>0?C.primaTotal/C.ingAnual:0;
 return C;
}
/* ===== Gráficas (SVG y HTML, colores de la hoja) ===== */
const CN='var(--p-navy)',CG='var(--p-gold)',CD='var(--p-danger)',CK='var(--p-navy4)';
function hb(rows,o){o=o||{};const fmt=o.fmt||mx;const m=o.max||Math.max.apply(null,rows.map(r=>r.v).concat([1]));
 return '<div class="hbs">'+rows.map(r=>'<div class="hb" data-tip="'+esc(r.l)+': '+esc(fmt(r.v))+'"><span class="hl">'+esc(r.l)+'</span><span class="ht"><i style="width:'+(r.v>0?Math.max(r.v/m*100,1.5):0)+'%;background:'+(r.c||CN)+'"></i></span><b class="hv">'+esc(fmt(r.v))+'</b></div>').join('')+'</div>'}
function stack(segs){const vis=segs.filter(s=>s.v>0);
 return '<div class="stk" role="img" aria-label="'+esc(segs.map(s=>s.l+' '+mx(s.v)).join(', '))+'">'+vis.map(s=>'<i style="flex:'+s.v+';background:'+s.c+'" data-tip="'+esc(s.l)+': '+mx(s.v)+'"></i>').join('')+'</div><div class="leg">'+segs.map(s=>'<span><u style="background:'+s.c+'"></u>'+esc(s.l)+' <b>'+mx(s.v)+'</b></span>').join('')+'</div>'}
function donut(items){const tot=items.reduce((a,b)=>a+b.v,0);if(!tot)return '';const r=54,Cc=2*Math.PI*r;let off=0;
 const arcs=items.filter(i=>i.v>0).map(it=>{const len=it.v/tot*Cc;const d=Math.max(len-2,0);const s='<circle cx="70" cy="70" r="'+r+'" fill="none" stroke="'+it.c+'" stroke-width="20" stroke-dasharray="'+d.toFixed(2)+' '+(Cc-d).toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" data-tip="'+esc(it.l)+': '+mx(it.v)+' ('+Math.round(it.v/tot*100)+'%)"/>';off+=len;return s}).join('');
 return '<svg viewBox="0 0 140 140" class="donut" role="img" aria-label="Distribución del gasto mensual"><g transform="rotate(-90 70 70)">'+arcs+'</g><text x="70" y="68" text-anchor="middle" class="dn1">'+mxc(tot)+'</text><text x="70" y="82" text-anchor="middle" class="dn2">al mes</text></svg>'+
  '<div class="leg" style="justify-content:center">'+items.map(i=>'<span><u style="background:'+i.c+'"></u>'+esc(i.l)+' <b>'+mx(i.v)+'</b></span>').join('')+'</div>'}
function lineChart(o){const w=640,h=250,L=64,R=22,T=16,B=40;const xmax=Math.max(o.xmax,1),ymax=Math.max(o.ymax,1);
 const sx=i=>L+(w-L-R)*i/xmax,sy=v=>T+(h-T-B)*(1-Math.min(Math.max(v,0),ymax)/ymax);let g='';
 for(let k=0;k<=4;k++){const v=ymax*k/4,y=sy(v);g+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+y+'" y2="'+y+'" class="gl"/><text x="'+(L-8)+'" y="'+(y+4)+'" text-anchor="end" class="ax">'+mxc(v)+'</text>'}
 const step=xmax<=10?1:xmax<=20?2:5;for(let i=0;i<=xmax;i+=step)g+='<text x="'+sx(i)+'" y="'+(h-20)+'" text-anchor="middle" class="ax">'+i+'</text>';
 g+='<text x="'+((L+w-R)/2)+'" y="'+(h-4)+'" text-anchor="middle" class="ax">'+esc(o.xlabel||'años')+'</text>';
 o.series.forEach(s=>{const pts=[];for(let i=0;i<=xmax;i++)pts.push(s.pts[i]!=null?s.pts[i]:(s.hold&&s.pts.length?s.pts[s.pts.length-1]:0));
  const d=pts.map((v,i)=>(i?'L':'M')+sx(i).toFixed(1)+' '+sy(v).toFixed(1)).join(' ');
  g+='<path d="'+d+' L'+sx(xmax)+' '+sy(0)+' L'+sx(0)+' '+sy(0)+'Z" fill="'+s.c+'" opacity=".10"/><path d="'+d+'" fill="none" stroke="'+s.c+'" stroke-width="2.5" '+(s.dash?'stroke-dasharray="6 5" ':'')+'stroke-linejoin="round" stroke-linecap="round"/>';
  pts.forEach((v,i)=>{g+='<circle cx="'+sx(i).toFixed(1)+'" cy="'+sy(v).toFixed(1)+'" r="9" fill="transparent" data-tip="'+esc(s.n)+' · '+(o.xpre||'año ')+i+': '+mx(v)+'"/>'});
  if(s.end!=null){const x=sx(Math.min(s.end,xmax)),y=sy(0);g+='<circle cx="'+x.toFixed(1)+'" cy="'+y+'" r="5" fill="var(--p-bg)" stroke="'+s.c+'" stroke-width="2.5"/><text x="'+Math.min(Math.max(x,L+30),w-R-30).toFixed(1)+'" y="'+(y-12)+'" text-anchor="middle" class="lb">'+esc(s.endLabel||'')+'</text>'}
 });
 return '<svg viewBox="0 0 '+w+' '+h+'" class="lc" role="img" aria-label="'+esc(o.aria||'Gráfica')+'">'+g+'</svg><div class="leg">'+o.series.map(s=>'<span><u style="background:'+s.c+'"></u>'+esc(s.n)+'</span>').join('')+'</div>'}

/* Ciclo financiero de vida (ilustrativo) con tu edad y periodos clave */
function cicloVida(C){
 const w=640,h=270,L=24,R=20,T=34,B=44;const now=C.edad||35,ret=n(S.edadRetiro)||65,esp=n(S.esp)||85;
 const a0=Math.max(16,Math.min(now-(n(S.antig)||5),now-1));const x0=Math.min(a0,now)-2,x1=Math.max(esp,ret+5);
 const sx=a=>L+(w-L-R)*(a-x0)/(x1-x0),sy=v=>T+(h-T-B)*(1-v);
 const f=a=>{if(a<a0)return .12;if(a<=ret){const p=Math.min(1,(a-a0)/Math.max(.55*(ret-a0),1));let v=.22+.78*Math.sin(Math.PI/2*p);if(a>ret-8)v*=1-.18*(a-(ret-8))/8;return v}return .32*Math.exp(-(a-ret)/22)+.05};
 let d='';for(let a=Math.floor(x0);a<=x1;a+=1)d+=(d?'L':'M')+sx(a).toFixed(1)+' '+sy(f(a)).toFixed(1)+' ';
 const crit=Math.min(now+(C.anos||10),ret);let g='';
 g+='<rect x="'+sx(now)+'" y="'+T+'" width="'+(sx(crit)-sx(now))+'" height="'+(h-T-B)+'" fill="var(--p-goldbg)"/>';
 g+='<rect x="'+sx(ret)+'" y="'+T+'" width="'+(sx(x1)-sx(ret))+'" height="'+(h-T-B)+'" fill="var(--p-soft)"/>';
 g+='<path d="'+d+'L'+sx(x1)+' '+sy(0)+' L'+sx(Math.floor(x0))+' '+sy(0)+'Z" fill="var(--p-navy)" opacity=".10"/><path d="'+d+'" fill="none" stroke="var(--p-navy)" stroke-width="3" stroke-linejoin="round"/>';
 for(let a=Math.ceil(x0/10)*10;a<=x1;a+=10)g+='<line x1="'+sx(a)+'" x2="'+sx(a)+'" y1="'+(h-B)+'" y2="'+(h-B+4)+'" class="gl"/><text x="'+sx(a)+'" y="'+(h-B+17)+'" text-anchor="middle" class="ax">'+a+'</text>';
 g+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+(h-B)+'" y2="'+(h-B)+'" stroke="var(--p-ink3)" stroke-width="1"/><text x="'+((L+w-R)/2)+'" y="'+(h-6)+'" text-anchor="middle" class="ax">Edad</text>';
 g+='<line x1="'+sx(now)+'" x2="'+sx(now)+'" y1="'+(T-6)+'" y2="'+(h-B)+'" stroke="var(--p-gold)" stroke-width="2"/><circle cx="'+sx(now)+'" cy="'+sy(f(now))+'" r="6" fill="var(--p-gold)" stroke="var(--p-bg)" stroke-width="2"/>';
 const lab=(x,t,anchor)=>'<text x="'+x+'" y="'+(T-14)+'" text-anchor="'+(anchor||'middle')+'" class="lb">'+t+'</text>';
 g+=lab(Math.min(Math.max(sx(now),L+34),w-R-120),'Hoy: '+now+' años');
 g+='<text x="'+((sx(now)+sx(crit))/2)+'" y="'+(h-B-10)+'" text-anchor="middle" class="ax">Periodo crítico: dependientes</text>';
 g+='<text x="'+((sx(ret)+sx(x1))/2)+'" y="'+(h-B-10)+'" text-anchor="middle" class="ax">Retiro</text>';
 g+='<text x="'+Math.max(sx(a0)-10,L)+'" y="'+(sy(f(a0))-12)+'" text-anchor="start" class="ax">Inicio vida laboral</text>';
 return '<svg viewBox="0 0 '+w+' '+h+'" class="cy" role="img" aria-label="Ciclo financiero de vida: ingresos a lo largo de la edad, con tu edad actual, el periodo crítico y el retiro">'+g+'</svg>'}

const ICONS={
 fall:'<path d="M12 3v6M9.5 5.5h5M5 21V13a7 7 0 0 1 14 0v8z"/>',
 inval:'<circle cx="10" cy="4.5" r="1.8"/><path d="M10 7.5v7h5l3 6M10 11h5M7 13.5a5 5 0 1 0 6 6"/>',
 grave:'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M7 11h3l1.5-2.5 2 4 1.5-1.5h2"/>',
 cancer:'<path d="M12 3a4 4 0 0 0-4 4c0 5 4 7 4 7s4-2 4-7a4 4 0 0 0-4-4z"/><path d="M12 14l-4 7M12 14l4 7"/>',
 sob:'<circle cx="12" cy="5" r="2"/><path d="M12 8v6M12 14l-3 7M12 14l3 7M9 10l-3 6"/>'};
function icon(k){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+ICONS[k]+'</svg>'}
/* ===== Más apoyos visuales: iconos, anillos, figuras, crecimiento ===== */
Object.assign(ICONS,{
 fam:'<circle cx="8" cy="6" r="2.4"/><circle cx="17" cy="8" r="2"/><path d="M3.5 20v-5a4.5 4.5 0 0 1 9 0v5M14 20v-4a3.5 3.5 0 0 1 7 0v4"/>',
 wallet:'<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3"/><path d="M3 7.5V18a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5z"/><circle cx="16.5" cy="14" r="1.2"/>',
 shield:'<path d="M12 3l7 3v5.5c0 4.4-3 7.7-7 9.5-4-1.8-7-5.1-7-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
 cap:'<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.8V16c0 1.4 2.5 2.7 5.5 2.7s5.5-1.3 5.5-2.7v-4.2M21.5 9.5V15"/>',
 sun:'<circle cx="12" cy="14" r="4"/><path d="M12 4v2.5M4.5 8l1.8 1.8M19.5 8l-1.8 1.8M2.5 14h2.5M19 14h2.5M3 20h18"/>',
 house:'<path d="M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5"/><path d="M10 20v-5.5h4V20"/>',
 doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h6M9.5 15.5h6M9.5 18.5h3"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/>',
 up:'<path d="M4 18l5-5.5 3.5 3.5L20 7"/><path d="M14.5 7H20v5.5"/>',
 coins:'<ellipse cx="9.5" cy="7" rx="5.5" ry="2.6"/><path d="M4 7v4c0 1.4 2.5 2.6 5.5 2.6S15 12.4 15 11V7M4 11v4c0 1.4 2.5 2.6 5.5 2.6S15 16.4 15 15v-4"/><path d="M15 9.5c3 0 5.5 1 5.5 2.4v6c0 1.4-2.5 2.6-5.5 2.6-1.4 0-2.7-.3-3.7-.7"/>',
 target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
 phone:'<rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M11 18h2"/>',
 hand:'<path d="M12 21s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.8C19.5 16.4 12 21 12 21z"/>'
});
const ico=(k,c)=>'<svg viewBox="0 0 24 24" aria-hidden="true"'+(c?' class="'+c+'"':'')+'>'+ICONS[k]+'</svg>';

/* anillo de avance: externo = con propuesta, interno = hoy */
function ring(o){
 const r1=46,r2=33,c1=2*Math.PI*r1,c2=2*Math.PI*r2;const a=Math.max(0,Math.min(1,o.after||0)),b=Math.max(0,Math.min(1,o.before||0));
 const t=o.title,sub=o.sub||'';
 return '<div class="ringbox"><svg viewBox="0 0 120 120" role="img" aria-label="'+esc(t)+': hoy '+Math.round(b*100)+'%, con tu propuesta '+Math.round(a*100)+'%">'+
 '<circle cx="60" cy="60" r="'+r1+'" fill="none" stroke="var(--p-line)" stroke-width="12"/><circle cx="60" cy="60" r="'+r2+'" fill="none" stroke="var(--p-line)" stroke-width="9"/>'+
 '<g transform="rotate(-90 60 60)"><circle cx="60" cy="60" r="'+r1+'" fill="none" stroke="'+(o.single?'var(--p-navy)':'var(--p-gold)')+'" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+(c1*a).toFixed(1)+' '+c1.toFixed(1)+'" data-tip="Con tu propuesta: '+Math.round(a*100)+'%"/>'+
 (o.single?'':'<circle cx="60" cy="60" r="'+r2+'" fill="none" stroke="var(--p-navy)" stroke-width="9" stroke-linecap="round" stroke-dasharray="'+(c2*b).toFixed(1)+' '+c2.toFixed(1)+'" data-tip="Hoy: '+Math.round(b*100)+'%"/>')+'</g>'+
 '<text x="60" y="65" text-anchor="middle" class="rg1">'+(o.noPlan?'—':Math.round(a*100)+'%')+'</text></svg>'+
 '<b>'+esc(t)+'</b><span>'+esc(sub)+'</span>'+(o.single?'':'<em><u style="background:var(--p-navy)"></u>Hoy '+Math.round(b*100)+'%  <u style="background:var(--p-gold)"></u>Propuesta '+(o.noPlan?'—':Math.round(a*100)+'%')+'</em>')+'</div>';
}
function person(kind,label,sub){
 const H=kind==='kid'?46:kind==='teen'?58:70,r=kind==='kid'?6:kind==='teen'?6.5:7.5,top=72-H;const hy=top+r;const ty=top+2*r+3;const w=kind==='kid'?9:kind==='teen'?11:13;
 return '<div class="fig"><svg viewBox="0 0 36 72" style="width:38px;height:76px" aria-hidden="true"><circle cx="18" cy="'+hy+'" r="'+r+'" class="hd"/><path d="M'+(18-w)+' 71V'+(ty+w)+'a'+w+' '+w+' 0 0 1 '+(2*w)+' 0V71z" class="bd"/></svg><b>'+esc(label)+'</b><span>'+esc(sub)+'</span></div>';
}
/* crecimiento anual de un ahorro mensual: serie de aportado y de capital */
function growSeries(pmt,rend,years,scaleTo){
 const rm=Math.pow(1+rend,1/12)-1;let b=0,ap=0;const cap=[0],apo=[0];
 for(let m=1;m<=years*12;m++){b=b*(1+rm)+pmt;ap+=pmt;if(m%12===0){cap.push(b);apo.push(ap)}}
 if(scaleTo>0&&cap.length>1){const k=scaleTo/cap[cap.length-1];for(let i=0;i<cap.length;i++)cap[i]*=k}
 return{cap:cap,apo:apo};
}
/* línea de tiempo con hitos: [{x:año, l:texto}] */
function timeline(a0,a1,marks,now){
 const w=640,h=96,L=26,R=26,y=50;const sx=a=>L+(w-L-R)*(a-a0)/(a1-a0);let g='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--p-navy4)" stroke-width="6" stroke-linecap="round"/>';
 g+='<line x1="'+L+'" x2="'+sx(now)+'" y1="'+y+'" y2="'+y+'" stroke="var(--p-navy)" stroke-width="6" stroke-linecap="round"/>';
 marks.forEach((m,i)=>{const x=Math.min(Math.max(sx(m.x),L+4),w-R-4),up=i%2===0;g+='<circle cx="'+x+'" cy="'+y+'" r="8" fill="var(--p-bg)" stroke="'+(m.c||'var(--p-gold)')+'" stroke-width="3.5"/><text x="'+Math.min(Math.max(x,L+44),w-R-44)+'" y="'+(up?y-18:y+32)+'" text-anchor="middle" class="lb">'+esc(m.l)+'</text><text x="'+Math.min(Math.max(x,L+44),w-R-44)+'" y="'+(up?y-32:y+46)+'" text-anchor="middle" class="ax">'+esc(m.s||'')+'</text>'});
 g+='<circle cx="'+sx(now)+'" cy="'+y+'" r="5" fill="var(--p-navy)"/>';
 return '<svg viewBox="0 0 '+w+' '+(h+10)+'" class="lc" role="img" aria-label="Línea de tiempo">'+g+'</svg>';
}
/* ===== Entrevista: preguntas basadas en el Detector de Necesidades y el Diagnóstico AXA ===== */
const SI_NO=['Sí','No'];
const STEPS=[
 {id:'datos',t:'Datos generales',intro:'Rompe el hielo y conoce a la persona. Estas preguntas vienen de los dos formatos.',f:[
  ['nombre','¿Cómo te llamas?','text',{s2:1}],
  ['nacimiento','¿Cuál es tu fecha de nacimiento? (dd/mm/aaaa)','date'],
  ['ecivil','Estado civil','sel',{o:['Soltero/a','Casado/a','Unión libre','Divorciado/a','Viudo/a']}],
  ['tel','Teléfono','tel'],['correo','Correo electrónico','email'],
  ['ocupacion','¿A qué te dedicas actualmente?','text'],['estudios','¿Qué estudiaste?','text'],
  ['trabajo','¿En qué consiste tu trabajo?','text',{s2:1}],
  ['antig','¿Cuántos años llevas de vida laboral?','num'],
  ['fuma','¿Fumas?','sel',{o:['No','Sí']}],
  ['hobbies','¿Tienes algún hobbie?','text'],
  ['deporte','¿Practicas algún deporte? ¿Lo haces de forma profesional?','text']]},
 {id:'familia',t:'Familia y dependientes',intro:'Quién depende de los ingresos y por cuánto tiempo.',f:[
  ['conyuge','¿Cómo se llama tu cónyuge o pareja?','text'],['conyugeEdad','Edad de tu cónyuge','num'],
  ['conyugeOcup','¿A qué se dedica?','text'],['conyugeAporte','¿Qué porcentaje del gasto familiar aporta?','pct'],
  {h:'¿Tienes dependientes económicos?'},
  {tbl:'dep',add:'Agregar dependiente',cols:[['nombre','Nombre','text'],['par','Parentesco','text'],['edad','Edad','num'],['esc','Escolaridad u ocupación','text']],blank:{nombre:'',par:'',edad:'',esc:''}},
  ['anosInd','¿En cuántos años estimas que tus dependientes serán independientes?','num',{hint:'Los expertos sugieren cubrir entre 5 y 20 años de gasto familiar.'}]]},
 {id:'finanzas',t:'Ingresos y gastos',intro:'Cuánto entra, cuánto sale y cómo se reparte cada mes.',f:[
  ['ingPropio','¿A cuánto asciende tu ingreso mensual?','money'],['ingConyuge','¿Y el de tu cónyuge?','money'],
  {h:'Gasto mensual familiar'},
  ['gFijos','Gastos fijos (vivienda, servicios, alimentos, escuela)','money'],['gSeg','Seguros y ahorros','money'],
  ['gDiv','Diversión','money'],['gOtros','Otros','money'],
  ['casa','¿Tienes casa propia?','sel',{o:SI_NO}],['tarjeta','¿Tienes tarjeta de crédito?','sel',{o:SI_NO}],
  ['cheques','¿Tienes cuenta de cheques?','sel',{o:SI_NO}],['ahorra','¿Ahorras actualmente?','sel',{o:SI_NO}],
  ['ahorraPct','¿Qué porcentaje ahorras y para qué?','text',{s2:1}]]},
 {id:'patrimonio',t:'Patrimonio y deudas',intro:'Con qué recursos contaría tu familia si faltaras mañana.',f:[
  {h:'Patrimonio'},['ahorro','Ahorro','money'],['inversiones','Inversiones','money'],['casaVal','Casa propia (valor)','money'],['vehiculos','Vehículos','money'],['otrosAct','Otros','money'],
  {h:'Deudas'},['hipoteca','Hipoteca','money'],['prestamos','Préstamos','money'],['deudasOtras','Otras deudas','money'],
  ['deudasVig','De estas deudas, ¿cuáles seguirían vigentes en caso de fallecimiento?','area',{s2:1}],
  ['satisf','¿Te sientes satisfecho con el ahorro y el patrimonio que has construido a lo largo de tu vida laboral?','area',{s2:1}]]},
 {id:'proteccion',t:'Protección actual',intro:'Qué seguros tiene hoy y qué pasaría con la familia.',f:[
  {tbl:'prot',add:'Agregar seguro',cols:[['tipo','Tipo de seguro','sel',TIPOS_PROT],['cia','Compañía','text'],['suma','Suma asegurada','money'],['prima','Prima anual','money']],blank:{tipo:'Vida (propio)',cia:'',suma:'',prima:''}},
  ['pEstilo','Si llegaras a faltar o a invalidarte, ¿tu familia podría mantener el mismo estilo de vida?','area',{s2:1}],
  ['pRecurrir','¿A quién recurrirían si tú faltaras y no pudieras apoyarlos económicamente?','area',{s2:1}],
  ['pInstr','¿Consideras importante contar con un instrumento que brinde un capital a tu familia para proteger su tranquilidad financiera?','sel',{o:['Sí','No','Quiero analizarlo'],s2:1}]]},
 {id:'metas',t:'Sueños, educación y retiro',intro:'Metas con fecha: lo que requiere ahorro.',f:[
  ['finde','¿Qué hacen normalmente tu familia y tú los fines de semana?','text',{s2:1}],
  ['metaC','Metas a corto plazo','area'],['metaM','Metas a mediano plazo','area'],['metaL','Metas a largo plazo','area'],
  ['dondeAhorro','¿Dónde ahorras?','text'],['paraAhorro','¿Para qué estás ahorrando?','text'],
  ['planAhorro','¿Te gustaría contar con un plan de ahorro que te permita cumplir esas metas?','sel',{o:['Sí','No','Quiero analizarlo']}],
  {h:'Educación'},['eduOfrecer','¿Qué te gustaría poder ofrecer a tus hijos para su educación?','area',{s2:1}],
  ['eduPlan','¿Cuentas con algún plan de ahorro para ese propósito?','sel',{o:SI_NO}],['eduPlanear','¿Te gustaría planear desde ahora su futuro académico?','sel',{o:SI_NO}],
  {h:'Retiro'},['edadRetiro','¿A qué edad te gustaría retirarte?','num'],['esp','Esperanza de vida de referencia (años)','num',{hint:'Se usa para calcular cuántos años debe durar tu capital.'}],
  ['retEstilo','¿Cómo te visualizas a esa edad? ¿Qué estarías haciendo?','area',{s2:1}],
  ['retMismo','¿Te gustaría mantener el mismo estilo de vida que tienes hoy?','sel',{o:SI_NO}],
  ['gastoRet','¿Cuánto necesitarías al mes en el retiro, en pesos de hoy?','money',{hint:'Si lo dejas vacío se usa el gasto mensual actual.'}],
  ['retSabe','¿Sabes cuánto dinero necesitarías?','sel',{o:SI_NO}],['retFuentes','¿Tienes identificadas las fuentes de ese dinero? ¿Cuáles?','text'],
  ['ahorroRet','Ahorro actual destinado al retiro','money'],['retDeducir','¿Te sería útil deducir impuestos de lo que ahorres para el retiro?','sel',{o:SI_NO}],
  ['retInstr','¿Ya cuentas con un instrumento de ahorro para el retiro o te gustaría iniciar un ahorro sistemático?','text',{s2:1}]]},
 {id:'prioridades',t:'Prioridades y preocupaciones',intro:'Determina qué le importa más. Marca el orden de prioridad del 1 al 5.',custom:'pri'},
 {id:'compromiso',t:'Compromiso y referidos',intro:'Cuánto puede invertir cada mes y a quién más podrías ayudar.',f:[
  ['capacidad','¿Qué cantidad podrías invertir cada mes para proteger lo que hoy más te interesa?','money',{s2:1,hint:'Los expertos recomiendan ahorrar al menos 10% del ingreso anual.'}],
  {h:'Referidos'},
  {tbl:'refs',add:'Agregar referido',cols:[['nombre','Nombre','text'],['tel','Teléfono','tel'],['edad','Edad','num'],['ocup','Ocupación','text'],['ecivil','Estado civil','text'],['hijos','Hijos','num']],blank:{nombre:'',tel:'',edad:'',ocup:'',ecivil:'',hijos:''}}]}
];

function inp(path,type,extra){
 const v=getp(S,path);const a='data-k="'+esc(path)+'" data-t="'+type+'" '+(extra||'');
 if(type==='money'||type==='num'||type==='pct')return '<input '+a+' inputmode="decimal" value="'+esc(type==='money'?fmtNum(v):(v==null?'':v))+'" placeholder="'+(type==='money'?'$':'')+'">';
 if(type==='area')return '<textarea '+a+'>'+esc(v||'')+'</textarea>';
 if(type==='date')return '<input '+a+' value="'+esc(v||'')+'" placeholder="dd/mm/aaaa" inputmode="numeric">';
 return '<input '+a+' type="'+(type==='email'?'email':type==='tel'?'tel':'text')+'" value="'+esc(v||'')+'">';
}
function sel(path,opts,extra){const v=getp(S,path)||'';const arr=opts.map(o=>Array.isArray(o)?o:[o,o]);
 return '<select data-k="'+esc(path)+'" data-t="sel" '+(extra||'')+'><option value="">Selecciona…</option>'+arr.map(o=>'<option value="'+esc(o[0])+'"'+(v===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>'}
function fieldHtml(f,i){
 const [k,lab,type,o]=f;const op=o||{};const id='f_'+k.replace(/\./g,'_');
 let ctl=type==='sel'?sel(k,op.o,'id="'+id+'"'):inp(k,type,'id="'+id+'"');
 let hint='';if(op.hint)hint='<span class="hint">'+esc(op.hint)+'</span>';
 if(k==='nacimiento'){const a=ageFrom(S.nacimiento);hint='<span class="hint" id="ageHint">'+(a!=null?'Edad: '+a+' años':(S.nacimiento?'Escribe la fecha como dd/mm/aaaa':''))+'</span>'}
 return '<div class="fld'+(op.s2?' s2':'')+'"><label for="'+id+'">'+esc(lab)+'</label>'+ctl+hint+'</div>';
}
function tableHtml(t){
 const rows=S[t.tbl]||[];
 return '<div class="tw"><table class="t"><thead><tr>'+t.cols.map(c=>'<th>'+esc(c[1])+'</th>').join('')+'<th></th></tr></thead><tbody>'+rows.map((r,i)=>'<tr>'+t.cols.map(c=>'<td>'+(c[2]==='sel'?sel(t.tbl+'.'+i+'.'+c[0],c[3],'aria-label="'+esc(c[1])+'"'):inp(t.tbl+'.'+i+'.'+c[0],c[2],'aria-label="'+esc(c[1])+'"'))+'</td>').join('')+'<td><button class="btn sm" data-act="del" data-tbl="'+t.tbl+'" data-i="'+i+'" aria-label="Quitar fila">Quitar</button></td></tr>').join('')+'</tbody></table></div><div class="s2" style="grid-column:1/-1"><button class="btn sm" data-act="add" data-tbl="'+t.tbl+'">'+esc(t.add)+'</button></div>';
}
function prioHtml(){
 return '<div class="tw"><table class="t"><thead><tr><th>Determinación de prioridades</th><th>Interés</th><th>Orden (1 a 5)</th></tr></thead><tbody>'+PRI.map(p=>'<tr><td>'+esc(p[1])+'</td><td style="width:120px">'+sel('pri.'+p[0]+'.si',SI_NO,'aria-label="Interés"')+'</td><td style="width:120px">'+sel('pri.'+p[0]+'.ord',['1','2','3','4','5'],'aria-label="Orden"')+'</td></tr>').join('')+'</tbody></table></div>'+
 '<div class="sub">En este momento de tu vida, ¿qué es lo que más te preocupa tener protegido?</div><div class="cobs">'+PREOC.map(p=>'<label class="chk"><input type="checkbox" data-k="preoc.'+p[0]+'" data-t="chk"'+(getp(S,'preoc.'+p[0])?' checked':'')+'>'+esc(p[1])+'</label>').join('')+'</div>';
}
function filled(st){if(st.custom)return Object.keys(S.pri||{}).length>0;const fs=(st.f||[]).filter(Array.isArray);if(!fs.length)return false;const c=fs.filter(f=>{const v=getp(S,f[0]);return v!=null&&String(v).trim()!==''}).length;return c/fs.length>=.5}
function renderEntrevista(){
 const st=STEPS[S.step||0];const C=calc();
 let h='<div class="lay"><nav class="rail" aria-label="Pasos de la entrevista">'+STEPS.map((s,i)=>'<button class="st'+(filled(s)?' done':'')+'" data-act="step" data-i="'+i+'"'+(i===(S.step||0)?' aria-current="step"':'')+'><i>'+(filled(s)&&i!==(S.step||0)?'✓':i+1)+'</i>'+esc(s.t)+'</button>').join('')+'</nav><div>';
 h+='<div class="sum" id="sum">'+sumHtml(C)+'</div>';
 h+='<section class="dpanel"><h2>'+esc(st.t)+'</h2><p class="intro">'+esc(st.intro)+'</p><div class="grid">';
 if(st.custom==='pri')h+=prioHtml();
 else (st.f||[]).forEach((f,i)=>{if(Array.isArray(f))h+=fieldHtml(f,i);else if(f.h)h+='<div class="sub">'+esc(f.h)+'</div>';else if(f.tbl)h+=tableHtml(f)});
 h+='<div class="fld notas"><label for="f_notas">Notas del asesor (no salen en el entregable)</label><textarea id="f_notas" data-k="notas.'+st.id+'" data-t="area">'+esc(getp(S,'notas.'+st.id)||'')+'</textarea></div>';
 h+='</div><div class="nav"><button class="btn" data-act="prev"'+((S.step||0)===0?' disabled':'')+'>Anterior</button>';
 h+=(S.step||0)<STEPS.length-1?'<button class="btn pri" data-act="next">Siguiente</button>':'<button class="btn gold" data-act="goProd">Definir el producto</button>';
 h+='</div></section></div></div>';
 return h;
}
function sumHtml(C){return '<div><small>Edad</small><b>'+(C.edad!=null?C.edad:'—')+'</b></div><div><small>Gasto mensual</small><b>'+mx(C.gasto)+'</b></div><div><small>Necesidad de protección</small><b>'+mxc(C.necesidad)+'</b></div><div class="bad"><small>Brecha por cubrir</small><b>'+mxc(C.brecha)+'</b></div>'}

/* ===== Producto: tú defines plan, tipo, moneda y plazo ===== */
function optsOther(list,cur){return list}
function propHtml(p,i){
 const c=catOf(p.prod);const tipos=c.tipos;const plazos=c.plazos(p.tipo,p.moneda);const P='props.'+i+'.';
 const prods=CATALOGO.map(x=>[x.id,(x.aseg?x.aseg+' · ':'')+x.nombre]);
 const min=c.minSA(p.tipo,p.moneda);const sumaN=n(p.suma);
 const warn=min&&sumaN&&sumaN<min?'<span class="hint warn">Está por debajo del mínimo de referencia ('+fmtNum(min)+'). Confirma en el cotizador.</span>':(min?'<span class="hint">Mínimo de referencia: '+fmtNum(min)+'</span>':'');
 const f=factor(p.moneda);const eqS=p.moneda!=='MXN'&&sumaN?'<span class="eq">Equivale a '+mx(sumaN*f)+' MXN</span>':'';
 const fr=(FREC.find(x=>x[0]===p.frec)||['',1])[1];const anual=n(p.prima)*fr;
 const eqP=n(p.prima)?'<span class="eq">Prima anual: '+fmtNum(anual)+(p.moneda!=='MXN'?' ('+mx(anual*f)+' MXN)':'')+'</span>':'';
 const plz=plazos.length?sel(P+'plazo',plazos.concat([['__otro','Otro…']]),'data-r="1" id="'+P+'pl"'):'<input data-k="'+P+'plazoTxt" data-t="text" value="'+esc(p.plazoTxt||'')+'" placeholder="Ej. 20 años" id="'+P+'pl">';
 const plzOtro=p.plazo==='__otro'?'<input data-k="'+P+'plazoTxt" data-t="text" value="'+esc(p.plazoTxt||'')+'" placeholder="Escribe el plazo" aria-label="Plazo">':'';
 const tipoSel=tipos.length?sel(P+'tipo',tipos.concat([['__otro','Otro…']]),'data-r="1"'):'<input data-k="'+P+'tipoTxt" data-t="text" value="'+esc(p.tipoTxt||'')+'" placeholder="Tipo de plan">';
 const tipoOtro=p.tipo==='__otro'?'<input data-k="'+P+'tipoTxt" data-t="text" value="'+esc(p.tipoTxt||'')+'" placeholder="Escribe el tipo" aria-label="Tipo">':'';
 let h='<div class="prop"><h3><span>Plan '+(i+1)+'</span><button class="btn sm danger" data-act="delprop" data-i="'+i+'">Quitar plan</button></h3><div class="grid">';
 h+='<div class="fld"><label>Producto</label>'+sel(P+'prod',prods,'data-r="1" data-newprod="'+i+'"')+'</div>';
 if(p.prod==='otro')h+='<div class="fld"><label>Aseguradora y nombre del producto</label><input data-k="'+P+'nombre" data-t="text" value="'+esc(p.nombre||'')+'" placeholder="Ej. MetLife Vida Segura"></div>';
 else h+='<div class="fld"><label>Aseguradora</label><input data-k="'+P+'aseg" data-t="text" value="'+esc(p.aseg||'')+'"></div>';
 if(p.prod==='otro'||p.prod==='gmm')h+='<div class="fld"><label>Qué necesidad resuelve</label>'+sel(P+'fam',[['vida','Protección de vida'],['ahorro','Ahorro o educación'],['retiro','Retiro'],['gmm','Gastos médicos'],['otro','Otra']],'data-r="1"')+'</div>';
 h+='<div class="fld"><label>Tipo de plan</label>'+tipoSel+tipoOtro+'</div>';
 h+='<div class="fld"><label>Moneda</label>'+sel(P+'moneda',Object.entries(MONEDA),'data-r="1"')+(p.moneda==='UDI'?'<span class="hint">Valor UDI usado: '+(n(S.udi)||'—')+' (ajústalo en Supuestos)</span>':p.moneda==='USD'?'<span class="hint">Tipo de cambio usado: '+(n(S.tc)||'—')+' (ajústalo en Supuestos)</span>':'')+'</div>';
 h+='<div class="fld"><label>Plazo</label>'+plz+plzOtro+'</div>';
 h+='<div class="fld"><label>Suma asegurada'+(p.moneda!=='MXN'?' ('+(p.moneda==='UDI'?'en UDIs':'en dólares')+')':'')+'</label>'+inp(P+'suma','money')+warn+eqS+'</div>';
 h+='<div class="fld"><label>Prima por pago</label>'+inp(P+'prima','money')+eqP+'</div>';
 h+='<div class="fld"><label>Frecuencia de pago</label>'+sel(P+'frec',FREC.map(x=>x[0]),'data-r="1"')+'</div>';
 if(p.fam==='ahorro'||p.fam==='retiro')h+='<div class="fld"><label>Capital al vencimiento (de tu cotización)</label>'+inp(P+'capFinal','money')+'<span class="hint">Si lo dejas vacío se estima con el rendimiento de Supuestos.</span></div>';
 if(c.cob.length){h+='<div class="fld s2"><label>Coberturas</label><div class="cobs">'+c.cob.map(cb=>cb[2]?'<span class="chk"><input type="checkbox" checked disabled>'+esc(cb[1])+' <small>(incluida)</small></span>':'<label class="chk"><input type="checkbox" data-k="'+P+'cobs.'+cb[0]+'" data-t="chk"'+(p.cobs&&p.cobs[cb[0]]?' checked':'')+'>'+esc(cb[1])+'</label>').join('')+'</div></div>'}
 h+='<div class="fld s2"><label>Notas del plan (deducible, coaseguro, descuentos, condiciones)</label><textarea data-k="'+P+'notas" data-t="area">'+esc(p.notas||'')+'</textarea>'+(c.nota?'<span class="hint">'+esc(c.nota)+'</span>':'')+'</div>';
 return h+'</div></div>';
}
function renderProducto(){
 const props=S.props||[];
 let h='<div class="two"><section class="dpanel"><h2>Define el producto</h2><p class="intro">Elige plan, tipo, moneda y plazo. Puedes agregar varios planes (vida, ahorro, retiro, gastos médicos) y todos se integran al entregable.</p>';
 h+='<div class="addrow">'+CATALOGO.map(c=>'<button class="btn sm" data-act="addprop" data-id="'+c.id+'">+ '+esc((c.aseg?c.aseg+' ':'')+c.nombre)+'</button>').join('')+'</div>';
 h+=props.length?props.map(propHtml).join(''):'<div class="prop">Aún no hay planes. Agrega uno con los botones de arriba.</div>';
 h+='</section><section class="dpanel"><h2>Supuestos y datos del asesor</h2><p class="intro">Alimentan las proyecciones. Son ilustrativos y puedes cambiarlos para cada cliente.</p><div class="grid">';
 const sp=[['infl','Inflación anual (%)','pct'],['rend','Rendimiento anual del capital (%)','pct'],['inflEdu','Inflación educativa anual (%)','pct'],['costoCarrera','Costo de una carrera hoy','money'],['udi','Valor de la UDI (actualízalo)','num'],['tc','Tipo de cambio USD a MXN (actualízalo)','num']];
 sp.forEach(x=>{h+='<div class="fld"><label for="s_'+x[0]+'">'+x[1]+'</label>'+inp(x[0],x[2],'id="s_'+x[0]+'" data-live="1"')+'</div>'});
 h+='<div class="fld s2"><label class="chk"><input type="checkbox" data-k="descConyuge" data-t="chk" data-live="1"'+(S.descConyuge?' checked':'')+'>Descontar la aportación del cónyuge al calcular el gasto que debe cubrirse</label></div>';
 h+='<div class="sub">Datos del asesor (salen en la portada y el cierre)</div>';
 [['asesor','Nombre','text'],['asesorTit','Título','text'],['asesorWA','WhatsApp','tel'],['asesorMail','Correo','email']].forEach(x=>{h+='<div class="fld"><label for="s_'+x[0]+'">'+x[1]+'</label>'+inp(x[0],x[2],'id="s_'+x[0]+'"')+'</div>'});
 h+='</div><div class="nav"><button class="btn" data-act="goEnt">Volver a la entrevista</button><button class="btn gold" data-act="goRep">Ver entregable</button></div></section></div>';
 return h;
}
/* ===== Entregable para el cliente (parte 1) ===== */
const yrs=r=>r.sinGasto?'—':(!r.agotado?'más de 40 años':(r.years<1?'menos de 1 año':r.years.toFixed(1).replace('.0','')+' años'));
function tipoLabel(p){const c=catOf(p.prod);if(p.tipo==='__otro'||!c.tipos.length)return p.tipoTxt||'';const t=c.tipos.find(x=>x[0]===p.tipo);return t?t[1]:(p.tipoTxt||'')}
function plazoLabel(p){const c=catOf(p.prod);return (p.plazo==='__otro'||!c.plazos(p.tipo,p.moneda).length)?(p.plazoTxt||'—'):(p.plazo||'—')}
function pName(p){return p.prod==='otro'?(p.nombre||'Producto'):((p.aseg?p.aseg+' ':'')+(p.nombre||catOf(p.prod).nombre))}
const RESUELVE={vida:'Protege el ingreso de tu familia si faltaras.',ahorro:'Construye el capital para la educación de tus hijos.',retiro:'Forma el capital para mantener tu estilo de vida en el retiro.',gmm:'Protege tu patrimonio ante gastos médicos.',otro:'Complementa tu plan patrimonial.'};
const FAMICO={vida:'shield',ahorro:'cap',retiro:'sun',gmm:'hand',otro:'doc'};

function sheetWrap(kick,title,body,pn,nombre,ic){
 return '<section class="sheet"><header class="sh"><img src="'+LOGO+'" alt="J L Consultoría Patrimonial"><div class="kt"><span>'+esc(kick)+'</span><h2>'+esc(title)+'</h2></div>'+(ic?'<span class="badge">'+ico(ic)+'</span>':'')+'<span class="pn">'+pn+'</span></header><div class="sb">'+body+'</div>'+
 '<footer class="sf"><span>Documento confidencial. Toda la información es de carácter confidencial y de uso exclusivo de '+esc(nombre)+'. Prohibida su reproducción o difusión.</span><span>J L Consultoría Patrimonial</span></footer></section>';
}
function kpi(l,v,cls,ic){return '<div class="kpi '+(cls||'')+'">'+(ic?'<i class="ki">'+ico(ic)+'</i>':'')+'<small>'+esc(l)+'</small><b>'+v+'</b></div>'}
function empty(t){return '<div class="empty">'+esc(t)+'</div>'}
function tileIc(ic,big,txt){return '<div class="tileic"><i>'+ico(ic)+'</i><div><b>'+big+'</b><span>'+esc(txt)+'</span></div></div>'}

function sPartida(C){
 const deps=(S.dep||[]).filter(d=>d&&(d.nombre||d.edad));
 let b='<div class="kpis">'+kpi('Tu edad',C.edad!=null?C.edad+' años':'—','','clock')+kpi('Dependientes',String(deps.length),'','fam')+kpi('Ingreso mensual',mx(C.ingreso),'','wallet')+kpi('Gasto mensual',mx(C.gasto),'gold','coins')+'</div>';
 b+='<p>'+(C.edad!=null?'Hoy tienes <b>'+C.edad+' años</b>':'Hoy')+(S.ocupacion?' y te dedicas a '+esc(String(S.ocupacion).toLowerCase()):'')+'. '+(deps.length?'Tu familia depende de tus ingresos durante unos <b>'+C.anos+' años</b>. ':'')+'Para mantener su estilo de vida se necesitan alrededor de <b>'+mx(C.gasto)+' al mes</b>.</p>';
 const figs=[person('adult',S.nombre||'Tú',C.edad!=null?C.edad+' años':'')];
 if(S.conyuge)figs.push(person('adult',S.conyuge,n(S.conyugeEdad)?n(S.conyugeEdad)+' años':'Cónyuge'));
 deps.forEach(d=>{const e=n(d.edad);figs.push(person(e&&e<13?'kid':(e&&e<20?'teen':'adult'),d.nombre||d.par||'Dependiente',e?e+' años':(d.par||'')))});
 b+='<div><h3>Quiénes dependen de tu ingreso</h3><div class="figs">'+figs.join('')+'</div></div>';
 b+='<div><h3>Tu ciclo financiero de vida</h3>'+cicloVida(C)+'<p class="cap">Gráfica ilustrativa. Tu etapa más productiva coincide con la de mayores responsabilidades: criar, educar, pagar la casa y construir el retiro.</p></div>';
 return b;
}
function sSituacion(C){
 const marg=C.ingreso-C.gasto;const act=n(S.ahorro)+n(S.inversiones)+n(S.casaVal)+n(S.vehiculos)+n(S.otrosAct);const deu=C.deudas;const neto=act-deu;
 let b='<div class="c2"><div><h3>A dónde se va tu gasto</h3>'+(C.gasto?donut([{l:'Fijos',v:n(S.gFijos),c:'var(--p-navy)'},{l:'Seguros y ahorro',v:n(S.gSeg),c:'var(--p-navy2)'},{l:'Diversión',v:n(S.gDiv),c:'var(--p-navy3)'},{l:'Otros',v:n(S.gOtros),c:'var(--p-gold)'}]):empty('Captura tus gastos en la entrevista.'))+'</div>';
 b+='<div><h3>Cada mes</h3>'+tileIc('wallet',mx(C.ingreso),'entra a tu hogar')+tileIc('coins',mx(C.gasto),'sale para sostenerlo')+tileIc('up',(marg<0?'−':'')+mx(Math.abs(marg)),marg<0?'te faltan cada mes':'te queda libre cada mes')+'</div></div>';
 b+='<div><h3>Tu balance patrimonial</h3><div class="c2"><div>'+stack([{l:'Ahorro e inversiones',v:n(S.ahorro)+n(S.inversiones),c:'var(--p-navy)'},{l:'Casa',v:n(S.casaVal),c:'var(--p-navy2)'},{l:'Vehículos y otros',v:n(S.vehiculos)+n(S.otrosAct),c:'var(--p-navy3)'}])+'<p class="cap" style="margin-top:6px">Lo que tienes: <b>'+mx(act)+'</b></p></div><div>'+stack([{l:'Hipoteca',v:n(S.hipoteca),c:'var(--p-danger)'},{l:'Préstamos y otras',v:n(S.prestamos)+n(S.deudasOtras),c:'#D98A80'}])+'<p class="cap" style="margin-top:6px">Lo que debes: <b>'+mx(deu)+'</b></p></div></div></div>';
 const tasaAh=C.ingreso>0?(n(S.gSeg)/C.ingreso):0;const dPat=act>0?Math.min(1,deu/act):0;
 b+='<div class="rings">'+ring({title:'Avance de tu ahorro',sub:'Ahorras '+(tasaAh*100).toFixed(1)+'% del ingreso; meta 10%',before:0,after:Math.min(1,tasaAh/0.10),single:true})+ring({title:'Deuda sobre patrimonio',sub:'Entre menos, mejor',before:0,after:dPat,single:true})+'<div class="kpis" style="grid-template-columns:1fr;align-content:center">'+kpi('Patrimonio neto',mx(neto),neto<0?'bad':'ok','house')+'</div></div>';
 const prot=(S.prot||[]).filter(r=>r&&(r.cia||n(r.suma)||n(r.prima)));
 b+='<div><h3>Tu protección actual</h3>'+(prot.length?'<table class="pt"><thead><tr><th>Tipo de seguro</th><th>Compañía</th><th class="r">Suma asegurada</th><th class="r">Prima anual</th></tr></thead><tbody>'+prot.map(r=>'<tr><td>'+esc(r.tipo)+'</td><td>'+esc(r.cia)+'</td><td class="r">'+mx(n(r.suma))+'</td><td class="r">'+mx(n(r.prima))+'</td></tr>').join('')+'</tbody></table>':empty('No se registró protección vigente.'))+'</div>';
 return b;
}
function sRiesgos(C){
 const props=C.props;const cob=new Set();props.forEach(p=>{Object.keys(p.cobs||{}).forEach(k=>{if(p.cobs[k])cob.add(k)});p.c.cob.forEach(cb=>{if(cb[2])cob.add(cb[0])})});
 const any=l=>l.some(k=>cob.has(k));
 const R=[['fall','Fallecimiento','Tu familia recibe un capital para sostener su nivel de vida.',props.some(p=>p.fam==='vida')],
  ['inval','Invalidez','Si no puedes trabajar, el ingreso y el pago de primas quedan protegidos.',any(RIESGO_COB.inval)],
  ['grave','Enfermedad grave','Un capital para atender el diagnóstico sin tocar tu patrimonio.',any(RIESGO_COB.grave)||props.some(p=>p.fam==='gmm')],
  ['cancer','Cáncer','Una indemnización adicional ante el diagnóstico.',any(RIESGO_COB.cancer)],
  ['sob','Supervivencia','Llegar al retiro o a la meta con el capital ya construido.',props.some(p=>p.fam==='retiro'||p.fam==='ahorro')]];
 let b='<p>Cinco riesgos amenazan la tranquilidad financiera de una familia. Así queda cada uno con tu propuesta.</p><div class="c3">'+R.map(r=>'<div class="risk">'+icon(r[0])+'<b>'+r[1]+'</b><p>'+r[2]+'</p><span class="pill '+(r[3]?'ok':'no')+'">'+(r[3]?'Cubierto en tu propuesta':'Sin plan asignado')+'</span></div>').join('')+'</div>';
 const si=['shield','clock','cap','coins'];
 b+='<div><h3>Lo que dicen las cifras</h3><div class="c2" style="gap:18px 24px">'+STATS.map((s,i)=>'<div class="stat"><i>'+ico(si[i%4])+'</i><div><b>'+esc(s.v)+'</b><span>'+esc(s.t)+'</span><em>Fuente: '+esc(s.s)+'</em></div></div>').join('')+'</div></div>';
 return b;
}
function sProteccion(C){
 if(!C.gasto)return empty('Captura el gasto mensual familiar para calcular la necesidad de protección.');
 let b='<p>Los expertos sugieren garantizar entre 5 y 20 años del gasto familiar para que los dependientes puedan salir adelante por sí solos.</p>';
 b+='<div class="formula"><div><small>Gasto mensual a cubrir</small><b>'+mx(C.gastoCubrir)+'</b></div><span class="op">×</span><div><small>Meses</small><b>12</b></div><span class="op">×</span><div><small>Años</small><b>'+C.anos+'</b></div><span class="op">+</span><div><small>Deudas</small><b>'+mx(C.deudas)+'</b></div><span class="op">=</span><div class="res"><small>Necesidad total</small><b>'+mx(C.necesidad)+'</b></div></div>';
 if(C.descuenta)b+='<p class="cap">El gasto a cubrir descuenta el '+Math.round(C.pctCony*100)+'% que aporta tu cónyuge y que seguiría generándose.</p>';
 b+='<div class="c2"><div><h3>Lo que tienes frente a lo que se necesita</h3>'+stack([{l:'Seguro de vida actual',v:C.vidaActual,c:'var(--p-navy)'},{l:'Ahorro e inversiones',v:C.liquidos,c:'var(--p-navy3)'},{l:'Brecha',v:C.brecha,c:'var(--p-danger)'}])+'</div><div class="rings" style="grid-template-columns:1fr">'+ring({title:'Necesidad cubierta',sub:'Frente a '+mxc(C.necesidad),before:C.cubreHoy,after:C.cubreProp,noPlan:!C.props.length})+'</div></div>';
 const ya=Math.max(C.rwHoy.years,C.rwProp.years,1);const xmax=Math.min(40,Math.max(Math.ceil(ya)+1,5));const ymax=Math.max(C.recursos+C.sumaVidaProp,C.recursos,1);
 const sh={n:'Hoy',c:'var(--p-danger)',pts:C.rwHoy.pts,end:C.rwHoy.agotado?C.rwHoy.years:null,endLabel:C.rwHoy.agotado?'Se agota en '+yrs(C.rwHoy):''};
 const sp={n:'Con tu propuesta',c:'var(--p-gold)',pts:C.rwProp.pts,end:C.rwProp.agotado?C.rwProp.years:null,endLabel:C.rwProp.agotado?'Se agota en '+yrs(C.rwProp):''};
 b+='<div><h3>Si faltaras hoy, ¿cuánto le dura el capital a tu familia?</h3>'+lineChart({series:C.props.length?[sh,sp]:[sh],xmax:xmax,ymax:ymax,aria:'Capital disponible año por año, hoy y con tu propuesta'})+'<p class="cap">Proyección ilustrativa con inflación de '+n(S.infl)+'% y rendimiento de '+n(S.rend)+'% anual. Supone que el capital se usa para cubrir el gasto mensual a cubrir.</p></div>';
 b+='<div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">'+kpi('Con lo que tienes hoy',yrs(C.rwHoy),'bad','clock')+kpi('Con tu propuesta',C.props.length?yrs(C.rwProp):'—','gold','shield')+kpi('Fórmula del Detector',mxc(C.detector),'','doc')+'</div>';
 b+='<p class="cap">Fórmula del Detector de Necesidades: gasto anual a cubrir × años − protección actual de vida = '+mx(C.detector)+'.</p>';
 return b;
}
function sEducacion(C){
 const figs=C.kids.map(k=>person(k.edad<13?'kid':'teen',k.nombre,k.edad+' años · '+k.y+' años para la universidad')).join('');
 let b='<p>El costo de una carrera crece más rápido que los precios en general. Entre más pronto empieces, menos tienes que ahorrar cada mes.</p><div class="figs">'+figs+'</div>';
 b+='<table class="pt"><thead><tr><th>Hijo/a</th><th class="r">Edad</th><th class="r">Carrera hoy</th><th class="r">Costo al cumplir 18</th><th class="r">Ahorro mensual sugerido</th></tr></thead><tbody>'+C.kids.map(k=>'<tr><td>'+esc(k.nombre)+'</td><td class="r">'+k.edad+'</td><td class="r">'+mx(k.hoy)+'</td><td class="r">'+mx(k.fut)+'</td><td class="r">'+mx(k.pmt)+'</td></tr>').join('')+'</tbody></table>';
 const k0=C.kids.reduce((a,k)=>k.y>a.y?k:a,C.kids[0]);const Y=Math.max(Math.round(k0.y),1);
 const cost=[];for(let t=0;t<=Y;t++)cost.push(n(S.costoCarrera)*Math.pow(1+n(S.inflEdu)/100,t));
 const ahp=C.props.filter(p=>p.fam==='ahorro');const pmtM=ahp.reduce((a,p)=>a+p.primaAnualMXN/12,0);const capIf=ahp.reduce((a,p)=>a+p.capMXN,0);
 const gs=growSeries(pmtM||k0.pmt,C.rend,Y,ahp.length&&capIf>0&&ahp.length===1?capIf:0);
 const ser=[{n:'Costo de la carrera de '+k0.nombre,c:'var(--p-danger)',pts:cost,dash:true},{n:ahp.length?'Capital con tu plan':'Ahorro sugerido',c:'var(--p-gold)',pts:gs.cap},{n:'Lo que aportas',c:'var(--p-navy)',pts:gs.apo}];
 b+='<div><h3>El costo crece. Tu ahorro también.</h3>'+lineChart({series:ser,xmax:Y,ymax:Math.max(cost[Y],gs.cap[gs.cap.length-1],1),aria:'Costo proyectado de la carrera frente al capital ahorrado'})+'<p class="cap">Inflación educativa de '+n(S.inflEdu)+'% y rendimiento de '+n(S.rend)+'% anual. '+(ahp.length?(C.eduPlanEstimado?'El capital de tu plan se estima; confirma el valor en tu cotización.':''):'Sin plan asignado se muestra el ahorro mensual sugerido.')+'</p></div>';
 b+='<div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">'+kpi('Costo total proyectado',mxc(C.eduTotal),'bad','cap')+kpi('Capital con tu plan',ahp.length?mxc(C.eduPlan):'—','gold','coins')+kpi('Meta cubierta',ahp.length&&C.eduTotal?Math.round(Math.min(1,C.eduPlan/C.eduTotal)*100)+'%':'—','','target')+'</div>';
 return b;
}
/* ===== Entregable para el cliente (parte 2) ===== */
function sRetiro(C){
 const r=C.ret;const ret=C.props.filter(p=>p.fam==='retiro');
 let b='<div class="kpis">'+kpi('Edad de retiro',r.er+' años','','sun')+kpi('Años para ahorrar',String(r.yTo),'','clock')+kpi('Capital necesario',mxc(r.meta),'bad','target')+kpi('Capital con tu plan',r.hayPlan?mxc(r.plan):'—','gold','coins')+'</div>';
 b+='<div><h3>Tu camino al retiro</h3>'+timeline(C.edad,r.esp,[{x:C.edad,l:'Hoy',s:C.edad+' años',c:'var(--p-navy)'},{x:r.er,l:'Retiro',s:r.er+' años'},{x:r.esp,l:'Meta de vida',s:r.esp+' años',c:'var(--p-navy2)'}],C.edad)+'</div>';
 const sMeta=[];for(let i=0;i<=r.yTo;i++)sMeta.push(r.meta);
 const ser=[{n:'Capital con tu plan',c:'var(--p-gold)',pts:r.serie},{n:'Capital necesario',c:'var(--p-danger)',pts:sMeta,dash:true}];
 b+='<div><h3>Tu capital crece hacia el retiro</h3>'+lineChart({series:ser,xmax:Math.max(r.yTo,1),ymax:Math.max(r.meta,r.plan,1),aria:'Capital acumulado hacia el retiro frente al capital necesario'})+'<p class="cap">El capital necesario mantiene un gasto de '+mx(r.g0)+' al mes en pesos de hoy hasta los '+r.esp+' años, con inflación de '+n(S.infl)+'% y rendimiento de '+n(S.rend)+'%. '+(r.hayPlan&&r.estimado?'El capital de tu plan se estima con ese rendimiento; confirma el valor en tu cotización.':'')+'</p></div>';
 const apo=r.aporteMes*12*r.yTo+n(S.ahorroRet);const rend=Math.max(0,r.plan-apo);
 b+='<div class="c2"><div><h3>De dónde sale tu capital</h3>'+(r.hayPlan?stack([{l:'Lo que aportas',v:apo,c:'var(--p-navy)'},{l:'Lo que genera el rendimiento',v:rend,c:'var(--p-gold)'}]):empty('Agrega un plan de retiro en la pestaña Producto.'))+'</div>';
 const pm=r.hayPlan?r.aporteMes:r.pmtNec;const wait=[0,5,10].map(d=>({d:d,v:d>=r.yTo?0:growSeries(pm,C.rend,r.yTo-d).cap.slice(-1)[0]}));
 b+='<div><h3>El costo de esperar</h3>'+hb(wait.map(w=>({l:w.d===0?'Empezar hoy':'Esperar '+w.d+' años',v:w.v,c:w.d===0?CG:CN})),{fmt:mxc})+'<p class="cap">Mismo ahorro mensual de '+mx(pm)+', menos años para crecer.</p></div></div>';
 b+='<div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">'+kpi('Ahorro mensual necesario para la meta',mx(r.pmtNec),'gold','wallet')+kpi('Tu plan cubre',r.hayPlan?Math.round(r.cubre*100)+'% de la meta':'Aún sin plan de retiro',r.cubre>=1?'ok':'bad','target')+'</div>';
 b+='<div><h3>La fórmula del Diagnóstico AXA</h3><div class="c2"><div class="kpi"><i class="ki">'+ico('up')+'</i><small>Lo que vas a generar en tus próximos '+r.yTo+' años</small><b>'+mx(r.axaGenerar)+'</b></div><div class="kpi"><i class="ki">'+ico('sun')+'</i><small>Lo que vas a necesitar en tu retiro ('+r.yRet+' años)</small><b>'+mx(r.axaNecesitar)+'</b></div></div><p class="cap">Se calculan con tu ingreso anual actual de '+mx(C.ingAnual)+', sin inflación ni rendimiento.</p></div>';
 return b;
}
function yearsOfPlazo(p,C){const s=plazoLabel(p);const m=/(\d+)/.exec(s);if(!m)return 0;const v=+m[1];if(/edad/i.test(s)&&C.edad)return Math.max(v-C.edad,1);if(/cumpla/i.test(s)){const k=C.kids.length?Math.max.apply(null,C.kids.map(x=>x.y)):0;return k||Math.max(v-8,1)}return v}
function sPropuesta(C){
 if(!C.props.length)return empty('Define uno o más planes en la pestaña Producto.');
 let b=C.props.map(p=>{
  const cobsAdd=Object.keys(p.cobs||{}).filter(k=>p.cobs[k]).map(k=>{const x=p.c.cob.find(z=>z[0]===k);return x?x[1]:k});
  const cobsInc=p.c.cob.filter(z=>z[2]).map(z=>z[1]);
  const monto=p.moneda==='MXN'?mx(n(p.suma)):(p.moneda==='UDI'?fmtNum(n(p.suma))+' UDIs':'US$'+fmtNum(n(p.suma)));
  const eq=p.moneda!=='MXN'&&n(p.suma)?'<small style="text-transform:none;letter-spacing:0;font-weight:500">≈ '+mx(p.sumaMXN)+' MXN</small>':'';
  const pr=p.moneda==='MXN'?mx(n(p.prima)):(p.moneda==='UDI'?fmtNum(n(p.prima))+' UDIs':'US$'+fmtNum(n(p.prima)));
  let vis='';const Y=Math.min(Math.max(Math.round(yearsOfPlazo(p,C)),0),40);
  if((p.fam==='ahorro'||p.fam==='retiro')&&n(p.prima)&&Y>0){const gs=growSeries(p.primaAnualMXN/12,C.rend,Y,p.capMXN>0?p.capMXN:0);
   vis='<div><h3 style="font-size:14px">Crecimiento de tu plan</h3>'+lineChart({series:[{n:'Capital',c:'var(--p-gold)',pts:gs.cap},{n:'Lo que aportas',c:'var(--p-navy)',pts:gs.apo}],xmax:Y,ymax:Math.max(gs.cap[gs.cap.length-1],1),aria:'Crecimiento del capital de '+pName(p)})+'</div>'}
  else if(p.fam==='vida'&&n(p.suma)&&Y>0&&C.edad){vis='<div><h3 style="font-size:14px">Tu protección a lo largo del tiempo</h3>'+timeline(C.edad,C.edad+Y+3,[{x:C.edad,l:'Inicio',s:C.edad+' años',c:'var(--p-navy)'},{x:C.edad+Y,l:(/vitalic|99/i.test(plazoLabel(p))?'Vitalicio':'Fin del plazo'),s:(C.edad+Y)+' años'}],C.edad)+'<p class="cap">Capital protegido durante todo el plazo: <b>'+mx(p.sumaMXN)+'</b></p></div>'}
  return '<div class="pcard"><header><span class="pic">'+ico(FAMICO[p.fam]||'doc')+'</span><b>'+esc(pName(p))+'</b><span>'+esc(tipoLabel(p))+'</span></header><div class="pb"><div class="pgrid"><div><small>Moneda</small><b>'+esc(MONEDA[p.moneda])+'</b></div><div><small>Plazo</small><b>'+esc(plazoLabel(p))+'</b></div><div><small>Suma asegurada</small><b>'+(n(p.suma)?monto:'—')+'</b>'+eq+'</div><div><small>Prima '+esc(p.frec.toLowerCase())+'</small><b>'+(n(p.prima)?pr:'—')+'</b></div></div>'+vis+
   ((cobsInc.length||cobsAdd.length)?'<div class="chips">'+cobsInc.map(x=>'<span class="inc">'+esc(x)+'</span>').join('')+cobsAdd.map(x=>'<span class="add">'+esc(x)+'</span>').join('')+'</div>':'')+
   '<p class="note"><b>Resuelve:</b> '+RESUELVE[p.fam]+(p.notas?' '+esc(p.notas):'')+'</p></div></div>'}).join('');
 b+='<div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">'+kpi('Inversión anual',mx(C.primaTotal),'gold','wallet')+kpi('Equivale al mes',mx(C.primaTotal/12),'','coins')+kpi('Del ingreso anual',(C.pctIng*100).toFixed(1)+'%','','target')+'</div>';
 b+='<p class="note">Cifras ilustrativas con los supuestos indicados. Las coberturas, exclusiones y condiciones aplicables son las de la póliza emitida. Este documento no constituye una oferta de seguro.</p>';
 return b;
}
function sResultado(C){
 const rings=[ring({title:'Protección de vida',sub:'Necesidad cubierta',before:C.cubreHoy,after:C.cubreProp,noPlan:!C.props.some(p=>p.fam==='vida')})];
 if(C.kids.length&&C.eduTotal){const has=C.props.some(p=>p.fam==='ahorro');rings.push(ring({title:'Educación',sub:'Meta cubierta',before:0,after:has?Math.min(1,C.eduPlan/C.eduTotal):0,noPlan:!has}))}
 if(C.ret)rings.push(ring({title:'Retiro',sub:'Meta cubierta',before:n(S.ahorroRet)>0?Math.min(1,n(S.ahorroRet)*Math.pow(1+C.rend,C.ret.yTo)/C.ret.meta):0,after:C.ret.cubre,noPlan:!C.ret.hayPlan}));
 let b='<div class="rings">'+rings.join('')+'</div>';
 const hor=Math.min(Math.max(C.ret?C.ret.yTo:20,5),40);const ah0=n(S.ahorro)+n(S.inversiones);const sol=[ah0],con=[ah0];
 const plans=C.props.filter(p=>p.fam==='ahorro'||p.fam==='retiro');const pm=plans.reduce((a,p)=>a+p.primaAnualMXN/12,0);const rm=Math.pow(1+C.rend,1/12)-1;let b1=ah0,b2=ah0;
 for(let m=1;m<=hor*12;m++){b1=b1*(1+rm);b2=b2*(1+rm)+pm;if(m%12===0){sol.push(b1);con.push(b2)}}
 b+='<div><h3>Tu patrimonio líquido en el tiempo</h3>'+lineChart({series:[{n:'Con tu propuesta',c:'var(--p-gold)',pts:con},{n:'Sin cambios',c:'var(--p-navy)',pts:sol,dash:true}],xmax:hor,ymax:Math.max(con[con.length-1],sol[sol.length-1],1),aria:'Patrimonio líquido proyectado con y sin la propuesta'})+'<p class="cap">Incluye tu ahorro e inversiones actuales más las aportaciones de tus planes de ahorro y retiro, con rendimiento de '+n(S.rend)+'% anual.</p></div>';
 b+='<div><h3>Tu compromiso monetario</h3>'+hb([{l:'10% recomendado (anual)',v:C.recom,c:CN},{l:'Inversión de tu propuesta',v:C.primaTotal,c:CG},{l:'Tu capacidad declarada',v:n(S.capacidad)*12,c:'var(--p-navy3)'}])+'<p class="cap">Los expertos en finanzas personales recomiendan ahorrar al menos 10% del ingreso anual.</p></div>';
 b+='<div><h3>Próximos pasos</h3><div class="steps3"><div><i>'+ico('target')+'</i><b>Ajustar</b><p>Revisamos juntos la propuesta y la adaptamos a tu presupuesto.</p></div><div><i>'+ico('doc')+'</i><b>Solicitud</b><p>Llenamos la solicitud y, si aplica, el cuestionario médico.</p></div><div><i>'+ico('shield')+'</i><b>Emisión</b><p>Recibes tu póliza y te acompañamos en renovaciones y cambios.</p></div></div></div>';
 return b;
}
function qrBlock(small){return '<div class="qrbox'+(small?' sm':'')+'"><img class="qr" src="'+QR+'" alt="Código QR de J L Consultoría Patrimonial"><div><b>Conoce toda la gama de productos que tenemos para proteger y hacer crecer tu patrimonio.</b><span>Escanea el código con la cámara de tu celular.</span></div></div>'}
function sCierre(){
 return '<div style="display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center;padding-top:10px"><h3 style="font-size:24px;max-width:26ch;text-wrap:balance">Gracias por tu confianza</h3>'+qrBlock(false)+
  '<div><b style="font-family:var(--f-display);font-size:18px;color:var(--p-navy)">'+esc(S.asesor)+'</b><p>'+esc(S.asesorTit)+'</p><p>WhatsApp '+esc(S.asesorWA)+' · '+esc(S.asesorMail)+'</p></div>'+
  '<div class="conf"><b>Aviso de confidencialidad.</b> Toda la información contenida en este documento es de carácter confidencial y de uso exclusivo de '+esc(S.nombre||'el cliente')+'. Queda prohibida su reproducción, difusión o entrega a terceros.</div></div>';
}
function renderReporte(){
 const C=calc();const nom=S.nombre||'el cliente';const fecha=new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
 const list=[['Punto de partida','Quién eres hoy',sPartida(C),'fam'],['Situación financiera','Tu panorama actual',sSituacion(C),'wallet'],['Riesgos','Lo que está en juego',sRiesgos(C),'shield'],['Protección','Protección para tu familia',sProteccion(C),'hand']];
 if(C.kids.length)list.push(['Educación','El futuro de tus hijos',sEducacion(C),'cap']);
 else if(S.metaC||S.metaM||S.metaL)list.push(['Metas','Tus metas',metasSheet(),'target']);
 if(C.ret)list.push(['Retiro','Tu retiro',sRetiro(C),'sun']);
 list.push(['Propuesta','Tu propuesta de protección',sPropuesta(C),'doc'],['Resultado','Antes y después de tu propuesta',sResultado(C),'up'],['Cierre','Tu siguiente paso',sCierre(),'qr']);
 let h='<div class="sheets"><section class="sheet cover"><div class="cv"><img src="'+LOGO+'" alt="J L Consultoría Patrimonial"><div class="rule"></div><div><div class="for">Preparado para</div><p class="nm">'+esc(nom)+'</p></div><h1>Diagnóstico patrimonial y propuesta de protección</h1><div class="coverico"><span>'+ico('shield')+'<em>Proteger</em></span><span>'+ico('cap')+'<em>Educar</em></span><span>'+ico('sun')+'<em>Retirarte</em></span><span>'+ico('up')+'<em>Crecer</em></span></div>'+qrBlock(true)+'</div><div class="band"><div><b>'+esc(S.asesor)+'</b>'+esc(S.asesorTit)+'<br>'+esc(fecha)+'</div><div><small>Toda la información es de carácter confidencial y de uso exclusivo de '+esc(nom)+'.</small></div></div></section>';
 h+=list.map((s,i)=>sheetWrap(s[0],s[1],s[2],i+2,nom,s[3]==='qr'?'':s[3])).join('')+'</div>';
 return h;
}
function metasSheet(){
 const pri=PRI.map(p=>({l:p[1],si:getp(S,'pri.'+p[0]+'.si'),o:n(getp(S,'pri.'+p[0]+'.ord'))})).filter(x=>x.si==='Sí'&&x.o>0).sort((a,c)=>a.o-c.o);
 let b='<div class="c3">'+[['Corto plazo',S.metaC],['Mediano plazo',S.metaM],['Largo plazo',S.metaL]].map(x=>'<div class="risk">'+icon('sob')+'<b>'+x[0]+'</b><p>'+esc(x[1]||'—')+'</p></div>').join('')+'</div>';
 if(pri.length)b+='<div><h3>Tus prioridades</h3>'+hb(pri.map(x=>({l:x.o+'. '+x.l,v:6-x.o,c:x.o===1?CG:CN})),{max:5,fmt:v=>'Prioridad '+(6-v)})+'</div>';
 return b;
}

/* ===== Controlador dentro del CRM ===== */
const LOGO=opts.logo, QR=opts.qr;
const $=s=>root.querySelector(s);
let S=opts.state;
if(!Array.isArray(S.props))S.props=[];if(!S.notas)S.notas={};if(!S.pri)S.pri={};if(!S.preoc)S.preoc={};
function save(){if(opts.onChange)opts.onChange(S)}
let tab=opts.tab||'entrevista';
const tip=document.createElement('div');tip.className='dp-tip';tip.hidden=true;document.body.appendChild(tip);

function scroller(){let el=root.parentElement;while(el&&el!==document.body){const o=getComputedStyle(el).overflowY;if((o==='auto'||o==='scroll')&&el.scrollHeight>el.clientHeight+2)return el;el=el.parentElement}return document.scrollingElement||document.documentElement}
function toTop(){try{root.scrollIntoView({block:'start'})}catch(e){window.scrollTo(0,0)}}

function shell(inner){
 const tabs=[['entrevista','Entrevista'],['producto','Producto'],['entregable','Entregable']];
 return '<header class="top"><div class="wrap"><div class="brand"><img src="'+LOGO+'" alt="J L Consultoría Patrimonial"><div><b>Diagnóstico patrimonial</b><small>'+esc(S.nombre||'Caso nuevo')+'</small></div></div>'+
  '<div class="tabs" role="tablist">'+tabs.map(t=>'<button class="tab" role="tab" data-act="tab" data-t="'+t[0]+'" aria-selected="'+(t[0]===tab)+'">'+t[1]+'</button>').join('')+'</div></div></header>'+
  '<main><div class="wrap">'+
  '<div class="case noprint" style="margin-bottom:14px;justify-content:flex-start"><button class="btn sm" data-act="volver">← Mis diagnósticos</button></div>'+
  (S.ejemplo?'<div class="banner noprint"><span><b>Caso de ejemplo.</b> Las cifras y los datos son inventados para que veas cómo se ve el entregable.</span></div>':'')+
  (tab==='entregable'?'<div class="pdfbar noprint"><div><b>Entregable para tu cliente</b><span>Incluye gráficas, proyecciones, tu logo y tu QR. Se descarga en PDF tamaño carta.</span></div><button class="btn gold" data-act="pdf">Descargar PDF</button></div>':'')+
  inner+'</div></main>';
}
function render(){
 const sc=scroller();const y=sc.scrollTop;
 const inner=tab==='entrevista'?renderEntrevista():tab==='producto'?renderProducto():renderReporte();
 root.innerHTML=shell(inner);
 sc.scrollTop=y;
}
function go(t){tab=t;if(opts.onTab)opts.onTab(t);render();toTop()}

function readEl(el){const t=el.dataset.t;if(t==='chk')return el.checked;if(t==='money'||t==='num'||t==='pct')return el.value.replace(/[^\d.]/g,'');return el.value}
function onEdit(el){
 setp(S,el.dataset.k,readEl(el));
 save();
 if(el.dataset.k==='nombre'){const s=$('.brand small');if(s)s.textContent=S.nombre||'Caso nuevo'}
 if(el.dataset.k==='nacimiento'){const a=ageFrom(S.nacimiento);const h=$('#ageHint');if(h)h.textContent=a!=null?'Edad: '+a+' años':(S.nacimiento?'Escribe la fecha como dd/mm/aaaa':'')}
 if(el.dataset.newprod!=null){applyProd(+el.dataset.newprod)}
 if(el.dataset.r){render();return}
 const sm=$('#sum');if(sm)sm.innerHTML=sumHtml(calc());
}
function applyProd(i){const p=S.props[i];const c=catOf(p.prod);Object.assign(p,{aseg:c.aseg,nombre:c.nombre,fam:c.fam,tipo:c.tipos[0]?c.tipos[0][0]:'',plazo:'',cobs:{}})}
const H={};
H.input=e=>{const el=e.target;if(el.dataset&&el.dataset.k&&el.tagName!=='SELECT'&&el.dataset.t!=='chk')onEdit(el)};
H.change=e=>{const el=e.target;if(!(el.dataset&&el.dataset.k))return;
 if(el.tagName==='SELECT'||el.dataset.t==='chk')onEdit(el);
 else if(el.dataset.t==='money'){el.value=fmtNum(readEl(el))}
 if(el.dataset.r&&el.tagName!=='SELECT')render();
};
H.changeCap=e=>{const el=e.target;if(!(el.dataset&&el.dataset.k))return;const m=/^props\.(\d+)\.(tipo|moneda)$/.exec(el.dataset.k);if(m){const p=S.props[+m[1]];const c=catOf(p.prod);const ok=c.plazos(p.tipo,p.moneda);if(p.plazo&&p.plazo!=='__otro'&&ok.indexOf(p.plazo)<0){p.plazo='';save();render()}}};
H.click=e=>{
 const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
 if(a==='tab')go(b.dataset.t);
 else if(a==='volver'){if(opts.onBack)opts.onBack()}
 else if(a==='step'){S.step=+b.dataset.i;save();render();toTop()}
 else if(a==='next'){S.step=Math.min((S.step||0)+1,STEPS.length-1);save();render();toTop()}
 else if(a==='prev'){S.step=Math.max((S.step||0)-1,0);save();render();toTop()}
 else if(a==='goProd')go('producto');else if(a==='goEnt')go('entrevista');else if(a==='goRep')go('entregable');
 else if(a==='add'){const st=STEPS.flatMap(s=>s.f||[]).find(f=>f.tbl===b.dataset.tbl);S[b.dataset.tbl]=(S[b.dataset.tbl]||[]).concat([Object.assign({},st.blank)]);save();render()}
 else if(a==='del'){S[b.dataset.tbl].splice(+b.dataset.i,1);save();render()}
 else if(a==='addprop'){S.props=(S.props||[]).concat([nuevaProp(b.dataset.id)]);save();render()}
 else if(a==='delprop'){S.props.splice(+b.dataset.i,1);save();render()}
 else if(a==='pdf'){b.disabled=true;b.textContent='Generando PDF…';Promise.resolve(opts.onPdf&&opts.onPdf()).catch(()=>{}).then(()=>{const bb=$('[data-act="pdf"]');if(bb){bb.disabled=false;bb.textContent='Descargar PDF'}})}
};
H.over=e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(!t){tip.hidden=true;return}tip.textContent=t.dataset.tip;tip.hidden=false};
H.move=e=>{if(tip.hidden)return;tip.style.left=Math.max(8,Math.min(e.clientX+12,innerWidth-tip.offsetWidth-8))+'px';tip.style.top=(e.clientY+16)+'px'};
H.leave=()=>{tip.hidden=true};
root.addEventListener('input',H.input);root.addEventListener('change',H.change);root.addEventListener('change',H.changeCap,true);
root.addEventListener('click',H.click);root.addEventListener('mouseover',H.over);root.addEventListener('mousemove',H.move);root.addEventListener('mouseleave',H.leave);
let ro=null;
function narrow(){root.classList.toggle('nw',root.clientWidth<760)}
if(typeof ResizeObserver!=='undefined'){ro=new ResizeObserver(narrow);ro.observe(root)}
narrow();
render();
return{
 destroy(){root.removeEventListener('input',H.input);root.removeEventListener('change',H.change);root.removeEventListener('change',H.changeCap,true);root.removeEventListener('click',H.click);root.removeEventListener('mouseover',H.over);root.removeEventListener('mousemove',H.move);root.removeEventListener('mouseleave',H.leave);if(ro)ro.disconnect();tip.remove();root.innerHTML=''},
 reportHtml(){return renderReporte()},
 state(){return S}
};
}
