// Enhanced spatial analysis for ZINE element relationships
// Based on recommendations from fix0912.md

export interface Rectangle {
  x: number;
  y: number;
  w: number;
  h: number;
  content?: string;
  type?: 'image' | 'text';
  id?: string;
}

export interface SpatialRelationship {
  element: Rectangle;
  distance: number;
  weightedDistance: number;
  direction: 'above' | 'below' | 'left' | 'right' | 'overlapping';
  confidence: number;
}

/**
 * Enhanced spatial analysis service for ZINE elements
 * Implements rectangle-based distance calculations with directional weighting
 */
export class SpatialAnalysisService {
  
  /**
   * Calculate the minimum distance between two rectangles
   * Returns 0 if rectangles overlap
   */
  static calculateRectangleDistance(rectA: Rectangle, rectB: Rectangle): number {
    // Calculate the horizontal distance
    const dx = Math.max(0, Math.max(
      rectA.x - (rectB.x + rectB.w),  // rectA is to the right of rectB
      rectB.x - (rectA.x + rectA.w)   // rectB is to the right of rectA
    ));
    
    // Calculate the vertical distance
    const dy = Math.max(0, Math.max(
      rectA.y - (rectB.y + rectB.h),  // rectA is below rectB
      rectB.y - (rectA.y + rectA.h)   // rectB is below rectA
    ));
    
    // Return the Euclidean distance between rectangle edges
    return Math.hypot(dx, dy);
  }

  /**
   * Calculate directional weight based on relative position
   * Lower values indicate higher priority (closer relationship)
   */
  static calculateDirectionalWeight(imageRect: Rectangle, textRect: Rectangle): number {
    const imageCenterY = imageRect.y + imageRect.h / 2;
    const textCenterY = textRect.y + textRect.h / 2;
    const imageCenterX = imageRect.x + imageRect.w / 2;
    const textCenterX = textRect.x + textRect.w / 2;

    // Check for overlap (highest priority)
    if (this.checkRectangleOverlap(imageRect, textRect)) {
      return 0.1;
    }

    // Determine primary direction
    const verticalDistance = Math.abs(textCenterY - imageCenterY);
    const horizontalDistance = Math.abs(textCenterX - imageCenterX);

    // Below the image (captions) - highest priority for text
    if (textCenterY > imageCenterY && verticalDistance > horizontalDistance) {
      return 0.6; // Strong preference for captions below
    }

    // Horizontally aligned (side captions)
    if (Math.abs(textCenterY - imageCenterY) < imageRect.h * 0.3) {
      return 1.0; // Normal weight for side text
    }

    // Above the image (titles, headers)
    if (textCenterY < imageCenterY) {
      return 1.2; // Slight penalty for text above
    }

    // Far below or diagonal
    return 1.5;
  }

  /**
   * Check if two rectangles overlap
   */
  static checkRectangleOverlap(rectA: Rectangle, rectB: Rectangle): boolean {
    return !(
      rectA.x + rectA.w <= rectB.x ||  // rectA is completely to the left
      rectB.x + rectB.w <= rectA.x ||  // rectB is completely to the left
      rectA.y + rectA.h <= rectB.y ||  // rectA is completely above
      rectB.y + rectB.h <= rectA.y     // rectB is completely above
    );
  }

  /**
   * Calculate dynamic threshold based on image size
   * Larger images can capture text from further away
   */
  static calculateDynamicThreshold(imageRect: Rectangle): number {
    const minDimension = Math.min(imageRect.w, imageRect.h);
    const baseThreshold = minDimension * 0.6;
    
    // Apply bounds: minimum 120px, maximum 220px
    return Math.max(120, Math.min(baseThreshold, 220));
  }

  /**
   * Determine the primary direction of a text element relative to an image
   */
  static getRelativeDirection(imageRect: Rectangle, textRect: Rectangle): 'above' | 'below' | 'left' | 'right' | 'overlapping' {
    if (this.checkRectangleOverlap(imageRect, textRect)) {
      return 'overlapping';
    }

    const imageCenterY = imageRect.y + imageRect.h / 2;
    const textCenterY = textRect.y + textRect.h / 2;
    const imageCenterX = imageRect.x + imageRect.w / 2;
    const textCenterX = textRect.x + textRect.w / 2;

    const verticalDistance = Math.abs(textCenterY - imageCenterY);
    const horizontalDistance = Math.abs(textCenterX - imageCenterX);

    // Determine primary axis
    if (verticalDistance > horizontalDistance) {
      return textCenterY > imageCenterY ? 'below' : 'above';
    } else {
      return textCenterX > imageCenterX ? 'right' : 'left';
    }
  }

  /**
   * Filter out boilerplate and empty text content
   */
  static isValidTextContent(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    
    const trimmed = text.trim();
    if (trimmed.length === 0) return false;

    // Common boilerplate patterns to exclude
    const boilerplatePatterns = [
      /^クリックして編集$/i,
      /^テキストを入力$/i,
      /^サンプルテキスト$/i,
      /^lorem ipsum/i,
      /^placeholder/i,
      /^\s*$/, // Empty or whitespace only
      /^[.\s]*$/, // Only dots and spaces
    ];

    return !boilerplatePatterns.some(pattern => pattern.test(trimmed));
  }

