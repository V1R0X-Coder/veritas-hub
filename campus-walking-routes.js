/* Route only over verified, published campus walking segments. */
(() => {
 'use strict';
 const URL='https://wutgiojgomcsocfqxnml.supabase.co';
 const KEY='sb_publishable_3-xb2zcXFzqfSiTKqip7Lw_6KF9qiI_';
 const el=id=>document.getElementById(id);
 let nodes=[],edges=[];
 async function loadTable(table,select){
   const res=await fetch(URL+'/rest/v1/'+table+'?published=eq.true&select='+encodeURIComponent(select),
     {headers:{apikey:KEY}});
   if(!res.ok)throw new Error('Verified walking network is unavailable.');
   return res.json();
 }
 function option(select,node){
   const item=document.createElement('option');item.value=node.id;item.textContent=node.name;select.append(item);
 }
 async function load(){
   const status=el('verifiedWalkingRouteStatus');
   if(!status)return;
   try{
     [nodes,edges]=await Promise.all([
       loadTable('veritashub_verified_campus_locations','id,name'),
       loadTable('veritashub_campus_walking_edges',
         'from_location_id,to_location_id,distance_m,estimated_minutes,path_note,accessible')
     ]);
     for(const node of nodes){
       option(el('verifiedWalkingStart'),node);
       option(el('verifiedWalkingEnd'),node);
     }
     status.textContent=edges.length
       ?edges.length+' verified walking segment(s) available.'
       :'No verified walking routes are published yet. Do not rely on unverified shortcuts.';
   }catch(error){status.textContent=error.message;}
 }
 window.findVerifiedCampusWalkingRoute=()=>{
   const start=el('verifiedWalkingStart').value,end=el('verifiedWalkingEnd').value;
   const steps=el('verifiedWalkingRouteSteps'),status=el('verifiedWalkingRouteStatus');
   steps.replaceChildren();
   if(!start||!end){status.textContent='Select both verified locations.';return;}
   if(start===end){status.textContent='You are already at the selected destination.';return;}
   const graph=new Map(nodes.map(n=>[n.id,[]]));
   for(const e of edges){
     if(!graph.has(e.from_location_id)||!graph.has(e.to_location_id))continue;
     graph.get(e.from_location_id).push({to:e.to_location_id,edge:e});
     graph.get(e.to_location_id).push({to:e.from_location_id,edge:e});
   }
   const dist=new Map([[start,0]]),prev=new Map(),unvisited=new Set(nodes.map(n=>n.id));
   while(unvisited.size){
     let current=null,best=Infinity;
     for(const id of unvisited){
       const value=dist.get(id)??Infinity;
       if(value<best){best=value;current=id;}
     }
     if(current===null||current===end)break;
     unvisited.delete(current);
     for(const step of graph.get(current)||[]){
       const alt=best+step.edge.distance_m;
       if(alt<(dist.get(step.to)??Infinity)){
         dist.set(step.to,alt);prev.set(step.to,{from:current,edge:step.edge});
       }
     }
   }
   if(!prev.has(end)){
     status.textContent='No fully verified walking route connects these locations. Please ask campus staff for directions.';
     return;
   }
   const names=new Map(nodes.map(n=>[n.id,n.name]));
   const route=[];let cursor=end;
   while(cursor!==start){
     const step=prev.get(cursor);if(!step){status.textContent='Route could not be resolved.';return;}
     route.unshift({from:step.from,to:cursor,edge:step.edge});cursor=step.from;
   }
   let minutes=0;
   for(const segment of route){
     minutes+=segment.edge.estimated_minutes;
     const item=document.createElement('li');
     item.textContent='Walk from '+names.get(segment.from)+' to '+names.get(segment.to)+
       ' ('+segment.edge.distance_m+' m, about '+segment.edge.estimated_minutes+' min). '+
       segment.edge.path_note+(segment.edge.accessible?' · Marked accessible.':' · Accessibility not confirmed.');
     steps.append(item);
   }
   status.textContent='Verified route: '+dist.get(end)+' m, about '+minutes+
     ' min across '+route.length+' checked segment(s). Follow local signs and conditions.';
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);
 else load();
})();
