'use strict';
/* logbook – lokale Fitness-PWA. Datenformat-Version: SCHEMA. Keine Netzwerkzugriffe. */
const SCHEMA=1;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const clone=o=>JSON.parse(JSON.stringify(o));
const DAYS=['Push','Pull','Legs','Torso A','Torso B','Limbs A','Limbs B'];
const MEALS=['Frühstück','Mittagessen','Abendessen','Snacks'];
const GOALS=['Muskelaufbau','Fettabbau','Body Recomposition','Kraftsteigerung','Gewicht halten'];
const NAV={home:'Home',training:'Training',history:'Historie',food:'Ernährung',progress:'Fortschritt',profiles:'Profile',editor:'Editor',settings:'Einstellungen'};
const TEXTS=[['nextTitle','Nächstes Training'],['startBtn','Training starten'],['contBtn','Training fortsetzen'],['saveBtn','Training speichern'],['lastTitle','Letztes Training'],['profileLabel','Profil'],['todayTitle','Heute'],['histTitle','Historie'],['foodTitle','Ernährung'],['progTitle','Fortschritt'],['addFoodBtn','Hinzufügen'],['addBodyBtn','Messwert speichern']];
const HOME={profile:'Profilauswahl',next:'Nächstes Training',stats:'Kennzahlen',today:'Heute (Kalorien, Protein)',info:'Eigene Bereiche'};
const DEF={bg:'#0b0b0b',card:'#1a1a1a',accent:'#ffd400',text:'#ffffff',btn:'#ffd400',nav:'#111111',border:'#2c2c2c',radius:16,gap:12,pad:16,btnR:14,btnH:52,rest:90,t:{},order:Object.keys(NAV),hidden:[],info:[],home:['profile','next','stats','today','info'],hiddenHome:[]};
const ST=['profiles','plans','workouts','drafts','food','body','machines'];
let trainSub='plan',pk={brand:'',group:'',q:'',replace:null,added:''};
let D={},T,TS,P=null,tab='home',sub=null,planDay='Push',foodDate='',bodyKind='Gewicht',exSel='',pending=null,restEnd=0;
const L=(k,d)=>T.t[k]||d;
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const fmt=d=>{const[a,b,c]=d.split('-');return c+'.'+b+'.'+a};
const num=v=>{if(v===''||v==null)return null;const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?null:n};
const mine=s=>D[s].filter(x=>x.profileId===P.id);
const sum=(a,k)=>Math.round(a.reduce((t,x)=>t+(+x[k]||0),0));
async function save(s,o){const i=D[s].findIndex(x=>x.id===o.id);i<0?D[s].push(o):D[s][i]=o;await DB.put(s,o)}
async function remove(s,id){D[s]=D[s].filter(x=>x.id!==id);await DB.del(s,id)}

/* ---------- Theme / Editor ---------- */
function loadTheme(){let s={};try{s=JSON.parse(localStorage.getItem('lb_theme')||'{}')}catch(e){}T=Object.assign(clone(DEF),s);TS=clone(T);applyTheme()}
function applyTheme(){const r=document.documentElement.style;
  [['bg','bg'],['card','card'],['accent','accent'],['text','text'],['btn','btn'],['nav','nav'],['border','border']].forEach(([k,v])=>r.setProperty('--'+v,T[k]));
  r.setProperty('--r',T.radius+'px');r.setProperty('--g',T.gap+'px');r.setProperty('--pad',T.pad+'px');r.setProperty('--br',T.btnR+'px');r.setProperty('--bh',T.btnH+'px');
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=T.bg}

/* ---------- Pläne ---------- */
const mk=(name,type,sets,reps,keys=[])=>({id:uid(),name,type,sets,reps,settings:keys.map(k=>({k,v:''}))});
const SEED={
  Push:()=>[mk('Brustpresse','normal',3,'8-12',['Sitzhöhe','Rückenlehne','Griffposition']),mk('Schulterdrücken','normal',3,'8-12',['Sitzhöhe']),mk('Trizepsdrücken einarmig','iso',3,'10-15')],
  Pull:()=>[mk('Latzug','normal',3,'8-12',['Sitzhöhe','Griffposition']),mk('Rudern einarmig','iso',3,'8-12'),mk('Bizepscurl einarmig','iso',3,'10-12')],
  Legs:()=>[mk('Beinpresse','normal',3,'8-12',['Sitzhöhe','Rückenlehne']),mk('Beinbeuger einbeinig','iso',3,'10-12',['Sitzhöhe']),mk('Wadenheben','normal',3,'12-15')],
  'Torso A':()=>[mk('Brustpresse','normal',3,'8-12',['Sitzhöhe']),mk('Latzug','normal',3,'8-12'),mk('Schulterdrücken','normal',3,'8-12')],
  'Torso B':()=>[mk('Rudern einarmig','iso',3,'8-12'),mk('Butterfly','normal',3,'10-15',['Sitzhöhe','Armposition']),mk('Seitheben','normal',3,'12-15')],
  'Limbs A':()=>[mk('Beinpresse einbeinig','iso',3,'10-12'),mk('Bizepscurl einarmig','iso',3,'10-12'),mk('Trizepsdrücken einarmig','iso',3,'10-12')],
  'Limbs B':()=>[mk('Beinbeuger einbeinig','iso',3,'10-12'),mk('Wadenheben','normal',3,'12-15'),mk('Bizepscurl einarmig','iso',3,'10-12')]
};
const getPlan=day=>D.plans.find(p=>p.id===P.id+':'+day)||(()=>{const pl={id:P.id+':'+day,profileId:P.id,system:day.includes(' ')?'tl':'ppl',day,exercises:SEED[day]()};D.plans.push(pl);DB.put('plans',pl);return pl})();
async function addProfile(name){
  const p={id:uid(),name,age:'',height:'',weight:'',goalWeight:'',bodyFat:'',goal:GOALS[0],kcal:'',protein:'',carbs:'',fat:'',freq:'',next:'Push'};
  await save('profiles',p);
  for(const d of DAYS)await save('plans',{id:p.id+':'+d,profileId:p.id,system:d.includes(' ')?'tl':'ppl',day:d,exercises:SEED[d]()});
  P=p;localStorage.setItem('lb_pid',p.id)}

