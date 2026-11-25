/* Peace Council GPU renderer — independent rendering layer; PixiJS MIT. */
(() => {
'use strict';
const W=window, D=document, CDN='https://cdn.jsdelivr.net/npm/pixi.js@8.14.3/dist/pixi.min.js';
let app=null,input=null,redraw=null,terrain=null,structures=null,motion=null,labels=null,signature='',size='',pending=false,requested=true,epoch=0;
const api={active:false,start,render};W.PCPixi=api;
const toggle=()=>D.getElementById('renderer-toggle');
const status=(name,busy=false)=>{const b=toggle();if(b){b.textContent=name;b.disabled=busy;b.setAttribute('aria-pressed',String(api.active));}};
function loadLibrary(){if(W.PIXI?.Application)return Promise.resolve(W.PIXI);return new Promise((resolve,reject)=>{
  const script=D.createElement('script');script.src=CDN;script.crossOrigin='anonymous';script.async=true;
  let done=false;const finish=(err)=>{if(done)return;done=true;clearTimeout(timer);if(err){script.remove();reject(err)}else resolve(W.PIXI)};
  const timer=setTimeout(()=>finish(Error('PixiJS download timed out')),7000);
  script.onload=()=>finish(W.PIXI?.Application?null:Error('PixiJS missing'));script.onerror=()=>finish(Error('PixiJS unavailable'));D.head.appendChild(script);
});}
function fallback(){epoch++;api.active=false;pending=false;signature='';size='';if(input)input.classList.remove('pixi-input');if(app){try{app.destroy(true,{children:true})}catch{}app=null;}status('Canvas');redraw?.();}
async function enable(){if(pending||api.active||!input)return;pending=true;const generation=++epoch;status('GPU…',true);let candidate=null;
 try{
   const P=await loadLibrary();if(generation!==epoch)return;
   candidate=new P.Application();await candidate.init({width:Math.max(1,input.clientWidth),height:Math.max(1,input.clientHeight),preference:'webgl',background:0x16495f,antialias:true,autoDensity:true,resolution:Math.min(W.devicePixelRatio||1,1.5),autoStart:false,sharedTicker:false,powerPreference:'low-power'});
   if(generation!==epoch){candidate.destroy(true,{children:true});return;}
   app=candidate;terrain=new P.Graphics();structures=new P.Graphics();motion=new P.Graphics();labels=new P.Container();app.stage.addChild(terrain,structures,labels,motion);
   app.canvas.classList.add('pc-pixi-surface');app.canvas.setAttribute('aria-hidden','true');input.parentNode.insertBefore(app.canvas,input);
   app.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback()},{once:true});
   input.classList.add('pixi-input');api.active=true;pending=false;signature='';status('PixiJS');redraw?.();
 }catch(e){if(candidate&&candidate!==app)try{candidate.destroy(true,{children:true})}catch{}if(generation===epoch)fallback();}
}
function start(canvas,requestFrame){input=canvas;redraw=requestFrame;const b=toggle();b?.addEventListener('click',()=>{if(api.active){requested=false;try{localStorage.setItem('pc-renderer','canvas')}catch{}fallback()}else{requested=true;try{localStorage.setItem('pc-renderer','pixi')}catch{}enable()}});
 try{requested=new URLSearchParams(location.search).get('renderer')!=='canvas'&&localStorage.getItem('pc-renderer')!=='canvas';if(new URLSearchParams(location.search).get('renderer')==='pixi')requested=true}catch{}status('Canvas');if(requested)enable();
}
const tint=(v,delta)=>{const n=typeof v==='string'?parseInt(v.replace('#',''),16):v;const c=k=>Math.max(0,Math.min(255,((n>>k)&255)+delta));return(c(16)<<16)|(c(8)<<8)|c(0)};
const poly=(g,pts,fill,stroke,width=1)=>{g.poly(pts.flat()).fill(fill);if(stroke!==undefined)g.stroke({color:stroke,width});};
const diamond=(g,x,y,w,h,fill,stroke)=>poly(g,[[x,y-h/2],[x+w/2,y],[x,y+h/2],[x-w/2,y]],fill,stroke,.7);
const line=(g,x,y,a,b,color,width=1)=>g.moveTo(x,y).lineTo(a,b).stroke({color,width,cap:'round'});
const rect=(g,x,y,w,h,color)=>g.rect(x,y,w,h).fill(color);
const circle=(g,x,y,r,color)=>g.circle(x,y,r).fill(color);
const point=(f,c,r)=>({x:f.origin.x+(c-r)*33*f.zoom,y:f.origin.y+(c+r)*18*f.zoom});
function block(g,x,y,w,d,h,t){
  const p=[[x,y-d/2],[x+w/2,y],[x,y+d/2],[x-w/2,y]],a=p.map(([u,v])=>[u,v-h]);
  poly(g,[a[3],a[2],p[2],p[3]],t.side,0x415b56,.5);
  poly(g,[a[2],a[1],p[1],p[2]],t.color,0x53635a,.5);
  poly(g,a,t.roof,0x5a6e62,.6);
}
function tree(g,x,y,z,seed){rect(g,x-1.3*z,y-11*z,2.6*z,11*z,0x80634b);circle(g,x,y-13*z,7*z,0x376955);circle(g,x-2*z,y-15*z,5.3*z,seed%2?0x8db779:0x72a875);}
function label(text,x,y,z){const P=W.PIXI;const t=new P.Text({text,style:{fontFamily:'Arial',fontSize:Math.max(9,10*z),fontWeight:'bold',fill:0xffe6a7,stroke:{color:0x183e46,width:3}}});t.anchor.set(.5);t.position.set(x,y);labels.addChild(t);}
function road(g,f,b,by){const p=point(f,b.c,b.r),z=f.zoom,w=66*z,h=36*z;
 diamond(g,p.x,p.y,w*.91,h*.91,0x5f7178,0x9ba8a4);
 for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]])if(by.get((b.c+dc)+':'+(b.r+dr))?.type==='road'){
 const n=point(f,b.c+dc*.46,b.r+dr*.46);line(g,p.x,p.y,n.x,n.y,0xf1d594,1.4*z);}
}
function drawArt(g,commands,x,y,z){for(const o of commands){if(o.kind==='poly')poly(g,o.pts.map(([u,v])=>[x+u*z,y+v*z]),o.fill,o.stroke,.55*z);else if(o.kind==='rect')rect(g,x+o.x*z,y+o.y*z,o.w*z,o.h*z,o.fill);else if(o.kind==='circle')circle(g,x+o.x*z,y+o.y*z,o.rad*z,o.fill);else line(g,x+o.x*z,y+o.y*z,x+o.x2*z,y+o.y2*z,o.stroke,o.width*z);}}
function building(g,f,b,by){const z=f.zoom,p=point(f,b.c,b.r),x=p.x,y=p.y,t=f.types[b.type],w=43*z,d=20*z;
 if(b.job?.kind==='build'){diamond(g,x,y,59*z,31*z,0xc0a780,0xf4d08b);line(g,x-11*z,y,x-11*z,y-31*z,0xf2bc59,2.2*z);line(g,x-11*z,y-31*z,x+20*z,y-31*z,0xf2bc59,2.2*z);line(g,x+20*z,y-31*z,x+20*z,y-13*z,0xf2bc59,1.5*z);rect(g,x-18*z,y+8*z,36*z,4*z,0x244651);rect(g,x-18*z,y+8*z,36*z*(1-b.job.remaining/b.job.duration),4*z,0xf3cc73);return;}
 if(b.type==='road'){road(g,f,b,by);return;}
 const art=W.PCArt?.model(b.type,b.level);if(art){drawArt(g,art,x,y,z);if(b.level>1)label(String(b.level),x,y+14*z,z);if(b.job?.kind==='upgrade'){rect(g,x-16*z,y+7*z,32*z,4*z,0x1b4652);rect(g,x-16*z,y+7*z,32*z*(1-b.job.remaining/b.job.duration),4*z,0xf3cc73);}return;}
 if(b.type==='park'){diamond(g,x,y,59*z,31*z,0x589777,0x9bbe85);for(const [dx,dy,k] of [[-13,-3,1],[12,-4,.9],[0,8,.8]])tree(g,x+dx*z,y+dy*z,z*k,b.id);return;}
 const h=(t.height+Math.min(Math.log2(b.level)*14,80))*z;
 diamond(g,x+2*z,y+2*z,61*z,33*z,{color:0x183e38,alpha:.27});
 block(g,x,y,w,d,h,t);
 // Original modular details: window bands, rooftop units and material changes by building type.
 for(let j=0;j<Math.min(6,Math.max(1,Math.floor(h/(12*z))));j++){
   const v=y-9*z-j*10*z;for(const k of [1,2]){poly(g,[[x+k*6*z,v-k*2*z],[x+k*6*z+4*z,v-k*2*z-2*z],[x+k*6*z+4*z,v-k*2*z+3*z],[x+k*6*z,v-k*2*z+5*z]],0xc8e1d8);}
 }
 if(b.type==='house'){poly(g,[[x-w/2,y-h],[x,y-h-d*.95],[x+w/2,y-h],[x,y-h+d*.52]],0xc77859,0x845742);}
 if(b.type==='clinic'){rect(g,x-5*z,y-h-6*z,10*z,3*z,0xc95757);rect(g,x-1.5*z,y-h-10*z,3*z,11*z,0xc95757);}
 if(b.type==='water'){circle(g,x,y-h-5*z,8*z,0x8bd9e0);circle(g,x,y-h-7*z,5*z,0xc1f0ed);}
 if(b.type==='power'){poly(g,[[x-12*z,y-h-4*z],[x+1*z,y-h-10*z],[x+13*z,y-h-5*z],[x,y-h+1*z]],0x315b86,0xb4d6e7);}
 if(b.type==='market'){for(let k=-2;k<=2;k++)line(g,x+k*5*z,y-h-3*z,x+k*5*z+5*z,y-h+1*z,k%2?0xe5b16b:0xb65a50,3*z);}
 if(b.type==='council'){line(g,x,y-h,x,y-h-18*z,0xe1d4ab,1.8*z);rect(g,x,y-h-18*z,10*z,6*z,0xe6c67a);label('◆',x,y-h-7*z,z);}
 if(b.type==='port'||b.type==='airport')label(b.type==='port'?'⚓':'✈',x,y-h-8*z,z);
 if(b.level>1)label(String(b.level),x,y-h-24*z,z);
 if(b.job?.kind==='upgrade'){rect(g,x-16*z,y+7*z,32*z,4*z,0x1b4652);rect(g,x-16*z,y+7*z,32*z*(1-b.job.remaining/b.job.duration),4*z,0xf3cc73);}
}
function render(f){if(!app||!api.active)return false;try{
 const sk=f.width+':'+f.height+':'+f.dpr;if(size!==sk){app.renderer.resize(f.width,f.height);size=sk;}
 const by=new Map(f.buildings.map(b=>[b.c+':'+b.r,b]));
 const key=[f.width,f.height,f.zoom,f.origin.x,f.origin.y,...Array.from({length:f.rows},(_,r)=>Array.from({length:f.cols},(_,c)=>+f.water(c,r)).join('')), ...f.buildings.map(b=>[b.id,b.c,b.r,b.type,b.level,b.job?.kind,b.job?.remaining].join(':'))].join('|');
 if(key!==signature){signature=key;terrain.clear();structures.clear();for(const child of labels.removeChildren())child.destroy();
   const z=f.zoom;
   for(let r=0;r<f.rows;r++)for(let c=0;c<f.cols;c++){const p=point(f,c,r),water=f.water(c,r),coast=!water&&f.water(c-1,r),v=((c*17+r*23)%7-3)*3;
    if(water){diamond(terrain,p.x,p.y,66*z,36*z,tint(0x2d839d,v),0x3c8ba1);if((c+r)%4===0)line(terrain,p.x-7*z,p.y,p.x+6*z,p.y,0x68aebb,.8*z);}
    else {diamond(terrain,p.x,p.y,66*z,36*z,tint(coast?0xc7b27f:0x729d7a,v),0x476e66);if(!coast&&!by.has(c+':'+r)&&(c*7+r*11)%13===0){circle(terrain,p.x-8*z,p.y+2*z,2*z,0xa3c48a);circle(terrain,p.x-4*z,p.y+4*z,1.4*z,0x91b77d);}}
   }
   for(const b of [...f.buildings].sort((a,b)=>(a.c+a.r)-(b.c+b.r)||a.c-b.c))building(structures,f,b,by);
 }
 motion.clear();const z=f.zoom;
 for(const b of f.buildings.filter(b=>b.type==='road'&&!b.job).slice(0,45)){const n=[[1,0],[0,1]].map(([dc,dr])=>by.get((b.c+dc)+':'+(b.r+dr))).find(n=>n?.type==='road'&&!n.job);if(n){const t=(f.tick*.045+b.id*.173)%1,p=point(f,b.c+(n.c-b.c)*t,b.r+(n.r-b.r)*t);if(W.PCArt)drawArt(motion,W.PCArt.vehicle(b.id),p.x,p.y,z);else motion.roundRect(p.x-5*z,p.y-4*z,10*z,6*z,2*z).fill(b.id%2?0xf0cc79:0x92d9db);}}
 if(f.hover){const p=point(f,f.hover.c,f.hover.r);diamond(motion,p.x,p.y,64*z,34*z,{color:f.canPlace(f.hover.c,f.hover.r)?0xf1c879:0xd96b65,alpha:.27},0xe6cf9b);}
 const selected=f.buildings.find(b=>b.id===f.selectedBuilding);if(selected){const p=point(f,selected.c,selected.r);motion.ellipse(p.x,p.y,31*z,16*z).stroke({color:0xf7d380,width:2*z});}
 if(f.night)motion.rect(0,0,f.width,f.height).fill({color:0x15244c,alpha:.21});
 app.render();return true;
 }catch(e){fallback();return false;}
}
})();
