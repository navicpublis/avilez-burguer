-- ════════════════════════════════════════════════════════════════
-- AVILEZ BURGUER — 008_storage.sql
-- Bucket público de imagens (produtos, logo, avatar do admin) + policies.
-- Rode DEPOIS do 007_coupons_stock.sql.
--
-- Leitura: pública (as imagens precisam aparecer no site).
-- Escrita/alteração/remoção: SOMENTE admin autenticado e ativo (is_admin()).
-- Nada de Base64 grande no banco — as imagens ficam no Storage; as tabelas
-- guardam apenas a URL pública.
-- ════════════════════════════════════════════════════════════════

-- cria o bucket "imagens" (público para leitura). Idempotente.
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do nothing;

-- Policies na tabela storage.objects, restritas ao bucket "imagens".
drop policy if exists imagens_public_read on storage.objects;
create policy imagens_public_read on storage.objects
  for select using (bucket_id = 'imagens');

drop policy if exists imagens_admin_insert on storage.objects;
create policy imagens_admin_insert on storage.objects
  for insert with check (bucket_id = 'imagens' and is_admin());

drop policy if exists imagens_admin_update on storage.objects;
create policy imagens_admin_update on storage.objects
  for update using (bucket_id = 'imagens' and is_admin()) with check (bucket_id = 'imagens' and is_admin());

drop policy if exists imagens_admin_delete on storage.objects;
create policy imagens_admin_delete on storage.objects
  for delete using (bucket_id = 'imagens' and is_admin());