/* ---------- Training-Logik ---------- */
const draft=()=>D.drafts.find(d=>d.id===P.id);
async function startWorkout(day){
  const pl=getPlan(day);
  const W={id:P.id,profileId:P.id,day,start:Date.now(),note:'',exercises:pl.exercises.map(e=>({exId:e.id,name:e.name,type:e.type,reps:e.reps,settings:clone(e.settings||[]),sets:Array.from({length:e.sets},()=>({}))}))};
  await save('drafts',W)}
const hasData=s=>['w','r','lw','lr','rw','rr'].some(f=>s[f]!=null)||s.done;
const cnt=w=>w.exercises.reduce((a,e)=>a+e.sets.filter(hasData).length,0);
function prevEx(exId,name,before=Infinity){
  const ws=mine('workouts').filter(w=>w.ts<before).sort((a,b)=>b.ts-a.ts);
  for(const w of ws){const e=w.exercises.find(x=>x.exId===exId)||w.exercises.find(x=>x.name===name);if(e)return{w,ex:e}}return null}
const sides=e=>e.type==='iso'?[['Links','lw','lr'],['Rechts','rw','rr']]:[['','w','r']];
const best=(sets,a,b)=>sets.filter(s=>s[a]!=null).reduce((m,s)=>(!m||s[a]>m[a]||(s[a]===m[a]&&(s[b]||0)>(m[b]||0)))?s:m,null);
function cmp(ex,pv){return sides(ex).map(([n,a,b])=>{
  const c=best(ex.sets,a,b),p=best(pv.sets,a,b);if(!c||!p)return'';
  const d=c[a]>p[a]?['up','Gewicht gesteigert']:c[a]<p[a]?['down','Gewicht gesunken']:(c[b]||0)>(p[b]||0)?['up','Wiederholungen gesteigert']:(c[b]||0)<(p[b]||0)?['down','Wiederholungen gesunken']:['eq','Leistung gleich'];
  return`<div class="cmp ${d[0]}">${n?n+': ':''}${p[a]} kg × ${p[b]||0} → ${c[a]} kg × ${c[b]||0} · ${d[1]}</div>`}).join('')}
const setLine=(e,s)=>e.type==='iso'?`L ${s.lw??'–'} kg × ${s.lr??'–'} · R ${s.rw??'–'} kg × ${s.rr??'–'}`:`${s.w??'–'} kg × ${s.r??'–'}`;
const prevTable=e=>e.sets.filter(hasData).map((s,j)=>`<div>${j+1}: ${setLine(e,s)}</div>`).join('');
const vol=w=>w.exercises.reduce((t,e)=>t+e.sets.reduce((a,s)=>a+(s.w||0)*(s.r||0)+(s.lw||0)*(s.lr||0)+(s.rw||0)*(s.rr||0),0),0);

/* ---------- Diagramme ---------- */
function chart(pts){
  if(!pts.length)return'<p class="mut">Noch keine Daten.</p>';
  const W=320,H=140,p=18,ys=pts.map(x=>x[1]),mn=Math.min(...ys),mx=Math.max(...ys),rg=(mx-mn)||1;
  const X=i=>p+(pts.length>1?i*(W-2*p)/(pts.length-1):(W-2*p)/2),Y=v=>H-p-(v-mn)/rg*(H-2*p);
  return`<svg viewBox="0 0 ${W} ${H}" class="chart"><polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="${pts.map((x,i)=>X(i)+','+Y(x[1])).join(' ')}"/>${pts.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(x[1])}" r="3.5" fill="var(--accent)"/>`).join('')}<text x="2" y="12" class="ax">${mx}</text><text x="2" y="${H-4}" class="ax">${mn}</text><text x="${W-p}" y="${H-4}" class="ax" text-anchor="end">${esc(pts[pts.length-1][0])}</text></svg>`}
function bars(items){const mx=Math.max(1,...items.map(i=>i[1]));return`<div class="bars">${items.map(([l,v])=>`<div><i style="height:${v/mx*70}px"></i>${v}<br>${esc(l)}</div>`).join('')}</div>`}
const bodyOf=k=>mine('body').filter(b=>b.kind===k).sort((a,b)=>a.date<b.date?-1:1);

/* ---------- Views ---------- */
const field=(k,l,type='text',list)=>`<label>${l}</label><input data-h="prof" data-k="${k}" type="${type}" ${type==='number'?'inputmode="decimal" step="any"':''} value="${esc(P[k])}">`;
const V={
welcome(){return`<div class="card hero"><h2>Willkommen</h2><p class="mut">Lege dein erstes Profil an. Alle Daten bleiben auf diesem Gerät.</p><input id="newname" placeholder="Name"><button class="btn" data-act="createfirst">Profil anlegen</button></div><button class="ghost" style="width:100%" data-act="go" data-a="settings">Backup importieren</button>`},
home(){
  const ws=mine('workouts').sort((a,b)=>b.ts-a.ts),l=ws[0],n28=ws.filter(w=>Date.now()-w.ts<28*864e5).length;
  const bw=bodyOf('Gewicht'),cur=bw.length?bw[bw.length-1].value:P.weight,first=bw.length?bw[0].value:null;
  const fd=mine('food').filter(f=>f.date===today()),k=sum(fd,'kcal'),p=sum(fd,'protein'),dr=draft();
  const S={
  profile:`<div class="card"><label>${esc(L('profileLabel','Profil'))}</label><div class="row"><select data-h="pick">${D.profiles.map(x=>`<option value="${x.id}" ${x.id===P.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><button class="ghost sm" data-act="newprof">+ Neu</button></div></div>`,
  next:`<div class="card hero"><h2>${esc(L('nextTitle','Nächstes Training'))}</h2>${dr?`<p class="mut">Läuft noch: ${esc(dr.day)}</p><button class="btn" data-act="go" data-a="training">${esc(L('contBtn','Training fortsetzen'))}</button>`:`<select data-h="next">${DAYS.map(d=>`<option ${d===P.next?'selected':''}>${d}</option>`).join('')}</select><button class="btn" data-act="startnext">${esc(L('startBtn','Training starten'))}</button>`}</div>`,
  stats:`<div class="grid"><div class="card"><div class="mut">${esc(L('lastTitle','Letztes Training'))}</div><div class="big">${l?esc(l.day):'–'}</div><div class="mut">${l?fmt(l.date):'noch keins'}</div></div>
<div class="card"><div class="mut">Häufigkeit</div><div class="big">${(n28/4).toFixed(1)}×</div><div class="mut">pro Woche${P.freq?` (Ziel ${esc(P.freq)})`:''}</div></div>
<div class="card"><div class="mut">Körpergewicht</div><div class="big">${cur||'–'}</div><div class="mut">${P.goalWeight?`Ziel ${esc(P.goalWeight)} kg`:'kg'}</div></div>
<div class="card"><div class="mut">Fortschritt</div><div class="big">${first!=null&&bw.length>1?(cur-first>0?'+':'')+(cur-first).toFixed(1):'–'}</div><div class="mut">kg seit Start · ${ws.length} Trainings</div></div></div>`,
  today:`<div class="card"><div class="mut">${esc(L('todayTitle','Heute'))}</div><div>Kalorien ${k}${P.kcal?' / '+esc(P.kcal):''} kcal</div><div class="bar"><i style="width:${Math.min(100,P.kcal?k/P.kcal*100:0)}%"></i></div><div>Protein ${p}${P.protein?' / '+esc(P.protein):''} g</div><div class="bar"><i style="width:${Math.min(100,P.protein?p/P.protein*100:0)}%"></i></div></div>`,
  info:T.info.map(i=>`<div class="card"><h3>${esc(i.title)}</h3><div>${esc(i.text)}</div></div>`).join('')};
  return T.home.filter(k=>!T.hiddenHome.includes(k)&&S[k]!=null).map(k=>S[k]).join('')},

