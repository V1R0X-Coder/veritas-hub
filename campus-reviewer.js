/* Reviewer RPCs enforce authorization server-side. Never use a service key here. */
(() => {
 'use strict';
 const URL='https://wutgiojgomcsocfqxnml.supabase.co';
 const KEY='sb_publishable_3-xb2zcXFzqfSiTKqip7Lw_6KF9qiI_';
 const el=id=>document.getElementById(id);
 function token(){
   try{return JSON.parse(localStorage.getItem('veritas-academic-session')||'null')?.access_token||null;}
   catch(_){return null;}
 }
 async function rpc(name,body){
   const t=token();if(!t)throw new Error('Academic sign-in required.');
   const res=await fetch(URL+'/rest/v1/rpc/'+name,{
     method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+t,'Content-Type':'application/json'},
     body:JSON.stringify(body)
   });
   const data=await res.json().catch(()=>null);
   if(!res.ok)throw new Error(data?.message||'Review request failed.');
   return data;
 }
 window.loadCampusReviewQueue=async()=>{
   const status=el('campusReviewStatus'),list=el('campusReviewQueue');
   if(!status||!list)return;
   list.replaceChildren();
   status.textContent='Loading pending review submissions…';
   try{
     const rows=await rpc('veritashub_campus_review_queue',{});
     el('campusReviewerPanel').hidden=false;
     status.textContent=rows.length+' pending submission(s). Approvals remain unpublished.';
     for(const row of rows){
       const card=document.createElement('div');card.className='panel';
       const title=document.createElement('h4');title.textContent=row.proposed_name;
       const details=document.createElement('p');
       details.textContent=row.proposed_category+' · '+row.proposed_latitude+', '+row.proposed_longitude+
         ' · Campus contact: '+row.campus_contact;
       const evidence=document.createElement('p');evidence.textContent=row.evidence_description;
       const note=document.createElement('textarea');note.placeholder='Review explanation (at least 10 characters)';
       note.setAttribute('aria-label','Review explanation for '+row.proposed_name);
       const source=document.createElement('textarea');
       source.placeholder='Independent onsite verification source (required for approval)';
       source.setAttribute('aria-label','Independent verification source for '+row.proposed_name);
       const accessibility=document.createElement('input');
       accessibility.placeholder='Accessibility note (optional)';
       accessibility.setAttribute('aria-label','Accessibility note for '+row.proposed_name);
       const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
       for(const decision of ['approved','rejected']){
         const button=document.createElement('button');button.type='button';button.className='btn light';
         button.textContent=decision==='approved'?'Approve (unpublished)':'Reject';
         button.addEventListener('click',async()=>{
           if(!confirm('Confirm '+decision+' review of '+row.proposed_name+'?'))return;
           button.disabled=true;
           try{
             await rpc('veritashub_review_campus_location',{
               p_submission_id:row.id,p_decision:decision,p_note:note.value,
               p_verification_source:source.value,p_accessibility_note:accessibility.value
             });
             await window.loadCampusReviewQueue();
           }catch(error){status.textContent=error.message;button.disabled=false;}
         });
         actions.append(button);
       }
       card.append(title,details,evidence,note,source,accessibility,actions);list.append(card);
     }
   }catch(error){
     if(/authorization required|sign-in required|JWT|401|403/i.test(error.message)){
       el('campusReviewerPanel').hidden=true;
     }else status.textContent=error.message;
   }
 };
 async function checkReviewer(){
   if(!token())return;
   try{await window.loadCampusReviewQueue();}catch(_){}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',checkReviewer);
 else checkReviewer();
})();
