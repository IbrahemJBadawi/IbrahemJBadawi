/* Deterministic civilian mobility simulation on the player's fictional local grid. */
(function(root){
'use strict';
const WORK=new Set(['farm','ranch','mill','bakery','quarry','cementworks','steelworks','factory','warehouse','bank','market','depot','council','port','airport']);
const SERVICES=['clinic','school','market','park'];
const D=[[1,0],[-1,0],[0,1],[0,-1]], key=(c,r)=>c+':'+r, active=b=>b.job?.kind!=='build';
const MAX_AGENTS=64;
function graph(buildings){
 const roads=new Map(buildings.filter(b=>b.type==='road'&&active(b)).map(b=>[key(b.c,b.r),b]));
 const adjacent=b=>D.map(([dc,dr])=>key(b.c+dc,b.r+dr)).filter(k=>roads.has(k));
 const cache=new Map();
 function path(a,b){
  const starts=adjacent(a),ends=new Set(adjacent(b));if(!starts.length||!ends.size)return null;
  const cacheKey=starts.join(',')+'>'+[...ends].join(',');if(cache.has(cacheKey))return cache.get(cacheKey);
  const queue=[...starts],parent=new Map(starts.map(k=>[k,null]));let found=null;
  for(let i=0;i<queue.length;i++){const k=queue[i];if(ends.has(k)){found=k;break;}const v=roads.get(k);
   for(const [dc,dr] of D){const next=key(v.c+dc,v.r+dr);if(roads.has(next)&&!parent.has(next)){parent.set(next,k);queue.push(next);}}
  }
  if(found===null){cache.set(cacheKey,null);return null;}
  const result=[];for(let k=found;k!==null;k=parent.get(k)){const v=roads.get(k);result.push({c:v.c,r:v.r,key:k});}result.reverse();cache.set(cacheKey,result);return result;
 }
 return {roads,adjacent,path};
}
function analyze(buildings,region){
 const bs=buildings.filter(b=>b.region===region&&active(b)).sort((a,b)=>a.id-b.id);
 const g=graph(bs),homes=bs.filter(b=>b.type==='house'),work=bs.filter(b=>WORK.has(b.type)),stops=bs.filter(b=>b.type==='busstop'),dest=Object.fromEntries(SERVICES.map(t=>[t,bs.filter(b=>b.type===t)]));
 let population=0,connected=0,workAccess=0;const serviceAccess=Object.fromEntries(SERVICES.map(t=>[t,0])),trips=[],load=new Map(), agents=[];
 function addTrip(from,to,mode,weight,path){if(!path?.length)return;const w=Math.max(1,Math.floor(weight));trips.push({from:from.id,to:to.id,mode,weight:w,path});for(const p of path)load.set(p.key,(load.get(p.key)||0)+w);}
 function nearest(a,options){let best=null;for(const b of options){const p=g.path(a,b);if(p&&(!best||p.length<best.path.length))best={b,path:p};}return best;}
 for(const h of homes){const residents=Math.min(Number.MAX_SAFE_INTEGER,Math.round(18*(1+(h.level-1)*.65)));population+=residents;if(g.adjacent(h).length)connected+=residents;
  const job=nearest(h,work);if(job){workAccess+=residents;const bus=stops.some(s=>g.path(h,s)&&g.path(s,job.b));addTrip(h,job.b,bus?'bus':'car',Math.ceil(residents/6),job.path);}
  for(const type of SERVICES){const near=nearest(h,dest[type]);if(near){serviceAccess[type]+=residents;addTrip(h,near.b,'person',Math.ceil(residents/12),near.path);}}
 }
 for(const b of bs.filter(b=>WORK.has(b.type)&&!['council','bank'].includes(b.type))){const target=nearest(b,bs.filter(t=>t.id!==b.id&&['warehouse','market','port','airport','depot'].includes(t.type)));if(target)addTrip(b,target.b,'truck',Math.max(1,Math.floor(Math.sqrt(b.level))),target.path);}
 let totalLoad=0,totalCapacity=0;for(const [k,b] of g.roads){totalLoad+=load.get(k)||0;totalCapacity+=8+4*Math.log2(b.level+1);}
 const congestion=totalCapacity?Math.round(Math.min(100,totalLoad/totalCapacity*100)):0;
 const pct=n=>population?Math.round(100*n/population):0;
 // Bounded representative agents; per-house households are derived, not individual saved identities.
 for(const t of trips){if(agents.length>=MAX_AGENTS)break;agents.push({mode:t.mode,path:t.path,seed:t.from*17+t.to*31,speed:t.mode==='person'?.035:t.mode==='bus'?.06:.08});}
 for(const b of bs.filter(b=>b.type==='port'||b.type==='airport')){if(agents.length>=MAX_AGENTS)break;agents.push({mode:b.type==='port'?'ship':'plane',seed:b.id*17,speed:.045,path:b.type==='port'?[{c:b.c-.85,r:b.r-.6},{c:b.c-.85,r:b.r+.6}]:[{c:b.c-.35,r:b.r-.25},{c:b.c+.35,r:b.r+.25}]});}
 return {population,households:Math.ceil(population/4),roadAccess:pct(connected),workAccess:pct(workAccess),services:Object.fromEntries(SERVICES.map(t=>[t,pct(serviceAccess[t])])),congestion,roadCount:g.roads.size,trips:trips.reduce((n,t)=>n+t.weight,0),agents,routeCount:trips.length};
}
function position(agent,tick,congestion=0){const p=agent.path;if(!p.length)return null;if(p.length===1){const angle=(tick*.12+agent.seed)%6.283;return {c:p[0].c+Math.sin(angle)*.10,r:p[0].r+Math.cos(angle)*.10};}const n=p.length-1,v=((tick*agent.speed*(1-congestion*.006)+agent.seed*.037)%(n*2)+n*2)%(n*2),pos=v>n?2*n-v:v,i=Math.min(n-1,Math.floor(pos)),f=pos-i;return {c:p[i].c+(p[i+1].c-p[i].c)*f,r:p[i].r+(p[i+1].r-p[i].r)*f};}
const api={graph,analyze,position,MAX_AGENTS,SERVICES};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PCMobility=api;
})(typeof window!=='undefined'?window:globalThis);