training(){const W=draft();return W?session(W):planView()},

history(){
  const ws=mine('workouts').sort((a,b)=>b.ts-a.ts);
  if(sub){const w=ws.find(x=>x.id===sub);if(w)return detail(w)}
  return`<h2>${esc(L('histTitle','Historie'))}</h2>`+(ws.length?ws.map(w=>`<button class="hist" data-act="open" data-id="${w.id}"><b>${fmt(w.date)} · ${esc(w.day)}</b><div class="mut">${w.dur?w.dur+' Min · ':''}${w.exercises.length} Übungen · ${cnt(w)} Sätze</div></button>`).join(''):'<p class="mut">Noch keine Trainings gespeichert.</p>')},

food(){
  foodDate=foodDate||today();
  const fs=mine('food').filter(f=>f.date===foodDate),names=[...new Set(mine('food').map(f=>f.name))];
  const t={kcal:sum(fs,'kcal'),p:sum(fs,'protein'),c:sum(fs,'carbs'),f:sum(fs,'fat')};
  const row=(l,v,g,u)=>`<div>${l}: ${v}${g?' / '+esc(g):''} ${u}${g?` · noch ${Math.max(0,Math.round(g-v))}`:''}</div><div class="bar"><i style="width:${Math.min(100,g?v/g*100:0)}%"></i></div>`;
  return`<h2>${esc(L('foodTitle','Ernährung'))}</h2><div class="card"><input type="date" data-h="fdate" value="${foodDate}">${row('Kalorien',t.kcal,P.kcal,'kcal')}${row('Protein',t.p,P.protein,'g')}${row('Kohlenhydrate',t.c,P.carbs,'g')}${row('Fett',t.f,P.fat,'g')}</div>
<div class="card"><h3>Lebensmittel erfassen</h3><datalist id="fn">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
<select id="f_meal">${MEALS.map(m=>`<option>${m}</option>`).join('')}</select><input id="f_name" list="fn" data-h="fname" placeholder="Lebensmittel" style="margin-top:6px">
<div class="row"><input id="f_g" inputmode="decimal" placeholder="Gramm"><input id="f_kcal" inputmode="decimal" placeholder="kcal"></div><div class="row"><input id="f_p" inputmode="decimal" placeholder="Protein"><input id="f_c" inputmode="decimal" placeholder="Kh"><input id="f_f" inputmode="decimal" placeholder="Fett"></div><button class="btn" data-act="addfood">${esc(L('addFoodBtn','Hinzufügen'))}</button></div>`
  +MEALS.map(m=>{const l=fs.filter(f=>f.meal===m);return l.length?`<div class="card"><h3>${m}</h3>${l.map(f=>`<div class="row"><span>${esc(f.name)} · ${f.g||'–'} g<br><span class="mut">${f.kcal||0} kcal · P ${f.protein||0} · Kh ${f.carbs||0} · F ${f.fat||0}</span></span><button class="x" data-act="delfood" data-id="${f.id}">✕</button></div>`).join('')}</div>`:''}).join('')},

progress(){
  const ws=mine('workouts').sort((a,b)=>a.ts-b.ts);
  const wk=[],mo=[],mv=[];for(let i=7;i>=0;i--){const e=Date.now()-i*7*864e5;wk.push([i?'-'+i+'W':'jetzt',ws.filter(w=>w.ts<=e&&w.ts>e-7*864e5).length])}
  for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');mo.push([k.slice(5),ws.filter(w=>w.date.startsWith(k)).length]);mv.push([k.slice(5),Math.round(ws.filter(w=>w.date.startsWith(k)).reduce((a,w)=>a+vol(w),0)/1000)])}
  const names=[...new Set(ws.flatMap(w=>w.exercises.map(e=>e.name)))];exSel=names.includes(exSel)?exSel:names[0]||'';
  const pts=[],reps=[];ws.forEach(w=>{const e=w.exercises.find(x=>x.name===exSel);if(!e)return;
    const c=e.type==='iso'?[best(e.sets,'lw','lr'),best(e.sets,'rw','rr')].filter(Boolean).map((s,i)=>i?{w:s.rw,r:s.rr}:{w:s.lw,r:s.lr}):[best(e.sets,'w','r')].filter(Boolean);
    if(!c.length)return;const t=c.reduce((m,s)=>(s.w>m.w||(s.w===m.w&&(s.r||0)>(m.r||0)))?s:m);pts.push([fmt(w.date).slice(0,5),t.w]);reps.push([fmt(w.date).slice(0,5),t.r||0])});
  const pr={};ws.forEach(w=>w.exercises.forEach(e=>e.sets.forEach(s=>{const m=Math.max(s.w||0,s.lw||0,s.rw||0);if(m>(pr[e.name]||0))pr[e.name]=m})));
  return`<h2>${esc(L('progTitle','Fortschritt'))}</h2><div class="card"><div class="grid"><div><div class="mut">Trainings</div><div class="big">${ws.length}</div></div><div><div class="mut">Sätze</div><div class="big">${ws.reduce((a,w)=>a+cnt(w),0)}</div></div><div><div class="mut">Volumen gesamt</div><div class="big">${(ws.reduce((a,w)=>a+vol(w),0)/1000).toFixed(1)} t</div></div></div></div><div class="card"><h3>Trainings pro Woche</h3>${bars(wk)}</div><div class="card"><h3>Trainings pro Monat</h3>${bars(mo)}</div>
<div class="card"><h3>Volumen pro Monat (Tonnen)</h3>${bars(mv)}</div><div class="card"><h3>Trainingsvolumen je Training (kg)</h3>${chart(ws.slice(-12).map(w=>[fmt(w.date).slice(0,5),Math.round(vol(w))]))}</div>
<div class="card"><h3>Einzelne Übung</h3><select data-h="exsel">${names.map(n=>`<option ${n===exSel?'selected':''}>${esc(n)}</option>`).join('')}</select><p class="mut">Bestes Gewicht</p>${chart(pts)}<p class="mut">Wiederholungen im besten Satz</p>${chart(reps)}</div>
<div class="card"><h3>Bestleistungen</h3>${Object.entries(pr).sort().map(([n,v])=>`<div class="row"><span>${esc(n)}</span><b style="flex:0 0 auto">${v} kg</b></div>`).join('')||'<p class="mut">Noch keine Daten.</p>'}</div>
<div class="card"><h3>Körperentwicklung</h3><div class="row"><select data-h="bkind">${[...new Set(['Gewicht','Bauchumfang','Körperfett %',...mine('body').map(b=>b.kind)])].map(k=>`<option ${k===bodyKind?'selected':''}>${esc(k)}</option>`).join('')}</select></div>${chart(bodyOf(bodyKind).map(b=>[fmt(b.date).slice(0,5),b.value]))}
<div class="row"><input id="b_val" inputmode="decimal" placeholder="Wert"><input id="b_date" type="date" value="${today()}"></div><input id="b_kind" placeholder="Eigener Messwert (leer = ${esc(bodyKind)})"><button class="btn" data-act="addbody">${esc(L('addBodyBtn','Messwert speichern'))}</button>
${bodyOf(bodyKind).slice().reverse().slice(0,8).map(b=>`<div class="row"><span>${fmt(b.date)}: <b>${b.value}</b></span><button class="x" data-act="delbody" data-id="${b.id}">✕</button></div>`).join('')}</div>`},

