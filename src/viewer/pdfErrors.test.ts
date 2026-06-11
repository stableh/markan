import { describe, expect, it } from 'vitest'
import { getPdfOpenErrorMessage } from './pdfErrors'

describe('getPdfOpenErrorMessage', () => {
  it('returns a clear unsupported message for password-protected PDFs', () => {
    expect(getPdfOpenErrorMessage({ name: 'PasswordException', message: 'No password given' })).toBe(
      'Password-protected PDFs are not supported yet.',
    )
  })

  it('returns a clear invalid file message for invalid PDFs', () => {
    expect(getPdfOpenErrorMessage({ name: 'InvalidPDFException', message: 'Invalid PDF structure' })).toBe(
      'This file is not a valid PDF.',
    )
  })

  it('returns a clear permission message for file permission failures', () => {
    expect(getPdfOpenErrorMessage({ code: 'EACCES', message: 'permission denied' })).toBe(
      'The PDF could not be read because permission was denied.',
    )
  })
})
