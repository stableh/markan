import { flattenTextImagesOntoPdf, type FlattenTextImage } from './FlattenRenderer'

export type PdfExportRequest = {
  basePdfBytes: Uint8Array
  textImages: FlattenTextImage[]
}

export const exportFlattenedPdf = ({ basePdfBytes, textImages }: PdfExportRequest) =>
  flattenTextImagesOntoPdf(basePdfBytes, textImages)
