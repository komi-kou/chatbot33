// Google Gemini API用のプロキシ（高品質・無料）
// APIキー取得: https://aistudio.google.com/app/apikey

const https = require('https');

async function callGeminiAPI(apiKey, systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nユーザーメッセージ: ${userMessage}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,  // Gemini 2.5 Proの最大出力トークンに設定
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
            // レスポンス構造をチェック
            if (parsedData.candidates && 
                parsedData.candidates[0] && 
                parsedData.candidates[0].content && 
                parsedData.candidates[0].content.parts && 
                parsedData.candidates[0].content.parts[0] &&
                parsedData.candidates[0].content.parts[0].text) {
              const reply = parsedData.candidates[0].content.parts[0].text;
              resolve({ reply });
            } else {
              // partsがない場合はエラー内容を含めて返す
              reject(new Error(`Gemini response format error: ${JSON.stringify(parsedData)}`));
            }
          } catch (e) {
            reject(new Error('Failed to parse Gemini response: ' + e.message));
          }
        } else {
          reject(new Error(`Gemini API error: ${responseData}`));
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

module.exports = { callGeminiAPI };