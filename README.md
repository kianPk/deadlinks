# deadlinks

**Find broken links in your Markdown & HTML — zero dependencies.**

Perfect for README / docs CI checks.

[![CI](https://github.com/kianPk/deadlinks/actions/workflows/ci.yml/badge.svg)](https://github.com/kianPk/deadlinks/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/Node-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Install

```bash
npx deadlinks README.md
# or global
npm i -g deadlinks
```

## Usage

```bash
deadlinks README.md
deadlinks ./docs --concurrency 12 --timeout 10000
deadlinks README.md --json    # summary counts + per-URL results
```

Exit code `1` if any link fails (broken or timeout). Summary line:

```text
Summary: 8 ok · 1 broken · 0 timeout · 1 failed (exit 1)
```

Drop into GitHub Actions:

```yaml
- run: npx deadlinks README.md
```

## Features

- Walks directories (skips `node_modules` / `.git`)
- Unique URL dedupe
- HEAD with GET fallback
- Concurrent checks

## License

MIT © [kianPk](https://github.com/kianPk)
