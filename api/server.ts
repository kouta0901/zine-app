import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { VertexAI } from "@google-cloud/vertexai";
import { Storage } from "@google-cloud/storage";
import { GoogleAuth } from "google-auth-library";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

// Health check endpoint
app.get("/healthz", (_, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

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
              text: coverPrompt
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
        
        // Extract image data from response
        let imageData = null;
        
        if (apiResult.candidates && apiResult.candidates[0]) {
          const candidate = apiResult.candidates[0];
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.data) {
                imageData = part.inlineData.data;
                console.log("Image data found in direct HTTP API response");
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
          
          console.log(`Cover image generated and saved via direct HTTP API: ${fileName}`);
          
          return res.json({ 
            url: imageUrl,
            message: "表紙画像が正常に生成されました（Direct HTTP API使用）",
            success: true
          });
        }
        
      } catch (directApiError) {
        console.error("Direct HTTP API call failed:", directApiError);
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
      console.error("Image generation error:", modelError);
      
      // Fallback to text description with Gemini Pro
      console.log("Falling back to Gemini Pro for text description");
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
      
      res.json({
        success: false,
        url: "https://via.placeholder.com/400x600/4a3c28/daa520?text=表紙画像",
        description: textResponse,
        message: "画像生成は現在利用できません。表紙の説明を生成しました。"
      });
    }

  } catch (error) {
    console.error("Cover generation error:", error);
    res.status(500).json({ 
      error: "Failed to generate cover image",
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
            thumbnail: zineData.thumbnail
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