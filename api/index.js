const { callGeminiAPI } = require('../gemini-proxy'); // パスを修正

// ヘルパー関数: リクエストボディを取得
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);
  
  if (pathname === '/api/chatwork-proxy' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const { endpoint, token, params } = JSON.parse(body);
      
      const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
      const apiUrl = `https://api.chatwork.com/v2/${endpoint}${queryString}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-ChatWorkToken': token
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chatwork API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));

    } catch (error) {
      console.error('Chatwork Proxy Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Chatwork API proxy failed', details: error.message }));
    }
  } else if (pathname === '/api/ai-proxy' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const { apiKey, systemPrompt, userMessage, aiProvider } = JSON.parse(body);

      if (aiProvider === 'gemini') {
        const geminiResponse = await callGeminiAPI(apiKey, systemPrompt, userMessage);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(geminiResponse));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unsupported AI provider' }));
      }
    } catch (error) {
      console.error('AI Proxy Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'AI API proxy failed', details: error.message }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
};