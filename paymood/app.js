/* PayMood preview — intentionally no financial backend, actual transfers, or simulated approvals. */
"use strict";
const STORAGE_KEY = "paymood.preview.drafts.v1";
const THEME_KEY = "paymood.preview.theme.v1";
const views = { overview:"نظرة عامة",payments:"طلبات الدفع",methods:"وسائل الدفع",reports:"التقارير",integrations:"تكامل المنتجات",settings:"الإعدادات" };
const products = ["StoreMood","MentorMood","GrowthMood","CodeMood","HealthMood","Capital Market","منتج آخر"];
const state = {view:"overview",drafts:loadDrafts(),filter:"all",query:""};
const main = document.getElementById("main");
const dialog = document.getElementById("request-dialog");
const toast = document.getElementById("toast");
const icon = (name)=>'<svg class="ico" aria-hidden="true"><use href="#i-'+name+'"></use></svg>';
const esc = (s)=>String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number = n=> new Intl.NumberFormat("ar-PS").format(n);
const date = v => {try{return new Intl.DateTimeFormat("ar-PS",{dateStyle:"medium"}).format(new Date(v))}catch{return "—"}};
const amount=(n,c)=>{try{return new Intl.NumberFormat("en-US",{style:"currency",currency:c||"ILS",minimumFractionDigits:2,maximumFractionDigits:2}).format(n)}catch{return "—"}};
function loadDrafts(){
  try{
    const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    if(!Array.isArray(data))return [];
    return data.filter(v=>v&&typeof v.id==="string"&&typeof v.customer==="string"&&typeof v.product==="string"&&Number.isFinite(Number(v.amount))).slice(0,500);
  }catch{return []}
}
function saveDrafts(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.drafts));return true}
  catch{return false}
}
function notify(message){
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer=setTimeout(()=>toast.classList.remove("show"),3400);
}
function heading(title,subtitle="",actions=""){
  return '<div class="page-heading"><div><div class="eyebrow">PayMood / '+esc(title)+'</div><h1>'+esc(title)+'</h1><p>'+esc(subtitle)+'</p></div>'+ (actions?'<div class="page-heading-actions">'+actions+'</div>':"")+'</div>';
}
const newButton='<button class="btn btn-primary" data-new>'+icon("plus")+'مسودة جديدة</button>';
const exportButton='<button class="btn btn-soft" data-export>'+icon("download")+'تصدير المسودات</button>';
function stats(){
  const active=state.drafts.length;
  const data=[
    {icon:"file",color:"blue",label:"مسودات الطلبات",value:number(active),sub:"محفوظة على هذا الجهاز"},
    {icon:"clock",color:"gold",label:"دفعات قيد المراجعة",value:"—",sub:"غير متصل بنظام حقيقي"},
    {icon:"check",color:"green",label:"دفعات مؤكدة",value:"—",sub:"التأكيد المالي غير مفعّل"},
    {icon:"grid",color:"grey",label:"تكاملات نشطة",value:"0",sub:"لم تُربط منتجات بعد"}
  ];
  return '<div class="stats-grid">'+data.map(s=>'<article class="stat-card"><div class="stat-icon '+s.color+'">'+icon(s.icon)+'</div><span class="stat-label">'+s.label+'</span><strong>'+s.value+'</strong><span class="stat-foot">'+s.sub+'</span></article>').join("")+'</div>';
}
function empty(title,description,compact=false){
  return '<div class="empty-state'+(compact?" compact":"")+'"><div class="empty-art">'+icon("empty")+'</div><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p>'+(compact?"":newButton)+'</div>';
}
function filtered(){
  return state.drafts.filter(d=>{
    const matchFilter=state.filter==="all" || d.product===state.filter;
    const q=state.query.toLowerCase().trim();
    const matchSearch=!q||[d.customer,d.product,d.code,d.description].some(x=>String(x||"").toLowerCase().includes(q));
    return matchFilter&&matchSearch;
  });
}
function draftTable(rows){
  if(!rows.length)return empty(state.query?"لا توجد نتائج للبحث":"لا توجد مسودات حتى الآن",state.query?"جرّب البحث بكلمة مختلفة أو غيّر التصفية.":"أنشئ أول مسودة لعرضها هنا. لا يعني إنشاء المسودة تسجيل دفع حقيقي.",true);
  return '<div class="table-wrap"><table class="data-table"><thead><tr><th>رقم المسودة</th><th>الجهة</th><th>المنتج</th><th>المبلغ المرجعي</th><th>الحالة</th><th>التاريخ</th><th>الإجراء</th></tr></thead><tbody>'+
   rows.map(d=>'<tr><td><span class="table-main">'+esc(d.code)+'</span><span class="table-sub">سجل تجريبي</span></td><td><span class="table-main">'+esc(d.customer)+'</span><span class="table-sub">'+esc(d.description||"مسودة طلب دفع")+'</span></td><td><span class="table-tag">'+esc(d.product)+'</span></td><td><b dir="ltr">'+esc(amount(d.amount,d.currency))+'</b></td><td><span class="status draft"><span class="dot"></span>مسودة فقط</span></td><td>'+esc(date(d.created))+'</td><td><button class="action-link" data-delete="'+esc(d.id)+'" aria-label="حذف المسودة">'+icon("trash")+'</button></td></tr>').join("")+
   '</tbody></table></div>';
}
function overview(){
  const recent=state.drafts.slice(0,5);
  return heading("نظرة عامة","كل ما تحتاجه لمتابعة طلبات الدفع من واجهة واحدة.",newButton)+
  '<section class="overview-hero"><div class="hero-content"><div class="hero-label">'+icon("spark")+'منظومة TechMood Technology</div><h2>مدفوعات أوضح.<br>إدارة أسهل.</h2><p>نظّم طلبات الدفع وراجع حالاتها من لوحة احترافية. هذه المعاينة لا تستقبل أموالًا ولا توثّق تحويلات فعلية.</p></div><div class="hero-art"><div class="hero-circle c1"></div><div class="hero-circle c2"></div><div class="hero-circle c3"></div><div class="hero-center">'+icon("card")+'</div><div class="hero-dot"></div></div></section>'+
  stats()+
  '<div class="grid-2"><section class="surface-card"><div class="card-head"><div><h2>أحدث المسودات</h2><p>تظهر المسودات المحفوظة محليًا فقط</p></div><button class="plain-link" data-go="payments">عرض الكل '+icon("arrow")+'</button></div>'+ (recent.length?draftTable(recent):empty("ابدأ بأول طلب","أنشئ مسودة طلب دفع لتجربة البحث والتنظيم، دون إرسالها أو اعتمادها.")) +'</section>'+
  '<section class="surface-card"><div class="card-head"><div><h2>كيف يعمل PayMood؟</h2><p>خطوات إطلاق مركز الدفع الآمن</p></div></div><div class="guide-list">'+[
    ["إنشاء طلب","كل منتج يرسل مرجع الطلب وقيمته بعد الربط الآمن."],
    ["تسجيل إثبات الدفع","المستخدم يقدّم مرجعًا أو مستندًا عبر قناة محمية."],
    ["المطابقة والتحقق","يؤكد مسؤول مخوّل وصول المبلغ من مصدر موثوق."],
    ["التوثيق والإشعار","تُحفظ أحداث التحقق ويرتبط التحديث بالطلب الأصلي."]
  ].map((x,i)=>'<div class="guide-row"><span class="guide-num">'+number(i+1)+'</span><div><strong>'+x[0]+'</strong><p>'+x[1]+'</p></div></div>').join("")+
  '</div><div class="mini-note">'+icon("shield")+'المحفظة وشحن الأرصدة وخدمات التحويل خارج نطاق هذا الإصدار.</div></section></div>';
}
function payments(){
  const actions=newButton+exportButton;
  const filterOptions=["all",...products];
  const chips=filterOptions.map(v=>'<button class="chip-tab '+(state.filter===v?"selected":"")+'" data-filter="'+esc(v)+'" aria-pressed="'+(state.filter===v)+'">'+(v==="all"?"كل المنتجات":esc(v))+'</button>').join("");
  return heading("طلبات الدفع","أنشئ مسودات، ابحث عنها، وصدّرها دون تنفيذ معاملات.",actions)+
  '<div class="page-toolbar"><div class="chip-tabs">'+chips+'</div><div class="toolbar-tools"><span class="outline-badge">'+number(filtered().length)+' مسودة</span></div></div>'+
  '<section class="surface-card"><div class="card-head"><div><h2>سجل المسودات</h2><p>لا تمثل أي مسودة عملية محصلة أو فاتورة مالية نهائية.</p></div></div>'+draftTable(filtered())+'</section>';
}
function methods(){
  const methods=[
    ["card","تحويل بنكي","خيار مستقبلي لعرض تعليمات التحويل والمرجع بعد الربط بمعلومات حساب معتمدة."],
    ["wallet","محافظ محلية","خيار للتكامل مع جهة مرخصة وفق توفر الخدمة والشروط التنظيمية."],
    ["file","دفع يدوي","إدارة إثباتات التحويل والتحقق منها يدويًا عبر مسؤول مخوّل."]
  ];
  return heading("وسائل الدفع","طرق قابلة للتهيئة بعد اعتمادها والتحقق منها.")+
  '<div class="report-banner">'+icon("info")+'<div><strong>لا توجد أي وسيلة دفع مفعّلة</strong><p>البطاقات التالية تصورات مستقبلية ولا تحتوي حسابات استقبال فعلية أو توجيهًا لتحويل الأموال.</p></div></div>'+
  '<div class="method-grid">'+methods.map(m=>'<article class="method-card"><div class="method-icon">'+icon(m[0])+'</div><h3>'+m[1]+'</h3><p>'+m[2]+'</p><span class="outline-badge">غير متصل</span></article>').join("")+'</div>';
}
function reports(){
  const groups=products.map(p=>({p,n:state.drafts.filter(d=>d.product===p).length})).filter(x=>x.n>0);
  const max=Math.max(1,...groups.map(x=>x.n));
  const bars=groups.length?'<div style="display:grid;gap:17px">'+groups.map(({p,n})=>'<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px"><strong>'+esc(p)+'</strong><span>'+number(n)+' مسودة</span></div><div style="height:9px;background:var(--panel-2);border-radius:20px;overflow:hidden"><div style="height:100%;width:'+(n/max*100)+'%;border-radius:20px;background:var(--blue)"></div></div></div>').join("")+'</div>':'<div class="report-chart">'+icon("chart")+'<strong>لا توجد بيانات بعد</strong><span>ستظهر أعداد المسودات التي تنشئها هنا.<br>لا يُعرض أي حجم تحصيل أو إيراد غير متحقق.</span></div>';
  return heading("التقارير","ملخص عن المسودات المحلية فقط؛ لا توجد بيانات مالية حقيقية.",exportButton)+
  '<div class="report-banner">'+icon("shield")+'<div><strong>تقارير المعاينة غير محاسبية</strong><p>الأرقام التالية ليست مدفوعات مستلمة أو إيرادات أو أرصدة. التقارير المالية الفعلية تتطلب مصدر بيانات موثوقًا ومطابقة.</p></div></div>'+stats()+
  '<section class="surface-card"><div class="card-head"><h2>المسودات بحسب المنتج</h2><span class="outline-badge">بيانات هذا الجهاز</span></div>'+bars+'</section>';
}
function integrations(){
  const linked=[
    ["StoreMood","الخدمات الرقمية والاشتراكات"],
    ["MentorMood","الدورات والإرشاد"],
    ["GrowthMood","المراكز والتدريب"],
    ["CodeMood","البرامج التعليمية"],
    ["HealthMood","رسوم المواعيد دون بيانات صحية"],
    ["Capital Market","الطلبات التجارية"]
  ];
  return heading("تكامل المنتجات","واجهة تكامل موحدة مخططة تربط PayMood بالمنتجات دون دمج قواعدها.")+
  '<div class="report-banner">'+icon("info")+'<div><strong>التكاملات غير مفعّلة بعد</strong><p>يجب توفير API خلفية آمنة تربط معرف المنتج والطلب وحالة الدفع، مع التحقق من التفويض والتكرار وحفظ السجلات.</p></div></div>'+
  '<div class="integration-grid">'+linked.map(x=>'<article class="integration-card"><div class="integration-icon">'+icon("grid")+'</div><h3>'+x[0]+'</h3><p>'+x[1]+'</p><span class="outline-badge">قيد التخطيط</span></article>').join("")+'</div>';
}
function settings(){
  return heading("الإعدادات","معلومات الأمان والتشغيل الخاصة بنسخة PayMood الحالية.")+
  '<div class="settings-list"><div class="setting-row"><div><strong>الوضع الحالي</strong><p>معاينة واجهة مستخدم، بلا قاعدة بيانات دفع أو اعتماد مالي.</p></div><span class="status draft">تجريبي</span></div>'+
  '<div class="setting-row"><div><strong>المظهر</strong><p>تبديل الواجهة بين الوضع الفاتح والداكن مع حفظ تفضيل الجهاز.</p></div><button class="btn btn-soft" data-theme>'+icon("moon")+'تبديل المظهر</button></div>'+
  '<div class="setting-row"><div><strong>إدارة المسودات المحلية</strong><p>حذف جميع المسودات المخزنة على هذا المتصفح؛ لا يؤثر على أي خدمة خارجية.</p></div><button class="btn btn-soft" data-clear>'+icon("trash")+'مسح المسودات</button></div></div>'+
  '<section class="surface-card" style="margin-top:20px"><div class="card-head"><h2>ضوابط السلامة</h2></div><ul class="privacy-list"><li>لا يُسمح بتأكيد دفعة أو تعديل رصيد أو سحب أموال من هذه الواجهة.</li><li>أي مسودة تُحفظ على الجهاز فقط وقد تضيع عند حذف بيانات المتصفح.</li><li>لا توجد طريقة دفع مُفعلة ولا يتم تخزين بطاقات مصرفية أو كلمات مرور.</li><li>الربط المستقبلي يتطلب نظام حسابات وتفويض ومراجعة ومطابقة قانونية.</li><li>نقاط التعلم أو المكافآت في منتجات TechMood ليست أموالًا.</li></ul></section>';
}
function render(){
  state.view=views[state.view]?state.view:"overview";
  document.getElementById("page-name").textContent=views[state.view];
  document.title=views[state.view]+" | PayMood";
  document.querySelectorAll(".nav-item").forEach(n=>{const on=n.dataset.view===state.view;n.classList.toggle("active",on);n.setAttribute("aria-current",on?"page":"false")});
  const count=document.getElementById("nav-count");
  count.hidden=state.drafts.length===0;
  count.textContent=number(state.drafts.length);
  main.innerHTML=({overview,payments,methods,reports,integrations,settings}[state.view])();
}
function navigate(view){
  if(!views[view])view="overview";
  state.view=view;
  location.hash=view;
  closeMenu();
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}
function openModal(){
  document.getElementById("request-form").reset();
  closeMenu();
  if(!dialog.open)dialog.showModal();
}
function closeMenu(){
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("mobile-overlay").classList.remove("open");
}
function toggleTheme(){
  const next=document.documentElement.dataset.theme==="dark"?"light":"dark";
  document.documentElement.dataset.theme=next;
  try{localStorage.setItem(THEME_KEY,next)}catch{}
  document.querySelector("#theme-toggle use").setAttribute("href",next==="dark"?"#i-sun":"#i-moon");
}
function exportDrafts(){
  if(!state.drafts.length)return notify("لا توجد مسودات لتصديرها.");
  const safe=v=>{const t=String(v??"").replace(/[\r\n]+/g," ");return '"'+(/^[=+\-@]/.test(t)?"'"+t:t).replace(/"/g,'""')+'"';};
  const columns=["Code","Customer","Product","Amount","Currency","Description","CreatedAt","Status"];
  const rows=state.drafts.map(d=>[d.code,d.customer,d.product,d.amount,d.currency,d.description||"",d.created,"LOCAL_DRAFT_ONLY"]);
  const csv="\uFEFF"+[columns,...rows].map(row=>row.map(safe).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="paymood-local-drafts.csv";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
  notify("تم تصدير المسودات المحلية فقط.");
}
document.addEventListener("click",e=>{
  const button=e.target.closest("button");
  if(!button)return;
  if(button.dataset.view){navigate(button.dataset.view);return}
  if(button.dataset.go){navigate(button.dataset.go);return}
  if(button.hasAttribute("data-new")){openModal();return}
  if(button.hasAttribute("data-close")){dialog.close();return}
  if(button.dataset.filter!==undefined){state.filter=button.dataset.filter;render();return}
  if(button.hasAttribute("data-export")){exportDrafts();return}
  if(button.dataset.delete){
    if(!confirm("هل تريد حذف هذه المسودة المحلية؟"))return;
    state.drafts=state.drafts.filter(d=>d.id!==button.dataset.delete);
    if(saveDrafts())notify("حُذفت المسودة من هذا الجهاز.");
    render();return;
  }
  if(button.hasAttribute("data-theme")){toggleTheme();return}
  if(button.hasAttribute("data-clear")){
    if(!state.drafts.length)return notify("لا توجد مسودات لحذفها.");
    if(!confirm("سيتم حذف جميع المسودات المحلية نهائيًا من هذا المتصفح. متابعة؟"))return;
    state.drafts=[];saveDrafts();render();notify("حُذفت المسودات المحلية.");return;
  }
});
document.getElementById("request-form").addEventListener("submit",e=>{
  e.preventDefault();
  const form=e.currentTarget;
  if(!form.reportValidity())return;
  const data=new FormData(form);
  const product=String(data.get("product")||"");
  const currency=String(data.get("currency")||"ILS");
  const n=Number(data.get("amount"));
  const customer=String(data.get("customer")||"").trim();
  const description=String(data.get("description")||"").trim();
  if(!products.includes(product)||!["ILS","USD","JOD"].includes(currency)||!Number.isFinite(n)||n<=0||n>1000000||!customer||customer.length>80||description.length>250){
    notify("تحقق من بيانات المسودة.");return;
  }
  if(state.drafts.length>=500){notify("وصلت المسودات المحلية إلى الحد الأعلى (500).");return}
  const id=(typeof crypto!=="undefined"&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2);
  const code="PM-DRAFT-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-7);
  const entry={id,code,customer,product,amount:Math.round(n*100)/100,currency,description,created:new Date().toISOString()};
  state.drafts.unshift(entry);
  if(!saveDrafts()){state.drafts.shift();notify("تعذر التخزين على هذا المتصفح.");return}
  dialog.close();
  state.filter="all";state.query="";
  document.getElementById("global-search").value="";
  navigate("payments");
  notify("حُفظت المسودة محليًا. لم تتم أي عملية دفع.");
});
document.getElementById("global-search").addEventListener("input",e=>{
  state.query=e.target.value.slice(0,80);
  if(state.view!=="payments")navigate("payments");else render();
});
document.getElementById("menu-toggle").addEventListener("click",()=>{
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobile-overlay").classList.toggle("open");
});
document.getElementById("mobile-overlay").addEventListener("click",closeMenu);
document.getElementById("theme-toggle").addEventListener("click",toggleTheme);
document.getElementById("notify-toggle").addEventListener("click",()=>notify("الإشعارات الفعلية غير مفعّلة في نسخة المعاينة."));
window.addEventListener("hashchange",()=>{const hash=location.hash.slice(1);if(views[hash]&&hash!==state.view){state.view=hash;render()}});
try{if(localStorage.getItem(THEME_KEY)==="dark"){document.documentElement.dataset.theme="dark";document.querySelector("#theme-toggle use").setAttribute("href","#i-sun")}}catch{}
state.view=views[location.hash.slice(1)]?location.hash.slice(1):"overview";
render();
