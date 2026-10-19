import { describe, expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import { readFileSync, existsSync } from 'node:fs'
import worker from '../public/sw.js?raw'

function offlineWorker() {
  const handlers: Record<string, (event: unknown) => void> = {}
  const deleted: string[] = []
  const cache = { match: async (key: unknown) => key === '/index.html' ? new Response('planner shell') : undefined }
  runInNewContext(worker, {
    URL, Response,
    self: { location: { origin: 'https://planner.example' }, addEventListener: (name: string, callback: (event: unknown) => void) => { handlers[name] = callback } },
    caches: { open: async () => cache, keys: async () => ['other-app-cache', 'kidrhythm-shell-v1', 'kidrhythm-shell-v2'], delete: async (key: string) => { deleted.push(key) } },
    fetch: async () => { throw new Error('offline') },
  })
  return { handlers, deleted }
}

describe('public website and private planner boundary', () => {
  it('falls back to the planner shell only for a planner navigation', async () => {
    const { handlers } = offlineWorker()
    let result: Promise<Response> | undefined
    handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://planner.example/app/' }, respondWith: (value: Promise<Response>) => { result = value } })
    expect(await (await result)?.text()).toBe('planner shell')
    result = undefined
    handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://planner.example/privacy.html' }, respondWith: (value: Promise<Response>) => { result = value } })
    expect(result).toBeUndefined()
  })
  it('does not intercept external requests or delete other applications caches', async () => {
    const { handlers, deleted } = offlineWorker()
    let intercepted = false
    handlers.fetch({ request: { method: 'GET', mode: 'cors', url: 'https://thirdparty.example/asset.js' }, respondWith: () => { intercepted = true } })
    expect(intercepted).toBe(false)
    let activation: Promise<unknown> | undefined
    handlers.activate({ waitUntil: (value: Promise<unknown>) => { activation = value } })
    await activation
    expect(deleted).toEqual(['kidrhythm-shell-v1'])
  })
  it('publishes local editorial pages without active third-party loaders', () => {
    const root = new URL('../public/', import.meta.url)
    for (const file of ['landing.html', 'privacy.html', 'guides/morning-routine.html', 'guides/after-school.html', 'guides/quiet-time.html']) {
      const html = readFileSync(new URL(file, root), 'utf8')
      expect(html).toContain('ca-pub-9595222068473508')
      expect(html).not.toMatch(/<script|https?:\/\/[^"']+\.(?:js|css)/)
      for (const match of html.matchAll(/href="(\/guides\/[^"#?]+)"/g)) expect(existsSync(new URL(match[1].slice(1), root))).toBe(true)
    }
  })
})
