import type { Frame, MotionType, Point, Strength } from '../types'

const STRENGTH: Record<
  Strength,
  { zoomDelta: number; panDelta: number }
> = {
  soft: { zoomDelta: 0.05, panDelta: 0.03 },
  medium: { zoomDelta: 0.08, panDelta: 0.05 },
  strong: { zoomDelta: 0.12, panDelta: 0.07 },
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Keep focus usable as transform-origin / object-position */
function clampPoint(p: Point): Point {
  return {
    x: clamp(p.x, 0.08, 0.92),
    y: clamp(p.y, 0.08, 0.92),
  }
}

export function buildFrames(
  focus: Point,
  motion: MotionType,
  strength: Strength,
): { start: Frame; end: Frame } {
  const p = clampPoint(focus)
  const { zoomDelta, panDelta } = STRENGTH[strength]
  const base = 1.02

  if (motion === 'in') {
    const startCenter = {
      x: clamp(p.x * 0.55 + 0.5 * 0.45, 0.1, 0.9),
      y: clamp(p.y * 0.55 + 0.45 * 0.45, 0.1, 0.9),
    }
    return {
      start: { x: startCenter.x, y: startCenter.y, scale: base },
      end: { x: p.x, y: p.y, scale: base + zoomDelta },
    }
  }

  if (motion === 'out') {
    return {
      start: { x: p.x, y: p.y, scale: base + zoomDelta },
      end: {
        x: clamp(p.x * 0.7 + 0.5 * 0.3, 0.1, 0.9),
        y: clamp(p.y * 0.7 + 0.48 * 0.3, 0.1, 0.9),
        scale: base,
      },
    }
  }

  // pan — slight zoom held, horizontal drift toward focus side
  const drift = p.x >= 0.5 ? panDelta : -panDelta
  return {
    start: {
      x: clamp(p.x - drift / 2, 0.1, 0.9),
      y: p.y,
      scale: base + zoomDelta * 0.35,
    },
    end: {
      x: clamp(p.x + drift / 2, 0.1, 0.9),
      y: p.y,
      scale: base + zoomDelta * 0.35,
    },
  }
}

export function pickMotion(
  hasFace: boolean,
  faceAreaHint: number,
  previous?: MotionType,
): MotionType {
  let motion: MotionType
  if (!hasFace) motion = 'pan'
  else if (faceAreaHint < 0.08) motion = 'in'
  else motion = 'out'

  if (previous === motion) {
    const alt: MotionType[] =
      motion === 'in' ? ['out', 'pan'] : motion === 'out' ? ['in', 'pan'] : ['in', 'out']
    motion = alt[0]
  }
  return motion
}
