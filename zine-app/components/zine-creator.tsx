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
import { novelize, review, saveZine, updateZine } from "@/lib/api"

interface ZineCreatorProps {
  onBack: () => void
}

interface Element {
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

interface Page {
  id: string
  elements: Element[]
  title: string
}

interface ChatMessage {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
}

type CreatorMode = "zine" | "novel"
type MenuSection = "concept" | "ai-writer" | "worldview" | "writer-review" | "style" | "onepoint"

type TextSelection = {
  start: number
  end: number
  text: string
}

type ReviewSuggestion = {
  id: string
  originalText: string
  suggestedText: string
  reason: string
  applied: boolean
}

export function ZineCreator({ onBack }: ZineCreatorProps) {
  const [mode, setMode] = useState<"zine" | "novel">("zine")
  const [isPreview, setIsPreview] = useState(false)
  const [zineTitle, setZineTitle] = useState("")
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [activeMenuSection, setActiveMenuSection] = useState<string | null>(null)
  const [activeNovelSection, setActiveNovelSection] = useState<string | null>(null)
  const [showNovelizeButton, setShowNovelizeButton] = useState(false) // Track if novelize button should be shown
  const canvasRef = useRef<HTMLDivElement>(null)
  const [showConfigPanel, setShowConfigPanel] = useState(false) // Declare the variable here
  const [showZineExamples, setShowZineExamples] = useState(false)

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
  const [editingElement, setEditingElement] = useState<string | null>(null)
  const [tempTextContent, setTempTextContent] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const [isGeneratingNovel, setIsGeneratingNovel] = useState(false)

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

  // 保存機能の状態変数
  const [savedZineId, setSavedZineId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // 修正機能の状態変数
  const [pendingModification, setPendingModification] = useState<{
    type: 'style' | 'onepoint'
    original: string
    modified: string
    instruction: string
  } | null>(null)
  const [isApplyingModification, setIsApplyingModification] = useState(false)

  const currentPage = pages[currentPageIndex]

  // Handle mouse move for dragging (optimized for performance)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedElement && canvasRef.current && !editingElement) {
      e.preventDefault()
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const newX = e.clientX - canvasRect.left - dragOffset.x
      const newY = e.clientY - canvasRect.top - dragOffset.y
      
      // Constrain to canvas bounds
      const element = currentPage.elements.find(el => el.id === draggedElement)
      if (element) {
        const constrainedX = Math.max(0, Math.min(newX, canvasRect.width - element.width))
        const constrainedY = Math.max(0, Math.min(newY, canvasRect.height - element.height))
        
        // Use requestAnimationFrame for smoother performance
        requestAnimationFrame(() => {
          updateElement(draggedElement, { x: constrainedX, y: constrainedY })
        })
      }
    }
  }

  // Start text editing
  const startTextEditing = (elementId: string, currentContent: string) => {
    setEditingElement(elementId)
    setTempTextContent(currentContent || "")
  }

  // Finish text editing
  const finishTextEditing = () => {
    if (editingElement && tempTextContent.trim()) {
      updateElement(editingElement, { content: tempTextContent })
    }
    setEditingElement(null)
    setTempTextContent("")
  }

  // Cancel text editing
  const cancelTextEditing = () => {
    setEditingElement(null)
    setTempTextContent("")
  }

