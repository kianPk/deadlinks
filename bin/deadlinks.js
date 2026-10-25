#!/usr/bin/env node
/**
 * deadlinks — scan Markdown/HTML for broken http(s) links
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
if (args.includes('-h') || args.includes('--help') || args.length === 0) {
  console.log(`deadlinks — find broken links in Markdown / HTML

Usage:
  deadlinks <file|dir> [--timeout <ms>] [--concurrency <n>] [--json]

Examples:
  deadlinks README.md
  deadlinks ./docs --concurrency 12 --timeout 10000
`)
  process.exit(args.length === 0 ? 2 : 0)
}

let timeout = 8000
let concurrency = 8
let jsonOut = false
const roots = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--timeout') timeout = Number(args[++i])
  else if (args[i] === '--concurrency') concurrency = Number(args[++i])
  else if (args[i] === '--json') jsonOut = true
  else roots.push(args[i])
}

const LINK_RE = /https?:\/\/[^\s)\]>'"]+/gi

function walk(p, out = []) {
  const st = fs.statSync(p)
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(p)) {
      if (name === 'node_modules' || name === '.git') continue
      walk(path.join(p, name), out)
    }
  } else if (/\.(md|markdown|html?)$/i.test(p)) {
    out.push(p)
  }
  return out
}

function extract(file) {
  const text = fs.readFileSync(file, 'utf8')
  const set = new Set()
  for (const m of text.matchAll(LINK_RE)) {
    let u = m[0].replace(/[.,;:!?]+$/, '')
    set.add(u)
  }
  return [...set]
}

async function check(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'deadlinks/1.1 (+https://github.com/kianPk/deadlinks)' },
    })
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'user-agent': 'deadlinks/1.1 (+https://github.com/kianPk/deadlinks)' },
      })
    }
    clearTimeout(t)
    return { url, ok: res.status >= 200 && res.status < 400, status: res.status }
  } catch (e) {
    clearTimeout(t)
    const isTimeout = e.name === 'AbortError'
    return {
      url,
      ok: false,
      status: 0,
      error: isTimeout ? 'timeout' : e.message,
      timeout: isTimeout,
    }
  }
}

async function pool(items, n, fn) {
  const results = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()))
  return results
}

const files = roots.flatMap((r) => walk(path.resolve(r)))
if (!files.length) {
  console.error('no .md/.html files found')
  process.exit(2)
}

const byUrl = new Map()
for (const f of files) {
  for (const u of extract(f)) {
    if (!byUrl.has(u)) byUrl.set(u, [])
    byUrl.get(u).push(f)
  }
}

const urls = [...byUrl.keys()]
if (!jsonOut) {
  console.log(`scanning ${urls.length} unique link(s) from ${files.length} file(s)… (timeout ${timeout}ms)`)
}
const results = await pool(urls, concurrency, check)

const ok = results.filter((r) => r.ok)
const bad = results.filter((r) => !r.ok)
const timeouts = bad.filter((r) => r.timeout)
const broken = bad.filter((r) => !r.timeout)

if (!jsonOut) {
  for (const r of ok) {
    console.log(`  ✓ ${r.status}  ${r.url}`)
  }
  for (const r of bad) {
    const where = byUrl.get(r.url).map((f) => path.relative(process.cwd(), f)).join(', ')
    console.log(`  ✗ ${r.status || r.error}  ${r.url}`)
    console.log(`      in: ${where}`)
  }
}

const summary = {
  files: files.length,
  unique_urls: urls.length,
  ok: ok.length,
  broken: broken.length,
  timeout: timeouts.length,
  failed: bad.length,
  exit_code: bad.length ? 1 : 0,
}

if (jsonOut) {
  console.log(
    JSON.stringify(
      {
        ...summary,
        results: results.map((r) => ({
          url: r.url,
          ok: r.ok,
          status: r.status,
          error: r.error ?? null,
          files: byUrl.get(r.url).map((f) => path.relative(process.cwd(), f)),
        })),
      },
      null,
      2,
    ),
  )
} else {
  console.log(
    `\nSummary: ${summary.ok} ok · ${summary.broken} broken · ${summary.timeout} timeout · ${summary.failed} failed (exit ${summary.exit_code})`,
  )
}

process.exit(summary.exit_code)
