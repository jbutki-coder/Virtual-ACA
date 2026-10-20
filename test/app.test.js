import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {normalize,safeUrl,text} from '../scripts/normalize.mjs';
import {occurrences,localToUtc} from '../public/time.js';
const row={WSONumber:'WEB0001',MeetName:'Test',Timezone:'America/New_York',DayCode:'2',Time_Local:'07:30 pm',m_type:'online',Location:'',virtualInfo:''};
test('all recurring days are preserved and duplicates removed',()=>{
  const m=normalize(row,{...row,DayCode2:'4',Time_Local2:'06:00 am',DayCode3:'4',Time_Local3:'06:00 am'});
  assert.deepEqual(m.schedule,[{day:1,hour:19,minute:30},{day:3,hour:6,minute:0}]);
});
test('published links retain passcodes; ambiguous links are not guessed',()=>{
  assert.equal(normalize({...row,virtualInfo:'https://zoom.us/j/123?pwd=abc&amp;test=1'}).joinUrl,'https://zoom.us/j/123?pwd=abc&test=1');
  assert.equal(normalize({...row,Location:'<a href="https://zoom.us/j/123">Monday</a> <a href="https://zoom.us/j/456">Tuesday</a>'}).joinUrl,'');
  assert.equal(safeUrl('javascript:alert(1)'),'');
  assert.equal(safeUrl('https://user:pass@example.com'),'');
  assert.equal(text('<script>alert(1)</script><p>A &amp; B</p>'),'A & B');
});
test('local schedules convert across DST and midnight',()=>{
  assert.equal(new Date(localToUtc(2026,10,19,19,30,'America/New_York')).toISOString(),'2026-10-19T23:30:00.000Z');
  assert.equal(new Date(localToUtc(2026,11,2,19,30,'America/New_York')).toISOString(),'2026-11-03T00:30:00.000Z');
  assert.equal(localToUtc(2026,3,8,2,30,'America/New_York'),null);
});
test('weekly occurrences include upcoming and recently started meetings',()=>{
  const m=normalize(row), now=Date.parse('2026-10-19T23:45:00Z');
  const slots=occurrences([m],now);
  assert.equal(slots.length,2);
  assert.equal(slots[0].start,Date.parse('2026-10-19T23:30:00Z'));
  assert.equal(slots[1].start,Date.parse('2026-10-26T23:30:00Z'));
});
test('invalid schedules fail instead of silently publishing wrong times',()=>{
  assert.throws(()=>normalize({...row,Timezone:'bad/zone'}));
  assert.throws(()=>normalize({...row,Time_Local:'25:99 am'}));
});
test('published snapshot is complete, unique, and contains usable public links',async()=>{
 const data=JSON.parse(await fs.readFile(new URL('../public/data/meetings.json',import.meta.url),'utf8'));
 assert.ok(data.meetings.length>100);assert.equal(data.count,data.meetings.length);
 assert.equal(new Set(data.meetings.map(m=>m.id)).size,data.count);
 assert.ok(data.meetings.some(m=>m.joinUrl.startsWith('https://')));
 for(const m of data.meetings){assert.ok(m.schedule.length);assert.ok(!m.joinUrl||safeUrl(m.joinUrl));assert.ok(!('SID' in m));}
});