  /**
   * Find the best nearby text for a given image using enhanced spatial analysis
   */
  static findNearbyTextEnhanced(imageRect: Rectangle, textElements: Rectangle[]): SpatialRelationship | null {
    const threshold = this.calculateDynamicThreshold(imageRect);
    let bestRelationship: SpatialRelationship | null = null;
    let bestScore = Infinity;

    for (const textRect of textElements) {
      // Skip invalid text content
      if (!this.isValidTextContent(textRect.content || '')) {
        continue;
      }

      // Calculate base distance between rectangles
      const distance = this.calculateRectangleDistance(imageRect, textRect);
      
      // Apply directional weighting
      const directionWeight = this.calculateDirectionalWeight(imageRect, textRect);
      const weightedDistance = distance * directionWeight;

      // Only consider elements within threshold
      if (distance <= threshold) {
        const direction = this.getRelativeDirection(imageRect, textRect);
        
        // Calculate confidence based on distance and direction
        let confidence = 1 - (weightedDistance / threshold);
        
        // Boost confidence for overlapping or below-positioned text
        if (direction === 'overlapping') {
          confidence = Math.min(1.0, confidence * 1.5);
        } else if (direction === 'below') {
          confidence = Math.min(1.0, confidence * 1.3);
        }

        // Track the best match
        if (weightedDistance < bestScore) {
          bestScore = weightedDistance;
          bestRelationship = {
            element: textRect,
            distance,
            weightedDistance,
            direction,
            confidence: Math.max(0, Math.min(1, confidence))
          };
        }
      }
    }

    return bestRelationship;
  }

  /**
   * Find all related text elements within reasonable distance
   */
  static findAllRelatedText(imageRect: Rectangle, textElements: Rectangle[]): SpatialRelationship[] {
    const threshold = this.calculateDynamicThreshold(imageRect);
    const relationships: SpatialRelationship[] = [];

    for (const textRect of textElements) {
      if (!this.isValidTextContent(textRect.content || '')) {
        continue;
      }

      const distance = this.calculateRectangleDistance(imageRect, textRect);
      
      if (distance <= threshold) {
        const directionWeight = this.calculateDirectionalWeight(imageRect, textRect);
        const weightedDistance = distance * directionWeight;
        const direction = this.getRelativeDirection(imageRect, textRect);
        
        let confidence = 1 - (weightedDistance / threshold);
        
        // Apply direction-based confidence boosts
        if (direction === 'overlapping') {
          confidence = Math.min(1.0, confidence * 1.5);
        } else if (direction === 'below') {
          confidence = Math.min(1.0, confidence * 1.3);
        }

        relationships.push({
          element: textRect,
          distance,
          weightedDistance,
          direction,
          confidence: Math.max(0, Math.min(1, confidence))
        });
      }
    }

    // Sort by weighted distance (closer relationships first)
    return relationships.sort((a, b) => a.weightedDistance - b.weightedDistance);
  }

  /**
   * Analyze the spatial layout of a page
   */
  static analyzePageLayout(elements: Rectangle[]): {
    images: Rectangle[];
    textElements: Rectangle[];
    imageTextPairs: Array<{
      image: Rectangle;
      relatedText: SpatialRelationship[];
      primaryText?: SpatialRelationship;
    }>;
  } {
    const images = elements.filter(el => el.type === 'image');
    const textElements = elements.filter(el => el.type === 'text');
    
    const imageTextPairs = images.map(image => {
      const relatedText = this.findAllRelatedText(image, textElements);
      const primaryText = relatedText.length > 0 ? relatedText[0] : undefined;
      
      return {
        image,
        relatedText,
        primaryText
      };
    });

    return {
      images,
      textElements,
      imageTextPairs
    };
  }

  /**
   * Convert ZINE page elements to Rectangle format
   */
  static convertZineElementsToRectangles(elements: any[]): Rectangle[] {
    return elements.map(element => ({
      x: element.x || 0,
      y: element.y || 0,
      w: element.width || 0,
      h: element.height || 0,
      content: element.content || element.altText || '',
      type: element.type as 'image' | 'text',
      id: element.id
    }));
  }

  /**
   * Calculate the center point of a rectangle
   */
  static getRectangleCenter(rect: Rectangle): { x: number; y: number } {
    return {
      x: rect.x + rect.w / 2,
      y: rect.y + rect.h / 2
    };
  }

  /**
   * Calculate the area of a rectangle
   */
  static getRectangleArea(rect: Rectangle): number {
    return rect.w * rect.h;
  }

  /**
   * Calculate the intersection area of two rectangles
   */
  static getIntersectionArea(rectA: Rectangle, rectB: Rectangle): number {
    const xOverlap = Math.max(0, Math.min(rectA.x + rectA.w, rectB.x + rectB.w) - Math.max(rectA.x, rectB.x));
    const yOverlap = Math.max(0, Math.min(rectA.y + rectA.h, rectB.y + rectB.h) - Math.max(rectA.y, rectB.y));
    return xOverlap * yOverlap;
  }

  /**
   * Calculate Intersection over Union (IoU) for two rectangles
   */
  static calculateIoU(rectA: Rectangle, rectB: Rectangle): number {
    const intersectionArea = this.getIntersectionArea(rectA, rectB);
    const unionArea = this.getRectangleArea(rectA) + this.getRectangleArea(rectB) - intersectionArea;
    
    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }
}

// Export the service as default
export default SpatialAnalysisService;