import { describe, expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import analyticsJs from '../public/analytics.js?raw'
import indexHtml from '../index.html?raw'

describe('private parent planner network boundary', () => {
  it('keeps third-party scripts and tracking loaders out of the planner shell', () => {
    expect(indexHtml).not.toMatch(/analytics\.js|googletagmanager|google-analytics|adsbygoogle|googlesyndication/)
    expect(indexHtml).toContain('content="no-referrer"')
  })
  it('leaves the legacy cached analytics URL inert without touching browser state', () => {
    const browser = new Proxy({}, { get() { throw new Error('Unexpected browser access') } })
    expect(() => runInNewContext(analyticsJs, { window: browser, document: browser })).not.toThrow()
  })
})
