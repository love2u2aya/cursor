import { useCallback, useMemo, useState } from 'react'
import { DropZone } from './components/DropZone'
import { Timeline } from './components/Timeline'
import { FocusCanvas, ShotControls } from './components/ShotEditor'
import { KenBurnsPreview } from './components/KenBurnsPreview'
import { createPendingShot, finalizeShot, recomputeShot } from './lib/createShot'
import type { MotionType, Shot, Strength } from './types'
import './App.css'

export default function App() {
  const [shots, setShots] = useState<Shot[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [reelMode, setReelMode] = useState<'shot' | 'all'>('shot')
  const [busy, setBusy] = useState(false)

  const selected = useMemo(
    () => shots.find((s) => s.id === selectedId) ?? null,
    [shots, selectedId],
  )

  const updateShot = useCallback((id: string, next: Shot) => {
    setShots((prev) => prev.map((s) => (s.id === id ? next : s)))
  }, [])

  const ingestFiles = useCallback(async (files: File[]) => {
    setBusy(true)
    setPlaying(false)

    const pending = files.map((file) => {
      const src = URL.createObjectURL(file)
      return createPendingShot(file, src)
    })

    setShots((prev) => [...prev, ...pending])
    setSelectedId((curr) => curr ?? pending[0]?.id ?? null)

    let previousMotion: MotionType | undefined
    for (const shot of pending) {
      const done = await finalizeShot(shot, previousMotion)
      previousMotion = done.motion
      setShots((prev) => prev.map((s) => (s.id === shot.id ? done : s)))
    }

    setBusy(false)
  }, [])

  const handleFiles = useCallback(
    (files: File[]) => {
      void ingestFiles(files)
    },
    [ingestFiles],
  )

  const loadDemo = useCallback(async () => {
    const paths = [
      '/samples/portrait1.jpg',
      '/samples/portrait2.jpg',
      '/samples/landscape.jpg',
    ]
    const files: File[] = []
    for (const path of paths) {
      const res = await fetch(path)
      const blob = await res.blob()
      const name = path.split('/').pop() ?? 'sample.jpg'
      files.push(new File([blob], name, { type: blob.type || 'image/jpeg' }))
    }
    await ingestFiles(files)
  }, [ingestFiles])

  function goNextReview() {
    if (shots.length === 0) return
    const start = selectedId
      ? shots.findIndex((s) => s.id === selectedId)
      : -1
    for (let i = 1; i <= shots.length; i++) {
      const s = shots[(start + i) % shots.length]
      if (s.needsReview) {
        setSelectedId(s.id)
        return
      }
    }
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="brand">Lumen Memories</p>
          <h1>半自動 Ken Burns</h1>
          <p className="lede">
            顔検出で行き先を仮決めし、必要な枚だけ点を直してリールにします。
          </p>
        </div>
      </header>

      {shots.length === 0 ? (
        <div className="hero-actions">
          <DropZone onFiles={handleFiles} busy={busy} />
          <button
            type="button"
            className="btn primary demo-btn"
            onClick={() => void loadDemo()}
            disabled={busy}
          >
            サンプル写真で試す
          </button>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <DropZone onFiles={handleFiles} busy={busy} />
          </div>

          <Timeline
            shots={shots}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              setPlaying(false)
            }}
          />

          <div className="workspace">
            <section className="panel editor-panel">
              <h2>行き先を直す</h2>
              {selected ? (
                <>
                  <FocusCanvas
                    shot={selected}
                    onPoint={(x, y) =>
                      updateShot(
                        selected.id,
                        recomputeShot(selected, { point: { x, y } }),
                      )
                    }
                  />
                  <ShotControls
                    shot={selected}
                    onMotion={(m) =>
                      updateShot(selected.id, recomputeShot(selected, { motion: m }))
                    }
                    onStrength={(s: Strength) =>
                      updateShot(
                        selected.id,
                        recomputeShot(selected, { strength: s }),
                      )
                    }
                    onConfirm={() =>
                      updateShot(selected.id, {
                        ...selected,
                        needsReview: false,
                      })
                    }
                    onNextReview={goNextReview}
                  />
                </>
              ) : (
                <p className="empty-hint">タイムラインから写真を選んでください</p>
              )}
            </section>

            <section className="panel preview-panel">
              <h2>プレビュー</h2>
              <div className="preview-modes">
                <button
                  type="button"
                  className={`btn ghost ${reelMode === 'shot' ? 'is-active' : ''}`}
                  onClick={() => {
                    setReelMode('shot')
                    setPlaying(false)
                  }}
                >
                  この1枚
                </button>
                <button
                  type="button"
                  className={`btn ghost ${reelMode === 'all' ? 'is-active' : ''}`}
                  onClick={() => {
                    setReelMode('all')
                    setPlaying(false)
                  }}
                >
                  全枚リール
                </button>
              </div>
              <KenBurnsPreview
                shots={shots}
                playing={playing}
                onPlayingChange={setPlaying}
                loopShotId={reelMode === 'shot' ? selectedId : null}
              />
              <p className="hint">
                「この1枚」で行き先の動きを確認し、「全枚リール」で思い出スライドを通して見ます。
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
