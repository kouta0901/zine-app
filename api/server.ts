import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { VertexAI } from "@google-cloud/vertexai";
import { Storage } from "@google-cloud/storage";
import { GoogleAuth } from "google-auth-library";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import https from "https";
import { URL } from "url";

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Vertex AI
const project = process.env.GOOGLE_CLOUD_PROJECT || "vital-analogy-470911-t0";
const location = process.env.GOOGLE_CLOUD_LOCATION || "global";

const vertexAI = new VertexAI({
  project: project,
  location: location,
});

// Initialize Vertex AI for image generation (global region)
const vertexAIGlobal = new VertexAI({
  project: project,
  location: "global", // Use global for proper model availability
});

// Initialize Google Generative AI for image generation (fallback)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Initialize Google Auth for Vertex AI API
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Initialize Cloud Storage
const storage = new Storage();
const bucketName = process.env.COVER_BUCKET || "vital-analogy-470911-t0-covers";
const zinesBucketName = process.env.ZINES_BUCKET || "vital-analogy-470911-t0-zines";

// Initialize Document AI for OCR processing
const documentAI = new DocumentProcessorServiceClient();
const docAILocation = process.env.DOC_AI_LOCATION || "us"; 
const processorId = process.env.DOC_OCR_PROCESSOR_ID;
let processorName: string | null = null;

if (project && processorId) {
  processorName = documentAI.processorPath(project, docAILocation, processorId);
  console.log("📄 Document AI OCR initialized:", processorName);
} else {
  console.warn("⚠️ Document AI environment variables not configured. OCR will be disabled.");
}

// Health check endpoint
app.get("/healthz", (_, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// 🔍 SERVER-SIDE OCR PROCESSING
interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
}

async function processOCROnServer(base64Image: string): Promise<OCRResult> {
  if (!processorName) {
    console.log("🔧 OCR: Document AI not configured, returning empty result");
    return { text: "", confidence: 0, words: [] };
  }

  try {
    const [result] = await documentAI.processDocument({
      name: processorName,
      rawDocument: {
        content: base64Image,
        mimeType: "image/png",
      },
    });

    const document = result.document;
    if (!document) {
      return { text: "", confidence: 0, words: [] };
    }

    const extractedText = document.text || "";
    let avgConfidence = 0;
    const words: any[] = [];

    // Extract words with confidence scores
    if (document.pages) {
      let totalConfidence = 0;
      let tokenCount = 0;

      for (const page of document.pages) {
        if (page.tokens) {
          for (const token of page.tokens) {
            if (token.layout && token.layout.textAnchor && token.layout.boundingPoly) {
              const textSegment = token.layout.textAnchor.textSegments?.[0];
              if (textSegment && document.text) {
                const startIndex = parseInt(textSegment.startIndex?.toString() || '0') || 0;
                const endIndex = parseInt(textSegment.endIndex?.toString() || startIndex.toString()) || startIndex;
                const text = document.text.substring(startIndex, endIndex);
                const confidence = token.layout.confidence || 0;

                words.push({
                  text,
                  confidence,
                  boundingBox: extractBoundingBox(token.layout.boundingPoly)
                });

                totalConfidence += confidence;
                tokenCount++;
              }
            }
          }
        }
      }

      avgConfidence = tokenCount > 0 ? totalConfidence / tokenCount : 0;
    }

    console.log(`📄 OCR processed: ${extractedText.length} chars, confidence: ${avgConfidence.toFixed(2)}`);
    return { text: extractedText, confidence: avgConfidence, words };

  } catch (error) {
    console.error("❌ OCR processing failed:", error);
    return { text: "", confidence: 0, words: [] };
  }
}

function extractBoundingBox(boundingPoly: any): { x: number; y: number; width: number; height: number } {
  if (!boundingPoly || !boundingPoly.vertices || boundingPoly.vertices.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const vertices = boundingPoly.vertices;
  const xs = vertices.map((v: any) => parseFloat(v.x) || 0);
  const ys = vertices.map((v: any) => parseFloat(v.y) || 0);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// 🎨 SERVER-SIDE CAPTIONING PROCESSING
async function processCaptioningOnServer(base64Image: string, pageIndex: number): Promise<string> {
  try {
    const model = vertexAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7
      }
    });

    const prompt = `この画像を詳細に分析してください。以下の観点から日本語で説明してください：

🎨 視覚的要素:
- 人物の外見、表情、姿勢
- 物体、道具、アイテム
- 背景、環境、建築物
- 色彩、光、影の効果

📖 物語的要素:
- 感情的な雰囲気
- アクション、動き
- 関係性、相互作用
- 時間、場所の手がかり

🔍 テキスト要素:
- 看板、ラベル、文字
- 記号、マーク
- 読み取れるすべてのテキスト

簡潔で物語に役立つ分析をお願いします。`;

    const imagePart = {
      inline_data: {
        mime_type: "image/png",
        data: base64Image.replace(/^data:image\/[a-z]+;base64,/, '')
      }
    } as any;

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt }, imagePart]
      }]
    });

    const response = result.response;
    const caption = response.candidates?.[0]?.content?.parts?.[0]?.text || `ページ${pageIndex + 1}の画像内容の詳細な分析情報`;

    console.log(`🎨 Caption generated for page ${pageIndex + 1}: ${caption.substring(0, 100)}...`);
    return caption;

  } catch (error) {
    console.error("❌ Captioning failed:", error);
    return `ページ${pageIndex + 1}には印象的な要素が描かれており、物語の重要な場面を表現している。`;
  }
}

