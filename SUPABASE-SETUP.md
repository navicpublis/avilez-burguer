# Guia de Configuração — Avilez Burguer + Supabase + Vercel

Este guia é passo a passo e para iniciante. Faça na ordem. Ao terminar, o site
e o painel estarão usando o Supabase como banco de dados oficial, com pedidos em
tempo real entre aparelhos.

> Você só precisa de duas informações secretas: a **Project URL** e a **anon key**.
> Nunca use a chave `service_role` no site. Nunca coloque senha no código.

---

## Parte 1 — Projeto Supabase

### 1. Entrar / criar o projeto
1. Acesse https://supabase.com e faça login.
2. Se ainda não tem projeto: **New project** → dê um nome (ex.: `avilez-burguer`),
   defina uma senha de banco (guarde-a) e a região mais próxima (ex.: South America).
3. Aguarde alguns minutos até o projeto ficar pronto.

### 2. Onde encontrar a Project URL
1. No projeto, menu lateral → **Project Settings** (engrenagem).
2. Clique em **Data API**.
3. Copie o campo **Project URL** (algo como `https://xxxxxxxx.supabase.co`).

### 3. Onde encontrar a chave pública correta
1. Ainda em **Project Settings** → **API Keys**.
2. Copie a chave **anon** (também chamada **publishable**). É a chave pública,
   pode ir para o site.
3. **NÃO** use a chave `service_role` (é secreta e nunca vai para o frontend).

---

## Parte 2 — Variáveis de ambiente (.env)

### 4. Como criar o .env
Na raiz do projeto existe um arquivo `.env.example`. Faça uma cópia dele chamada
`.env` (o `.env` já está no `.gitignore`, então não vai para o GitHub).

