const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const plainTextToContentHtml = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')
