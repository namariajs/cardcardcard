-- Tracks whether a form submission has been turned into real items yet.
-- 'pending' = awaiting GOM approval in Pagamentos (see PaymentsTab); 'approved'
-- = items were created; 'rejected' = GOM declined it, no items exist for it.
-- Also the idempotency guard: approval only creates items when this is still
-- 'pending', so a double-click or re-processing can't create duplicates.

alter table form_submissions
  add column if not exists processing_status text not null default 'pending'
  check (processing_status in ('pending', 'approved', 'rejected'));

create policy "form_submissions_update_auth" on form_submissions
  for update to authenticated using (true) with check (true);
