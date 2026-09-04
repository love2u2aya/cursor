import { useEffect, useState, type CSSProperties } from 'react'
import type { Shot } from '../types'

type KenBurnsPreviewProps = {
  shots: Shot[]
  playing: boolean
  onPlayingChange: (v: boolean) => void
  loopShotId?: string | null
}

export function KenBurnsPreview({
  shots,
  playing,
  onPlayingChange,
  loopShotId,
}: KenBurnsPreviewProps) {
  const playable = shots.filter((s) => !s.analyzing)
  const sequence = loopShotId
    ? playable.filter((s) => s.id === loopShotId)
    : playable

  const [index, setIndex] = useState(0)
  const [tick, setTick] = useState(0)

  const current = sequence[index] ?? null

  useEffect(() => {
    setIndex(0)
    setTick((t) => t + 1)
  }, [loopShotId, shots.length])

  useEffect(() => {
    if (!playing || sequence.length === 0) return
    const shot = sequence[index]
    if (!shot) return

    const t = window.setTimeout(() => {
      const next = index + 1
      if (next >= sequence.length) {
        if (loopShotId) {
          setIndex(0)
          setTick((n) => n + 1)
        } else {
          onPlayingChange(false)
          setIndex(0)
        }
      } else {
        setIndex(next)
        setTick((n) => n + 1)
      }
    }, shot.durationMs)

    return () => window.clearTimeout(t)
  }, [playing, index, sequence, loopShotId, onPlayingChange, tick])

  if (!current) {
    return (
      <div className="preview empty">
        <p>写真を追加するとプレビューが始まります</p>
      </div>
    )
  }

  return (
    <div className="preview">
      <div className="preview-stage">
        {sequence.map((shot, i) => {
          const active = i === index
          const style = {
            '--ox': `${shot.start.x * 100}%`,
            '--oy': `${shot.start.y * 100}%`,
            '--sx': shot.start.scale,
            '--ex': `${shot.end.x * 100}%`,
            '--ey': `${shot.end.y * 100}%`,
            '--es': shot.end.scale,
            '--dur': `${shot.durationMs}ms`,
          } as CSSProperties

          return (
            <div
              key={`${shot.id}-${active ? tick : 'idle'}`}
              className={[
                'kb-layer',
                active ? 'is-active' : '',
                active && playing ? 'is-animating' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={style}
            >
              <img src={shot.src} alt="" />
            </div>
          )
        })}
      </div>

      <div className="preview-bar">
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            if (!playing) {
              setIndex(0)
              setTick((n) => n + 1)
            }
            onPlayingChange(!playing)
          }}
          disabled={playable.length === 0}
        >
          {playing ? '停止' : loopShotId ? 'この1枚をループ' : 'リール再生'}
        </button>
        <span className="preview-status">
          {loopShotId
            ? '編集プレビュー'
            : `${Math.min(index + 1, sequence.length)} / ${sequence.length}`}
        </span>
      </div>
    </div>
  )
}
