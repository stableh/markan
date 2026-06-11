import { describe, expect, it } from 'vitest'

import { plainTextToContentHtml } from './plainTextToContentHtml'

describe('plainTextToContentHtml', () => {
  it('wraps clipboard text lines as paragraphs', () => {
    expect(plainTextToContentHtml('hello\nworld')).toBe('<p>hello</p><p>world</p>')
  })

  it('escapes clipboard text before inserting it into rich text content', () => {
    expect(plainTextToContentHtml('<script>alert("x")</script>')).toBe(
      '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>',
    )
  })
})
