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
// Increase request body size limits to handle base64 images from client
// 🔥 Increased to 50MB to handle large novel data with images
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Initialize Vertex AI
const project = process.env.GOOGLE_CLOUD_PROJECT || "vital-analogy-470911-t0";
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1"; // Changed from 'global' to valid region

// 🔥 Fix: Use explicit authentication with GoogleAuth
const vertexAI = new VertexAI({
  project: project,
  location: location, // Now uses us-central1
  googleAuthOptions: {
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  },
});

// Initialize Vertex AI for image generation (us-central1 region)
const vertexAIGlobal = new VertexAI({
  project: project,
  location: "us-central1", // Changed from 'global' to valid region for image generation
  googleAuthOptions: {
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  },
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

// 🛡️ Response validation helper
async function validateAndParseResponse(response: Response, context: string): Promise<any> {
  const contentType = response.headers.get('content-type');
  const responseText = await response.text();

  // Check if response is HTML (error page)
  if (contentType?.includes('text/html') || responseText.startsWith('<!DOCTYPE')) {
    console.error(`❌ ${context}: Received HTML error page instead of JSON`);
    console.error(`Response status: ${response.status}`);
    console.error(`HTML preview: ${responseText.substring(0, 200)}...`);
    throw new Error(`API returned HTML error page. Status: ${response.status}. Check if the location/region is valid.`);
  }

  // Check if response is valid
  if (!response.ok) {
    console.error(`❌ ${context}: HTTP error ${response.status}`);
    console.error(`Error response: ${responseText}`);
    throw new Error(`HTTP ${response.status}: ${responseText}`);
  }

  // Try to parse JSON
  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error(`❌ ${context}: Failed to parse JSON response`);
    console.error(`Response text: ${responseText.substring(0, 500)}...`);
    throw new Error(`Invalid JSON response: ${error}`);
  }
}

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

/**
 * 画像データを正規化する関数
 * Data URLから純粋なbase64データを抽出し、Document AI / Gemini Vision用に最適化
 */
function normalizeImageData(imageData: any): string {
  // 型チェック
  if (typeof imageData !== 'string') {
    console.warn('⚠️ Image data is not a string, converting:', typeof imageData);
    if (imageData && typeof imageData.toString === 'function') {
      imageData = imageData.toString();
    } else {
      throw new Error(`Invalid image data type: ${typeof imageData}`);
    }
  }

  // Data URLプレフィックスを除去
  const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

  // base64データの妥当性チェック
  if (!base64Data || base64Data.length === 0) {
    throw new Error('Empty base64 data after normalization');
  }

  // base64形式の簡易検証
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
    throw new Error('Invalid base64 format');
  }

  console.log(`📏 Normalized image data: ${Math.round(base64Data.length / 1024)}KB`);
  return base64Data;
}

// 🔥 SERVER-SIDE TEXT CLEANUP: Filter out UI elements and metadata
function cleanupOCRTextForNovel(text: string): string {
  if (!text) return text;

  let cleanedText = text;

  // Remove common UI elements and metadata patterns
  const uiPatterns = [
    /クリックして編集/gi,
    /編集モード/gi,
    /プレビュー/gi,
    /保存/gi,
    /削除/gi,
    /追加/gi,
    /ページ\s*\d+/gi,
    /Page\s*\d+/gi,
    /ZINE/gi,
    /ページ番号/gi,
    /タイトル/gi,
    /作者/gi,
    /Author/gi,
    /Title/gi,
    /Created/gi,
    /作成日/gi,
    /\.png/gi,
    /\.jpg/gi,
    /\.jpeg/gi,
    /\.webp/gi,
    /placeholder/gi,
    /no-image/gi,
    /画像が見つかりません/gi,
    /loading/gi,
    /エラー/gi,
    /Error/gi,
    /^(無題|untitled)$/gi,
    /font-family/gi,
    /font-size/gi,
    /color:/gi,
    /background/gi,
    /margin/gi,
    /padding/gi
  ];

  // Apply all cleanup patterns
  uiPatterns.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern, '');
  });

  // Clean up extra whitespace
  cleanedText = cleanedText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  // Return empty if content is too short or meaningless
  const words = cleanedText.split(/\s+/).filter(word => word.length > 1);
  if (words.length < 2 && cleanedText.length < 8) {
    return '';
  }

  return cleanedText;
}

