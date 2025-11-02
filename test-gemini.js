// Gemini APIのテストスクリプト
const { callGeminiAPI } = require('./gemini-proxy');

async function testGeminiAPI() {
  // 提供されたAPIキー
  const testApiKey = 'AIzaSyDtEluLmoAtCXB75UJHRiHOUGX1AuVg3xo';
  
  const systemPrompt = 'あなたは親切なアシスタントです。簡潔に答えてください。';
  const userMessage = 'こんにちは！簡単に自己紹介してください。';
  
  console.log('Google Gemini API テスト開始...');
  console.log('APIキー: ' + testApiKey.substring(0, 10) + '...');
  console.log('---');
  
  try {
    const result = await callGeminiAPI(testApiKey, systemPrompt, userMessage);
    console.log('✅ 成功！');
    console.log('返信内容:', result.reply);
  } catch (error) {
    console.log('❌ エラー発生:');
    console.log(error.message);
  }
}

// テスト実行
testGeminiAPI();