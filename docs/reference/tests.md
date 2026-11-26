# Tests reference

```bash
npm ci
npm test               # node --test; NODE_OPTIONS=--test-reporter=tap npm test for TAP
npm run lint           # ESLint, Google style
npm run format:check   # Prettier, Google settings (npm run format to fix)
```

Node 24 (`.nvmrc`). Without a global Node: `nix shell nixpkgs#nodejs_24`.

| Suite | Checks |
|---|---|
| `test/manifest.test.mjs` | each file parses; no name defined twice; one step, its name in no source file; callbacks defined; declared outputs == returned; card field == manifest input; exactly two scopes; no DocumentApp/DriveApp/advanced-service call; PKCE verifier from `pkceVerifier()`, never `generateCodeVerifier()`; allowlist rules; OAuth2.gs hash |
| `test/execute.test.mjs` | the whole execute path against fakes: not connected, 401 (resets the connection), 404, HTTP 500, fetch error, non-JSON, over 2 MB, invalid résumé, Drive 403, valid run (one HTML upload, two styling calls, every output), title input, best-effort styling, envelope-only logging, allowlisted URLs only |
| `test/render.test.mjs` | HTML escaping against a hostile résumé, the `href` guard, export links, section order and absence, the live-run styling findings |
| `test/step.test.mjs` | the live event payload shape, strict validation, connect cards, plain-text flattening |
| `test/registry.test.mjs` | real résumés from the live registry; each **skips** when it cannot be fetched |

`npm test -- --test-reporter=tap` does **not** work: npm appends the flag after the glob, and Node
ignores it. Use `NODE_OPTIONS`.

Apps Script cannot run off Google's servers, so the Studio integration itself has to be verified
by installing the add-on. The fakes prove the step's own control flow; the service shapes they
fake were measured live ([building notes](../explanation/building-notes.md)).
