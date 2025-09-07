import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { VertexAI } from "@google-cloud/vertexai";
import { Storage } from "@google-cloud/storage";
import { GoogleAuth } from "google-auth-library";
import https from "https";
import { URL } from "url";

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Vertex AI
const project = process.env.GOOGLE_CLOUD_PROJECT || "vital-analogy-470911-t0";
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

const vertexAI = new VertexAI({
  project: project,
  location: location,
});

// Initialize Vertex AI for image generation (global region)
const vertexAIGlobal = new VertexAI({
  project: project,
  location: "global", // Gemini 2.5 Flash Image is only available in global
});

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

    const model = vertexAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent({
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
    });

    const text = result.response.candidates?.[0]?.content.parts[0]?.text || "";
    res.json({ text });
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

    const model = vertexAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent({
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
    });

    const text = result.response.candidates?.[0]?.content.parts[0]?.text || "";
    res.json({ text });
  } catch (error) {
    console.error("Review error:", error);
    res.status(500).json({ error: "Failed to review content" });
  }
});

// 3. 表紙画像生成エンドポイント
app.post("/cover", async (req, res) => {
  try {
    const { synopsis } = req.body;
    
    if (!synopsis) {
      return res.status(400).json({ error: "synopsis is required" });
    }

    console.log("Cover generation requested for synopsis:", synopsis.substring(0, 200) + "...");
    
    // Create a detailed prompt for book cover generation
    const coverPrompt = `Generate a beautiful book cover image for this Japanese novel. Create an artistic and professional book cover design based on the following synopsis:

${synopsis}

Requirements:
- Professional book cover design with vertical orientation (taller than wide)
- Express the atmosphere and theme of the novel
- Beautiful background and visual elements in anime/manga illustration style
- High quality artwork suitable for printing
- Include dramatic lighting and atmospheric effects
- Use colors that match the mood of the story

Create artwork suitable for a Japanese novel cover.`;

    try {
      // Use Gemini 2.5 Flash Image for image generation (global region)
      const imageModel = vertexAIGlobal.getGenerativeModel({ 
        model: "gemini-2.5-flash-image-preview" 
      });
      
      console.log("Calling Gemini 2.5 Flash Image model...");
      
      const result = await imageModel.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: coverPrompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.8,
        }
      });
      
      const response = result.response;
      console.log("Image generation response received");
      
      // Extract image data from response
      let imageData = null;
      let imageUrl = null;
      
      // Check for inline image data in the response
      if (response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              imageData = part.inlineData.data;
              console.log("Image data found in response");
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
        imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        
        console.log(`Cover image generated and saved: ${fileName}`);
        
        res.json({ 
          url: imageUrl,
          message: "表紙画像が正常に生成されました",
          success: true
        });
      } else {
        // Fallback if no image data found
        console.log("No image data found in response, returning placeholder");
        res.json({
          success: false,
          url: "https://via.placeholder.com/400x600/4a3c28/daa520?text=表紙画像",
          message: "画像生成中にエラーが発生しました。もう一度お試しください。"
        });
      }
      
    } catch (modelError) {
      console.error("Gemini 2.5 Flash Image error:", modelError);
      
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
app.post("/generate-cover", async (req, res) => {
  try {
    const { novelContent, title } = req.body;
    
    if (!novelContent || !title) {
      return res.status(400).json({ error: "Novel content and title are required" });
    }

    console.log("Generating cover for novel:", title);

    // Gemini Pro Vision モデルを使用（画像生成対応）
    const model = vertexAI.getGenerativeModel({ 
      model: "gemini-1.5-pro"
    });

    // 表紙デザイン説明生成用プロンプト
    const coverPrompt = `小説「${title}」の表紙デザインの詳細な説明を作成してください。

小説の内容：
${novelContent}

要求仕様：
- 具体的なビジュアル要素の説明
- 色調とテーマ
- レイアウトとデザインスタイル
- 雰囲気や印象

この小説の内容を反映した魅力的で印象的な表紙デザインの説明を日本語で提供してください。実際の画像生成指示として使用できる詳細なものにしてください。`;

    // Gemini で表紙説明を生成
    const result = await model.generateContent({
      contents: [{
        role: "user", 
        parts: [{
          text: coverPrompt
        }]
      }],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
        topP: 0.9,
        topK: 20
      }
    });

    const response = result.response;
    const coverDescription = response.candidates?.[0]?.content.parts[0]?.text || "";
    
    // プレースホルダー画像を生成（実際の画像生成サービスが利用可能になるまでの代替案）
    const placeholderImageUrl = "https://via.placeholder.com/400x600/4a3c28/daa520?text=表紙画像";
    
    console.log("Cover description generated:", coverDescription);
    
    res.json({ 
      success: true,
      coverImageUrl: placeholderImageUrl,
      description: coverDescription,
      metadata: {
        model: "gemini-1.5-pro",
        timestamp: Date.now(),
        type: "description_based"
      }
    });

  } catch (error) {
    console.error("Cover generation error:", error);
    res.status(500).json({ 
      error: "Failed to generate cover image",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

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