async function processOCROnServer(base64Image: string): Promise<OCRResult> {
  if (!processorName) {
    console.log("🔧 OCR: Document AI not configured, returning empty result");
    return { text: "", confidence: 0, words: [] };
  }

  try {
    // 🔥 FIX: 画像データを正規化
    const normalizedBase64 = normalizeImageData(base64Image);

    console.log("📄 Sending image to Document AI OCR processor...");
    const [result] = await documentAI.processDocument({
      name: processorName,
      rawDocument: {
        content: normalizedBase64, // ✅ プレフィックス除去済みのbase64データ
        mimeType: "image/jpeg", // JPEG形式を明示的に指定
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

    // 🔥 APPLY CLEANUP: Filter out UI elements and metadata from OCR result
    const cleanedText = cleanupOCRTextForNovel(extractedText);

    console.log(`📄 OCR processed: ${extractedText.length} chars, confidence: ${avgConfidence.toFixed(2)}`);
    console.log(`🧹 OCR cleaned: ${extractedText.length} → ${cleanedText.length} chars`);
    return { text: cleanedText, confidence: avgConfidence, words };

  } catch (error) {
    console.error("❌ OCR processing failed:", error);
    // 🔥 FIX: エラー時も空の結果を返してプロセス継続
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
    // 🔥 FIX: 画像データを正規化
    const normalizedBase64 = normalizeImageData(base64Image);

    console.log(`🎨 Generating caption for page ${pageIndex + 1}...`);

    const model = vertexAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7
      }
    });

    const captionPrompt = `この画像について、物語作成に役立つ詳細な分析をお願いします。`;

    const imagePart = {
      inline_data: {
        mime_type: "image/jpeg",
        data: normalizedBase64 // ✅ プレフィックス除去済みのbase64データ
      }
    } as any;

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: captionPrompt }, imagePart]
      }]
    });

    const response = result.response;
    const caption = response.candidates?.[0]?.content?.parts?.[0]?.text || `ページ${pageIndex + 1}の画像内容の詳細な分析情報`;

    // 🔥 APPLY CLEANUP: Filter out UI elements and metadata from caption
    const cleanedCaption = cleanupOCRTextForNovel(caption);

    console.log(`🎨 Caption generated for page ${pageIndex + 1}: ${caption.substring(0, 100)}...`);
    console.log(`🧹 Caption cleaned: ${caption.length} → ${cleanedCaption.length} chars`);
    return cleanedCaption;

  } catch (error) {
    console.error("❌ Captioning failed:", error);
    // 🔥 FIX: エラー時はデフォルトキャプションを返してプロセス継続
    return `ページ ${pageIndex + 1} の画像（キャプション生成に失敗）`;
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
      
      const apiUrl = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`;
      
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
        try {
          const imageBase64 = images[i];
          console.log(`Processing page ${i + 1}/${images.length}...`);

          // 🔥 FIX: 画像データの事前検証
          if (!imageBase64) {
            console.warn(`⚠️ Empty image data for page ${i + 1}, skipping...`);
            continue;
          }

          // Process OCR and captioning in parallel for each image
          const [ocrResult, caption] = await Promise.all([
            processOCROnServer(imageBase64).catch(error => {
              console.warn(`⚠️ OCR failed for page ${i + 1}:`, error.message);
              return { text: "", confidence: 0, words: [] };
            }),
            processCaptioningOnServer(imageBase64, i).catch(error => {
              console.warn(`⚠️ Captioning failed for page ${i + 1}:`, error.message);
              return `ページ ${i + 1} の画像（処理失敗）`;
            })
          ]);

          serverAnalysisData.push({
            pageIndex: i,
            ocrText: ocrResult.text,
            caption: caption,
            confidence: ocrResult.confidence,
            wordCount: ocrResult.words.length,
            processedOnServer: true
          });

          console.log(`✅ Page ${i + 1} processed: ${ocrResult.text.length} chars OCR, caption length: ${caption.length}`);

        } catch (error) {
          console.error(`❌ Failed to process page ${i + 1}:`, error);
          // 🔥 FIX: 個別ページのエラーでプロセス全体を停止せず、デフォルトデータで継続
          serverAnalysisData.push({
            pageIndex: i,
            ocrText: "",
            caption: `ページ ${i + 1} の画像（処理失敗）`,
            confidence: 0,
            wordCount: 0,
            processedOnServer: false
          });
        }
      }

      console.log(`🎯 Server-side processing completed: ${serverAnalysisData.length} pages processed`);
    } else {
      console.log("⚠️ No images provided for server-side processing");
    }
    
    // Build completely natural prompt without any structured formatting or technical data
    let enhancedPrompt = `画像からインスピレーションを得て、魅力的な物語を創作してください。読者の心に響く感情豊かで自然な小説を書いてください。登場人物の魅力や関係性を大切にし、印象的で読み応えのある展開を描いてください。`;

    // Remove all technical prompt additions to prevent contamination

    // Extract only meaningful story elements (without technical structure)
    if (serverAnalysisData.length > 0) {
      const storyElements: string[] = [];

      serverAnalysisData.forEach((data) => {
        // Only include meaningful text content
        if (data.ocrText && data.ocrText.trim()) {
          const cleanText = data.ocrText.trim();
          if (cleanText.length > 3 && !cleanText.match(/^(ページ|場面|画像|Image|Page)/i)) {
            storyElements.push(cleanText);
          }
        }

        // Only include narrative-useful captions
        if (data.caption && data.caption.trim()) {
          const cleanCaption = data.caption.trim();
          if (!cleanCaption.match(/^(ページ|場面|画像|処理)/i)) {
            storyElements.push(cleanCaption);
          }
        }
      });

      if (storyElements.length > 0) {
        enhancedPrompt += `\n\n物語のヒントとして、以下の要素をご自由にご活用ください：\n${storyElements.slice(0, 5).join('。 ')}。`;
      }
    }
    
    // Add fallback for client-processed data (if server processing failed)
    if (enhancedAnalysis && enhancedAnalysis.length > 0 && serverAnalysisData.length === 0) {
      console.log("⚠️ Falling back to client-processed data (server processing failed)");
      const fallbackElements: string[] = [];

      enhancedAnalysis.forEach((data: any) => {
        // Only include meaningful text content
        if (data.ocrText && data.ocrText.trim()) {
          const cleanText = data.ocrText.trim();
          if (cleanText.length > 3 && !cleanText.match(/^(ページ|場面|画像|Image|Page)/i)) {
            fallbackElements.push(cleanText);
          }
        }

        // Only include narrative-useful captions
        if (data.caption && data.caption.trim()) {
          const cleanCaption = data.caption.trim();
          if (!cleanCaption.match(/^(ページ|場面|画像|処理)/i)) {
            fallbackElements.push(cleanCaption);
          }
        }
      });

      if (fallbackElements.length > 0) {
        enhancedPrompt += `\n\n物語のヒントとして、以下の要素をご自由にご活用ください：\n${fallbackElements.slice(0, 5).join('。 ')}。`;
      }
    }

    // No additional sections - keep prompt completely natural

    try {
      // Direct HTTP API call to Vertex AI (Gemini 2.5 Flash)
      console.log("Trying direct HTTP API call to Vertex AI (Gemini 2.5 Flash)...");
      
      const authClient = await auth.getClient();
      const tokenResponse = await authClient.getAccessToken();
      const accessToken = tokenResponse.token;
      
      if (!accessToken) {
        throw new Error("Failed to get access token");
      }
      
      const apiUrl = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`;
      
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
      
      const apiUrl = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`;
      
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
      
      const apiUrl = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/text-embedding-004:generateContent`;
      
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
    const { synopsis, title, keywords } = req.body;
    
    if (!synopsis) {
      return res.status(400).json({ error: "synopsis is required" });
    }

    console.log("Cover generation requested for synopsis:", synopsis.substring(0, 200) + "...");

    if (keywords && keywords.length > 0) {
      console.log("🎯 User keywords provided:", keywords);
    }
    
    // 🔥 MEGA ULTRA STRICT Cover Generation - サーバーサイド完全版
    console.log("🔥 MEGA ULTRA STRICT Cover Generation activated on server!");
    console.log("🛡️ Title information completely blocked - only visual essence will be processed");
    
    // 🎨 ENHANCED CONCRETE VISUAL PROCESSING
    console.log("🎨 Processing story content for concrete visual representation...");

    // 📚 Genre Detection and Visual Style Assignment
    const detectGenre = (content: string, title?: string): string => {
      const allText = `${title || ''} ${content}`.toLowerCase();

      if (allText.match(/(sci-fi|science fiction|未来|宇宙|ロボット|テクノロジー|異世界|sf)/)) {
        return "sci-fi";
      } else if (allText.match(/(fantasy|ファンタジー|魔法|魔王|勇者|冒険|剣|魔術)/)) {
        return "fantasy";
      } else if (allText.match(/(romance|恋愛|愛|恋|カップル|結婚|デート)/)) {
        return "romance";
      } else if (allText.match(/(mystery|ミステリー|探偵|事件|犯罪|推理|殺人)/)) {
        return "mystery";
      } else if (allText.match(/(horror|ホラー|恐怖|幽霊|怪物|血|死)/)) {
        return "horror";
      } else {
        return "general";
      }
    };

    const genre = detectGenre(synopsis, title);
    console.log("📖 Detected genre:", genre);

    // 🎨 Genre-Specific Visual Styles
    const getVisualStyle = (detectedGenre: string): string => {
      const styles: { [key: string]: string } = {
        "sci-fi": "futuristic technology, neon lights, sleek metallic surfaces, space environments, cyberpunk aesthetics, holographic effects",
        "fantasy": "mystical landscapes, magical creatures, enchanted forests, ancient castles, ethereal lighting, medieval elements",
        "romance": "warm romantic atmosphere, soft lighting, intimate settings, elegant compositions, dreamy colors, emotional depth",
        "mystery": "dark atmospheric mood, shadowy figures, noir lighting, urban environments, suspenseful composition",
        "horror": "dark and eerie atmosphere, dramatic shadows, ominous environments, gothic elements, tension-building composition",
        "general": "balanced composition, natural lighting, realistic environments, versatile artistic style"
      };
      return styles[detectedGenre] || styles.general;
    };

    // 🌈 Extract Visual Elements from Synopsis
    const extractVisualElements = (content: string): string => {
      const visualTerms: string[] = [];

      // Nature elements
      if (content.match(/(海|ocean|sea|beach)/i)) visualTerms.push("ocean coastline with waves");
      if (content.match(/(山|mountain|hill)/i)) visualTerms.push("mountain landscape");
      if (content.match(/(森|forest|woods|tree)/i)) visualTerms.push("lush forest scenery");
      if (content.match(/(空|sky|cloud)/i)) visualTerms.push("dramatic sky with clouds");
      if (content.match(/(夜|night|moon|star)/i)) visualTerms.push("night sky with celestial elements");
      if (content.match(/(朝|morning|sunrise|dawn)/i)) visualTerms.push("golden morning light");
      if (content.match(/(夕|sunset|evening)/i)) visualTerms.push("warm sunset atmosphere");

      // Urban elements
      if (content.match(/(街|city|urban|building)/i)) visualTerms.push("modern city architecture");
      if (content.match(/(駅|station|train)/i)) visualTerms.push("transportation hub atmosphere");
      if (content.match(/(学校|school|university)/i)) visualTerms.push("academic institution setting");

      // Emotional atmosphere
      if (content.match(/(平和|peaceful|calm|tranquil)/i)) visualTerms.push("serene and peaceful atmosphere");
      if (content.match(/(緊張|tension|dramatic|intense)/i)) visualTerms.push("dynamic and intense composition");
      if (content.match(/(美し|beautiful|elegant|graceful)/i)) visualTerms.push("aesthetically beautiful elements");
      if (content.match(/(暗|dark|shadow|mysterious)/i)) visualTerms.push("dramatic shadows and contrast");

      return visualTerms.length > 0 ? visualTerms.slice(0, 3).join(", ") : "atmospheric visual storytelling";
    };

    // 🎨 Build Concrete Visual Prompt
    const visualStyle = getVisualStyle(genre);
    const visualElements = extractVisualElements(synopsis);

    // 🌟 KEYWORD INTEGRATION
    let additionalElements = "";
    if (keywords && keywords.length > 0) {
      additionalElements = `, incorporating elements: ${keywords.join(', ')}`;
      console.log("✨ User keywords integrated:", keywords);
    }

    // 🎨 ULTRA CONCRETE VISUAL PROMPT
    const coverPrompt = `Create a realistic, detailed book cover illustration with these exact specifications:

GENRE: ${genre.toUpperCase()}
VISUAL STYLE: ${visualStyle}
SPECIFIC ELEMENTS: ${visualElements}${additionalElements}

MANDATORY VISUAL REQUIREMENTS:
- Photo-realistic illustration style (NOT abstract art)
- 3:4 vertical book cover format
- Cinematic composition with dramatic lighting
- Rich textures and realistic materials
- Clear depth of field with focused foreground
- Professional book cover aesthetic

CONCRETE VISUAL DETAILS TO INCLUDE:
- Realistic human characters if story involves people
- Actual environments and landscapes (not symbols)
- Specific objects mentioned in the story
- Realistic lighting conditions (dawn/dusk/night/day)
- Detailed backgrounds with architectural or natural elements
- Vivid, saturated colors appropriate to the mood

STORY CONTEXT FOR VISUAL REFERENCE:
"${synopsis.substring(0, 400)}${synopsis.length > 400 ? '...' : ''}"

STRICT CREATIVE DIRECTION:
- Show real places, people, and objects
- Use concrete imagery over symbolic representation
- Focus on specific visual details that tell the story
- Create a movie poster aesthetic with realistic elements
- Avoid geometric shapes, abstract patterns, or artistic symbols
- Render everything with photographic realism

ABSOLUTE PROHIBITION: No text, words, letters, or readable symbols anywhere in the image.`;

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
        
        // Make direct HTTP request to Vertex AI API (using global location for image generation)
        const apiUrl = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/gemini-2.5-flash-image-preview:generateContent`;
        
        const requestBody = {
          contents: [{
            role: "user",
            parts: [{
              text: coverPrompt
            }]
          }],
          // 🔥 MEGA ULTRA STRICT: 画像生成のための完全設定
          generation_config: {
            response_modalities: ["TEXT", "IMAGE"],  // 画像生成必須
            max_output_tokens: 8192,
            temperature: 0.8,
            // 🛡️ 文字禁止パラメータ強化
            top_p: 0.9,
            top_k: 40,
            candidate_count: 1
          },
          // 🚫 テキスト抑制強化設定（generation_configから独立）
          safety_settings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        };
        
        console.log("Making direct API call to:", apiUrl);
        console.log("🔍 Concrete Visual Processing Analysis:");
        console.log("  - Detected Genre:", genre);
        console.log("  - Visual Elements:", visualElements);
        console.log("  - Synopsis length:", synopsis.length);
        console.log("  - Final Prompt length:", coverPrompt.length);
        console.log("🚀 Sending MEGA ULTRA STRICT payload to Vertex AI...");
        
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
          // より詳細なエラーログ
          console.error("API Error Details:", {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });

          // レート制限エラーの場合、より分かりやすいエラーメッセージを返す
          if (response.status === 429) {
            return res.status(429).json({
              error: "API利用制限に達しました。数分後に再度お試しください。",
              code: "RATE_LIMIT_EXCEEDED",
              retryAfter: 60 // 60秒後に再試行を推奨
            });
          }

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

    // 🔥 Log request size for debugging
    const requestSize = JSON.stringify(req.body).length;
    console.log(`📊 Received ZINE save request: ${requestSize} bytes (${(requestSize / 1024 / 1024).toFixed(2)} MB)`);

    if (!zineData || !zineData.title) {
      console.error("❌ ZINE validation failed: missing title");
      return res.status(400).json({ error: "ZINE data with title is required" });
    }

    // Generate unique ID if not provided
    const zineId = zineData.id || `zine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`📝 Processing ZINE: "${zineData.title}" (ID: ${zineId})`);
    console.log(`  - Mode: ${zineData.currentMode || 'unknown'}`);
    console.log(`  - Status: ${zineData.status || 'draft'}`);
    console.log(`  - Has novel content: ${!!zineData.novelContent}`);
    console.log(`  - Has cover: ${!!zineData.coverImageUrl}`);
    console.log(`  - Pages count: ${zineData.pages?.length || 0}`);

    // Add metadata
    const savedZine = {
      ...zineData,
      id: zineId,
      updatedAt: new Date().toISOString(),
      createdAt: zineData.createdAt || new Date().toISOString()
    };

    // 🔥 Check data size before saving
    const dataToSave = JSON.stringify(savedZine, null, 2);
    const saveSize = dataToSave.length;
    console.log(`💾 Saving to Cloud Storage: ${saveSize} bytes (${(saveSize / 1024 / 1024).toFixed(2)} MB)`);

    if (saveSize > 50 * 1024 * 1024) { // Error if over 50MB
      console.error(`❌ ZINE data too large: ${(saveSize / 1024 / 1024).toFixed(2)} MB`);
      return res.status(413).json({
        error: "ZINE data too large",
        details: `Data size ${(saveSize / 1024 / 1024).toFixed(2)} MB exceeds limit`
      });
    }

    // Save to Cloud Storage as JSON file
    const fileName = `zines/${zineId}.json`;
    const file = storage.bucket(zinesBucketName).file(fileName);

    console.log(`☁️ Writing to bucket: ${zinesBucketName}/${fileName}`);

    await file.save(dataToSave, {
      metadata: {
        contentType: 'application/json',
      },
    });

    console.log(`✅ ZINE saved successfully: ${zineId}`);
    res.json({ id: zineId, message: "ZINE saved successfully" });
  } catch (error) {
    // 🔥 Enhanced error logging
    console.error("❌ ZINE save error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });

    // Return more detailed error information
    res.status(500).json({
      error: "Failed to save ZINE",
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
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