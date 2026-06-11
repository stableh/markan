import {
  flattenTextImagesOntoPdf,
  type FlattenHighlight,
  type FlattenImage,
  type FlattenInk,
  type FlattenShape,
  type FlattenTextImage,
} from './FlattenRenderer'

export type PdfExportRequest = {
  basePdfBytes: Uint8Array
  textImages: FlattenTextImage[]
  imageOverlays?: FlattenImage[]
  highlightOverlays?: FlattenHighlight[]
  inkOverlays?: FlattenInk[]
  shapeOverlays?: FlattenShape[]
}

export const exportFlattenedPdf = ({ basePdfBytes, textImages }: PdfExportRequest) =>
  flattenTextImagesOntoPdf(basePdfBytes, textImages)

export type PdfExportArtifacts = {
  outputPdfBytes: Uint8Array
  restartBasePdfBytes: Uint8Array
}

export const createPdfExportArtifacts = async ({
  basePdfBytes,
  textImages,
  imageOverlays = [],
  highlightOverlays = [],
  inkOverlays = [],
  shapeOverlays = [],
}: PdfExportRequest): Promise<PdfExportArtifacts> => {
  const outputPdfBytes = new Uint8Array(
    await flattenTextImagesOntoPdf(
      basePdfBytes,
      textImages,
      imageOverlays,
      highlightOverlays,
      inkOverlays,
      shapeOverlays,
    ),
  )
  const restartBasePdfBytes =
    imageOverlays.length > 0
      ? new Uint8Array(await flattenTextImagesOntoPdf(basePdfBytes, [], imageOverlays))
      : new Uint8Array(basePdfBytes)

  return {
    outputPdfBytes,
    restartBasePdfBytes,
  }
}
