"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Lightbulb, Edit3, CheckCircle, User, Bot, Image, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { review } from "@/lib/api"

interface WritingWorkspaceProps {
  project: any
  currentPhase: 1 | 2 | 3 | 4
  onPhaseChange: (phase: 1 | 2 | 3 | 4) => void
  onBack: () => void
}

const phases = [
  { id: 1, title: "準備", icon: User, color: "from-blue-500 to-cyan-500" },
  { id: 2, title: "構想", icon: Lightbulb, color: "from-purple-500 to-pink-500" },
  { id: 3, title: "執筆", icon: Edit3, color: "from-orange-500 to-red-500" },
  { id: 4, title: "完成", icon: CheckCircle, color: "from-green-500 to-teal-500" },
]

export function WritingWorkspace({ project, currentPhase, onPhaseChange, onBack }: WritingWorkspaceProps) {
  const [userInput, setUserInput] = useState("")
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", content: "こんにちは！私はCraiQ、あなたの執筆パートナーです。まずは自己紹介をお聞かせください。" },
  ])

  // AI機能の状態管理
  const [isGenerating, setIsGenerating] = useState(false)
  const [concept, setConcept] = useState("")
  const [world, setWorld] = useState("")
  const [prompt, setPrompt] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [originalText, setOriginalText] = useState("")
  const [reviewInstruction, setReviewInstruction] = useState("")

  const handleSendMessage = () => {
    if (!userInput.trim()) return

    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userInput },
      { role: "ai", content: "ありがとうございます！それでは一緒に素晴らしい作品を作りましょう。" },
    ])
    setUserInput("")
  }

  // 小説化機能（本ワークスペースは現在非使用のため無効化）
  const handleNovelize = async () => {
    alert("このワークスペースの小説生成は現在無効化されています。ZINEモードから小説化をご利用ください。")
    return
  }

  // レビュー機能
  const handleReview = async () => {
    if (!originalText || !reviewInstruction) {
      alert("原文と修正指示を入力してください。")
      return
    }

    setIsGenerating(true)
    try {
      const result = await review({ original: originalText, instruction: reviewInstruction })
      setGeneratedContent(result.text)
    } catch (error) {
      console.error("レビューエラー:", error)
      alert("文章のレビューに失敗しました。")
    } finally {
      setIsGenerating(false)
    }
  }


  const renderPhaseContent = () => {
    switch (currentPhase) {
      case 1:
        return (
          <Phase1Content
            chatMessages={chatMessages}
            userInput={userInput}
            setUserInput={setUserInput}
            onSendMessage={handleSendMessage}
          />
        )
      case 2:
        return (
          <Phase2Content
            concept={concept}
            setConcept={setConcept}
            world={world}
            setWorld={setWorld}
            prompt={prompt}
            setPrompt={setPrompt}
            onNovelize={handleNovelize}
            generatedContent={generatedContent}
            isGenerating={isGenerating}
          />
        )
      case 3:
        return (
          <Phase3Content
            originalText={originalText}
            setOriginalText={setOriginalText}
            reviewInstruction={reviewInstruction}
            setReviewInstruction={setReviewInstruction}
            onReview={handleReview}
            generatedContent={generatedContent}
            isGenerating={isGenerating}
          />
        )
      case 4:
        return (
          <Phase4Content
            generatedContent={generatedContent}
          />
        )
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-black text-white"
    >
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              <h1 className="text-xl font-bold">{project.title}</h1>
            </div>

            {/* Phase Navigation */}
            <div className="flex items-center gap-2">
              {phases.map((phase) => {
                const IconComponent = phase.icon
                const isActive = currentPhase === phase.id
                const isCompleted = currentPhase > phase.id

                return (
                  <Button
                    key={phase.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => onPhaseChange(phase.id as 1 | 2 | 3 | 4)}
                    className={`flex items-center gap-2 ${
                      isActive ? "bg-white/10 text-white" : isCompleted ? "text-green-400" : "text-gray-500"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {phase.title}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderPhaseContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// Phase 1: Preparation
function Phase1Content({ chatMessages, userInput, setUserInput, onSendMessage }: any) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 rounded-2xl p-6 h-96 overflow-y-auto mb-4">
            {chatMessages.map((message: any, index: number) => (
              <div key={index} className={`flex gap-3 mb-4 ${message.role === "user" ? "justify-end" : ""}`}>
                <div className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === "user" ? "bg-blue-500" : "bg-gradient-to-br from-purple-500 to-pink-500"
                    }`}
                  >
                    {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div
                    className={`max-w-md p-3 rounded-lg ${
                      message.role === "user" ? "bg-blue-500/20 text-blue-100" : "bg-white/10 text-white"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="メッセージを入力..."
              className="bg-white/5 border-white/10 text-white"
              onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
            />
            <Button onClick={onSendMessage} className="bg-purple-600 hover:bg-purple-700">
              送信
            </Button>
          </div>
        </div>

        {/* AI Profile */}
        <div className="bg-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">AI パートナー: CraiQ</h3>
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
            <Bot className="w-8 h-8" />
          </div>
          <div className="space-y-3 text-sm text-gray-300">
            <div>
              <span className="text-purple-400">専門分野:</span> 創作支援、構成提案
            </div>
            <div>
              <span className="text-purple-400">性格:</span> 協力的、創造的
            </div>
            <div>
              <span className="text-purple-400">得意:</span> アイデア発想、文章構成
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Phase 2: Concept - AI小説化機能付き
function Phase2Content({ 
  concept, setConcept, world, setWorld, prompt, setPrompt, 
  onNovelize, generatedContent, isGenerating 
}: any) {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              AI小説生成
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">コンセプト</label>
                <Input
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="例: SF、恋愛、冒険..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">世界観</label>
                <Input
                  value={world}
                  onChange={(e) => setWorld(e.target.value)}
                  placeholder="例: 近未来都市、異世界ファンタジー..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">指示・プロンプト</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="例: 主人公は高校生で、友情をテーマに..."
                  className="bg-white/5 border-white/10 text-white h-24"
                />
              </div>
              <Button 
                onClick={onNovelize}
                disabled={isGenerating || !concept || !world || !prompt}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {isGenerating ? "生成中..." : "小説を生成"}
              </Button>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="bg-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">生成結果</h3>
          <div className="bg-white/5 rounded-lg p-4 h-96 overflow-y-auto">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : generatedContent ? (
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{generatedContent}</pre>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                生成された内容がここに表示されます
              </div>
            )}
          </div>
          {generatedContent && (
            <Button className="w-full mt-4 bg-orange-600 hover:bg-orange-700">
              次のフェーズへ進む
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Phase 3: Writing - AIレビュー機能付き
function Phase3Content({ 
  originalText, setOriginalText, reviewInstruction, setReviewInstruction,
  onReview, generatedContent, isGenerating 
}: any) {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor Section */}
        <div className="space-y-6">
          <div className="bg-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">本文エディタ</h3>
            <Textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="ここに本文を書いてください..."
              className="bg-white/5 border-white/10 text-white h-64 mb-4"
            />
          </div>

          <div className="bg-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              AI推敲機能
            </h3>
            <Textarea
              value={reviewInstruction}
              onChange={(e) => setReviewInstruction(e.target.value)}
              placeholder="修正・推敲の指示を入力してください（例: もっと感情的に、文章を短くして、など）"
              className="bg-white/5 border-white/10 text-white h-20 mb-4"
            />
            <Button 
              onClick={onReview}
              disabled={isGenerating || !originalText || !reviewInstruction}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? "推敲中..." : "AI推敲を実行"}
            </Button>
          </div>
        </div>

        {/* Review Result Section */}
        <div className="bg-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">推敲結果</h3>
          <div className="bg-white/5 rounded-lg p-4 h-96 overflow-y-auto">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : generatedContent ? (
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{generatedContent}</pre>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                推敲結果がここに表示されます
              </div>
            )}
          </div>
          {generatedContent && (
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={() => setOriginalText(generatedContent)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                推敲結果を採用
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-white/20 text-white bg-transparent"
              >
                元に戻す
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Phase 4: Completion - 原稿完成と出力
function Phase4Content({ generatedContent }: any) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        {/* Final Content */}
        <div className="bg-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">完成原稿</h3>
          <div className="bg-white/5 rounded-lg p-4 h-96 overflow-y-auto text-sm">
            {generatedContent || "完成した原稿がここに表示されます..."}
          </div>
          <div className="flex gap-2 mt-4">
            <Button className="bg-green-600 hover:bg-green-700">PDF出力</Button>
            <Button className="bg-purple-600 hover:bg-purple-700">ZINE形式</Button>
          </div>
        </div>

        {/* AI評価 */}
        <div className="bg-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">AI評価</h3>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-green-400">85点</div>
            <div className="text-sm text-gray-400">総合評価</div>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-blue-400">構成:</span> 90点 - 論理的で読みやすい
            </div>
            <div>
              <span className="text-purple-400">創造性:</span> 80点 - 独創的なアイデア
            </div>
            <div>
              <span className="text-orange-400">文章力:</span> 85点 - 表現力豊か
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}