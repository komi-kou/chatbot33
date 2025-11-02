const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { callGroqAPI } = require('./groq-proxy');
const { callGeminiAPI } = require('./gemini-proxy');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/api/chatwork-proxy' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { endpoint, token, params } = data;
        
        const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
        const apiUrl = `https://api.chatwork.com/v2/${endpoint}${queryString}`;
        
        const options = {
          hostname: 'api.chatwork.com',
          path: `/v2/${endpoint}${queryString}`,
          method: 'GET',
          headers: {
            'X-ChatWorkToken': token
          }
        };
        
        const chatworkReq = https.request(options, (chatworkRes) => {
          let responseData = '';
          
          chatworkRes.on('data', chunk => {
            responseData += chunk;
          });
          
          chatworkRes.on('end', () => {
            res.writeHead(chatworkRes.statusCode, {
              'Content-Type': 'application/json'
            });
            
            if (chatworkRes.statusCode >= 200 && chatworkRes.statusCode < 300) {
              res.end(responseData);
            } else {
              res.end(JSON.stringify({ error: responseData }));
            }
          });
        });
        
        chatworkReq.on('error', (e) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        });
        
        chatworkReq.end();
        
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    
  } else if (parsedUrl.pathname === '/api/ai-proxy' && req.method === 'POST') {
    console.log('AI Proxy request received');
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { apiKey, systemPrompt, userMessage, aiProvider } = data;
        console.log('AI Provider:', aiProvider);
        console.log('API Key length:', apiKey ? apiKey.length : 'undefined');
        
        if (aiProvider === 'groq') {
          // Groq (無料)
          try {
            const result = await callGroqAPI(apiKey, systemPrompt, userMessage);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        } else if (aiProvider === 'gemini' || !aiProvider) {
          // Google Gemini (無料・高品質)
          try {
            const result = await callGeminiAPI(apiKey, systemPrompt, userMessage);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        } else if (aiProvider === 'claude') {
          // Claude API (有料)
          const requestData = JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{
              role: 'user',
              content: userMessage
            }]
          });
          
          const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Length': Buffer.byteLength(requestData)
            }
          };
          
          const claudeReq = https.request(options, (claudeRes) => {
            let responseData = '';
            
            claudeRes.on('data', chunk => {
              responseData += chunk;
            });
            
            claudeRes.on('end', () => {
              if (claudeRes.statusCode >= 200 && claudeRes.statusCode < 300) {
                try {
                  const parsedData = JSON.parse(responseData);
                  const reply = parsedData.content[0].text;
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ reply }));
                } catch (e) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Failed to parse Claude response' }));
                }
              } else {
                res.writeHead(claudeRes.statusCode, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: responseData }));
              }
            });
          });
          
          claudeReq.on('error', (e) => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          });
          
          claudeReq.write(requestData);
          claudeReq.end();
        }
        
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
      }
    });
    
  } else {
    // 静的ファイル配信
    let filePath = parsedUrl.pathname === '/' ? '/index-free.html' : parsedUrl.pathname;
    filePath = path.join(__dirname, filePath);
    
    // セキュリティ: ディレクトリトラバーサル攻撃を防ぐ
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
        return;
      }
      
      // MIMEタイプを設定
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      if (ext === '.js') contentType = 'application/javascript';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.json') contentType = 'application/json';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  }
});

server.listen(PORT, () => {
  console.log(`Proxy server (FREE AI版) running at http://localhost:${PORT}`);
  console.log('');
  console.log('🎯 無料AIを使用するには:');
  console.log('1. https://console.groq.com でアカウント作成（無料）');
  console.log('2. APIキーを取得');
  console.log('3. ツールの設定画面でGroq APIキーを入力');
  console.log('');
  console.log('Endpoints:');
  console.log('- Chatwork proxy: http://localhost:3001/api/chatwork-proxy');
  console.log('- AI proxy: http://localhost:3001/api/ai-proxy');
});