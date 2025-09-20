"use client"

import { useState, useEffect } from 'react'
import { WorksInProgress } from './works-in-progress'

interface WorksInProgressWrapperProps {
  onWorkSelect: (work: any) => void
  onWorkDelete?: (work: any) => void
}

export function WorksInProgressWrapper({ onWorkSelect, onWorkDelete }: WorksInProgressWrapperProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#4a3c28" }}>
            作成中の作品
          </h2>
          <p style={{ color: "#8b7355" }}>
            読み込み中...
          </p>
        </div>
      </div>
    )
  }

  return <WorksInProgress onWorkSelect={onWorkSelect} onWorkDelete={onWorkDelete} />
}