/* HealthMood dashboard preview — deterministic synthetic data, no patient records. */
(function(){
"use strict";
const profiles={
  general:{name:"المتابعة العامة",description:"ملخص للأدوية والنشاط والنوم والقياسات دون أي حكم طبي",focus:"القياسات اليومية",icon:"heart-pulse"},
  bp:{name:"متابعة ضغط الدم",description:"عرض قياسات الضغط وملخص المتابعة، مع الرجوع إلى خطة الطبيب",focus:"قياسات ضغط الدم",icon:"heart-pulse"},
  diabetes:{name:"متابعة السكري",description:"التركيز على سجل الفحوصات ومراجعة خطة الأدوية مع الطبيب",focus:"الفحوصات ومراجعة الأدوية",icon:"flask"},
  epilepsy:{name:"متابعة الصرع",description:"جدول مراجعة الأدوية وتقارير النوبات؛ التوثيق لا يثبت تناول الجرعات",focus:"سجل النوبات ومراجعة العلاج",icon:"clipboard"},
  behcet:{name:"متابعة مرض بهجت",description:"سجلات المراجعات والنوبات والفحوصات الدورية كأمثلة تعليمية",focus:"التقارير والفحوصات",icon:"clipboard"}
};
const metrics=[
 {key:"pulse",label:"نبض القلب",unit:"نبضة/دقيقة",short:"نبض",ico:"heart-pulse"},
 {key:"steps",label:"الخطوات",unit:"خطوة",short:"خطوات",ico:"home"},
 {key:"sleep",label:"النوم",unit:"ساعة",short:"نوم",ico:"star"},
 {key:"bp",label:"ضغط الدم",unit:"ملم زئبق",short:"ضغط",ico:"heart-pulse"}
];
const weekdays=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function num(n){return Number(n).toLocaleString("ar");}
function shortDate(d){return d.toLocaleDateString("ar", {day:"numeric",month:"short"});}
function isoDay(d){const x=new Date(d);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,"0"),String(x.getDate()).padStart(2,"0")].join("-");}
function shiftDate(days){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return d;}
function demoValue(key,offset){
 const t=offset+44;
 if(key==="pulse")return Math.round(73+Math.sin(t*0.62)*5+Math.cos(t*0.17)*3);
 if(key==="steps")return Math.max(1700,Math.round(5950+Math.sin(t*0.77)*1670+Math.cos(t*0.24)*925));
 if(key==="sleep")return Math.round((7.05+Math.sin(t*.52)*.65+Math.cos(t*.25)*.35)*10)/10;
 if(key==="bp")return [Math.round(117+Math.sin(t*.35)*6+Math.cos(t*.19)*3),Math.round(76+Math.cos(t*.40)*4+Math.sin(t*.13)*2)];
 return 0;
}
function valText(key,value){
 if(key==="bp")return value.join("/");
 if(key==="steps")return num(value);
 if(key==="sleep")return String(value.toFixed(1));
 return String(value);
}
function stateOf(st){if(!st.hm)st.hm={profile:"general",metric:"pulse",range:7,heat:"meds",selectedDay:null,weekly:{},reportOpen:null};return st.hm;}
function chartSvg(key,range){
 const w=760,h=236,pad={x:24,y:22,b:30}, count=range;
 const data=Array.from({length:count},(_,i)=>demoValue(key,i-(count-1)));
 const chartVals=key==="bp"?data.flat():data;
 const yMin=Math.min(...chartVals),yMax=Math.max(...chartVals);
 const bottom=h-pad.b,top=pad.y,scale=Math.max(1,yMax-yMin),max=yMax+scale*.16,min=yMin-scale*.16;
 const xAt=i=>pad.x+(w-pad.x*2)*i/Math.max(1,count-1);
 const yAt=v=>top+(max-v)/(max-min)*(bottom-top);
 const ticks=Array.from({length:4},(_,i)=>{const y=top+i*(bottom-top)/3;return '<line x1="'+pad.x+'" y1="'+y+'" x2="'+(w-pad.x)+'" y2="'+y+'" stroke="#e2eef1" stroke-dasharray="4 7"/>';}).join("");
 const labels=[0,Math.floor((count-1)/2),count-1].map(i=>'<text x="'+xAt(i)+'" y="'+(h-7)+'" font-size="12" fill="#7892a0" text-anchor="middle">'+esc(shortDate(shiftDate(i-(count-1))))+'</text>').join("");
 const points=arr=>arr.map((v,i)=>xAt(i).toFixed(1)+","+yAt(v).toFixed(1)).join(" ");
 const first=key==="bp"?data.map(v=>v[0]):data;
 const second=key==="bp"?data.map(v=>v[1]):null;
 let svg;
 if(key==="steps"){
  const barW=Math.min(38,(w-pad.x*2)/count*.6);
  svg=first.map((v,i)=>'<rect x="'+(xAt(i)-barW/2).toFixed(1)+'" y="'+yAt(v).toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+(bottom-yAt(v)).toFixed(1)+'" rx="7" fill="#17ac9b" opacity="'+(i===count-1?1:.58)+'"><title>'+esc(shortDate(shiftDate(i-(count-1))))+": "+v+" خطوة</title></rect>").join("");
 }else{
  svg='<polyline points="'+points(first)+'" fill="none" stroke="#0a99a2" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
  if(second)svg+='<polyline points="'+points(second)+'" fill="none" stroke="#8b7ed1" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
  svg+=first.map((v,i)=>'<circle cx="'+xAt(i).toFixed(1)+'" cy="'+yAt(v).toFixed(1)+'" r="'+(i===count-1?6:3)+'" fill="#0a99a2"><title>'+esc(shortDate(shiftDate(i-(count-1))))+": "+v+"</title></circle>").join("");
 }
 const last=valText(key,data[data.length-1]),firstValue=valText(key,data[0]);
 const alt=esc(key==="bp"?"رسم توضيحي لقياسات ضغط الدم الانقباضي والانبساطي": "رسم توضيحي لتغير "+metrics.find(x=>x.key===key).label)+" خلال "+range+" يومًا: من "+firstValue+" إلى "+last;
 return '<svg class="hm-chart-svg" role="img" aria-label="'+alt+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+" "+h+'" preserveAspectRatio="none">'+ticks+svg+labels+'</svg>';
}
function heatLevels(kind,st){
 return Array.from({length:84},(_,i)=>{
  const rand=(i*17+(kind==="reports"?7:kind==="wellness"?11:3))%13;
  const level=rand===0?0:rand>9?1:rand>5?2:3;
  return level;
 });
}
function heatmap(st,icon){
 const hm=stateOf(st),modes=[["meds","مراجعة الأدوية"],["reports","التقارير"],["wellness","الأنشطة الصحية"]];
 const date=hm.selectedDay?new Date(hm.selectedDay+"T12:00:00"):null;
 const levels=heatLevels(hm.heat,st);
 const cells=levels.map((level,i)=>{
  const offset=i-83,d=shiftDate(offset),key=isoDay(d);
  const overridden=hm.heat==="meds"&&Object.hasOwn(hm.weekly,key);
  const lvl=overridden?(hm.weekly[key]?3:0):level;
  const aria=esc(shortDate(d)+": "+(overridden?(hm.weekly[key]?"تم تسجيل مراجعة الجدول":"لا توجد مراجعة مسجلة"):"نشاط توضيحي المستوى "+lvl));
  const selected=hm.selectedDay===key;
  return '<button type="button" class="hm-heat-cell hm-heat-'+lvl+(selected?" chosen":"")+'" data-heat-date="'+key+'" title="'+aria+'" aria-label="'+aria+'" aria-pressed="'+selected+'"></button>';
 }).join("");
 const dates = ["قبل 12 أسبوعًا", "الآن"];
 return '<section class="hm-card hm-heat-panel"><div class="hm-panel-head"><div><span class="hm-eyebrow">Activity calendar · مثال تفاعلي</span><h2>تقويم المتابعة اليومية</h2><p>مربعات بأسلوب GitHub لعرض انتظام تسجيل المتابعة، وليس الالتزام الطبي أو النتائج الصحية.</p></div><span class="hm-mini-icon">'+icon("calendar")+'</span></div>'+
  '<div class="hm-switches" role="group" aria-label="نوع سجل النشاط">'+modes.map(m=>'<button type="button" class="'+(hm.heat===m[0]?"selected":"")+'" data-heat-kind="'+m[0]+'" aria-pressed="'+(hm.heat===m[0])+'">'+m[1]+'</button>').join("")+'</div>'+
  '<div class="hm-heat-scroll"><div class="hm-heat-grid" role="group" aria-label="تقويم 12 أسبوعًا">'+cells+'</div></div>'+
  '<div class="hm-heat-foot"><span>'+dates[0]+'</span><span class="hm-heat-legend">نشاط أقل <i class="hm-heat-0"></i><i class="hm-heat-1"></i><i class="hm-heat-2"></i><i class="hm-heat-3"></i> نشاط أكثر</span><span>'+dates[1]+'</span></div>'+
  '<p class="hm-selected-day" aria-live="polite">'+(date?"التاريخ المختار: "+esc(shortDate(date))+" — جميع الخانات تجريبية وغير مرتبطة بسجل مريض.":"اضغط أي مربع لاستعراض تاريخه.")+'</p></section>';
}
function weekly(st,icon){
 const hm=stateOf(st);
 const days=Array.from({length:7},(_,i)=>shiftDate(i-6));
 return '<section class="hm-card hm-week"><div class="hm-panel-head"><div><span class="hm-eyebrow">Medication review · عرض تجريبي</span><h2>جدول مراجعة الأدوية</h2><p>التوثيق لا يؤكد تناول جرعة، ولا يؤثر في نقاطك أو مستواك.</p></div><button class="hm-text-link" data-health-open="meds">'+icon("pill")+' صفحة الأدوية</button></div>'+
  '<div class="hm-week-grid">'+days.map(d=>{const key=isoDay(d),checked=hm.weekly[key]===true,unset=!Object.hasOwn(hm.weekly,key);return '<button type="button" class="hm-day'+(checked?" complete":"")+'" data-week-day="'+key+'" aria-label="'+esc("تسجيل مراجعة جدول الأدوية "+weekdays[d.getDay()])+'" aria-pressed="'+checked+'"><span>'+weekdays[d.getDay()].slice(0,3)+'</span><strong>'+d.getDate()+'</strong><small>'+(checked?icon("check"):(unset?"—":"·"))+'</small></button>';}).join("")+'</div>'+
  '<p class="hm-small-note">اضغط على اليوم لتسجيل أنك راجعت جدول الأدوية في النموذج التجريبي. لن تُحفظ هذه البيانات.</p></section>';
}
function reports(st,icon){
 const hm=stateOf(st);
 const rows=[
  ["فحص الدم الدوري","مثال فقط • لا يوجد تقرير مرفوع", "flask"],
  ["مراجعة قياسات الضغط","مثال فقط • مصدر القياس غير متصل", "heart-pulse"],
  ["مراجعة طبية","مثال فقط • لا يوجد حجز حقيقي", "calendar"]
 ];
 return '<section class="hm-card hm-reports"><div class="hm-panel-head"><div><span class="hm-eyebrow">Reports · ملف تجريبي</span><h2>متابعة التقارير والفحوصات</h2><p>قائمة توضيحية لتصميم السجل الطبي المستقبلي.</p></div><button class="hm-text-link" data-health-open="tests">'+icon("flask")+' الفحوصات</button></div>'+
  '<div class="hm-report-list">'+rows.map((r,i)=>'<button type="button" data-report="'+i+'" class="hm-report-row" aria-expanded="'+(hm.reportOpen===i)+'"><span class="hm-report-icon">'+icon(r[2])+'</span><span class="hm-report-copy"><b>'+r[0]+'</b><small>'+r[1]+'</small></span><span class="hm-report-status">تجريبي</span></button>'+(hm.reportOpen===i?'<p class="hm-report-detail">لا يوجد ملف طبي حقيقي ولا إمكانية رفع تقارير في هذه النسخة. لاحقًا سيظهر تاريخ الفحص، جهة الإصدار، وموافقة المريض على مشاركة النتائج.</p>':"")).join("")+'</div></section>';
}
function device(st,icon){
 return '<section class="hm-card hm-device"><div class="hm-panel-head"><div><span class="hm-eyebrow">Wearables · الربط المستقبلي</span><h2>الساعة الذكية والصحة العامة</h2><p>النبض، الخطوات، النوم، والضغط بحسب البيانات التي يسجلها الجهاز فعلًا.</p></div><span class="hm-mini-icon">'+icon("heart-pulse")+'</span></div>'+
 '<div class="hm-device-grid">'+[
  ["نبض القلب","heart-pulse"],["الخطوات","home"],["النوم","star"],["ضغط الدم","clipboard"]
 ].map(r=>'<div class="hm-device-tile"><span>'+icon(r[1])+'</span><b>'+r[0]+'</b><small>غير متصل</small></div>').join("")+'</div>'+
 '<button type="button" class="hm-connect" data-wearable-info="1">'+icon("heart-pulse")+' كيف نربط ساعتي؟</button>'+
 '<p class="hm-small-note">لا توجد مزامنة فعلية. قياس الضغط يتطلب جهازًا يدعمه ويمكنه توفير القراءة؛ لا يمكن استنتاج الضغط بدقة من أي ساعة.</p></section>';
}
function render(st,icon){
 const hm=stateOf(st),prof=profiles[hm.profile]||profiles.general;
 const m=metrics.find(x=>x.key===hm.metric)||metrics[0];
 const period=hm.range===30?30:7;
 const latest=demoValue(m.key,0);
 const lastStats=[["pulse","نبض القلب","heart-pulse"],["steps","الخطوات","home"],["sleep","النوم","star"],["bp","الضغط","clipboard"]];
 const tip=(key)=>key==="pulse"?"نبضة/دقيقة":key==="steps"?"خطوة":key==="sleep"?"ساعة":"ملم زئبق";
 return '<div class="hm-dashboard">'+
  '<div class="hm-dashboard-intro"><div><span class="hm-eyebrow">HealthMood • لوحة صحية شخصية — عرض توضيحي</span><h1>صحتك في صورة أوضح <span aria-hidden="true">✦</span></h1><p>متابعة منظمة للقياسات اليومية والأدوية والتقارير. البيانات التالية أمثلة مصطنعة، وليست قراءات لشخص أو ساعة.</p></div>'+
  '<div class="hm-profile-box"><label for="hm-profile">نموذج الحالة الصحية</label><select id="hm-profile" aria-label="اختر نموذجًا صحيًا تجريبيًا">'+Object.entries(profiles).map(([key,v])=>'<option value="'+key+'"'+(hm.profile===key?" selected":"")+'>'+v.name+'</option>').join("")+'</select></div></div>'+
  '<div class="hm-intro-badge">'+icon(prof.icon)+' <b>'+esc(prof.name)+'</b><span>'+esc(prof.description)+'</span></div>'+
  '<div class="hm-vitals">'+lastStats.map(([key,label,ic])=>{const value=demoValue(key,0);return '<button type="button" class="hm-vital '+(hm.metric===key?"selected":"")+'" data-health-metric="'+key+'" aria-pressed="'+(hm.metric===key)+'"><span class="hm-vital-icon">'+icon(ic)+'</span><span class="hm-vital-label">'+label+'</span><b>'+valText(key,value)+'</b><small>'+tip(key)+' · بيانات تجريبية</small></button>';}).join("")+'</div>'+
  '<div class="hm-main-grid"><section class="hm-card hm-main-chart"><div class="hm-panel-head"><div><span class="hm-eyebrow">Health trends · بيانات مصطنعة</span><h2>الرسوم البيانية للقياسات</h2><p>اختر المؤشر والفترة؛ لا تُستخدم القيم للتشخيص أو تعديل العلاج.</p></div><span class="hm-mini-icon">'+icon("heart-pulse")+'</span></div>'+
   '<div class="hm-chart-tools"><div class="hm-switches" role="group" aria-label="نوع القياس">'+metrics.map(x=>'<button type="button" data-health-metric="'+x.key+'" aria-pressed="'+(hm.metric===x.key)+'" class="'+(hm.metric===x.key?"selected":"")+'">'+x.short+'</button>').join("")+'</div><div class="hm-switches hm-range" role="group" aria-label="الفترة"><button type="button" data-health-range="7" class="'+(period===7?"selected":"")+'">7 أيام</button><button type="button" data-health-range="30" class="'+(period===30?"selected":"")+'">30 يومًا</button></div></div>'+
   '<div class="hm-chart-info"><div><small>'+esc(m.label)+' — آخر قيمة توضيحية</small><strong>'+valText(m.key,latest)+' <em>'+esc(m.unit)+'</em></strong></div><span class="hm-data-tag">مصدر البيانات: محاكاة</span></div>'+
   '<div class="hm-chart-canvas">'+chartSvg(m.key,period)+'</div>'+(m.key==="bp"?'<div class="hm-chart-legend"><span><i class="sys"></i> انقباضي</span><span><i class="dia"></i> انبساطي</span></div>':"")+'</section>'+
   '<section class="hm-card hm-condition"><div class="hm-panel-head"><div><span class="hm-eyebrow">Care context · مثال</span><h2>متابعة بحسب الحالة</h2><p>تبدّل لوحة المتابعة بحسب احتياجات المريض بعد ضبط ملفه وموافقته.</p></div></div><div class="hm-condition-highlight"><span class="hm-condition-icon">'+icon(prof.icon)+'</span><div><small>نموذج المتابعة المختار</small><b>'+esc(prof.name)+'</b></div></div><div class="hm-condition-items">'+[["المجال الرئيسي",prof.focus],["مصدر البيانات","غير متصل • قراءات مثال"],["مشاركة الطبيب","غير مفعلة • تتطلب موافقة المريض"]].map(x=>'<div><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>').join("")+'</div>'+(hm.profile==="epilepsy"?'<a class="hm-context-link" href="/booklets/epilepsy.html">قراءة كتيّب الصرع ←</a>':hm.profile==="behcet"?'<a class="hm-context-link" href="/booklets/behcet.html">قراءة كتيّب مرض بهجت ←</a>':'<a class="hm-context-link" href="/library.html">المكتبة الطبية ←</a>')+'</section></div>'+
  '<div class="hm-tracking-grid">'+heatmap(st,icon)+weekly(st,icon)+'</div>'+
  '<div class="hm-tracking-grid">'+reports(st,icon)+device(st,icon)+'</div>'+
  '<div class="hm-soft-warning">'+icon("shield")+' <div><b>مهم: لوحة تجريبية لا تحتوي بيانات مرضى.</b> لا تحفظ هذه الصفحة القياسات أو مراجعات الأدوية أو ملفات المرضى. الربط بالأجهزة ومشاركة التقارير غير مفعّلين إلى حين بناء الحسابات والموافقات وحماية البيانات.</div></div>'+
  '<div class="hm-home-library"><span>'+icon("book-open")+'</span><div><b>المكتبة الطبية</b><small>500 موضوع في الفهرس، وكتيبا الصرع وبهجت متاحان للقراءة الأولية.</small></div><a href="/library.html">استكشف المكتبة ←</a></div></div>';
}
function bind(root,st,renderApp,go){
 const hm=stateOf(st);
 const selector=root.querySelector("#hm-profile");
 if(selector)selector.onchange=()=>{hm.profile=selector.value;renderApp()};
 root.querySelectorAll("[data-health-metric]").forEach(b=>b.onclick=()=>{hm.metric=b.dataset.healthMetric;renderApp()});
 root.querySelectorAll("[data-health-range]").forEach(b=>b.onclick=()=>{hm.range=Number(b.dataset.healthRange);renderApp()});
 root.querySelectorAll("[data-heat-kind]").forEach(b=>b.onclick=()=>{hm.heat=b.dataset.heatKind;hm.selectedDay=null;renderApp()});
 root.querySelectorAll("[data-heat-date]").forEach(b=>b.onclick=()=>{hm.selectedDay=b.dataset.heatDate;renderApp()});
 root.querySelectorAll("[data-week-day]").forEach(b=>b.onclick=()=>{const day=b.dataset.weekDay;hm.weekly[day]=!hm.weekly[day];hm.heat="meds";hm.selectedDay=day;renderApp()});
 root.querySelectorAll("[data-health-open]").forEach(b=>b.onclick=()=>go(b.dataset.healthOpen));
 root.querySelectorAll("[data-report]").forEach(b=>b.onclick=()=>{hm.reportOpen=hm.reportOpen===Number(b.dataset.report)?null:Number(b.dataset.report);renderApp()});
 const deviceBtn=root.querySelector("[data-wearable-info]");
 if(deviceBtn)deviceBtn.onclick=()=>{
  if(root.querySelector(".hm-wear-overlay"))return;
  const div=document.createElement("div");div.className="hm-wear-overlay";
  div.innerHTML='<section class="hm-wear-modal" role="dialog" aria-modal="true" aria-labelledby="hm-wear-title" tabindex="-1"><button class="hm-modal-close" type="button" aria-label="إغلاق">×</button><span class="hm-eyebrow">Wearables · الطريق إلى الربط الحقيقي</span><h2 id="hm-wear-title">كيف أربط الساعة بتطبيق HealthMood؟</h2><p>هذه نسخة ويب تجريبية، ولا يمكنها حاليًا قراءة بيانات الساعة. الربط الحقيقي يحتاج تطبيق هاتف وصلاحيات اختيارية.</p><div class="hm-wear-steps"><div><b>Android</b><span>التكامل مع Health Connect بعد بناء تطبيق Android، وبموافقة المستخدم على أنواع البيانات.</span></div><div><b>iPhone / Apple Watch</b><span>استخدام HealthKit داخل تطبيق iOS مع أذونات القراءة.</span></div><div><b>أجهزة أخرى</b><span>Garmin وFitbit حسب واجهات الربط وموافقة المستخدم.</span></div><div><b>ضغط الدم</b><span>فقط إذا كان الجهاز أو التطبيق يوفّر قياسات ضغط فعلية موثوقة؛ لا تُقدَّر من النبض.</span></div></div><p class="hm-wear-small">عند التنفيذ سنعرض اسم مصدر القراءة، آخر مزامنة، وإمكانية إلغاء الوصول وحذف البيانات.</p><button class="hm-modal-done" type="button">فهمت</button></section>';
  root.appendChild(div);
  const close=()=>{div.remove();document.removeEventListener("keydown",onEsc)};
  const onEsc=e=>{if(e.key==="Escape")close()};
  document.addEventListener("keydown",onEsc);
  div.addEventListener("click",e=>{if(e.target===div||e.target.closest(".hm-modal-close")||e.target.closest(".hm-modal-done"))close()});
  div.querySelector(".hm-wear-modal").focus();
 };
}
window.HealthMoodDashboard={render,bind};
})();