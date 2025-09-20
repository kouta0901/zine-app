// Browser-compatible OCR Service
// Note: In production, Google Cloud services should run on server-side API routes
export class OCRService {
  private isServerSide: boolean;
  private docClient: any = null;
  private processorName: string | null = null;

  constructor() {
    this.isServerSide = typeof window === 'undefined';
    
    // Only initialize on server side
    if (this.isServerSide) {
      try {
        const { DocumentProcessorServiceClient } = require("@google-cloud/documentai");
        this.docClient = new DocumentProcessorServiceClient();
        this.initializeProcessor();
      } catch (error) {
        console.warn('Document AI client initialization failed:', error);
      }
    } else {
      console.log('🔧 OCR Service running in browser mode (mock implementation)');
    }
  }

  private async initializeProcessor() {
    const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.DOC_AI_LOCATION || "us"; 
    const processorId = process.env.DOC_OCR_PROCESSOR_ID;

    if (!projectId || !processorId) {
      console.warn("Document AI environment variables not configured. OCR will be disabled.");
      return;
    }

    this.processorName = this.docClient.processorPath(projectId, location, processorId);
  }

  /**
   * Extract text from image using Document AI OCR
   * Optimized for ZINE content like images, text layouts, signs, posters, etc.
   */
  async extractTextFromImage(base64Image: string, mimeType: string = "image/png"): Promise<OCRResult> {
    // Browser mode - return mock data for testing
    if (!this.isServerSide || !this.docClient || !this.processorName) {
      console.log('🔧 OCR: Running in browser or not configured. Returning empty result to avoid mock text leakage.');
      return {
        text: "",
        words: [],
        paragraphs: [],
        confidence: 0,
        detailedContent: false
      };
    }

    try {
      const [result] = await this.docClient.processDocument({
        name: this.processorName,
        rawDocument: {
          content: base64Image,
          mimeType: mimeType,
        },
      });

      const document = result.document;
      if (!document) {
        return {
          text: "",
          words: [],
          paragraphs: [],
          confidence: 0,
          error: "No document returned from OCR"
        };
      }

      // Extract structured text information
      const extractedText = document.text || "";
      const words = this.extractWords(document);
      const paragraphs = this.extractParagraphs(document);
      const confidence = this.calculateAverageConfidence(document);

      return {
        text: extractedText,
        words,
        paragraphs,
        confidence,
        rawDocument: document
      };

    } catch (error) {
      console.error("OCR extraction failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      return {
        text: "",
        words: [],
        paragraphs: [],
        confidence: 0,
        error: `OCR failed: ${message}`
      };
    }
  }

  /**
   * Extract individual words with position and confidence
   */
  private extractWords(document: any): OCRWord[] {
    const words: OCRWord[] = [];
    
    if (document.pages) {
      for (const page of document.pages) {
        if (page.tokens) {
          for (const token of page.tokens) {
            if (token.layout && token.layout.textAnchor && token.layout.boundingPoly) {
              const textSegment = token.layout.textAnchor.textSegments?.[0];
              if (textSegment && document.text) {
                const startIndex = parseInt(textSegment.startIndex) || 0;
                const endIndex = parseInt(textSegment.endIndex) || startIndex;
                const text = document.text.substring(startIndex, endIndex);
                
                words.push({
                  text,
                  confidence: token.layout.confidence || 0,
                  boundingBox: this.extractBoundingBox(token.layout.boundingPoly),
                  startIndex,
                  endIndex
                });
              }
            }
          }
        }
      }
    }
    
    return words;
  }

  /**
   * Extract paragraphs with structure
   */
  private extractParagraphs(document: any): OCRParagraph[] {
    const paragraphs: OCRParagraph[] = [];
    
    if (document.pages) {
      for (const page of document.pages) {
        if (page.paragraphs) {
          for (const para of page.paragraphs) {
            if (para.layout && para.layout.textAnchor && para.layout.boundingPoly) {
              const textSegment = para.layout.textAnchor.textSegments?.[0];
              if (textSegment && document.text) {
                const startIndex = parseInt(textSegment.startIndex) || 0;
                const endIndex = parseInt(textSegment.endIndex) || startIndex;
                const text = document.text.substring(startIndex, endIndex);
                
                paragraphs.push({
                  text,
                  confidence: para.layout.confidence || 0,
                  boundingBox: this.extractBoundingBox(para.layout.boundingPoly),
                  startIndex,
                  endIndex
                });
              }
            }
          }
        }
      }
    }
    
    return paragraphs;
  }

  /**
   * Extract bounding box coordinates
   */
  private extractBoundingBox(boundingPoly: any): BoundingBox {
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

  /**
   * Calculate average confidence score
   */
  private calculateAverageConfidence(document: any): number {
    const confidences: number[] = [];
    
    if (document.pages) {
      for (const page of document.pages) {
        if (page.tokens) {
          for (const token of page.tokens) {
            if (token.layout && token.layout.confidence !== undefined) {
              confidences.push(token.layout.confidence);
            }
          }
        }
      }
    }
    
    if (confidences.length === 0) return 0;
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  /**
   * Enhanced OCR for detailed content like cards, posters, signs, etc.
   * Applies preprocessing and enhanced recognition
   */
  async extractTextFromDetailedContent(base64Image: string): Promise<OCRResult> {
    // For detailed content, we want to be more precise
    const result = await this.extractTextFromImage(base64Image);
    
    if (result.error) return result;
    
    // Post-process for text improvements
    const enhancedText = this.enhanceExtractedText(result.text, result.words);
    
    return {
      ...result,
      text: enhancedText,
      detailedContent: true
    };
  }

  /**
   * Enhanced text processing for detailed content
   */
  private enhanceExtractedText(rawText: string, words: OCRWord[]): string {
    if (!rawText) return rawText;
    
    // Clean up common OCR errors
    let enhanced = rawText
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/['']/g, "'") // Normalize apostrophes
      .replace(/[""]/g, '"') // Normalize quotes
      .trim();
    
    // Common text formatting improvements
    // Numeric patterns: numbers with slashes or colons
    enhanced = enhanced.replace(/(\d{1,4})\s*[:\/]\s*(\d{1,4})/g, '$1:$2');
    
    // Date patterns
    enhanced = enhanced.replace(/(\d{4})\s*年\s*(\d{1,2})\s*月/g, '$1年$2月');
    
    // Common title/label patterns
    enhanced = enhanced.replace(/タイトル\s*[:：]\s*/g, 'タイトル: ');
    enhanced = enhanced.replace(/説明\s*[:：]\s*/g, '説明: ');
    
    return enhanced;
  }
}

// Type definitions for OCR results
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRWord {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  startIndex: number;
  endIndex: number;
}

export interface OCRParagraph {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  startIndex: number;
  endIndex: number;
}

export interface OCRResult {
  text: string;
  words: OCRWord[];
  paragraphs: OCRParagraph[];
  confidence: number;
  error?: string;
  rawDocument?: any;
  detailedContent?: boolean;
}

// Singleton instance
export const ocrService = new OCRService();