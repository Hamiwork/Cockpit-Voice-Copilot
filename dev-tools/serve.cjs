// 仅提供静态文件预览，不包含任何产品后端。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {execFile} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const base = '/'+String(process.env.PREVIEW_BASE_PATH||'').replace(/^\/+|\/+$/g,'');
const mount = base==='/'?'':base;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
const server = http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Invalid URL');return;}
  if(mount){if(pathname===mount){res.writeHead(302,{'Location':mount+'/'});res.end();return;}if(!pathname.startsWith(mount+'/')){res.writeHead(404);res.end('Not found');return;}pathname=pathname.slice(mount.length);}
  const file=path.resolve(root, pathname==='/'?'index.html':'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
});
function openPreview(){if(process.argv.includes('--open')&&process.platform==='darwin')execFile('open',[`http://localhost:${port}${mount}/`]);}
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 正在使用。可直接打开 http://localhost:${port}，或设置 PORT=4174。`:error.message);if(error.code==='EADDRINUSE')openPreview();process.exit(error.code==='EADDRINUSE'?0:1);});
server.listen(port,'127.0.0.1',()=>{console.log(`智能座舱语音优化工作台\nLocal: http://localhost:${port}${mount}/\n按 Control + C 停止预览。`);openPreview();});
