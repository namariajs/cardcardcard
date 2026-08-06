-- One-time backfill of the new `cadastro` table from the existing
-- gom-joiners-registry blob in app_storage. The blob row itself is left
-- untouched afterwards — it stays as a frozen backup snapshot, the app just
-- stops reading/writing it once AppContext switches to the `cadastro` table.
--
-- Safe to re-run: `on conflict (id) do nothing` skips rows already migrated.

insert into cadastro (id, apelido, nome_completo, phone, social)
select
  elem->>'id',
  elem->>'apelido',
  coalesce(elem->>'nomeCompleto', ''),
  coalesce(elem->>'phone', ''),
  elem->>'social'
from app_storage,
     jsonb_array_elements(value::jsonb) as elem
where key = 'gom-joiners-registry'
on conflict (id) do nothing;
