import fs from 'node:fs/promises';
const data=JSON.parse(await fs.readFile('public/data/meetings.json','utf8'));
if(!data.meetings?.length || !data.updatedAt) throw Error('Run npm run refresh to create a valid meeting snapshot first');
await fs.mkdir('dist',{recursive:true});
await fs.cp('public','dist',{recursive:true});
console.log('Built static site with '+data.meetings.length+' ACA groups');