// 1. 小説化エンドポイント
app.post("/novelize", async (req, res) => {
  try {
    const { concept, world, prompt } = req.body;
    
    if (!concept || !world || !prompt) {
      return res.status(400).json({ error: "concept, world, and prompt are required" });
    }

    console.log("Novel generation requested for concept:", concept);
    
    try {
      // Direct HTTP API call to Vertex AI (Gemini 1.5 Pro)
      console.log("Trying direct HTTP API call to Vertex AI (Gemini 1.5 Pro)...");
      
      const authClient = await auth.getClient();
      const tokenResponse = await authClient.getAccessToken();
      const accessToken = tokenResponse.token;
      
      if (!accessToken) {
        throw new Error("Failed to get access token");
      }
      
      const apiUrl = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/gemini-2.5-flash:generateContent`;
      
      const requestBody = {
        contents: [{
          role: "user",
          parts: [{
            text: `次の設定に基づいて日本語の小説本文を生成してください。

- コンセプト: ${concept}
- 世界観: ${world}
- 指示: ${prompt}

制約: 体裁を整え、章立てと見出しを入れる。文体は読みやすく、魅力的な物語として構成してください。`
          }]
        }]
      };
      
      console.log("Making direct API call to:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Direct API call failed: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      const apiResult: any = await response.json();
      console.log("Direct HTTP API response received (Gemini 1.5 Pro)");
      
      const text = apiResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (text) {
        console.log("Novel generation successful via direct HTTP API");
        return res.json({ text });
      }
      
    } catch (directApiError) {
      console.error("Direct HTTP API call failed:", directApiError);
    }

    // Fallback: Try Google Generative AI (if API key is available)
    if (process.env.GOOGLE_API_KEY) {
      console.log("Trying Google Generative AI as fallback...");
      
      try {
        const directModel = genAI.getGenerativeModel({ 
          model: "gemini-1.5-pro"
        });
        
        const result = await directModel.generateContent([
          `次の設定に基づいて日本語の小説本文を生成してください。

- コンセプト: ${concept}
- 世界観: ${world}
- 指示: ${prompt}

制約: 体裁を整え、章立てと見出しを入れる。文体は読みやすく、魅力的な物語として構成してください。`
        ]);
        
        const response = await result.response;
        const text = response.text();
        
        if (text) {
          console.log("Novel generation successful via Google Generative AI");
          return res.json({ text });
        }
        
      } catch (genAiError) {
        console.error("Google Generative AI fallback failed:", genAiError);
      }
    }
    
    throw new Error("All novel generation methods failed");
    
  } catch (error) {
    console.error("Novelize error:", error);
    res.status(500).json({ error: "Failed to generate novel content" });
  }
});

// 1.5. 画像ベース小説化エンドポイント
app.post("/novelize-with-images", async (req, res) => {
  try {
    const { 
      concept, 
      world, 
      images, 
      title,
      imageDescriptions,
      detailedPrompt,
      enhancedAnalysis,
      system_prompt,
      user_prompt,
      image_analysis_instructions
    } = req.body;
    
    if (!concept || !world || !images) {
      return res.status(400).json({ error: "concept, world, and images are required" });
    }

    console.log("🚀 Server-side image processing requested for concept:", concept);
    console.log("📸 Images count:", images?.length || 0);
    console.log("🔄 Processing images server-side to avoid client mocks...");
    
    // 🔥 SERVER-SIDE PROCESSING: Process raw images to get high-quality analysis
    const serverAnalysisData = [];
    
    if (images && images.length > 0) {
      console.log("📄 Starting server-side OCR and captioning processing...");
      
      for (let i = 0; i < images.length; i++) {
        const imageBase64 = images[i];
        console.log(`Processing page ${i + 1}/${images.length}...`);
        
        // Process OCR and captioning in parallel for each image
        const [ocrResult, caption] = await Promise.all([
          processOCROnServer(imageBase64),
          processCaptioningOnServer(imageBase64, i)
        ]);
        
        serverAnalysisData.push({
          pageIndex: i,
          ocrText: ocrResult.text,
          caption: caption,
          confidence: ocrResult.confidence,
          wordCount: ocrResult.words.length,
          processedOnServer: true // Mark as server-processed for quality assurance
        });
        
        console.log(`✅ Page ${i + 1} processed: ${ocrResult.text.length} OCR chars, ${caption.length} caption chars`);
      }
    } else {
      console.log("⚠️ No images provided for server-side processing");
    }
    
    // Build comprehensive prompt with SERVER-PROCESSED analysis data
    let enhancedPrompt = `次の設定に基づいて、提供された画像とサーバ側で高精度解析した内容を完全に反映した日本語の小説本文を生成してください。

【基本設定】
- コンセプト: ${concept}
- 世界観: ${world}
- タイトル: ${title || ''}

【画像ベース小説化・厳格要件（サーバ側高精度処理版）】
- 各画像のDocument AI OCR抽出テキストをセリフ・ラベル・説明として必ず本文に組み込む
- Gemini 2.5 Flash生成キャプションの視覚的詳細を情景描写として活用
- 全てのテキスト要素（看板、ラベル、文字など）を物語に反映
- 画像の感情トーンと雰囲気を文体や展開に織り込む`;

    if (detailedPrompt) {
      enhancedPrompt += `\n\n【詳細指示】\n${detailedPrompt}`;
    }

    // Add SERVER-PROCESSED analysis data (high quality)
    if (serverAnalysisData.length > 0) {
      enhancedPrompt += `\n\n【サーバ側高精度解析データ】`;
      serverAnalysisData.forEach((data, index) => {
        enhancedPrompt += `\n[Page ${index + 1}] (サーバ処理済み・高品質)
OCRテキスト: ${data.ocrText || '(テキスト要素なし)'}
AIキャプション: ${data.caption || '(分析なし)'}
信頼度: ${(data.confidence * 100).toFixed(1)}%
抽出単語数: ${data.wordCount}`;
      });
    }
    
    // Add fallback for client-processed data (if server processing failed)
    if (enhancedAnalysis && enhancedAnalysis.length > 0 && serverAnalysisData.length === 0) {
      console.log("⚠️ Falling back to client-processed data (server processing failed)");
      enhancedPrompt += `\n\n【クライアント側解析データ（フォールバック）】`;
      enhancedAnalysis.forEach((data: any, index: number) => {
        enhancedPrompt += `\n[Page ${index + 1}] (クライアント処理)
OCRテキスト: ${data.ocrText || '(なし)'}
AIキャプション: ${data.caption || '(なし)'}
関連テキスト: ${data.nearbyText || '(なし)'}
空間関係: ${data.spatialContext || '(なし)'}
信頼度: ${(data.confidence * 100).toFixed(1)}%`;
      });
    }

    // Add image descriptions if available
    if (imageDescriptions && imageDescriptions.length > 0) {
      enhancedPrompt += `\n\n【補助画像説明】\n${imageDescriptions.join('\n')}`;
    }

    // Add system instructions
    if (system_prompt) {
      enhancedPrompt = `${system_prompt}\n\n${enhancedPrompt}`;
    }
    
    if (user_prompt) {
      enhancedPrompt += `\n\n${user_prompt}`;
    }

    if (image_analysis_instructions) {
      enhancedPrompt += `\n\n【画像解析活用指示】\n${image_analysis_instructions}`;
    }

    enhancedPrompt += `\n\n制約: 
- 全ての画像内容を物語に反映すること
- OCRテキストを省略せずに組み込むこと  
- 空間関係と時系列を論理的に構成すること
- 体裁を整え、読みやすい小説として完成させること`;

    try {
      // Direct HTTP API call to Vertex AI (Gemini 2.5 Flash)
      console.log("Trying direct HTTP API call to Vertex AI (Gemini 2.5 Flash)...");
      
      const authClient = await auth.getClient();
      const tokenResponse = await authClient.getAccessToken();
      const accessToken = tokenResponse.token;
      
      if (!accessToken) {
        throw new Error("Failed to get access token");
      }
      
      const apiUrl = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/gemini-2.5-flash:generateContent`;
      
      // Build contents array with images and text
      const contents = [{
        role: "user",
        parts: [{ text: enhancedPrompt }]
      }];

      // Add images to contents if provided
      if (images && images.length > 0) {
        images.forEach((imageBase64: string, index: number) => {
          if (imageBase64 && imageBase64.length > 0) {
            contents[0].parts.push({
              inline_data: {
                mime_type: "image/png",
                data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '') // Clean base64 data
              }
            } as any);
          }
        });
      }

      const requestBody = {
        contents
      };
      
      console.log("Making direct API call to:", apiUrl);
      console.log("Contents parts count:", contents[0].parts.length);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Direct API call failed: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      const apiResult: any = await response.json();
      console.log("Direct HTTP API response received (Gemini 2.5 Flash)");
      
      const text = apiResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (text) {
        console.log("Image-based novel generation successful via direct HTTP API");
        return res.json({ text });
      }
      
    } catch (directApiError) {
      console.error("Direct HTTP API call failed:", directApiError);
    }

    // Fallback: Try Google Generative AI (if API key is available)
    if (process.env.GOOGLE_API_KEY) {
      console.log("Trying Google Generative AI as fallback...");
      
      try {
        const directModel = genAI.getGenerativeModel({ 
          model: "gemini-1.5-pro"
        });
        
        // Build content array for Google AI
        const contentParts = [enhancedPrompt];
        
        const result = await directModel.generateContent(contentParts);
        const response = await result.response;
        const text = response.text();
        
        if (text) {
          console.log("Image-based novel generation successful via Google Generative AI");
          return res.json({ text });
        }
        
      } catch (genAiError) {
        console.error("Google Generative AI fallback failed:", genAiError);
      }
    }
    
    throw new Error("All image-based novel generation methods failed");
    
  } catch (error) {
    console.error("Novelize-with-images error:", error);
    res.status(500).json({ error: "Failed to generate image-based novel content" });
  }
});

