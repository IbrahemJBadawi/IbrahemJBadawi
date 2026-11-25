/* Peace Council: deterministic civilian production and trade simulation. */
(function(root){
'use strict';
const GOODS={grain:{name:'حبوب',price:8},milk:{name:'حليب',price:12},flour:{name:'دقيق',price:13},bread:{name:'خبز',price:18},stone:{name:'حجر',price:7},ore:{name:'خام الحديد',price:11},cement:{name:'إسمنت',price:16},steel:{name:'فولاذ',price:23},tools:{name:'أدوات',price:32}};
const RECIPES={
 farm:{jobs:2,in:{},out:{grain:6}},
 ranch:{jobs:2,in:{grain:2},out:{milk:4}},
 mill:{jobs:2,in:{grain:3},out:{flour:3}},
 bakery:{jobs:2,in:{flour:2},out:{bread:3}},
 quarry:{jobs:3,in:{},out:{stone:5,ore:3}},
 cementworks:{jobs:3,in:{stone:3},out:{cement:3}},
 steelworks:{jobs:3,in:{ore:3},out:{steel:2}},
 factory:{jobs:4,in:{cement:2,steel:2},out:{tools:2},materials:3}
};
const KEYS=Object.keys(GOODS),MAX=Number.MAX_SAFE_INTEGER;
const int=(n,max=MAX)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
const empty=()=>Object.fromEntries(KEYS.map(k=>[k,0]));
function fresh(){const stock=Array.from({length:5},empty);Object.assign(stock[1],{grain:12,flour:8,bread:16,milk:8,stone:8,ore:6});return {stock,debt:0,last:null};}
function normalize(raw){if(!raw||!Array.isArray(raw.stock))return fresh();return {stock:Array.from({length:5},(_,i)=>Object.fromEntries(KEYS.map(k=>[k,int(raw.stock[i]?.[k])]))),debt:int(raw.debt,550),last:null};}
const active=b=>b.job?.kind!=='build';
const scale=b=>Math.max(1,Math.floor(Math.sqrt(b.level)));
function capacity(buildings,region){return int(120+buildings.filter(b=>b.region===region&&b.type==='warehouse'&&active(b)).reduce((n,b)=>n+120*scale(b),0));}
const used=s=>KEYS.reduce((n,k)=>n+s[k],0);
function price(stock,key,side){if(!Object.hasOwn(GOODS,key))return null;const factor=Math.max(.65,Math.min(1.8,1.45-stock[key]/60));return Math.max(1,side==='buy'?Math.ceil(GOODS[key].price*factor*1.2):Math.floor(GOODS[key].price*factor*.8));}
function access(buildings,region,type){return buildings.some(b=>b.region===region&&type.includes(b.type)&&active(b));}
function trade(e,buildings,region,key,side,coins){if(!Object.hasOwn(GOODS,key)||!['buy','sell'].includes(side)||!Number.isInteger(region)||region<0||region>4)return null;
 if(!access(buildings,region,['market','port','airport','council']))return null;
 const s=e.stock[region],qty=5,cost=price(s,key,side)*qty;
 if(side==='buy'){if(coins<cost||used(s)+qty>capacity(buildings,region))return null;s[key]+=qty;return -cost;}
 if(s[key]<qty)return null;s[key]-=qty;return cost;}
function population(buildings,region){return int(buildings.filter(b=>b.region===region&&b.type==='house'&&active(b)).reduce((n,b)=>n+18*(1+(b.level-1)*.65),0));}
function workers(buildings,region){return Math.floor(population(buildings,region)*.5);}
function day(e,buildings,links,routes){
 const report={regions:Array.from({length:5},()=>({workers:0,jobs:0,produced:0,blocked:0,foodNeed:0,foodFed:0,shipped:0})),materials:0,wages:0,trade:0};
 // Process raw production first, then food and construction manufacturing.
 for(let region=0;region<5;region++){const s=e.stock[region],r=report.regions[region];r.workers=workers(buildings,region);const limit=capacity(buildings,region);let available=r.workers;
 for(const type of Object.keys(RECIPES)){const recipe=RECIPES[type];for(const b of buildings.filter(b=>b.region===region&&b.type===type&&active(b)).sort((a,b)=>a.id-b.id)){
 const desired=scale(b),workersMax=Math.floor(available/recipe.jobs);
 let batches=Math.min(desired,workersMax);for(const [k,v] of Object.entries(recipe.in))batches=Math.min(batches,Math.floor(s[k]/v));
 const net=Object.values(recipe.out).reduce((a,b)=>a+b,0)-Object.values(recipe.in).reduce((a,b)=>a+b,0);
 if(net>0)batches=Math.min(batches,Math.max(0,Math.floor((limit-used(s))/net)));
 if(!batches){r.blocked++;continue;}
 for(const [k,v] of Object.entries(recipe.in))s[k]-=v*batches;
 for(const [k,v] of Object.entries(recipe.out)){s[k]=int(s[k]+v*batches);r.produced+=v*batches;}
 available-=recipe.jobs*batches;r.jobs+=recipe.jobs*batches;report.materials=int(report.materials+(recipe.materials||0)*batches);
 }}
 r.foodNeed=Math.ceil(population(buildings,region)/18);
 }
 // Transfer only through upgraded neighboring corridors; each link has a daily capacity.
 for(const route of routes){const lvl=links[route.id]||0;if(!lvl)continue;let remaining=int(6*Math.log2(1+lvl));for(const k of KEYS){const a=e.stock[route.from],b=e.stock[route.to];let from=route.from,to=route.to;if(a[k]<b[k]){from=route.to;to=route.from;}const source=e.stock[from],dest=e.stock[to];const qty=Math.min(remaining,Math.floor((source[k]-dest[k])/2),Math.max(0,capacity(buildings,to)-used(dest)));if(qty<=0)continue;source[k]-=qty;dest[k]+=qty;remaining-=qty;report.regions[from].shipped+=qty;report.trade+=qty;if(!remaining)break;}}
 for(let i=0;i<5;i++){const r=report.regions[i],s=e.stock[i];const bread=Math.min(s.bread,r.foodNeed);s.bread-=bread;const milk=Math.min(s.milk,r.foodNeed-bread);s.milk-=milk;r.foodFed=bread+milk;report.wages=int(report.wages+r.jobs*2);}
 e.last=report;return report;
}
function borrow(e,buildings,region){if(e.debt||!access(buildings,region,['bank']))return 0;e.debt=550;return 500;}
function repay(e,coins){const amount=Math.min(e.debt,55,int(coins));e.debt-=amount;return amount;}
const api={GOODS,RECIPES,KEYS,fresh,normalize,capacity,used,price,trade,day,borrow,repay,workers,access};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PCEconomy=api;
})(typeof window!=='undefined'?window:globalThis);
