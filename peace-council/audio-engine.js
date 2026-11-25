/* Peace Council — original procedural soundscape and score. No third-party recordings. */
(function(root){
'use strict';
const KEY='pc-audio-settings-v1';
const DEFAULTS=Object.freeze({master:65,music:45,effects:65,ambient:35});
const normalize=raw=>Object.fromEntries(Object.entries(DEFAULTS).map(([k,v])=>[k,typeof raw?.[k]==='number'&&Number.isFinite(raw[k])?Math.max(0,Math.min(100,Math.round(raw[k]))):v]));
const EFFECTS={
 click:[[0,440,.065,'sine',.18]],
 build:[[0,196,.12,'triangle',.3],[.10,294,.17,'triangle',.22],[.23,392,.22,'sine',.18]],
 upgrade:[[0,330,.12,'triangle',.2],[.12,440,.16,'triangle',.2],[.24,587,.24,'sine',.18]],
 complete:[[0,392,.16,'triangle',.23],[.13,494,.16,'triangle',.20],[.26,587,.20,'triangle',.18],[.42,784,.35,'sine',.15]],
 reward:[[0,392,.18,'triangle',.20],[.12,494,.18,'triangle',.20],[.24,587,.20,'triangle',.18],[.39,659,.24,'sine',.15],[.58,784,.42,'sine',.13]],
 trade:[[0,523,.07,'triangle',.18],[.09,659,.10,'sine',.18]],
 route:[[0,262,.13,'triangle',.2],[.15,392,.24,'sine',.18]],
 error:[[0,185,.10,'triangle',.17],[.12,147,.15,'sine',.13]],
 day:[[0,330,.20,'sine',.12],[.23,440,.30,'sine',.10]]
};
// An original short four-bar composition, expressed as MIDI pitches. No borrowed melody.
const SCORE=[
 {chord:[50,57,62,65],melody:[69,null,65,64,62,null,57,null]},
 {chord:[46,53,58,62],melody:[65,67,69,null,74,72,69,null]},
 {chord:[48,55,60,64],melody:[67,null,64,60,64,67,72,null]},
 {chord:[45,52,57,61],melody:[69,67,64,null,61,64,62,null]}
];
const hz=m=>440*Math.pow(2,(m-69)/12);
function create(host){
 let settings;try{settings=normalize(JSON.parse(host.localStorage.getItem(KEY)||'null'));}catch{settings=normalize();}
 let ctx=null,master=null,buses={},enabled=false,hidden=false,paused=false,scene={region:1,night:false,congestion:0},timer=null,nextAt=0,step=0,amb=null,lastEffect=-Infinity,opening=null;
 const nodes=new Set();
 const volume=(k)=>settings[k]/100;
 const setGain=(node,value)=>{if(!node||!ctx)return;node.gain.cancelScheduledValues(ctx.currentTime);node.gain.setTargetAtTime(value,ctx.currentTime,.045);};
 function apply(){setGain(master,enabled&&!hidden?volume('master')*.55:0);for(const k of ['music','effects','ambient'])setGain(buses[k],volume(k));}
 function persist(){try{host.localStorage.setItem(KEY,JSON.stringify(settings));}catch{}}
 function set(k,v){if(!Object.hasOwn(DEFAULTS,k))return;settings=normalize({...settings,[k]:Number(v)});persist();apply();}
 function reset(){settings=normalize();persist();apply();}
 function nodeEnd(node,gain){nodes.delete(node);try{node.disconnect();gain.disconnect();}catch{}}
 function tone(bus,at,f,dur,type,amp){if(!ctx||!buses[bus]||nodes.size>=96)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;
   g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(Math.max(.0001,amp),at+Math.min(.045,dur*.25));g.gain.exponentialRampToValueAtTime(.0001,at+dur);o.connect(g);g.connect(buses[bus]);nodes.add(o);o.onended=()=>nodeEnd(o,g);o.start(at);o.stop(at+dur+.015);}
 function stopTones(){for(const o of [...nodes]){try{o.stop();}catch{}nodes.delete(o);}}
 function stopAmbient(){if(amb){try{amb.source.stop();amb.source.disconnect();amb.filter.disconnect();amb.gain.disconnect();}catch{}amb=null;}}
 function ambient(){if(!ctx||amb||!enabled||hidden||paused)return;const len=ctx.sampleRate*3,buffer=ctx.createBuffer(1,len,ctx.sampleRate),samples=buffer.getChannelData(0);let seed=48271,v=0;
   for(let i=0;i<len;i++){seed=(seed*16807)%2147483647;v=.89*v+.11*(seed/2147483647*2-1);samples[i]=v;}
   const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';source.connect(filter);filter.connect(gain);gain.connect(buses.ambient);amb={source,filter,gain};sceneUpdate();source.start();}
 function sceneUpdate(){if(!amb||!ctx)return;const coastal=[0,1,2,3,4].includes(scene.region);const cutoff=scene.night?260:coastal?500+scene.congestion*3:420;amb.filter.frequency.setTargetAtTime(cutoff,ctx.currentTime,.6);setGain(amb.gain,scene.night?.075:.12+scene.congestion*.0005);}
 function schedule(){if(!enabled||hidden||paused||ctx?.state!=='running')return;const beat=.45;if(nextAt<ctx.currentTime-.05)nextAt=ctx.currentTime+.05;while(nextAt<ctx.currentTime+.35){const bar=SCORE[Math.floor(step/8)%SCORE.length],index=step%8;
   if(index===0)for(const m of bar.chord)tone('music',nextAt,hz(m),beat*7.6,'sine',scene.night?.020:.028);
   if(bar.melody[index]!==null)tone('music',nextAt,hz(bar.melody[index]),beat*.9,'triangle',scene.night?.035:.045);
   if(index%4===0)tone('music',nextAt,hz(bar.chord[0]-12),beat*1.5,'sine',.035);
   step++;nextAt+=beat;}}
 function startLoop(){if(timer===null)timer=host.setInterval(schedule,125);if(ctx){nextAt=ctx.currentTime+.05;schedule();ambient();}}
 function stopLoop(){if(timer!==null){host.clearInterval(timer);timer=null;}stopTones();stopAmbient();}
 async function enable(){if(enabled)return true;if(opening)return opening;opening=(async()=>{try{const AC=host.AudioContext||host.webkitAudioContext;if(!AC)return false;
   if(!ctx){ctx=new AC();master=ctx.createGain();master.connect(ctx.destination);for(const k of ['music','effects','ambient']){buses[k]=ctx.createGain();buses[k].connect(master);}}
   if(ctx.state==='suspended')await ctx.resume();if(ctx.state!=='running')return false;enabled=true;apply();if(!hidden&&!paused)startLoop();return true;
 }catch{return false;}finally{opening=null;}})();return opening;}
 function disable(){enabled=false;stopLoop();apply();}
 function setHidden(v){hidden=!!v;if(hidden){stopLoop();apply();}else{apply();if(enabled&&!paused)startLoop();}}
 function setPaused(v){paused=!!v;if(paused)stopLoop();else if(enabled&&!hidden)startLoop();}
 function setScene(v){scene={region:Number.isInteger(v?.region)?v.region:1,night:!!v?.night,congestion:Math.max(0,Math.min(100,Number(v?.congestion)||0))};sceneUpdate();}
 function effect(kind='click'){if(!enabled||hidden||ctx?.state!=='running')return false;const now=ctx.currentTime;if(now-lastEffect<.045)return false;lastEffect=now;for(const [delay,f,d,type,amp] of EFFECTS[kind]||EFFECTS.click)tone('effects',now+.015+delay,f,d,type,amp);return true;}
 return {enable,disable,setHidden,setPaused,setScene,effect,set,reset,get enabled(){return enabled},get settings(){return {...settings}},get running(){return enabled&&!hidden&&!paused&&ctx?.state==='running'}};
}
const api={create,normalize,DEFAULTS,EFFECTS,SCORE,hz};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PCAudio=api;
})(typeof window!=='undefined'?window:globalThis);