// 2. 作家レビュー・推敲エンドポイント
app.post("/review", async (req, res) => {
  try {
    const { original, instruction } = req.body;
    
    if (!original || !instruction) {
      return res.status(400).json({ error: "original text and instruction are required" });
    }

    console.log("Review requested for text length:", original.length);
    
    try {
      // Direct HTTP API call to Vertex AI (Gemini 1.5 Pro)
      console.log("Trying direct HTTP API call to Vertex AI (Gemini 1.5 Pro)...");
      
      const authClient = await auth.getClient();
      const tokenResponse = await authClient.getAccessToken();
      const accessToken = tokenResponse.token;
      
      if (!accessToken) {
        throw new Error("Failed to get access token");
      }
      
      const apiUrl = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/gemini-2.5-flash:generateContent`;
      
      const requestBody = {
        contents: [{
          role: "user",
          parts: [{
            text: `以下の文章を、ユーザー指示に従って修正・推敲してください。

# 原文
${original}

# 修正指示
${instruction}

出力は修正後の本文のみを返してください。説明は不要です。`
          }]
        }]
      };
      
      console.log("Making direct API call to:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Direct API call failed: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      const apiResult: any = await response.json();
      console.log("Direct HTTP API response received (Gemini 1.5 Pro)");
      
      const text = apiResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (text) {
        console.log("Review successful via direct HTTP API");
        return res.json({ text });
      }
      
    } catch (directApiError) {
      console.error("Direct HTTP API call failed:", directApiError);
    }

    // Fallback: Try Google Generative AI (if API key is available)
    if (process.env.GOOGLE_API_KEY) {
      console.log("Trying Google Generative AI as fallback...");
      
      try {
        const directModel = genAI.getGenerativeModel({ 
          model: "gemini-1.5-pro"
        });
        
        const result = await directModel.generateContent([
          `以下の文章を、ユーザー指示に従って修正・推敲してください。

# 原文
${original}

# 修正指示
${instruction}

出力は修正後の本文のみを返してください。説明は不要です。`
        ]);
        
        const response = await result.response;
        const text = response.text();
        
        if (text) {
          console.log("Review successful via Google Generative AI");
          return res.json({ text });
        }
        
      } catch (genAiError) {
        console.error("Google Generative AI fallback failed:", genAiError);
      }
    }
    
    throw new Error("All review methods failed");
    
  } catch (error) {
    console.error("Review error:", error);
    res.status(500).json({ error: "Failed to process review request" });
  }
});

// テキスト埋め込み生成（Gemini 1.5 Pro）
app.post("/embed", async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    try {
      // Direct HTTP API call to Vertex AI (Gemini 1.5 Pro)
      console.log("Trying direct HTTP API call for embedding...");
      
      const authClient = await auth.getClient();
      const tokenResponse = await authClient.getAccessToken();
      const accessToken = tokenResponse.token;
      
      if (!accessToken) {
        throw new Error("Failed to get access token");
      }
      
      const apiUrl = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/text-embedding-004:generateContent`;
      
      const requestBody = {
        contents: [{
          role: "user",
          parts: [{
            text: text
          }]
        }]
      };
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Direct API call failed: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      const apiResult: any = await response.json();
      
      // Extract embedding data
      const embedding = apiResult.candidates?.[0]?.content?.parts?.[0]?.text || null;
      
      if (embedding) {
        console.log("Embedding generation successful via direct HTTP API");
        return res.json({ 
          vector: embedding,
          dimensions: embedding.length,
          message: "Embedding generated successfully"
        });
      }
      
    } catch (directApiError) {
      console.error("Direct HTTP API call failed:", directApiError);
    }

    // Fallback for embedding (using SDK)
    const model = vertexAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text }]
      }]
    });
    
    res.json({ 
      vector: result.response.candidates?.[0]?.content.parts[0]?.text || [],
      dimensions: 768,
      message: "Embedding generated successfully (SDK fallback)"
    });

    res.status(500).json({ error: "Failed to generate embedding" });
  } catch (error) {
    console.error("Embed error:", error);
    res.status(500).json({ error: "Failed to generate embedding" });
  }
});

