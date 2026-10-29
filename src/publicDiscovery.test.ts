import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const origin = 'https://kid-rhythm.vercel.app'

describe('public discovery and private planner', () => {
  it('lists only real public documents with matching canonical URLs', () => {
    const sitemap = read('public/sitemap.xml')
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
    expect(urls.length).toBe(6)
    for (const url of urls) {
      expect(url.startsWith(origin + '/')).toBe(true)
      const path = new URL(url).pathname
      const html = read('public/' + (path === '/' ? 'landing.html' : path.slice(1)))
      expect(html).toContain('rel="canonical" href="' + url + '"')
      expect(html).not.toMatch(/googlesyndication|adsbygoogle|googletagmanager/)
    }
    expect(sitemap).not.toMatch(/\/app|index\.html/)
    expect(read('public/robots.txt')).toContain('Sitemap: ' + origin + '/sitemap.xml')
  })
  it('keeps planner URLs out of search without blocking crawler access to noindex', () => {
    expect(read('index.html')).toContain('name="robots" content="noindex, nofollow"')
    const config = JSON.parse(read('vercel.json'))
    const noindex = config.routes.find((route: { headers?: Record<string, string> }) => route.headers?.['X-Robots-Tag'] === 'noindex, nofollow')
    const matcher = new RegExp(noindex.src)
    for (const path of ['/app', '/app/', '/app/nested', '/index.html']) expect(matcher.test(path)).toBe(true)
    for (const path of ['/', '/privacy', '/guides/morning-routine.html', '/application']) expect(matcher.test(path)).toBe(false)
    expect(read('public/robots.txt')).not.toContain('Disallow: /app')
  })
  it('maps only explicit support aliases and preserves the planner route', () => {
    const config = JSON.parse(read('vercel.json'))
    const destination = (path: string) => config.routes.find((route: { src?: string, dest?: string }) => route.dest && new RegExp(route.src!).test(path))?.dest
    expect(destination('/privacy')).toBe('/privacy.html')
    expect(destination('/contact')).toBe('/contact.html')
    expect(destination('/app/')).toBe('/index.html')
    expect(destination('/missing')).toBeUndefined()
    expect(read('public/contact.html')).toContain('Issues are public')
  })
})
