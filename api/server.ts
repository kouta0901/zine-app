import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { VertexAI } from "@google-cloud/vertexai";
import { Storage } from "@google-cloud/storage";

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Vertex AI
const project = process.env.GOOGLE_CLOUD_PROJECT || "vital-analogy-470911-t0";
const location = process.env.GOOGLE_CLOUD_LOCATION || "asia-northeast1";

const vertexAI = new VertexAI({
  project: project,
  location: location,
});

// Initialize Cloud Storage
const storage = new Storage();
const bucketName = process.env.COVER_BUCKET || "vital-analogy-470911-t0-covers";

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

    // Note: Imagen integration would go here
    // For now, return a placeholder response
    const fileName = `covers/${Date.now()}.png`;
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    
    // TODO: Implement actual Imagen generation
    console.log("Cover generation requested for:", synopsis);
    
    res.json({ 
      url: publicUrl,
      message: "Cover generation is not yet implemented. This is a placeholder response."
    });
  } catch (error) {
    console.error("Cover generation error:", error);
    res.status(500).json({ error: "Failed to generate cover image" });
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