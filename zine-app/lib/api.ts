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

// 🛡️ CONSERVATIVE TITLE CLEANER - 画像由来コンテンツ保護版
function megaTitleBlocker(content: string): string {
  console.log("🛡️ CONSERVATIVE TITLE CLEANER activated (preserves image content)...");
  
  // 🚫 PHASE 1: 明確な章・タイトル記法のみを限定除去（fix0912.md対応）
  const conservativeTitlePatterns = [
    // 明確な章・セクション形式のみ（行頭に限定）
    /^(タイトル|題名|書名|作品名|小説名)[:：]\s*.+$/gim,
    // 典型的な章記法のみ（行頭の第○章など）
    /^(Chapter\s+\d+|第[0-9１-９一二三四五六七八九十]+章|Scene\s+\d+|場面\s*[0-9０-９]+)[:：\s]/gim,
  ];
  
  let cleanContent = content;
  conservativeTitlePatterns.forEach((pattern, index) => {
    const beforeLength = cleanContent.length;
    cleanContent = cleanContent.replace(pattern, '');
    const afterLength = cleanContent.length;
    if (beforeLength !== afterLength) {
      console.log(`🗑️ Conservative pattern ${index + 1} removed: ${beforeLength - afterLength} characters`);
    }
  });
  
  // ⚠️ 以下の削除ルールを緩和（画像由来コンテンツ保護）
  
  // 削除しない項目（fix0912.md推奨）:
  // ❌ 引用符で囲まれた内容 → 画像の吹き出しや会話かもしれない
  // ❌ 大文字・英数字の行 → 画像の看板・ラベルかもしれない  
  // ❌ カタカナのみの行 → 画像内の重要な固有名詞かもしれない
  // ❌ 短い行（2文字以下）→ 画像ラベルや感嘆詞かもしれない
  
  // 🚫 PHASE 2: 明らかな装飾記号のみ除去（限定的）
  cleanContent = cleanContent.replace(/^[★☆※]\s*$/gm, ''); // 単独の装飾記号行のみ
  
  console.log("✅ CONSERVATIVE TITLE CLEANER completed. Image content preserved.");
  
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
    if (line.match(/^(タイトル|概要|設定|ジャンル|キャラクター|登場人物|あらすじ|シナリオ|Chapter|第.章|Scene|場面|新道|タイル|振動)[:：]/i)) {
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
    if (line.includes('新道') || line.includes('タイル') || line.includes('ZINE') || 
        line.includes('振動タイル') || line.includes('振動') || line.includes('小説タイトル')) {
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
  keywords?: string[];
}): Promise<{ url: string; message?: string }> {
  console.log("🔥 MEGA ULTRA STRICT Cover Generation activated!");
  console.log("🛡️ Title information completely blocked - only visual essence will be processed");
  
  // 🛡️ STEP 1: COMPLETE TITLE ELIMINATION
  // タイトル情報を完全に無視し、synopsis からのみ処理
  const titleFreeSynopsis = payload.synopsis; // タイトル情報は意図的に使用しない
  console.log("📦 Original synopsis length:", titleFreeSynopsis.length);

  // 🎨 STEP 2: MEGA ENHANCED VISUAL EXTRACTION with TITLE BLOCKING
  let abstractVisualEssence = extractEnhancedVisualSummary(titleFreeSynopsis);

  // 🌟 STEP 2.5: KEYWORD INTEGRATION (if provided)
  if (payload.keywords && payload.keywords.length > 0) {
    console.log("🎯 User keywords detected:", payload.keywords);
    const keywordEnhancement = `
      Additional visual concepts: ${payload.keywords.join(', ')}
      Style enhancement: Incorporate these visual elements into the artistic composition
      Creative fusion: Blend these concepts with the extracted visual essence for enhanced artistic direction
    `.trim();

    abstractVisualEssence = `${abstractVisualEssence}

    ${keywordEnhancement}`;
    console.log("✨ Enhanced with user keywords - new length:", abstractVisualEssence.length);
  }

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
      model: "gemini-2.5-flash-image-preview",
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