profiles(){return`<h2>Profile</h2><div class="card">${D.profiles.map(x=>`<div class="row"><button class="ghost" style="margin:0;${x.id===P.id?'border-color:var(--accent)':''}" data-act="pickp" data-id="${x.id}">${esc(x.name)}</button></div>`).join('')}<button class="btn" data-act="newprof">+ Neues Profil</button></div>
<div class="card"><h3>${esc(P.name)}</h3>${field('name','Name')}${field('age','Alter','number')}${field('height','Körpergröße (cm)','number')}${field('weight','Aktuelles Gewicht (kg)','number')}${field('goalWeight','Zielgewicht (kg)','number')}${field('bodyFat','Körperfettanteil (%)','number')}
<label>Trainingsziel</label><select data-h="prof" data-k="goal">${GOALS.map(g=>`<option ${g===P.goal?'selected':''}>${g}</option>`).join('')}</select>${field('kcal','Kalorienziel','number')}${field('protein','Proteinziel (g)','number')}${field('carbs','Kohlenhydrate-Ziel (g)','number')}${field('fat','Fett-Ziel (g)','number')}${field('freq','Trainings pro Woche','number')}
<button class="ghost danger" style="width:100%" data-act="delprof">Profil und alle seine Daten löschen</button></div>`},

editor(){
  const c=(k,l)=>`<label>${l}</label><input type="color" data-h="th" data-k="${k}" value="${T[k]}">`,r=(k,l,a,b)=>`<label>${l}: ${T[k]}</label><input type="range" min="${a}" max="${b}" data-h="th" data-k="${k}" value="${T[k]}">`;
  return`<h2>Editor</h2><p class="mut">Änderungen sind sofort sichtbar. Sie gelten für alle Profile und berühren keine Trainingsdaten.</p>
<div class="card hero"><h3>Vorschau</h3><div class="card"><b>Karte</b><div class="mut">Beispieltext</div></div><button class="btn" style="margin:0">Button</button></div>
<div class="row"><button class="btn" data-act="thsave">Speichern</button><button class="ghost" data-act="thdiscard">Verwerfen</button></div>
<div class="card"><h3>Farben</h3>${c('bg','Hintergrund')}${c('card','Karten')}${c('accent','Akzent')}${c('text','Schrift')}${c('btn','Buttons')}${c('nav','Navigation')}${c('border','Rahmen')}</div>
<div class="card"><h3>Layout und Buttons</h3>${r('radius','Rundung Karten',0,32)}${r('gap','Abstand zwischen Bereichen',4,28)}${r('pad','Innenabstand',8,28)}${r('btnR','Buttonform (Rundung)',0,30)}${r('btnH','Buttonhöhe',40,68)}</div>
<div class="card"><h3>Texte und Buttontexte</h3>${TEXTS.map(([k,d])=>`<label>${d}</label><input data-h="tt" data-k="${k}" value="${esc(T.t[k]||'')}" placeholder="${d}">`).join('')}</div>
<div class="card"><h3>Navigation</h3>${T.order.map((k,i)=>`<div class="row"><input data-h="tt" data-k="nav_${k}" value="${esc(T.t['nav_'+k]||'')}" placeholder="${NAV[k]}"><button class="x" data-act="navmv" data-k="${k}" data-d="-1">↑</button><button class="x" data-act="navmv" data-k="${k}" data-d="1">↓</button>${k==='editor'?'<span class="sm mut">fix</span>':`<input type="checkbox" class="sm" data-h="navhide" data-k="${k}" ${T.hidden.includes(k)?'':'checked'}>`}</div>`).join('')}<p class="mut">Haken = sichtbar. Der Editor bleibt immer erreichbar.</p></div>
<div class="card"><h3>Startseite: Bereiche</h3>${T.home.map(k=>`<div class="row"><span>${HOME[k]}</span><button class="x" data-act="homemv" data-k="${k}" data-d="-1">↑</button><button class="x" data-act="homemv" data-k="${k}" data-d="1">↓</button><input type="checkbox" class="sm" data-h="homehide" data-k="${k}" ${T.hiddenHome.includes(k)?'':'checked'}></div>`).join('')}<p class="mut">Haken = sichtbar. Nur die Anzeige ändert sich, keine Daten.</p></div><div class="card"><h3>Eigene Informationsbereiche</h3>${T.info.map((x,i)=>`<input data-h="info" data-i="${i}" data-p="title" value="${esc(x.title)}" placeholder="Titel"><textarea data-h="info" data-i="${i}" data-p="text">${esc(x.text)}</textarea><button class="ghost danger" data-act="delinfo" data-i="${i}">Bereich löschen</button>`).join('')}<button class="ghost" data-act="addinfo">+ Bereich auf der Startseite</button></div>
<button class="ghost danger" style="width:100%" data-act="threset">Auf Standarddesign zurücksetzen</button>`},

