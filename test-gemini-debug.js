// Gemini APIのデバッグテスト
const https = require('https');

const testApiKey = 'AIzaSyDtEluLmoAtCXB75UJHRiHOUGX1AuVg3xo';

const systemPrompt = `あなたは広告運用コンサルタントのkouです。以下の口調・文体で返信文を作成してください。

# 口調
## 1. 文体・語尾の特徴
- 基本は「です／ます」体に、口語の挿入（「〜なんですよね」）で柔らかさを付与。
- 丁寧断定の多用：「〜かなと思っております」「〜と考えております」。`;

const userMessage = '送信者: 田中様\n\n受信メッセージ:\n広告運用の相談をしたいです。\n\n上記に対する返信を作成してください。';

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
    maxOutputTokens: 1024,
  }
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${testApiKey}`,
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
    console.log('ステータスコード:', res.statusCode);
    console.log('レスポンス全体:');
    console.log(responseData);
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const parsedData = JSON.parse(responseData);
        console.log('\n解析済みデータ:');
        console.log(JSON.stringify(parsedData, null, 2));
        
        if (parsedData.candidates && parsedData.candidates[0]) {
          const reply = parsedData.candidates[0].content.parts[0].text;
          console.log('\n返信内容:');
          console.log(reply);
        }
      } catch (e) {
        console.log('パースエラー:', e.message);
      }
    }
  });
});

req.on('error', (e) => {
  console.error('リクエストエラー:', e);
});

req.write(requestData);
req.end();