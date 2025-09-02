"use client"

import { motion } from "framer-motion"
import { BookOpen, Zap, Eye, Plus, Sparkles, PenTool, Users } from "lucide-react"

interface ProjectSelectionProps {
  onStartWriting: (project: any) => void
  onViewZines: () => void
}

const projectCards = [
  {
    id: "new-book",
    title: "新しい本を作る",
    description: "AIと協働で本を執筆・編集",
    icon: Plus,
    color: "from-purple-500 to-pink-500",
    action: "create",
  },
  {
    id: "continue-book",
    title: "執筆中の本",
    description: "進行中のプロジェクトを続ける",
    icon: PenTool,
    color: "from-blue-500 to-cyan-500",
    action: "continue",
  },
  {
    id: "zine-rough",
    title: "ZINEラフ作成",
    description: "ビジュアル重視の短編作品",
    icon: Sparkles,
    color: "from-orange-500 to-red-500",
    action: "zine",
  },
  {
    id: "view-library",
    title: "作品ライブラリ",
    description: "完成作品・ZINEを閲覧",
    icon: Eye,
    color: "from-green-500 to-teal-500",
    action: "view",
  },
  {
    id: "collaboration",
    title: "共同執筆",
    description: "他のユーザーとの協働プロジェクト",
    icon: Users,
    color: "from-indigo-500 to-purple-500",
    action: "collaborate",
  },
  {
    id: "ai-assistant",
    title: "AI設定",
    description: "執筆パートナーAI「CraiQ」の設定",
    icon: Zap,
    color: "from-yellow-500 to-orange-500",
    action: "ai-setup",
  },
]

export function ProjectSelection({ onStartWriting, onViewZines }: ProjectSelectionProps) {
  const handleCardClick = (card: (typeof projectCards)[0]) => {
    switch (card.action) {
      case "create":
      case "continue":
      case "ai-setup":
        onStartWriting({ type: card.action, title: card.title })
        break
      case "view":
        onViewZines()
        break
      case "zine":
        // TODO: Navigate to ZINE creator
        break
      case "collaborate":
        // TODO: Navigate to collaboration view
        break
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen flex flex-col items-center justify-center p-8"
    >
      {/* Header */}
      <motion.div
        className="text-center mb-12"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Creative Workspace
          </h1>
        </div>
        <p className="text-gray-400 text-lg">AIと一緒に、あなたの物語を形にしよう</p>
      </motion.div>

      {/* Project Cards Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        {projectCards.map((card, index) => {
          const IconComponent = card.icon
          return (
            <motion.div
              key={card.id}
              className="group relative"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 * index, duration: 0.6 }}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 cursor-pointer overflow-hidden transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20"
                onClick={() => handleCardClick(card)}
              >
                {/* Background Gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />

                {/* Icon */}
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <IconComponent className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-white transition-colors">
                  {card.title}
                </h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors">{card.description}</p>

                {/* Hover Effect */}
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-white/5 to-transparent rounded-full translate-x-16 translate-y-16 group-hover:translate-x-8 group-hover:translate-y-8 transition-transform duration-500" />
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Footer */}
      <motion.div
        className="mt-12 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <p className="text-gray-500 text-sm">クリエイティブな旅を始めましょう</p>
      </motion.div>
    </motion.div>
  )
}
