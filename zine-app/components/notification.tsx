"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, AlertCircle, X, BookOpen, Sparkles, Clock, Save } from "lucide-react"

export type NotificationType = "success" | "error" | "info" | "warning"

export interface NotificationProps {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  icon?: React.ReactNode
}

interface NotificationConfig {
  icon: React.ReactNode
  bgColor: string
  borderColor: string
  iconColor: string
  titleColor: string
  messageColor: string
}

const notificationConfigs: Record<NotificationType, NotificationConfig> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    bgColor: "rgba(245, 237, 225, 0.98)",
    borderColor: "rgba(139, 119, 95, 0.3)",
    iconColor: "#8b6914",
    titleColor: "#4a3c28",
    messageColor: "#6b5b47",
  },
  error: {
    icon: <AlertCircle className="w-5 h-5" />,
    bgColor: "rgba(255, 243, 243, 0.98)",
    borderColor: "rgba(185, 28, 28, 0.3)",
    iconColor: "#b91c1c",
    titleColor: "#7f1d1d",
    messageColor: "#991b1b",
  },
  info: {
    icon: <BookOpen className="w-5 h-5" />,
    bgColor: "rgba(245, 237, 225, 0.98)",
    borderColor: "rgba(139, 119, 95, 0.3)",
    iconColor: "#8b7355",
    titleColor: "#4a3c28",
    messageColor: "#6b5b47",
  },
  warning: {
    icon: <Clock className="w-5 h-5" />,
    bgColor: "rgba(254, 243, 199, 0.98)",
    borderColor: "rgba(217, 119, 6, 0.3)",
    iconColor: "#d97706",
    titleColor: "#78350f",
    messageColor: "#92400e",
  },
}

let notificationListener: ((notification: Omit<NotificationProps, "id">) => void) | null = null

export const showNotification = (notification: Omit<NotificationProps, "id">) => {
  if (notificationListener) {
    notificationListener(notification)
  }
}

export function NotificationContainer() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([])

  useEffect(() => {
    notificationListener = (notification) => {
      const id = Date.now().toString()
      setNotifications((prev) => [...prev, { ...notification, id }])

      const duration = notification.duration || 5000
      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id))
        }, duration)
      }
    }

    return () => {
      notificationListener = null
    }
  }, [])

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="fixed top-4 right-4 z-[100] pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => {
          const config = notificationConfigs[notification.type]
          const Icon = notification.icon || config.icon

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
                mass: 0.5
              }}
              className="mb-3 pointer-events-auto"
            >
              <div
                className="flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm min-w-[320px] max-w-[420px]"
                style={{
                  backgroundColor: config.bgColor,
                  borderColor: config.borderColor,
                }}
              >
                <div className="flex-shrink-0 mt-0.5" style={{ color: config.iconColor }}>
                  {Icon}
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className="font-medium text-sm"
                    style={{ color: config.titleColor }}
                  >
                    {notification.title}
                  </h3>
                  {notification.message && (
                    <p
                      className="mt-1 text-xs leading-relaxed"
                      style={{ color: config.messageColor }}
                    >
                      {notification.message}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => removeNotification(notification.id)}
                  className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/5 transition-colors"
                  style={{ color: config.messageColor }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// Convenience functions for common notifications
export const notifications = {
  success: (title: string, message?: string) =>
    showNotification({ type: "success", title, message }),

  error: (title: string, message?: string) =>
    showNotification({ type: "error", title, message }),

  info: (title: string, message?: string) =>
    showNotification({ type: "info", title, message }),

  warning: (title: string, message?: string) =>
    showNotification({ type: "warning", title, message }),

  coverGenerated: () =>
    showNotification({
      type: "success",
      title: "表紙が完成しました",
      message: "美しい表紙が生成されました。作品の顔となる一枚です。",
      icon: <Sparkles className="w-5 h-5" />,
      duration: 7000,
    }),

  saved: (title: string, isPublished: boolean) =>
    showNotification({
      type: "success",
      title: isPublished ? "作品を公開しました" : "下書きを保存しました",
      message: isPublished
        ? `「${title}」がMy Booksに追加されました。`
        : `「${title}」を下書きとして保存しました。`,
      icon: <Save className="w-5 h-5" />,
      duration: 5000,
    }),

  rateLimitError: () =>
    showNotification({
      type: "warning",
      title: "しばらくお待ちください",
      message: "API利用制限に達しました。少し時間をおいてから再度お試しください。",
      icon: <Clock className="w-5 h-5" />,
      duration: 8000,
    }),
}