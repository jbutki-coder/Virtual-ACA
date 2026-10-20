import {occurrences} from './time.js';
const $=id=>document.getElementById(id);
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const dateKey=date=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?escape(u.href):'';}catch{return '';}};
let snapshot=null, slots=[], day='now', limit=40, loading=false;
const timeFormat=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'});
function setDays(){
  const buttons=[['now','Now'],['all','All week']];
  for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()+i);buttons.push([dateKey(d),i===0?'Today':new Intl.DateTimeFormat('en',{weekday:'short'}).format(d)]);}
  if(!buttons.some(b=>b[0]===day))day='now';
  $('days').replaceChildren(...buttons.map(([value,label])=>{const b=document.createElement('button');b.textContent=label;b.type='button';b.setAttribute('aria-pressed',String(value===day));b.onclick=()=>{day=value;limit=40;setDays();render();};return b;}));
}
function render(){
  if(!snapshot)return;
  const now=Date.now(), search=$('search').value.toLocaleLowerCase().trim(),language=$('language').value,time=$('time').value;
  const list=slots.filter(({meeting:m,start})=>{
    const date=new Date(start),hour=date.getHours();
    if(day==='now'&&(start<now-3600000||start>now+3*3600000))return false;
    if(day!=='now'&&day!=='all'&&dateKey(date)!==day)return false;
    if(day==='all'&&start>now+7*86400000)return false;
    if(language&&m.language!==language)return false;
    if($('direct').checked&&!m.joinUrl)return false;
    if(time==='morning'&&(hour<5||hour>=12)||time==='afternoon'&&(hour<12||hour>=17)||time==='evening'&&hour<17||time==='overnight'&&hour>=5)return false;
    return !search||[m.name,m.id,m.formats,m.notes,m.instructions,m.country].join(' ').toLocaleLowerCase().includes(search);
  });
  $('count').textContent=list.length+' meeting times';
  $('result-heading').textContent=day==='now'?'Recently started & starting soon':day==='all'?'The week ahead':new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric'}).format(new Date(day+'T12:00:00'));
  $('now-note').hidden=day!=='now';
  $('results').innerHTML=list.slice(0,limit).map(({meeting:m,start})=>{
    const d=new Date(start),link=url(m.joinUrl),official=url(m.sourceUrl);
    const direct=link&&/zoom\.(us|com)|meet\.google\.com|teams\.microsoft\.com/.test(new URL(m.joinUrl).hostname);
    return `<article class="meeting card"><div class="clock"><strong>${escape(timeFormat.format(d))}</strong><span>${escape(new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'}).format(d))}${start<now?' · Started':''}</span></div><div><h4>${escape(m.name)}</h4><div class="tags">${[m.language,m.type,m.access].filter(Boolean).map(t=>'<span class="tag">'+escape(t)+'</span>').join('')}</div><p class="format">${escape(m.formats)}</p>${m.updateWarning?'<p class="warning">ACA flags this listing for an update. Confirm details with the group.</p>':''}${m.alert?'<p class="warning">'+escape(m.alert)+'</p>':''}<details><summary>Meeting details &amp; access instructions</summary><div class="instructions">${escape([m.instructions,m.notes].filter(Boolean).join('\n\n'))}</div><p class="muted">${escape(m.id)} · Original timezone: ${escape(m.zone)}${m.updated?' · Listing updated '+escape(m.updated):''}</p></details><div class="actions">${link?'<a class="button join" href="'+link+'" target="_blank" rel="noopener noreferrer">'+(direct?'Join meeting ↗':'Meeting access ↗')+'</a>':'<span class="muted">See access instructions or contact the group.</span>'}<a href="${official}" target="_blank" rel="noopener noreferrer">Find ${escape(m.id)} on ACA ↗</a>${m.website?'<a href="'+url(m.website)+'" target="_blank" rel="noopener noreferrer">Group website ↗</a>':''}</div></div></article>`;
  }).join('')||'<div class="empty card">No meetings match these filters. Try All week, another language, or clear your search.</div>';
  $('more').hidden=list.length<=limit;
}
async function load(){
 if(loading)return;loading=true;$('refresh').disabled=true;
 try{const response=await fetch('/data/meetings.json',{cache:'no-cache',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();const data=await response.json();if(!data.meetings?.length)throw Error();snapshot=data;slots=occurrences(data.meetings);const selected=$('language').value;
 $('language').replaceChildren(new Option('All languages',''),...[...new Set(data.meetings.map(m=>m.language).filter(Boolean))].sort().map(l=>new Option(l,l)));$('language').value=selected;
 const age=Date.now()-Date.parse(data.updatedAt);$('status').textContent=`${data.count.toLocaleString()} ACA groups · Directory updated ${new Date(data.updatedAt).toLocaleString()}. `+(age>48*3600000?'This snapshot is over 48 hours old; check the official directory.':'Updates are scheduled daily. Refresh checks for the latest published list.');render();
 }catch{$('status').textContent=snapshot?'Could not refresh. The previously loaded list remains available.':'Could not load the meeting list. Please refresh or use the official directory below.';if(!snapshot)$('results').innerHTML='<div class="empty card"><a href="https://adultchildren.org/meeting-search/" target="_blank" rel="noopener noreferrer">Open ACA’s official meeting directory ↗</a></div>';}
 finally{loading=false;$('refresh').disabled=false;}
}
async function reading(){try{const r=await fetch('/data/reading.json',{cache:'no-cache'});if(!r.ok)return;const data=await r.json();const today=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric'}).format(new Date());if(data.date===today)$('reading-description').textContent=data.date+' · '+data.title;}catch{}}
$('timezone').textContent='Times shown in your timezone: '+zone;
for(const id of ['search','language','time','direct'])$(id).addEventListener(id==='search'?'input':'change',()=>{limit=40;render();});
$('refresh').onclick=()=>{load();reading();};$('more').onclick=()=>{limit+=40;render();};
setDays();load();reading();setInterval(()=>{setDays();if(snapshot){slots=occurrences(snapshot.meetings);render();}},60000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
