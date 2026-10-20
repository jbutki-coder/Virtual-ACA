import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('public');
http.createServer(async(req,res)=>{
 try { const url=new URL(req.url,'http://localhost'); const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream'); res.setHeader('Cache-Control','no-cache'); res.end(await fs.readFile(file));
 }catch{res.writeHead(404).end('Not found');}
}).listen(process.env.PORT||3001,()=>console.log('Preview: http://localhost:'+(process.env.PORT||3001)));
