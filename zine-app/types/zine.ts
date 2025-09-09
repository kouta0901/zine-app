// ZINE関連の型定義

export interface Element {
  id: string
  type: "text" | "image" | "shape"
  x: number
  y: number
  width: number
  height: number
  content?: string
  src?: string
  color?: string
  fontSize?: number
  pageId: string
}

export interface Page {
  id: string
  elements: Element[]
  title: string
}

export interface ChatMessage {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
}

export interface TextSelection {
  start: number
  end: number
  text: string
}

export interface ReviewSuggestion {
  id: string
  originalText: string
  suggestedText: string
  reason: string
  applied: boolean
}

export type CreatorMode = "zine" | "novel"
export type MenuSection = "concept" | "ai-writer" | "worldview" | "writer-review" | "style" | "onepoint"

export interface SavedZineData {
  id: string
  title: string
  pages: Page[]
  conceptConfig?: any
  worldviewConfig?: any
  novelContent?: string
  novelPages?: string[]
  coverImageUrl?: string
  currentMode?: CreatorMode // 🔄 保存時のモードを記録
  createdAt: string
  lastModified?: string
}

export interface ZineCreatorProps {
  onBack: () => void
  initialData?: SavedZineData | null
  onPublishedBooksUpdate?: () => void
}