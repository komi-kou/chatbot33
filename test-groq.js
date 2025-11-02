// Groq APIのテストスクリプト
const { callGroqAPI } = require('./groq-proxy');

async function testGroqAPI() {
  // テスト用のAPIキー（実際のキーに置き換えてください）
  const testApiKey = 'gsk_test123';  // ここに実際のAPIキーを入力
  
  const systemPrompt = 'あなたは親切なアシスタントです。';
  const userMessage = 'こんにちは！今日の天気はどうですか？';
  
  console.log('Groq API テスト開始...');
  console.log('モデル: llama-3.1-8b-instant');
  console.log('---');
  
  try {
    const result = await callGroqAPI(testApiKey, systemPrompt, userMessage);
    console.log('✅ 成功！');
    console.log('返信内容:', result.reply);
  } catch (error) {
    console.log('❌ エラー発生:');
    console.log(error.message);
    console.log('');
    console.log('解決方法:');
    console.log('1. https://console.groq.com/keys でAPIキーを取得');
    console.log('2. このファイルの testApiKey に実際のAPIキーを設定');
    console.log('3. 再度実行: node test-groq.js');
  }
}

// テスト実行
testGroqAPI();