settings(){
  return`<h2>Einstellungen</h2><div class="card"><h3>Pausenzeit</h3><label>Sekunden zwischen Sätzen</label><input type="number" data-h="rest" value="${T.rest}"></div>
<div class="card"><h3>Datensicherung</h3><p class="mut">Daten liegen nur auf diesem Gerät. Für Gerätewechsel oder Browser-Reset brauchst du ein Backup.</p>
<button class="btn" data-act="export">Backup herunterladen (JSON)</button><button class="ghost" style="width:100%" data-act="share">Backup teilen / in Dateien sichern</button>
<label>Backup wiederherstellen</label><input type="file" accept=".json,application/json" data-h="file">
${pending?`<div class="prev"><b>Datei geprüft: ${esc(pending.exported||'')}</b>${ST.map(s=>`<div>${s}: ${(pending.data[s]||[]).length}</div>`).join('')}</div><button class="btn" data-act="doimport">Importieren (ersetzt alle aktuellen Daten)</button><button class="ghost" style="width:100%" data-act="cancelimport">Abbrechen</button>`:''}</div>
<div class="card"><div class="mut">Datenformat v${SCHEMA} · ${D.profiles.length} Profile · ${D.workouts.length} Trainings · <span id="persist"></span></div></div>`}
};

function session(W){
  return`<h2>${esc(W.day)}</h2><div id="rest" class="rest"></div>`+W.exercises.map((e,i)=>exCard(e,i)).join('')
  +`<textarea data-h="wnote" placeholder="Trainingsnotizen">${esc(W.note||'')}</textarea><button class="btn" data-act="finish">${esc(L('saveBtn','Training speichern'))}</button><button class="ghost danger" style="width:100%" data-act="discard">Training verwerfen</button>`}
function exCard(e,i){
  const pv=prevEx(e.exId,e.name),iso=e.type==='iso';
  const inp=(j,f,s)=>`<input inputmode="decimal" data-h="set" data-i="${i}" data-j="${j}" data-f="${f}" value="${s[f]??''}" placeholder="${pv?.ex.sets[j]?.[f]??''}">`;
  return`<div class="card"><h3>${esc(e.name)}</h3><div class="mut">${e.sets.length} Sätze · ${esc(e.reps||'')}${iso?' · isolateral':''}</div>
<details ${e.settings.length?'open':''}><summary>Geräteeinstellungen</summary>${e.settings.map((s,n)=>`<div class="row"><input data-h="setk" data-i="${i}" data-n="${n}" data-p="k" value="${esc(s.k)}"><input data-h="setk" data-i="${i}" data-n="${n}" data-p="v" value="${esc(s.v)}" placeholder="Wert"><button class="x" data-act="delset" data-i="${i}" data-n="${n}">✕</button></div>`).join('')}<button class="ghost" data-act="addset" data-i="${i}">+ Einstellung</button></details>
${pv?`<div class="prev"><b>Letztes Mal · ${fmt(pv.w.date)}</b>${prevTable(pv.ex)}</div>`:'<div class="mut">Noch keine Vorwerte.</div>'}
<div class="sets ${iso?'iso':''}"><div class="shead"><span>#</span>${iso?'<span>L kg</span><span>L Wdh</span><span>R kg</span><span>R Wdh</span>':'<span>kg</span><span>Wdh</span>'}<span></span></div>
${e.sets.map((s,j)=>`<div class="srow ${s.done?'done':''}"><span>${j+1}</span>${iso?inp(j,'lw',s)+inp(j,'lr',s)+inp(j,'rw',s)+inp(j,'rr',s):inp(j,'w',s)+inp(j,'r',s)}<button class="ok" data-act="done" data-i="${i}" data-j="${j}">✓</button></div>`).join('')}</div>
<button class="ghost" data-act="addrow" data-i="${i}">+ Satz</button></div>`}
function subTabs(){return`<div class="tabs"><button class="${trainSub==='plan'?'on':''}" data-act="tsub" data-s="plan">Plan</button><button class="${trainSub==='dev'?'on':''}" data-act="tsub" data-s="dev">Geräte &amp; Übungen</button></div>`}
const allCat=()=>CATALOG.concat(D.machines.map(m=>({...m,custom:true})));
function devView(){
  const all=allCat(),q=pk.q.toLowerCase(),items=all.filter(m=>(!pk.brand||m.brand===pk.brand)&&(!pk.group||m.group===pk.group)&&(!q||(m.name+' '+m.brand).toLowerCase().includes(q)));
  const brands=[...new Set(all.map(m=>m.brand))],rp=pk.replace&&getPlan(planDay).exercises.find(e=>e.id===pk.replace);
  return`<h2>Training</h2>${subTabs()}<div class="tabs">${DAYS.map(d=>`<button class="${d===planDay?'on':''}" data-act="pday" data-d="${d}">${d}</button>`).join('')}</div>
<div class="card ${rp?'hero':''}">${rp?`<b>Ersetzt: ${esc(rp.name)}</b> <button class="ghost sm" data-act="cancelrep">Abbrechen</button>`:`<b>Geräte für ${esc(planDay)} wählen</b>`}${pk.added?`<div class="up">✓ ${esc(pk.added)} hinzugefügt</div>`:''}
<label>Hersteller</label><select data-h="dflt" data-k="brand"><option value="">Alle</option>${brands.map(b=>`<option ${b===pk.brand?'selected':''}>${esc(b)}</option>`).join('')}</select>
<label>Muskelgruppe</label><select data-h="dflt" data-k="group"><option value="">Alle</option>${GROUPS.map(g=>`<option ${g===pk.group?'selected':''}>${g}</option>`).join('')}</select>
<label>Suche</label><input data-h="dflt" data-k="q" value="${esc(pk.q)}" placeholder="z. B. Brustpresse"></div>`
  +(items.slice(0,60).map(m=>`<div class="card"><div class="row"><span><b>${esc(m.name)}</b><br><span class="mut">${esc(m.brand)} · ${m.group}${m.iso?' · isolateral':''}</span></span><button class="ghost sm" style="margin:0" data-act="pickdev" data-id="${m.id}">${rp?'Ersetzen':'+ Plan'}</button>${m.custom?`<button class="x" data-act="delcustom" data-id="${m.id}">✕</button>`:''}</div></div>`).join('')||'<p class="mut">Keine Treffer.</p>')
  +(items.length>60?`<p class="mut">${items.length-60} weitere Geräte. Mit Hersteller oder Muskelgruppe eingrenzen.</p>`:'')
  +`<div class="card"><h3>Eigenes Gerät anlegen</h3><input id="c_name" placeholder="Name"><div class="row"><input id="c_brand" list="brl" placeholder="Hersteller"><datalist id="brl">${brands.map(b=>`<option value="${esc(b)}">`).join('')}</datalist><select id="c_group">${GROUPS.map(g=>`<option>${g}</option>`).join('')}</select></div><select id="c_type"><option value="normal">Normal</option><option value="iso">Isolateral</option></select><button class="btn" data-act="addcustom">Gerät speichern</button></div>`}
