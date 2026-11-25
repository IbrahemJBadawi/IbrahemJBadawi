const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'game.js'),'utf8');
function load(){
  const nodes=new Map();
  const node=()=>({hidden:false,style:{},classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(k,f){this.listeners[k]=f},setAttribute(){},getBoundingClientRect(){return {width:800,height:500}},getContext(){return {}},querySelector(){return node()},appendChild(){},focus(){}});
  const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
  const old={version:1,day:1,coins:1000000,materials:100000,xp:0,mission:7,introDone:true,buildings:[{c:6,r:4,type:'house',level:6,id:1}]};
  let saved=JSON.stringify(old);
  const context={document:{hidden:false,getElementById:get,querySelectorAll:()=>[],addEventListener(){},createElement:node},window:{addEventListener(){},devicePixelRatio:1},localStorage:{getItem:()=>saved,setItem:(k,v)=>saved=v},navigator:{},location:{protocol:'http:'},requestAnimationFrame(){},setInterval(){},setTimeout(){},clearTimeout(){},console};
  vm.createContext(context);
  const exposed=source.replace(/\}\)\(\);\s*$/, 'globalThis.api={get state(){return state},validated,fresh,chooseBuild,place,upgrade,select:id=>{selectedBuilding=id},currentMission,completeMission,stats,canBuildType};})();');
  assert.notEqual(exposed,source);
  vm.runInContext(exposed,context);
  return {api:context.api,nodes,getSaved:()=>JSON.parse(saved),switchRegion:i=>get('regions').listeners.click({target:{closest:()=>({dataset:{region:String(i)}})}}),research:key=>get('research-list').listeners.click({target:{closest:()=>({dataset:{research:key}})}})};
}
test('v1 migration, upgrades beyond level 6, and saved levels survive validation',()=>{
  const {api,getSaved}=load();assert.equal(api.state.region,1);assert.equal(api.state.buildings[0].region,2);
  api.select(1);for(let i=0;i<15;i++)api.upgrade();
  assert.equal(api.state.buildings[0].level,21);assert.equal(api.validated(getSaved()).buildings[0].level,21);
});
test('all five regions are selectable; identical coordinates coexist in different regions',()=>{
  const {api,switchRegion,getSaved}=load();
  for(let i=0;i<5;i++){switchRegion(i);assert.equal(api.state.region,i);if(i!==2){api.chooseBuild('house');api.place(6,4);}}
  assert.equal(api.state.buildings.length,6);assert.equal(api.validated(getSaved()).buildings.length,6);
});
test('future port and airport enforce region and port coastal placement',()=>{
  const {api,switchRegion}=load();switchRegion(1);api.chooseBuild('port');api.place(7,7);assert.equal(api.state.buildings.length,2);
  api.place(2,5);assert.equal(api.state.buildings.length,3);api.place(2,6);assert.equal(api.state.buildings.length,3);
  switchRegion(4);api.chooseBuild('airport');api.place(8,8);assert.equal(api.state.buildings.length,4);
});
test('renewable missions advance repeatedly and research persists',()=>{
  const {api,research,getSaved}=load();
  for(let cycle=0;cycle<3;cycle++){const m=api.currentMission();for(let i=0;i<m.target;i++)research('japan');assert.ok(m.progress()>=m.target);api.completeMission();}
  assert.equal(api.state.mission,10);assert.ok(api.state.research.japan>0);assert.equal(api.currentMission().progress(),0);
  assert.equal(api.validated(getSaved()).research.japan,api.state.research.japan);
});
test('invalid duplicate tiles or unsafe levels rejected',()=>{
  const {api}=load();const raw=JSON.parse(JSON.stringify(api.state));raw.buildings.push({...raw.buildings[0]});assert.equal(api.validated(raw),null);
  raw.buildings.pop();raw.buildings[0].level=Number.MAX_SAFE_INTEGER+1;assert.equal(api.validated(raw),null);
});

test('new game starts at Gaza City with council headquarters',()=>{const {api}=load();const state=api.fresh();assert.equal(state.region,1);assert.equal(state.buildings.filter(b=>b.region===1).length,7);assert.equal(state.buildings.filter(b=>b.type==='council').length,1);assert.equal(api.state.buildings.filter(b=>b.type==='council').length,1);assert.equal(api.state.buildings.find(b=>b.type==='house').region,2);});
