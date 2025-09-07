"use client"

import { motion } from "framer-motion"
import { useState, useRef } from "react"
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
import { novelize, saveZine, review, generateCover } from "@/lib/api"
import { LoadingScreens } from "./LoadingScreens"
import { ZineToolbar } from "./ZineToolbar"
import { ZineCanvas } from "./ZineCanvas"
import { ZineMenuPanel } from "./ZineMenuPanel"
import { CoverGenerationModal } from "./CoverGenerationModal"
import { ZineCreatorProps, Element, Page, ChatMessage, TextSelection, ReviewSuggestion, CreatorMode, MenuSection } from "@/types/zine"

export function ZineCreator({ onBack }: ZineCreatorProps) {
  const [mode, setMode] = useState<"zine" | "novel">("zine")
  const [zineTitle, setZineTitle] = useState("")
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [activeMenuSection, setActiveMenuSection] = useState<string | null>(null)
  const [activeNovelSection, setActiveNovelSection] = useState<string | null>(null)
  const [showNovelizeButton, setShowNovelizeButton] = useState(false) // Track if novelize button should be shown
  const [showConfigPanel, setShowConfigPanel] = useState(false) // Declare the variable here
  const [showZineExamples, setShowZineExamples] = useState(false)
  const [isGeneratingNovel, setIsGeneratingNovel] = useState(false) // Loading state for novel generation
  const [isModifyingStyle, setIsModifyingStyle] = useState(false) // Loading state for style modifications
  const [isApplyingOnepoint, setIsApplyingOnepoint] = useState(false) // Loading state for onepoint advice
  const [isSaving, setIsSaving] = useState(false) // Loading state for save operation
  const [isGeneratingCover, setIsGeneratingCover] = useState(false) // Loading state for cover image generation
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null) // Generated cover image URL
  const [showCoverModal, setShowCoverModal] = useState(false) // Cover generation modal state

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
  const [currentNovelPage, setCurrentNovelPage] = useState(1)
  const [novelPages, setNovelPages] = useState<string[]>([])

  const [selectedText, setSelectedText] = useState<TextSelection | null>(null)
  const [reviewSuggestions, setReviewSuggestions] = useState<ReviewSuggestion[]>([])
  const [reviewChatMessages, setReviewChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "ai",
      content:
        "こんにちは！私はあなたの作品をレビューするAI作家です。文章の改善点や表現のアドバイスをお手伝いします。修正したい箇所を選択するか、直接ご相談ください。",
      timestamp: new Date(),
    },
  ])
  const [reviewChatInput, setReviewChatInput] = useState("")

  const [inlineSuggestions, setInlineSuggestions] = useState<{ [key: string]: ReviewSuggestion }>({})

  const currentPage = pages[currentPageIndex]

  const isCoverPage = false

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

  const currentMenuSections = mode === "zine" ? zineMenuSections : novelMenuSections

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

  const sendReviewMessage = () => {
    if (!reviewChatInput.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user", 
      content: reviewChatInput,
      timestamp: new Date(),
    }

    setReviewChatMessages((prev) => [...prev, userMessage])
    setReviewChatInput("")

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "素晴らしい作品ですね！より魅力的にするためのアドバイスをお伝えします。",
        timestamp: new Date(),
      }
      setReviewChatMessages((prev) => [...prev, aiMessage])
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
      alert(`文体の修正中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
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
      alert(`ワンポイント修正中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
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

  // テキスト分割機能（小説モード用）
  const splitNovelContent = (content: string): string[] => {
    if (!content.trim()) return []
    
    const CHARS_PER_PAGE = 800 // 1ページあたりの文字数
    const paragraphs = content.split('\n\n')
    const pages: string[] = []
    let currentPage = ""
    
    for (const paragraph of paragraphs) {
      const paragraphWithBreak = paragraph + '\n\n'
      
      if (currentPage.length + paragraphWithBreak.length <= CHARS_PER_PAGE) {
        currentPage += paragraphWithBreak
      } else {
        if (currentPage.trim()) {
          pages.push(currentPage.trim())
        }
        currentPage = paragraphWithBreak
      }
    }
    
    if (currentPage.trim()) {
      pages.push(currentPage.trim())
    }
    
    return pages.length > 0 ? pages : [content]
  }

  // 小説モード用のページナビゲーション
  const goToPreviousNovelPage = () => {
    if (currentNovelPage > 1) {
      setCurrentNovelPage(currentNovelPage - 1)
    }
  }

  const goToNextNovelPage = () => {
    if (currentNovelPage < Math.max(1, Math.ceil(novelPages.length / 2))) {
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
      content: "クリックして編集",
      fontSize: 16,
      color: "#000000",
      pageId: currentPage.id,
    }

    const updatedPages = pages.map((page) =>
      page.id === currentPage.id ? { ...page, elements: [...page.elements, newElement] } : page,
    )
    setPages(updatedPages)
    setSelectedElement(newElement.id)
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
    if (mode === "zine" && ["concept", "ai-writer", "worldview"].includes(sectionId)) {
      setShowConfigPanel(true)
    }
  }

  const renderConfigPanel = () => {
    if (!showConfigPanel || mode !== "zine") return null

    switch (activeMenuSection) {
      case "concept":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6" style={{ color: "#4a3c28" }}>コンセプト設定</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#4a3c28" }}>短編 / 長編</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={conceptConfig.length === "short" ? "default" : "outline"} 
                    className="text-white"
                    style={{
                      background: conceptConfig.length === "short" ? "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)" : "transparent",
                      borderColor: "rgba(139, 115, 85, 0.3)",
                      color: conceptConfig.length === "short" ? "#fffdf7" : "#8b7355"
                    }}
                    onClick={() => setConceptConfig({...conceptConfig, length: "short"})}
                  >
                    短編
                  </Button>
                  <Button 
                    variant={conceptConfig.length === "long" ? "default" : "outline"} 
                    className="text-white"
                    style={{
                      background: conceptConfig.length === "long" ? "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)" : "transparent",
                      borderColor: "rgba(139, 115, 85, 0.3)",
                      color: conceptConfig.length === "long" ? "#fffdf7" : "#8b7355"
                    }}
                    onClick={() => setConceptConfig({...conceptConfig, length: "long"})}
                  >
                    長編
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#4a3c28" }}>ジャンル</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={conceptConfig.genre === "sf" ? "default" : "outline"} 
                    className={conceptConfig.genre === "sf" ? "bg-purple-600 text-white" : "text-white border-white/20 hover:bg-white/10 bg-transparent"}
                    onClick={() => setConceptConfig({...conceptConfig, genre: "sf"})}
                  >
                    SF
                  </Button>
                  <Button 
                    variant={conceptConfig.genre === "romance" ? "default" : "outline"} 
                    className={conceptConfig.genre === "romance" ? "bg-purple-600 text-white" : "text-white border-white/20 hover:bg-white/10 bg-transparent"}
                    onClick={() => setConceptConfig({...conceptConfig, genre: "romance"})}
                  >
                    ラブコメ
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#4a3c28" }}>キーワード</label>
                <textarea
                  className="w-full h-24 border rounded-lg p-3"
                  style={{
                    background: "rgba(255, 253, 250, 0.8)",
                    borderColor: "rgba(139, 115, 85, 0.3)",
                    color: "#4a3c28"
                  }}
                  placeholder="作品のキーワードを入力してください..."
                  value={conceptConfig.keywords}
                  onChange={(e) => setConceptConfig({...conceptConfig, keywords: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
              <Button
                onClick={() => {
                  localStorage.setItem('zine-concept-config', JSON.stringify(conceptConfig))
                  alert('コンセプト設定が保存されました！')
                }}
                className="w-full text-white"
                style={{
                  background: "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)"
                }}
              >
                <Save className="w-4 h-4 mr-2" />
                設定を保存
              </Button>
            </div>
          </div>
        )

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
                  alert('AI作家設定が保存されました！')
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
                  alert('世界観設定が保存されました！')
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
      setSelectedText({
        start: range.startOffset,
        end: range.endOffset,
        text: selectedText,
      })
    }
  }

  const applySuggestion = (suggestionId: string) => {
    const suggestion = reviewSuggestions.find((s) => s.id === suggestionId)
    if (suggestion) {
      setNovelContent((prev) => prev.replace(suggestion.originalText, suggestion.suggestedText))
      setReviewSuggestions((prev) => prev.map((s) => (s.id === suggestionId ? { ...s, applied: true } : s)))
    }
  }

  const handleReviewChatSend = () => {
    if (!reviewChatInput.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: reviewChatInput,
      timestamp: new Date(),
    }

    setReviewChatMessages((prev) => [...prev, userMessage])

    // Simulate AI response with text modification
    setTimeout(() => {
      let aiResponse = ""
      let suggestion: ReviewSuggestion | null = null

      if (selectedText && reviewChatInput.includes("シリアス")) {
        const modifiedText = selectedText.text.replace("彼女は立ち止まった", "彼女は重い足取りで立ち止まった")
        suggestion = {
          id: Date.now().toString(),
          originalText: selectedText.text,
          suggestedText: modifiedText,
          reason: "よりシリアスな表現に変更",
          applied: false,
        }
        aiResponse = `「${selectedText.text}」をよりシリアスな表現に変更しました。`

        // Add inline suggestion
        setInlineSuggestions((prev) => ({
          ...prev,
          [selectedText.text]: suggestion,
        }))
      } else if (selectedText && reviewChatInput.includes("感情的")) {
        const modifiedText = selectedText.text.replace(
          "彼女の声は風に混じって消えていく",
          "彼女の声は震えながら風に混じって消えていく",
        )
        suggestion = {
          id: Date.now().toString(),
          originalText: selectedText.text,
          suggestedText: modifiedText,
          reason: "より感情的な表現に変更",
          applied: false,
        }
        aiResponse = `「${selectedText.text}」により感情を込めた表現に修正しました。`

        setInlineSuggestions((prev) => ({
          ...prev,
          [selectedText.text]: suggestion,
        }))
      } else {
        aiResponse = "どの部分を修正したいか、テキストを選択してから指示してください。"
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: aiResponse,
        timestamp: new Date(),
      }

      setReviewChatMessages((prev) => [...prev, aiMessage])
    }, 1000)

    setReviewChatInput("")
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
              placeholder="修正したい箇所や相談内容を入力..."
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
    genre: "sf",
    keywords: ""
  })
  const [aiWriterConfig, setAiWriterConfig] = useState({
    values: "",
    rules: ""
  })
  const [worldviewConfig, setWorldviewConfig] = useState({
    image: "",
    characterName: "",
    personality: "",
    scenario: ""
  })

  const hasZineContent = pages.some((page) => page.elements.length > 0) || zineTitle.trim() !== ""

  // 小説化機能
  const handleNovelize = async () => {
    const concept = `${conceptConfig.length === "short" ? "短編" : "長編"} ${conceptConfig.genre === "sf" ? "SF" : "ラブコメ"} ${conceptConfig.keywords}`
    const world = `キャラクター名: ${worldviewConfig.characterName}, 性格: ${worldviewConfig.personality}, シナリオ: ${worldviewConfig.scenario}`
    const prompt = "上記の設定に基づいて魅力的な小説を書いてください。"
    
    setIsGeneratingNovel(true) // Start loading
    try {
      const result = await novelize({ concept, world, prompt })
      setNovelContent(result.text)
      // テキストを複数ページに分割
      const splitPages = splitNovelContent(result.text)
      setNovelPages(splitPages)
      setCurrentNovelPage(1) // 最初のページに戻る
      setMode("novel")
    } catch (error) {
      console.error("小説化エラー:", error)
      alert("小説の生成に失敗しました。設定を確認してください。")
    } finally {
      setIsGeneratingNovel(false) // End loading
    }
  }

  // 保存機能
  const handleSaveZine = async () => {
    if (!hasZineContent && !zineTitle.trim()) {
      alert("保存するコンテンツがありません。タイトルを入力するか、ページに要素を追加してください。")
      return
    }

    setIsSaving(true)
    try {
      const zineData = {
        title: zineTitle || "無題のZINE",
        status: "draft",
        description: `${pages.length}ページのZINE`,
        pages: pages,
        conceptConfig: conceptConfig,
        worldviewConfig: worldviewConfig,
        novelContent: novelContent,
        novelPages: novelPages,
        createdAt: new Date().toISOString()
      }

      const result = await saveZine(zineData)
      alert(`ZINEが保存されました！ID: ${result.id}`)
    } catch (error) {
      console.error("保存エラー:", error)
      alert("ZINEの保存に失敗しました。もう一度お試しください。")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCoverGeneration = async () => {
    if (!novelContent.trim()) {
      alert("表紙を生成するには、まず小説を生成してください。")
      return
    }

    setIsGeneratingCover(true)
    try {
      const result = await generateCover({
        synopsis: novelContent
      })
      
      if (result.url) {
        setCoverImageUrl(result.url)
      } else {
        alert(result.message || "表紙画像の生成に失敗しました。")
      }
    } catch (error) {
      console.error("表紙生成エラー:", error)
      alert("表紙画像の生成に失敗しました。もう一度お試しください。")
    } finally {
      setIsGeneratingCover(false)
    }
  }

  const handleOpenCoverModal = () => {
    if (!novelContent.trim()) {
      alert("表紙を生成するには、まず小説を生成してください。")
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
                        // Apply enhanced photo essay template with more elements
                        const elements: Element[] = [
                          // Main photo on left page
                          {
                            id: `photo-main-${Date.now()}`,
                            type: "image",
                            x: 20,
                            y: 50,
                            width: 340,
                            height: 250,
                            src: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&h=600&fit=crop&crop=entropy&auto=format&fm=jpg&q=60",
                            pageId: currentPage.id
                          },
                          // Title text overlay
                          {
                            id: `title-${Date.now()}`,
                            type: "text",
                            x: 40,
                            y: 320,
                            width: 300,
                            height: 60,
                            content: "街角の記憶",
                            fontSize: 28,
                            color: "#2d1810",
                            pageId: currentPage.id
                          },
                          // Decorative shape behind title
                          {
                            id: `title-bg-${Date.now()}`,
                            type: "shape",
                            x: 35,
                            y: 315,
                            width: 310,
                            height: 70,
                            color: "rgba(241, 229, 199, 0.8)",
                            pageId: currentPage.id
                          },
                          // Main story text on right page
                          {
                            id: `story-main-${Date.now()}`,
                            type: "text",
                            x: 420,
                            y: 80,
                            width: 320,
                            height: 200,
                            content: "その角で、私は初めて彼女と出会った。\n\n夕暮れのオレンジ色の光が建物の窓を染め、遠くから聞こえる車の音が都市の鼓動のように響いている。\n\n角の向こうから現れた猫が、彼女の足元で鳴いた。まるで何かを伝えようとするように。",
                            fontSize: 14,
                            color: "#4a3c28",
                            pageId: currentPage.id
                          },
                          // Small accent photo
                          {
                            id: `photo-accent-${Date.now()}`,
                            type: "image",
                            x: 450,
                            y: 300,
                            width: 120,
                            height: 80,
                            src: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop&crop=entropy&auto=format&fm=jpg&q=60",
                            pageId: currentPage.id
                          },
                          // Quote text
                          {
                            id: `quote-${Date.now()}`,
                            type: "text",
                            x: 580,
                            y: 320,
                            width: 150,
                            height: 60,
                            content: "\"時を刻んでいたのは\n装飾された記憶\"",
                            fontSize: 12,
                            color: "#8b7355",
                            pageId: currentPage.id
                          },
                          // Decorative line
                          {
                            id: `line-${Date.now()}`,
                            type: "shape",
                            x: 420,
                            y: 290,
                            width: 320,
                            height: 2,
                            color: "#d4b893",
                            pageId: currentPage.id
                          }
                        ]
                        setPages(prev => {
                          const updated = [...prev]
                          // Add all elements to the current page
                          updated[currentPageIndex].elements.push(...elements)
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
          mode={mode}
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
          onSendReviewMessage={sendReviewMessage}
          onStyleModify={handleStyleModify}
          isModifyingStyle={isModifyingStyle}
          onOnepointModify={handleOnepointModify}
          isApplyingOnepoint={isApplyingOnepoint}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col" onKeyDown={handleKeyDown} tabIndex={0}>
          {showConfigPanel && mode === "zine" ? (
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
                onBack={mode === "novel" ? () => setMode("zine") : onBack}
                zineTitle={zineTitle}
                setZineTitle={setZineTitle}
                mode={mode}
                setMode={setMode}
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
              <div className="flex-1 overflow-hidden flex items-center justify-center pt-16" style={{
                background: "linear-gradient(135deg, #f3e9d4 0%, #f1e5c7 50%, #ede0ba 100%)"
              }}>
                {mode === "zine" ? (
                  <ZineCanvas
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
                  />
                ) : (
                  <div className="w-full max-w-7xl mx-auto perspective-1000">
                    <motion.div
                      className="relative"
                      initial={{ opacity: 0, rotateY: -15 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                    >
                      {/* Book spine and binding effect */}
                      <div className="absolute -left-8 top-8 bottom-8 w-8 rounded-l-lg" style={{
                        background: "linear-gradient(180deg, #8b4513 0%, #a0522d 50%, #654321 100%)",
                        boxShadow: "inset -2px 0 4px rgba(0,0,0,0.3), -4px 0 8px rgba(0,0,0,0.2)"
                      }}>
                        <div className="h-full w-full flex flex-col justify-center items-center text-xs text-amber-100 transform -rotate-90 whitespace-nowrap font-serif">
                          <span className="tracking-wider">NOVEL</span>
                        </div>
                      </div>
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
                              ringColor: bookTheme === "light" ? "#daa520" : "transparent"
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBookTheme("sepia")}
                            className={`w-6 h-6 rounded-full hover:scale-110 transition-transform ${bookTheme === "sepia" ? "ring-2" : ""}`}
                            style={{
                              background: "#f4ead0",
                              ringColor: bookTheme === "sepia" ? "#daa520" : "transparent"
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBookTheme("dark")}
                            className={`w-6 h-6 rounded-full hover:scale-110 transition-transform ${bookTheme === "dark" ? "ring-2" : ""}`}
                            style={{
                              background: "#2a2520",
                              ringColor: bookTheme === "dark" ? "#daa520" : "transparent"
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

                          {/* Page content container */}
                          <div className="flex h-full relative z-10">
                            {/* Left page with page number */}
                            <div className="w-1/2 pr-4 relative">
                              <div className="absolute top-6 left-6 text-xs" style={{ color: "#a0896c", fontFamily: "serif" }}>Chapter 1</div>
                              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-xs" style={{ color: "#a0896c", fontFamily: "serif" }}>{currentNovelPage * 2}</div>
                              <div className="px-12 py-20 h-full">
                                <div
                                  className="text-base leading-8 whitespace-pre-wrap cursor-text"
                                  style={{
                                    color: currentTheme.text,
                                    fontFamily: 'Georgia, "Times New Roman", serif',
                                    lineHeight: "2.2",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                  }}
                                  onMouseUp={handleTextSelection}
                                >
                                  {novelPages.length > 0 
                                    ? renderTextWithSuggestions(novelPages[(currentNovelPage - 1) * 2] || "")
                                    : renderTextWithSuggestions(`　夕暮れの街角で、彼女は立ち止まった。オレンジ色の光が建物の窓を染め、遠くから聞こえる車の音が都市の鼓動のように響いている。

　「もう戻れないのね」

　彼女の声は風に混じって消えていく。手に握りしめた古い写真は、もう色褪せて誰の顔かもわからない。それでも、その温もりだけは確かに残っていた。`)}
                                </div>
                              </div>
                            </div>

                            {/* Right page with page number */}
                            <div className="w-1/2 pl-4 relative">
                              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-xs" style={{ color: "#a0896c", fontFamily: "serif" }}>{currentNovelPage * 2 + 1}</div>
                              <div className="px-12 py-20 h-full">
                                <div
                                  className="text-base leading-8 whitespace-pre-wrap"
                                  style={{
                                    color: currentTheme.text,
                                    fontFamily: 'Georgia, "Times New Roman", serif',
                                    lineHeight: "2.2",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                  }}
                                >
                                  {novelPages.length > 0 
                                    ? novelPages[(currentNovelPage - 1) * 2 + 1] || ""
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

              {/* Moved Page Navigation for ZINE mode below editor */}
              {mode === "zine" && (
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
      
      {/* Cover Generation Modal */}
      <CoverGenerationModal
        isOpen={showCoverModal}
        onClose={() => setShowCoverModal(false)}
        isGenerating={isGeneratingCover}
        coverImageUrl={coverImageUrl}
        onGenerate={handleCoverGeneration}
        novelTitle={zineTitle || "あなたの小説"}
      />
    </div>
  )
}

export default ZineCreator
