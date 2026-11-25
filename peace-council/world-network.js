/* Civilian reconstruction game; public place references, schematic corridors. */
(function(root){
'use strict';
const REGION_NAMES=['شمال غزة','مدينة غزة','دير البلح','خان يونس','رفح'];
const PLACES=[
 {id:'beit-lahia',name:'بيت لاهيا',region:0,point:[34.49514,31.5464],tile:[5,3],role:'زراعة وإسكان'},
 {id:'beit-hanoun',name:'بيت حانون',region:0,point:[34.535787,31.535298],tile:[11,4],role:'خدمات وإسكان'},
 {id:'jabalia',name:'جباليا',region:0,point:[34.483471,31.5272],tile:[7,8],role:'تجارة وخدمات'},
 {id:'gaza',name:'مدينة غزة',region:1,point:[34.46667,31.50139],tile:[7,7],role:'مقر مجلس السلام'},
 {id:'port',name:'ميناء غزة',region:1,point:[34.43056,31.52583],tile:[3,5],role:'مشروع بحري مستقبلي'},
 {id:'nuseirat',name:'النصيرات',region:2,point:[34.3925,31.448611],tile:[5,3],role:'تجارة وإسكان'},
 {id:'bureij',name:'البريج',region:2,point:[34.403056,31.439444],tile:[10,4],role:'خدمات محلية'},
 {id:'deir',name:'دير البلح',region:2,point:[34.34933,31.41834],tile:[5,9],role:'أسواق وزراعة'},
 {id:'khan-yunis',name:'خان يونس',region:3,point:[34.306268,31.340177],tile:[7,6],role:'صحة وتعليم'},
 {id:'rafah',name:'رفح',region:4,point:[34.24357,31.29722],tile:[7,6],role:'تجارة وخدمات'},
 {id:'airport',name:'مطار ياسر عرفات',region:4,point:[34.27588,31.24313],tile:[11,9],role:'موقع تاريخي ومشروع مستقبلي'}
];
const ROUTES=['salah','rashid'].flatMap(kind=>Array.from({length:4},(_,i)=>({id:kind+'-'+i,kind,from:i,to:i+1,name:(kind==='salah'?'صلاح الدين':'الرشيد')+' • '+REGION_NAMES[i]+' – '+REGION_NAMES[i+1],base:kind==='salah'?380:460,materials:kind==='salah'?8:10})));
const MAX=Number.MAX_SAFE_INTEGER, safe=n=>Math.max(0,Math.min(MAX,Math.floor(Number.isFinite(n)?n:0)));
function normalize(raw){const result={};for(const r of ROUTES){const v=raw?.[r.id];result[r.id]=Number.isSafeInteger(v)&&v>=0?v:0;}return result;}
function cost(route,level){return {coins:safe(route.base*(1+Math.max(0,level)*.35)),materials:safe(route.materials+Math.max(0,level)*2)};}
function reachable(levels,origin=1){const seen=new Set([origin]),q=[origin];while(q.length){const at=q.shift();for(const r of ROUTES){if(!(levels?.[r.id]>0))continue;const next=r.from===at?r.to:r.to===at?r.from:null;if(next!==null&&!seen.has(next)){seen.add(next);q.push(next);}}}return seen;}
function economy(levels,buildings=[]){const linked=reachable(levels);const capacity=ROUTES.filter(r=>linked.has(r.from)&&linked.has(r.to)&&levels?.[r.id]>0).reduce((n,r)=>n+Math.log2(1+levels[r.id]),0);const commerce=buildings.filter(b=>linked.has(b.region)&&b.job?.kind!=='build'&&['market','port','airport'].includes(b.type)).reduce((n,b)=>n+Math.log2(1+b.level),0);return {linked:linked.size,capacity,income:safe((linked.size-1)*12+capacity*5+commerce*Math.min(15,capacity*2)),materials:safe(capacity/2)};}
const api={REGION_NAMES,PLACES,ROUTES,normalize,cost,reachable,economy};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PCNetwork=api;
})(typeof window!=='undefined'?window:globalThis);