function planView(){
  if(trainSub==='dev')return devView();
  const pl=getPlan(planDay);
  return`<h2>Training</h2>${subTabs()}<div class="tabs">${DAYS.map(d=>`<button class="${d===planDay?'on':''}" data-act="pday" data-d="${d}">${d}</button>`).join('')}</div>
<button class="btn" data-act="startday">${esc(planDay)} starten</button><h3 style="margin-top:18px">Plan bearbeiten</h3>`
  +pl.exercises.map((e,i)=>`<div class="card"><input data-h="pl" data-id="${e.id}" data-k="name" value="${esc(e.name)}"><div class="row"><select data-h="pl" data-id="${e.id}" data-k="type"><option value="normal" ${e.type==='normal'?'selected':''}>Normal</option><option value="iso" ${e.type==='iso'?'selected':''}>Isolateral</option></select><input type="number" data-h="pl" data-id="${e.id}" data-k="sets" value="${e.sets}" aria-label="Sätze"><input data-h="pl" data-id="${e.id}" data-k="reps" value="${esc(e.reps)}" placeholder="Wdh 8-12"></div>
<details><summary>Geräteeinstellungen (${(e.settings||[]).length})</summary>${(e.settings||[]).map((st,n)=>`<div class="row"><input data-h="plset" data-id="${e.id}" data-n="${n}" data-p="k" value="${esc(st.k)}"><input data-h="plset" data-id="${e.id}" data-n="${n}" data-p="v" value="${esc(st.v)}" placeholder="Wert"><button class="x" data-act="plsetdel" data-id="${e.id}" data-n="${n}">✕</button></div>`).join('')}<button class="ghost" data-act="plsetadd" data-id="${e.id}">+ Einstellung</button></details><div class="row"><button class="x" data-act="mv" data-id="${e.id}" data-d="-1">↑</button><button class="x" data-act="mv" data-id="${e.id}" data-d="1">↓</button><button class="ghost" style="margin:0" data-act="exrep" data-id="${e.id}">Austauschen</button><button class="ghost danger" style="margin:0" data-act="exdel" data-id="${e.id}">Löschen</button></div></div>`).join('')
  +`<button class="btn" data-act="tsub" data-s="dev">+ Gerät aus Liste wählen</button><button class="ghost" style="width:100%" data-act="exadd">+ Freie Übung hinzufügen</button><p class="mut">Änderungen am Plan verändern keine gespeicherten Trainings.</p>`}
function detail(w){
  return`<button class="ghost" data-act="back">← Zurück</button><h2>${fmt(w.date)} · ${esc(w.day)}</h2><div class="mut">${w.dur?w.dur+' Min · ':''}${cnt(w)} Sätze · Volumen ${Math.round(vol(w))} kg</div>`
  +w.exercises.map(e=>{const pv=prevEx(e.exId,e.name,w.ts);return`<div class="card"><h3>${esc(e.name)}${e.type==='iso'?' <span class="mut">isolateral</span>':''}</h3>${e.settings.filter(s=>s.k).map(s=>`<div class="mut">${esc(s.k)}: ${esc(s.v||'–')}</div>`).join('')}<div class="prev">${prevTable(e)||'<div>keine Sätze</div>'}</div>${pv?cmp(e,pv.ex)+`<div class="mut">verglichen mit ${fmt(pv.w.date)}</div>`:''}</div>`}).join('')
  +(w.note?`<div class="card"><b>Notizen</b><div>${esc(w.note)}</div></div>`:'')+`<button class="ghost danger" style="width:100%" data-act="delw" data-id="${w.id}">Training löschen</button>`}

/* ---------- Render / Events ---------- */
function visibleNav(){return T.order.filter(k=>k==='editor'||!T.hidden.includes(k))}
function render(){
  $('#nav').innerHTML=visibleNav().map(k=>`<button class="${k===tab?'on':''}" data-act="go" data-a="${k}">${esc(T.t['nav_'+k]||NAV[k])}</button>`).join('');
  $('#main').innerHTML=(!P&&tab!=='settings')?V.welcome():V[tab]();
  const p=$('#persist');if(p&&navigator.storage?.persisted)navigator.storage.persisted().then(x=>p.textContent=x?'Speicher geschützt':'Speicher nicht dauerhaft geschützt')}
