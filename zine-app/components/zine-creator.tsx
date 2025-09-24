"use client"

import { motion } from "framer-motion"
import { useState, useRef, useEffect, useMemo } from "react"
import {
  ArrowLeft,
  ImageIcon,
  Save,
  Eye,
  User,
  LandmarkIcon as Landscape,
  MessageCircle,
  Palette,
  Target,
  BookOpen,
  Send,
  Sparkles,
  Type,
  X,
  FileText,
  Brush,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { novelizeWithImagesEnhanced, saveZine, updateZine, review, generateCover } from "@/lib/api"
import { ocrService } from "@/lib/ocr"
import { imageCaptioningService } from "@/lib/captioning"
import SpatialAnalysisService from "@/lib/spatial-analysis"
import { LoadingScreens } from "./LoadingScreens"
import { notifications } from "./notification"
import { ZineToolbar } from "./ZineToolbar"
import { ZineCanvas, ZineCanvasHandle } from "./ZineCanvas"
import { ZineMenuPanel } from "./ZineMenuPanel"
import { CoverGenerationModal } from "./CoverGenerationModal"
import { SuggestionBubble } from "./SuggestionBubble"
import { ConfirmationDialog } from "./ConfirmationDialog"
import { ZineCreatorProps, Element, Page, ChatMessage, TextSelection, ReviewSuggestion, CreatorMode, MenuSection } from "@/types/zine"

// TextSuggestion interface for the new suggestion system
interface TextSuggestion {
  id: string
  originalText: string
  suggestedText: string
  position: { x: number, y: number, width: number, height: number }
  instruction: string
  timestamp: Date
}

// 動的フォントサイズとページ分割のフック
const useResponsiveNovelDisplay = (novelContent: string, originalPages: string[]) => {
  const [fontSize, setFontSize] = useState(16); // デフォルトサイズ
  const [dynamicPages, setDynamicPages] = useState<string[]>([]);
  
  // 動的ページ分割関数（改善版）
  const createDynamicPages = (content: string, maxCharsPerPage: number) => {
    const pages = [];
    let remaining = content;
    
    while (remaining.length > 0) {
      // より保守的な文字数で分割（80%の容量を使用）
      const conservativeCharsPerPage = Math.floor(maxCharsPerPage * 0.8);
      
      if (remaining.length <= conservativeCharsPerPage) {
        pages.push(remaining);
        break;
      }
      
      // 自然な区切りで分割
      const pageContent = remaining.substring(0, conservativeCharsPerPage);
      const lastParagraph = pageContent.lastIndexOf('\n\n');
      const lastSentence = pageContent.lastIndexOf('。');
      const lastComma = pageContent.lastIndexOf('、');
      const lastSpace = pageContent.lastIndexOf('　'); // 全角スペース
      
      // より良い分割点を選択
      const splitPoint = Math.max(lastParagraph, lastSentence, lastComma, lastSpace);
      
      // 分割点が見つからない場合は、より短い文字数で強制分割
      const actualSplitPoint = splitPoint > conservativeCharsPerPage * 0.6 
        ? splitPoint 
        : Math.floor(conservativeCharsPerPage * 0.7);
      
      pages.push(remaining.substring(0, actualSplitPoint));
      remaining = remaining.substring(actualSplitPoint);
    }
    
    return pages;
  };
  
  useEffect(() => {
    const calculateDisplaySettings = () => {
      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      
      // デフォルトサイズを基準に調整（基準: 1200x800）
      const baseFontSize = 16;
      const widthScale = screenWidth / 1200;
      const heightScale = screenHeight / 800;
      const scaleFactor = Math.min(widthScale, heightScale, 1.2); // 最大1.2倍まで
      
      const newFontSize = Math.max(12, Math.min(20, baseFontSize * scaleFactor));
      setFontSize(newFontSize);
      
      // より正確なページあたりの文字数を計算
      // 実際のページ幅: 画面幅の40% - パディング(24px * 2)
      const actualPageWidth = (screenWidth * 0.4) - 48;
      // 実際のページ高さ: 画面高さの60% - パディング(64px + 32px)
      const actualPageHeight = (screenHeight * 0.6) - 96;
      
      // 日本語文字の幅をより正確に計算（全角文字の幅）
      const charWidth = newFontSize * 1.0; // 日本語はほぼ正方形
      const lineHeight = newFontSize * 2.2;
      
      const charsPerLine = Math.floor(actualPageWidth / charWidth);
      const linesPerPage = Math.floor(actualPageHeight / lineHeight);
      const maxCharsPerPage = charsPerLine * linesPerPage;
      
      console.log(`📏 Page calculation: ${charsPerLine} chars/line × ${linesPerPage} lines = ${maxCharsPerPage} chars/page`);
      
      // 動的ページ分割
      if (novelContent) {
        const pages = createDynamicPages(novelContent, maxCharsPerPage);
        setDynamicPages(pages);
      } else {
        setDynamicPages(originalPages);
      }
    };
    
    calculateDisplaySettings();
    window.addEventListener('resize', calculateDisplaySettings);
    return () => window.removeEventListener('resize', calculateDisplaySettings);
  }, [novelContent, originalPages]);
  
  return { fontSize, pages: dynamicPages };
};

export function ZineCreator({ onBack, initialData, onPublishedBooksUpdate }: ZineCreatorProps) {
  const canvasRef = useRef<ZineCanvasHandle>(null)
  const [currentMode, setCurrentMode] = useState<"zine" | "novel">("zine")
  const [zineTitle, setZineTitle] = useState("")
  const [existingWorkId, setExistingWorkId] = useState<string | null>(null) // Track existing work ID
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [editingElement, setEditingElement] = useState<string | null>(null)
  const [activeMenuSection, setActiveMenuSection] = useState<string | null>(null)
  const [activeNovelSection, setActiveNovelSection] = useState<string | null>(null)
  const [showNovelizeButton, setShowNovelizeButton] = useState(false) // Track if novelize button should be shown
  const [showConfigPanel, setShowConfigPanel] = useState(false) // Declare the variable here
  const [showModeChangeConfirm, setShowModeChangeConfirm] = useState(false) // Confirmation dialog for mode change
  const [showZineExamples, setShowZineExamples] = useState(false)
  const [isGeneratingNovel, setIsGeneratingNovel] = useState(false) // Loading state for novel generation
  const [isModifyingStyle, setIsModifyingStyle] = useState(false) // Loading state for style modifications
  const [isApplyingOnepoint, setIsApplyingOnepoint] = useState(false) // Loading state for onepoint advice
  const [isSaving, setIsSaving] = useState(false) // Loading state for save operation
  const [isGeneratingCover, setIsGeneratingCover] = useState(false) // Loading state for cover image generation
  const [isApplyingReview, setIsApplyingReview] = useState(false) // Loading state for review chat operations
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null) // Generated cover image URL
  const [showCoverModal, setShowCoverModal] = useState(false) // Cover generation modal state
  const [textSuggestions, setTextSuggestions] = useState<TextSuggestion[]>([]) // Text suggestions for writer review

  const [pages, setPages] = useState<Page[]>([{ id: "page1", elements: [], title: "Page 1-2" }])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "ai",
      content: "こんにちは！私はあなたのAIパートナーです。一緒に素晴らしい作品を作りましょう！何から始めますか？",
      timestamp: new Date(),
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [novelContent, setNovelContent] = useState("")
  const [bookTheme, setBookTheme] = useState<"light" | "sepia" | "dark">("light")
  const [currentNovelPage, setCurrentNovelPage] = useState(0)
  const [novelPages, setNovelPages] = useState<string[]>([])
  const [textMeasureRef, setTextMeasureRef] = useState<HTMLDivElement | null>(null)

  // 動的フォントサイズとページ分割を使用
  const { fontSize, pages: dynamicPages } = useResponsiveNovelDisplay(
    novelContent, 
    novelPages
  )

  const [selectedText, setSelectedText] = useState<TextSelection | null>(null)
  const [isSelectionProtected, setIsSelectionProtected] = useState(false) // 選択保護フラグ
  const [reviewSuggestions, setReviewSuggestions] = useState<ReviewSuggestion[]>([])
  const [reviewChatMessages, setReviewChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "ai",
      content:
        "こんにちは！私はあなたの作品をレビューするAI作家です。文章の改善点や表現のアドバイスをお手伝いします。\n\n💡 使い方：\n• テキストを選択 → 選択部分のみ修正\n• 選択なし → 小説全文を修正\n\nどのような修正をご希望ですか？",
      timestamp: new Date(),
    },
  ])
  const [reviewChatInput, setReviewChatInput] = useState("")

  const [inlineSuggestions, setInlineSuggestions] = useState<{ [key: string]: ReviewSuggestion }>({})

  const currentPage = pages[currentPageIndex]

  const isCoverPage = false

  // Migration: Fix existing elements without pageId
  useEffect(() => {
    let needsMigration = false
    const migratedPages = pages.map(page => {
      const migratedElements = page.elements.map(element => {
        if (!element.pageId) {
          needsMigration = true
          return { ...element, pageId: page.id }
        }
        return element
      })
      return { ...page, elements: migratedElements }
    })
    
    if (needsMigration) {
      console.log('🔄 Migrating existing elements to add pageId')
      setPages(migratedPages)
    }
  }, [pages.length]) // Only run when pages array length changes to avoid infinite loops

  // initialData処理用のuseEffect - 既存作品の復元
  useEffect(() => {
    if (initialData) {
      console.log('📂 Restoring existing work data:', initialData.title)
      console.log('🔍 Restoring mode:', initialData.currentMode || 'zine')
      console.log('🆔 Existing work ID:', initialData.id)

      // 既存作品のIDを設定
      if (initialData.id) {
        setExistingWorkId(initialData.id)
        console.log('🎯 Set existing work ID:', initialData.id)
      }

      // タイトルを復元
      if (initialData.title) {
        setZineTitle(initialData.title)
      }

      // モードを復元（デフォルトはzine）
      if (initialData.currentMode) {
        setCurrentMode(initialData.currentMode)
        console.log('🎯 Mode restored to:', initialData.currentMode)
      } else {
        setCurrentMode("zine")
        console.log('🎯 Mode set to default: zine')
      }

      // ページを復元
      if (initialData.pages && initialData.pages.length > 0) {
        setPages(initialData.pages)
        console.log('📄 Pages restored:', initialData.pages.length)
      }

      // 小説コンテンツを復元
      if (initialData.novelContent) {
        setNovelContent(initialData.novelContent)
        console.log('📖 Novel content restored:', initialData.novelContent.substring(0, 100) + '...')

        // 常にnovelPagesを生成して整合性を確保（MyBooks編集時の問題修正）
        const splitPages = splitNovelContent(initialData.novelContent)
        setNovelPages(splitPages)
        console.log('📚 Novel pages generated/restored:', splitPages.length)

        // 既存のnovelPagesがあれば検証ログ出力
        if (initialData.novelPages && initialData.novelPages.length > 0) {
          console.log('📝 Original novelPages existed:', initialData.novelPages.length, 'but regenerated for consistency')
        } else {
          console.log('📝 No original novelPages found, generated from novelContent')
        }
      } else if (initialData.novelPages && initialData.novelPages.length > 0) {
        // novelContentが空だがnovelPagesがある場合：novelPagesから復元（レガシーデータ対応）
        console.log('🔄 No novelContent found, reconstructing from novelPages:', initialData.novelPages.length)

        const reconstructedContent = initialData.novelPages.join('\n\n')
        setNovelContent(reconstructedContent)
        setNovelPages(initialData.novelPages)

        console.log('📖 Novel content reconstructed from pages:', reconstructedContent.substring(0, 100) + '...')
        console.log('📚 Novel pages set from existing data:', initialData.novelPages.length)
      }

      // 表紙画像を復元
      if (initialData.coverImageUrl) {
        setCoverImageUrl(initialData.coverImageUrl)
        console.log('🖼️ Cover image restored:', initialData.coverImageUrl)
      }

      console.log('✅ Work data restoration completed')
    } else {
      console.log('🆕 New work creation - using default zine mode')
      setCurrentMode("zine")
      setZineTitle("")
      setExistingWorkId(null) // Clear existing work ID for new creation
      setPages([{ id: "page0", elements: [], title: "Page 1-2" }])
      setNovelContent("")
      setNovelPages([])
      setCoverImageUrl(null)
      console.log('✅ Default state initialized for new creation')
    }
  }, [initialData]) // initialDataが変更された時に実行

  // 動的再計算システム - コンテンツ変更時の自動再分割
  useEffect(() => {
    if (novelContent && textMeasureRef && currentMode === 'novel') {
      console.log('🔄 Recalculating novel pages with DOM-height based splitting')
      const newPages = splitNovelContentByHeight(novelContent)
      setNovelPages(newPages)
      console.log(`📊 Pages recalculated: ${newPages.length} pages`)
    }
  }, [novelContent, currentMode, textMeasureRef])

  // リサイズ対応（オプション）
  useEffect(() => {
    const handleResize = () => {
      if (novelContent && textMeasureRef && currentMode === 'novel') {
        console.log('📐 Window resized, recalculating pages')
        const newPages = splitNovelContentByHeight(novelContent)
        setNovelPages(newPages)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [novelContent, textMeasureRef, currentMode])

  const zineMenuSections = [
    { id: "concept" as MenuSection, label: "コンセプト", icon: Target },
    { id: "ai-writer" as MenuSection, label: "AI作家", icon: User },
    { id: "worldview" as MenuSection, label: "世界観", icon: Landscape },
  ]

  const novelMenuSections = [
    { id: "writer-review" as MenuSection, label: "作家レビュー", icon: MessageCircle },
    { id: "style" as MenuSection, label: "文体", icon: Palette },
    { id: "onepoint" as MenuSection, label: "ワンポイント", icon: Target },
  ]

  const currentMenuSections = currentMode === "zine" ? zineMenuSections : novelMenuSections

  // Handle mode change with confirmation dialog for novel -> zine
  const handleModeChangeConfirm = () => {
    if (currentMode === "novel" && novelContent && novelContent.trim()) {
      setShowModeChangeConfirm(true)
    } else {
      // Direct switch if no novel content or switching from zine to novel
      setCurrentMode("zine")
    }
  }

  const confirmModeChange = () => {
    setCurrentMode("zine")
    // Optionally clear novel content if user confirms
    // setNovelContent("")
    // setNovelPages([])
  }

  const sendMessage = () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: chatInput,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content:
          "素晴らしいアイデアですね！それについて詳しく教えてください。どのような雰囲気や要素を取り入れたいですか？",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, aiMessage])
    }, 1000)
  }


  const handleStyleModify = async (style: string) => {
    setIsModifyingStyle(true)
    try {
      if (!novelContent) {
        throw new Error("修正する小説がありません。まず小説を生成してください。")
      }
      const result = await review({
        original: novelContent,
        instruction: `小説全体の文体を「${style}」に修正してください。元の内容やストーリーは変えず、文体だけを調整してください。`
      })
      setNovelContent(result.text)
      const splitPages = splitNovelContent(result.text)
      setNovelPages(splitPages)
    } catch (error) {
      console.error("文体修正エラー:", error)
      notifications.error("文体の修正に失敗しました", error instanceof Error ? error.message : "不明なエラーが発生しました")
    } finally {
      setIsModifyingStyle(false)
    }
  }

  const handleOnepointModify = async (option: string) => {
    setIsApplyingOnepoint(true)
    try {
      if (!novelContent) {
        throw new Error("修正する小説がありません。まず小説を生成してください。")
      }
      const result = await review({
        original: novelContent,
        instruction: `小説全体に「${option}」の要素を追加して修正してください。元のストーリーを活かしつつ、指定された要素を適切に織り込んでください。`
      })
      setNovelContent(result.text)
      const splitPages = splitNovelContent(result.text)
      setNovelPages(splitPages)
    } catch (error) {
      console.error("ワンポイント修正エラー:", error)
      notifications.error("ワンポイント修正に失敗しました", error instanceof Error ? error.message : "不明なエラーが発生しました")
    } finally {
      setIsApplyingOnepoint(false)
    }
  }

  const addPage = () => {
    const newPage: Page = {
      id: `page${pages.length}`,
      elements: [],
      title: `Page ${pages.length * 2 - 1}-${pages.length * 2}`,
    }
    setPages([...pages, newPage])
  }

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1)
    } else {
      const newPage: Page = {
        id: `page${pages.length}`,
        elements: [],
        title: `Page ${pages.length * 2 + 1}-${pages.length * 2 + 2}`,
      }
      setPages((prev) => [...prev, newPage])
      setCurrentPageIndex(pages.length)
    }
  }

  // DOM高さベース動的テキスト分割機能（小説モード用）- 完全可読性保証
  const splitNovelContentByHeight = (content: string): string[] => {
    if (!content.trim()) return []

    // Fallback用の安全な文字数（Georgia serif + 実測値ベース）
    const SAFE_CHARS = 350

    // 測定要素が利用不可の場合のフォールバック
    if (!textMeasureRef) {
      return splitByCharacterCount(content, SAFE_CHARS)
    }

    // 実際の親コンテナ高さを取得
    const containerElement = textMeasureRef.parentElement
    if (!containerElement) {
      return splitByCharacterCount(content, SAFE_CHARS)
    }

    const maxHeight = containerElement.clientHeight - 32 // pb-8考慮
    const paragraphs = content.split('\n\n')
    const pages: string[] = []
    let currentPage = ""

    for (const paragraph of paragraphs) {
      const testContent = currentPage + (currentPage ? '\n\n' : '') + paragraph

      // 測定要素で実際の高さをチェック
      textMeasureRef.innerHTML = testContent.replace(/\n/g, '<br>')
      const actualHeight = textMeasureRef.scrollHeight

      if (actualHeight <= maxHeight) {
        currentPage = testContent
      } else {
        // 段落が長すぎる場合は文単位で分割
        if (!currentPage.trim()) {
          const sentences = paragraph.split('。')
          let sentencePage = ""

          for (const sentence of sentences) {
            const testSentence = sentencePage + sentence + '。'
            textMeasureRef.innerHTML = testSentence.replace(/\n/g, '<br>')

            if (textMeasureRef.scrollHeight <= maxHeight) {
              sentencePage = testSentence
            } else {
              if (sentencePage.trim()) {
                pages.push(sentencePage.trim())
              }
              sentencePage = sentence + '。'
            }
          }
          currentPage = sentencePage
        } else {
          pages.push(currentPage.trim())
          currentPage = paragraph
        }
      }
    }

    if (currentPage.trim()) pages.push(currentPage.trim())
    return balancePageContent(pages)
  }

  // フォールバック用文字数ベース分割
  const splitByCharacterCount = (content: string, maxChars: number): string[] => {
    const paragraphs = content.split('\n\n')
    const pages: string[] = []
    let currentPage = ""

    for (const paragraph of paragraphs) {
      const paragraphWithBreak = paragraph + '\n\n'

      if (currentPage.length + paragraphWithBreak.length <= maxChars) {
        currentPage += paragraphWithBreak
      } else {
        if (currentPage.trim()) {
          pages.push(currentPage.trim())
          currentPage = paragraphWithBreak
        } else {
          const sentences = paragraph.split('。')
          let tempPage = currentPage

          for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i] + (i < sentences.length - 1 ? '。' : '')
            if (tempPage.length + sentence.length <= maxChars) {
              tempPage += sentence
            } else {
              if (tempPage.trim()) {
                pages.push(tempPage.trim())
              }
              tempPage = sentence
            }
          }
          currentPage = tempPage + '\n\n'
        }
      }
    }

    if (currentPage.trim()) {
      pages.push(currentPage.trim())
    }

    return balancePageContent(pages)
  }

  // メイン関数（後方互換性のため）
  const splitNovelContent = (content: string): string[] => {
    return splitNovelContentByHeight(content)
  }

  // ページバランス調整関数 - 両ページの文字数を均等に
  const balancePageContent = (pages: string[]): string[] => {
    if (pages.length <= 1) return pages

    const balanced: string[] = []

    for (let i = 0; i < pages.length; i += 2) {
      const leftPage = pages[i] || ""
      const rightPage = pages[i + 1] || ""

      // 左ページが極端に短く、右ページが存在する場合の調整
      if (leftPage.length < 120 && rightPage.length > 400) {
        // 右ページから一部を左ページに移動
        const rightSentences = rightPage.split('。')
        const moveCount = Math.min(2, Math.floor(rightSentences.length / 3))

        const movedSentences = rightSentences.splice(0, moveCount)
        const newLeftPage = leftPage + (leftPage ? '\n\n' : '') + movedSentences.join('。') + (movedSentences.length > 0 ? '。' : '')
        const newRightPage = rightSentences.join('。')

        balanced.push(newLeftPage.trim())
        if (newRightPage.trim()) {
          balanced.push(newRightPage.trim())
        }
      } else {
        balanced.push(leftPage)
        if (rightPage) {
          balanced.push(rightPage)
        }
      }
    }

    return balanced
  }


  // 小説モード用のページナビゲーション
  const goToPreviousNovelPage = () => {
    if (currentNovelPage > 0) {
      setCurrentNovelPage(currentNovelPage - 1)
    }
  }

  const goToNextNovelPage = () => {
    if (currentNovelPage < Math.max(0, Math.ceil(novelPages.length / 2) - 1)) {
      setCurrentNovelPage(currentNovelPage + 1)
    }
  }

  const addTextElement = (x?: number, y?: number) => {
    const newElement: Element = {
      id: Date.now().toString(),
      type: "text",
      x: x ?? 50,
      y: y ?? 100,
      width: 200,
      height: 50,
      content: "テキストを入力",
      fontSize: 16,
      color: "#000000",
      pageId: currentPage.id,
    }

    const updatedPages = pages.map((page) =>
      page.id === currentPage.id ? { ...page, elements: [...page.elements, newElement] } : page,
    )
    setPages(updatedPages)
    setSelectedElement(newElement.id)
    
    // Auto-start editing currentMode for new text elements
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.startEditingElement(newElement.id)
      }
    }, 100)
  }

  const addImageElement = (x?: number, y?: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const newElement: Element = {
            id: Date.now().toString(),
            type: "image",
            x: x ?? 100,
            y: y ?? 150,
            width: 200,
            height: 150,
            src: event.target?.result as string,
            pageId: currentPage.id,
          }

          const updatedPages = pages.map((page) =>
            page.id === currentPage.id ? { ...page, elements: [...page.elements, newElement] } : page,
          )
          setPages(updatedPages)
          setSelectedElement(newElement.id)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const addShapeElement = (shape: "square" | "circle") => {
    const newElement: Element = {
      id: Date.now().toString(),
      type: "shape",
      x: 150,
      y: 200,
      width: 100,
      height: 100,
      color: "#6366f1",
      content: shape,
      pageId: currentPage.id,
    }

    const updatedPages = pages.map((page) =>
      page.id === currentPage.id ? { ...page, elements: [...page.elements, newElement] } : page,
    )
    setPages(updatedPages)
    setSelectedElement(newElement.id)
  }

  const updateElement = (id: string, updates: Partial<Element>) => {
    const updatedPages = pages.map((page) => ({
      ...page,
      elements: page.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    }))
    setPages(updatedPages)
  }

  const deleteElement = (id: string) => {
    const updatedPages = pages.map((page) => ({
      ...page,
      elements: page.elements.filter((el) => el.id !== id),
    }))
    setPages(updatedPages)
    setSelectedElement(null)
  }

  // Delete key handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 編集中は要素削除を行わない
    if (editingElement) {
      return
    }
    
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
      e.preventDefault()
      deleteElement(selectedElement)
    }
  }

  const themeStyles = {
    light: {
      background: "#FAF3E5",
      text: "#2C2C2C",
      accent: "#A25B5B",
      border: "#E5DCC9",
      shadow: "rgba(0,0,0,0.15)",
      pageBackground: "#FEFCF7",
    },
    sepia: {
      background: "#F4EAD0",
      text: "#3B3222",
      accent: "#A25B5B",
      border: "#D4C4A8",
      shadow: "rgba(59,50,34,0.2)",
      pageBackground: "#F8F2E3",
    },
    dark: {
      background: "#2A2520",
      text: "#E8E0D6",
      accent: "#A25B5B",
      border: "#3D3530",
      shadow: "rgba(0,0,0,0.4)",
      pageBackground: "#1F1B17",
    },
  }

  const currentTheme = themeStyles[bookTheme]

  const handleMenuSectionClick = (sectionId: MenuSection) => {
    setActiveMenuSection(sectionId)
    if (currentMode === "zine" && ["concept", "ai-writer", "worldview"].includes(sectionId)) {
      setShowConfigPanel(true)
    }
  }

  const renderConfigPanel = () => {
    if (!showConfigPanel || currentMode !== "zine") return null

    switch (activeMenuSection) {

      case "ai-writer":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6" style={{ color: "#4a3c28" }}>AI作家設定</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#4a3c28" }}>価値観</label>
                <textarea
                  className="w-full h-32 border rounded-lg p-3"
                  style={{
                    background: "rgba(255, 253, 250, 0.8)",
                    borderColor: "rgba(139, 115, 85, 0.3)",
                    color: "#4a3c28"
                  }}
                  placeholder="AI作家の価値観や創作スタンスを設定してください..."
                  value={aiWriterConfig.values}
                  onChange={(e) => setAiWriterConfig({...aiWriterConfig, values: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#4a3c28" }}>対話ルール</label>
                <textarea
                  className="w-full h-32 border rounded-lg p-3"
                  style={{
                    background: "rgba(255, 253, 250, 0.8)",
                    borderColor: "rgba(139, 115, 85, 0.3)",
                    color: "#4a3c28"
                  }}
                  placeholder="AI作家との対話ルールを設定してください..."
                  value={aiWriterConfig.rules}
                  onChange={(e) => setAiWriterConfig({...aiWriterConfig, rules: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/20">
              <Button
                onClick={() => {
                  localStorage.setItem('zine-ai-writer-config', JSON.stringify(aiWriterConfig))
                  notifications.success("AI作家設定を保存しました")
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                設定を保存
              </Button>
            </div>
          </div>
        )

      case "worldview":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6" style={{ color: "#4a3c28" }}>世界観設定</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#4a3c28" }}>写真 / キーワード</label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
                  <ImageIcon className="w-12 h-12 mx-auto mb-2" style={{ color: "rgba(139, 115, 85, 0.5)" }} />
                  <p style={{ color: "#8b7355" }}>画像をドラッグ&ドロップまたはクリックして選択</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#4a3c28" }}>人物名前</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-3"
                  style={{
                    background: "rgba(255, 253, 250, 0.8)",
                    borderColor: "rgba(139, 115, 85, 0.3)",
                    color: "#4a3c28"
                  }}
                  placeholder="主要人物の名前を入力..."
                  value={worldviewConfig.characterName}
                  onChange={(e) => setWorldviewConfig({...worldviewConfig, characterName: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#4a3c28" }}>性格</label>
                <textarea
                  className="w-full h-24 border rounded-lg p-3"
                  style={{
                    background: "rgba(255, 253, 250, 0.8)",
                    borderColor: "rgba(139, 115, 85, 0.3)",
                    color: "#4a3c28"
                  }}
                  placeholder="人物の性格や特徴を入力..."
                  value={worldviewConfig.personality}
                  onChange={(e) => setWorldviewConfig({...worldviewConfig, personality: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#4a3c28" }}>シナリオ</label>
                <textarea
                  className="w-full h-32 border rounded-lg p-3"
                  style={{
                    background: "rgba(255, 253, 250, 0.8)",
                    borderColor: "rgba(139, 115, 85, 0.3)",
                    color: "#4a3c28"
                  }}
                  placeholder="基本的なストーリーラインを入力..."
                  value={worldviewConfig.scenario}
                  onChange={(e) => setWorldviewConfig({...worldviewConfig, scenario: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/20">
              <Button
                onClick={() => {
                  localStorage.setItem('zine-worldview-config', JSON.stringify(worldviewConfig))
                  notifications.success("世界観設定を保存しました")
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                設定を保存
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const handleTextSelection = () => {
    if (typeof window === "undefined") return

    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString()
      const range = selection.getRangeAt(0)
      
      // 選択状態を詳細に記録
      setSelectedText({
        start: range.startOffset,
        end: range.endOffset,
        text: selectedText,
      })
      
      // 作家レビューモード中は選択を保護
      if (activeNovelSection === "writer-review") {
        setIsSelectionProtected(true)
      }
    }
  }

  // 選択をクリアする関数
  const clearSelection = () => {
    setSelectedText(null)
    setIsSelectionProtected(false)
    
    // ブラウザの選択もクリア
    if (typeof window !== "undefined") {
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
      }
    }
  }

  // 選択保護をチェックする関数
  const handleSelectionChange = (event: Event) => {
    // 保護されている場合は選択解除を防ぐ
    if (isSelectionProtected && selectedText) {
      event.preventDefault()
      return false
    }
  }

  const applySuggestion = (suggestionId: string) => {
    const suggestion = reviewSuggestions.find((s) => s.id === suggestionId)
    if (suggestion) {
      setNovelContent((prev) => prev.replace(suggestion.originalText, suggestion.suggestedText))
      setReviewSuggestions((prev) => prev.map((s) => (s.id === suggestionId ? { ...s, applied: true } : s)))
    }
  }

  // Handle text suggestion application
  const handleApplySuggestion = (suggestionId: string) => {
    const suggestion = textSuggestions.find(s => s.id === suggestionId)
    if (!suggestion) return

    // Apply the suggestion to the novel content
    setNovelContent((prev) => prev.replace(suggestion.originalText, suggestion.suggestedText))
    
    // Update pages with the modified content
    const updatedContent = novelContent.replace(suggestion.originalText, suggestion.suggestedText)
    const splitPages = splitNovelContent(updatedContent)
    setNovelPages(splitPages)

    // Add success message to chat
    const successMessage = {
      id: Date.now().toString(),
      type: "ai" as const,
      content: `修正「${suggestion.instruction}」を適用しました。「${suggestion.originalText}」→「${suggestion.suggestedText}」`,
      timestamp: new Date(),
    }
    setReviewChatMessages((prev) => [...prev, successMessage])

    // Remove the suggestion from the list
    setTextSuggestions((prev) => prev.filter(s => s.id !== suggestionId))
  }

  // Handle text suggestion cancellation
  const handleCancelSuggestion = (suggestionId: string) => {
    const suggestion = textSuggestions.find(s => s.id === suggestionId)
    if (!suggestion) return

    // Add cancel message to chat
    const cancelMessage = {
      id: Date.now().toString(),
      type: "ai" as const,
      content: `修正提案「${suggestion.instruction}」をキャンセルしました。`,
      timestamp: new Date(),
    }
    setReviewChatMessages((prev) => [...prev, cancelMessage])

    // Remove the suggestion from the list
    setTextSuggestions((prev) => prev.filter(s => s.id !== suggestionId))
  }

  const handleReviewChatSend = async () => {
    if (!reviewChatInput.trim()) return

    // 選択状態を保存
    const currentSelection = selectedText

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: reviewChatInput,
      timestamp: new Date(),
    }

    setReviewChatMessages((prev) => [...prev, userMessage])

    const inputContent = reviewChatInput
    setReviewChatInput("")

    // Start loading
    setIsApplyingReview(true)

    try {
      // テキスト選択がない場合は小説全文を対象にする
      const isFullNovel = !currentSelection
      const targetText = currentSelection ? currentSelection.text : novelContent

      // 対象テキストが存在しない場合のエラーハンドリング
      if (!targetText) {
        throw new Error("修正する小説がありません。まず小説を生成してください。")
      }

      // review APIを使用してテキストを修正
      const result = await review({
        original: targetText,
        instruction: isFullNovel
          ? `小説全体に対して以下の指示を適用してください: ${inputContent}`
          : `以下の指示に従って、選択されたテキストを修正してください: ${inputContent}`
      })

      if (isFullNovel) {
        // 小説全文を更新
        setNovelContent(result.text)
        const splitPages = splitNovelContent(result.text)
        setNovelPages(splitPages)

        const aiResponse = {
          id: (Date.now() + 1).toString(),
          type: "ai" as const,
          content: `小説全体に「${inputContent}」の修正を適用しました。`,
          timestamp: new Date(),
        }
        setReviewChatMessages((prev) => [...prev, aiResponse])
      } else {
        // Get selection position from DOM
        const getSelectionPosition = () => {
          if (typeof window === 'undefined') return { x: 100, y: 100, width: 200, height: 20 }

          const selection = window.getSelection()
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            const rect = range.getBoundingClientRect()
            return {
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY,
              width: rect.width,
              height: rect.height
            }
          }
          return { x: 100, y: 100, width: 200, height: 20 }
        }

        // Create suggestion instead of applying directly (部分修正の場合)
        const suggestionId = Date.now().toString()
        const newSuggestion: TextSuggestion = {
          id: suggestionId,
          originalText: currentSelection.text,
          suggestedText: result.text,
          position: getSelectionPosition(),
          instruction: inputContent,
          timestamp: new Date()
        }

        // Add suggestion to state
        setTextSuggestions((prev) => [...prev, newSuggestion])

        const aiResponse = {
        id: (Date.now() + 1).toString(),
          type: "ai" as const,
          content: `「${inputContent}」の指示に基づいて修正提案を作成しました。右側の吹き出しで確認してください。`,
        timestamp: new Date(),
      }

        setReviewChatMessages((prev) => [...prev, aiResponse])
      }

    } catch (error) {
      console.error("レビュー修正エラー:", error)
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        type: "ai" as const,
        content: `申し訳ありません。修正提案の生成中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        timestamp: new Date(),
      }
      setReviewChatMessages((prev) => [...prev, errorResponse])
    } finally {
      // End loading
      setIsApplyingReview(false)
    }
  }

  const applyInlineSuggestion = (originalText: string) => {
    const suggestion = inlineSuggestions[originalText]
    if (suggestion) {
      setNovelContent((prev) => prev.replace(originalText, suggestion.suggestedText))
      setInlineSuggestions((prev) => {
        const updated = { ...prev }
        delete updated[originalText]
        return updated
      })
    }
  }

  const rejectInlineSuggestion = (originalText: string) => {
    setInlineSuggestions((prev) => {
      const updated = { ...prev }
      delete updated[originalText]
      return updated
    })
  }

  const renderTextWithSuggestions = (text: string) => {
    const parts = []
    let lastIndex = 0

    Object.keys(inlineSuggestions).forEach((originalText) => {
      const index = text.indexOf(originalText, lastIndex)
      if (index !== -1) {
        // Add text before the suggestion
        if (index > lastIndex) {
          parts.push(text.slice(lastIndex, index))
        }

        // Add the original text
        parts.push(
          <span key={originalText} className="relative">
            <span className="bg-yellow-200/30 px-1 rounded">{originalText}</span>
            <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-400 rounded-r">
              <div className="text-red-700 text-sm mb-2">修正案: {inlineSuggestions[originalText].suggestedText}</div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => applyInlineSuggestion(originalText)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                >
                  適用
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => rejectInlineSuggestion(originalText)}
                  className="text-xs px-3 py-1"
                >
                  却下
                </Button>
              </div>
            </div>
          </span>,
        )

        lastIndex = index + originalText.length
      }
    })

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  const renderWriterReviewPanel = () => {
    return (
      <div className="h-full flex flex-col">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {reviewChatMessages.map((message) => (
            <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg"
                style={{
                  background: message.type === "user" 
                    ? "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)" 
                    : "rgba(241, 229, 199, 0.8)",
                  color: message.type === "user" ? "#fffdf7" : "#4a3c28"
                }}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          ))}

          {/* Review Suggestions */}
          {reviewSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-lg p-4 space-y-3" style={{
              background: "rgba(241, 229, 199, 0.6)",
              border: "1px solid rgba(139, 115, 85, 0.3)"
            }}>
              <div className="text-sm" style={{ color: "#6b5b47" }}>修正提案</div>

              {/* Before */}
              <div className="rounded p-3" style={{
                background: "rgba(220, 160, 160, 0.2)",
                border: "1px solid rgba(200, 120, 120, 0.4)"
              }}>
                <div className="text-xs mb-1" style={{ color: "#8b4513" }}>修正前</div>
                <div className="text-sm" style={{ color: "#4a3c28" }}>{suggestion.originalText}</div>
              </div>

              {/* After */}
              <div className="rounded p-3" style={{
                background: "rgba(160, 200, 160, 0.2)",
                border: "1px solid rgba(120, 180, 120, 0.4)"
              }}>
                <div className="text-xs mb-1" style={{ color: "#2d5a2d" }}>修正後</div>
                <div className="text-sm" style={{ color: "#4a3c28" }}>{suggestion.suggestedText}</div>
              </div>

              <div className="text-xs" style={{ color: "#8b7355" }}>{suggestion.reason}</div>

              {!suggestion.applied && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => applySuggestion(suggestion.id)}
                    className="text-white"
                    style={{
                      background: "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)"
                    }}
                  >
                    反映する
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    style={{
                      color: "#8b7355",
                      borderColor: "rgba(139, 115, 85, 0.3)",
                      backgroundColor: "transparent"
                    }}
                  >
                    却下
                  </Button>
                </div>
              )}

              {suggestion.applied && <div className="text-sm" style={{ color: "#2d5a2d" }}>✓ 反映済み</div>}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="border-t p-4" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
          {selectedText && (
            <div className="mb-3 p-2 rounded text-sm" style={{
              background: "rgba(173, 203, 233, 0.2)",
              border: "1px solid rgba(139, 169, 199, 0.4)"
            }}>
              <div className="text-xs mb-1" style={{ color: "#4a6b8a" }}>選択中のテキスト</div>
              <div style={{ color: "#4a3c28" }}>「{selectedText.text}」</div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={reviewChatInput}
              onChange={(e) => setReviewChatInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleReviewChatSend()}
              placeholder="修正指示を入力（テキスト選択なしで全文修正）..."
              className="flex-1 border rounded-lg px-3 py-2"
              style={{
                background: "rgba(255, 253, 250, 0.8)",
                borderColor: "rgba(139, 115, 85, 0.3)",
                color: "#4a3c28"
              }}
            />
            <Button onClick={handleReviewChatSend} size="sm" className="text-white" style={{
              background: "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)"
            }}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const styleOptions = [
    "もっと文学的に",
    "カジュアルに",
    "丁寧語に",
    "関西弁に",
    "古風な表現に",
    "現代的に",
    "詩的に",
    "簡潔に",
  ]

  const onepointOptions = [
    "もっとシリアスに",
    "ユーモアを加えて",
    "感情的に",
    "客観的に",
    "緊張感を高めて",
    "温かみを加えて",
    "ミステリアスに",
    "ドラマチックに",
  ]

  const renderStylePanel = () => (
    <div className="space-y-4">
      <h3 className="font-semibold mb-3" style={{ color: "#4a3c28" }}>小説全体の文体修正</h3>

      <div className="space-y-2">
        <h4 className="text-sm" style={{ color: "#8b7355" }}>よく使われる修正</h4>
        <div className="grid grid-cols-1 gap-2">
          {styleOptions.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={async () => {
                const newMessage = { role: "user" as const, content: `小説全体を「${option}」の文体に修正してください` }
                setStyleMessages([...styleMessages, newMessage])
                
                // Start loading
                setIsModifyingStyle(true)
                
                // Apply style to entire novel using review API
                try {
                  if (!novelContent) {
                    throw new Error("修正する小説がありません。まず小説を生成してください。")
                  }
                  
                  const result = await review({
                    original: novelContent,
                    instruction: `小説全体の文体を「${option}」に修正してください。元の内容やストーリーは変えず、文体だけを調整してください。`
                  })
                  
                  // Update novel content with modified version
                  setNovelContent(result.text)
                  // Update pages
                  const splitPages = splitNovelContent(result.text)
                  setNovelPages(splitPages)
                  
                  const aiResponse = {
                    role: "assistant" as const,
                    content: `小説全体を「${option}」の文体に修正しました。`,
                  }
                  setStyleMessages((prev) => [...prev, aiResponse])
                } catch (error) {
                  console.error("文体修正エラー:", error)
                  const errorResponse = {
                    role: "assistant" as const,
                    content: `申し訳ありません。文体の修正中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
                  }
                  setStyleMessages((prev) => [...prev, errorResponse])
                } finally {
                  // End loading
                  setIsModifyingStyle(false)
                }
              }}
              className="justify-start text-xs"
              style={{
                color: "#8b7355",
                borderColor: "rgba(139, 115, 85, 0.3)",
                backgroundColor: "transparent"
              }}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-t pt-4" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
        <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
          {styleMessages.map((message, index) => (
            <div
              key={index}
              className={`p-2 rounded text-xs ${
                message.role === "user" ? "bg-yellow-100 text-gray-800" : "bg-gray-100 text-gray-800"
              }`}
            >
              {message.content}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={styleInput}
            onChange={(e) => setStyleInput(e.target.value)}
            placeholder="小説全体の文体について相談..."
            className="flex-1 px-2 py-1 text-xs border rounded"
            style={{
              background: "rgba(255, 253, 250, 0.8)",
              borderColor: "rgba(139, 115, 85, 0.3)",
              color: "#4a3c28"
            }}
            onKeyPress={async (e) => {
              if (e.key === "Enter" && styleInput.trim()) {
                const newMessage = { role: "user" as const, content: styleInput }
                setStyleMessages([...styleMessages, newMessage])
                const inputContent = styleInput
                setStyleInput("")
                
                // Start loading
                setIsModifyingStyle(true)
                
                try {
                  if (!novelContent) {
                    throw new Error("修正する小説がありません。まず小説を生成してください。")
                  }
                  
                  const result = await review({
                    original: novelContent,
                    instruction: `小説全体を以下の指示に従って修正してください: ${inputContent}`
                  })
                  
                  // Update novel content with modified version
                  setNovelContent(result.text)
                  // Update pages
                  const splitPages = splitNovelContent(result.text)
                  setNovelPages(splitPages)
                  
                  const aiResponse = {
                    role: "assistant" as const,
                    content: `小説全体を「${inputContent}」の指示に従って修正しました。`,
                  }
                  setStyleMessages((prev) => [...prev, aiResponse])
                } catch (error) {
                  console.error("文体修正エラー:", error)
                  const errorResponse = {
                    role: "assistant" as const,
                    content: `申し訳ありません。文体の修正中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
                  }
                  setStyleMessages((prev) => [...prev, errorResponse])
                } finally {
                  // End loading
                  setIsModifyingStyle(false)
                }
              }
            }}
          />
          <Button
            size="sm"
            onClick={async () => {
              if (styleInput.trim()) {
                const newMessage = { role: "user" as const, content: styleInput }
                setStyleMessages([...styleMessages, newMessage])
                const inputContent = styleInput
                setStyleInput("")
                
                // Start loading
                setIsModifyingStyle(true)
                
                try {
                  if (!novelContent) {
                    throw new Error("修正する小説がありません。まず小説を生成してください。")
                  }
                  
                  const result = await review({
                    original: novelContent,
                    instruction: `小説全体を以下の指示に従って修正してください: ${inputContent}`
                  })
                  
                  // Update novel content with modified version
                  setNovelContent(result.text)
                  // Update pages  
                  const splitPages = splitNovelContent(result.text)
                  setNovelPages(splitPages)
                  
                  const aiResponse = {
                    role: "assistant" as const,
                    content: `小説全体を「${inputContent}」の指示に従って修正しました。`,
                  }
                  setStyleMessages((prev) => [...prev, aiResponse])
                } catch (error) {
                  console.error("文体修正エラー:", error)
                  const errorResponse = {
                    role: "assistant" as const,
                    content: `申し訳ありません。文体の修正中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
                  }
                  setStyleMessages((prev) => [...prev, errorResponse])
                } finally {
                  // End loading
                  setIsModifyingStyle(false)
                }
              }
            }}
            className="px-2 py-1 text-xs text-white"
            style={{
              background: "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)"
            }}
          >
            送信
          </Button>
        </div>
      </div>
    </div>
  )

  const renderOnepointPanel = () => (
    <div className="space-y-4">
      <h3 className="font-semibold mb-3" style={{ color: "#4a3c28" }}>小説全体のワンポイント修正</h3>

      <div className="space-y-2">
        <h4 className="text-sm" style={{ color: "#8b7355" }}>雰囲気の調整</h4>
        <div className="grid grid-cols-1 gap-2">
          {onepointOptions.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={async () => {
                const newMessage = { role: "user" as const, content: `小説全体を「${option}」してください` }
                setOnepointMessages([...onepointMessages, newMessage])
                
                // Start loading
                setIsApplyingOnepoint(true)
                
                // Apply adjustment to entire novel using review API
                try {
                  if (!novelContent) {
                    throw new Error("修正する小説がありません。まず小説を生成してください。")
                  }
                  
                  const result = await review({
                    original: novelContent,
                    instruction: `小説全体を「${option}」の方向で調整してください。元の内容やストーリーは変えず、指定された特徴に合うように修正してください。`
                  })
                  
                  // Update novel content with modified version
                  setNovelContent(result.text)
                  // Update pages
                  const splitPages = splitNovelContent(result.text)
                  setNovelPages(splitPages)
                  
                  const aiResponse = {
                    role: "assistant" as const,
                    content: `小説全体に「${option}」の調整を適用しました。`,
                  }
                  setOnepointMessages((prev) => [...prev, aiResponse])
                } catch (error) {
                  console.error("ワンポイント修正エラー:", error)
                  const errorResponse = {
                    role: "assistant" as const,
                    content: `申し訳ありません。ワンポイント修正中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
                  }
                  setOnepointMessages((prev) => [...prev, errorResponse])
                } finally {
                  // End loading
                  setIsApplyingOnepoint(false)
                }
              }}
              className="justify-start text-xs"
              style={{
                color: "#8b7355",
                borderColor: "rgba(139, 115, 85, 0.3)",
                backgroundColor: "transparent"
              }}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-t pt-4" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
        <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
          {onepointMessages.map((message, index) => (
            <div
              key={index}
              className={`p-2 rounded text-xs ${
                message.role === "user" ? "bg-yellow-100 text-gray-800" : "bg-gray-100 text-gray-800"
              }`}
            >
              {message.content}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={onepointInput}
            onChange={(e) => setOnepointInput(e.target.value)}
            placeholder="小説全体のワンポイント修正を相談..."
            className="flex-1 px-2 py-1 text-xs border rounded"
            style={{
              background: "rgba(255, 253, 250, 0.8)",
              borderColor: "rgba(139, 115, 85, 0.3)",
              color: "#4a3c28"
            }}
            onKeyPress={async (e) => {
              if (e.key === "Enter" && onepointInput.trim()) {
                const newMessage = { role: "user" as const, content: onepointInput }
                setOnepointMessages([...onepointMessages, newMessage])
                const inputContent = onepointInput
                setOnepointInput("")
                
                // Start loading
                setIsApplyingOnepoint(true)
                
                try {
                  if (!novelContent) {
                    throw new Error("修正する小説がありません。まず小説を生成してください。")
                  }
                  
                  const result = await review({
                    original: novelContent,
                    instruction: `小説全体を以下の指示に従って調整してください: ${inputContent}`
                  })
                  
                  // Update novel content with modified version
                  setNovelContent(result.text)
                  // Update pages
                  const splitPages = splitNovelContent(result.text)
                  setNovelPages(splitPages)
                  
                  const aiResponse = {
                    role: "assistant" as const,
                    content: `小説全体に「${inputContent}」の指示に従って調整を適用しました。`,
                  }
                  setOnepointMessages((prev) => [...prev, aiResponse])
                } catch (error) {
                  console.error("ワンポイント修正エラー:", error)
                  const errorResponse = {
                    role: "assistant" as const,
                    content: `申し訳ありません。ワンポイント修正中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
                  }
                  setOnepointMessages((prev) => [...prev, errorResponse])
                } finally {
                  // End loading
                  setIsApplyingOnepoint(false)
                }
              }
            }}
          />
          <Button
            size="sm"
            onClick={async () => {
              if (onepointInput.trim()) {
                const newMessage = { role: "user" as const, content: onepointInput }
                setOnepointMessages([...onepointMessages, newMessage])
                const inputContent = onepointInput
                setOnepointInput("")
                
                // Start loading
                setIsApplyingOnepoint(true)
                
                try {
                  if (!novelContent) {
                    throw new Error("修正する小説がありません。まず小説を生成してください。")
                  }
                  
                  const result = await review({
                    original: novelContent,
                    instruction: `小説全体を以下の指示に従って調整してください: ${inputContent}`
                  })
                  
                  // Update novel content with modified version
                  setNovelContent(result.text)
                  // Update pages
                  const splitPages = splitNovelContent(result.text)
                  setNovelPages(splitPages)
                  
                  const aiResponse = {
                    role: "assistant" as const,
                    content: `小説全体に「${inputContent}」の指示に従って調整を適用しました。`,
                  }
                  setOnepointMessages((prev) => [...prev, aiResponse])
                } catch (error) {
                  console.error("ワンポイント修正エラー:", error)
                  const errorResponse = {
                    role: "assistant" as const,
                    content: `申し訳ありません。ワンポイント修正中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
                  }
                  setOnepointMessages((prev) => [...prev, errorResponse])
                } finally {
                  // End loading  
                  setIsApplyingOnepoint(false)
                }
              }
            }}
            className="px-2 py-1 text-xs text-white"
            style={{
              background: "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)"
            }}
          >
            送信
          </Button>
        </div>
      </div>
    </div>
  )

  const [styleMessages, setStyleMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [onepointMessages, setOnepointMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [styleInput, setStyleInput] = useState("")
  const [onepointInput, setOnepointInput] = useState("")
  const [draggedElement, setDraggedElement] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Configuration states
  const [conceptConfig, setConceptConfig] = useState({
    length: "short",
    genre: "none",
    keywords: ""
  })
  const [aiWriterConfig, setAiWriterConfig] = useState({
    values: "",
    rules: ""
  })
  const [worldviewConfig, setWorldviewConfig] = useState<any>({
    stage: "",
    scenario: "",
    characters: [
      { name: "", personality: "" }
    ]
  })

  const hasZineContent = pages.some((page) => page.elements.length > 0) || zineTitle.trim() !== ""

  // 新しい直接キャプチャ方式のZINEページ画像化関数
  const captureCurrentZinePage = async (): Promise<string> => {
    console.log('🎯 Capturing current ZINE page with direct DOM approach...')
    
    if (!canvasRef.current) {
      throw new Error('ZineCanvas参照が利用できません')
    }
    
    try {
      const base64Image = await canvasRef.current.captureAsImage()
      console.log('✅ Successfully captured current ZINE page')
      return base64Image
    } catch (error) {
      console.error('❌ Direct capture failed:', error)
      throw new Error(`現在のページのキャプチャに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }
  
  // ページの詳細説明を生成する関数
  const generatePageDescription = (page: Page, pageNumber: number): string => {
    const narrativeElements: string[] = []

    // Extract meaningful text content (without technical formatting)
    const textElements = page.elements.filter(el => el.type === 'text' && el.content && el.content.trim())
    const meaningfulTexts = textElements
      .map(el => el.content?.trim() || '')
      .filter(content => content.length > 0 && !content.match(/^(タイトル|概要|設定|ジャンル)/i))
      .slice(0, 3) // Limit to most important content

    if (meaningfulTexts.length > 0) {
      narrativeElements.push(...meaningfulTexts)
    }

    // Extract image descriptions (focus on narrative value)
    const imageElements = page.elements.filter(el => el.type === 'image')
    const imageDescriptions = imageElements
      .map(img => img.altText || img.description || '')
      .filter(desc => desc && desc.trim().length > 0)
      .slice(0, 2) // Limit to most important images

    if (imageDescriptions.length > 0) {
      narrativeElements.push(...imageDescriptions)
    }

    // Return natural description without technical metadata
    return narrativeElements.length > 0
      ? narrativeElements.join('. ')
      : `シーン${pageNumber}の描写`
  }

  // 🔥 TEXT CLEANUP FUNCTIONS - Filter out ZINE metadata and UI elements
  const cleanupTextForNovel = (text: string, zineTitle?: string): string => {
    if (!text) return text

    let cleanedText = text

    // Remove ZINE title if provided
    if (zineTitle && zineTitle.trim()) {
      const titlePattern = new RegExp(zineTitle.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      cleanedText = cleanedText.replace(titlePattern, '')
    }

    // Remove common UI elements and metadata
    const uiPatterns = [
      /クリックして編集/gi,
      /編集モード/gi,
      /プレビュー/gi,
      /保存/gi,
      /削除/gi,
      /追加/gi,
      /ページ\s*\d+/gi,
      /Page\s*\d+/gi,
      /ZINE/gi,
      /ページ番号/gi,
      /タイトル/gi,
      /作者/gi,
      /Author/gi,
      /Title/gi,
      /Created/gi,
      /作成日/gi,
      /\.png/gi,
      /\.jpg/gi,
      /\.jpeg/gi,
      /\.webp/gi,
      /placeholder/gi,
      /no-image/gi,
      /画像が見つかりません/gi,
      /loading/gi,
      /エラー/gi,
      /Error/gi,
      /^(無題|untitled)$/gi,
      // Additional patterns to prevent OCR metadata contamination
      /\d+%/gi,                    // Zoom percentages (100%, 150%, etc.)
      /zoom/gi,                    // Zoom-related terms
      /ズーム/gi,                  // Japanese zoom
      /layout:/gi,                 // Layout indicators
      /レイアウト/gi,              // Japanese layout
      /binding/gi,                 // Binding-related terms
      /綴じ/gi,                    // Japanese binding
      /センター/gi,                // Center
      /center/gi,                  // Center
      /boundary/gi,                // Boundary
      /境界/gi,                    // Japanese boundary
      /indicator/gi,               // Indicator
      /インジケーター/gi,          // Japanese indicator
      /canvas/gi,                  // Canvas-related
      /キャンバス/gi,              // Japanese canvas
      /background/gi,              // Background
      /背景/gi,                    // Japanese background
      /texture/gi,                 // Texture
      /テクスチャ/gi,              // Japanese texture
      /element/gi,                 // Element
      /要素/gi,                    // Japanese element (when standalone)
      /position/gi,                // Position
      /位置/gi,                    // Japanese position
      /coordinate/gi,              // Coordinate
      /座標/gi,                    // Japanese coordinate
      /transform/gi,               // Transform
      /変形/gi,                    // Japanese transform
      /scale/gi,                   // Scale
      /スケール/gi,                // Japanese scale
      /opacity/gi,                 // Opacity
      /透明度/gi,                  // Japanese opacity
      /filter/gi,                  // Filter
      /フィルター/gi,              // Japanese filter
      /shadow/gi,                  // Shadow
      /影/gi                       // Japanese shadow (when standalone)
    ]

    // Apply all cleanup patterns
    uiPatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern, '')
    })

    // Clean up extra whitespace and empty lines
    cleanedText = cleanedText
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n')  // Remove empty lines
      .trim()

    // Remove very short fragments (likely UI artifacts)
    const words = cleanedText.split(/\s+/)
    const meaningfulWords = words.filter(word => word.length > 2)

    // Only return if we have meaningful content
    if (meaningfulWords.length < 3 && cleanedText.length < 10) {
      return ''  // Return empty if content is too short/meaningless
    }

    return cleanedText
  }

  // Enhanced ZINE image extraction with OCR, captioning, and spatial analysis
  const extractZineImages = async (): Promise<{
    images: string[], 
    title: string, 
    descriptions: string[],
    enhancedData?: Array<{
      imageBase64: string;
      ocrText: string;
      caption: string;
      nearbyText: string;
      spatialContext: string;
      pageIndex: number;
      confidence: number;
    }>
  }> => {
    const images: string[] = []
    const descriptions: string[] = []
    const enhancedData: Array<{
      imageBase64: string;
      ocrText: string;
      caption: string;
      nearbyText: string;
      spatialContext: string;
      pageIndex: number;
      confidence: number;
    }> = []
    
    try {
      console.log("🚀 Starting enhanced ZINE image extraction with AI services...")
      
      // 現在のページインデックスを保存
      const originalPageIndex = currentPageIndex
      
      // 各ページを順番にキャプチャ
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        if (page.elements.length > 0) {
          console.log(`📸 Processing page ${i + 1} with enhanced AI analysis...`)
          
          // ページを切り替え（現在のページでない場合）
          if (i !== currentPageIndex) {
            setCurrentPageIndex(i)
            // ページ切り替えのレンダリングを待つ
            await new Promise(resolve => setTimeout(resolve, 200))
          }
          
          // 現在表示されているページをキャプチャ
          const imageBase64 = await captureCurrentZinePage()
          images.push(imageBase64)
          
          // Extract image elements from the page for spatial analysis
          const imageElements = page.elements.filter(el => el.type === 'image')
          const textElements = page.elements.filter(el => el.type === 'text')
          
          // Convert elements to rectangles for spatial analysis
          const rectangles = SpatialAnalysisService.convertZineElementsToRectangles(page.elements)
          const layout = SpatialAnalysisService.analyzePageLayout(rectangles)
          
          // For the main page image, perform comprehensive analysis
          try {
            console.log(`🔍 Running OCR on page ${i + 1}...`)
            const ocrResult = await ocrService.extractTextFromImage(imageBase64)
            
            console.log(`🎨 Generating caption for page ${i + 1}...`)
            const pageContext = generatePageDescription(page, i + 1)
            const nearbyTextContent = textElements
              .filter(el => el.content && el.content.trim() && el.content !== "クリックして編集")
              .map(el => el.content)
              .join(' | ')
            
            const captionResult = await imageCaptioningService.generateEnhancedCaption(
              imageBase64,
              nearbyTextContent,
              pageContext,
              i
            )
            
            // Build natural spatial context without technical metadata
            let spatialContext = ''
            if (layout.imageTextPairs.length > 0) {
              // Focus on content relationships rather than technical layout
              const naturalRelations = layout.imageTextPairs
                .filter(pair => pair.relatedText.some(rel => rel.confidence > 0.7))
                .map(pair => {
                  const relatedContent = pair.relatedText
                    .filter(rel => rel.confidence > 0.7 && rel.element.content && rel.element.content.trim())
                    .map(rel => rel.element.content?.substring(0, 100) || '')
                    .filter(content => content.length > 10)
                  return relatedContent.length > 0 ? relatedContent.join('. ') : ''
                })
                .filter(content => content.length > 0)

              spatialContext = naturalRelations.length > 0
                ? naturalRelations.join('. ')
                : `${imageElements.length}個の画像と${textElements.length}個のテキスト要素を含むシーン`
            } else {
              spatialContext = imageElements.length > 0 || textElements.length > 0
                ? `${imageElements.length}個の画像と${textElements.length}個のテキスト要素を含むシーン`
                : 'シンプルな構成'
            }
            
            // Remove technical metadata structure to prevent contamination
            // Enhanced data is preserved in enhancedData array for actual content processing
            
            // 🔥 APPLY CLEANUP to filter out ZINE metadata and UI elements
            const cleanedOcrText = cleanupTextForNovel(ocrResult.text, zineTitle)
            const cleanedCaption = cleanupTextForNovel(captionResult.caption, zineTitle)
            const cleanedNearbyText = cleanupTextForNovel(nearbyTextContent, zineTitle)

            // Store enhanced data with cleaned text
            enhancedData.push({
              imageBase64,
              ocrText: cleanedOcrText,
              caption: cleanedCaption,
              nearbyText: cleanedNearbyText,
              spatialContext,
              pageIndex: i,
              confidence: (ocrResult.confidence + captionResult.confidence) / 2
            })
            
            console.log(`✅ Enhanced analysis completed for page ${i + 1}`)
            console.log(`   - OCR extracted: ${ocrResult.text.length} chars (cleaned: ${cleanedOcrText.length} chars)`)
            console.log(`   - Caption generated: ${captionResult.caption.length} chars (cleaned: ${cleanedCaption.length} chars)`)
            console.log(`   - Nearby text: ${nearbyTextContent.length} chars (cleaned: ${cleanedNearbyText.length} chars)`)
            console.log(`   - Spatial relationships: ${layout.imageTextPairs.length} pairs`)
            
          } catch (analysisError) {
            console.warn(`⚠️ Enhanced analysis failed for page ${i + 1}, using fallback:`, analysisError)
            // Fallback: no technical descriptions to prevent contamination
            
            // Store minimal enhanced data with natural language
            enhancedData.push({
              imageBase64,
              ocrText: "",
              caption: `${page.elements.length}個の要素を含むシーン`,
              nearbyText: textElements.map(el => el.content).filter(Boolean).join(' '),
              spatialContext: imageElements.length > 0 || textElements.length > 0
                ? `${imageElements.length}個の画像と${textElements.length}個のテキスト要素を含むシーン`
                : 'シンプルな構成',
              pageIndex: i,
              confidence: 0.3
            })
          }
          
        } else {
          console.log(`📝 Page ${i + 1} is empty, skipping...`)
        }
      }
      
      // 元のページインデックスに戻す
      if (currentPageIndex !== originalPageIndex) {
        setCurrentPageIndex(originalPageIndex)
      }
      
      console.log(`🎉 Enhanced ZINE extraction completed: ${images.length} pages processed`)
      
      return {
        images,
        title: zineTitle.trim() || '無題',
        descriptions,
        enhancedData
      }
    } catch (error) {
      console.error('Failed to extract ZINE images with enhanced analysis:', error)
      throw new Error('ZINEページの高度な画像解析に失敗しました')
    }
  }

  // ZINEコンテンツ抽出関数（小説化用）- 改善版
  const extractZineContent = (): string => {
    let content = ""
    
    // ZINEタイトルがある場合は含める
    if (zineTitle.trim()) {
      content += `【作品タイトル】\n${zineTitle}\n\n`
    }
    
    // 全ページの要素を抽出（要素の配置順序を考慮）
    pages.forEach((page, pageIndex) => {
      if (page.elements.length > 0) {
        content += `===== ページ ${pageIndex + 1} =====\n\n`
        
        // 要素をY座標でソート（上から下の順序で処理）
        const sortedElements = [...page.elements].sort((a, b) => {
          // まずY座標で比較、同じ場合はX座標で比較
          if (Math.abs(a.y - b.y) < 50) { // 50px以内は同じ行とみなす
            return a.x - b.x
          }
          return a.y - b.y
        })
        
        // ソート済み要素を処理
        sortedElements.forEach((el) => {
          if (el.type === "text") {
            // テキスト要素
            if (el.content && el.content.trim() && el.content !== "クリックして編集") {
              content += `【テキスト】\n${el.content}\n\n`
            }
          } else if (el.type === "image") {
            // 画像要素（詳細情報を含む）
            content += `【画像】\n`
            
            // 画像の説明情報があれば追加
            if (el.description) {
              content += `説明: ${el.description}\n`
            } else if (el.altText) {
              content += `内容: ${el.altText}\n`
            } else if (el.caption) {
              content += `キャプション: ${el.caption}\n`
            } else {
              // デフォルトの説明（画像URLから推測）
              if (el.src?.includes('placeholder')) {
                content += `内容: プレースホルダー画像\n`
              } else if (el.src) {
                // URLから画像の種類を推測
                const imageName = el.src.split('/').pop()?.split('?')[0] || '不明な画像'
                content += `内容: ${imageName}\n`
              } else {
                content += `内容: 視覚的要素（詳細不明）\n`
              }
            }
            
            // 画像の配置情報（物語の流れのヒントとして）
            const position = getElementPosition(el)
            content += `配置: ${position}\n`
            
            // 近くのテキストとの関連性を示唆
            const nearbyText = findNearbyText(el, sortedElements)
            if (nearbyText) {
              content += `関連テキスト: "${nearbyText.length > 200 ? nearbyText.substring(0, 200) + '...' : nearbyText}"\n`
            }
            
            content += "\n"
          } else if (el.type === "shape") {
            // 図形要素（装飾的な要素として記録）
            content += `【装飾】\n`
            content += `種類: 図形（${el.color || '色不明'}）\n\n`
          }
        })
        
        content += "\n"
      }
    })
    
    return content.trim()
  }
  
  // 要素の配置位置を文字列で表現
  const getElementPosition = (el: Element): string => {
    const relativeY = el.y / 900 // キャンバス高さ900px基準
    const relativeX = el.x / 1400 // キャンバス幅1400px基準
    
    let position = ""
    if (relativeY < 0.33) position += "上部"
    else if (relativeY < 0.66) position += "中央"
    else position += "下部"
    
    if (relativeX < 0.33) position += "左側"
    else if (relativeX < 0.66) position += "中央"
    else position += "右側"
    
    return position
  }
  
  // 画像の近くにあるテキストを複数検索（強化版）
  const findNearbyText = (imageEl: Element, elements: Element[]): string => {
    const textElements = elements.filter(el => 
      el.type === "text" && 
      el.content && 
      el.content.trim() !== "" &&
      el.content !== "クリックして編集"
    )
    
    // 距離と方向情報を含む関連テキストを収集
    const relatedTexts: Array<{
      content: string
      distance: number
      direction: string
    }> = []
    
    textElements.forEach(textEl => {
      const distance = Math.sqrt(
        Math.pow(imageEl.x - textEl.x, 2) + 
        Math.pow(imageEl.y - textEl.y, 2)
      )
      
      // 閾値を300pxに拡大（より多くの関連テキストを取得）
      if (distance < 300) {
        // 方向を判定
        const deltaX = textEl.x - imageEl.x
        const deltaY = textEl.y - imageEl.y
        let direction = ""
        
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          direction = deltaY > 0 ? "下" : "上"
        } else {
          direction = deltaX > 0 ? "右" : "左"
        }
        
        relatedTexts.push({
          content: textEl.content || "",
          distance,
          direction
        })
      }
    })
    
    // 距離順でソート
    relatedTexts.sort((a, b) => a.distance - b.distance)
    
    // 上位3つまでの関連テキストを結合（200文字制限に緩和）
    const maxTexts = 3
    const selectedTexts = relatedTexts.slice(0, maxTexts)
    
    if (selectedTexts.length === 0) {
      return ""
    }
    
    // 方向付きで結合
    return selectedTexts
      .map(text => `[${text.direction}] ${text.content.substring(0, 200)}`)
      .join(" | ")
  }

  // 小説化機能（画像ベース）
  const handleNovelize = async () => {
    console.log("🎬 Starting image-based novel generation...")
    
    // Convert all data to natural language format to prevent technical contamination
    const concept = conceptConfig.genre === 'none' ? "自由創作" : (conceptConfig.genre || "自由創作")
    const world = `${worldviewConfig.stage || "架空の世界"}を舞台とした${worldviewConfig.scenario || "物語"}として`
    
    setIsGeneratingNovel(true)
    
    try {
      // ZINEページを画像化（Enhanced AI Analysis）
      console.log("📸 Extracting ZINE images with AI enhancement...")
      const { images, enhancedData } = await extractZineImages()

      if (images.length === 0) {
        notifications.warning("コンテンツが必要です", "小説化にはZINEページに画像またはテキスト要素を追加してください")
        return
      } else {
        // 強化版画像ベースの小説生成
        console.log(`🖼️ Generating enhanced novel from ${images.length} ZINE images...`)

        // Completely remove title to prevent any contamination
        const result = await novelizeWithImagesEnhanced({
          concept,
          world,
          images,
          title: "",  // No title to prevent contamination
          // imageDescriptions: descriptions, // 🔥 REMOVED: Stop sending imageDescriptions to prevent contamination
          enhancedAnalysis: enhancedData // Include enhanced AI analysis data
          // No detailed prompt to prevent technical contamination
        })
        
        let cleanedText = result.text
        
        // 同じクリーンアップ処理
        const linesToRemove = [
          /^タイトル[:：].*$/gm,
          /^概要[:：].*$/gm,
          /^設定[:：].*$/gm,
          /^ジャンル[:：].*$/gm,
          /^キャラクター[:：].*$/gm,
          /^登場人物[:：].*$/gm,
          /^あらすじ[:：].*$/gm,
          /^シナリオ[:：].*$/gm,
          /^[【］[\w\s]*[】]/gm,
          /^##?\s.*$/gm,
          /^-{3,}$/gm,
          /^={3,}$/gm,
        ]
        
        linesToRemove.forEach(pattern => {
          cleanedText = cleanedText.replace(pattern, '')
        })
        
        cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n').trim()
        
        console.log("✅ Image-based novel generation completed")
        setNovelContent(cleanedText)
        const splitPages = splitNovelContent(cleanedText)
      setNovelPages(splitPages)
        setCurrentNovelPage(0)
        setCurrentMode("novel")
      }
      
    } catch (error) {
      console.error("❌ Image-based novel generation error:", error)
      notifications.error("小説生成に失敗しました", "ページ内容や画像サイズを確認して再試行してください")
    } finally {
      setIsGeneratingNovel(false)
    }
  }

  // 🎯 完成度判定関数 - 作品が完成しているかチェック
  const isWorkComplete = () => {
    if (currentMode === "novel") {
      // 小説モード: 小説コンテンツ + 表紙の両方が必要
      return novelContent && novelContent.trim() && coverImageUrl
    } else {
      // ZINEモード: ページコンテンツ + 表紙の両方が必要
      return pages.length > 0 && pages.some(page => page.elements && page.elements.length > 0) && coverImageUrl
    }
  }

  // 保存機能
  const handleSaveZine = async () => {
    if (!hasZineContent && !zineTitle.trim()) {
      notifications.warning("保存できません", "タイトルを入力するか、ページに要素を追加してください")
      return
    }

    setIsSaving(true)

    // 既存作品か新規作品かを判定
    const isExistingWork = existingWorkId !== null && existingWorkId !== undefined
    console.log(`🎯 Save operation: ${isExistingWork ? 'UPDATE existing work' : 'CREATE new work'}`)
    if (isExistingWork) {
      console.log(`📝 Existing work ID: ${existingWorkId}`)
    }

    try {
      // 🔥 完成度に基づいてステータスを決定
      const isComplete = isWorkComplete()
      const workStatus = isComplete ? "published" : "draft"
      
      console.log("🎯 Save Debug Info:")
      console.log("  - Current Mode:", currentMode)
      console.log("  - Novel Content:", !!novelContent, "Length:", novelContent?.length || 0)
      console.log("  - Pages Count:", pages.length)
      console.log("  - Cover Image URL:", !!coverImageUrl, "URL:", coverImageUrl?.substring(0, 50) || "none")
      console.log("  - Is Complete:", isComplete)
      console.log("  - Final Status:", workStatus)

      // 🔥 Clean up data before saving to reduce size
      const cleanedPages = pages.map(page => ({
        ...page,
        elements: page.elements.map(element => {
          // Remove temporary data and keep only necessary fields
          const { tempData, ...cleanElement } = element as any
          // If image element, ensure we're not storing base64 data unnecessarily
          if (cleanElement.type === 'image' && cleanElement.src?.startsWith('data:image')) {
            // Keep only the first 100 chars of base64 for preview if needed
            console.log(`  - Cleaning image element: ${cleanElement.id}, original size: ${cleanElement.src.length}`)
            // Don't truncate the image data, but log its size for debugging
          }
          return cleanElement
        })
      }))

      // 小説モードの場合、novelPagesを必ず生成して保存
      const currentNovelPages = currentMode === "novel" && novelContent
        ? (novelPages.length > 0 ? novelPages : splitNovelContent(novelContent))
        : novelPages

      const zineData = {
        ...(isExistingWork && { id: existingWorkId }), // Include ID only for existing works
        title: zineTitle || "無題",
        status: workStatus, // 🔥 完成度に基づいて "published" または "draft"
        isComplete: isComplete, // 🔥 完成フラグを追加
        currentMode: currentMode, // 🔥 現在のモードを保存
        description: `${pages.length}ページのZINE`,
        pages: cleanedPages, // Use cleaned pages
        conceptConfig: conceptConfig,
        worldviewConfig: worldviewConfig,
        novelContent: novelContent,
        novelPages: currentNovelPages, // 🔥 必ずnovelPagesが存在するように保証
        coverImageUrl: coverImageUrl, // 🔥 表紙画像URLを保存データに含める
        createdAt: new Date().toISOString()
      }

      // 🔥 Log data size before saving
      const dataSize = JSON.stringify(zineData).length
      console.log(`📊 ZINE data size before save: ${dataSize} bytes (${(dataSize / 1024 / 1024).toFixed(2)} MB)`)

      if (dataSize > 10 * 1024 * 1024) { // Warning if over 10MB
        console.warn(`⚠️ Large ZINE data detected: ${(dataSize / 1024 / 1024).toFixed(2)} MB`)
      }

      // 既存/新規に応じてAPIを使い分け
      let result
      if (isExistingWork && existingWorkId) {
        console.log(`🔄 Updating existing work: ${existingWorkId}`)
        result = await updateZine(existingWorkId, zineData)
        console.log(`✅ Work updated successfully: ${result.id}`)
      } else {
        console.log(`🆕 Creating new work`)
        result = await saveZine(zineData)
        console.log(`✅ New work created: ${result.id}`)

        // 新規作成時は作成されたIDを記録
        setExistingWorkId(result.id)
      }

      // 🔥 完成度と操作種別に応じてメッセージを変更
      const operationType = isExistingWork ? "更新" : "保存"
      const operationEmoji = isExistingWork ? "🔄" : "💾"

      if (isComplete) {
        notifications.saved(zineData.title, true)
      } else {
        notifications.info(
          "下書きを保存しました",
          `完成させるには${currentMode === "novel" ? "小説内容と表紙" : "ページ内容と表紙"}の両方が必要です`
        )
      }

      // 📚 Published Booksの更新を通知
      if (onPublishedBooksUpdate) {
        console.log('📚 Triggering published books update after save')
        onPublishedBooksUpdate()
      }
    } catch (error) {
      const operationType = isExistingWork ? "更新" : "保存"
      console.error(`${operationType}エラー:`, error)
      notifications.error(
        `作品の${operationType}に失敗しました`,
        "もう一度お試しください"
      )
    } finally {
      setIsSaving(false)
    }
  }

  // 🔍 ZINE キーワード抽出関数
  const extractZineKeywords = (pages: Page[]): string[] => {
    const keywords: string[] = []

    pages.forEach(page => {
      page.elements.forEach(element => {
        if (element.type === 'text' && element.content && element.content.trim()) {
          // テキスト要素から重要なキーワードを抽出
          const text = element.content.toLowerCase()
          const words = text.split(/\s+|[、。,.]/).filter(word => word.length > 1)
          keywords.push(...words.slice(0, 3)) // 各テキストから最大3つまで
        }
        if (element.type === 'image' && element.description) {
          // 画像の説明からキーワードを抽出
          const desc = element.description.toLowerCase()
          const words = desc.split(/\s+|[、。,.]/).filter(word => word.length > 1)
          keywords.push(...words.slice(0, 2)) // 各画像説明から最大2つまで
        }
      })
    })

    // 重複除去と長さ制限
    return [...new Set(keywords)].slice(0, 8)
  }

  // 📖 小説キーワード抽出関数
  const extractNovelKeywords = (content: string): string[] => {
    if (!content.trim()) return []

    const keywords: string[] = []
    const text = content.toLowerCase()

    // 簡単なキーワード抽出（改良の余地あり）
    const sentences = text.split(/[。！？.]/).filter(s => s.trim().length > 5)

    sentences.slice(0, 5).forEach(sentence => {
      const words = sentence.split(/\s+|[、,]/).filter(word =>
        word.length > 1 && !word.match(/^(は|が|を|に|で|と|の|から|まで|より|こと|もの|ため|とき)$/)
      )
      keywords.push(...words.slice(0, 2))
    })

    // 重複除去と長さ制限
    return [...new Set(keywords)].slice(0, 6)
  }

  const handleCoverGeneration = async (userKeywords: string[] = []) => {
    if (!novelContent.trim()) {
      notifications.warning("小説が必要です", "表紙を生成するには、まず小説を生成してください")
      return
    }

    setIsGeneratingCover(true)
    try {
      console.log("🚀 Starting keyword-based cover generation process...")

      // 🔍 キーワード抽出
      const zineKeywords = extractZineKeywords(pages)
      const novelKeywords = extractNovelKeywords(novelContent)

      console.log("📚 Extracted ZINE keywords:", zineKeywords)
      console.log("📖 Extracted novel keywords:", novelKeywords)
      console.log("👤 User keywords:", userKeywords)

      // 📡 新しいキーワードベースAPIを使用
      const result = await generateCover({
        zineKeywords,
        novelKeywords,
        userKeywords
      })

      console.log("📨 Cover generation result:", result)

      if (result.url) {
        console.log("✅ Cover generated successfully! URL:", result.url)
        setCoverImageUrl(result.url)
        notifications.coverGenerated()

        // 🎉 Success message with ultra-strict validation note
        if (result.message) {
          console.log("ℹ️ API Message:", result.message)
        }
      } else {
        console.error("❌ Cover generation failed - no URL returned")
        notifications.error("表紙生成に失敗しました", "別のスタイルで再試行しています...")
      }
    } catch (error) {
      console.error("🚨 CRITICAL: Cover generation error:", error)

      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorName = error instanceof Error ? error.name : 'UnknownError'
      const errorStack = error instanceof Error ? error.stack : 'No stack trace'

      console.error("🔍 Error details:", {
        name: errorName,
        message: errorMessage,
        stack: errorStack
      })

      // レート制限エラーの特別なハンドリング
      if (errorMessage.includes("API利用制限") || errorMessage.includes("429")) {
        notifications.rateLimitError()
      } else {
        // その他のエラー
        notifications.error("表紙生成に失敗しました", `生成中にエラーが発生しました: ${errorMessage}`)
      }
    } finally {
      setIsGeneratingCover(false)
      console.log("🏁 Cover generation process completed.")
    }
  }

  const handleOpenCoverModal = () => {
    if (!novelContent.trim()) {
      notifications.warning("小説が必要です", "表紙を生成するには、まず小説を生成してください")
      return
    }
    setShowCoverModal(true)
  }

  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(135deg, #f7f1e8 0%, #f5ede1 25%, #f3e9d4 50%, #f1e5c7 75%, #ede0ba 100%)",
      color: "#4a3c28"
    }}>
      <LoadingScreens 
        isGeneratingNovel={isGeneratingNovel}
        isModifyingStyle={isModifyingStyle}
        isApplyingOnepoint={isApplyingOnepoint}
        isGeneratingCover={isGeneratingCover}
        isApplyingReview={isApplyingReview}
      />

      {showZineExamples && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(74, 60, 40, 0.5)" }}>
          <motion.div
            className="rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto"
            style={{
              background: "linear-gradient(135deg, #f7f1e8 0%, #f3e9d4 100%)",
              border: "1px solid rgba(139, 115, 85, 0.3)"
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: "#4a3c28" }}>ZINEの例</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowZineExamples(false)}
                className="hover:bg-amber-100" 
                style={{ color: "#8b7355" }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Photo Essay Example */}
              <div className="rounded-lg p-6 border" style={{ 
                background: "rgba(247, 241, 232, 0.8)", 
                borderColor: "rgba(139, 115, 85, 0.3)" 
              }}>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-32 h-32 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-3" style={{ color: "#4a3c28" }}>フォトエッセイ「街角の記憶」</h3>
                    <p className="text-sm mb-4" style={{ color: "#8b7355" }}>写真と文章を組み合わせて、個人的な体験や思い出を表現</p>
                    <div className="rounded p-3 mb-3" style={{ background: "rgba(241, 229, 199, 0.6)" }}>
                      <p className="text-xs leading-relaxed" style={{ color: "#6b5b47" }}>
                        【構成例】<br/>
                        左ページ: 夕暮れの街角の写真（フルページ）<br/>
                        右ページ: 「その角で、私は初めて彼女と出会った...」といった短いエッセイ<br/>
                        見開きで一つのストーリーを完結
                      </p>
                    </div>
                    <div className="text-xs" style={{ color: "#a0896c" }}>
                      テキスト: 感情的で詩的な短文 | レイアウト: 写真重視、文字は最小限
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 text-white"
                      style={{
                        background: "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)"
                      }}
                      onClick={() => {
                        // フォトエッセイテンプレートを2ページに適用
                        const currentIndex = pages.findIndex(p => p.id === currentPage.id)
                        
                        // 現在のページとその次のページを確認
                        if (currentIndex === -1) return
                        
                        // 次のページがなければ作成
                        let nextPageId: string
                        if (!pages[currentIndex + 1]) {
                          nextPageId = `page-${Date.now()}`
                          const newPage: Page = {
                            id: nextPageId,
                            elements: [],
                            title: `ページ ${pages.length + 1}`
                          }
                          setPages(prev => [...prev, newPage])
                        } else {
                          nextPageId = pages[currentIndex + 1].id
                        }

                        // ページ1のテンプレート（MY JOURNEY）
                        const page1Elements: Element[] = [
                          // 左ページ（0-680px）：メイン写真
                          {
                            id: `main-photo-${Date.now()}`,
                            type: "image",
                            x: 100,
                            y: 150,
                            width: 460,
                            height: 550,
                            src: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&h=600&fit=crop&crop=entropy&auto=format&fm=jpg&q=60",
                            pageId: currentPage.id
                          },
                          // 右ページ（720-1400px）：白い背景ボックス
                          {
                            id: `white-bg-${Date.now()}`,
                            type: "shape",
                            x: 850,
                            y: 200,
                            width: 500,
                            height: 400,
                            color: "#ffffff",
                            pageId: currentPage.id
                          },
                          // 右ページ：タイトル（MY JOURNEY）
                          {
                            id: `title-${Date.now()}`,
                            type: "text",
                            x: 880,
                            y: 250,
                            width: 350,
                            height: 60,
                            content: "MYJOURNEY",
                            fontSize: 30,
                            color: "#2d1810",
                            pageId: currentPage.id
                          },
                          // 右ページ：メインテキスト
                          {
                            id: `main-text-${Date.now()}`,
                            type: "text",
                            x: 880,
                            y: 350,
                            width: 360,
                            height: 160,
                            content: "旅の始まりは偶然だった。ある朝、目が覚めると、どこか遠くへ行きたくなった。理由は分からない。ただ、心がそう告げていた。",
                            fontSize: 16,
                            color: "#4a3c28",
                            pageId: currentPage.id
                          },
                          // 右ページ：日付
                          {
                            id: `date-${Date.now()}`,
                            type: "text",
                            x: 890,
                            y: 540,
                            width: 120,
                            height: 30,
                            content: "2024.10.09",
                            fontSize: 14,
                            color: "#8b7355",
                            pageId: currentPage.id
                          }
                        ]

                        // ページ2のテンプレート
                        const page2Elements: Element[] = [
                          // 左ページ（0-680px）：白い背景ボックス
                          {
                            id: `left-white-bg-${Date.now()}`,
                            type: "shape",
                            x: 80,
                            y: 150,
                            width: 520,
                            height: 550,
                            color: "#ffffff",
                            pageId: nextPageId
                          },
                          // 左ページ：テキストボックス
                          {
                            id: `left-text-${Date.now()}`,
                            type: "text",
                            x: 110,
                            y: 180,
                            width: 460,
                            height: 250,
                            content: "カメラを手に取り、最小限の荷物をバックに詰めて、私は家を出た。行き先は決めていない。それでも、きっと何か大切なものに出会えると信じて、初めて訪れた街の空気、初めて見る景色。全てが新鮮で、全てが美しかった。",
                            fontSize: 16,
                            color: "#4a3c28",
                            pageId: nextPageId
                          },
                          // 左ページ：小さな写真
                          {
                            id: `small-photo-${Date.now()}`,
                            type: "image",
                            x: 160,
                            y: 480,
                            width: 220,
                            height: 160,
                            src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=entropy&auto=format&fm=jpg&q=60",
                            pageId: nextPageId
                          },
                          // 右ページ（720-1400px）：地図/旅の道具の写真
                          {
                            id: `map-photo-${Date.now()}`,
                            type: "image",
                            x: 850,
                            y: 150,
                            width: 420,
                            height: 300,
                            src: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=400&fit=crop&crop=entropy&auto=format&fm=jpg&q=60",
                            pageId: nextPageId
                          },
                          // 右ページ：白い背景ボックス（キャプション用）
                          {
                            id: `caption-bg-${Date.now()}`,
                            type: "shape",
                            x: 850,
                            y: 480,
                            width: 420,
                            height: 150,
                            color: "#ffffff",
                            pageId: nextPageId
                          },
                          // 右ページ：キャプション
                          {
                            id: `caption-${Date.now()}`,
                            type: "text",
                            x: 880,
                            y: 510,
                            width: 360,
                            height: 90,
                            content: "山の頂きから見下ろした景色は、想像を超えていた。風が頬を撫で、雲が足元に流れる。この瞬間のために、旅をしてきたのかもしれない。",
                            fontSize: 15,
                            color: "#6b5b47",
                            pageId: nextPageId
                          }
                        ]

                        // ページを更新
                        setPages(prev => {
                          const updated = [...prev]
                          // 現在のページをクリアして新しい要素を追加
                          updated[currentIndex].elements = page1Elements
                          
                          // 次のページがある場合はその要素を更新
                          if (updated[currentIndex + 1]) {
                            updated[currentIndex + 1].elements = page2Elements
                          }
                          
                          return updated
                        })
                        setShowZineExamples(false)
                      }}
                    >
                      このテンプレートを使用
                    </Button>
                  </div>
                </div>
              </div>

              {/* Art Book Example */}
              <div className="rounded-lg p-6 border" style={{ 
                background: "rgba(247, 241, 232, 0.8)", 
                borderColor: "rgba(139, 115, 85, 0.3)" 
              }}>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-32 h-32 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Palette className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-3" style={{ color: "#4a3c28" }}>アートブック「水彩の世界」</h3>
                    <p className="text-sm mb-4" style={{ color: "#8b7355" }}>イラスト作品を体系的に収録した作品集</p>
                    <div className="rounded p-3 mb-3" style={{ background: "rgba(241, 229, 199, 0.6)" }}>
                      <p className="text-xs leading-relaxed" style={{ color: "#6b5b47" }}>
                        【構成例】<br/>
                        左ページ: 作品タイトル「雨上がりの街」と制作年<br/>
                        右ページ: 水彩画作品（高解像度で印刷映え重視）<br/>
                        下部に技法説明「透明水彩、コットン紙使用」
                      </p>
                    </div>
                    <div className="text-xs" style={{ color: "#a0896c" }}>
                      テキスト: 作品解説、技法説明 | レイアウト: アート重視、余白を活かしたデザイン
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 text-white"
                      style={{
                        background: "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)"
                      }}
                      onClick={() => {
                        // Apply art book template
                        const elements: Element[] = [
                          {
                            id: `element-${Date.now()}`,
                            type: "text",
                            x: 50,
                            y: 30,
                            width: 250,
                            height: 50,
                            content: "雨上がりの街",
                            fontSize: 24,
                            pageId: currentPage.id
                          },
                          {
                            id: `element-${Date.now() + 1}`,
                            type: "text",
                            x: 50,
                            y: 400,
                            width: 300,
                            height: 60,
                            content: "透明水彩、コットン紙使用\n2024年制作",
                            fontSize: 12,
                            pageId: currentPage.id
                          },
                          {
                            id: `element-${Date.now() + 2}`,
                            type: "shape",
                            x: 100,
                            y: 100,
                            width: 500,
                            height: 280,
                            color: "#E8F4EA",
                            pageId: currentPage.id
                          }
                        ]
                        setPages(prev => {
                          const updated = [...prev]
                          updated[currentPageIndex].elements = [...updated[currentPageIndex].elements, ...elements]
                          return updated
                        })
                        setShowZineExamples(false)
                      }}
                    >
                      このテンプレートを使用
                    </Button>
                  </div>
                </div>
              </div>

              {/* Poetry Collection Example */}
              <div className="rounded-lg p-6 border" style={{ 
                background: "rgba(247, 241, 232, 0.8)", 
                borderColor: "rgba(139, 115, 85, 0.3)" 
              }}>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-32 h-32 bg-pink-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-8 h-8 text-pink-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-3" style={{ color: "#4a3c28" }}>詩集「四季の断章」</h3>
                    <p className="text-sm mb-4" style={{ color: "#8b7355" }}>詩や短文を美しいタイポグラフィで表現</p>
                    <div className="rounded p-3 mb-3" style={{ background: "rgba(241, 229, 199, 0.6)" }}>
                      <p className="text-xs leading-relaxed" style={{ color: "#6b5b47" }}>
                        【構成例】<br/>
                        左ページ: 空白（余韻を演出）<br/>
                        右ページ: 中央に詩「桜散りて / 風のうたが / 聞こえてくる」<br/>
                        フォント: 明朝体、行間を広く取った縦書き
                      </p>
                    </div>
                    <div className="text-xs" style={{ color: "#a0896c" }}>
                      テキスト: 短詩、俳句、散文詩 | レイアウト: 余白重視、タイポグラフィが主役
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 text-white"
                      style={{
                        background: "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)"
                      }}
                      onClick={() => {
                        // Apply poetry template
                        const newElement: Element = {
                          id: `element-${Date.now()}`,
                          type: "text",
                          x: 350,
                          y: 200,
                          width: 200,
                          height: 150,
                          content: "桜散りて\n風のうたが\n聞こえてくる",
                          fontSize: 18,
                          pageId: currentPage.id
                        }
                        setPages(prev => {
                          const updated = [...prev]
                          updated[currentPageIndex].elements.push(newElement)
                          return updated
                        })
                        setShowZineExamples(false)
                      }}
                    >
                      このテンプレートを使用
                    </Button>
                  </div>
                </div>
              </div>

              {/* Travel Zine Example */}
              <div className="rounded-lg p-6 border" style={{ 
                background: "rgba(247, 241, 232, 0.8)", 
                borderColor: "rgba(139, 115, 85, 0.3)" 
              }}>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-32 h-32 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Brush className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-3" style={{ color: "#4a3c28" }}>旅行ZINE「京都一人旅」</h3>
                    <p className="text-sm mb-4" style={{ color: "#8b7355" }}>写真、イラスト、文章を混在させた旅行記</p>
                    <div className="rounded p-3 mb-3" style={{ background: "rgba(241, 229, 199, 0.6)" }}>
                      <p className="text-xs leading-relaxed" style={{ color: "#6b5b47" }}>
                        【構成例】<br/>
                        左ページ: 手描きの地図イラスト + 「AM 9:00 清水寺へ」<br/>
                        右ページ: 寺院の写真 + 「観光客の波に揉まれながら...」の日記風文章<br/>
                        コラージュ風にシール、チケットの写真も配置
                      </p>
                    </div>
                    <div className="text-xs" style={{ color: "#a0896c" }}>
                      テキスト: 日記風、時系列 | レイアウト: コラージュ、手作り感のあるデザイン
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 text-white"
                      style={{
                        background: "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)"
                      }}
                      onClick={() => {
                        // Apply travel zine template
                        const elements: Element[] = [
                          {
                            id: `element-${Date.now()}`,
                            type: "text",
                            x: 50,
                            y: 50,
                            width: 200,
                            height: 40,
                            content: "Day 1 - 京都駅",
                            fontSize: 20,
                            pageId: currentPage.id
                          },
                          {
                            id: `element-${Date.now() + 1}`,
                            type: "shape",
                            x: 300,
                            y: 50,
                            width: 350,
                            height: 200,
                            color: "#FFF5E6",
                            pageId: currentPage.id
                          },
                          {
                            id: `element-${Date.now() + 2}`,
                            type: "text",
                            x: 50,
                            y: 280,
                            width: 600,
                            height: 120,
                            content: "京都駅に降り立った瞬間、懐かしい香りが鼻をくすぐった。\n駅弁の匂い、お茶の香り、そしてどこからか漂うお線香の香り。\nこの街には、時間がゴムのように伸び縮みする。",
                            fontSize: 14,
                            pageId: currentPage.id
                          }
                        ]
                        setPages(prev => {
                          const updated = [...prev]
                          updated[currentPageIndex].elements = [...updated[currentPageIndex].elements, ...elements]
                          return updated
                        })
                        setShowZineExamples(false)
                      }}
                    >
                      このテンプレートを使用
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg border" style={{ 
              background: "rgba(241, 229, 199, 0.4)", 
              borderColor: "rgba(139, 115, 85, 0.2)" 
            }}>
              <h4 className="font-semibold mb-2" style={{ color: "#4a3c28" }}>ZINEの特徴</h4>
              <p className="text-sm" style={{ color: "#8b7355" }}>
                ZINEは自由な表現形式で、写真・イラスト・文章を組み合わせて独自の世界観を作り出せます。
                完成後は小説化機能で、より詳細なストーリーに発展させることも可能です。
              </p>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex h-screen">
        {/* Left Menu */}
        <ZineMenuPanel
          mode={currentMode}
          activeMenuSection={activeMenuSection}
          setActiveMenuSection={setActiveMenuSection}
          activeNovelSection={activeNovelSection}
          setActiveNovelSection={setActiveNovelSection}
          hasZineContent={hasZineContent}
          showZineExamples={showZineExamples}
          setShowZineExamples={setShowZineExamples}
          showConfigPanel={showConfigPanel}
          setShowConfigPanel={setShowConfigPanel}
          selectedElement={selectedElement}
          onMenuSectionClick={handleMenuSectionClick}
          onAddTextElement={addTextElement}
          onAddImageElement={addImageElement}
          onDeleteElement={deleteElement}
          onNovelize={handleNovelize}
          conceptConfig={conceptConfig}
          setConceptConfig={setConceptConfig}
          aiWriterConfig={aiWriterConfig}
          setAiWriterConfig={setAiWriterConfig}
          worldviewConfig={worldviewConfig}
          setWorldviewConfig={setWorldviewConfig}
          reviewChatMessages={reviewChatMessages}
          reviewChatInput={reviewChatInput}
          setReviewChatInput={setReviewChatInput}
          onSendReviewMessage={handleReviewChatSend}
          selectedText={selectedText}
          onClearSelection={clearSelection}
          isSelectionProtected={isSelectionProtected}
          onStyleModify={handleStyleModify}
          isModifyingStyle={isModifyingStyle}
          onOnepointModify={handleOnepointModify}
          isApplyingOnepoint={isApplyingOnepoint}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col" onKeyDown={handleKeyDown} tabIndex={0}>
          {showConfigPanel && currentMode === "zine" ? (
            <div className="flex-1 p-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfigPanel(false)}
                className="mb-4 hover:bg-amber-100"
                style={{ color: "#8b7355" }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                編集に戻る
              </Button>
              {renderConfigPanel()}
            </div>
          ) : (
            <>
              <ZineToolbar
                onBack={currentMode === "novel" ? handleModeChangeConfirm : onBack}
                zineTitle={zineTitle}
                setZineTitle={setZineTitle}
                mode={currentMode}
                setMode={setCurrentMode}
                onSave={handleSaveZine}
                isSaving={isSaving}
                currentPageIndex={currentPageIndex}
                totalPages={pages.length}
                onPreviousPage={goToPreviousPage}
                onNextPage={goToNextPage}
                onAddPage={addPage}
                currentNovelPage={currentNovelPage}
                totalNovelPages={novelPages.length}
                onPreviousNovelPage={goToPreviousNovelPage}
                onNextNovelPage={goToNextNovelPage}
                onCoverGeneration={handleOpenCoverModal}
                isGeneratingCover={isGeneratingCover}
                hasNovelContent={!!novelContent.trim()}
              />

              {/* Main editing area */}
              <div className="flex-1 overflow-hidden pt-16 relative" style={{
                background: "linear-gradient(135deg, #f3e9d4 0%, #f1e5c7 50%, #ede0ba 100%)"
              }}>
                {currentMode === "zine" ? (
                  <ZineCanvas
                    ref={canvasRef}
                    currentPage={currentPage}
                    selectedElement={selectedElement}
                    setSelectedElement={setSelectedElement}
                    updateElement={updateElement}
                    draggedElement={draggedElement}
                    setDraggedElement={setDraggedElement}
                    dragOffset={dragOffset}
                    setDragOffset={setDragOffset}
                    onAddTextAt={(x, y) => addTextElement(x, y)}
                    onAddImageAt={(x, y) => addImageElement(x, y)}
                    onEditingChange={setEditingElement}
                  />
                ) : (
                  <div className="w-full max-w-7xl mx-auto perspective-1000">
                    <motion.div
                      className="relative"
                      initial={{ opacity: 0, rotateY: -15 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                    >
                      {/* Elegant Book Controls */}
                      <div className="absolute -top-16 right-0 flex items-center gap-3 z-10">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{
                          background: "rgba(74, 60, 40, 0.8)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(218, 165, 32, 0.3)"
                        }}>
                          <span className="text-xs" style={{ color: "#daa520", fontFamily: "serif" }}>Theme:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBookTheme("light")}
                            className={`w-6 h-6 rounded-full hover:scale-110 transition-transform ${bookTheme === "light" ? "ring-2" : ""}`}
                            style={{
                              background: "#f8f6f0",
                              border: bookTheme === "light" ? "2px solid #daa520" : "2px solid transparent"
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBookTheme("sepia")}
                            className={`w-6 h-6 rounded-full hover:scale-110 transition-transform ${bookTheme === "sepia" ? "ring-2" : ""}`}
                            style={{
                              background: "#f4ead0",
                              border: bookTheme === "sepia" ? "2px solid #daa520" : "2px solid transparent"
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBookTheme("dark")}
                            className={`w-6 h-6 rounded-full hover:scale-110 transition-transform ${bookTheme === "dark" ? "ring-2" : ""}`}
                            style={{
                              background: "#2a2520",
                              border: bookTheme === "dark" ? "2px solid #daa520" : "2px solid transparent"
                            }}
                          />
                        </div>
                        <Button variant="ghost" size="sm" className="hover:bg-amber-100 ml-2" style={{ color: "#daa520" }}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="hover:bg-amber-100" style={{ color: "#daa520" }}>
                          <BookOpen className="w-4 h-4" />
                        </Button>
                      </div>


                      {/* Elegant Book Container */}
                      <div
                        className="relative w-full max-w-6xl mx-auto"
                        style={{
                          background: `
                            linear-gradient(145deg, #2c1810 0%, #3d2417 15%, #4a2c1a 30%, #3d2417 70%, #2c1810 100%),
                            radial-gradient(ellipse 60% 40% at 50% 30%, rgba(218, 165, 32, 0.1) 0%, transparent 70%)
                          `,
                          minHeight: "700px",
                          borderRadius: "12px",
                          padding: "80px 60px",
                          boxShadow: `
                            0 0 0 3px rgba(139, 105, 20, 0.3),
                            0 0 0 6px rgba(74, 60, 40, 0.2),
                            0 20px 40px rgba(0,0,0,0.4),
                            inset 0 2px 0 rgba(255,253,250,0.1)
                          `
                        }}
                      >
                        {/* Decorative corner ornaments */}
                        <div className="absolute top-4 left-4 w-8 h-8" style={{
                          background: "linear-gradient(45deg, #daa520, #b8860b)",
                          clipPath: "polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)"
                        }}></div>
                        <div className="absolute top-4 right-4 w-8 h-8" style={{
                          background: "linear-gradient(135deg, #daa520, #b8860b)",
                          clipPath: "polygon(0 0, 100% 0, 100% 100%, 30% 100%, 0 70%)"
                        }}></div>
                        <div className="absolute bottom-4 left-4 w-8 h-8" style={{
                          background: "linear-gradient(315deg, #daa520, #b8860b)",
                          clipPath: "polygon(0 0, 70% 0, 100% 30%, 100% 100%, 0 100%)"
                        }}></div>
                        <div className="absolute bottom-4 right-4 w-8 h-8" style={{
                          background: "linear-gradient(225deg, #daa520, #b8860b)",
                          clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0 100%, 0 30%)"
                        }}></div>
                        <div
                          className="relative mx-auto rounded-lg overflow-hidden"
                          style={{
                            width: "1000px",
                            height: "650px",
                            background: `
                              linear-gradient(180deg, 
                                rgba(255,248,220,0.95) 0%, 
                                rgba(255,253,250,0.9) 20%, 
                                rgba(250,245,230,0.85) 50%, 
                                rgba(245,240,225,0.9) 80%, 
                                rgba(248,243,230,0.95) 100%
                              ),
                              ${currentTheme.pageBackground}
                            `,
                            boxShadow: `
                              0 0 0 2px rgba(139,105,20,0.2),
                              0 0 0 4px rgba(74,60,40,0.1),
                              0 25px 50px -15px rgba(0,0,0,0.4),
                              inset 0 2px 0 rgba(255,253,250,0.4),
                              inset 0 -2px 0 rgba(139,115,85,0.1)
                            `,
                            zIndex: 1,
                          }}
                        >
                          {/* Page aging/vintage effect */}
                          <div className="absolute inset-0 opacity-[0.03]" style={{
                            background: `
                              radial-gradient(circle at 20% 80%, rgba(139,69,19,0.8) 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, rgba(160,82,45,0.6) 0%, transparent 50%),
                              radial-gradient(circle at 40% 40%, rgba(101,67,33,0.4) 0%, transparent 30%)
                            `
                          }}></div>
                          {/* Enhanced center binding with stitching effect */}
                          <div
                            className="absolute left-1/2 top-0 bottom-0 w-2 transform -translate-x-1/2 z-30"
                            style={{
                              background: `linear-gradient(180deg, 
                                rgba(139,105,20,0.4) 0%, 
                                rgba(74,60,40,0.2) 20%, 
                                rgba(139,115,85,0.1) 50%, 
                                rgba(74,60,40,0.2) 80%, 
                                rgba(139,105,20,0.4) 100%
                              )`,
                              boxShadow: `
                                -3px 0 6px rgba(139,69,19,0.3),
                                3px 0 6px rgba(139,69,19,0.3),
                                inset 0 0 2px rgba(218,165,32,0.2)
                              `,
                            }}
                          >
                            {/* Stitching pattern */}
                            <div className="absolute left-1/2 top-4 bottom-4 w-0 border-l border-dashed transform -translate-x-1/2" style={{
                              borderColor: "rgba(139,105,20,0.3)"
                            }}></div>
                          </div>

                          {/* Fixed page numbers at the bottom */}
                          <div className="absolute bottom-6 w-full flex justify-between px-6 z-40">
                            <div className="w-1/2 text-center">
                              <span className="text-xs" style={{ color: "#a0896c", fontFamily: "serif" }}>{currentNovelPage * 2 + 1}</span>
                            </div>
                            <div className="w-1/2 text-center">
                              <span className="text-xs" style={{ color: "#a0896c", fontFamily: "serif" }}>{currentNovelPage * 2 + 2}</span>
                            </div>
                          </div>

                          {/* テキスト高さ測定用隠し要素 */}
                          <div
                            ref={setTextMeasureRef}
                            className="absolute opacity-0 pointer-events-none"
                            style={{
                              position: 'fixed',
                              top: '-9999px',
                              left: '-9999px',
                              width: '404px', // 実際のテキスト幅 (500px - 96px padding)
                              padding: '0',
                              margin: '0',
                              fontFamily: 'Georgia, "Times New Roman", serif',
                              fontSize: `${fontSize}px`,
                              lineHeight: '2.2',
                              whiteSpace: 'pre-wrap',
                              visibility: 'hidden',
                              zIndex: -1
                            }}
                          />

                          {/* Page content container */}
                          <div className="flex h-full relative z-10">
                            {/* Left page */}
                            <div className="w-1/2 pr-4 relative">
                              <div className="absolute top-6 left-6 text-xs" style={{ color: "#a0896c", fontFamily: "serif" }}>Chapter 1</div>
                              <div className="px-12 py-16 h-full pb-8">
                                <div
                                  className="text-base leading-8 whitespace-pre-wrap cursor-text"
                                  style={{
                                    color: currentTheme.text,
                                    fontFamily: 'Georgia, "Times New Roman", serif',
                                    lineHeight: "2.2",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                    maxHeight: "calc(100% - 2rem)",
                                    fontSize: `${fontSize}px`
                                  }}
                                  onMouseUp={handleTextSelection}
                                  onMouseDown={(e) => {
                                    // 作家レビューモードで既に選択がある場合、新しい選択を防ぐ
                                    if (isSelectionProtected && selectedText) {
                                      e.preventDefault()
                                    }
                                  }}
                                  onFocus={(e) => {
                                    // フォーカス時に選択が失われるのを防ぐ
                                    if (isSelectionProtected && selectedText) {
                                      e.preventDefault()
                                    }
                                  }}
                                >
                                  {(dynamicPages.length > 0 || novelContent)
                                    ? renderTextWithSuggestions(
                                        dynamicPages.length > 0
                                          ? dynamicPages[currentNovelPage * 2] || ""
                                          : (() => {
                                              // dynamicPagesが空でもnovelContentがある場合は動的に分割
                                              const fallbackPages = splitNovelContent(novelContent)
                                              return fallbackPages[currentNovelPage * 2] || ""
                                            })()
                                      )
                                    : renderTextWithSuggestions(`　夕暮れの街角で、彼女は立ち止まった。オレンジ色の光が建物の窓を染め、遠くから聞こえる車の音が都市の鼓動のように響いている。

　「もう戻れないのね」

　彼女の声は風に混じって消えていく。手に握りしめた古い写真は、もう色褪せて誰の顔かもわからない。それでも、その温もりだけは確かに残っていた。`)}
                                </div>
                              </div>
                            </div>

                            {/* Right page */}
                            <div className="w-1/2 pl-4 relative">
                              <div className="px-12 py-16 h-full pb-8">
                                <div
                                  className="text-base leading-8 whitespace-pre-wrap cursor-text"
                                  style={{
                                    color: currentTheme.text,
                                    fontFamily: 'Georgia, "Times New Roman", serif',
                                    lineHeight: "2.2",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                    maxHeight: "calc(100% - 2rem)",
                                    fontSize: `${fontSize}px`
                                  }}
                                  onMouseUp={handleTextSelection}
                                  onMouseDown={(e) => {
                                    // 作家レビューモードで既に選択がある場合、新しい選択を防ぐ
                                    if (isSelectionProtected && selectedText) {
                                      e.preventDefault()
                                    }
                                  }}
                                  onFocus={(e) => {
                                    // フォーカス時に選択が失われるのを防ぐ
                                    if (isSelectionProtected && selectedText) {
                                      e.preventDefault()
                                    }
                                  }}
                                >
                                  {(dynamicPages.length > 0 || novelContent)
                                    ? (() => {
                                        if (dynamicPages.length > 0) {
                                          return dynamicPages[currentNovelPage * 2 + 1] || ""
                                        } else if (novelContent) {
                                          // dynamicPagesが空でもnovelContentがある場合は動的に分割
                                          const fallbackPages = splitNovelContent(novelContent)
                                          return fallbackPages[currentNovelPage * 2 + 1] || ""
                                        }
                                        return ""
                                      })()
                                    : `　角の向こうから現れた猫が、彼女の足元で鳴いた。まるで何かを伝えようとするように。

　「あなたも一人なのね」

　彼女は膝を折り、猫の頭を優しく撫でた。猫は目を細めて喉を鳴らす。この瞬間だけは、時間が止まったようだった。`}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                    
                    {/* Novel Page Navigation - Moved below the book */}
                    <div className="w-full max-w-6xl mx-auto mt-6 flex justify-center items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousNovelPage}
                        disabled={currentNovelPage <= 0}
                        className="border-amber-600 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        前のページ
                      </Button>
                      
                      <div className="px-4 py-2 rounded-lg" style={{ 
                        background: "rgba(139, 105, 20, 0.1)", 
                        border: "1px solid rgba(139, 105, 20, 0.3)",
                        color: "#8b6914"
                      }}>
                        <span className="text-sm font-medium">
                          見開きページ {currentNovelPage + 1} / {Math.max(1, Math.ceil(novelPages.length / 2))}
                        </span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextNovelPage}
                        disabled={currentNovelPage >= Math.max(0, Math.ceil(novelPages.length / 2) - 1)}
                        className="border-amber-600 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                      >
                        次のページ
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    
                    {/* Cover Image Display Section */}
                    {coverImageUrl && (
                      <div className="mt-8 flex justify-center">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="relative"
                        >
                          <div className="text-center mb-4">
                            <span className="text-sm" style={{ color: "#daa520", fontFamily: "serif" }}>
                              Generated Cover
                            </span>
                          </div>
                          <div className="relative" style={{
                            background: "linear-gradient(145deg, #2c1810 0%, #3d2417 15%, #4a2c1a 30%, #3d2417 70%, #2c1810 100%)",
                            padding: "20px",
                            borderRadius: "12px",
                            boxShadow: "0 8px 25px rgba(0,0,0,0.3)"
                          }}>
                            <img 
                              src={coverImageUrl} 
                              alt="Generated Book Cover"
                              className="rounded-lg shadow-lg"
                              style={{
                                width: "250px",
                                height: "350px",
                                objectFit: "cover",
                                border: "2px solid rgba(218, 165, 32, 0.3)"
                              }}
                            />
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Moved Page Navigation for ZINE currentMode below editor */}
              {currentMode === "zine" && (
                <div className="w-full flex items-center justify-center mt-6 mb-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPageIndex === 0}
                      className="transition-all duration-200"
                      style={{ color: currentPageIndex === 0 ? "#b5a899" : "#3a2f24" }}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <span className="text-base font-medium px-3 whitespace-nowrap" style={{ color: "#4a3c28" }}>
                      ページ {currentPageIndex + 1} / {pages.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={false}
                      className="transition-all duration-200"
                      style={{ color: "#3a2f24" }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                    {/* '+' button removed; next button now appends a page at the end */}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Text Suggestion Bubbles */}
      {textSuggestions.map((suggestion) => (
        <SuggestionBubble
          key={suggestion.id}
          suggestion={suggestion}
          onApply={handleApplySuggestion}
          onCancel={handleCancelSuggestion}
        />
      ))}
      
      {/* Mode Change Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showModeChangeConfirm}
        onClose={() => setShowModeChangeConfirm(false)}
        onConfirm={confirmModeChange}
        title="モード変更の確認"
        message="ZINEモードに戻ると、現在の小説コンテンツが削除される可能性があります。よろしいですか？"
        confirmText="はい"
        cancelText="いいえ"
        variant="warning"
      />
      
      {/* Cover Generation Modal */}
      <CoverGenerationModal
        isOpen={showCoverModal}
        onClose={() => setShowCoverModal(false)}
        isGenerating={isGeneratingCover}
        coverImageUrl={coverImageUrl}
        onGenerate={handleCoverGeneration}
        onComplete={async () => {
          console.log("🏁 Complete button pressed, auto-saving work...")
          setShowCoverModal(false)
          
          // 🔥 完了ボタンを押した時に自動保存
          await handleSaveZine()
          onBack() // ホーム画面に戻る
        }}
        novelTitle={zineTitle || "あなたの小説"}
      />
    </div>
  )
}

export default ZineCreator
