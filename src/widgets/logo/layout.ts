import type { Font } from 'opentype.js'
import { ROUNDABOUT_NATIVE_WIDTH, ROUNDABOUT_NATIVE_HEIGHT } from './roundabout-path'

export interface Layout {
  width: number
  height: number
  topTransform: string
  textPathD: string | null
  fontSize: number | null
  textOriginX: number | null
  textOriginY: number | null
}

const NATIVE_GAP = 15
const REF_FONT_SIZE = 100

export function computeLayout(font: Font, text: string, width: number): Layout {

  const topScale = width / ROUNDABOUT_NATIVE_WIDTH
  const topH = ROUNDABOUT_NATIVE_HEIGHT * topScale
  const gap = NATIVE_GAP * topScale
  const topTransform = `scale(${topScale})`

  if (text.length === 0) {
    return { width, height: topH, topTransform, textPathD: null, fontSize: null, textOriginX: null, textOriginY: null }
  }

  const refPath = font.getPath(text, 0, 0, REF_FONT_SIZE)
  const bb = refPath.getBoundingBox()
  const inkW = bb.x2 - bb.x1
  const inkLeft = bb.x1
  const ascent = -bb.y1
  const descent = bb.y2

  const s = width / inkW
  const fontSize = REF_FONT_SIZE * s
  const textOriginX = -inkLeft * s
  const textOriginY = topH + gap + ascent * s
  const height = topH + gap + (ascent + descent) * s

  const textPathD = font.getPath(text, textOriginX, textOriginY, fontSize).toPathData(2)

  return { width, height, topTransform, textPathD, fontSize, textOriginX, textOriginY }
}
