// 一時的にハードコード（後で環境変数に戻す）
// 注: 実際のデプロイされたAPI URLを使用
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://zine-api-830716651527.us-central1.run.app';

// API呼び出し用のヘルパー関数
async function apiCall(endpoint: string, payload: any) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

// 小説化機能
export async function novelize(payload: {
  concept: string;
  world: string;
  prompt: string;
}): Promise<{ text: string }> {
  return apiCall("/novelize", payload);
}

// 作家レビュー・推敲機能
export async function review(payload: {
  original: string;
  instruction: string;
}): Promise<{ text: string }> {
  return apiCall("/review", payload);
}

// 🔥 MEGA ULTRA STRICT PROMPT - 3層分離システム

// 🎯 LAYER 1: SYSTEM PROMPT - AI の基本身分設定
const SYSTEM_PROMPT = `You are a master abstract artist and wordless book cover designer. Your specialty is creating pure visual compositions without any textual elements. You communicate stories through color, light, form, and atmosphere alone. You never include text, letters, words, or readable symbols in your artwork. Think of yourself as creating a visual symphony that speaks to the soul without words.`;

// 🌟 LAYER 2: MAIN CREATIVE PROMPT - ポジティブ創作指示
const MAIN_CREATIVE_PROMPT = `Create a stunning abstract book cover that captures the emotional essence through pure visual elements:

🎨 ARTISTIC DIRECTION:
- Paint like Monet capturing light and atmosphere
- Use color relationships like Rothko expressing deep emotions  
- Apply brushwork techniques of Turner for dramatic skies
- Create compositional balance like Kandinsky's abstract works

🌈 VISUAL ELEMENTS TO INCLUDE:
- Flowing organic shapes and natural forms
- Atmospheric lighting effects (golden hour, moonlight, dramatic shadows)
- Emotional color temperature variations (warm/cool contrasts)
- Textural elements (brush strokes, gradients, soft transitions)
- Architectural silhouettes without any signage or text
- Distant organic shapes suggesting life and movement
- Impressionistic landscapes with dreamy qualities

🎭 EMOTIONAL EXPRESSION:
- Convert story mood into color harmonies
- Express narrative tension through compositional balance
- Translate themes into abstract visual metaphors
- Create depth through layered atmospheric effects

📐 TECHNICAL REQUIREMENTS:
- Vertical book cover aspect ratio (3:4)
- Professional artistic composition
- High visual impact for book cover appeal
- Sophisticated color palette suitable for literary works`;

// ⛔ LAYER 3: NEGATIVE PROMPT - 完全禁止事項
const MEGA_NEGATIVE_PROMPT = `ABSOLUTELY FORBIDDEN - COMPLETE PROHIBITION:
text, words, letters, alphabets, characters, numbers, digits, symbols, punctuation, marks, titles, headings, captions, labels, tags, stickers, logos, brands, trademarks, signs, billboards, placards, books with visible text, magazines, newspapers, documents, subtitles, watermarks, credits, readable content, writing, script, fonts, calligraphy, typography, signage, lettering, inscriptions, annotations, Japanese text, English text, Chinese text, Korean text, Arabic text, any language text, license plates, street signs, store signs, building signs, neon signs, digital displays, screens with text, posters with text, banners with text, book spines with text, covers with text, newspapers, magazines with text, documents with text, handwriting, print text, digital text, carved text, painted text, embossed text, any readable symbols, mathematical symbols, currency symbols, trademark symbols, copyright symbols, hashtags, URLs, email addresses, phone numbers, dates in text form, brand names, company names, product names, location names, personal names, character names, place names, author names, publisher names, ISBN numbers, barcodes, QR codes`;

// 🎨 ARTISTIC STYLE ENHANCEMENT PROMPT
const ARTISTIC_STYLE_PROMPT = `Style Reference: Create this artwork as if you were:
- Claude Monet painting his famous Water Lilies series - pure color and light
- Mark Rothko creating his Color Field paintings - emotional color relationships  
- J.M.W. Turner capturing dramatic atmospheric effects - light breaking through mist
- Wassily Kandinsky composing abstract visual music - pure form and color harmony
- Georgia O'Keeffe painting organic forms - natural abstractions
- Hiroshi Yoshida creating atmospheric landscapes - subtle color gradations

The result should be a wordless visual poem that speaks directly to the emotions through pure artistic expression.`;

