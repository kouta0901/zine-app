// 一時的にハードコード（後で環境変数に戻す）
// 注: 実際のデプロイされたAPI URLを使用
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://zine-api-2be2c4ycca-uc.a.run.app';

// API呼び出し用のヘルパー関数
async function apiCall(endpoint: string, payload: any) {
  // 🔥 Log payload size for debugging
  const payloadSize = JSON.stringify(payload).length;
  console.log(`🚀 API call to ${endpoint}: ${payloadSize} bytes (${(payloadSize / 1024 / 1024).toFixed(2)} MB)`);

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // 🔥 Try to get detailed error message from response
    let errorDetails = response.statusText;
    try {
      const errorResponse = await response.json();
      if (errorResponse.details) {
        errorDetails = `${errorResponse.error}: ${errorResponse.details}`;
      } else if (errorResponse.error) {
        errorDetails = errorResponse.error;
      }
    } catch (e) {
      // If response is not JSON, use status text
      console.error("Failed to parse error response:", e);
    }

    console.error(`❌ API call failed: ${response.status} - ${errorDetails}`);
    throw new Error(`API call failed: ${errorDetails}`);
  }

  return response.json();
}

// 小説化機能（テキストのみ）は廃止（画像ベースAPIに一本化）
// export async function novelize(payload: {
//   concept: string;
//   world: string;
//   prompt: string;
// }): Promise<{ text: string }> {
//   return apiCall("/novelize", payload);
// }

// 画像ベースの小説化機能
export async function novelizeWithImages(payload: {
  concept: string;
  world: string;
  images: string[];
  title: string;
}): Promise<{ text: string }> {
  return apiCall("/novelize-with-images", payload);
}

// 強化版画像ベースの小説化機能（AI解析データ対応）
export async function novelizeWithImagesEnhanced(payload: {
  concept: string;
  world: string;
  images: string[];
  title: string;
  imageDescriptions?: string[];
  detailedPrompt?: string;
  enhancedAnalysis?: Array<{
    imageBase64: string;
    ocrText: string;
    caption: string;
    nearbyText: string;
    spatialContext: string;
    pageIndex: number;
    confidence: number;
  }>;
}): Promise<{ text: string }> {
  // 詳細なプロンプト生成
  const enhancedPayload = {
    ...payload,
    system_prompt: NOVEL_SYSTEM_PROMPT,
    user_prompt: generateNovelPrompt(payload),
    image_analysis_instructions: IMAGE_ANALYSIS_PROMPT,
  };
  
  // 既存のAPIエンドポイントを使用しつつ、プロンプトを強化
  return apiCall("/novelize-with-images", enhancedPayload);
}

// 作家レビュー・推敲機能
export async function review(payload: {
  original: string;
  instruction: string;
}): Promise<{ text: string }> {
  return apiCall("/review", payload);
}

// 🎯 NOVEL GENERATION PROMPTS - 小説生成用プロンプトシステム

const NOVEL_SYSTEM_PROMPT = `You are a master storyteller and novelist with expertise in visual narrative interpretation. Your specialty is transforming visual content into compelling written narratives that capture every detail, emotion, and nuance present in the images. You excel at:
- Analyzing visual elements and extracting narrative meaning
- Creating rich, detailed descriptions that bring images to life
- Weaving multiple visual elements into cohesive storylines
- Maintaining consistency between visual content and written narrative`;

const IMAGE_ANALYSIS_PROMPT = `When analyzing images for story generation:

🔍 VISUAL ELEMENT EXTRACTION:
- Identify all characters, objects, and settings visible in the image
- Note specific details: clothing, expressions, poses, colors, textures
- Recognize text elements: signs, labels, cards, written content
- Detect emotional tone and atmosphere conveyed by the image

📖 NARRATIVE INTERPRETATION:
- Infer relationships between visual elements
- Determine the temporal sequence if multiple images are provided
- Extract implied actions, motivations, and conflicts
- Identify symbolic or thematic elements

🎨 DETAIL PRESERVATION:
- Maintain fidelity to the original visual content
- Include specific visual details in the narrative
- Preserve the emotional tone of the images
- Ensure no important visual element is omitted

✍️ STORY CONSTRUCTION:
- Build narrative bridges between disconnected images
- Create logical flow while respecting visual content
- Add dialogue and internal thoughts that match visual cues
- Develop character voices consistent with their visual representation`;

