import {
  FaceDetector,
  FilesetResolver,
  type Detection,
} from '@mediapipe/tasks-vision'
import type { FocusBox, Point } from '../types'

let detectorPromise: Promise<FaceDetector> | null = null

async function getDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm',
      )
      return FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.45,
      })
    })()
  }
  return detectorPromise
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    img.src = src
  })
}

function scoreFace(det: Detection, imgW: number, imgH: number): number {
  const box = det.boundingBox
  if (!box) return 0
  const area = (box.width * box.height) / (imgW * imgH)
  const cx = (box.originX + box.width / 2) / imgW
  const cy = (box.originY + box.height / 2) / imgH
  const centerScore = 1 - Math.min(1, Math.hypot(cx - 0.5, cy - 0.42) / 0.75)
  const upperBonus = cy < 0.55 ? 0.1 : 0
  const conf = det.categories[0]?.score ?? 0.5
  return area * 0.55 + centerScore * 0.25 + conf * 0.1 + upperBonus
}

export type FaceAnalysis = {
  point: Point
  box?: FocusBox
  source: 'face' | 'center'
  confidence: number
  needsReview: boolean
  faceCount: number
}

export async function analyzeFaces(src: string): Promise<FaceAnalysis> {
  try {
    const [detector, img] = await Promise.all([getDetector(), loadImage(src)])
    const result = detector.detect(img)
    const detections = result.detections ?? []

    if (detections.length === 0) {
      return {
        point: { x: 0.5, y: 0.42 },
        source: 'center',
        confidence: 0.35,
        needsReview: true,
        faceCount: 0,
      }
    }

    const scored = detections
      .map((d) => ({ d, score: scoreFace(d, img.naturalWidth, img.naturalHeight) }))
      .sort((a, b) => b.score - a.score)

    const best = scored[0]
    const box = best.d.boundingBox
    if (!box) {
      return {
        point: { x: 0.5, y: 0.42 },
        source: 'center',
        confidence: 0.4,
        needsReview: true,
        faceCount: detections.length,
      }
    }

    const point = {
      x: (box.originX + box.width / 2) / img.naturalWidth,
      y: (box.originY + box.height / 2) / img.naturalHeight,
    }
    const focusBox: FocusBox = {
      x: box.originX / img.naturalWidth,
      y: box.originY / img.naturalHeight,
      w: box.width / img.naturalWidth,
      h: box.height / img.naturalHeight,
    }

    const runnerUp = scored[1]
    const closeRace =
      Boolean(runnerUp) && runnerUp.score > best.score * 0.82

    const confidence = Math.min(0.95, 0.45 + best.score * 1.2)
    const nearEdge =
      point.x < 0.12 || point.x > 0.88 || point.y < 0.1 || point.y > 0.88

    return {
      point,
      box: focusBox,
      source: 'face',
      confidence,
      needsReview: closeRace || nearEdge || confidence < 0.55,
      faceCount: detections.length,
    }
  } catch {
    return {
      point: { x: 0.5, y: 0.42 },
      source: 'center',
      confidence: 0.2,
      needsReview: true,
      faceCount: 0,
    }
  }
}