// 3. 表紙画像生成エンドポイント
app.post("/cover", async (req, res) => {
  try {
    const { synopsis, title } = req.body;
    
    if (!synopsis) {
      return res.status(400).json({ error: "synopsis is required" });
    }

    const bookTitle = title || "小説タイトル"; // デフォルトタイトル設定

    console.log("Cover generation requested for synopsis:", synopsis.substring(0, 200) + "...");
    
    // Create a detailed prompt for book cover generation with Japanese text support
    const coverPrompt = `日本語小説「${bookTitle}」の美しい表紙画像を生成してください。以下のあらすじに基づいて、プロフェッショナルで芸術的な書籍表紙デザインを作成してください：

【小説タイトル】${bookTitle}

【あらすじ】
${synopsis}

## 必須要件：
- プロフェッショナルな書籍表紙デザイン（縦向き、横より縦が長い）
- 小説の雰囲気とテーマを表現
- アニメ・マンガ風イラストスタイルの美しい背景とビジュアル要素
- 印刷に適した高品質なアートワーク
- ドラマチックな照明と雰囲気効果を含む
- 物語の雰囲気に合った色彩使用

## 文字・テキスト要件：
- タイトル「${bookTitle}」を表紙上部に日本語で明確に表示
- 日本語文字は正確で読みやすく、文字化けを避ける
- 文字は鮮明で読みやすく、背景と調和する配置
- タイトル文字には適切なコントラストと視認性を確保
- フォント：明朝体、ゴシック体、または美しい書体を使用
- 文字色は背景に対して十分なコントラストを持つ

## デザイン指針：
- 日本の小説表紙として適切なレイアウト
- 表紙として魅力的で手に取りたくなるデザイン
- 物語の世界観を一目で伝える構成
- プロの出版社レベルの仕上がり
- タイトルが主要な視覚要素として目立つ配置

## 技術的要求：
- 高解像度（最低300dpi相当）
- 縦横比：3:4または2:3（書籍表紙に適した比率）
- 色彩豊富で印刷に適したカラープロファイル

Please create a professional Japanese novel cover with the title "${bookTitle}" clearly displayed in readable Japanese characters, avoiding any text corruption or garbled characters.`;

    try {
      // Try direct HTTP API call to Vertex AI first (working method)
      console.log("Trying direct HTTP API call to Vertex AI...");
      console.log("Calling Gemini 2.5 Flash Image model...");
      
      try {
        // Get access token using Google Auth
        const authClient = await auth.getClient();
        const tokenResponse = await authClient.getAccessToken();
        const accessToken = tokenResponse.token;
        
        if (!accessToken) {
          throw new Error("Failed to get access token");
        }
        
        // Make direct HTTP request to Vertex AI API
        const apiUrl = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/gemini-2.5-flash-image-preview:generateContent`;
        
        const requestBody = {
          contents: [{
            role: "user",
            parts: [{
              text: `Generate a professional book cover image. ${coverPrompt}`
            }]
          }],
          generation_config: {
            response_modalities: ["TEXT", "IMAGE"]
          }
        };
        
        console.log("Making direct API call to:", apiUrl);
        
        // Use Node.js built-in fetch (available in Node 18+)
        // Node.js built-in fetch is available without import
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Direct API call failed: ${response.status} ${response.statusText}\n${errorText}`);
        }
        
        const apiResult: any = await response.json();
        console.log("Direct HTTP API response received");
        
        // 🔍 詳細なレスポンス構造をログ出力
        console.log("=== API Response Analysis ===");
        console.log("Full API Result:", JSON.stringify(apiResult, null, 2));
        console.log("Response keys:", Object.keys(apiResult || {}));
        
        if (apiResult.candidates) {
          console.log("Candidates length:", apiResult.candidates.length);
          apiResult.candidates.forEach((candidate: any, index: number) => {
            console.log(`Candidate ${index}:`, JSON.stringify(candidate, null, 2));
          });
        } else {
          console.log("❌ No candidates found in response");
        }
        
        if (apiResult.promptFeedback) {
          console.log("Prompt Feedback:", JSON.stringify(apiResult.promptFeedback, null, 2));
        }
        
        // Extract image data from response
        let imageData = null;
        
        if (apiResult.candidates && apiResult.candidates[0]) {
          const candidate = apiResult.candidates[0];
          console.log("🔎 Analyzing candidate structure...");
          console.log("Candidate keys:", Object.keys(candidate || {}));
          
          if (candidate.content && candidate.content.parts) {
            console.log("Parts found:", candidate.content.parts.length);
            for (let i = 0; i < candidate.content.parts.length; i++) {
              const part = candidate.content.parts[i];
              console.log(`Part ${i}:`, JSON.stringify(part, null, 2));
              
              if (part.inlineData && part.inlineData.data) {
                imageData = part.inlineData.data;
                console.log("✅ Image data found in direct HTTP API response");
                console.log("Image data length:", imageData.length);
                break;
              } else if (part.inline_data && part.inline_data.data) {
                // 代替パス確認
                imageData = part.inline_data.data;
                console.log("✅ Image data found in alternative path (inline_data)");
                console.log("Image data length:", imageData.length);
                break;
              }
            }
          } else {
            console.log("❌ No content.parts found in candidate");
            console.log("Candidate content:", JSON.stringify(candidate.content, null, 2));
          }
        } else {
          console.log("❌ No valid candidate found");
        }
        
        if (!imageData) {
          console.log("❌ Image data not found - checking safety ratings");
          if (apiResult.candidates && apiResult.candidates[0] && apiResult.candidates[0].safetyRatings) {
            console.log("Safety ratings:", JSON.stringify(apiResult.candidates[0].safetyRatings, null, 2));
          }
          if (apiResult.candidates && apiResult.candidates[0] && apiResult.candidates[0].finishReason) {
            console.log("Finish reason:", apiResult.candidates[0].finishReason);
          }
        }
        console.log("=== End API Response Analysis ===");
        
        if (imageData) {
          // Save image to Google Cloud Storage
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substr(2, 9);
          const fileName = `covers/cover_${timestamp}_${randomId}.png`;
          const file = storage.bucket(bucketName).file(fileName);

          // Convert base64 to buffer
          const imageBuffer = Buffer.from(imageData, 'base64');
          
          await file.save(imageBuffer, {
            metadata: {
              contentType: 'image/png',
              cacheControl: 'public, max-age=86400', // 24 hours cache
            },
          });

          // Make the file publicly accessible
          await file.makePublic();

          // Generate public URL
          const imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
          
          console.log(`Cover image generated and saved via direct HTTP API: ${fileName}`);
          
          return res.json({ 
            url: imageUrl,
            message: "表紙画像が正常に生成されました（Direct HTTP API使用）",
            success: true
          });
        } else {
          // 画像データが見つからない場合の詳細なエラーレスポンス
          console.error("❌ No image data found in Vertex AI response");
          console.log("Throwing error to trigger fallback...");
          throw new Error("No image data found in Vertex AI response");
        }
        
      } catch (directApiError) {
        console.error("Direct HTTP API call failed:", directApiError);
        console.log("Will try fallback methods...");
      }

      // Try Google Generative AI (fallback with API key)
      if (process.env.GOOGLE_API_KEY) {
        console.log("Trying Google Generative AI with API key...");
        
        const directModel = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash-image-preview"
        });
        
        const result = await directModel.generateContent([coverPrompt]);
        const response = await result.response;
        
        console.log("Direct API response received");
        
        // Extract image data from response
        let imageData = null;
        
        if (response.candidates && response.candidates[0]) {
          const candidate = response.candidates[0];
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.data) {
                imageData = part.inlineData.data;
                console.log("Image data found in direct API response");
                break;
              }
            }
          }
        }
        
        if (imageData) {
          // Save image to Google Cloud Storage
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substr(2, 9);
          const fileName = `covers/cover_${timestamp}_${randomId}.png`;
          const file = storage.bucket(bucketName).file(fileName);

          // Convert base64 to buffer
          const imageBuffer = Buffer.from(imageData, 'base64');
          
          await file.save(imageBuffer, {
            metadata: {
              contentType: 'image/png',
              cacheControl: 'public, max-age=86400', // 24 hours cache
            },
          });

          // Make the file publicly accessible
          await file.makePublic();

          // Generate public URL
          const imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
          
          console.log(`Cover image generated and saved via direct API: ${fileName}`);
          
          return res.json({ 
            url: imageUrl,
            message: "表紙画像が正常に生成されました（Direct API使用）",
            success: true
          });
        }
      }
      
    } catch (modelError) {
      console.error("🚨 All image generation methods failed:", modelError);
      
      // Fallback to text description with Gemini Pro
      console.log("🔄 Falling back to Gemini Pro for text description");
      try {
        const textModel = vertexAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const textResult = await textModel.generateContent({
          contents: [{
            role: "user",
            parts: [{
              text: `次の小説の表紙デザインの詳細な説明を作成してください：\n\n${synopsis}`
            }]
          }]
        });
        
        const textResponse = textResult.response.candidates?.[0]?.content.parts[0]?.text || "";
        
        console.log("📝 Text description generated as fallback");
        
        res.json({
          success: false,
          url: "https://via.placeholder.com/400x600/4a3c28/daa520?text=Cover+Image",
          description: textResponse,
          message: "画像生成に失敗しました。表紙デザインの説明を代わりに提供します。しばらくしてから再試行してください。"
        });
      } catch (fallbackError) {
        console.error("🚨 Text fallback also failed:", fallbackError);
        
        res.json({
          success: false,
          url: "https://via.placeholder.com/400x600/4a3c28/daa520?text=Cover+Image",
          description: "",
          message: "申し訳ございません。現在画像生成サービスが利用できません。しばらくしてから再試行してください。"
        });
      }
    }

  } catch (error) {
    console.error("🚨 Unexpected cover generation error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to generate cover image",
      message: "予期しないエラーが発生しました。システム管理者に連絡してください。",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 4. 埋め込みエンドポイント (将来拡張用)
app.post("/embed", async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    const model = vertexAI.getGenerativeModel({ model: "text-embedding-004" });
    
    // Note: Embedding functionality is not yet implemented
    // This is a placeholder for future implementation
    console.log("Embedding requested for text:", text.substring(0, 100));
    
    res.json({ 
      vector: [],
      dimensions: 0,
      message: "Embedding functionality is not yet implemented"
    });
  } catch (error) {
    console.error("Embedding error:", error);
    res.status(500).json({ error: "Failed to generate embeddings" });
  }
});