### 5. O que colocar nele
Abra o `.env` e preencha com os SEUS valores da Parte 1:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=cole_aqui_a_chave_anon
```

Salve. Pronto — o site já sabe conversar com o seu Supabase.

---

## Parte 3 — Banco de dados (migrations)

### 6. Como rodar as migrations
1. No Supabase, menu lateral → **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo da migration no seu computador (pasta `supabase/migrations/`),
   copie TODO o conteúdo, cole no editor e clique em **Run**.
4. Repita para cada arquivo, **na ordem exata** abaixo.

### 7. Ordem exata das migrations
Rode uma de cada vez, nesta ordem:

1. `001_schema.sql` — cria todas as tabelas.
2. `002_rls.sql` — segurança (quem pode ler/escrever cada coisa).
3. `003_functions.sql` — funções (criar pedido, cupom, status…).
4. `004_seed.sql` — bairros de Mangaratiba + configurações iniciais.
5. `005_seed_catalog.sql` — o cardápio (categorias, produtos, adicionais).
6. `006_realtime.sql` — tempo real (pedido novo/atualização de status).
7. `007_coupons_stock.sql` — uso de cupom + baixa de estoque idempotente.
8. `008_storage.sql` — bucket de imagens (produtos, logo, avatar).

Se alguma rodar com aviso "already exists", tudo bem — elas foram feitas para
poder rodar de novo sem quebrar.

### 8. Como configurar o Realtime
A migration `006_realtime.sql` já habilita o Realtime nas tabelas certas
(`orders`, `order_status_history`, `app_settings`). Não precisa mexer em nada.
Se quiser conferir: **Database** → **Replication** → o publication
`supabase_realtime` deve listar essas tabelas.

### 9. Como configurar o Storage
A migration `008_storage.sql` já cria o bucket **imagens** (público para leitura,
escrita só para admin). Para conferir: menu lateral → **Storage** → deve existir
o bucket `imagens`.

---

## Parte 4 — Primeiro usuário Admin

### 10. Criar o primeiro usuário Admin
1. Menu lateral → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Preencha e-mail e senha (marque **Auto Confirm User** para já ficar ativo).
3. Clique em **Create user**.

### 11. Como pegar o UID
Na lista de usuários, clique no usuário que você acabou de criar e copie o
**User UID** (um código longo). Você vai usar no próximo passo.

### 12. SQL exato para criar o admin_profile
No **SQL Editor**, rode (troque `COLE_O_UID_AQUI` pelo UID copiado):

```sql
insert into admin_profiles (id, display_name, role, active)
values ('COLE_O_UID_AQUI', 'Avilez Burguer', 'Administrador', true);
```

Só quem tem um registro aqui com `active = true` consegue entrar no painel.

---

## Parte 5 — Testar tudo (local)

Rode o projeto no seu computador (`npm install` e depois `npm run dev`) e teste:

### 13. Testar login
Acesse `/admin`. Sem sessão, aparece a tela de login. Entre com o e-mail e a
senha do usuário criado. Deve abrir o painel. Recarregue a página: deve continuar
logado. Clique em **Sair**: deve voltar ao login.

### 14. Testar pedido
No site, adicione itens ao carrinho, escolha um bairro, finalize. O pedido deve
ser salvo (e só então abrir o WhatsApp). No painel (**Pedidos**), o pedido aparece.

### 15. Testar Realtime
Abra o site em um aparelho e o painel em outro (ou duas abas). Faça um pedido no
site: ele aparece no painel **sem apertar F5**. Mude o status no painel: a página
de acompanhamento do cliente (`/pedido/…`) atualiza sozinha.

### 16. Testar estoque
Cadastre um ingrediente com quantidade (ex.: Pão = 100), monte a ficha técnica de
um produto (ex.: 1 pão). Faça um pedido desse produto e **Confirme** no painel: o
estoque cai (100 → 99). Confirme de novo o mesmo pedido: continua 99 (nunca 98).
Se o estoque for insuficiente, o painel mostra "Estoque insuficiente…" e não
confirma.

### 17. Testar cupom
Crie um cupom em **Cupons** (ex.: 10%). No checkout, aplique-o: desconto correto.
Digite um código que não existe (ex.: `TESTE123`) ou `AVILEZ10`: deve recusar com
"Cupom incorreto ou indisponível".

### 18. Testar avaliação
Quando houver uma avaliação (status pendente), ela aparece em **Avaliações** no
painel. Aprove: ela passa a aparecer no site. Reprove/oculte: some do site.

---

## Parte 6 — Produção (Vercel)

### 19. Colocar VITE_SUPABASE_URL na Vercel
1. Acesse o projeto na Vercel → **Settings** → **Environment Variables**.
2. **Key**: `VITE_SUPABASE_URL` · **Value**: sua Project URL · **Save**.

### 20. Colocar VITE_SUPABASE_ANON_KEY na Vercel
Repita: **Key**: `VITE_SUPABASE_ANON_KEY` · **Value**: sua chave anon · **Save**.
(Marque para os ambientes Production/Preview/Development conforme quiser.)

### 21. Como fazer redeploy
Após salvar as variáveis, vá em **Deployments** → no último deploy, menu **⋯** →
**Redeploy**. (Ou faça um novo `git push` — a Vercel publica sozinha.)

### 22. Como testar produção
Abra o site publicado. Refaça os testes 14–18 no domínio real. Faça um pedido pelo
celular e confirme que aparece no painel aberto em outro aparelho, em tempo real.

---

## Checklist rápido

- [ ] `.env` criado com URL e anon key (nunca a service_role).
- [ ] Migrations 001 → 008 rodadas na ordem.
- [ ] Bucket `imagens` existe (Storage).
- [ ] Primeiro admin criado (Authentication) + `admin_profiles` com `active = true`.
- [ ] Login funciona e persiste ao recarregar.
- [ ] Pedido salva no banco e aparece no painel em tempo real.
- [ ] Estoque baixa uma única vez ao confirmar.
- [ ] Cupom inexistente e `AVILEZ10` são recusados.
- [ ] Variáveis configuradas na Vercel + redeploy.

Se algo não funcionar, quase sempre é: variável de ambiente faltando/errada, uma
migration não rodada, ou o `admin_profiles` sem o registro com `active = true`.
