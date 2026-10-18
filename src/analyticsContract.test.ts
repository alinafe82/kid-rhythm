import { describe, expect, it } from 'vitest'

import analyticsJs from '../public/analytics.js?raw'
import indexHtml from '../index.html?raw'

describe('public analytics contract', () => {
  it('loads the same-origin analytics script from the app shell', () => {
    expect(indexHtml).toContain('<script src="/analytics.js" defer></script>')
  })

  it('keeps GA4 page measurement production-only and data-minimal', () => {
    expect(analyticsJs).toContain('G-2VT1V5192S')
    expect(analyticsJs).toContain('window.location.protocol !== "https:"')
    expect(analyticsJs).toContain('www.googletagmanager.com/gtag/js')
    expect(analyticsJs).toContain('window.gtag("config", measurementId')
    expect(analyticsJs).toContain('allow_google_signals: false')
    expect(analyticsJs).toContain('allow_ad_personalization_signals: false')
    expect(analyticsJs).not.toMatch(
      /localStorage|sessionStorage|household|schedule|feedback|profile|planner/i,
    )
  })
})
