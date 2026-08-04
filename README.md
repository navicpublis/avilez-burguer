# Avilez Burguer

Hamburgueria premium — site de pedidos + painel administrativo, em React + Vite + TypeScript + TailwindCSS.

## Rodar

```bash
npm install
npm run dev
```

## Rotas

- `/` — site público: Hero, cardápio, carrinho (bottom sheets), checkout e envio pelo WhatsApp.
- `/pedido/:id` — acompanhamento do pedido pelo cliente, **em tempo real** (ex.: `/pedido/AVLZ-48392`).
- `/admin` — painel administrativo (dashboard + gestão de pedidos).

## Login do painel

- E-mail: `avilezburguer@gmail.com`
- Senha: `Rjr092325*`

> As credenciais ficam em `src/admin/auth.ts`. Isso roda no frontend e **não é segurança real** —
> serve só até a integração com backend (Supabase Auth), quando a autenticação vai para o servidor.

## Como os dados funcionam hoje

Ainda **sem banco**. Pedidos, carrinho e cliente ficam no `localStorage`; a atualização em tempo
real entre o painel e a tela do cliente usa `BroadcastChannel` (mais evento `storage`). Toda a
arquitetura (`src/services/orders-store.ts`) está pronta para trocar por Supabase depois, mantendo
a mesma API (`listOrders` / `getOrder` / `updateStatus` / `subscribe`).

## Estrutura

- `src/components` — UI, layout, seções, loja (sheets/carrinho), checkout, pedido (badge/timeline).
- `src/pages` — Home e a página pública de rastreio.
- `src/admin` — painel (login, layout, dashboard, gestão de pedidos), independente do site.
- `src/services` — cardápio, pedidos, status e store de sincronização.
- `src/store` — contexto da loja (carrinho + sheets).

## Fases entregues

1. Fundação (arquitetura + design system + layout)  ·  2. Hero  ·  3. Landing
4. Carrinho (bottom sheets)  ·  5. Checkout + WhatsApp  ·  6. Painel/Dashboard
7. Gestão de pedidos + rastreamento em tempo real
8. Gestão de produtos, categorias e adicionais (catálogo central)

## Deploy na Netlify

O projeto já vem pronto pra Netlify:
- `netlify.toml` — build `npm run build`, publica a pasta `dist`.
- `public/_redirects` — fallback de SPA (`/* → /index.html 200`), pra que `/admin` e
  `/pedido/:id` funcionem ao acessar direto ou dar refresh (senão a Netlify devolve 404).

Passo a passo:
1. Suba este projeto num repositório (GitHub/GitLab) ou arraste a pasta no painel da Netlify.
2. Se conectar por repositório, a Netlify lê o `netlify.toml` sozinha (build e publish já configurados).
3. Deploy manual por pasta: rode `npm install && npm run build` e arraste a pasta `dist` gerada
   no "Deploys" da Netlify.

Node 18+ recomendado.

## Fase 10 — Preparação para produção

- SEO: `index.html` com meta tags completas (title, description, Open Graph, Twitter Cards, canonical).
- PWA (estrutura, sem service worker): `public/site.webmanifest`, `theme-color`, ícones.
- Crawlers: `public/robots.txt` (bloqueia `/admin`) e `public/sitemap.xml`.
- Página 404 elegante (`src/pages/NotFound.tsx`) para rotas inexistentes; pedido inexistente e carrinho vazio já tratados.
- Auditoria: 0 erro de TypeScript, 0 import não utilizado, 0 arquivo órfão. `npm run build` (`tsc -b && vite build`) passa.
- Fallback SPA (`_redirects` + `netlify.toml`) cobre `/admin`, `/pedido/:id` e o 404.
