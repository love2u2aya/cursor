import { useRef } from 'react'
import type { MotionType, Shot, Strength } from '../types'

export function FocusCanvas({
  shot,
  onPoint,
}: {
  shot: Shot
  onPoint: (x: number, y: number) => void
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  function pointFrom(clientX: number, clientY: number) {
    const el = frameRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.min(0.95, Math.max(0.05, (clientX - rect.left) / rect.width))
    const y = Math.min(0.95, Math.max(0.05, (clientY - rect.top) / rect.height))
    onPoint(x, y)
  }

  return (
    <div
      ref={frameRef}
      className={`focus-canvas ${shot.analyzing ? 'is-analyzing' : ''}`}
      onPointerDown={(e) => {
        if (shot.analyzing) return
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        pointFrom(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return
        pointFrom(e.clientX, e.clientY)
      }}
      onPointerUp={() => {
        dragging.current = false
      }}
    >
      <img src={shot.src} alt={shot.fileName} draggable={false} />
      {shot.focus.box && shot.focus.source !== 'manual' && (
        <span
          className="face-box"
          style={{
            left: `${shot.focus.box.x * 100}%`,
            top: `${shot.focus.box.y * 100}%`,
            width: `${shot.focus.box.w * 100}%`,
            height: `${shot.focus.box.h * 100}%`,
          }}
        />
      )}
      <span
        className="focus-point"
        style={{
          left: `${shot.focus.point.x * 100}%`,
          top: `${shot.focus.point.y * 100}%`,
        }}
      />
    </div>
  )
}

export function ShotControls({
  shot,
  onMotion,
  onStrength,
  onConfirm,
  onNextReview,
}: {
  shot: Shot
  onMotion: (m: MotionType) => void
  onStrength: (s: Strength) => void
  onConfirm: () => void
  onNextReview: () => void
}) {
  const motions: { id: MotionType; label: string }[] = [
    { id: 'in', label: '近づく' },
    { id: 'out', label: '引く' },
    { id: 'pan', label: '横へ' },
  ]
  const strengths: { id: Strength; label: string }[] = [
    { id: 'soft', label: '弱' },
    { id: 'medium', label: '中' },
    { id: 'strong', label: '強' },
  ]

  return (
    <div className="shot-controls">
      <div className="meta-row">
        <span className="chip">
          {shot.focus.source === 'face'
            ? '顔検出'
            : shot.focus.source === 'manual'
              ? '手動'
              : '中央フォールバック'}
        </span>
        <span className="chip muted">
          自信度 {(shot.confidence * 100).toFixed(0)}%
        </span>
        {shot.needsReview && <span className="chip warn">要レビュー</span>}
      </div>

      <div className="control-block">
        <p className="label">動き</p>
        <div className="seg">
          {motions.map((m) => (
            <button
              key={m.id}
              type="button"
              className={shot.motion === m.id ? 'is-active' : ''}
              onClick={() => onMotion(m.id)}
              disabled={shot.analyzing}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-block">
        <p className="label">強さ</p>
        <div className="seg">
          {strengths.map((s) => (
            <button
              key={s.id}
              type="button"
              className={shot.strength === s.id ? 'is-active' : ''}
              onClick={() => onStrength(s.id)}
              disabled={shot.analyzing}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn primary"
          onClick={onConfirm}
          disabled={shot.analyzing || !shot.needsReview}
        >
          この推定でOK
        </button>
        <button type="button" className="btn ghost" onClick={onNextReview}>
          次の要レビューへ
        </button>
      </div>
    </div>
  )
}
