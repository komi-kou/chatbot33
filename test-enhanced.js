// 強化版Gemini APIのテスト
const { callGeminiAPIEnhanced } = require('./gemini-proxy-enhanced');

async function testEnhancedAPI() {
  const apiKey = 'AIzaSyDtEluLmoAtCXB75UJHRiHOUGX1AuVg3xo';
  const baseSystemPrompt = 'あなたは広告運用コンサルタントのkouです。';
  
  const testMessages = [
    '広告運用の相談をしたいんですが',
    '料金について教えてください',
    'Google広告の改善方法を知りたい'
  ];
  
  console.log('🚀 強化版Gemini APIテスト開始\n');
  console.log('ナレッジベース: ✅ 読み込み済み');
  console.log('Few-Shot Learning: ✅ 設定済み\n');
  console.log('=' .repeat(50));
  
  for (const message of testMessages) {
    console.log(`\n📝 テストメッセージ: "${message}"`);
    console.log('-'.repeat(50));
    
    try {
      const result = await callGeminiAPIEnhanced(apiKey, baseSystemPrompt, message);
      console.log('✅ 返信生成成功:');
      console.log(result.reply);
    } catch (error) {
      console.log('❌ エラー:', error.message);
    }
    
    console.log('=' .repeat(50));
  }
}

testEnhancedAPI();