function go(t){tab=t;sub=null;render();window.scrollTo(0,0)}
const syncSettings=e=>{const pl=D.plans.find(p=>p.exercises.some(x=>x.id===e.exId));if(!pl)return;pl.exercises.find(x=>x.id===e.exId).settings=clone(e.settings);return save('plans',pl)};
function download(name,obj){const b=new Blob([JSON.stringify(obj,null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},4000)}
const backupObj=()=>({app:'logbook',schema:SCHEMA,exported:new Date().toISOString(),data:Object.fromEntries(ST.map(s=>[s,D[s]])),theme:T});
const bname=()=>'logbook-backup-'+today()+'.json';
function validate(o){
  if(!o||o.app!=='logbook')throw new Error('Das ist keine logbook-Sicherung.');
  if(typeof o.schema!=='number'||o.schema>SCHEMA)throw new Error('Die Sicherung stammt aus einer neueren App-Version. Bitte logbook aktualisieren.');
  if(!o.data||typeof o.data!=='object')throw new Error('Die Sicherung enthält keine Daten.');
  ST.forEach(s=>{const a=o.data[s];if(a!==undefined&&(!Array.isArray(a)||a.some(x=>!x||typeof x.id!=='string')))throw new Error('Bereich "'+s+'" ist beschädigt.')});
  if(!Array.isArray(o.data.profiles))throw new Error('Die Sicherung enthält keine Profile.');
  return o}  // spätere Schema-Versionen: hier migrieren

const A={
  go:d=>go(d.a),
  async createfirst(){const n=$('#newname').value.trim();if(!n)return alert('Bitte einen Namen eingeben.');await addProfile(n);go('home')},
  async newprof(){const n=prompt('Name des neuen Profils');if(n&&n.trim()){await addProfile(n.trim());tab='profiles';render()}},
  async pickp(d){P=D.profiles.find(x=>x.id===d.id);localStorage.setItem('lb_pid',P.id);render()},
  async delprof(){if(!confirm('Profil "'+P.name+'" mit allen Trainings, Plänen und Daten endgültig löschen?'))return;const id=P.id;
    for(const s of ST){for(const x of D[s].filter(x=>x.profileId===id||x.id===id))await remove(s,x.id)}
    P=D.profiles[0]||null;P?localStorage.setItem('lb_pid',P.id):localStorage.removeItem('lb_pid');go('home')},
  async startnext(){await startWorkout(P.next||'Push');planDay=P.next||'Push';go('training')},
  async startday(){await startWorkout(planDay);render()},
  pday(d){planDay=d.d;render()},
  async exadd(){const pl=getPlan(planDay);pl.exercises.push(mk('Neue Übung','normal',3,'8-12'));await save('plans',pl);render()},
  async exdel(d){if(!confirm('Übung aus dem Plan löschen? Gespeicherte Trainings bleiben erhalten.'))return;const pl=getPlan(planDay);pl.exercises=pl.exercises.filter(e=>e.id!==d.id);await save('plans',pl);render()},
  tsub(d){trainSub=d.s;pk.added='';render()},
  exrep(d){pk.replace=d.id;trainSub='dev';render()},
  cancelrep(){pk.replace=null;trainSub='plan';render()},
  async pickdev(d){const m=allCat().find(x=>x.id===d.id),pl=getPlan(planDay),nm=m.name+(m.brand&&m.brand!=='Allgemein'&&m.brand!=='Eigenes'?' ('+m.brand+')':''),e=mk(nm,m.iso?'iso':'normal',3,'8-12',m.keys||[]);e.brand=m.brand;
    if(pk.replace){const i=pl.exercises.findIndex(x=>x.id===pk.replace);if(i>=0){const o=pl.exercises[i];e.sets=o.sets;e.reps=o.reps;pl.exercises[i]=e}pk.replace=null;pk.added='';trainSub='plan'}else{pl.exercises.push(e);pk.added=nm}
    await save('plans',pl);render()},
  async addcustom(){const n=$('#c_name').value.trim();if(!n)return alert('Bitte einen Gerätenamen eingeben.');
    await save('machines',{id:uid(),name:n,brand:$('#c_brand').value.trim()||'Eigenes',group:$('#c_group').value,iso:$('#c_type').value==='iso'?1:0,keys:[]});pk.added=n;render()},
  async delcustom(d){if(!confirm('Eigenes Gerät aus der Liste löschen? Pläne und Trainings bleiben unverändert.'))return;await remove('machines',d.id);render()},
  async plsetadd(d){const pl=getPlan(planDay),e=pl.exercises.find(x=>x.id===d.id);(e.settings=e.settings||[]).push({k:'Neue Einstellung',v:''});await save('plans',pl);render()},
  async plsetdel(d){const pl=getPlan(planDay),e=pl.exercises.find(x=>x.id===d.id);e.settings.splice(+d.n,1);await save('plans',pl);render()},
  homemv(d){const i=T.home.indexOf(d.k),j=i+ +d.d;if(j<0||j>=T.home.length)return;[T.home[i],T.home[j]]=[T.home[j],T.home[i]];render()},
  async mv(d){const pl=getPlan(planDay),i=pl.exercises.findIndex(e=>e.id===d.id),j=i+ +d.d;if(j<0||j>=pl.exercises.length)return;[pl.exercises[i],pl.exercises[j]]=[pl.exercises[j],pl.exercises[i]];await save('plans',pl);render()},
  async addrow(d){const W=draft();W.exercises[+d.i].sets.push({});await save('drafts',W);render()},
  async addset(d){const W=draft(),e=W.exercises[+d.i];e.settings.push({k:'Neue Einstellung',v:''});await save('drafts',W);await syncSettings(e);render()},
  async delset(d){const W=draft(),e=W.exercises[+d.i];e.settings.splice(+d.n,1);await save('drafts',W);await syncSettings(e);render()},
  async done(d){const W=draft(),s=W.exercises[+d.i].sets[+d.j];s.done=!s.done;if(s.done)restEnd=Date.now()+T.rest*1000;await save('drafts',W);render()},
  async discard(){if(!confirm('Training verwerfen? Alle eingegebenen Werte dieses Trainings gehen verloren.'))return;await remove('drafts',P.id);render()},
  async finish(){
    const W=draft(),ex=W.exercises.map(e=>({...e,sets:e.sets.filter(hasData)})).filter(e=>e.sets.length);
    if(!ex.length&&!confirm('Es wurden keine Werte eingegeben. Trotzdem speichern?'))return;
    const w={id:uid(),profileId:P.id,day:W.day,date:today(),ts:Date.now(),dur:Math.max(1,Math.round((Date.now()-W.start)/60000)),note:W.note||'',exercises:ex};
    await save('workouts',w);await remove('drafts',P.id);
    const i=DAYS.indexOf(W.day);P.next=DAYS[(i+1)%DAYS.length];await save('profiles',P);
    tab='history';sub=w.id;render();window.scrollTo(0,0)},
  open(d){sub=d.id;render();window.scrollTo(0,0)},back(){sub=null;render()},
  async delw(d){if(!confirm('Dieses Training endgültig löschen?'))return;await remove('workouts',d.id);sub=null;render()},
  async addfood(){const g=id=>$('#'+id).value,n=g('f_name').trim();if(!n)return alert('Bitte einen Namen eingeben.');
    await save('food',{id:uid(),profileId:P.id,date:foodDate,meal:g('f_meal'),name:n,g:num(g('f_g')),kcal:num(g('f_kcal')),protein:num(g('f_p')),carbs:num(g('f_c')),fat:num(g('f_f'))});render()},
  async delfood(d){await remove('food',d.id);render()},
  async addbody(){const v=num($('#b_val').value);if(v==null)return alert('Bitte einen Zahlenwert eingeben.');const k=$('#b_kind').value.trim()||bodyKind;
    await save('body',{id:uid(),profileId:P.id,date:$('#b_date').value||today(),kind:k,value:v});bodyKind=k;render()},
  async delbody(d){await remove('body',d.id);render()},
  navmv(d){const i=T.order.indexOf(d.k),j=i+ +d.d;if(j<0||j>=T.order.length)return;[T.order[i],T.order[j]]=[T.order[j],T.order[i]];render()},
  addinfo(){T.info.push({title:'Titel',text:'Text'});render()},delinfo(d){T.info.splice(+d.i,1);render()},
  thsave(){localStorage.setItem('lb_theme',JSON.stringify(T));TS=clone(T);alert('Design gespeichert.')},
  thdiscard(){T=clone(TS);applyTheme();render()},
  threset(){if(!confirm('Design auf Standard zurücksetzen? Trainingsdaten bleiben unberührt.'))return;T=clone(DEF);localStorage.setItem('lb_theme',JSON.stringify(T));TS=clone(T);applyTheme();render()},
  export(){download(bname(),backupObj())},
  async share(){const f=new File([JSON.stringify(backupObj(),null,1)],bname(),{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f]})}catch(e){}}else download(bname(),backupObj())},
  cancelimport(){pending=null;render()},
  async doimport(){
    if(!confirm('Alle aktuellen Daten werden durch die Sicherung ersetzt. Fortfahren?'))return;
    if(confirm('Zuerst eine Sicherung der aktuellen Daten herunterladen? (empfohlen)'))download('logbook-vor-import-'+today()+'.json',backupObj());
    try{await DB.replaceAll(pending.data)}catch(e){return alert('Import fehlgeschlagen, deine bisherigen Daten sind unverändert. ('+e.message+')')}
    if(pending.theme){localStorage.setItem('lb_theme',JSON.stringify(pending.theme));loadTheme()}
    await loadAll();pending=null;tab='home';render();alert('Backup wiederhergestellt.')}
};
const H={
  async pick(t){P=D.profiles.find(x=>x.id===t.value);localStorage.setItem('lb_pid',P.id);render()},
  async next(t){P.next=t.value;await save('profiles',P)},
  async prof(t,d){P[d.k]=t.type==='number'?(t.value===''?'':num(t.value)):t.value;await save('profiles',P);if(d.k==='name')render()},
  async set(t,d){const W=draft(),s=W.exercises[+d.i].sets[+d.j];s[d.f]=num(t.value);await save('drafts',W)},
  async setk(t,d){const W=draft(),e=W.exercises[+d.i];e.settings[+d.n][d.p]=t.value;await save('drafts',W);await syncSettings(e)},
  async wnote(t){const W=draft();W.note=t.value;await save('drafts',W)},
  dflt(t,d){pk[d.k]=t.value;pk.added='';render()},
  async plset(t,d){const pl=getPlan(planDay),e=pl.exercises.find(x=>x.id===d.id);e.settings[+d.n][d.p]=t.value;await save('plans',pl)},
  homehide(t,d){T.hiddenHome=T.hiddenHome.filter(k=>k!==d.k);if(!t.checked)T.hiddenHome.push(d.k);render()},
  async pl(t,d){const pl=getPlan(planDay),e=pl.exercises.find(x=>x.id===d.id);e[d.k]=d.k==='sets'?Math.max(1,Math.min(12,parseInt(t.value)||3)):t.value;await save('plans',pl)},
  fdate(t){foodDate=t.value||today();render()},
  fname(t){const f=mine('food').filter(x=>x.name===t.value.trim()).pop();if(!f)return;[['f_g','g'],['f_kcal','kcal'],['f_p','protein'],['f_c','carbs'],['f_f','fat']].forEach(([i,k])=>$('#'+i).value=f[k]??'')},
  exsel(t){exSel=t.value;render()},bkind(t){bodyKind=t.value;render()},
  th(t,d){T[d.k]=t.type==='range'?+t.value:t.value;applyTheme();if(t.type==='range')render()},
  tt(t,d){t.value.trim()?T.t[d.k]=t.value.trim():delete T.t[d.k];render()},
  navhide(t,d){T.hidden=T.hidden.filter(k=>k!==d.k);if(!t.checked)T.hidden.push(d.k);render()},
  info(t,d){T.info[+d.i][d.p]=t.value},
  rest(t){T.rest=Math.max(10,parseInt(t.value)||90);localStorage.setItem('lb_theme',JSON.stringify(T));TS.rest=T.rest},
  async file(t){const f=t.files[0];if(!f)return;
    try{pending=validate(JSON.parse(await f.text()))}catch(e){pending=null;alert(e instanceof SyntaxError?'Die Datei ist kein gültiges JSON.':e.message)}render()}
};
// live updates des Editors beim Tippen/Ziehen
document.addEventListener('input',e=>{const t=e.target;if(t.dataset.h==='th')H.th(t,t.dataset)});
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(el&&A[el.dataset.act])try{await A[el.dataset.act](el.dataset,el)}catch(x){alert('Fehler: '+x.message)}});
document.addEventListener('change',async e=>{const t=e.target,f=H[t.dataset.h];if(f)try{await f(t,t.dataset)}catch(x){alert('Fehler beim Speichern: '+x.message)}});
setInterval(()=>{const r=$('#rest');if(!r)return;const s=Math.ceil((restEnd-Date.now())/1000);r.style.display=s>0?'block':'none';if(s>0)r.textContent='Pause '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0')},500);

async function loadAll(){for(const s of ST)D[s]=await DB.all(s);P=D.profiles.find(p=>p.id===localStorage.getItem('lb_pid'))||D.profiles[0]||null;if(P)localStorage.setItem('lb_pid',P.id)}
(async()=>{
  loadTheme();
  try{await DB.open();await loadAll();if(navigator.storage?.persist)navigator.storage.persist()}
  catch(e){$('#main').innerHTML='<div class="card"><h2>Speicher nicht verfügbar</h2><p>logbook braucht den lokalen Browser-Speicher. Im privaten Modus ist er oft gesperrt. Öffne die App in einem normalen Browserfenster. ('+esc(e.message)+')</p></div>';return}
  render();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
