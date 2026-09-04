import { analyzeFaces } from './faceDetect'
import { buildFrames, pickMotion } from './kenBurns'
import type { MotionType, Shot, Strength } from '../types'

function uid() {
  return crypto.randomUUID()
}

export function createPendingShot(file: File, src: string): Shot {
  const focus = { x: 0.5, y: 0.42 }
  const motion: MotionType = 'in'
  const strength: Strength = 'medium'
  const { start, end } = buildFrames(focus, motion, strength)
  return {
    id: uid(),
    src,
    fileName: file.name,
    start,
    end,
    motion,
    strength,
    focus: { source: 'center', point: focus },
    durationMs: 2800,
    confidence: 0,
    needsReview: true,
    analyzing: true,
  }
}

export async function finalizeShot(
  shot: Shot,
  previousMotion?: MotionType,
): Promise<Shot> {
  const analysis = await analyzeFaces(shot.src)
  const faceArea = analysis.box ? analysis.box.w * analysis.box.h : 0
  const motion = pickMotion(
    analysis.source === 'face',
    faceArea,
    previousMotion,
  )
  const strength: Strength = 'medium'
  const { start, end } = buildFrames(analysis.point, motion, strength)

  return {
    ...shot,
    start,
    end,
    motion,
    strength,
    focus: {
      source: analysis.source,
      point: analysis.point,
      box: analysis.box,
    },
    confidence: analysis.confidence,
    needsReview: analysis.needsReview,
    analyzing: false,
  }
}

export function recomputeShot(
  shot: Shot,
  patch: Partial<
    Pick<Shot, 'motion' | 'strength'> & { point?: { x: number; y: number } }
  >,
): Shot {
  const motion = patch.motion ?? shot.motion
  const strength = patch.strength ?? shot.strength
  const point = patch.point ?? shot.focus.point
  const manual = Boolean(patch.point) || shot.focus.source === 'manual'
  const { start, end } = buildFrames(point, motion, strength)

  return {
    ...shot,
    motion,
    strength,
    start,
    end,
    focus: {
      ...shot.focus,
      point,
      source: manual ? 'manual' : shot.focus.source,
    },
    needsReview: manual ? false : shot.needsReview,
  }
}
