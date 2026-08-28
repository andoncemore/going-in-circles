import { loadFont as loadSharedFont, useFont as useSharedFont, type FontState } from '../_shared/font'

export const FONT_PATH = '/fonts/Tempo-Bold-Custom.otf'

export type { FontState }

export const loadFont = () => loadSharedFont(FONT_PATH)
export const useFont = (): FontState => useSharedFont(FONT_PATH)
