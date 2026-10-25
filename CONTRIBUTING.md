# Contributing to deadlinks

## Run locally

```bash
node bin/deadlinks.js README.md
node bin/deadlinks.js ./docs --timeout 10000 --json
```

Node 18+ required (native `fetch`).

## CI

Syntax check plus a smoke scan of `README.md` in GitHub Actions.

## PRs

- Update `CHANGELOG.md`.
- Stay zero-dependency in `package.json`.
- Keep exit code `0` when all links ok, `1` when any failure, `2` for usage / no files.
