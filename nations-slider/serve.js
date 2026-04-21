const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5500;
const BASE = __dirname;

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
};

http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/nations_slider_widget.html' : req.url;
  const file = path.join(BASE, urlPath);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Serving nations-slider on http://localhost:${PORT}`));
