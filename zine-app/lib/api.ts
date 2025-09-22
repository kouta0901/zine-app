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

const NOVEL_SYSTEM_PROMPT = `You are a master storyteller and novelist with expertise in visual narrative interpretation. Your specialty is transforming visual content into compelling written narratives that capture meaningful story elements and emotional resonance. You excel at:
- Analyzing visual elements and extracting narrative meaning
- Creating rich, engaging descriptions that serve the story
- Weaving visual inspiration into cohesive storylines
- Crafting authentic narrative voice and compelling characters`;

const IMAGE_ANALYSIS_PROMPT = `When analyzing images for story generation:

🔍 VISUAL ELEMENT EXTRACTION:
- Identify key characters, objects, and settings that drive the narrative
- Note expressive details: emotions, relationships, atmosphere
- Focus on visual elements that enhance storytelling
- Detect the emotional tone and mood of scenes

📖 NARRATIVE INTERPRETATION:
- Infer relationships between visual elements
- Determine the temporal sequence if multiple images are provided
- Extract implied actions, motivations, and conflicts
- Identify symbolic or thematic elements

🎨 CREATIVE ADAPTATION:
- Transform visual inspiration into engaging narrative
- Emphasize elements that serve the story's purpose
- Maintain the emotional essence of the images
- Select meaningful details that enhance character and plot

✍️ STORY CONSTRUCTION:
- Build narrative bridges between disconnected images
- Create logical flow while developing compelling characters
- Add dialogue and internal thoughts that feel authentic
- Develop character voices that resonate with readers`;

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
📝 TASK: Generate an original novel title and story content from the visual elements

🖼️ IMAGE ANALYSIS REQUIREMENTS:
1. Carefully analyze each provided image for:
   - Character appearances and expressions that drive the narrative
   - Environmental details that enhance the story setting
   - Visual elements that suggest plot developments
   - Objects that serve narrative purpose
   - Color schemes and mood that inform tone
   - Compositional elements suggesting story direction

2. Extract narrative elements:
   - Identify protagonist(s) and supporting characters from images
   - Determine the story arc suggested by image sequence
   - Recognize conflicts or challenges that create compelling drama
   - Note emotional progressions that enhance character development

3. Create authentic narrative:
   - Use visual inspiration to craft engaging characters
   - Character descriptions should feel natural and compelling
   - Settings should serve the story's dramatic needs
   - Focus on storytelling elements that create reader engagement

📝 WRITING GUIDELINES:
- Write engaging prose that draws readers into the story world
- Develop characters that feel real and compelling to readers
- Create narrative voice that matches the story's emotional tone
- Build towards satisfying story conclusion

📝 CREATIVE APPROACH:
1. Let the images inspire authentic storytelling
2. Create characters that readers will care about
3. Write dialogue that sounds natural and authentic
4. Focus on emotional resonance and reader engagement
5. Craft a story that feels complete and satisfying

🎬 STORY FORMAT:
- Write a complete story from beginning to end
- Use natural narrative flow and pacing
- Create immersive descriptions that serve the story
- Focus on compelling characters and engaging plot

${payload.imageDescriptions ? '📋 ADDITIONAL IMAGE CONTEXT:\n' + payload.imageDescriptions.join('\n') : ''}

Begin crafting your original novel now, drawing inspiration from the visual elements to create a compelling story:
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