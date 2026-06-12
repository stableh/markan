import type { HighlightOverlayObject, OverlayObject } from './OverlayObject'

export const splitHighlightOverlayObjects = (objects: OverlayObject[]) => {
  const highlightObjects: HighlightOverlayObject[] = []
  const nonHighlightObjects: OverlayObject[] = []

  for (const object of objects) {
    if (object.type === 'highlight') {
      highlightObjects.push(object)
    } else {
      nonHighlightObjects.push(object)
    }
  }

  return { highlightObjects, nonHighlightObjects }
}
