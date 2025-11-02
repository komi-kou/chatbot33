// Groq Cloud用のプロキシ（完全無料）
// APIキー取得: https://console.groq.com/keys

const https = require('https');

async function callGroqAPI(apiKey, systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      model: 'llama-3.1-8b-instant',  // 最新の無料高速モデル（2025年版）
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', chunk => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(responseData);
            const reply = parsedData.choices[0].message.content;
            resolve({ reply });
          } catch (e) {
            reject(new Error('Failed to parse Groq response'));
          }
        } else {
          reject(new Error(`Groq API error: ${responseData}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(requestData);
    req.end();
  });
}

module.exports = { callGroqAPI };