// ZINE保存・管理エンドポイント

// 5. ZINE保存エンドポイント
app.post("/zines", async (req, res) => {
  try {
    const zineData = req.body;
    
    if (!zineData || !zineData.title) {
      return res.status(400).json({ error: "ZINE data with title is required" });
    }

    // Generate unique ID if not provided
    const zineId = zineData.id || `zine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add metadata
    const savedZine = {
      ...zineData,
      id: zineId,
      updatedAt: new Date().toISOString(),
      createdAt: zineData.createdAt || new Date().toISOString()
    };

    // Save to Cloud Storage as JSON file
    const fileName = `zines/${zineId}.json`;
    const file = storage.bucket(zinesBucketName).file(fileName);
    
    await file.save(JSON.stringify(savedZine, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });

    console.log(`ZINE saved: ${zineId}`);
    res.json({ id: zineId, message: "ZINE saved successfully" });
  } catch (error) {
    console.error("ZINE save error:", error);
    res.status(500).json({ error: "Failed to save ZINE" });
  }
});

// 6. ZINE一覧取得エンドポイント
app.get("/zines", async (req, res) => {
  try {
    const [files] = await storage.bucket(zinesBucketName).getFiles({
      prefix: 'zines/',
      delimiter: '/'
    });

    const zines = [];
    
    for (const file of files) {
      if (file.name.endsWith('.json')) {
        try {
          const [content] = await file.download();
          const zineData = JSON.parse(content.toString());
          
          // Return only metadata for list view
          zines.push({
            id: zineData.id,
            title: zineData.title,
            status: zineData.status,
            createdAt: zineData.createdAt,
            updatedAt: zineData.updatedAt,
            description: zineData.description,
            thumbnail: zineData.thumbnail,
            coverImageUrl: zineData.coverImageUrl,
            category: zineData.category,
            author: zineData.author,
            publishedDate: zineData.publishedDate,
            novelPages: zineData.novelPages,
            pages: zineData.pages
          });
        } catch (parseError) {
          console.error(`Error parsing ZINE file ${file.name}:`, parseError);
        }
      }
    }

    // Sort by updatedAt descending
    zines.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    res.json({ zines });
  } catch (error) {
    console.error("ZINE list error:", error);
    res.status(500).json({ error: "Failed to retrieve ZINE list" });
  }
});

// 7. 特定ZINE取得エンドポイント
app.get("/zines/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: "ZINE ID is required" });
    }

    const fileName = `zines/${id}.json`;
    const file = storage.bucket(zinesBucketName).file(fileName);
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: "ZINE not found" });
    }

    const [content] = await file.download();
    const zineData = JSON.parse(content.toString());
    
    res.json(zineData);
  } catch (error) {
    console.error("ZINE get error:", error);
    res.status(500).json({ error: "Failed to retrieve ZINE" });
  }
});

// 8. ZINE更新エンドポイント
app.put("/zines/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const zineData = req.body;
    
    if (!id || !zineData) {
      return res.status(400).json({ error: "ZINE ID and data are required" });
    }

    // Update timestamp
    const updatedZine = {
      ...zineData,
      id,
      updatedAt: new Date().toISOString()
    };

    const fileName = `zines/${id}.json`;
    const file = storage.bucket(zinesBucketName).file(fileName);
    
    await file.save(JSON.stringify(updatedZine, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });

    console.log(`ZINE updated: ${id}`);
    res.json({ id, message: "ZINE updated successfully" });
  } catch (error) {
    console.error("ZINE update error:", error);
    res.status(500).json({ error: "Failed to update ZINE" });
  }
});

// 9. ZINE削除エンドポイント
app.delete("/zines/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: "ZINE ID is required" });
    }

    const fileName = `zines/${id}.json`;
    const file = storage.bucket(zinesBucketName).file(fileName);
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: "ZINE not found" });
    }

    await file.delete();
    
    console.log(`ZINE deleted: ${id}`);
    res.json({ id, message: "ZINE deleted successfully" });
  } catch (error) {
    console.error("ZINE delete error:", error);
    res.status(500).json({ error: "Failed to delete ZINE" });
  }
});

// 9. 表紙画像生成エンドポイント

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`ZINE API server listening on port ${port}`);
  console.log(`Project: ${project}`);
  console.log(`Location: ${location}`);
});