  // Drag & drop handlers for image upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setIsDragOver(true)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Only hide drag overlay if we're leaving the canvas completely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    imageFiles.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          // Calculate drop position relative to canvas
          const canvasRect = canvasRef.current?.getBoundingClientRect()
          if (canvasRect) {
            const x = Math.max(0, Math.min(e.clientX - canvasRect.left - 50, canvasRect.width - 100))
            const y = Math.max(0, Math.min(e.clientY - canvasRect.top - 50 + (index * 20), canvasRect.height - 100))
            
            addElement("image", {
              x,
              y,
              width: 100,
              height: 100,
              content: event.target.result as string
            })
          }
        }
      }
      reader.readAsDataURL(file)
    })
  }
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
    }
  }

  // テキスト分割機能（小説モード用）
  const splitNovelContent = (content: string): string[] => {
    if (!content.trim()) return []
    
    const CHARS_PER_PAGE = 600 // 1ページあたりの文字数（見やすさのため少し減らす）
    const paragraphs = content.split('\n\n')
    const pages: string[] = []
    let currentPage = ""
    
    for (const paragraph of paragraphs) {
      const paragraphWithBreak = paragraph + '\n\n'
      
      // 段落が1ページ分を超える場合は、さらに分割
      if (paragraphWithBreak.length > CHARS_PER_PAGE) {
        if (currentPage.trim()) {
          pages.push(currentPage.trim())
          currentPage = ""
        }
        
        // 長い段落を文単位で分割
        const sentences = paragraph.split(/([。！？])/g)
        let tempContent = ""
        
        for (let i = 0; i < sentences.length; i += 2) {
          const sentence = sentences[i] + (sentences[i + 1] || "")
          if ((tempContent + sentence).length <= CHARS_PER_PAGE) {
            tempContent += sentence
          } else {
            if (tempContent.trim()) {
              pages.push(tempContent.trim())
            }
            tempContent = sentence
          }
        }
        
        if (tempContent.trim()) {
          currentPage = tempContent + '\n\n'
        }
      } else {
        if (currentPage.length + paragraphWithBreak.length <= CHARS_PER_PAGE) {
          currentPage += paragraphWithBreak
        } else {
          if (currentPage.trim()) {
            pages.push(currentPage.trim())
          }
          currentPage = paragraphWithBreak
        }
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

  const addTextElement = () => {
    const newElement: Element = {
      id: Date.now().toString(),
      type: "text",
      x: 50,
      y: 100,
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

  const addImageElement = () => {
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
            x: 100,
            y: 150,
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

  // ZINE保存機能
  const handleSaveZine = async () => {
    if (!zineTitle.trim()) {
      alert("タイトルを入力してください");
      return;
    }

    setIsSaving(true);
    try {
      const zineData = {
        id: savedZineId,
        title: zineTitle,
        status: mode === "novel" ? "novel" : "draft",
        conceptConfig,
        aiWriterConfig,
        worldConfig: worldviewConfig,
        pages,
        novelContent,
        novelPages,
        createdAt: savedZineId ? undefined : new Date().toISOString(), // Only set if new
        description: `${zineTitle} - ${mode === "novel" ? "小説" : "ZINE"}`
      };

      if (savedZineId) {
        // Update existing ZINE
        await updateZine(savedZineId, zineData);
        alert("ZINEが更新されました！");
      } else {
        // Save new ZINE
        const response = await saveZine(zineData);
        setSavedZineId(response.id);
        alert("ZINEが保存されました！");
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
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

  // 文体修正プレビューを生成する関数
  const previewStyleToNovel = async (text: string, style: string) => {
    try {
      const result = await review({
        original: text,
        instruction: `この小説全体の文体を「${style}」変更してください。内容は維持し、文体のみを変更してください。`
      })
      setPendingModification({
        type: 'style',
        original: text,
        modified: result.text,
        instruction: `文体を「${style}」に変更`
      })
    } catch (error) {
      console.error("文体プレビューエラー:", error)
      alert("文体修正のプレビュー生成に失敗しました。")
    }
  }

  // ワンポイント修正プレビューを生成する関数
  const previewOnepointToNovel = async (text: string, adjustment: string) => {
    try {
      const result = await review({
        original: text,
        instruction: `この小説全体を「${adjustment}」という雰囲気に調整してください。内容は維持し、トーンや雰囲気のみを調整してください。`
      })
      setPendingModification({
        type: 'onepoint',
        original: text,
        modified: result.text,
        instruction: `雰囲気を「${adjustment}」に調整`
      })
    } catch (error) {
      console.error("ワンポイントプレビューエラー:", error)
      alert("ワンポイント修正のプレビュー生成に失敗しました。")
    }
  }

  // 修正を適用する関数
  const applyModification = () => {
    if (!pendingModification) return
    
    setIsApplyingModification(true)
    setNovelContent(pendingModification.modified)
    
    // Split the modified text into pages
    const newPages = splitNovelContent(pendingModification.modified)
    setNovelPages(newPages)
    
    setPendingModification(null)
    setIsApplyingModification(false)
  }

  // 修正をキャンセルする関数
  const cancelModification = () => {
    setPendingModification(null)
  }

  const renderStylePanel = () => (
    <div className="space-y-4">
      <h3 className="font-semibold mb-3" style={{ color: "#4a3c28" }}>文体修正</h3>
      <p className="text-xs mb-3" style={{ color: "#a0896c" }}>小説全体の文体を変更します</p>

      <div className="space-y-2">
        <h4 className="text-sm" style={{ color: "#8b7355" }}>文体スタイルを選択</h4>
        <div className="grid grid-cols-1 gap-2">
          {styleOptions.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={async () => {
                const newMessage = { role: "user" as const, content: `文体を「${option}」に変更してください` }
                setStyleMessages([...styleMessages, newMessage])
                
                // Generate style preview
                try {
                  await previewStyleToNovel(novelContent, option)
                  
                  const aiResponse = {
                    role: "assistant" as const,
                    content: `文体を「${option}」に変更するプレビューを生成しました。下記の修正案をご確認ください。`,
                  }
                  setStyleMessages((prev) => [...prev, aiResponse])
                } catch (error) {
                  const errorResponse = {
                    role: "assistant" as const,
                    content: `文体の変更に失敗しました。もう一度お試しください。`,
                  }
                  setStyleMessages((prev) => [...prev, errorResponse])
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
            placeholder="文体について相談..."
            className="flex-1 px-2 py-1 text-xs border rounded"
            style={{
              background: "rgba(255, 253, 250, 0.8)",
              borderColor: "rgba(139, 115, 85, 0.3)",
              color: "#4a3c28"
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter" && styleInput.trim()) {
                const newMessage = { role: "user" as const, content: styleInput }
                setStyleMessages([...styleMessages, newMessage])
                setStyleInput("")
                // AI response simulation
                setTimeout(() => {
                  const aiResponse = {
                    role: "assistant" as const,
                    content: `承知いたしました。「${styleInput}」について対応いたします。`,
                  }
                  setStyleMessages((prev) => [...prev, aiResponse])
                }, 1000)
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => {
              if (styleInput.trim()) {
                const newMessage = { role: "user" as const, content: styleInput }
                setStyleMessages([...styleMessages, newMessage])
                setStyleInput("")
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
      <h3 className="font-semibold mb-3" style={{ color: "#4a3c28" }}>ワンポイント修正</h3>
      <p className="text-xs mb-3" style={{ color: "#a0896c" }}>小説全体の雰囲気を調整します</p>

      <div className="space-y-2">
        <h4 className="text-sm" style={{ color: "#8b7355" }}>雰囲気の調整</h4>
        <div className="grid grid-cols-1 gap-2">
          {onepointOptions.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={async () => {
                const newMessage = { role: "user" as const, content: `小説を「${option}」調整してください` }
                setOnepointMessages([...onepointMessages, newMessage])
                
                // Generate onepoint preview
                try {
                  await previewOnepointToNovel(novelContent, option)
                  
                  const aiResponse = {
                    role: "assistant" as const,
                    content: `雰囲気を「${option}」に調整するプレビューを生成しました。下記の修正案をご確認ください。`,
                  }
                  setOnepointMessages((prev) => [...prev, aiResponse])
                } catch (error) {
                  const errorResponse = {
                    role: "assistant" as const,
                    content: `雰囲気の調整に失敗しました。もう一度お試しください。`,
                  }
                  setOnepointMessages((prev) => [...prev, errorResponse])
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
            placeholder="ワンポイント修正を相談..."
            className="flex-1 px-2 py-1 text-xs border rounded"
            style={{
              background: "rgba(255, 253, 250, 0.8)",
              borderColor: "rgba(139, 115, 85, 0.3)",
              color: "#4a3c28"
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter" && onepointInput.trim()) {
                const newMessage = { role: "user" as const, content: onepointInput }
                setOnepointMessages([...onepointMessages, newMessage])
                setOnepointInput("")
                // AI response simulation
                setTimeout(() => {
                  const aiResponse = {
                    role: "assistant" as const,
                    content: `承知いたしました。「${onepointInput}」について対応いたします。`,
                  }
                  setOnepointMessages((prev) => [...prev, aiResponse])
                }, 1000)
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => {
              if (onepointInput.trim()) {
                const newMessage = { role: "user" as const, content: onepointInput }
                setOnepointMessages([...onepointMessages, newMessage])
                setOnepointInput("")
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
    setIsGeneratingNovel(true) // ローディング開始
    
    try {
      const concept = `${conceptConfig.length === "short" ? "短編" : "長編"} ${conceptConfig.genre === "sf" ? "SF" : "ラブコメ"} ${conceptConfig.keywords}`
      const world = `キャラクター名: ${worldviewConfig.characterName}, 性格: ${worldviewConfig.personality}, シナリオ: ${worldviewConfig.scenario}`
      
      // ZINEの内容も含める
      const zineContent = pages.map(page => 
        page.elements.map(el => el.content).join('\n')
      ).join('\n\n')
      
      const prompt = `上記の設定とZINEの内容「${zineContent}」に基づいて、完全な${conceptConfig.length === "short" ? "短編小説（2000-4000文字）" : "長編小説（5000-8000文字）"}を書いてください。章立てして、起承転結のしっかりとした物語を作成してください。`
      
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
      setIsGeneratingNovel(false) // ローディング終了
    }
  }



  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(135deg, #f7f1e8 0%, #f5ede1 25%, #f3e9d4 50%, #f1e5c7 75%, #ede0ba 100%)",
      color: "#4a3c28"
    }}>
      {/* 小説生成ローディング画面 */}
      {isGeneratingNovel && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(74, 60, 40, 0.8)" }}>
          <motion.div
            className="rounded-xl p-8 max-w-md text-center"
            style={{
              background: "linear-gradient(135deg, rgba(247, 241, 232, 0.95) 0%, rgba(241, 229, 199, 0.95) 100%)",
              border: "1px solid rgba(139, 115, 85, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)"
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="w-16 h-16 mx-auto mb-6 rounded-full border-4"
              style={{
                borderColor: "#8b6914",
                borderTopColor: "transparent"
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <h3 className="text-xl font-bold mb-2" style={{ color: "#4a3c28" }}>
              小説を生成中...
            </h3>
            <p className="text-sm mb-4" style={{ color: "#8b7355" }}>
              AI作家があなたのZINEを基に<br />
              魅力的な物語を紡いでいます
            </p>
            <motion.div
              className="flex justify-center space-x-1"
              initial="hidden"
              animate="visible"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "#8b6914" }}
                  variants={{
                    hidden: { opacity: 0.3 },
                    visible: { opacity: 1 }
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: i * 0.2
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </div>
      )}
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
                        // Apply photo essay template
                        const newElement: Element = {
                          id: `element-${Date.now()}`,
                          type: "text",
                          x: 50,
                          y: 50,
                          width: 300,
                          height: 100,
                          content: "街角の記憶\n\nその角で、私は初めて彼女と出会った...",
                          fontSize: 16,
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
        {!isPreview && (
          <motion.div
            className="w-80 backdrop-blur-sm border-r p-6"
            style={{
              background: "rgba(247, 241, 232, 0.9)",
              borderColor: "rgba(139, 115, 85, 0.3)"
            }}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            {mode === "zine" ? (
              <div className="space-y-4">
                <div className="mb-6">
                  <h2
                    className="text-2xl font-bold mb-2 flex items-center gap-2 cursor-pointer transition-colors"
                    style={{ color: "#4a3c28" }}
                    onClick={() => {
                      setShowConfigPanel(false)
                      setActiveMenuSection(null)
                    }}
                  >
                    <BookOpen className="w-6 h-6" />
                    ZINE Mode
                  </h2>
                  <p className="text-sm" style={{ color: "#8b7355" }}>雑誌のようなビジュアル作品を作成</p>
                </div>

                {!hasZineContent && (
                  <div className="mb-6 p-4 rounded-lg border" style={{
                    background: "rgba(241, 229, 199, 0.6)",
                    borderColor: "rgba(139, 115, 85, 0.3)"
                  }}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold" style={{ color: "#4a3c28" }}>ZINEの例</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowZineExamples(true)}
                        className="hover:bg-amber-100"
                        style={{ color: "#8b7355" }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        詳しく見る
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded border text-xs text-center" style={{
                        background: "rgba(255, 253, 250, 0.8)",
                        borderColor: "rgba(139, 115, 85, 0.3)",
                        color: "#4a3c28"
                      }}>
                        <div className="bg-blue-500/30 h-8 mb-1 rounded"></div>
                        フォトエッセイ
                      </div>
                      <div className="p-2 rounded border text-xs text-center" style={{
                        background: "rgba(255, 253, 250, 0.8)",
                        borderColor: "rgba(139, 115, 85, 0.3)",
                        color: "#4a3c28"
                      }}>
                        <div className="bg-green-500/30 h-8 mb-1 rounded"></div>
                        アートブック
                      </div>
                      <div className="p-2 rounded border text-xs text-center" style={{
                        background: "rgba(255, 253, 250, 0.8)",
                        borderColor: "rgba(139, 115, 85, 0.3)",
                        color: "#4a3c28"
                      }}>
                        <div className="bg-pink-500/30 h-8 mb-1 rounded"></div>
                        詩集
                      </div>
                      <div className="p-2 rounded border text-xs text-center" style={{
                        background: "rgba(255, 253, 250, 0.8)",
                        borderColor: "rgba(139, 115, 85, 0.3)",
                        color: "#4a3c28"
                      }}>
                        <div className="bg-purple-500/30 h-8 mb-1 rounded"></div>
                        イラスト集
                      </div>
                    </div>
                  </div>
                )}

                {/* Menu sections */}
                <div className="space-y-2">
                  {zineMenuSections.map((section) => (
                    <Button
                      key={section.id}
                      variant={activeMenuSection === section.id ? "default" : "ghost"}
                      className="w-full justify-start"
                      style={{
                        background: activeMenuSection === section.id ? "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)" : "transparent",
                        color: activeMenuSection === section.id ? "#fffdf7" : "#8b7355"
                      }}
                      onClick={() => handleMenuSectionClick(section.id)}
                    >
                      <section.icon className="w-4 h-4 mr-2" />
                      {section.label}
                    </Button>
                  ))}
                </div>

                {!showConfigPanel && (
                  <>
                    <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
                      <h3 className="text-sm font-semibold mb-3" style={{ color: "#4a3c28" }}>ツール</h3>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          style={{
                            color: "#8b7355",
                            borderColor: "rgba(139, 115, 85, 0.3)",
                            backgroundColor: "transparent"
                          }}
                          onClick={addTextElement}
                        >
                          <Type className="w-4 h-4 mr-2" />
                          テキスト追加
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          style={{
                            color: "#8b7355",
                            borderColor: "rgba(139, 115, 85, 0.3)",
                            backgroundColor: "transparent"
                          }}
                          onClick={addImageElement}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          画像追加
                        </Button>
                      </div>
                    </div>

                    {selectedElement && (() => {
                      const element = currentPage.elements.find(el => el.id === selectedElement)
                      return element && (
                        <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
                          <h3 className="text-sm font-semibold mb-3" style={{ color: "#4a3c28" }}>選択中の要素</h3>
                          <div className="space-y-4">
                            
                            {/* Size Controls */}
                            <div>
                              <label className="block text-xs font-medium mb-2" style={{ color: "#4a3c28" }}>サイズ</label>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: "#8b7355" }}>幅</label>
                                  <input
                                    type="number"
                                    min="20"
                                    max="500"
                                    value={element.width}
                                    onChange={(e) => updateElement(element.id, { width: parseInt(e.target.value) || element.width })}
                                    className="w-full text-xs p-2 border rounded"
                                    style={{
                                      background: "rgba(255, 253, 250, 0.8)",
                                      borderColor: "rgba(139, 115, 85, 0.3)",
                                      color: "#4a3c28"
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: "#8b7355" }}>高さ</label>
                                  <input
                                    type="number"
                                    min="20"
                                    max="500"
                                    value={element.height}
                                    onChange={(e) => updateElement(element.id, { height: parseInt(e.target.value) || element.height })}
                                    className="w-full text-xs p-2 border rounded"
                                    style={{
                                      background: "rgba(255, 253, 250, 0.8)",
                                      borderColor: "rgba(139, 115, 85, 0.3)",
                                      color: "#4a3c28"
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Text-specific Controls */}
                            {element.type === "text" && (
                              <>
                                <div>
                                  <label className="block text-xs font-medium mb-2" style={{ color: "#4a3c28" }}>文字サイズ</label>
                                  <input
                                    type="range"
                                    min="8"
                                    max="48"
                                    value={element.fontSize || 16}
                                    onChange={(e) => updateElement(element.id, { fontSize: parseInt(e.target.value) })}
                                    className="w-full"
                                  />
                                  <div className="text-xs text-center mt-1" style={{ color: "#8b7355" }}>
                                    {element.fontSize || 16}px
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium mb-2" style={{ color: "#4a3c28" }}>文字色</label>
                                  <input
                                    type="color"
                                    value={element.color || "#000000"}
                                    onChange={(e) => updateElement(element.id, { color: e.target.value })}
                                    className="w-full h-8 border rounded"
                                    style={{
                                      borderColor: "rgba(139, 115, 85, 0.3)",
                                    }}
                                  />
                                </div>
                              </>
                            )}

                            {/* Position Controls */}
                            <div>
                              <label className="block text-xs font-medium mb-2" style={{ color: "#4a3c28" }}>位置</label>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: "#8b7355" }}>X</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={Math.round(element.x)}
                                    onChange={(e) => updateElement(element.id, { x: parseInt(e.target.value) || element.x })}
                                    className="w-full text-xs p-2 border rounded"
                                    style={{
                                      background: "rgba(255, 253, 250, 0.8)",
                                      borderColor: "rgba(139, 115, 85, 0.3)",
                                      color: "#4a3c28"
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: "#8b7355" }}>Y</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={Math.round(element.y)}
                                    onChange={(e) => updateElement(element.id, { y: parseInt(e.target.value) || element.y })}
                                    className="w-full text-xs p-2 border rounded"
                                    style={{
                                      background: "rgba(255, 253, 250, 0.8)",
                                      borderColor: "rgba(139, 115, 85, 0.3)",
                                      color: "#4a3c28"
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={() => deleteElement(selectedElement)}
                            >
                              <X className="w-4 h-4 mr-2" />
                              削除
                            </Button>
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )}

                <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(139, 115, 85, 0.3)" }}>
                  <Button
                    onClick={handleNovelize}
                    className="w-full text-white"
                    style={{
                      background: "linear-gradient(135deg, #8b6914 0%, #a0751f 50%, #b8860b 100%)"
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    小説化する
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: "#4a3c28" }}>
                    <Sparkles className="w-6 h-6" />
                    小説モード
                  </h2>
                  <p className="text-sm" style={{ color: "#8b7355" }}>ZINEを小説として編集・執筆</p>
                </div>

                {/* Novel menu sections */}
                <div className="space-y-2">
                  {novelMenuSections.map((section) => (
                    <Button
                      key={section.id}
                      variant={activeNovelSection === section.id ? "default" : "ghost"}
                      className="w-full justify-start"
                      style={{
                        background: activeNovelSection === section.id ? "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)" : "transparent",
                        color: activeNovelSection === section.id ? "#fffdf7" : "#8b7355"
                      }}
                      onClick={() => setActiveNovelSection(activeNovelSection === section.id ? null : section.id)}
                    >
                      <section.icon className="w-4 h-4 mr-2" />
                      {section.label}
                    </Button>
                  ))}
                </div>

                {/* Novel panels */}
                {activeNovelSection === "writer-review" && renderWriterReviewPanel()}
                {activeNovelSection === "style" && renderStylePanel()}
                {activeNovelSection === "onepoint" && renderOnepointPanel()}
              </div>
            )}
          </motion.div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
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
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "rgba(139, 115, 85, 0.2)" }}>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={mode === "novel" ? () => setMode("zine") : onBack} 
                    className="hover:bg-amber-100" 
                    style={{ color: "#8b7355" }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    戻る
                  </Button>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold" style={{ color: "#4a3c28" }}>{mode === "zine" ? "ZINE作成" : "小説編集"}</h1>
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: "#8b7355" }}>タイトル:</span>
                      <input
                        type="text"
                        value={zineTitle}
                        onChange={(e) => setZineTitle(e.target.value)}
                        placeholder="作品のタイトルを入力..."
                        className="px-2 py-1 text-sm border rounded"
                        style={{
                          background: "rgba(255, 253, 250, 0.8)",
                          borderColor: "rgba(139, 115, 85, 0.3)",
                          color: "#4a3c28",
                          minWidth: "200px"
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Page Navigation */}
                  {mode === "zine" && (
                    <div className="flex items-center gap-2 ml-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPageIndex === 0}
                        className="hover:bg-amber-100"
                        style={{ color: currentPageIndex === 0 ? "#ccc" : "#8b7355" }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      
                      <span className="text-sm px-3" style={{ color: "#8b7355" }}>
                        ページ {currentPageIndex + 1} / {pages.length}
                      </span>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPageIndex === pages.length - 1}
                        className="hover:bg-amber-100"
                        style={{ color: currentPageIndex === pages.length - 1 ? "#ccc" : "#8b7355" }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addPage}
                        className="hover:bg-amber-100 ml-2"
                        style={{ color: "#8b7355" }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Novel Page Navigation */}
                  {mode === "novel" && novelPages.length > 0 && (
                    <div className="flex items-center gap-2 ml-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToPreviousNovelPage}
                        disabled={currentNovelPage === 1}
                        className="hover:bg-amber-100"
                        style={{ color: currentNovelPage === 1 ? "#ccc" : "#8b7355" }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      
                      <span className="text-sm px-3" style={{ color: "#8b7355" }}>
                        見開き {currentNovelPage} / {Math.ceil(novelPages.length / 2)}
                      </span>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToNextNovelPage}
                        disabled={currentNovelPage >= Math.ceil(novelPages.length / 2)}
                        className="hover:bg-amber-100"
                        style={{ color: currentNovelPage >= Math.ceil(novelPages.length / 2) ? "#ccc" : "#8b7355" }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreview(!isPreview)}
                    className="hover:bg-amber-100"
                    style={{
                      color: "#8b7355",
                      borderColor: "rgba(139, 115, 85, 0.3)"
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {isPreview ? "編集" : "プレビュー"}
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-white" 
                    onClick={handleSaveZine}
                    disabled={isSaving}
                    style={{
                      background: isSaving ? "rgba(139, 105, 20, 0.5)" : "linear-gradient(135deg, #8b6914 0%, #a0751f 100%)"
                    }}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "保存中..." : "保存"}
                  </Button>
                </div>
              </div>

              {/* Main editing area */}
              <div className="flex-1 overflow-hidden flex items-center justify-center" style={{
                background: "linear-gradient(135deg, #f3e9d4 0%, #f1e5c7 50%, #ede0ba 100%)"
              }}>
                {mode === "zine" ? (
                  <div className="relative">
                    {/* ZINE Creation Workspace */}
                    <motion.div
                      className="relative"
                      style={{ width: 900, height: 700 }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Table/Desk background */}
                      <div
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: `
                            linear-gradient(135deg, #d2b48c 0%, #daa520 20%, #cd853f 40%, #d2b48c 60%, #f4a460 80%, #daa520 100%),
                            repeating-linear-gradient(
                              45deg,
                              transparent,
                              transparent 2px,
                              rgba(139, 115, 85, 0.1) 2px,
                              rgba(139, 115, 85, 0.1) 4px
                            )
                          `,
                          boxShadow: `
                            inset 0 0 100px rgba(139, 69, 19, 0.1),
                            inset 0 2px 4px rgba(255, 248, 220, 0.3),
                            0 8px 32px rgba(139, 69, 19, 0.2)
                          `,
                        }}
                      />
                      
                      {/* Wood grain texture overlay */}
                      <div
                        className="absolute inset-0 rounded-2xl opacity-30"
                        style={{
                          background: `
                            repeating-linear-gradient(
                              90deg,
                              rgba(101, 67, 33, 0.1) 0px,
                              rgba(139, 115, 85, 0.05) 20px,
                              rgba(101, 67, 33, 0.1) 40px,
                              rgba(160, 135, 108, 0.05) 60px
                            )
                          `
                        }}
                      />

                      {/* ZINE Pages Container */}
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <motion.div
                          ref={canvasRef}
                          className="relative rounded-xl overflow-hidden"
                          style={{
                            width: "calc(100% - 2rem)",
                            height: "calc(100% - 2rem)",
                            maxWidth: 1200,
                            maxHeight: 800,
                            aspectRatio: "3/2",
                            filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.4))",
                          }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2, duration: 0.6 }}
                          onDragOver={handleDragOver}
                          onDragEnter={handleDragEnter}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          {/* Paper texture background with subtle shadows */}
                          <div
                            className="absolute inset-0 rounded-xl"
                            style={{
                              background: `
                                radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255,255,255,0.98) 0%, rgba(253,252,249,0.95) 40%, rgba(248,246,243,0.92) 100%),
                                linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(0,0,0,0.02) 100%)
                              `,
                              backgroundColor: "#FFFEF9",
                              boxShadow: `
                                inset 0 0 20px rgba(139, 115, 85, 0.05),
                                0 4px 8px rgba(139, 69, 19, 0.1)
                              `
                            }}
                          />

                          {/* Center binding with shadow */}
                          <div
                            className="absolute left-1/2 top-4 bottom-4 transform -translate-x-0.5"
                            style={{
                              width: "4px",
                              background: "linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.2) 100%)",
                              boxShadow: "inset 0 0 20px rgba(0,0,0,0.15), 0 0 5px rgba(0,0,0,0.1)",
                              borderRadius: "2px",
                            }}
                          />

                          {/* Page content area */}
                          <div 
                            className="absolute inset-0 p-4"
                            onMouseMove={handleMouseMove}
                            onMouseUp={() => setDraggedElement(null)}
                            onMouseLeave={() => setDraggedElement(null)}
                          >
                            {/* Render page elements */}
                            {currentPage.elements.map((element) => (
                              <div
                                key={element.id}
                                className={`absolute cursor-move border-2 ${
                                  selectedElement === element.id ? "border-purple-500 shadow-lg" : "border-transparent"
                                } hover:border-purple-300 transition-all duration-200`}
                                style={{
                                  left: element.x,
                                  top: element.y,
                                  width: element.width,
                                  height: element.height,
                                  zIndex: draggedElement === element.id ? 1000 : 1,
                                }}
                                onClick={() => {
                                  if (editingElement !== element.id) {
                                    setSelectedElement(element.id)
                                  }
                                }}
                                onDoubleClick={() => {
                                  if (element.type === "text") {
                                    startTextEditing(element.id, element.content || "")
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setDraggedElement(element.id)
                                  setSelectedElement(element.id)
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setDragOffset({
                                    x: e.clientX - rect.left,
                                    y: e.clientY - rect.top,
                                  })
                                }}
                                onMouseUp={() => {
                                  setDraggedElement(null)
                                }}
                              >
                                {element.type === "text" && (
                                  <>
                                    {editingElement === element.id ? (
                                      <textarea
                                        className="w-full h-full p-3 bg-white rounded-lg shadow-sm border-2 border-blue-400 resize-none"
                                        style={{
                                          fontSize: element.fontSize,
                                          color: element.color,
                                          fontWeight: "500",
                                          fontFamily: "inherit",
                                        }}
                                        value={tempTextContent}
                                        onChange={(e) => setTempTextContent(e.target.value)}
                                        onBlur={finishTextEditing}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            finishTextEditing()
                                          }
                                          if (e.key === 'Escape') {
                                            e.preventDefault()
                                            cancelTextEditing()
                                          }
                                        }}
                                        autoFocus
                                        placeholder="テキストを入力..."
                                      />
                                    ) : (
                                      <div
                                        className="w-full h-full flex items-center justify-center p-3 bg-white/90 rounded-lg shadow-sm border border-gray-200"
                                        style={{
                                          fontSize: element.fontSize,
                                          color: element.color,
                                          fontWeight: "500",
                                        }}
                                      >
                                        {element.content || "ダブルクリックで編集"}
                                      </div>
                                    )}
                                  </>
                                )}
                                {element.type === "image" && (
                                  <img
                                    src={element.src}
                                    alt="ZINE element"
                                    className="w-full h-full object-cover rounded-lg shadow-md"
                                    draggable={false}
                                  />
                                )}
                                {element.type === "shape" && (
                                  <div
                                    className="w-full h-full shadow-md"
                                    style={{
                                      backgroundColor: element.color,
                                      borderRadius: element.content === "circle" ? "50%" : "8px",
                                    }}
                                  />
                                )}
                              </div>
                            ))}

                            {/* Empty state with modern design */}
                            {currentPage.elements.length === 0 && (
                              <div className="absolute inset-0 flex">
                                <div className="flex-1 flex items-center justify-center">
                                  <div className="text-center text-gray-400">
                                    <div className="text-lg font-medium mb-2">左ページ</div>
                                    <div className="text-sm opacity-70">ここに要素を配置します</div>
                                  </div>
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                  <div className="text-center text-gray-400">
                                    <div className="text-lg font-medium mb-2">右ページ</div>
                                    <div className="text-sm opacity-70">テキストや画像をドラッグ&ドロップ</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Drag & Drop Overlay */}
                            {isDragOver && (
                              <div 
                                className="absolute inset-0 flex items-center justify-center z-50 rounded-xl"
                                style={{
                                  background: "rgba(139, 105, 20, 0.1)",
                                  border: "2px dashed rgba(139, 105, 20, 0.5)",
                                  backdropFilter: "blur(4px)"
                                }}
                              >
                                <div className="text-center">
                                  <div 
                                    className="text-2xl font-bold mb-2"
                                    style={{ color: "#8b6914" }}
                                  >
                                    📷 画像をドロップしてください
                                  </div>
                                  <div 
                                    className="text-sm"
                                    style={{ color: "#a0751f" }}
                                  >
                                    JPG, PNG, GIFファイルに対応
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
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
                  </div>
                )}

                {/* Modification Preview Section */}
                {mode === "novel" && pendingModification && (
                  <motion.div
                    className="mt-8 p-6 rounded-xl border"
                    style={{
                      background: "rgba(255, 245, 238, 0.8)",
                      borderColor: "rgba(220, 38, 127, 0.3)",
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold" style={{ color: "#4a3c28" }}>
                        修正プレビュー
                      </h3>
                      <span className="text-sm px-2 py-1 rounded-full bg-red-100" style={{ color: "#dc2626" }}>
                        {pendingModification.instruction}
                      </span>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Before section */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2" style={{ color: "#8b7355" }}>
                          現在の文章
                        </h4>
                        <div 
                          className="p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap"
                          style={{
                            background: "rgba(247, 241, 232, 0.5)",
                            borderColor: "rgba(139, 115, 85, 0.2)",
                            color: "#6b5b47",
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            maxHeight: "200px",
                            overflowY: "auto"
                          }}
                        >
                          {pendingModification.original.substring(0, 500)}
                          {pendingModification.original.length > 500 && "..."}
                        </div>
                      </div>
                      
                      {/* After section */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2" style={{ color: "#dc2626" }}>
                          修正後の文章
                        </h4>
                        <div 
                          className="p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap"
                          style={{
                            background: "rgba(254, 242, 242, 0.8)",
                            borderColor: "rgba(220, 38, 127, 0.3)",
                            color: "#dc2626",
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            maxHeight: "200px",
                            overflowY: "auto"
                          }}
                        >
                          {pendingModification.modified.substring(0, 500)}
                          {pendingModification.modified.length > 500 && "..."}
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelModification}
                          className="hover:bg-gray-100"
                          style={{ 
                            borderColor: "rgba(139, 115, 85, 0.3)",
                            color: "#8b7355"
                          }}
                        >
                          キャンセル
                        </Button>
                        <Button
                          size="sm"
                          onClick={applyModification}
                          disabled={isApplyingModification}
                          className="text-white"
                          style={{
                            background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
                          }}
                        >
                          {isApplyingModification ? "適用中..." : "適用する"}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ZineCreator
