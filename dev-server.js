// Local development server: static files + /api/ai serverless handler.
// Usage: YUNWU_API_KEY=... node dev-server.js 8081

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 8081);
const HOST = process.env.HOST || '127.0.0.1';

function loadEnvFile(file){
  const target = path.join(ROOT, file);
  if(!fs.existsSync(target)) return;
  const lines = fs.readFileSync(target, 'utf8').split(/\r?\n/);
  for(const line of lines){
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if(!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnvFile('.env.local');
loadEnvFile('.env');

const aiHandler = require('./api/ai');

const MIME = {
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.ico':'image/x-icon',
  '.mp3':'audio/mpeg',
  '.ogg':'audio/ogg',
  '.wav':'audio/wav'
};

function send(res, status, body, headers){
  res.writeHead(status, headers || {});
  res.end(body);
}

function serveStatic(req, res, pathname){
  const clean = decodeURIComponent(pathname).replace(/^\/+/, '');
  const rel = clean || 'index.html';
  const file = path.resolve(ROOT, rel);
  if(!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){
    send(res, 404, 'Not found', {'Content-Type':'text/plain; charset=utf-8'});
    return;
  }
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {'Content-Type':type});
  if(req.method === 'HEAD') res.end();
  else fs.createReadStream(file).pipe(res);
}

function readBody(req){
  return new Promise((resolve, reject)=>{
    let raw = '';
    req.on('data', chunk=>{
      raw += chunk;
      if(raw.length > 1024 * 1024){
        reject(new Error('body_too_large'));
        req.destroy();
      }
    });
    req.on('end', ()=>resolve(raw));
    req.on('error', reject);
  });
}

async function handleApi(req, res){
  const raw = await readBody(req);
  const body = raw ? JSON.parse(raw) : {};
  const localRes = {
    statusCode: 200,
    status(code){ this.statusCode = code; return this; },
    json(payload){
      send(res, this.statusCode, JSON.stringify(payload), {'Content-Type':'application/json; charset=utf-8'});
    }
  };
  await aiHandler({ method:req.method, body }, localRes);
}

const server = http.createServer(async (req, res)=>{
  try{
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    if(url.pathname === '/api/ai'){
      await handleApi(req, res);
      return;
    }
    if(req.method !== 'GET' && req.method !== 'HEAD'){
      send(res, 405, 'Method not allowed', {'Content-Type':'text/plain; charset=utf-8'});
      return;
    }
    serveStatic(req, res, url.pathname);
  }catch(e){
    send(res, 500, String(e && e.message || e), {'Content-Type':'text/plain; charset=utf-8'});
  }
});

server.listen(PORT, HOST, ()=>{
  const keyState = process.env.YUNWU_API_KEY ? 'YUNWU_API_KEY loaded' : 'YUNWU_API_KEY missing, AI calls will fallback';
  console.log(`Shan Na Bian dev server: http://${HOST}:${PORT}/ (${keyState})`);
});
