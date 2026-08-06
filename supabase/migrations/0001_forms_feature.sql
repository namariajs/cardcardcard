-- Formulários feature: cadastro/members tables (replacing/supplementing the
-- gom-joiners-registry / memberRosters blobs in app_storage) plus the new
-- forms/form_items/form_item_options/form_submissions/form_submission_items
-- tables, their RLS policies, and a public storage bucket for item photos
-- and payment receipts.
--
-- RLS mirrors the app's actual access model: the "anon" role is anyone
-- browsing without being signed into Modo GOM; "authenticated" is a signed-in
-- GOM (see src/context/AppContext.jsx's `unlocked` / supabase.auth session).

-- ---------- cadastro ----------
-- Same id scheme (JNR-XXXXXX) as the existing client-generated genRegId(),
-- so existing display/lookup code needs no changes to id shape.
create table if not exists cadastro (
  id text primary key,
  apelido text not null,
  nome_completo text not null default '',
  phone text not null default '',
  social text not null,
  created_at timestamptz not null default now()
);

alter table cadastro enable row level security;

create policy "cadastro_select_all" on cadastro
  for select using (true);

create policy "cadastro_insert_all" on cadastro
  for insert with check (true);

create policy "cadastro_update_auth" on cadastro
  for update to authenticated using (true) with check (true);

create policy "cadastro_delete_auth" on cadastro
  for delete to authenticated using (true);

-- ---------- members ----------
-- Shared option source for form_item_options. MBR-XXXXXX ids, same
-- client-generated convention as itemCategories' genCategoryId().
create table if not exists members (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

alter table members enable row level security;

create policy "members_select_all" on members
  for select using (true);

create policy "members_insert_auth" on members
  for insert to authenticated with check (true);

create policy "members_update_auth" on members
  for update to authenticated using (true) with check (true);

create policy "members_delete_auth" on members
  for delete to authenticated using (true);

-- ---------- forms ----------
create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text not null default '',
  rules_text text not null default '',
  deadline timestamptz,
  status text not null default 'open' check (status in ('open', 'closed')),
  pix_key text not null default '',
  allow_card_payment boolean not null default false,
  card_contact_text text not null default '',
  thank_you_text text not null default '',
  join_group_link text not null default '',
  created_at timestamptz not null default now()
);

alter table forms enable row level security;

-- Public can see open forms (for /f/:slug); a signed-in GOM sees everything
-- (for the admin list view, including closed forms).
create policy "forms_select" on forms
  for select using (status = 'open' or auth.role() = 'authenticated');

create policy "forms_insert_auth" on forms
  for insert to authenticated with check (true);

create policy "forms_update_auth" on forms
  for update to authenticated using (true) with check (true);

create policy "forms_delete_auth" on forms
  for delete to authenticated using (true);

-- ---------- form_items ----------
create table if not exists form_items (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  photo_url text,
  instructions text not null default '',
  selection_type text not null check (selection_type in ('random', 'single_choice', 'multi_choice_qty')),
  order_index int not null default 0
);

create index if not exists form_items_form_id_idx on form_items(form_id);

alter table form_items enable row level security;

create policy "form_items_select" on form_items
  for select using (
    auth.role() = 'authenticated'
    or exists (select 1 from forms f where f.id = form_items.form_id and f.status = 'open')
  );

create policy "form_items_insert_auth" on form_items
  for insert to authenticated with check (true);

create policy "form_items_update_auth" on form_items
  for update to authenticated using (true) with check (true);

create policy "form_items_delete_auth" on form_items
  for delete to authenticated using (true);

-- ---------- form_item_options ----------
create table if not exists form_item_options (
  id uuid primary key default gen_random_uuid(),
  form_item_id uuid not null references form_items(id) on delete cascade,
  member_id text not null references members(id)
);

create index if not exists form_item_options_form_item_id_idx on form_item_options(form_item_id);

alter table form_item_options enable row level security;

create policy "form_item_options_select" on form_item_options
  for select using (
    auth.role() = 'authenticated'
    or exists (
      select 1 from form_items fi
      join forms f on f.id = fi.form_id
      where fi.id = form_item_options.form_item_id and f.status = 'open'
    )
  );

create policy "form_item_options_insert_auth" on form_item_options
  for insert to authenticated with check (true);

create policy "form_item_options_update_auth" on form_item_options
  for update to authenticated using (true) with check (true);

create policy "form_item_options_delete_auth" on form_item_options
  for delete to authenticated using (true);

-- ---------- form_submissions ----------
create table if not exists form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  cadastro_id text not null references cadastro(id),
  payment_method text not null check (payment_method in ('pix', 'cartao')),
  amount_paid numeric not null default 0,
  receipt_file_url text,
  receipt_drive_link text,
  comments text not null default '',
  agreed_to_terms boolean not null default false,
  joined_group boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists form_submissions_form_id_idx on form_submissions(form_id);
create index if not exists form_submissions_cadastro_id_idx on form_submissions(cadastro_id);

alter table form_submissions enable row level security;

-- Anyone can submit; nobody but a signed-in GOM can read submissions back
-- (so the public can never see other people's answers).
create policy "form_submissions_insert_all" on form_submissions
  for insert with check (true);

create policy "form_submissions_select_auth" on form_submissions
  for select to authenticated using (true);

create policy "form_submissions_delete_auth" on form_submissions
  for delete to authenticated using (true);

-- ---------- form_submission_items ----------
create table if not exists form_submission_items (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references form_submissions(id) on delete cascade,
  form_item_id uuid not null references form_items(id) on delete cascade,
  option_id uuid references form_item_options(id),
  quantity int not null default 1
);

create index if not exists form_submission_items_submission_id_idx on form_submission_items(submission_id);

alter table form_submission_items enable row level security;

create policy "form_submission_items_insert_all" on form_submission_items
  for insert with check (true);

create policy "form_submission_items_select_auth" on form_submission_items
  for select to authenticated using (true);

create policy "form_submission_items_delete_auth" on form_submission_items
  for delete to authenticated using (true);

-- ---------- storage: form-uploads bucket ----------
-- Item photos + payment receipts. Public read (so <img src> works directly,
-- same as every other photo in this app); anyone can upload (item photos are
-- GOM-only via the admin UI, receipts are anon-submitted); only a signed-in
-- GOM can update/delete.
insert into storage.buckets (id, name, public)
values ('form-uploads', 'form-uploads', true)
on conflict (id) do nothing;

create policy "form_uploads_select_all" on storage.objects
  for select using (bucket_id = 'form-uploads');

create policy "form_uploads_insert_all" on storage.objects
  for insert with check (bucket_id = 'form-uploads');

create policy "form_uploads_update_auth" on storage.objects
  for update to authenticated using (bucket_id = 'form-uploads');

create policy "form_uploads_delete_auth" on storage.objects
  for delete to authenticated using (bucket_id = 'form-uploads');