const generateNovelPrompt = (payload: {
  concept: string;
  world: string;
  images: string[];
  title: string;
  imageDescriptions?: string[];
}) => {
  return `
📚 NOVEL GENERATION TASK:

Create a compelling novel based on the provided images with the following requirements:

🎯 CONCEPT: ${payload.concept}
🌍 WORLD SETTING: ${payload.world}
📖 TITLE: ${payload.title}

🖼️ IMAGE ANALYSIS REQUIREMENTS:
1. Carefully analyze each provided image for:
   - Character appearances and expressions
   - Environmental details and settings
   - Text content (cards, signs, labels)
   - Objects and their significance
   - Color schemes and mood
   - Compositional elements suggesting narrative

2. Extract narrative elements:
   - Identify protagonist(s) and supporting characters from images
   - Determine the story arc suggested by image sequence
   - Recognize conflicts or challenges depicted
   - Note emotional progressions

3. Maintain visual fidelity:
   - Every significant visual element must appear in the story
   - Character descriptions must match their visual appearance
   - Settings must reflect the environments shown
   - Preserve any text content visible in images

📝 WRITING REQUIREMENTS:
- Style: Engaging narrative prose suitable for the genre
- Length: Appropriate to fully explore the visual content
- Voice: Consistent with the tone suggested by the images
- Structure: Clear beginning, development, and conclusion

⚠️ CRITICAL RULES:
1. DO NOT invent elements not present in the images
2. DO NOT ignore or skip visual details
3. DO NOT change character appearances from what's shown
4. DO include all text visible in images (cards, signs, etc.)
5. DO maintain consistency with the visual narrative flow

🎬 OUTPUT FORMAT:
- Pure narrative text without metadata
- Natural chapter or section breaks if needed
- Seamless integration of visual elements into prose
- Rich descriptions that honor the source images

${payload.imageDescriptions ? '📋 ADDITIONAL IMAGE CONTEXT:\n' + payload.imageDescriptions.join('\n') : ''}

Begin the novel now, ensuring every image element is faithfully represented in your narrative:
`;
};

// 🔥 MEGA ULTRA STRICT PROMPT - 3層分離システム


// ✨ Simplified Cover Generation - Direct Data Transfer
export async function generateCover(payload: {
  synopsis: string;
  title?: string;
  keywords?: string[];
}): Promise<{ url: string; message?: string }> {
  console.log("✨ Simplified Cover Generation - sending raw data to server");

  // Send raw data directly to server for processing
  try {
    const result = await apiCall("/cover", {
      synopsis: payload.synopsis,
      title: payload.title,
      keywords: payload.keywords
    });

    console.log("✅ Cover generated successfully!");
    return result;
  } catch (error) {
    console.error("❌ Cover generation failed:", error);
    throw error;
  }
}

// 埋め込み機能（将来拡張用）
export async function embed(payload: {
  text: string;
}): Promise<{ vector: number[]; dimensions: number; message?: string }> {
  return apiCall("/embed", payload);
}

// APIの健康チェック
export async function healthCheck(): Promise<{ ok: boolean; timestamp: string }> {
  const response = await fetch(`${API_BASE}/healthz`);
  return response.json();
}

// ZINE保存・管理機能

