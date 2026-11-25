/* Peace Council — original procedural vector art, TechMood. No external images. */
(function(root){
'use strict';
const TYPES=['house','clinic','school','water','power','market','depot','park','council','port','airport','road'];
const names=['العمارة المحلية','التطوير الحضري','المدينة الذكية','عمارة المستقبل'];
function tier(level){return level>=100?3:level>=25?2:level>=6?1:0;}
function style(level){return names[tier(level)];}
const C={sand:'#e6d2a5',stone:'#e5d8b8',shade:'#a79277',cream:'#f5ecd3',dark:'#35515a',glass:'#78b5be',sea:'#377e97',green:'#5d8c60',olive:'#70844f',gold:'#e4b96e',red:'#b9614f',roof:'#cfad80',steel:'#8ba7ad',white:'#edf1e8'};
const cache=new Map();
function model(type,level=1){
 if(!TYPES.includes(type))return null;
 const k=tier(level),key=type+':'+k;if(cache.has(key))return cache.get(key);
 const a=[];
 const p=(pts,fill,stroke)=>a.push({kind:'poly',pts,fill,stroke});
 const r=(x,y,w,h,fill)=>a.push({kind:'rect',x,y,w,h,fill});
 const l=(x,y,x2,y2,stroke,width=1)=>a.push({kind:'line',x,y,x2,y2,stroke,width});
 const c=(x,y,rad,fill)=>a.push({kind:'circle',x,y,rad,fill});
 const d=(x,y,w,h,fill,stroke)=>p([[x,y-h/2],[x+w/2,y],[x,y+h/2],[x-w/2,y]],fill,stroke);
 function block(x,y,w,d,h,face=C.stone,side=C.shade,top=C.cream){const q=[[x,y-d/2],[x+w/2,y],[x,y+d/2],[x-w/2,y]],u=q.map(([x,y])=>[x,y-h]);p([u[3],u[2],q[2],q[3]],side,C.dark);p([u[2],u[1],q[1],q[2]],face,C.dark);p(u,top,C.dark);}
 function windows(x,y,w,h,rows=1,cols=3){for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const u=x+3+i*(w-7)/cols,v=y-6-j*8-i*2;if(v<y-h+3)continue;p([[u,v],[u+3,v-1.4],[u+3,v-5],[u,v-3.6]],k>=2?'#9cd9e0':'#557e87');}}
 function arch(x,y){r(x-3,y-6,6,6,C.dark);c(x,y-6,3,C.dark);l(x-4,y,x+4,y,C.sand,1);}
 function palm(x,y){l(x,y,x+1,y-17,'#836c48',2);for(const [dx,dy] of [[-8,-4],[-6,-9],[1,-10],[7,-8],[9,-3]])l(x+1,y-17,x+dx,y-17+dy,C.green,2.6);}
 function olive(x,y){l(x,y,x,y-9,'#826548',2);c(x,y-12,6,'#486a4d');c(x-2,y-14,4,C.olive);}
 function panel(x,y,w=12){p([[x-w/2,y],[x,y-5],[x+w/2,y-2],[x,y+3]],'#3e7098','#b0d1d8');l(x-w/4,y-2.5,x+w/4,y+.5,'#9fbec6',.7);}
 function tank(x,y){r(x-5,y-6,10,6,'#80b7c5');c(x,y-6,5,'#bce0dc');}
 function base(fill=C.sand){d(0,1,60,32,fill,'#58756b');}
 const height=12+k*10;
 switch(type){
 case 'house':
 base();olive(-23,4);block(0,0,40,19,height+8,k>=2?C.glass:C.stone,C.shade,k>=2?'#d2e3dd':C.cream);windows(0,0,22,height+8,k+1,3);
 if(k===0){arch(-9,4);block(-9,-height-7,12,7,3,C.stone,C.shade,C.cream);tank(9,-height-11);}
 else if(k===1){block(-5,-height-6,26,13,9);windows(-5,-height-6,14,9,1,2);panel(2,-height-16);}
 else if(k===2){block(-7,-height-8,22,12,9,C.glass,'#577e82','#c1d5d0');panel(5,-height-12);olive(10,-height-6);}
 else {block(-4,-height-9,23,12,14,C.glass,'#537f86','#bcdad5');d(0,-height-25,18,8,C.green);panel(0,-height-26,10);c(8,-height-8,3,C.green);}
 break;
 case 'clinic':
 base('#cbd7c4');block(-7,0,34,20,height+6,C.white,'#9aaeb0','#f6f5e8');block(14,3,21,13,12+k*4,C.cream,C.steel);windows(-7,0,20,height+6,k+1,3);r(-10,-height-11,10,3,C.red);r(-6.5,-height-14,3,9,C.red);arch(12,6);if(k>=1){d(11,-height-1,16,9,'#577d82');l(7,-height-1,15,-height-1,C.white);l(11,-height-4,11,-height+2,C.white);}if(k>=2)panel(-10,-height-12);if(k===3)block(4,-height-10,15,9,10,C.glass,C.steel,C.cream);break;
 case 'school':
 base('#d6c296');block(-8,-2,34,17,height+5,'#e9c785','#aa906c','#f2d9a8');block(12,5,24,12,10+k*5,'#ecdab1','#a68b68','#f0e7cf');windows(-8,-2,18,height+5,k+1,3);arch(9,6);l(-20,8,-20,-16,C.dark,1.4);p([[-20,-16],[-10,-13],[-20,-10]],C.gold);if(k>=1)panel(8,-height-4);if(k>=2){d(-9,-height-11,22,11,C.green);c(-9,-height-13,3,C.olive);}if(k===3)block(0,-height-11,18,9,10,C.glass,C.steel,C.cream);break;
 case 'market':
 base();block(-4,-1,44,21,11+k*6,'#dfbd8f','#99795c','#ead9b8');for(let i=0;i<5;i++){const x=-18+i*8;p([[x,0],[x+8,-4],[x+8,-10],[x,-6]],i%2?C.cream:C.red);r(x+2,1,4,4,i%2?C.green:C.gold);}if(k>=1){block(-4,-12-k*6,29,13,8,C.stone,C.shade);windows(-4,-12-k*6,14,8,1,2);}if(k>=2)panel(8,-20-k*6);if(k===3)block(0,-20-k*6,18,9,10,C.glass,C.steel);break;
 case 'water':
 base('#a5c6ba');block(-13,1,19,13,12+k*3,C.cream,C.steel);for(let i=0;i<2+(k>=2?1:0);i++){const x=-3+i*12,y=4-i*5;r(x-6,y-12-k*3,12,12+k*3,'#559caf');c(x,y-12-k*3,6,'#a5d9de');c(x,y-12-k*3,3,'#d2eeea');l(x,y+2,x-6,y+5,'#d4e5df',2);}if(k>=1)panel(-13,-14-k*3,11);if(k===3)block(0,-27,15,10,8,C.glass,C.steel);break;
 case 'power':
 base('#b0bf95');for(let i=0;i<3;i++)panel(-14+i*13,2-i*5,17);block(-6,-7,24,14,12+k*5,'#dbc684','#9c9069','#efdbab');panel(-6,-20-k*5,18);if(k>=1){l(19,4,19,-27-k*3,C.steel,2);c(19,-27-k*3,2,C.white);for(const [x,y] of [[0,-11],[9,5],[-9,5]])l(19,-27-k*3,19+x,-27-k*3+y,C.white,2);}if(k>=2){block(10,5,16,10,9+k*2,C.glass,C.steel);panel(10,-4-k*2,11);}break;
 case 'depot':
 base('#c7bda5');block(-4,0,43,21,15+k*5,'#b8c1bb','#7d8d8a','#d5dbce');p([[-25,-15-k*5],[-4,-22-k*5],[17,-15-k*5],[-4,-9-k*5]],'#8cacae',C.dark);for(let i=0;i<3;i++){block(-19+i*10,9-i*4,8,5,5,i%2?C.gold:C.steel,C.shade);}if(k>=1){r(12,-25-k*5,4,17,C.steel);r(11,-26-k*5,6,3,C.dark);}if(k>=2)panel(-4,-23-k*5,20);if(k===3)block(0,-25-k*5,17,9,11,C.glass,C.steel);break;
 case 'park':
 base('#70a270');d(0,1,43,23,'#cfb891');d(0,1,28,15,'#79a875');olive(-18,1);olive(15,4);palm(0,-6);c(0,3,6,'#467f92');c(0,2,4,'#a4e0dc');if(k>=1){r(-12,7,7,2,C.shade);r(9,7,7,2,C.shade);}if(k>=2){l(-13,4,-13,-6,C.dark,1);c(-13,-6,2,C.gold);l(15,5,15,-5,C.dark,1);c(15,-5,2,C.gold);}if(k===3)d(0,-4,17,8,'#b4dcd1',C.dark);break;
 case 'council':
 base('#d4c5a4');block(0,3,54,26,15+k*5,C.stone,C.shade,C.cream);block(0,-5,36,20,19+k*9,'#f0e2c2','#a99a7c','#e2d5b3');for(const x of [-15,-7,1,9]){r(x,2,3,15+k*5,C.cream);c(x+1.5,2,2,C.sand);}arch(-8,5);windows(0,-5,16,19+k*9,k+1,2);block(0,-24-k*9,13,9,7,'#7e9f83','#587c68','#b7c7a1');l(0,-31-k*9,0,-43-k*9,C.dark,1.5);p([[0,-43-k*9],[13,-41-k*9],[0,-37-k*9]],C.green);palm(-24,7);palm(23,4);if(k>=2){panel(-12,-20-k*9);panel(13,-20-k*9);}if(k===3)block(0,-31-k*9,9,6,9,C.glass,C.steel);break;
 case 'port':
 base('#87a9ab');d(7,1,45,24,'#b7b6a1',C.dark);p([[-29,-3],[-20,-7],[-8,-1],[-17,4]],C.sea);block(12,-4,24,13,12+k*4,C.steel,'#6d858b','#dce4d9');for(let i=0;i<3+k;i++){const x=-6+(i%3)*9,y=7-Math.floor(i/3)*5;block(x,y,8,5,4,i%2?C.red:C.gold,C.shade);}for(let i=0;i<1+k;i++){const x=-15+i*9,y=-2-i*2;l(x,y,x,y-25-k*3,C.gold,2);l(x,y-25-k*3,x+13,y-25-k*3,C.gold,2);l(x+13,y-25-k*3,x+13,y-13-k*3,C.dark,1);}
 p([[-29,-4],[-22,-10],[-8,-5],[-17,1]],C.white,C.dark);p([[-24,-5],[-19,-8],[-13,-5],[-18,-2]],C.red);if(k>=2)panel(12,-17-k*4,14);break;
 case 'airport':
 base('#bfc7c0');p([[-29,-2],[-13,-11],[29,10],[13,17]],'#6a7c82',C.dark);for(let i=0;i<5;i++)l(-19+i*9,-2+i*4,-15+i*9,i*4,C.white,1.4);block(-3,-8,33,14,12+k*6,C.white,C.steel,'#c3d6d5');windows(-3,-8,15,12+k*6,k+1,2);block(14,-6,9,7,20+k*5,C.steel,'#718c93',C.glass);p([[9,10],[-10,2],[-9,-1],[-2,1],[4,-5],[7,-4],[5,4],[15,8],[17,5],[19,7],[17,12]],C.white,C.dark);if(k>=2)panel(-4,-22-k*6,18);if(k===3)block(-2,-20-k*6,17,8,9,C.glass,C.steel);break;
 case 'road':
 base('#a8b99a');d(0,0,56,30,'#687c80','#c8d1c4');for(let i=-2;i<=2;i++)l(i*8-3,i*4-1,i*8+3,i*4+2,C.cream,1.5);break;
 }
 const frozen=Object.freeze(a.map(o=>Object.freeze(o)));cache.set(key,frozen);return frozen;
}
function vehicle(seed=0){const color=['#e9c16e','#d47b65','#91ced0','#e9e6d4'][Math.abs(seed)%4];return [{kind:'poly',pts:[[-6,0],[1,-4],[7,-1],[0,3]],fill:'#223b45'},{kind:'poly',pts:[[-5,-2],[1,-6],[7,-3],[1,1]],fill:color},{kind:'rect',x:-1,y:-5,w:3,h:2,fill:'#345969'}];}
function svg(type,level=1){const m=model(type,level);if(!m)return '';const shapes=m.map(o=>{if(o.kind==='poly')return '<polygon points="'+o.pts.map(p=>p.join(',')).join(' ')+'" fill="'+o.fill+'"'+(o.stroke?' stroke="'+o.stroke+'" stroke-width=".55"':'')+'/>';if(o.kind==='rect')return '<rect x="'+o.x+'" y="'+o.y+'" width="'+o.w+'" height="'+o.h+'" fill="'+o.fill+'"/>';if(o.kind==='circle')return '<circle cx="'+o.x+'" cy="'+o.y+'" r="'+o.rad+'" fill="'+o.fill+'"/>';return '<line x1="'+o.x+'" y1="'+o.y+'" x2="'+o.x2+'" y2="'+o.y2+'" stroke="'+o.stroke+'" stroke-width="'+o.width+'" stroke-linecap="round"/>';}).join('');return '<svg viewBox="-35 -82 70 103" aria-hidden="true" focusable="false">'+shapes+'</svg>';}
const api={model,svg,style,tier,vehicle,TYPES};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PCArt=api;
})(typeof window!=='undefined'?window:globalThis);
