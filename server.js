// Run with Node.js 20+: node server.js
// Serves catalog and a conservative, cached, on-demand Steam Market price proxy.
// NOT intended for large-scale bulk extraction. Responses may be unavailable/rate-limited.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const cache=new Map(); let lastRequest=0;const PORT=process.env.PORT||3000;
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true}))}if(url.pathname==='/api/steam-price'){
 const name=url.searchParams.get('name')||'';if(!name||name.length>240){res.writeHead(400);return res.end('Invalid name')}
 const cached=cache.get(name);if(cached&&Date.now()-cached.t<3600000){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'public,max-age=300'});return res.end(JSON.stringify(cached.data))}
 if(Date.now()-lastRequest<3000){res.writeHead(429,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Price request cooling down'}))}
 lastRequest=Date.now();try{const p=new URL('https://steamcommunity.com/market/priceoverview/');p.searchParams.set('appid','730');p.searchParams.set('currency','1');p.searchParams.set('market_hash_name',name);let r=await fetch(p,{headers:{'User-Agent':'TrueGamingCatalog/1.0'},signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error('Steam '+r.status);let data=await r.json();if(!data.success)throw Error('Steam unavailable');cache.set(name,{t:Date.now(),data});res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'public,max-age=300'});res.end(JSON.stringify(data))}catch(e){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Steam unavailable'}))}return}
 if(url.pathname==='/'||url.pathname==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return fs.createReadStream(path.join(__dirname,'index.html')).pipe(res)}res.writeHead(404);res.end('Not found')});server.listen(PORT,'0.0.0.0',()=>console.log('Server running on port '+PORT));
