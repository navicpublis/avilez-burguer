# Auditoria & Mapa de Migração — Avilez Burguer → Supabase

Este documento é o resultado da **auditoria (item 1)** e o **plano de migração
do localStorage (item 35)**. Ele guia os próximos blocos: a interface (telas,
componentes, hooks) **não muda** — só a camada de persistência por baixo.

## 1. Fontes de dados hoje (localStorage) e destino no Supabase

| Store / service (frontend)        | Chave localStorage        | Vira tabela(s) no Supabase                                  | Bloco |
|-----------------------------------|---------------------------|------------------------------------------------------------|-------|
| `catalog-store` (categorias)      | `avilez_catalog`          | `categories`                                               | 2     |
| `catalog-store` (produtos)        | `avilez_catalog`          | `products`                                                | 2     |
| `catalog-store` (adicionais)      | `avilez_catalog`          | `addon_groups`, `addons`, `product_addon_groups`          | 2     |
| `menu-data` (cardápio vendável)   | — (estático no código)    | `products` (unificado com o catálogo — fonte única)        | 2     |
| `neighborhoods-store`             | `avilez_neighborhoods`    | `delivery_zones`                                          | 2     |
| `settings-store`                  | `avilez_settings`         | `app_settings` (linhas: business/hours/landing/store)      | 2/6   |
| `coupons-store`                   | `avilez_coupons`          | `coupons`, `coupon_usages` (via `usage_count`)             | 5     |
| `orders-store` / `orders`         | `avilez_orders`           | `orders`, `order_items`, `order_item_addons`, `order_status_history` | 3 |
| `stock-store` (ingredientes)      | `avilez_stock`            | `ingredients`                                             | 5     |
| `stock-store` (receitas)          | `avilez_stock`            | `recipes`                                                 | 5     |
| `stock-store` (movimentações)     | `avilez_stock`            | `stock_movements`                                         | 5     |
| baixa idempotente                 | `avilez_stock_consumed`   | `stock_movements` (idempotência no banco via RPC)          | 5     |
| `reviews-store`                   | `avilez_reviews`          | `reviews`                                                 | 6     |
| `notes-store`                     | `avilez_notes`            | `notes`                                                   | 6     |
| `customers` (derivado)            | — (derivado de pedidos)   | `customers`, `customer_addresses`                         | 3     |
| auth admin (senha no código)      | `avilez_admin_remember`   | **Supabase Auth** + `admin_profiles`                       | 5     |
| dados do cliente no checkout      | `avilez_customer`         | **permanece local** (conveniência de preenchimento)        | —     |

## 2. Classificação do localStorage (item 35)

**PODE permanecer local** (nada sensível/compartilhado):
- `avilez_customer` — último nome/telefone/endereço digitado, só p/ pré-preencher o checkout.
- Carrinho ainda não finalizado (hoje vive no estado do `shop-context`, em memória) — segue local.
- Preferências visuais / formulário temporário.

**DEVE migrar para o Supabase** (fonte oficial compartilhada entre dispositivos):
- Pedidos, produtos, categorias, adicionais, clientes, cupons, estoque,
  receitas, movimentações, avaliações, configurações, bairros, anotações,
  status aberto/fechado, horários.

Depois da migração, os canais de sincronização locais atuais
(`BroadcastChannel` `*_rt` + evento `storage`) serão **substituídos por
Supabase Realtime** onde há benefício (pedidos, status, loja aberta/fechada,
acompanhamento). Não haverá dois bancos paralelos competindo.

## 3. Tabelas criadas (migrations 001–004)

- **Catálogo:** `categories`, `products`, `addon_groups`, `addons`, `product_addon_groups`
- **Entrega:** `delivery_zones`
- **Clientes:** `customers`, `customer_addresses`
- **Cupons:** `coupons`
- **Pedidos:** `orders`, `order_items`, `order_item_addons`, `order_status_history`
- **Estoque:** `ingredients`, `recipes`, `stock_movements`
- **Avaliações:** `reviews`
- **Anotações:** `notes`
- **Config/Perfil:** `app_settings`, `admin_profiles`

## 4. Operações críticas que vivem no banco (não no frontend)

Definidas em `003_functions.sql` (RPC, `security definer`):

