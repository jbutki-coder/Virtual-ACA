export function text(html = '') {
  return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<(?:br\b[^>]*|\/p|\/li)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => { const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1),16) : Number(n); return code <= 0x10ffff ? String.fromCodePoint(code) : ''; })
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, e) => ({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '})[e]).replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}
export function safeUrl(value) {
  try { const url = new URL(text(value)); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function normalize(row, detail = row) {
  const schedule = [];
  for (let i=1;i<=7;i++) {
    const suffix = i===1 ? '' : i;
    const day = Number(detail['DayCode'+suffix]);
    const time = String(detail['Time_Local'+suffix] || '').match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (!time || day<1 || day>7 || Number(time[1])<1 || Number(time[1])>12 || Number(time[2])>59) continue;
    const hour = Number(time[1])%12 + (time[3].toLowerCase()==='pm' ? 12 : 0);
    const slot = {day:day-1, hour, minute:Number(time[2])};
    if (!schedule.some(s=>JSON.stringify(s)===JSON.stringify(slot))) schedule.push(slot);
  }
  const zone = row.Timezone;
  try { new Intl.DateTimeFormat('en',{timeZone:zone}).format(); if(!zone) throw Error(); } catch { throw new Error('Invalid timezone for '+row.WSONumber); }
  if (!schedule.length) throw new Error('No schedule for '+row.WSONumber);
  const virtualUrl = safeUrl(row.virtualInfo);
  const html = String(row.Location || '');
  const candidates = [...html.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(m=>safeUrl(m[0])).filter(Boolean);
  const rooms = [...new Set(candidates.filter(url=>/^(?:[\w-]+\.)?(?:zoom\.us|zoom\.com)$|^meet\.google\.com$|^teams\.microsoft\.com$/i.test(new URL(url).hostname)))];
  // A single published room is usable. Never guess among several day-specific IDs.
  const joinUrl = virtualUrl || (rooms.length===1 ? rooms[0] : '');
  return {id:row.WSONumber, name:text(row.MeetName) || 'ACA meeting '+row.WSONumber, zone, schedule,
    language:text(row.LangValue), country:text(row.Country), type:row.m_type.includes('meeting_and')?'Hybrid':'Online',
    access:row.OpenClosed==='C'?'ACAs only (closed)':row.OpenClosed==='O'?'Open to all':'',
    formats:text([row.Focus,row.Type,row.other_notes].filter(Boolean).join(' ')), notes:text(row.Notes), instructions:text(row.Location),
    joinUrl, website:safeUrl(row.pri_website), updateWarning:row.updateWarning==='show', updated:row.LastUpdate?.slice(0,10)||'',
    alert:text(row.alert_text), sourceUrl:'https://adultchildren.org/meeting-search/'};
}
