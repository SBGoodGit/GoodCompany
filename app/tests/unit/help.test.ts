// Step A: every page with a heading has a "How it works" text, and every ⓘ icon points at an existing topic.
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { PAGE_HELP, TOPIC_HELP } from '../../shared/help'
import { PAGE_META } from '../../composables/usePageMeta'

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]))

describe('How it works texts', () => {
  it('every page in the work environment has a page text', () => {
    expect(Object.keys(PAGE_META).filter((k) => !PAGE_HELP[k])).toEqual([])
  })
  it('every ⓘ icon in the pages points at an existing topic, and every topic is used', () => {
    const used = new Set(files('pages').flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/<HelpInfo topic="([^"]+)"/g)].map((m) => m[1])))
    expect([...used].filter((t) => !TOPIC_HELP[t])).toEqual([])
    expect(Object.keys(TOPIC_HELP).filter((t) => !used.has(t))).toEqual([])
  })
  it('every text names what it is for and its basis in the specification', () => {
    for (const e of [...Object.values(PAGE_HELP), ...Object.values(TOPIC_HELP)]) {
      expect(e.what.length).toBeGreaterThan(10)
      expect(e.basis).toMatch(/Build Spec|D\d|OD\d/)
    }
  })
})
