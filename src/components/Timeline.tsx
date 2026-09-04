import type { Shot } from '../types'

type TimelineProps = {
  shots: Shot[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function Timeline({ shots, selectedId, onSelect }: TimelineProps) {
  if (shots.length === 0) return null

  return (
    <div className="timeline" role="list">
      {shots.map((shot, i) => (
        <button
          key={shot.id}
          type="button"
          role="listitem"
          className={[
            'timeline-item',
            selectedId === shot.id ? 'is-selected' : '',
            shot.needsReview ? 'needs-review' : '',
            shot.analyzing ? 'is-analyzing' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onSelect(shot.id)}
        >
          <img src={shot.src} alt="" />
          <span className="timeline-index">{i + 1}</span>
          {shot.needsReview && !shot.analyzing && (
            <span className="timeline-badge">要確認</span>
          )}
          {shot.analyzing && <span className="timeline-badge">解析中</span>}
        </button>
      ))}
    </div>
  )
}