- `create_order(payload)` — cria o pedido inteiro atômico; **o servidor calcula
  taxa e desconto** (não confia no front). Retorna `public_token` + `order_number`.
  → o pedido está salvo **antes** de abrir o WhatsApp (item 12).
- `validate_coupon(code, subtotal)` — validação real no banco (item 17).
- `change_order_status(order_id, status)` — admin; ao entrar em `confirmado`
  faz a **baixa de estoque idempotente** (itens 19/20).
- `consume_stock_for_order(order_id)` — idempotente (nunca baixa duas vezes).
- `cancel_order(order_id, reason)` — admin.
- `get_order_by_token(token)` — rastreio público seguro, sem expor dados alheios (item 16).
- `submit_review(token, rating, comment)` — cliente avalia pedido entregue (item 21).

## 5. Segurança (RLS — `002_rls.sql`)

- **Público (anon):** lê cardápio (produtos não-ocultos), bairros ativos,
  avaliações aprovadas, configurações e cupons (para feedback). **Não** altera
  catálogo/estoque/config, **não** lê pedidos/clientes alheios.
- **Pedido do cliente:** criado só pela RPC `create_order`; o cliente acompanha
  só pela RPC `get_order_by_token` (nunca lê a tabela `orders` direto).
- **Admin autenticado** (`is_admin()` = existe em `admin_profiles.active`):
  acesso completo de gestão.
- RLS ligada em **todas** as tabelas. Nada liberado amplamente para `anon`.

## 6. O que falta (próximos blocos — não feito no Bloco 1)

- **Bloco 2:** repositórios que trocam localStorage→Supabase mantendo as MESMAS
  APIs dos stores (UI intacta); migração dos produtos/adicionais do `menu-data`
  + catálogo para `products`/`addons` (seed gerado a partir dos dados atuais).
- **Bloco 3:** checkout chamando `create_order`; página `/pedido/:token`.
- **Bloco 4:** Realtime (pedido novo no admin; status no acompanhamento).
- **Bloco 5:** Supabase Auth (remove senha do frontend); estoque + cupons no banco.
- **Bloco 6:** avaliações, anotações, dashboard/relatórios/clientes lendo do banco,
  Storage de imagens, `SUPABASE-SETUP.md` passo a passo, auditoria final do localStorage.

---

## 7. Auditoria final do localStorage (Bloco 6)

Com o Supabase configurado, TODOS os stores abaixo têm o Supabase como **fonte
oficial** (hidratam do banco no load e escrevem no banco). O `localStorage`
permanece apenas como **espelho/fallback** (dev sem backend e leitura instantânea
no boot) — não como fonte de verdade. Não há dois bancos concorrendo: quando o
Supabase responde, o cache é substituído pelos dados dele.

| Chave localStorage        | Papel com Supabase ativo            | Fonte oficial |
|---------------------------|-------------------------------------|---------------|
| `avilez_catalog`          | espelho/fallback                    | Supabase (`categories/products/addons`) |
| `avilez_neighborhoods`    | espelho/fallback                    | Supabase (`delivery_zones`) |
| `avilez_settings`         | espelho/fallback                    | Supabase (`app_settings`) |
| `avilez_coupons`          | espelho/fallback                    | Supabase (`coupons`) |
| `avilez_stock`            | espelho/fallback                    | Supabase (`ingredients/recipes/stock_movements`) |
| `avilez_orders`           | espelho/fallback (mirror do admin)  | Supabase (`orders` + RPC) |
| `avilez_reviews`          | espelho/fallback                    | Supabase (`reviews`) |
| `avilez_notes`            | espelho/fallback                    | Supabase (`notes`) |
| `avilez_customer`         | **permanece local** (conveniência)  | — (pré-preenchimento do checkout) |
| `avilez_admin_remember`   | **só no modo dev** (sem Supabase)   | — (com Supabase, sessão é do Supabase Auth) |

Clientes, Dashboard e Relatórios **não** têm store próprio: derivam dos pedidos
(`orders`) já hidratados do Supabase — portanto usam dados reais do banco.

Operações críticas (login, cupom, confirmar pedido, estoque) **nunca** fingem
sucesso via localStorage quando o Supabase está configurado: se falham, mostram
erro na UI.
