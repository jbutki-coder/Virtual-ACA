const formatters=new Map();
export function parts(date,zone) {
  if(!formatters.has(zone)) formatters.set(zone,new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));
  return Object.fromEntries(formatters.get(zone).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
}
export function localToUtc(year,month,day,hour,minute,zone) {
  const target=Date.UTC(year,month-1,day,hour,minute); let value=target;
  for(let i=0;i<5;i++){const p=parts(new Date(value),zone);const delta=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute)-target;if(!delta)break;value-=delta;}
  const p=parts(new Date(value),zone);
  // Skip wall-clock times that do not exist during a DST jump.
  return p.year===year&&p.month===month&&p.day===day&&p.hour===hour&&p.minute===minute?value:null;
}
export function occurrences(meetings,now=Date.now()) {
  const result=[];
  for(const meeting of meetings){
    const p=parts(new Date(now),meeting.zone);
    for(let offset=-1;offset<=8;offset++){
      const day=new Date(Date.UTC(p.year,p.month-1,p.day+offset));
      for(const slot of meeting.schedule){
        if(day.getUTCDay()!==slot.day)continue;
        const start=localToUtc(day.getUTCFullYear(),day.getUTCMonth()+1,day.getUTCDate(),slot.hour,slot.minute,meeting.zone);
        if(start!==null&&start>=now-3600000&&start<now+8*86400000)result.push({meeting,start});
      }
    }
  }
  return result.sort((a,b)=>a.start-b.start);
}
