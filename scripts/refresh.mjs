import fs from 'node:fs/promises';
import {normalize,text} from './normalize.mjs';
const origin='https://adultchildren.org';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function request(endpoint,body) {
  for(let attempt=0;attempt<3;attempt++) {
    try {
      const response=await fetch(origin+endpoint,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
      if(!response.ok) throw Error('ACA HTTP '+response.status);
      return body?await response.json():await response.text();
    } catch(error) { if(attempt===2) throw error; await pause(1500*(attempt+1)); }
  }
}
const query={page:1,countryFromIP:'',m_type:['online'],Timezone:'UTC',LangValue:'',Focus:[],Type:[],SearchText:'',Country:'',State:'',otherNotes:[],searchLocation:'',radius:'50',days:[],timesOfDay:[],I_GID:'',R_GID:'',showEditLink:false};
async function pool(items,fn) {
  const results=new Array(items.length); let next=0;
  await Promise.all([0,1].map(async()=>{while(next<items.length){const i=next++; results[i]=await fn(items[i]); await pause(150);}}));
  return results;
}
const first=await request('/wp-json/wsom/v1/meeting-search/',query);
if(!Array.isArray(first.results)||!Number.isInteger(first.pages)||first.pages<1||first.pages>200) throw Error('Unexpected ACA search response');
console.log('Loading '+first.pages+' pages of official ACA meetings');
const pages=await pool(Array.from({length:first.pages-1},(_,i)=>i+2),async page=>{
  const result=await request('/wp-json/wsom/v1/meeting-search/',{...query,page});
  if(!Array.isArray(result.results)||result.pages!==first.pages||result.page!==page) throw Error('ACA pagination changed; retry rather than publish an incomplete directory');
  return result.results;
});
const rows=[...first.results,...pages.flat()];
if(rows.length!==Number(first.filtered_count)) throw Error('Incomplete ACA directory');
const unique=[...new Map(rows.map(r=>[r.WSONumber,r])).values()];
console.log('Loading recurring days for '+unique.filter(r=>r.multiple_meetings==='1').length+' groups');
const meetings=await pool(unique,async row=>{
  let detail=row;
  if(row.multiple_meetings==='1') {
    const result=await request('/wp-json/wsom/v1/meeting-popup-details/',{SID:row.SID,I_GID:row.I_GID,R_GID:row.R_GID});
    detail=result.results?.[0]; if(!detail) throw Error('Missing recurring days for '+row.WSONumber);
  }
  return normalize(row,detail);
});
meetings.sort((a,b)=>a.id.localeCompare(b.id));
const snapshot={updatedAt:new Date().toISOString(),source:origin+'/meeting-search/',count:meetings.length,meetings};
await fs.mkdir('public/data',{recursive:true});
// Write only after every page and recurring schedule succeeds.
await fs.writeFile('public/data/meetings.json.tmp',JSON.stringify(snapshot));
await fs.rename('public/data/meetings.json.tmp','public/data/meetings.json');
try {
  const page=await request('/literature/meditation/');
  const title=text(page.match(/class="hwg-meditation-title"[^>]*>([\s\S]*?)<\/h2>/)?.[1]);
  const date=text(page.match(/class="date_text"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/)?.[1]);
  if(!title||!date) throw Error('Reading metadata not found');
  await fs.writeFile('public/data/reading.json',JSON.stringify({title,date,checkedAt:new Date().toISOString(),url:origin+'/literature/meditation/'}));
} catch(error) { console.warn('Reading title not updated: '+error.message); }
console.log('Saved '+meetings.length+' groups and '+meetings.reduce((n,m)=>n+m.schedule.length,0)+' weekly meeting times');
