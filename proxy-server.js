const http = require('http');
const https = require('https');
const url = require('url');

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
    
  } else if (parsedUrl.pathname === '/api/claude-proxy' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { apiKey, systemPrompt, userMessage } = data;
        
        const requestData = JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',  // 最新のClaude 3.5 Sonnet
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
        
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
  console.log('Chatwork proxy endpoint: http://localhost:3001/api/chatwork-proxy');
  console.log('Claude proxy endpoint: http://localhost:3001/api/claude-proxy');
});