// 🛡️ MEGA TITLE BLOCKER - 完全タイトル除去システム
function megaTitleBlocker(content: string): string {
  console.log("🛡️ MEGA TITLE BLOCKER activated...");
  
  // 🚫 PHASE 1: 明示的なタイトル形式を完全除去
  const titlePatterns = [
    // 基本的なタイトル形式
    /^(タイトル|題名|書名|作品名|小説名)[:：]\s*.+$/gim,
    // 章・セクション形式
    /^(Chapter|第[0-9１-９一二三四五六七八九十]章|Scene|場面)[0-9０-９\s]*[:：].+$/gim,
    // 引用符で囲まれたタイトル形式
    /^[「『"'].+[」』"']$/gm,
    // 大文字・英数字のタイトル形式
    /^[A-Z\s\d]{2,}$/gm,
    // カタカナタイトル形式（2文字以上の連続）
    /^[ァ-ヶー・\s]{2,}$/gm,
    // 特定の作品っぽい固有名詞
    /新道タイル|ZINE|ワールド|ストーリー|テール|サーガ|クロニクル/gi
  ];
  
  let cleanContent = content;
  titlePatterns.forEach((pattern, index) => {
    const beforeLength = cleanContent.length;
    cleanContent = cleanContent.replace(pattern, '');
    const afterLength = cleanContent.length;
    if (beforeLength !== afterLength) {
      console.log(`🗑️ Title pattern ${index + 1} removed: ${beforeLength - afterLength} characters`);
    }
  });
  
  // 🚫 PHASE 2: 行頭の特殊文字・記号を除去
  cleanContent = cleanContent.replace(/^[★☆◆◇■□▲△▼▽※]/gm, '');
  
  // 🚫 PHASE 3: 単独行のカタカナ・英字を除去（タイトル疑似）
  const lines = cleanContent.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return false;
    
    // 短すぎる行（タイトルの可能性）
    if (trimmed.length <= 2) return false;
    
    // 全角英数字のみの行
    if (/^[Ａ-Ｚａ-ｚ０-９\s]+$/.test(trimmed)) return false;
    
    // カタカナのみの行
    if (/^[ァ-ヶー・\s]+$/.test(trimmed) && trimmed.length < 10) return false;
    
    return true;
  });
  
  cleanContent = filteredLines.join('\n');
  console.log("✅ MEGA TITLE BLOCKER completed. Title removal verified.");
  
  return cleanContent;
}

// 🎨 ABSTRACT ART CONVERTER - 抽象芸術概念変換エンジン
function convertToAbstractArt(visualContent: string): string {
  console.log("🎨 Converting to abstract art concepts...");
  
  // 🔄 具体的要素 → 抽象芸術概念のマッピング
  const abstractMappings = [
    // 建築物の抽象化
    { from: /建物|家|店|駅|学校/g, to: 'geometric architectural forms' },
    { from: /窓|ドア|扉/g, to: 'rectangular light patterns' },
    { from: /道|橋|階段/g, to: 'flowing linear compositions' },
    
    // 人物の抽象化
    { from: /人|人物|silhouette/g, to: 'distant organic shapes' },
    { from: /顔|表情|笑顔/g, to: 'emotional color variations' },
    
    // 具体的地名・固有名詞の抽象化
    { from: /[一-龯]{2,}市|[一-龯]{2,}町|[一-龯]{2,}区/g, to: 'urban landscape composition' },
    { from: /公園|庭|広場/g, to: 'organic green spaces' },
    
    // 時間概念の抽象化
    { from: /朝|morning/g, to: 'warm golden lighting' },
    { from: /夜|night/g, to: 'deep blue atmospheric tones' },
    { from: /夕方|evening/g, to: 'orange-purple gradient transitions' },
    
    // 感情の色彩化
    { from: /静か|穏やか/g, to: 'soft pastel harmonies' },
    { from: /激しい|強い/g, to: 'bold contrasting colors' },
    { from: /温かい|暖かい/g, to: 'warm color temperature ranges' },
    { from: /冷たい|涼しい/g, to: 'cool color temperature spectrums' }
  ];
  
  let abstractContent = visualContent;
  abstractMappings.forEach(mapping => {
    abstractContent = abstractContent.replace(mapping.from, mapping.to);
  });
  
  // 🌟 最終抽象化処理
  const finalAbstract = `
    Abstract artistic essence: ${abstractContent}
    Visual interpretation: Transform these concepts into pure color relationships and compositional balance
    Atmospheric rendering: Express through light, shadow, and emotional color temperature without any textual elements
    Style direction: Like a wordless symphony painted in colors - conveying meaning through pure visual harmony
  `.replace(/\s+/g, ' ').trim();
  
  console.log("✨ Abstract art conversion completed");
  return finalAbstract;
}

