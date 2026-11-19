# 🏋️ Treino App

App pessoal de treino (PWA) para iPhone: planos de treino editáveis, vídeo de cada exercício, registro de cargas série a série, timer de descanso e histórico de evolução. Funciona offline e instala na tela de início pelo Safari, sem App Store.

## Funcionalidades

- **Treino do dia** pela agenda da semana do plano ativo (ex.: segunda = A, terça = B…)
- **Registro por série**: kg e reps, com a carga da última vez como referência
- **Timer de descanso** automático depois de cada série (bip + vibração quando disponível)
- **Vídeos**: link do YouTube (abre embutido) ou vídeo próprio gravado no celular (salvo no aparelho)
- **Vários planos**: criar, duplicar, editar, reordenar treinos e exercícios, ativar outro plano
- **Histórico**: treinos feitos, volume, duração e evolução de carga por exercício
- **Backup** em JSON (exportar/importar) em Ajustes
- Já vem com o plano **PPL ×2 – Perda de gordura** cadastrado

## Rodar no computador

```bash
npm install
npm run dev
```

O `dev` sobe com `host: true`: com o PC e o iPhone no mesmo Wi-Fi, dá para abrir `http://IP-DO-PC:5173` no celular e testar. O service worker (offline) só funciona no build de produção.

```bash
npm run build     # gera dist/
npm run preview   # serve o build localmente
```

## Publicar de graça (Cloudflare Pages)

1. Suba este repositório no GitHub.
2. No painel da Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, escolha o repo.
3. Configuração do build:
   - Framework preset: **Vite** (ou nenhum)
   - Build command: `npm run build`
   - Output directory: `dist`
4. Cada `git push` na `main` publica sozinho. O app atualiza no iPhone na próxima vez que abrir.

Alternativa pela CLI: `npx wrangler pages deploy dist --project-name treino-app`.

## Instalar no iPhone

1. Abra a URL do Cloudflare Pages no **Safari**.
2. Toque em **Compartilhar → Adicionar à Tela de Início**.
3. Abra pelo ícone: tela cheia e offline.

> ⚠️ Os dados ficam no armazenamento do Safari **do próprio app instalado**. Se apagar o ícone, os dados vão junto. Use **Ajustes → Exportar backup** de vez em quando.

## Estrutura

```
src/
  types.ts            Tipos: Plan, Workout, Exercise, Session, SetLog
  db.ts               Banco local (Dexie/IndexedDB), backup, helpers
  seed.ts             Plano PPL ×2 inicial
  planOps.ts          Operações de edição de planos/treinos/exercícios
  hooks.ts            Hooks de leitura (plano ativo etc.)
  components/
    RestTimer.tsx     Timer de descanso global
    Video.tsx         YouTube embutido / vídeo próprio / link
    Sheet.tsx         Painel inferior e confirmação
  pages/
    Home.tsx          Treino do dia + lista de treinos
    WorkoutSession.tsx  Execução do treino e registro das séries
    Plans.tsx         Lista de planos
    PlanEditor.tsx    Treinos do plano + agenda da semana
    WorkoutEditor.tsx Exercícios do treino + formulário com vídeo
    History.tsx       Histórico e evolução de carga
    Settings.tsx      Backup, instalação, restaurar plano padrão
```

## Ideias para depois

- Aba de **dieta** e **lista de compras** semanal
- Sincronizar entre aparelhos (Cloudflare Workers + D1) e login, se um dia virar app para mais gente
- Gráfico maior de evolução e medidas corporais (peso, cintura, InBody)
- Empacotar como app nativo com Capacitor, se quiser publicar na App Store
