// Browser-compatible Vertex AI Gemini Image Captioning Service  
export class ImageCaptioningService {
  private isServerSide: boolean;
  private vertex: any = null;
  private model: any = null;

  constructor() {
    this.isServerSide = typeof window === 'undefined';
    
    // Only initialize on server side
    if (this.isServerSide) {
      this.initializeVertex();
    } else {
      console.log('🔧 Captioning Service running in browser mode (mock implementation)');
    }
  }

  private async initializeVertex() {
    const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_AI_LOCATION || "us-central1";

    if (!projectId) {
      console.warn("Vertex AI environment variables not configured. Image captioning will be disabled.");
      return;
    }

    try {
      const { VertexAI } = require("@google-cloud/vertexai");
      this.vertex = new VertexAI({ 
        project: projectId, 
        location: location 
      });
      
      // Use Gemini 2.5 Flash for speed and cost efficiency
      this.model = this.vertex.getGenerativeModel({ 
        model: "gemini-2.5-flash" 
      });
    } catch (error) {
      console.error("Failed to initialize Vertex AI:", error);
    }
  }

  /**
   * Generate detailed caption for ZINE image content
   * Optimized for narrative and visual storytelling
   */
  async generateImageCaption(
    base64Image: string, 
    hint: string = "",
    style: CaptionStyle = "narrative"
  ): Promise<CaptionResult> {
    if (!this.model) {
      return {
        caption: "",
        confidence: 0,
        error: "Vertex AI not configured"
      };
    }

    try {
      const prompt = this.buildCaptionPrompt(style, hint);
      
      const response = await this.model.generateContent({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { 
              inlineData: { 
                mimeType: "image/png", 
                data: base64Image 
              } 
            }
          ]
        }]
      });

      const caption = response.response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
      
      return {
        caption,
        confidence: this.calculateConfidenceFromResponse(response),
        style,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("Image captioning failed:", error);
      return {
        caption: "",
        confidence: 0,
        error: `Captioning failed: ${error.message}`,
        style
      };
    }
  }

  /**
   * Answer specific questions about image content
   * Useful for extracting specific details for story generation
   */
  async analyzeImageWithQuestions(
    base64Image: string,
    questions: string[],
    context: string = ""
  ): Promise<ImageAnalysisResult> {
    if (!this.model) {
      return {
        answers: {},
        summary: "",
        confidence: 0,
        error: "Vertex AI not configured"
      };
    }

    try {
      const prompt = this.buildAnalysisPrompt(questions, context);
      
      const response = await this.model.generateContent({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { 
              inlineData: { 
                mimeType: "image/png", 
                data: base64Image 
              } 
            }
          ]
        }]
      });

      const responseText = response.response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
      const answers = this.parseQAResponse(responseText, questions);
      
      return {
        answers,
        summary: responseText,
        confidence: this.calculateConfidenceFromResponse(response),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("Image analysis failed:", error);
      return {
        answers: {},
        summary: "",
        confidence: 0,
        error: `Analysis failed: ${error.message}`
      };
    }
  }

  /**
   * Enhanced caption generation for ZINE-to-novel conversion
   * Combines captioning with contextual hints from nearby text
   */
  async generateEnhancedCaption(
    base64Image: string,
    nearbyText: string = "",
    pageContext: string = "",
    imageIndex: number = 0
  ): Promise<EnhancedCaptionResult> {
    
    // Browser mode - return mock data for testing
    if (!this.isServerSide || !this.model) {
      console.log('🔧 Captioning: Using mock data (browser mode or not configured)');
      
      // Mock enhanced caption for general content example
      return {
        caption: `ページ${imageIndex + 1}には印象的な人物や物体が描かれている。明るい色彩で表現された主要な要素が、画面の中央に配置されている。背景には自然な環境や建物が見え、全体的に調和の取れた構図となっている。画像の一部にはテキストや説明文が含まれており、内容の理解を助けている。`,
        analysis: {
          question_1: "主要な視覚要素は中央に配置された人物や物体で、明確に識別できる形で描かれています",
          question_2: "登場する要素は自然で表情豊かな状態を示しており、物語性を感じさせます",
          question_3: "画像全体に温かみのある雰囲気が漂っており、親しみやすい世界観を表現しています",
          question_4: "背景は適度に詳細で、主要素を引き立てる役割を果たしています",
          question_5: "画像内にはタイトルや説明文などのテキスト要素が適切に配置されています",
          question_6: "この画像は物語の重要な場面を表現しており、読者の興味を引く内容となっています"
        },
        visualElements: ["人物", "背景", "テキスト", "色彩", "構図"],
        emotionalTone: "positive",
        storyContext: `興味深い場面の描写 | 関連テキスト: ${nearbyText} | ページ文脈: ${pageContext}`,
        confidence: 0.89,
        imageIndex,
        error: undefined
      };
    }
    const questions = [
      "この画像の主要な視覚要素は何ですか？",
      "画像に描かれている人物や物体の表情や状態は？",
      "画像の雰囲気や感情的なトーンは？",
      "背景や設定について説明してください",
      "画像内に文字やテキストが見えますか？",
      "この画像が物語の中でどのような場面を表していると思いますか？"
    ];

    const [caption, analysis] = await Promise.all([
      this.generateImageCaption(
        base64Image, 
        `周辺テキスト: ${nearbyText}\nページ文脈: ${pageContext}`,
        "detailed"
      ),
      this.analyzeImageWithQuestions(base64Image, questions, pageContext)
    ]);

    return {
      caption: caption.caption,
      analysis: analysis.answers,
      visualElements: this.extractVisualElements(analysis.summary),
      emotionalTone: this.extractEmotionalTone(analysis.summary),
      storyContext: this.generateStoryContext(caption.caption, nearbyText, pageContext),
      confidence: (caption.confidence + analysis.confidence) / 2,
      error: caption.error || analysis.error,
      imageIndex
    };
  }

  /**
   * Build caption generation prompt based on style
   */
  private buildCaptionPrompt(style: CaptionStyle, hint: string): string {
    const basePrompt = "画像の内容を詳しく分析し、以下の要件に従って説明してください：";
    
    const stylePrompts = {
      narrative: `
${basePrompt}
- 小説の地の文として使える情景描写で記述
- 200字以内で簡潔に
- 視覚的な詳細と雰囲気を重視
- 読者の想像力を掻き立てる表現を使用`,

      detailed: `
${basePrompt}
- 画像の全ての視覚要素を詳細に記述
- 人物、物体、背景、色彩、構図を含む
- 300字以内で体系的に
- 物語生成に必要な情報を優先`,

      technical: `
${basePrompt}
- 画像の技術的・客観的な記述
- 要素の配置、サイズ、関係性を明確に
- 150字以内で正確に
- 測定可能な特徴を重視`,

      emotional: `
${basePrompt}
- 画像が表現している感情や雰囲気を重視
- 見る人の感情に訴える記述
- 180字以内で感情豊かに
- 物語の感情的な文脈を強化`
    };

    let prompt = stylePrompts[style];
    
    if (hint) {
      prompt += `\n\n補助情報: ${hint}`;
    }

    return prompt;
  }

  /**
   * Build image analysis prompt with questions
   */
  private buildAnalysisPrompt(questions: string[], context: string): string {
    let prompt = `画像を詳しく分析し、以下の質問に日本語で答えてください：\n\n`;
    
    questions.forEach((q, i) => {
      prompt += `${i + 1}. ${q}\n`;
    });

    if (context) {
      prompt += `\n文脈情報: ${context}`;
    }

    prompt += `\n\n各質問に対して明確で具体的な回答を提供してください。`;

    return prompt;
  }

  /**
   * Parse question-answer response
   */
  private parseQAResponse(responseText: string, questions: string[]): Record<string, string> {
    const answers: Record<string, string> = {};
    
    // Simple parsing - in production, might want more sophisticated NLP
    const lines = responseText.split('\n').filter(line => line.trim());
    
    questions.forEach((question, index) => {
      const questionKey = `question_${index + 1}`;
      const answerLine = lines.find(line => 
        line.includes(`${index + 1}.`) || line.includes(`${index + 1}:`)
      );
      
      if (answerLine) {
        // Extract answer after number and punctuation
        const answer = answerLine.replace(/^\d+[.:]\s*/, '').trim();
        answers[questionKey] = answer;
      }
    });

    // If parsing fails, store the full response
    if (Object.keys(answers).length === 0) {
      answers['full_response'] = responseText;
    }

    return answers;
  }

  /**
   * Extract visual elements from analysis
   */
  private extractVisualElements(summary: string): string[] {
    const elements: string[] = [];
    const keywords = [
      '人物', '顔', '表情', '手', '体',
      '建物', '風景', '空', '雲', '山', '海',
      '色', '光', '影', '背景',
      '文字', 'テキスト', '看板', 'カード'
    ];

    keywords.forEach(keyword => {
      if (summary.includes(keyword)) {
        elements.push(keyword);
      }
    });

    return elements;
  }

  /**
   * Extract emotional tone from analysis
   */
  private extractEmotionalTone(summary: string): string {
    const emotions = [
      { keywords: ['明るい', '楽しい', '幸せ', '喜び'], tone: 'positive' },
      { keywords: ['暗い', '悲しい', '憂鬱', '落ち込み'], tone: 'melancholic' },
      { keywords: ['緊張', '不安', '恐怖', '心配'], tone: 'tense' },
      { keywords: ['平和', '静か', '穏やか', '安らか'], tone: 'peaceful' },
      { keywords: ['激しい', '動的', 'エネルギッシュ'], tone: 'dynamic' }
    ];

    for (const emotion of emotions) {
      if (emotion.keywords.some(keyword => summary.includes(keyword))) {
        return emotion.tone;
      }
    }

    return 'neutral';
  }

  /**
   * Generate story context from combined information
   */
  private generateStoryContext(
    caption: string,
    nearbyText: string,
    pageContext: string
  ): string {
    const contexts = [caption];
    
    if (nearbyText) {
      contexts.push(`関連テキスト: ${nearbyText}`);
    }
    
    if (pageContext) {
      contexts.push(`ページ文脈: ${pageContext}`);
    }

    return contexts.join(' | ');
  }

  /**
   * Calculate confidence from API response
   */
  private calculateConfidenceFromResponse(response: any): number {
    // Vertex AI doesn't always provide confidence scores
    // We'll use a heuristic based on response quality
    const text = response.response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    
    if (!text) return 0;
    if (text.length < 20) return 0.3;
    if (text.length < 50) return 0.6;
    if (text.length < 100) return 0.8;
    return 0.9;
  }
}

// Type definitions
export type CaptionStyle = "narrative" | "detailed" | "technical" | "emotional";

export interface CaptionResult {
  caption: string;
  confidence: number;
  style?: CaptionStyle;
  timestamp?: string;
  error?: string;
}

export interface ImageAnalysisResult {
  answers: Record<string, string>;
  summary: string;
  confidence: number;
  timestamp?: string;
  error?: string;
}

export interface EnhancedCaptionResult {
  caption: string;
  analysis: Record<string, string>;
  visualElements: string[];
  emotionalTone: string;
  storyContext: string;
  confidence: number;
  imageIndex: number;
  error?: string;
}

// Singleton instance
export const imageCaptioningService = new ImageCaptioningService();