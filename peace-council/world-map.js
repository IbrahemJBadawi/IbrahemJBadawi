/* Governorate overview using geoBoundaries gbOpen PSE ADM2 (2017), CC BY 4.0.
   Local boards are separately scaled game simulations, not cadastral parcels. */
(function(root){
'use strict';
const SOURCE='https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09592ced973a3448cf66b6100b741b64c0d/releaseData/gbOpen/PSE/ADM2/geoBoundaries-PSE-ADM2_simplified.geojson';
const REGIONS=[
  {iso:'PS-NGZ',name:'شمال غزة',aliases:/north gaza|shamal|shamāl/i,center:[34.506,31.547]},
  {iso:'PS-GZA',name:'غزة • المقر',aliases:/^gaza(?: city)?$|^ghazz?ah?$/i,center:[34.445,31.486]},
  {iso:'PS-DEB',name:'دير البلح',aliases:/deir|dayr/i,center:[34.374,31.42]},
  {iso:'PS-KYS',name:'خان يونس',aliases:/khan|khān/i,center:[34.318,31.328]},
  {iso:'PS-RFH',name:'رفح',aliases:/rafah|rafaḥ/i,center:[34.283,31.282]}
];
function extract(data){
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Invalid boundary data');
  return REGIONS.map((region,index)=>{
    const feature=data.features.find(f=>f.properties?.shapeISO===region.iso||region.aliases.test(String(f.properties?.shapeName||'')));
    if(!feature||!['Polygon','MultiPolygon'].includes(feature.geometry?.type))throw Error('Missing '+region.iso);
    const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
    if(!polygons.length||polygons.some(p=>!p.length||p.some(r=>r.length<4||r.some(pt=>!Array.isArray(pt)||!Number.isFinite(pt[0])||!Number.isFinite(pt[1])||pt[0]<34||pt[0]>35||pt[1]<31||pt[1]>32))))throw Error('Invalid Gaza coordinates');
    return {...region,index,polygons};
  });
}
if(typeof module!=='undefined'&&module.exports){module.exports={extract,SOURCE,REGIONS};return}
const svg=root.document?.getElementById('gaza-world-map'),status=root.document?.getElementById('map-data-status');
if(!svg||!status)return;
const ns='http://www.w3.org/2000/svg';let current=1,selectedDistrict=null,levels={};
function element(tag,attrs){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n}
function highlight(index,district=null){current=index;selectedDistrict=district;svg.querySelectorAll('[data-governorate]').forEach(el=>{const selected=Number(el.dataset.governorate)===index;el.classList.toggle('active',selected);el.setAttribute('aria-pressed',String(selected))});svg.querySelectorAll('[data-place]').forEach(el=>{const selected=el.dataset.place===selectedDistrict;el.classList.toggle('active',selected);el.setAttribute('aria-pressed',String(selected))})}
function setNetwork(value){levels=value||{};svg.querySelectorAll('[data-link]').forEach(el=>{const n=levels[el.dataset.link]||0;el.classList.toggle('connected',n>0);el.setAttribute('stroke-width',String(n>0?1.4+Math.min(2,Math.log2(n+1))*.5:1.1));})}
function render(features){
  const all=features.flatMap(f=>f.polygons.flat(2)),xs=all.map(p=>p[0]*Math.cos(31.4*Math.PI/180)),ys=all.map(p=>p[1]);
  const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),w=340,h=420,pad=28,scale=Math.min((w-2*pad)/(xmax-xmin),(h-2*pad)/(ymax-ymin));
  const project=([lon,lat])=>[pad+(w-2*pad-(xmax-xmin)*scale)/2+(lon*Math.cos(31.4*Math.PI/180)-xmin)*scale,pad+(ymax-lat)*scale];
  svg.replaceChildren();svg.setAttribute('viewBox','0 0 340 420');
  const sea=element('text',{x:25,y:80,class:'geo-sea-label'});sea.textContent='البحر المتوسط';svg.appendChild(sea);
  for(const f of features){
    const d=f.polygons.flatMap(p=>p.map(r=>r.map((pt,i)=>{const [x,y]=project(pt);return (i?'L':'M')+x.toFixed(2)+','+y.toFixed(2)}).join(' ')+' Z')).join(' ');
    const path=element('path',{d,'fill-rule':'evenodd','data-governorate':f.index,tabindex:0,role:'button','aria-label':f.name,class:'geo-region'});
    const title=element('title',{});title.textContent=f.name;path.appendChild(title);
    const select=()=>root.dispatchEvent(new CustomEvent('pc-region',{detail:f.index}));
    path.addEventListener('click',select);path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}});
    svg.appendChild(path);
  }
  const network=root.PCNetwork;
  if(network){
    // Deliberately stylized gameplay corridors, not surveyed road geometry.
    for(const route of network.ROUTES){
      const a=project(features[route.from].center),b=project(features[route.to].center),offset=route.kind==='rashid'?-13:8;
      const path=element('path',{d:'M'+(a[0]+offset)+','+a[1]+' Q'+((a[0]+b[0])/2+offset)+','+((a[1]+b[1])/2)+' '+(b[0]+offset)+','+b[1],class:'geo-corridor '+route.kind,'data-link':route.id,fill:'none','pointer-events':'none'});
      svg.appendChild(path);
    }
    for(const f of features){const [x,y]=project(f.center);const label=element('text',{x:x+9,y:y-13,class:'geo-label','text-anchor':'middle','pointer-events':'none'});label.textContent=f.name;svg.appendChild(label)}
    for(const m of network.PLACES){
      const [x,y]=project(m.point),g=element('g',{tabindex:0,role:'button','aria-label':m.name,'data-place':m.id,class:'geo-place'});
      const title=element('title',{});title.textContent=m.name+' • '+m.role;g.appendChild(title);
      g.appendChild(element('circle',{cx:x,cy:y,r:m.id==='gaza'?6:4.5}));
      if(['gaza','port','airport','deir','khan-yunis','rafah'].includes(m.id)){const t=element('text',{x:x-7,y:y+3,class:'geo-place-label','text-anchor':'end','pointer-events':'none'});t.textContent=m.id==='port'?'الميناء':m.id==='airport'?'المطار':m.name;g.appendChild(t);}
      const select=()=>root.dispatchEvent(new CustomEvent('pc-district',{detail:m.id}));
      g.addEventListener('click',select);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}});
      svg.appendChild(g);
    }
  }
  highlight(current,selectedDistrict);setNetwork(levels);
  status.textContent='حدود إدارية مرجعية 2017 • نقاط المدن تقريبية • المسارات تخطيطية';
}
root.PCWorldMap={highlight,setNetwork};
async function load(){
  try{
    let data;
    try{const local=await fetch('gaza-governorates.geojson');if(local.ok)data=await local.json()}catch{}
    if(!data){const response=await fetch(SOURCE,{credentials:'omit'});if(!response.ok)throw Error('Boundary unavailable');data=await response.json()}
    render(extract(data));
  }catch(e){status.textContent='تعذّر تحميل الحدود الجغرافية. استخدم قائمة المحافظات للتنقل.'}
}
load();
})(typeof window!=='undefined'?window:globalThis);