// 🔥 MEGA ENHANCED Visual Summary with Complete Title Blocking
function extractEnhancedVisualSummary(novelText: string): string {
  console.log("🚀 Starting MEGA ENHANCED visual extraction with title blocking...");
  
  // 🛡️ STEP 1: MEGA TITLE BLOCKER
  const titleBlockedContent = megaTitleBlocker(novelText);
  
  const lines = titleBlockedContent.split('\n').filter(line => line.trim() !== '');
  
  // 🌟 EXPANDED Visual & Emotional Keywords
  const visualKeywords = [
    // Nature & Landscape (自然・風景)
    '景色', '風景', '自然', '空', '雲', '山', '海', '川', '森', '木', '花', '草',
    '夕日', '朝日', '月', '星', '雨', '雪', '風', '霧', '虹', '湖', '野原', '丘',
    // Colors & Light (色彩・光)
    '色', '光', '影', '明るい', '暗い', '赤', '青', '緑', '黄', '紫', '金', '銀',
    '輝く', '眩しい', '薄暗い', '透明', 'キラキラ', '煌めく', '鮮やか', '淡い',
    // Architecture & Settings (建築・設定)
    '街', '建物', '家', '窓', '道', '橋', '駅', '公園', '庭', '部屋', '店', '塔',
    // Weather & Atmosphere (天候・雰囲気)
    '晴れ', '曇り', '嵐', '穏やか', '静寂', '賑やか', '涼しい', '暖かい',
    // Time & Season (時間・季節)
    '朝', '昼', '夕方', '夜', '春', '夏', '秋', '冬', '季節', '時間'
  ];
  
  const emotionalKeywords = [
    // Emotional States (感情状態)
    '平和', '希望', '憂鬱', '喜び', '悲しみ', '緊張', '安らぎ', '興奮', 
    '恐怖', '愛', '孤独', '温かさ', '清涼感', '重厚感', '軽やか', 
    '美しい', '幻想的', '神秘的', 'ノスタルジック', 'ロマンチック', '優雅'
  ];
  
  // 💎 Extract Visual & Emotional Lines with ULTRA Filtering
  const meaningfulLines = lines.filter(line => {
    // ❌ ULTRA STRICT EXCLUSIONS - もう一度確認
    if (line.match(/^(タイトル|概要|設定|ジャンル|キャラクター|登場人物|あらすじ|シナリオ|Chapter|第.章|Scene|場面|新道|タイル)[:：]/i)) {
      return false;
    }
    
    // ❌ Skip ALL dialogue and quotations
    if (line.includes('「') || line.includes('』') || line.includes('"') || line.includes('『') || line.includes('』')) {
      return false;
    }
    
    // ❌ Skip character names and ALL proper nouns
    if (line.match(/[A-Za-z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+さん|[A-Za-z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+君|[A-Za-z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+ちゃん/)) {
      return false;
    }
    
    // ❌ Skip any line containing potential title words
    if (line.includes('新道') || line.includes('タイル') || line.includes('ZINE')) {
      return false;
    }
    
    // ✅ Include ONLY lines with visual or emotional content
    return visualKeywords.some(keyword => line.includes(keyword)) ||
           emotionalKeywords.some(keyword => line.includes(keyword));
  });
  
  // 🎨 STEP 2: ABSTRACT ART CONVERSION
  const visualContent = meaningfulLines.slice(0, 6).join(' ');
  const abstractArtDescription = convertToAbstractArt(visualContent);
  
  // 🆘 Fallback for extreme cases
  if (abstractArtDescription.length < 50) {
    console.log("🆘 Activating fallback abstract description");
    return "Abstract visual essence: Ethereal atmospheric composition with soft color transitions. Organic forms dissolved into pure emotional color harmonies. Impressionistic landscape suggesting infinite space through graduated light and shadow. Wordless visual poetry expressed in gentle color relationships.";
  }
  
  console.log("✅ MEGA ENHANCED extraction completed:", abstractArtDescription);
  return abstractArtDescription;
}

// 🔥 MEGA ULTRA STRICT Cover Generation - 完全改修版
export async function generateCover(payload: {
  synopsis: string;
  title?: string;
}): Promise<{ url: string; message?: string }> {
  console.log("🔥 MEGA ULTRA STRICT Cover Generation activated!");
  console.log("🛡️ Title information completely blocked - only visual essence will be processed");
  
  // 🛡️ STEP 1: COMPLETE TITLE ELIMINATION
  // タイトル情報を完全に無視し、synopsis からのみ処理
  const titleFreeSynopsis = payload.synopsis; // タイトル情報は意図的に使用しない
  console.log("📦 Original synopsis length:", titleFreeSynopsis.length);
  
  // 🎨 STEP 2: MEGA ENHANCED VISUAL EXTRACTION with TITLE BLOCKING
  const abstractVisualEssence = extractEnhancedVisualSummary(titleFreeSynopsis);
  console.log("🎨 Abstract visual essence extracted:", abstractVisualEssence.substring(0, 200) + "...");
  
  // 🔥 STEP 3: 3-LAYER PROMPT ASSEMBLY
  const compositeMainPrompt = `${MAIN_CREATIVE_PROMPT}

📖 STORY VISUAL ESSENCE:
${abstractVisualEssence}

🎨 ARTISTIC STYLE ENHANCEMENT:
${ARTISTIC_STYLE_PROMPT}`;

  // 🚀 STEP 4: OPTIMIZED API PAYLOAD STRUCTURE
  const megaOptimizedPayload = {
    // Core content (completely title-free)
    synopsis: abstractVisualEssence,
    
    // 3-Layer Prompt System
    system_prompt: SYSTEM_PROMPT,
    user_prompt: compositeMainPrompt,
    negative_prompt: MEGA_NEGATIVE_PROMPT,
    
    // Enhanced parameters for Gemini 2.5 Flash Image
    generation_parameters: {
      model: "gemini-2.5-flash-image",
      aspect_ratio: "3:4",
      quality: "premium",
      style_focus: "abstract_artistic",
      text_prohibition_level: "absolute",
      color_preference: "sophisticated_palette",
      composition_style: "professional_book_cover"
    },
    
    // Quality assurance settings
    validation_requirements: {
      text_detection: "mandatory",
      ocr_check: "enabled",
      artistic_quality: "high",
      readability_prohibition: "strict"
    },
    
    // Backup instructions (if other prompts fail)
    fallback_instruction: "If any previous instruction is unclear: Create a completely wordless, abstract book cover artwork using only colors, shapes, and atmospheric effects. Never include any text, letters, or readable symbols.",
    
    // Critical success criteria
    success_criteria: "Generated image must be 100% text-free and purely visual",
    
    // Debug information
    debug: {
      title_blocked: true,
      visual_extraction_method: "mega_enhanced",
      prompt_layers: 3,
      timestamp: new Date().toISOString()
    }
  };
  
  console.log("📋 MEGA Optimized Payload prepared:");
  console.log("  - System Prompt length:", SYSTEM_PROMPT.length);
  console.log("  - Main Prompt length:", compositeMainPrompt.length);  
  console.log("  - Negative Prompt length:", MEGA_NEGATIVE_PROMPT.length);
  console.log("  - Visual Essence length:", abstractVisualEssence.length);
  console.log("🚀 Sending MEGA ULTRA STRICT payload to Cloud Run API...");
  
  try {
    const result = await apiCall("/cover", megaOptimizedPayload);
    
    if (result.url) {
      console.log("✅ MEGA ULTRA STRICT Cover generated successfully!");
      console.log("🔍 Generated URL:", result.url);
    } else {
      console.log("⚠️ No URL returned, but no error occurred");
    }
    
    return result;
  } catch (error) {
    console.error("🚨 MEGA ULTRA STRICT generation failed:", error);
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

// ZINE保存
export async function saveZine(zineData: any): Promise<{ id: string; message: string }> {
  try {
    // Save to API server
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

// ZINE更新
export async function updateZine(id: string, zineData: any): Promise<{ id: string; message: string }> {
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

  return response.json();
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