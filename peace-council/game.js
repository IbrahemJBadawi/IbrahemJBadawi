/* Peace Council — Rebuild Gaza. An original, dependency-free Canvas 2.5D city-builder MVP.
 * The world is schematic, not a geographic parcel map. Local-only progress by design.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const KEY = 'peace-council-game-v1';
  const icon=(name,size=22)=>window.PCIcons?.icon(name,size)||'';
  const TYPE_ICONS={farm:'depot',ranch:'depot',mill:'depot',bakery:'depot',quarry:'depot',cementworks:'depot',steelworks:'depot',factory:'depot',warehouse:'depot',bank:'depot',council:'build',port:'depot',airport:'depot',house:'house',clinic:'clinic',school:'school',water:'water',power:'power',market:'market',depot:'depot',park:'park',road:'road'};
  document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon,20)});
  const VERSION = 6;
  const economy=window.PCEconomy;
  const network=window.PCNetwork;
  const LIMIT = Number.MAX_SAFE_INTEGER;
  const safeInt = (n,min=0) => Number.isFinite(Number(n)) ? Math.max(min,Math.min(LIMIT,Math.floor(Number(n)))) : min;
  const COLS = 14, ROWS = 12;
  const DAY_MS = 25000;
  const LABELS = [
    {name:'شمال غزة',sub:'الزراعة والإسكان',icon:'◇'},
    {name:'مدينة غزة',sub:'المقر الرئيسي • الميناء والتجارة',icon:'◇'},
    {name:'دير البلح',sub:'الأسواق والخدمات',icon:'◈'},
    {name:'خان يونس',sub:'الصحة والزراعة',icon:'◇'},
    {name:'رفح',sub:'المطار والخدمات اللوجستية',icon:'◇'}
  ];
  const TYPES = {
    farm: {name:'مزرعة حبوب',price:360,materials:7,height:14,color:'#cdb875',side:'#84968d',roof:'#e4dfc9',desc:'إنتاج الحبوب',xp:35},
    ranch: {name:'مزرعة ألبان',price:460,materials:9,height:20,color:'#d4c8ad',side:'#84968d',roof:'#e4dfc9',desc:'حبوب ← حليب',xp:35},
    mill: {name:'مطحنة',price:520,materials:11,height:26,color:'#ddbf92',side:'#84968d',roof:'#e4dfc9',desc:'حبوب ← دقيق',xp:35},
    bakery: {name:'مخبز',price:450,materials:8,height:23,color:'#d9ac7f',side:'#84968d',roof:'#e4dfc9',desc:'دقيق ← خبز',xp:35},
    quarry: {name:'مركز خامات',price:600,materials:12,height:18,color:'#b4afa0',side:'#84968d',roof:'#e4dfc9',desc:'إنتاج الحجر وخام الحديد',xp:35},
    cementworks: {name:'مصنع إسمنت',price:780,materials:17,height:30,color:'#b8bcb9',side:'#84968d',roof:'#e4dfc9',desc:'حجر ← إسمنت',xp:35},
    steelworks: {name:'مصنع فولاذ',price:900,materials:20,height:35,color:'#a1b3bd',side:'#84968d',roof:'#e4dfc9',desc:'خام الحديد ← فولاذ',xp:35},
    factory: {name:'مصنع أدوات',price:1100,materials:24,height:34,color:'#c3b5a0',side:'#84968d',roof:'#e4dfc9',desc:'إسمنت وفولاذ ← أدوات ومواد بناء',xp:35},
    warehouse: {name:'مستودع',price:450,materials:8,height:22,color:'#c9ad8d',side:'#84968d',roof:'#e4dfc9',desc:'زيادة سعة المخزون',xp:35},
    bank: {name:'بنك التنمية',price:950,materials:18,height:36,color:'#e7d9b5',side:'#84968d',roof:'#e4dfc9',desc:'تمويل تنموي افتراضي',xp:35},
    house: {name:'منزل',icon:'🏠',price:320,materials:6,height:25,color:'#f7ba79',side:'#a96f5c',roof:'#e5d6b0',desc:'يزيد عدد السكان',xp:15},
    clinic: {name:'مركز صحي',icon:'🏥',price:750,materials:14,height:29,color:'#e9ecec',side:'#8aaebd',roof:'#edf7ff',desc:'يحسّن التغطية الصحية',xp:35},
    school: {name:'مدرسة',icon:'🏫',price:650,materials:12,height:28,color:'#e6c77e',side:'#b08055',roof:'#e9a25d',desc:'يوفّر خدمات التعليم',xp:30},
    water: {name:'محطة مياه',icon:'💧',price:580,materials:12,height:34,color:'#7fd5d8',side:'#358f9b',roof:'#c4f4f2',desc:'تزيد سعة إمدادات المياه',xp:35},
    power: {name:'محطة طاقة',icon:'⚡',price:700,materials:15,height:30,color:'#e0c96a',side:'#ad8a3f',roof:'#f3dfa2',desc:'تزيد سعة الكهرباء',xp:40},
    market: {name:'سوق',icon:'🛒',price:520,materials:10,height:24,color:'#f0b680',side:'#ad5f55',roof:'#d87964',desc:'يرفع الإيرادات اليومية',xp:35},
    depot: {name:'مركز مواد',icon:'🧱',price:490,materials:9,height:23,color:'#b2babc',side:'#778b90',roof:'#c7a782',desc:'ينتج مواد البناء يوميًا',xp:30},
    park: {name:'حديقة',icon:'🌳',price:240,materials:4,height:14,color:'#7fbe7e',side:'#448e6a',roof:'#9bd37f',desc:'ترفع رضا السكان',xp:15},
    council: {name:'مقر مجلس السلام',price:1000,materials:20,height:46,color:'#ece0c4',side:'#ab9875',roof:'#719d8a',desc:'مركز إدارة القطاع والبحث',xp:100,region:1},
    port: {name:'ميناء غزة (مستقبلي)',price:2400,materials:45,height:38,color:'#89b6c8',side:'#426b83',roof:'#c6e5ed',desc:'مشروع تجاري ساحلي في غزة',xp:100,region:1},
    airport: {name:'مطار ياسر عرفات (مستقبلي)',price:3200,materials:65,height:31,color:'#c6d2d9',side:'#788b9d',roof:'#edf2f8',desc:'مشروع نقل مستقبلي في رفح',xp:130,region:4},
    road: {name:'طريق',icon:'🛣️',price:80,materials:1,height:2,color:'#a3a8aa',side:'#656f75',roof:'#b7b5a9',desc:'توسّع شبكة المدينة',xp:4}
  };
  const SCHOOLS = {
    japan:{name:'اليابانية',desc:'تحسين كفاءة المياه والطاقة',cost:800},
    turkey:{name:'التركية',desc:'خفض تكلفة الإنشاء والترقية',cost:650},
    china:{name:'الصينية',desc:'تحسين إنتاج مواد البناء',cost:750},
    usa:{name:'الأمريكية',desc:'رفع إيرادات التجارة والابتكار',cost:850}
  };
  const MISSIONS = [
    {title:'الرعاية أولًا',description:'ابنِ مركزًا صحيًا يخدم الأسر في المدينة.',goal:'مركز صحي',target:1,progress:()=>activeCount('clinic'),reward:{coins:400,materials:5,xp:110}},
    {title:'التعليم يعيد الأمل',description:'شغّل مدرسة ليستمر الأطفال في التعلم.',goal:'مدرسة',target:1,progress:()=>activeCount('school'),reward:{coins:450,materials:5,xp:125}},
    {title:'عودة العائلات',description:'وفّر منازل ترفع عدد سكان المدينة إلى 72 نسمة.',goal:'72 نسمة',target:72,progress:()=>stats().population,reward:{coins:560,materials:9,xp:145}},
    {title:'سلسلة الإمداد',description:'ابنِ مركز مواد لتسريع مشروعات الإعمار.',goal:'مركز مواد',target:1,progress:()=>activeCount('depot'),reward:{coins:500,materials:9,xp:155}},
    {title:'حياة تستحق',description:'ارفع رضا السكان إلى 85% عبر تحسين الخدمات.',goal:'85% رضا',target:85,progress:()=>stats().happiness,reward:{coins:670,materials:7,xp:210}},
    {title:'اقتصاد يتحرك',description:'ابنِ سوقًا وثلاثة مقاطع من الطرق.',goal:'سوق + 3 طرق',target:4,progress:()=>Math.min(1,activeCount('market'))+Math.min(3,activeCount('road')),reward:{coins:800,materials:10,xp:230}},
    {title:'مدينة تنهض',description:'أكمل 14 منشأة نشطة في مدينتك.',goal:'14 منشأة',target:14,progress:()=>state.buildings.filter(b=>b.job?.kind!=='build').length,reward:{coins:1000,materials:15,xp:300}}
  ];
  const initialBuildings = [
    {c:6,r:4,type:'house',level:1,id:1},
    {c:7,r:4,type:'house',level:1,id:2},
    {c:5,r:6,type:'water',level:1,id:3},
    {c:8,r:6,type:'power',level:1,id:4},
    {c:7,r:5,type:'road',level:1,id:5},
    {c:6,r:6,type:'park',level:1,id:6}
  ];
  const fresh = () => ({version:VERSION,day:1,coins:4800,materials:85,xp:0,mission:0,nextId:8,introDone:false,region:1,district:null,links:network.normalize(),economy:economy.fresh(),actions:0,missionStart:0,research:{japan:0,turkey:0,china:0,usa:0},buildings:[...initialBuildings.map(b=>({...b,region:1})),{c:7,r:7,type:'council',level:1,id:7,region:1,paid:0}],history:[]});
  let state = fresh(), selectedType = null, selectedBuilding = null, hover = null;
  let camera = {zoom:1,panX:0,panY:0}, canvas,ctx,dpr=1,cw=1,ch=1,rafPending=false,toastTimer=0,dayTimer=0,soundOn=false,audioCtx=null,manualPaused=false;
  const pointers = new Map();
  let gesture = null;
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const fmt = n => Math.round(n).toLocaleString('ar');
  const researchBonus = key => Math.log1p(state.research[key])*.12;
  const discount = () => 1/(1+researchBonus('turkey'));
  const buildCost = t => ({price:safeInt(t.price*discount(),1),mat:safeInt(t.materials*discount(),1)});
  const researchCost = key => ({coins:safeInt(SCHOOLS[key].cost*(1+state.research[key]*.35),1),materials:safeInt(8+state.research[key]*2,1)});
  const stats = () => {
    const total = t => state.buildings.filter(b=>b.type===t&&b.job?.kind!=='build').reduce((n,b)=>n+(1+(b.level-1)*.65),0);
    const population = Math.round(total('house')*18);
    const water = Math.round(total('water')*90*(1+researchBonus('japan'))), energy = Math.round(total('power')*90*(1+researchBonus('japan')));
    const health = Math.round(total('clinic')*85), education = Math.round(total('school')*85);
    const ratio = (capacity,demand) => demand ? clamp(capacity/demand,0,1) : 1;
    const waterPct = Math.round(ratio(water,population)*100), energyPct = Math.round(ratio(energy,population)*100);
    const healthPct = Math.round(ratio(health,population)*100),educationPct = Math.round(ratio(education,population*.72)*100);
    const food=state.economy.last?.regions;const foodNeed=food?.reduce((n,r)=>n+r.foodNeed,0)||0,foodFed=food?.reduce((n,r)=>n+r.foodFed,0)||0;const foodPenalty=foodNeed?Math.round(8*(1-foodFed/foodNeed)):0;
    const happiness = Math.round(clamp(24-foodPenalty+waterPct*.2+energyPct*.2+healthPct*.15+educationPct*.13+Math.min(20,Math.log1p(total('park'))*9)+Math.min(2,total('market'))*3,0,100));
    const transport=network.economy(state.links,state.buildings);
    const income = Math.round(transport.income+60+population*2.3+(total('market')*75+total('port')*210+total('airport')*275)*(1+researchBonus('usa'))+total('road')*2-total('clinic')*22-total('school')*17-total('water')*13-total('power')*19-total('depot')*13);
    const materialIncome = transport.materials+2+Math.round(total('depot')*4*(1+researchBonus('china')));
    return {population,waterPct,energyPct,healthPct,educationPct,happiness,income,materialIncome,transport};
  };
  const count = t => state.buildings.filter(b=>b.type===t).length;
  const activeCount = t => state.buildings.filter(b=>b.type===t&&b.job?.kind!=='build').length;
  const jobs = () => state.buildings.filter(b=>b.job);
  const crewLimit = () => 2+Math.floor(Math.log2(state.buildings.find(b=>b.type==='council')?.level||1));
  const jobDays = (t,level=1) => Math.max(1,Math.min(12,Math.ceil(Math.log2(1+t.price/450)+Math.log2(level)/2)));
  function finishJobs(){let completed=0;for(const b of jobs()){if(--b.job.remaining>0)continue;if(b.job.kind==='upgrade')b.level++;delete b.job;state.xp=safeInt(state.xp+TYPES[b.type].xp);state.actions=safeInt(state.actions+1);completed++}return completed;}
  const getLevel = () => 1+Math.floor(state.xp/240);
  const isWater = (c,r,region=state.region)=>c<2 || (c===2 && r<[4,2,3,5,1][region]);
  const localBuildings = () => state.buildings.filter(b=>b.region===state.region);
  const upgradeCost = (t,level) => ({price:safeInt(t.price*(.65+level*.25)*discount(),1),mat:safeInt(t.materials*(.5+level*.4)*discount(),1)});
  const currentMission = () => {
    if(state.mission<MISSIONS.length)return MISSIONS[state.mission];
    const n=state.mission-MISSIONS.length;
    const target=3+Math.floor(Math.sqrt(n));
    return {title:['تطوير متواصل','نهضة جديدة','استثمار في المستقبل'][n%3],description:'ابنِ منشآت جديدة أو طوّر المباني والأبحاث في أي محافظة.',target,progress:()=>Math.max(0,state.actions-state.missionStart),reward:{coins:safeInt(300+target*120),materials:safeInt(5+target*2),xp:safeInt(100+target*25)}};
  };
  const canBuildType = (type,c,r) => {const t=TYPES[type];return t.region===undefined || (t.region===state.region && !count(type) && (type!=='port'||(c>=2&&isWater(c-1,r))));};
  const valid = (c,r)=>c>=0&&c<COLS&&r>=0&&r<ROWS;
  const occupied = (c,r)=>state.buildings.find(b=>b.region===state.region&&b.c===c&&b.r===r);
  const canPlace = (c,r)=>valid(c,r)&&!isWater(c,r)&&!occupied(c,r);
  const save = () => {
    state.version=VERSION;
    try{localStorage.setItem(KEY,JSON.stringify(state));$('save-status').textContent='● محفوظ محليًا';$('save-status').classList.remove('error');return true}
    catch(e){$('save-status').textContent='● تعذّر الحفظ';$('save-status').classList.add('error');return false}
  };
  function validated(raw){
    if(!raw || typeof raw!=='object'||![1,2,3,4,5,VERSION].includes(raw.version)||!Array.isArray(raw.buildings)||raw.buildings.length>COLS*ROWS*LABELS.length||raw.buildings.length<0)return null;
    const safe={...fresh(),day:safeInt(raw.day,1),coins:safeInt(raw.coins),materials:safeInt(raw.materials),xp:safeInt(raw.xp),mission:safeInt(raw.mission),region:raw.version<3?1:clamp(safeInt(raw.region??1),0,4),actions:safeInt(raw.actions),missionStart:safeInt(raw.missionStart),introDone:Boolean(raw.introDone)};
    safe.missionStart=Math.min(safe.actions,safe.missionStart);
    safe.links=network.normalize(raw.links);safe.economy=economy.normalize(raw.economy);safe.district=network.PLACES.some(p=>p.id===raw.district&&p.region===safe.region)?raw.district:null;
    for(const key of Object.keys(SCHOOLS))safe.research[key]=safeInt(raw.research?.[key]);
    const used=new Set(),buildings=[];
    for(const b of raw.buildings){
      const region=b?.region??2;
      if(!b || !Number.isInteger(region)||region<0||region>4||!Number.isInteger(b.c)||!Number.isInteger(b.r)||!valid(b.c,b.r)||isWater(b.c,b.r,region)||!Object.hasOwn(TYPES,b.type)||!Number.isSafeInteger(b.level)||b.level<1)return null;
      if(TYPES[b.type].region!==undefined&&(TYPES[b.type].region!==region||(b.type==='port'&&(b.c<2||!isWater(b.c-1,b.r,region)))||buildings.some(x=>x.type===b.type)))return null;
      const key=`${region}:${b.c}:${b.r}`;if(used.has(key))return null;used.add(key);
      const item={c:b.c,r:b.r,type:b.type,level:b.level,region,id:buildings.length+1,paid:Math.min(TYPES[b.type].price,safeInt(b.paid??TYPES[b.type].price))};
      if(b.job){if(raw.version<4||!['build','upgrade'].includes(b.job.kind)||!Number.isInteger(b.job.remaining)||b.job.remaining<1||b.job.remaining>12||!Number.isInteger(b.job.duration)||b.job.duration<b.job.remaining||b.job.duration>12||(b.job.kind==='build'&&(b.level!==1||b.type==='council'))||(b.job.kind==='upgrade'&&b.level>=LIMIT))return null;item.job={kind:b.job.kind,remaining:b.job.remaining,duration:b.job.duration};}
      buildings.push(item);
    }
    if(!buildings.some(b=>b.type==='council')){const spot=Array.from({length:COLS*ROWS},(_,i)=>({c:i%COLS,r:Math.floor(i/COLS)})).find(p=>p.c>=5&&!isWater(p.c,p.r,1)&&!used.has(`1:${p.c}:${p.r}`));if(spot)buildings.push({...spot,region:1,type:'council',level:1,id:buildings.length+1,paid:0});}
    safe.buildings=buildings;safe.nextId=buildings.length+1;
    return safe;
  }
  try{const previous=localStorage.getItem(KEY);if(previous){const x=validated(JSON.parse(previous));if(x)state=x}}catch(e){/* game is still playable without storage */}
  const toast=(message,bad=false)=>{const el=$('toast');el.textContent=message;el.classList.toggle('bad',bad);el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3300)};
  const playSound=(kind='click')=>{
    if(!soundOn)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      audioCtx=audioCtx||new AC();if(audioCtx.state==='suspended')audioCtx.resume();
      const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;
      osc.type='sine';osc.frequency.setValueAtTime(kind==='reward'?550:380,now);osc.frequency.exponentialRampToValueAtTime(kind==='reward'?880:500,now+.16);
      gain.gain.setValueAtTime(.035,now);gain.gain.exponentialRampToValueAtTime(.001,now+.18);osc.connect(gain).connect(audioCtx.destination);osc.start(now);osc.stop(now+.18);
    }catch(e){/* audio is optional */}
  };
  function updateUi(){
    const s=stats();
    $('metric-coins').textContent=fmt(state.coins)+' ◈';
    $('metric-materials').textContent=fmt(state.materials);
    $('metric-population').textContent=fmt(s.population);
    $('metric-happiness').textContent=s.happiness+'%';
    $('metric-level').textContent=getLevel();
    $('game-day').textContent=fmt(state.day);
    $('income-label').textContent=(s.income>=0?'+':'')+fmt(s.income)+' ◈ / يوم';
    $('service-bars').innerHTML=[
      ['المياه',s.waterPct,'aqua'],['الكهرباء',s.energyPct,'yellow'],['الرعاية الصحية',s.healthPct,'mint'],['التعليم',s.educationPct,'pink']
    ].map(([label,pct,color])=>`<div class="bar-item"><div class="bar-row"><span>${label}</span><span>${pct}%</span></div><div class="bar-bg"><div class="bar-fill ${color}" style="width:${pct}%"></div></div></div>`).join('');
    $('build-list').innerHTML=Object.entries(TYPES).filter(([,t])=>t.region===undefined||t.region===state.region).map(([id,t])=>{const cost=buildCost(t);return `<button type="button" class="build-item ${selectedType===id?'active':''}" data-build="${id}" title="${t.desc}" aria-label="${t.name}، ${fmt(cost.price)} عملة و ${fmt(cost.mat)} مواد" aria-pressed="${selectedType===id}"><span class="build-icon art-preview">${window.PCArt?.svg(id,1)||icon(TYPE_ICONS[id],22)}</span><strong>${t.name}</strong><div class="build-cost"><span>◈ ${fmt(cost.price)}</span><span class="subcost">▣ ${fmt(cost.mat)}</span></div></button>`}).join('');
    $('regions').innerHTML=LABELS.map((r,i)=>`<button type="button" class="region-button ${i===state.region?'active':''}" data-region="${i}"><span><strong>${r.name}</strong><small>${r.sub}</small></span><span class="region-symbol">${i===state.region?icon('check',15):icon('pin',15)}</span></button>`).join('');
    window.PCWorldMap?.highlight(state.region,state.district);window.PCWorldMap?.setNetwork(state.links);
    const linked=network.reachable(state.links);$('transport-summary').textContent=linked.size+' / 5 • +'+fmt(s.transport.income)+' ◈ / يوم';
    $('transport-list').innerHTML=network.ROUTES.map(route=>{const level=state.links[route.id],cost=network.cost(route,level);return `<div class="transport-row"><div><strong>${route.name}</strong><small>${level?'المستوى '+fmt(level):'مسار مقترح'} • ${level&&linked.has(route.from)?'متصل بالمقر':'غير متصل بالمقر'}</small></div><button data-route="${route.id}" type="button" ${level>=LIMIT||state.coins<cost.coins||state.materials<cost.materials?'disabled':''}>${level?'تطوير':'ربط'}<small>◈ ${fmt(cost.coins)} · ▣ ${fmt(cost.materials)}</small></button></div>`}).join('');
    $('district-list').innerHTML=network.PLACES.filter(p=>p.region===state.region).map(p=>`<button type="button" class="region-button ${state.district===p.id?'active':''}" data-district="${p.id}"><span><strong>${p.name}</strong><small>${p.role}</small></span></button>`).join('');
    $('region-title').textContent=LABELS[state.region].name;
    const district=network.PLACES.find(p=>p.id===state.district);$('district-name').textContent=district?'المنطقة المختارة: '+district.name:'اختر منطقة من خريطة العالم';
    $('region-subtitle').textContent=LABELS[state.region].sub+(linked.has(state.region)?' • متصل بالمقر':' • ربط قيد التخطيط');
    $('research-list').innerHTML=Object.entries(SCHOOLS).map(([key,school])=>{const cost=researchCost(key);return `<button type="button" class="build-item" data-research="${key}" ${state.research[key]>=LIMIT||state.coins<cost.coins||state.materials<cost.materials?'disabled':''}><strong>${school.name} • ${fmt(state.research[key])}</strong><small>${school.desc}</small><div class="build-cost"><span>◈ ${fmt(cost.coins)}</span><span>▣ ${fmt(cost.materials)}</span></div></button>`}).join('');
    $('crew-count').textContent=jobs().length+' / '+crewLimit();
    $('construction-list').innerHTML=jobs().length?jobs().map(b=>`<div class="job-row"><div><strong>${TYPES[b.type].name}</strong><small>${LABELS[b.region].name} • ${b.job.kind==='build'?'إنشاء':'ترقية'} • ${fmt(b.job.remaining)} يوم</small><div class="job-track"><span style="width:${100*(1-b.job.remaining/b.job.duration)}%"></span></div></div><b>${fmt(b.job.remaining*25)} ث</b></div>`).join(''):'<p class="fine-print">فرق البناء جاهزة لاستلام مشروع جديد.</p>';
    renderEconomy();renderMission(); renderSelection();
    $('mode-hint').textContent=selectedType?`اختر أرضًا فارغة لبناء ${TYPES[selectedType].name} — ${fmt(buildCost(TYPES[selectedType]).price)} ◈ و${fmt(buildCost(TYPES[selectedType]).mat)} مواد`:'اختر منشأة ثم اضغط على أرض فارغة للبناء';
    invalidate();
  }
  function renderEconomy(){
    const e=state.economy,i=state.region,stock=e.stock[i],report=e.last?.regions[i],access=economy.access(state.buildings,i,['market','port','airport','council']);
    $('economy-region').textContent=LABELS[i].name;
    $('stock-capacity').textContent=fmt(economy.used(stock))+' / '+fmt(economy.capacity(state.buildings,i));
    $('economy-jobs').textContent=fmt(report?.jobs||0)+' / '+fmt(economy.workers(state.buildings,i));
    $('economy-food').textContent=report?fmt(report.foodFed)+' / '+fmt(report.foodNeed):'—';
    $('economy-production').textContent=report?fmt(report.produced)+' • متوقفة '+fmt(report.blocked):'—';
    $('economy-freight').textContent=report?fmt(report.shipped):'—';
    $('economy-debt').textContent=fmt(e.debt)+' ◈';
    $('economy-loan').disabled=!!e.debt||!economy.access(state.buildings,i,['bank']);
    $('economy-goods').innerHTML=economy.KEYS.map(k=>{const buy=economy.price(stock,k,'buy')*5,sell=economy.price(stock,k,'sell')*5;return `<div class="goods-row"><div><strong>${economy.GOODS[k].name}</strong><small>المخزون ${fmt(stock[k])}</small></div><button type="button" data-good="${k}" data-side="buy" ${!access||state.coins<buy||economy.used(stock)+5>economy.capacity(state.buildings,i)?'disabled':''}>شراء 5<small>${fmt(buy)} ◈</small></button><button type="button" data-good="${k}" data-side="sell" ${!access||stock[k]<5?'disabled':''}>بيع 5<small>${fmt(sell)} ◈</small></button></div>`}).join('');
    $('economy-recipes').innerHTML=Object.entries(economy.RECIPES).map(([k,r])=>`<div class="recipe-row"><strong>${TYPES[k].name}</strong><small>${Object.entries(r.in).map(([g,n])=>n+' '+economy.GOODS[g].name).join(' + ')||'إنتاج أولي'} ← ${Object.entries(r.out).map(([g,n])=>n+' '+economy.GOODS[g].name).join(' + ')}${r.materials?' + '+r.materials+' مواد بناء':''} • ${r.jobs} عمال</small></div>`).join('');
  }
  function tradeGoods(key,side){const delta=economy.trade(state.economy,state.buildings,state.region,key,side,state.coins);if(delta===null)return false;state.coins=safeInt(state.coins+delta);save();updateUi();return true;}
  function takeLoan(){const amount=economy.borrow(state.economy,state.buildings,state.region);if(!amount)return false;state.coins=safeInt(state.coins+amount);save();updateUi();return true;}
  $('economy-goods').addEventListener('click',e=>{const el=e.target.closest('[data-good]');if(el)tradeGoods(el.dataset.good,el.dataset.side)});
  $('economy-loan').addEventListener('click',takeLoan);
  function renderMission(){
    const i=state.mission;$('mission-counter').textContent=`${fmt(i+1)} / ∞`;
    const m=currentMission(),p=clamp(m.progress(),0,m.target),done=p>=m.target;
    $('mission-card').innerHTML=`<div class="mission-card"><div class="mission-kicker">المهمة ${i+1} • +${m.reward.xp} نقطة خبرة</div><h3>${m.title}</h3><p>${m.description}</p><div class="mission-progress"><span style="width:${Math.round(p/m.target*100)}%"></span></div><div class="mission-reward"><span>${icon('trophy',14)} ${fmt(m.reward.coins)} ◈</span><span>+${fmt(m.reward.materials)} مواد</span></div><button type="button" class="mission-claim" id="claim-mission" ${done?'':'disabled'}>${done?'✓ استلام المكافأة':`التقدم ${fmt(p)} / ${fmt(m.target)}`}</button></div>`;
  }
  function renderSelection(){
    const el=$('selection-info'),b=state.buildings.find(x=>x.id===selectedBuilding);
    if(!b){selectedBuilding=null;el.hidden=true;return}
    el.hidden=false;
    if(b.job){el.innerHTML=`<div class="selection-line"><strong>${TYPES[b.type].name}</strong><small>${b.job.kind==='build'?'قيد البناء':'قيد التطوير'} • ${fmt(b.job.remaining)} يوم</small></div><div class="selection-actions"><button id="close-selection" type="button">إغلاق</button></div>`;return;}
    const t=TYPES[b.type],{price:upgradePrice,mat:upgradeMat}=upgradeCost(t,b.level);
    el.innerHTML=`<div class="selection-line"><strong>${icon(TYPE_ICONS[b.type],18)} ${t.name}</strong><small>المستوى ${fmt(b.level)} • ${window.PCArt?.style(b.level)||""}</small></div><div class="selection-actions">${b.level<LIMIT?`<button type="button" id="upgrade-building">⬆ ترقية (◈ ${fmt(upgradePrice)}، ▣ ${fmt(upgradeMat)})</button>`:''}${b.type==='council'?'':'<button type="button" class="demolish" id="demolish-building">إزالة المبنى</button>'}<button type="button" id="close-selection">✕</button></div>`;
  }
  function chooseBuild(type){
    if(!Object.hasOwn(TYPES,type))return;
    selectedBuilding=null;selectedType=selectedType===type?null:type;playSound();updateUi();
  }
  function place(c,r){
    const t=TYPES[selectedType];
    if(!t)return;
    if(!valid(c,r)||isWater(c,r)){toast('هذه مساحة مائية. اختر أرضًا داخل منطقة البناء.',true);return}
    if(occupied(c,r)){toast('هذا المربع مشغول بالفعل.',true);return}
    if(!canBuildType(selectedType,c,r)){toast('المشروع فريد ويحتاج إلى الموقع المناسب؛ الميناء على المربعات الساحلية الملاصقة للشاطئ.',true);return}
    if(jobs().length>=crewLimit()){toast('جميع الفرق الهندسية مشغولة.',true);return}
    const cost=buildCost(t);
    if(state.coins<cost.price||state.materials<cost.mat){toast('الموارد غير كافية. انتظر إيراد الأيام أو اختر منشأة أخرى.',true);return}
    state.coins-=cost.price;state.materials-=cost.mat;
    const duration=jobDays(t);
    state.buildings.push({id:state.nextId++,c,r,region:state.region,type:selectedType,level:1,paid:cost.price,job:{kind:'build',remaining:duration,duration}});
    toast(`بدأ إنشاء ${t.name} • ${fmt(duration)} يوم`);playSound();save();updateUi();
  }
  function upgrade(){
    const b=state.buildings.find(x=>x.id===selectedBuilding);if(!b||b.level>=LIMIT||b.job)return;
    if(jobs().length>=crewLimit()){toast('جميع الفرق الهندسية مشغولة.',true);return}
    const t=TYPES[b.type],{price,mat}=upgradeCost(t,b.level);
    if(state.coins<price||state.materials<mat){toast('الموارد غير كافية للترقية.',true);return}
    state.coins-=price;state.materials-=mat;const duration=jobDays(t,b.level+1);b.job={kind:'upgrade',remaining:duration,duration};
    toast(`بدأ تطوير ${t.name} إلى المستوى ${fmt(b.level+1)}`);playSound();save();updateUi();
  }
  const showModal=(title,body,buttons)=>{
    const host=$('modal-host');host.hidden=false;
    const dialog=document.createElement('section');dialog.className='modal';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',title);
    const h=document.createElement('h2');h.textContent=title;dialog.appendChild(h);
    const p=document.createElement('div');p.innerHTML=body;dialog.appendChild(p);
    const actions=document.createElement('div');actions.className='modal-actions';
    buttons.forEach(({label,action,primary=false})=>{const btn=document.createElement('button');btn.textContent=label;btn.type='button';btn.className=primary?'primary-btn':'secondary-btn';btn.addEventListener('click',()=>{host.hidden=true;host.innerHTML='';action?.()});actions.appendChild(btn)});
    dialog.appendChild(actions);host.appendChild(dialog);actions.querySelector('button')?.focus();
  };
  function demolish(){
    const b=state.buildings.find(x=>x.id===selectedBuilding);if(!b||b.type==='council'||b.job)return;
    const t=TYPES[b.type];
    showModal('إزالة المنشأة',`<p>هل تريد إزالة <b>${t.name}</b>؟ ستسترد 40% من تكلفة بنائها الأساسية، ولن تعود الموارد المستخدمة في تطويرها.</p>`,[
      {label:'تأكيد الإزالة',primary:true,action:()=>{state.buildings=state.buildings.filter(x=>x.id!==b.id);state.coins=safeInt(state.coins+Math.floor((b.paid??t.price)*.4));selectedBuilding=null;save();updateUi();toast('تمت إزالة المنشأة واسترداد جزء من الميزانية.')}},
      {label:'إلغاء'}
    ]);
  }
  function completeMission(){
    const m=currentMission();if(m.progress()<m.target||state.mission>=LIMIT)return;
    state.coins=safeInt(state.coins+m.reward.coins);state.materials=safeInt(state.materials+m.reward.materials);state.xp=safeInt(state.xp+m.reward.xp);state.mission++;state.missionStart=state.actions;
    toast('🏆 اكتملت المهمة! تم إضافة المكافأة.');playSound('reward');save();updateUi();
    // Generated missions continue after the introductory campaign.
  }
  function nextDay(){
    if(manualPaused||document.hidden)return;
    const s=stats();state.day=safeInt(state.day+1,1);state.coins=safeInt(state.coins+s.income);state.materials=safeInt(state.materials+s.materialIncome);
    const production=economy.day(state.economy,state.buildings,state.links,network.ROUTES);state.materials=safeInt(state.materials+production.materials);state.coins=safeInt(state.coins-production.wages);state.coins-=economy.repay(state.economy,state.coins);
    const completed=finishJobs();if(completed){toast('✓ اكتمل '+fmt(completed)+' مشروع');playSound('reward');}
    else if(state.day%7===0)toast(`☀ بدأ يوم جديد. دخل +${fmt(s.income)} ومواد +${fmt(s.materialIncome)}`);
    save();updateUi();
  }
  const canvasNode=$('world');canvas=canvasNode;ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx){$('mode-hint').textContent='متصفحك لا يدعم تشغيل Canvas.';return}
  function viewport(){
    const bounds=$('canvas-wrap').getBoundingClientRect();cw=Math.max(1,bounds.width);ch=Math.max(1,bounds.height);
    dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.floor(cw*dpr);canvas.height=Math.floor(ch*dpr);
    canvas.style.width=cw+'px';canvas.style.height=ch+'px';
    if(!camera.initialized){camera.zoom=cw<550?.72:cw<870?.94:1.03;camera.initialized=true}
    invalidate();
  }
  function dims(){return {tw:66*camera.zoom,th:36*camera.zoom}}
  function origin(){const {th}=dims();return{x:cw/2+camera.panX,y:ch/2-(COLS+ROWS-2)*th/4+camera.panY}}
  function iso(c,r){const {tw,th}=dims(),o=origin();return{x:o.x+(c-r)*tw/2,y:o.y+(c+r)*th/2}}
  function tileAt(x,y){
    const o=origin(),{tw,th}=dims(),dx=(x-o.x)/(tw/2),dy=(y-o.y)/(th/2);
    return {c:Math.round((dy+dx)/2),r:Math.round((dy-dx)/2)};
  }
  function polygon(points,fill,stroke=null,line=1){
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}
  }
  function tilePoly(x,y,tw,th,fill,stroke){polygon([[x,y-th/2],[x+tw/2,y],[x,y+th/2],[x-tw/2,y]],fill,stroke,.85)}
  const hexColor=(hex,alpha)=>{const n=parseInt(hex.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${alpha})`};
  function roundedRect(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
  function drawTile(c,r,t){
    const p=iso(c,r),{tw,th}=dims(),water=isWater(c,r),coast=c===2;
    const variation=((c*17+r*23)%7)/150;
    if(water){tilePoly(p.x,p.y,tw,th,`rgba(28,130,163,${.67+variation})`,'rgba(125,226,240,.12)');}
    else {const chosen=(c+r)%5===0;tilePoly(p.x,p.y,tw,th,coast?(chosen?'#c7b17b':'#c4b37f'):chosen?'#608f7c':'#568574','rgba(14,52,58,.33)');
      if(!occupied(c,r)&&c>3&&(c+r)%6===0){ctx.fillStyle='#7db49380';ctx.beginPath();ctx.arc(p.x,p.y+th*.07,1.8*camera.zoom,0,7);ctx.fill()}
    }
    if(hover?.c===c&&hover?.r===r){tilePoly(p.x,p.y,tw,th,canPlace(c,r)?'rgba(240,207,124,.34)':'rgba(232,104,94,.26)',canPlace(c,r)?'#f5ce81':'#f78c80');}
  }
  function prism(x,y,w,d,h,t){
    const hw=w/2,hd=d/2;
    const top=[[x,y-h-hd],[x+hw,y-h],[x,y-h+hd],[x-hw,y-h]];
    polygon([[x-hw,y-h],[x,y-h+hd],[x,y+hd],[x-hw,y]],t.side);
    polygon([[x,y-h+hd],[x+hw,y-h],[x+hw,y],[x,y+hd]],t.color);
    polygon(top,t.roof,'rgba(24,57,64,.48)',.7);
    ctx.fillStyle='rgba(20,51,62,.24)';ctx.fillRect(x-hw*.12,y-h*.60,hw*.17,h*.29);
    ctx.fillRect(x+hw*.19,y-h*.54,hw*.19,h*.24);
    return top;
  }
  function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
  function drawRoad(b,p){const{tw,th}=dims();
    tilePoly(p.x,p.y,tw*.88,th*.86,'#687981','#91a6a6');
    const hor=Boolean(occupied(b.c+1,b.r)?.type==='road'||occupied(b.c-1,b.r)?.type==='road');
    ctx.strokeStyle='#f4d293bb';ctx.lineWidth=2*camera.zoom;ctx.setLineDash([4*camera.zoom,5*camera.zoom]);ctx.beginPath();
    if(hor){ctx.moveTo(p.x-tw*.22,p.y-th*.22);ctx.lineTo(p.x+tw*.22,p.y+th*.22)}else{ctx.moveTo(p.x+tw*.22,p.y-th*.22);ctx.lineTo(p.x-tw*.22,p.y+th*.22)}
    ctx.stroke();ctx.setLineDash([]);
  }
  function drawPark(p){const z=camera.zoom,{tw,th}=dims();tilePoly(p.x,p.y,tw*.87,th*.87,'#458e70','#8bbe89');
    for(const [dx,dy,scale] of [[-tw*.14,-th*.06,1],[tw*.12,-th*.09,.87],[0,th*.20,.78]]){
      ctx.strokeStyle='#6e5b39';ctx.lineWidth=3*z;ctx.beginPath();ctx.moveTo(p.x+dx,p.y+dy);ctx.lineTo(p.x+dx,p.y+dy-11*z*scale);ctx.stroke();
      circle(p.x+dx,p.y+dy-14*z*scale,8*z*scale,'#295e48');circle(p.x+dx-2*z,p.y+dy-15*z*scale,6*z*scale,'#71c37b')
    }
  }
  function drawArtCanvas(commands,x,y,z){for(const o of commands){if(o.kind==='poly'){polygon(o.pts.map(([u,v])=>[x+u*z,y+v*z]),o.fill,o.stroke||null,.55*z);}else if(o.kind==='rect'){ctx.fillStyle=o.fill;ctx.fillRect(x+o.x*z,y+o.y*z,o.w*z,o.h*z);}else if(o.kind==='circle'){ctx.fillStyle=o.fill;ctx.beginPath();ctx.arc(x+o.x*z,y+o.y*z,o.rad*z,0,Math.PI*2);ctx.fill();}else{ctx.strokeStyle=o.stroke;ctx.lineWidth=o.width*z;ctx.beginPath();ctx.moveTo(x+o.x*z,y+o.y*z);ctx.lineTo(x+o.x2*z,y+o.y2*z);ctx.stroke();}}}
  function drawBuilding(b){const p=iso(b.c,b.r),t=TYPES[b.type],z=camera.zoom,{tw,th}=dims();
    if(b.job?.kind==='build'){drawConstruction(b,p);return;}
    const art=window.PCArt?.model(b.type,b.level);if(art&&b.type!=='road'){drawArtCanvas(art,p.x,p.y,z);if(b.level>1){ctx.font='bold '+(10*z)+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#f7dc9d';ctx.fillText(String(b.level),p.x,p.y+14*z);}if(b.job?.kind==='upgrade'){ctx.fillStyle='#244651';ctx.fillRect(p.x-16*z,p.y+7*z,32*z,4*z);ctx.fillStyle='#f3cc73';ctx.fillRect(p.x-16*z,p.y+7*z,32*z*(1-b.job.remaining/b.job.duration),4*z);}if(selectedBuilding===b.id){ctx.strokeStyle='#f5d079';ctx.lineWidth=2*z;ctx.beginPath();ctx.ellipse(p.x,p.y,tw*.49,th*.49,0,Math.PI*2);ctx.stroke();}return;}
    if(b.type==='road'||b.type==='park'){if(b.type==='road')drawRoad(b,p);else drawPark(p);if(b.level>1){ctx.font=`bold ${10*z}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#f7dc9d';ctx.fillText(String(b.level),p.x,p.y-9*z)}return}
    const h=(t.height+Math.min(Math.log2(b.level)*14,80))*z,w=tw*.65,d=th*.54;
    // footprint shadow
    ctx.save();ctx.globalAlpha=.22;tilePoly(p.x+3*z,p.y+3*z,tw*.9,th*.9,'#173f38');ctx.restore();
    const cx=p.x,cy=p.y-3*z;
    prism(cx,cy,w,d,h,t);
    if(b.type==='clinic'){
      ctx.fillStyle='#d95352';ctx.fillRect(cx-4.5*z,cy-h-6*z,9*z,3*z);ctx.fillRect(cx-1.5*z,cy-h-9*z,3*z,9*z);
    } else if(b.type==='water'){
      ctx.fillStyle='#a9eff6';roundedRect(cx-10*z,cy-h-18*z,20*z,14*z,5*z,'#78cad3');
      ctx.strokeStyle='#c8fbff';ctx.lineWidth=1*z;ctx.strokeRect(cx-8*z,cy-h-15*z,16*z,9*z);
    } else if(b.type==='power'){
      ctx.fillStyle='#ffe69a';ctx.beginPath();ctx.moveTo(cx-4*z,cy-h-20*z);ctx.lineTo(cx+4*z,cy-h-20*z);ctx.lineTo(cx+1*z,cy-h-9*z);ctx.lineTo(cx+8*z,cy-h-9*z);ctx.lineTo(cx-5*z,cy-h+3*z);ctx.lineTo(cx-2*z,cy-h-7*z);ctx.closePath();ctx.fill();
    } else if(b.type==='school'){
      ctx.fillStyle='#644a36';ctx.fillRect(cx-10*z,cy-h-6*z,20*z,4*z);ctx.fillStyle='#d6ebeb';ctx.fillRect(cx-8*z,cy-h-5*z,16*z,2*z)
    } else if(b.type==='depot'){
      ctx.strokeStyle='#94745b';ctx.lineWidth=2*z;for(let i=-1;i<2;i++){ctx.beginPath();ctx.moveTo(cx-11*z,cy-h+(i+1)*4*z);ctx.lineTo(cx+11*z,cy-h+(i+1)*4*z);ctx.stroke()}
    } else if(b.type==='market'){
      for(let i=-2;i<=2;i++){ctx.strokeStyle=i%2?'#f9dfc4':'#ca6961';ctx.lineWidth=3*z;ctx.beginPath();ctx.moveTo(cx+i*5*z,cy-h-5*z);ctx.lineTo(cx+i*5*z,cy-h+5*z);ctx.stroke()}
    } else if(b.type==='council'){
      ctx.fillStyle='#264f46';ctx.font=`bold ${15*z}px system-ui`;ctx.textAlign='center';ctx.fillText('◆',cx,cy-h-4*z);
    } else if(b.type==='port'||b.type==='airport'){
      ctx.fillStyle='#173d4d';ctx.font=`bold ${18*z}px system-ui`;ctx.textAlign='center';ctx.fillText(b.type==='port'?'⚓':'✈',cx,cy-h-4*z);
    } else if(b.type==='house'){
      polygon([[cx-w*.52,cy-h-d*.03],[cx,cy-h-d*.95],[cx+w*.52,cy-h-d*.03],[cx,cy-h+d*.65]],'#d57e64','#824f42',1*z);
      ctx.fillStyle='#ffe4a6';ctx.fillRect(cx-12*z,cy-h*.63,6*z,7*z);
    }
    if(b.level>1){ctx.fillStyle='#153b37';ctx.font=`bold ${9*z}px system-ui`;ctx.textAlign='center';const badgeWidth=Math.max(18, String(b.level).length*6+6)*z;roundedRect(cx-badgeWidth/2,cy-h-29*z,badgeWidth,13*z,5*z,'#173d4d');ctx.fillStyle='#f7dc9d';ctx.fillText(String(b.level),cx,cy-h-19*z)}
    if(selectedBuilding===b.id){ctx.strokeStyle='#f5d079';ctx.lineWidth=2*z;ctx.setLineDash([4*z,3*z]);ctx.beginPath();ctx.ellipse(p.x,p.y,tw*.49,th*.49,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
  }
  function drawConstruction(b,p){const {tw,th}=dims(),z=camera.zoom;tilePoly(p.x,p.y,tw*.88,th*.88,'#b9a484','#f4d08b');ctx.strokeStyle='#f4c262';ctx.lineWidth=2*z;ctx.beginPath();ctx.moveTo(p.x-12*z,p.y);ctx.lineTo(p.x-12*z,p.y-30*z);ctx.lineTo(p.x+16*z,p.y-30*z);ctx.lineTo(p.x+16*z,p.y-15*z);ctx.stroke();ctx.fillStyle='#e7c585';ctx.fillRect(p.x+7*z,p.y-16*z,12*z,6*z);ctx.fillStyle='#193945';ctx.fillRect(p.x-20*z,p.y+8*z,40*z,5*z);ctx.fillStyle='#e5bd65';ctx.fillRect(p.x-20*z,p.y+8*z,40*z*(1-b.job.remaining/b.job.duration),5*z);}
  let visualTick=0;
  function drawTraffic(){const roads=localBuildings().filter(b=>b.type==='road'&&!b.job);const z=camera.zoom;for(const b of roads.slice(0,45)){const neighbor=[[1,0],[0,1]].map(([dc,dr])=>occupied(b.c+dc,b.r+dr)).find(x=>x?.type==='road'&&!x.job);if(!neighbor)continue;const t=((visualTick*.045+b.id*.173)%1),p=iso(b.c+(neighbor.c-b.c)*t,b.r+(neighbor.r-b.r)*t);if(window.PCArt)drawArtCanvas(window.PCArt.vehicle(b.id),p.x,p.y,z);else{roundedRect(p.x-5*z,p.y-4*z,10*z,6*z,2*z,b.id%2?'#efd18b':'#9be1d6');ctx.fillStyle='#234954';ctx.fillRect(p.x-1*z,p.y-4*z,3*z,3*z);}}}
  function draw(){
    rafPending=false;
    if(window.PCPixi?.active && window.PCPixi.render({width:cw,height:ch,dpr,cols:COLS,rows:ROWS,zoom:camera.zoom,origin:origin(),buildings:localBuildings(),types:TYPES,water:(c,r)=>isWater(c,r),hover,selectedBuilding,selectedType,tick:visualTick,night:state.day%12>=9,canPlace:(c,r)=>canPlace(c,r)&&(!selectedType||canBuildType(selectedType,c,r))}))return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const bg=ctx.createLinearGradient(0,0,0,ch);bg.addColorStop(0,'#18445b');bg.addColorStop(.55,'#0f3b54');bg.addColorStop(1,'#0a293d');ctx.fillStyle=bg;ctx.fillRect(0,0,cw,ch);
    // ambient water ripples
    for(let i=0;i<14;i++){
      const x=((i*153+19+visualTick*.7)%Math.ceil(cw+1)),y=((i*91+37)%Math.ceil(ch+1));
      ctx.strokeStyle='rgba(119,214,229,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+10,y);ctx.stroke();
    }
    for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++)drawTile(col,row);
    for(const b of localBuildings().sort((a,b)=>(a.c+a.r)-(b.c+b.r)||(a.c-b.c)))drawBuilding(b);
    drawTraffic();
    const night=(state.day%12>=9);if(night){ctx.fillStyle='rgba(13,25,72,.20)';ctx.fillRect(0,0,cw,ch);}
    ctx.fillStyle='rgba(238,249,255,.55)';ctx.textAlign='center';ctx.font=`${10*camera.zoom}px system-ui`;
    for(const [c,r] of [[2,1],[3,3],[11,8]]){const p=iso(c,r);ctx.fillText(c<3?'البحر':'منطقة تطوير',p.x,p.y+9*camera.zoom)}
    ctx.setTransform(1,0,0,1,0,0);
  }
  function invalidate(){if(rafPending)return;rafPending=true;requestAnimationFrame(draw)}
  const canvasPos=e=>{const rect=canvas.getBoundingClientRect();return{x:e.clientX-rect.left,y:e.clientY-rect.top}};
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    canvas.setPointerCapture(e.pointerId);const p=canvasPos(e);pointers.set(e.pointerId,p);
    if(pointers.size===1)gesture={id:e.pointerId,start:p,last:p,moved:false};
    if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={pinch:true,dist:Math.hypot(a.x-b.x,a.y-b.y),zoom:camera.zoom}}
  });
  canvas.addEventListener('pointermove',e=>{
    const p=canvasPos(e);
    if(pointers.has(e.pointerId)){
      pointers.set(e.pointerId,p);
      if(pointers.size>=2){const [a,b]=[...pointers.values()];if(gesture?.pinch){camera.zoom=clamp(gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.dist),.48,1.7);invalidate()}return}
      if(gesture&&!gesture.pinch){const dx=p.x-gesture.last.x,dy=p.y-gesture.last.y;
        if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>7)gesture.moved=true;
        if(gesture.moved){camera.panX+=dx;camera.panY+=dy;invalidate()}
        gesture.last=p;
      }
    } else {const t=tileAt(p.x,p.y);const h=valid(t.c,t.r)?t:null;if(h?.c!==hover?.c||h?.r!==hover?.r){hover=h;invalidate()}}
  });
  const endPointer=e=>{
    const was=pointers.has(e.pointerId),p=canvasPos(e);
    if(was&&pointers.size===1&&gesture&&!gesture.pinch&&!gesture.moved){const tile=tileAt(p.x,p.y);
      if(valid(tile.c,tile.r)){
        if(selectedType)place(tile.c,tile.r);
        else {const b=occupied(tile.c,tile.r);selectedBuilding=b?.id||null;updateUi()}
      }
    }
    pointers.delete(e.pointerId);gesture=null;
  };
  canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null});
  canvas.addEventListener('pointerleave',()=>{if(!pointers.size){hover=null;invalidate()}});
  canvas.addEventListener('wheel',e=>{e.preventDefault();camera.zoom=clamp(camera.zoom*(e.deltaY<0?1.08:.92),.48,1.7);invalidate()},{passive:false});
  $('zoom-in').addEventListener('click',()=>{camera.zoom=clamp(camera.zoom*1.16,.48,1.7);invalidate()});
  $('zoom-out').addEventListener('click',()=>{camera.zoom=clamp(camera.zoom/1.16,.48,1.7);invalidate()});
  $('pause-game').addEventListener('click',()=>{manualPaused=!manualPaused;$('pause-game').innerHTML=icon(manualPaused?'play':'pause',20);$('pause-game').setAttribute('aria-label',manualPaused?'استئناف الوقت':'إيقاف الوقت مؤقتًا');$('pause-game').setAttribute('aria-pressed',String(manualPaused));$('pause-game').title=manualPaused?'استئناف الوقت':'إيقاف الوقت مؤقتًا';$('pause-game').classList.toggle('is-paused',manualPaused);toast(manualPaused?'تم إيقاف الزمن مؤقتًا':'استؤنف زمن اللعبة')});
  $('mobile-build-jump').addEventListener('click',()=>document.querySelector('.build-panel')?.scrollIntoView({behavior:'smooth',block:'start'}));
  $('reset-camera').addEventListener('click',()=>{camera.panX=0;camera.panY=0;camera.zoom=cw<550?.72:cw<870?.94:1.03;invalidate();toast('عادت الكاميرا إلى منتصف الخريطة')});
  $('research-list').addEventListener('click',e=>{const key=e.target.closest('[data-research]')?.dataset.research;if(!Object.hasOwn(SCHOOLS,key)||state.research[key]>=LIMIT)return;const cost=researchCost(key);if(state.coins<cost.coins||state.materials<cost.materials)return;state.coins-=cost.coins;state.materials-=cost.materials;state.research[key]++;state.actions=safeInt(state.actions+1);state.xp=safeInt(state.xp+40);save();updateUi();toast('✓ تم تطوير المدرسة '+SCHOOLS[key].name)});
  $('build-list').addEventListener('click',e=>{const el=e.target.closest('[data-build]');if(el)chooseBuild(el.dataset.build)});
  $('cancel-build').addEventListener('click',()=>{selectedType=null;updateUi()});
  function switchRegion(region,district=null){if(!Number.isInteger(region)||!LABELS[region])return;state.region=region;state.district=district?.id||null;selectedType=null;selectedBuilding=null;hover=null;camera.panX=camera.panY=0;if(district){const p=iso(...district.tile);camera.panX=cw/2-p.x;camera.panY=ch/2-p.y;}save();updateUi();toast('أنت الآن في '+(district?.name||LABELS[region].name))}
  function investRoute(id){const route=network.ROUTES.find(r=>r.id===id);if(!route)return false;const level=state.links[id],cost=network.cost(route,level);if(level>=LIMIT||state.coins<cost.coins||state.materials<cost.materials)return false;state.coins-=cost.coins;state.materials-=cost.materials;state.links[id]++;state.actions=safeInt(state.actions+1);state.xp=safeInt(state.xp+25);save();updateUi();toast('✓ تم تطوير '+route.name);return true;}
  function selectDistrict(id){const p=network.PLACES.find(x=>x.id===id);if(p)switchRegion(p.region,p);}
  $('transport-list').addEventListener('click',e=>{const id=e.target.closest('[data-route]')?.dataset.route;if(id)investRoute(id)});
  $('district-list').addEventListener('click',e=>{const id=e.target.closest('[data-district]')?.dataset.district;if(id)selectDistrict(id)});
  window.addEventListener('pc-district',e=>selectDistrict(e.detail));
  window.addEventListener('pc-region',e=>switchRegion(e.detail));
  $('regions').addEventListener('click',e=>{const el=e.target.closest('[data-region]');if(!el)return;const region=Number(el.dataset.region);if(!Number.isInteger(region)||!LABELS[region])return;switchRegion(region);});
  $('mission-card').addEventListener('click',e=>{if(e.target.closest('#claim-mission'))completeMission()});
  $('selection-info').addEventListener('click',e=>{if(e.target.closest('#upgrade-building'))upgrade();else if(e.target.closest('#demolish-building'))demolish();else if(e.target.closest('#close-selection')){selectedBuilding=null;updateUi()}});
  $('save-button').addEventListener('click',()=>{const ok=save();toast(ok?'✓ تم حفظ التقدم على هذا الجهاز.':'تعذّر الحفظ، استخدم تصدير الحفظ.',!ok)});
  $('new-game').addEventListener('click',()=>showModal('بدء لعبة جديدة؟','<p>ستعود إلى اليوم الأول مع الموارد الأولية. سيتم استبدال الحفظ الحالي الموجود على هذا الجهاز. يمكنك تصديره أولًا للاحتفاظ بنسخة.</p>',[
    {label:'بدء من جديد',primary:true,action:()=>{state=fresh();state.introDone=true;selectedType=null;selectedBuilding=null;camera.panX=camera.panY=0;save();updateUi();toast('بدأت رحلة إعمار جديدة!')}},
    {label:'إلغاء'}
  ]));
  $('help-btn').addEventListener('click',()=>showModal('كيف تلعب مجلس السلام؟',`<p>أنت المسؤول عن تطوير مدينة تجريبية ضمن قطاع غزة. ابدأ بتلبية احتياجات السكان وتطوير الخدمات.</p><ul><li>اختر منشأة من قائمة «ابنِ مدينتك»، ثم اضغط على مربع فارغ داخل الأرض الخضراء.</li><li>اسحب الخريطة بإصبعك، وكبّر بإصبعين أو أزرار (+/−).</li><li>اضغط على أي مبنى لرؤية مستوى تطويره وترقيته أو إزالته.</li><li>كل 25 ثانية يمر يوم جديد وتصل الإيرادات وتتقدم الإنشاءات. لديك فريقان هندسيان ويزيد العدد بترقية المقر.</li><li>أنجز المهام لتحصل على موارد ونقاط خبرة ومكافآت.</li><li>التقدم يُحفظ محليًا في المتصفح؛ صدّر ملف الحفظ للاحتفاظ بنسخة.</li></ul><p><small>هذه خريطة فنية تخطيطية وليست تمثيلًا جغرافيًا أو إحصائيًا دقيقًا لغزة.</small></p>`,[{label:'فهمت، لنبدأ!',primary:true}]));
  $('sound-btn').addEventListener('click',()=>{soundOn=!soundOn;$('sound-btn').innerHTML=icon(soundOn?'music':'mute',20);$('sound-btn').setAttribute('aria-label',soundOn?'إيقاف الصوت':'تشغيل الصوت');if(soundOn)playSound();toast(soundOn?'تم تشغيل المؤثرات الصوتية':'تم كتم المؤثرات الصوتية')});
  $('export-button').addEventListener('click',()=>{
    try{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`peace-council-day-${state.day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('✓ تم تصدير ملف الحفظ')}catch(e){toast('تعذّر تصدير الحفظ.',true)}
  });
  $('import-button').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>250000){toast('ملف الحفظ كبير جدًا.',true);e.target.value='';return}
    try{const read=validated(JSON.parse(await file.text()));if(!read)throw Error('invalid save');
      showModal('استيراد التقدم',`<p>وجدت ملف حفظ لليوم <b>${fmt(read.day)}</b>. سيستبدل هذا الملف تقدم اللعبة الحالي على هذا الجهاز.</p>`,[
        {label:'استيراد الآن',primary:true,action:()=>{state=read;selectedType=null;selectedBuilding=null;save();updateUi();toast('✓ تم استيراد الحفظ بنجاح')}},
        {label:'إلغاء'}
      ]);
    }catch(err){toast('هذا الملف ليس ملف حفظ صالحًا لهذه النسخة.',true)}
    e.target.value='';
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){$('modal-host').hidden=true;$('modal-host').innerHTML='';selectedType=null;selectedBuilding=null;updateUi()}
    if(e.key==='+'||e.key==='='){camera.zoom=clamp(camera.zoom*1.13,.48,1.7);invalidate()}
    if(e.key==='-'){camera.zoom=clamp(camera.zoom/1.13,.48,1.7);invalidate()}
  });
  const ro=typeof ResizeObserver==='function'?new ResizeObserver(viewport):null;
  ro?.observe($('canvas-wrap'));window.addEventListener('resize',viewport);
  $('sound-btn').innerHTML=icon('mute',20);
  viewport();updateUi();
  window.PCPixi?.start(canvas,invalidate);
  dayTimer=setInterval(nextDay,DAY_MS);
  if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)setInterval(()=>{if(!document.hidden&&!manualPaused){visualTick++;invalidate()}},100);
  if(!state.introDone){
    showModal('أهلًا بك في مجلس السلام 🌍',`<p>هنا تبدأ رحلتك في <b>إعادة بناء قطاع غزة انطلاقًا من مدينة غزة</b>؛ أعد تشغيل الخدمات وساعد السكان على بناء مستقبل أفضل.</p><ul><li>تبدأ في مقر مجلس السلام بمدينة غزة بميزانية <b>4,800</b> ووحدات مواد بناء <b>85</b>.</li><li>ابنِ <b>مركزًا صحيًا</b> لإنجاز أول مهمة.</li><li>اهتم بالمياه والطاقة والتعليم والاقتصاد، وليس بعدد المباني فقط.</li></ul><p><small>هذه نسخة MVP ذات خريطة تخطيطية. بيانات السكان والتكاليف افتراضية لأغراض اللعب.</small></p>`,[
      {label:'ابدأ رحلة الإعمار',primary:true,action:()=>{state.introDone=true;save();updateUi();toast('اختر «مركز صحي» وابدأ مهمتك الأولى!')}},
      {label:'لاحقًا',action:()=>{state.introDone=true;save()}}
    ]);
  }
  if('serviceWorker' in navigator&&location.protocol==='https:'){
    window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').catch(()=>{}));
  }
})();