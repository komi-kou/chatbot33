// Google Gemini API用の強化版プロキシ（ナレッジベース対応）
// APIキー取得: https://aistudio.google.com/app/apikey

const https = require('https');
const fs = require('fs');
const path = require('path');

// ナレッジベースを読み込む関数
function loadKnowledgeBase() {
  const knowledgePath = path.join(__dirname, 'knowledge-base.txt');
  if (fs.existsSync(knowledgePath)) {
    return fs.readFileSync(knowledgePath, 'utf8');
  }
  return '';
}

// Few-Shot例を生成する関数
function generateFewShotExamples() {
  return `
## 会話例1
ユーザー: この件について相談したいんですが
アシスタント: ご相談ありがとうございます。承知いたしました。

詳しい内容をお聞かせいただければ、より具体的なアドバイスをさせていただくことができます。

どのような点についてお悩みでしょうか？

## 会話例2
ユーザー: この機能の使い方を教えてください
アシスタント: ご質問ありがとうございます。

こちらの機能の使い方についてご説明いたしますね。

**基本的な手順**
1. まず初期設定を行います
2. 必要な情報を入力します
3. 実行ボタンをクリックします

他にご不明な点があればお気軽にお聞きください。`;
}

async function callGeminiAPIEnhanced(apiKey, baseSystemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    // ナレッジベースを読み込み
    const knowledgeBase = loadKnowledgeBase();
    const fewShotExamples = generateFewShotExamples();
    
    // 強化されたシステムプロンプトを作成
    const enhancedSystemPrompt = `
${baseSystemPrompt}

# ナレッジベース情報
${knowledgeBase}

# 会話例（Few-Shot Learning）
${fewShotExamples}

上記の情報を参考に、適切な返信を生成してください。`;

    const requestData = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${enhancedSystemPrompt}\n\nユーザーメッセージ: ${userMessage}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
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

module.exports = { 
  callGeminiAPIEnhanced,
  loadKnowledgeBase,
  generateFewShotExamples 
};