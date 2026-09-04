export type MotionType = 'in' | 'out' | 'pan'
export type Strength = 'soft' | 'medium' | 'strong'
export type FocusSource = 'face' | 'center' | 'manual'

export type Point = { x: number; y: number }

export type Frame = {
  x: number
  y: number
  scale: number
}

export type FocusBox = {
  x: number
  y: number
  w: number
  h: number
}

export type Shot = {
  id: string
  src: string
  fileName: string
  start: Frame
  end: Frame
  motion: MotionType
  strength: Strength
  focus: {
    source: FocusSource
    point: Point
    box?: FocusBox
  }
  durationMs: number
  confidence: number
  needsReview: boolean
  analyzing?: boolean
}
