# CLAUDE.md

Contexto para o Claude Code neste repositório.

## O que é

PWA pessoal de treino do Vinicius (uso no iPhone, instalado pelo Safari). Interface toda em **português do Brasil**. Hoje é 100% local (sem backend); pode crescer para multiusuário no futuro.

## Stack

- React 19 + TypeScript + Vite
- `vite-plugin-pwa` (service worker `autoUpdate`, manifest em `vite.config.ts`)
- Dexie (IndexedDB) + `dexie-react-hooks` (`useLiveQuery`) para dados
- `react-router-dom` com **HashRouter** (hospedagem estática no Cloudflare Pages)
- CSS puro em `src/index.css` (tema escuro, variáveis CSS, mobile first)

## Comandos

- `npm run dev` — servidor local (acessível na rede)
- `npm run build` — `tsc -b` + build de produção (rodar antes de commitar)
- `npm run lint` — oxlint

## Convenções

- `tsconfig` usa `verbatimModuleSyntax` e `erasableSyntaxOnly`: use `import type` para tipos e **não use `enum`** (use união de strings).
- Plano é um documento único aninhado (`Plan.workouts[].exercises[]`); edite com `updatePlan` / `updateWorkout` de `src/planOps.ts`.
- Mudou o formato de dados? Crie `db.version(N)` com `.upgrade()` em `src/db.ts`, nunca altere a versão existente.
- Logs de série se ligam ao exercício por `exerciseId` (com fallback por `exerciseName`).
- Não usar `alert/confirm/prompt`: use `Sheet`/`Confirm` de `src/components/Sheet.tsx`.
- Inputs com fonte de 16px (evita zoom do iOS); respeitar `env(safe-area-inset-*)`.
- Vídeos próprios ficam na tabela `videos` (Blob) e não entram no backup JSON.