// ZINE新規保存 (新規作成専用 - 既存作品の更新はupdateZineを使用)
export async function saveZine(zineData: any): Promise<{ id: string; message: string }> {
  try {
    // Note: zineData should NOT contain an ID for new works
    if (zineData.id) {
      console.warn('⚠️ saveZine called with existing ID - consider using updateZine instead')
    }

    // Save to API server as new work
    const result = await apiCall("/zines", zineData);
    
    // Also save to localStorage for local access (client-side only)
    if (typeof window !== 'undefined') {
      const localData = {
        ...zineData,
        id: result.id,
        lastModified: new Date().toISOString(),
        type: 'zine'
      };
      
      localStorage.setItem(`zine_${result.id}`, JSON.stringify(localData));
      
      // Trigger storage event for other components
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('localStorageUpdate'));
    }
    
    return result;
  } catch (error) {
    // If API fails, still try to save locally (client-side only)
    if (typeof window !== 'undefined') {
      const fallbackId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const localData = {
        ...zineData,
        id: fallbackId,
        lastModified: new Date().toISOString(),
        type: 'zine',
        isLocalOnly: true
      };
      
      localStorage.setItem(`zine_${fallbackId}`, JSON.stringify(localData));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('localStorageUpdate'));
      
      // Re-throw the original error but with local save success
      console.warn('API save failed, saved locally instead:', error);
      return { id: fallbackId, message: 'Saved locally (API unavailable)' };
    }
    
    // If we're on server side, just throw the original error
    throw error;
  }
}

// ZINE一覧取得
export async function getZines(): Promise<{ zines: any[] }> {
  const response = await fetch(`${API_BASE}/zines`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ZINEs: ${response.statusText}`);
  }
  return response.json();
}

// 特定ZINE取得
export async function getZine(id: string): Promise<any> {
  const response = await fetch(`${API_BASE}/zines/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ZINE: ${response.statusText}`);
  }
  return response.json();
}

// ZINE更新 (既存作品の更新専用)
export async function updateZine(id: string, zineData: any): Promise<{ id: string; message: string }> {
  try {
    console.log(`🔄 Updating ZINE: ${id}`)

    const response = await fetch(`${API_BASE}/zines/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(zineData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update ZINE: ${response.statusText}`);
    }

    const result = await response.json();

    // Also update localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      const localData = {
        ...zineData,
        id: id,
        lastModified: new Date().toISOString(),
        type: 'zine'
      };

      localStorage.setItem(`zine_${id}`, JSON.stringify(localData));

      // Trigger storage event for other components
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('localStorageUpdate'));
    }

    return result;
  } catch (error) {
    console.error(`Failed to update ZINE ${id}:`, error);
    throw error;
  }
}

// ZINE削除
export async function deleteZine(id: string): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_BASE}/zines/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete ZINE: ${response.statusText}`);
  }

  return response.json();
}

// Novel保存機能
export async function saveNovel(novelData: any): Promise<{ id: string; message: string }> {
  try {
    // For now, we don't have a novel API endpoint, so save locally only
    // TODO: Implement novel API endpoint in the future
    if (typeof window !== 'undefined') {
      const novelId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const localData = {
        ...novelData,
        id: novelId,
        lastModified: new Date().toISOString(),
        type: 'novel'
      };
      
      localStorage.setItem(`novel_${novelId}`, JSON.stringify(localData));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('localStorageUpdate'));
      
      return { id: novelId, message: 'Novel saved successfully' };
    }
    
    // If we're on server side, return a placeholder response
    const serverId = `server_${Date.now()}`;
    return { id: serverId, message: 'Novel save deferred to client' };
  } catch (error) {
    console.error('Failed to save novel:', error);
    throw error;
  }
}

// Novel一覧取得 (将来のAPI実装用)
export async function getNovels(): Promise<{ novels: any[] }> {
  // TODO: Implement novel API endpoint
  // For now, return empty array since we don't have novel API
  return { novels: [] };
}

// Works in Progress用：完全なZINEデータを取得
export async function getZineWithDetails(id: string): Promise<any | null> {
  try {
    // First try Cloud Storage API
    const result = await getZine(id);
    if (result) {
      return result;
    }
  } catch (error) {
    console.warn('Failed to get ZINE from Cloud Storage:', error);
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const localData = localStorage.getItem(`zine_${id}`);
      if (localData) {
        const zineData = JSON.parse(localData);
        console.log('Retrieved ZINE from localStorage:', zineData);
        return zineData;
      }
    } catch (error) {
      console.error('Error retrieving ZINE from localStorage:', error);
    }
  }

  return null;
}