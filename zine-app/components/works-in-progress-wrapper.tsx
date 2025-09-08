"use client"

import dynamic from 'next/dynamic'

const WorksInProgress = dynamic(() => import('./works-in-progress').then(mod => ({ default: mod.WorksInProgress })), {
  ssr: false,
  loading: () => (
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
})

interface WorksInProgressWrapperProps {
  onWorkSelect: (work: any) => void
}

export function WorksInProgressWrapper({ onWorkSelect }: WorksInProgressWrapperProps) {
  return <WorksInProgress onWorkSelect={onWorkSelect} />
}