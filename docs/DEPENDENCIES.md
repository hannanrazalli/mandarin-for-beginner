# Phase 1 dependency verification

Checked 2026-10-24 using the official npm registry latest dist-tag and package engine/peer metadata.
Node in this environment: 24.19.0; pnpm: 11.25.0. Exact direct versions and lockfile will be committed.

| Package | Verified stable version |
| --- | --- |
| react | 19.3.1 |
| react-dom | 19.3.1 |
| vite | 8.3.5 |
| @vitejs/plugin-react | 6.1.2 |
| typescript | 7.0.2 |
| tailwindcss | 4.3.3 |
| @tailwindcss/vite | 4.3.3 |
| motion | 14.6.0 |
| react-router-dom | 7.18.4 |
| lucide-react | 1.61.0 |
| vite-plugin-pwa | 2.0.0 |
| @biomejs/biome | 2.6.2 |
| vitest | 5.0.5 |
| jsdom | 30.1.3 |
| @testing-library/react | 16.3.3 |
| @testing-library/jest-dom | 7.0.1 |
| @testing-library/user-event | 14.6.8 |
| @playwright/test | 1.64.1 |
| @axe-core/playwright | 4.14.0 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| @types/node | 26.6.5 |
| @fontsource-variable/nunito-sans | 5.3.0 |
| @fontsource/noto-sans-sc | 5.3.1 |
| secretlint | 13.0.7 |
| @secretlint/secretlint-rule-preset-recommend | 13.0.7 |
| zustand | 5.0.16 |
| @testing-library/dom | 10.4.2 |
| workbox-build | 7.4.1 |
| workbox-window | 7.4.1 |

Official implementation references:
- [Vite](https://vite.dev/guide/): supported Node requirement is met.
- [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite): use the Vite plugin and CSS import.
- [React Router](https://reactrouter.com/start/declarative/installation): use client-side routes; installed react-router-dom latest registry version remains 7.x.
- [Motion accessibility](https://motion.dev/docs/react-accessibility): respect reduced-motion preferences.
- [Vite PWA](https://vite-pwa-org.netlify.app/guide/): generate a static shell service worker; no authenticated API runtime caching.

Only used dependencies are installed. TanStack Query, Supabase, Zod, charts and hanzi-writer are deferred to their feature phases.
Nunito Sans and Noto Sans SC are self-hosted to avoid third-party font requests.
Secretlint with the recommended ruleset supplies secret scanning; custom Git hook scans the staged tree.
Playwright uses the available system Chromium locally; CI installs its matching bundled Chromium.

GitHub Action tags/SHAs were resolved from official repositories via git ls-remote:
- actions/checkout: v7.0.1 (`3d3c42e5aac5ba805825da76410c181273ba90b1`).
- actions/setup-node: v7.1.0 (`949feb2413d6458794dcd2491c4babbbce0c15c1`).
- actions/upload-artifact: v7.0.2 (`cf430e030ddbb5b0abf93d22962f4752f3646cd9`).
- pnpm/action-setup: v6.1.0 (`ea17c68df8912ef543352723c149a84f56e3d413`).

pnpm latest registry is 12.15.0; this phase intentionally retains the environment-supported pnpm 11.25.0, pinned for reproducibility. App libraries use their verified latest stable pins.

Phase 2 registry checks (2026-10-24): @supabase/supabase-js 2.118.0; zod 4.6.7. Official auth/RLS/session guidance: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/auth/sessions.
