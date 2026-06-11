type PdfOpenErrorLike = {
  code?: unknown
  message?: unknown
  name?: unknown
}

const asErrorLike = (error: unknown): PdfOpenErrorLike => {
  if (error && typeof error === 'object') {
    return error as PdfOpenErrorLike
  }

  return {}
}

export const getPdfOpenErrorMessage = (error: unknown) => {
  const errorLike = asErrorLike(error)
  const name = typeof errorLike.name === 'string' ? errorLike.name : ''
  const code = typeof errorLike.code === 'string' ? errorLike.code : ''
  const message = typeof errorLike.message === 'string' ? errorLike.message : ''
  const normalized = `${name} ${code} ${message}`.toLowerCase()

  if (name === 'PasswordException' || normalized.includes('password')) {
    return 'Password-protected PDFs are not supported yet.'
  }

  if (name === 'InvalidPDFException' || normalized.includes('invalid pdf')) {
    return 'This file is not a valid PDF.'
  }

  if (code === 'EACCES' || code === 'EPERM' || normalized.includes('permission')) {
    return 'The PDF could not be read because permission was denied.'
  }

  return 'The PDF could not be opened.'
}
