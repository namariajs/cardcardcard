-- Independent of processing_status (which tracks the Pagamentos approve/reject
-- pipeline that creates items). This is a separate, manual "GOM has dealt with
-- this one" note the GOM can set/unset directly from the Submissions view,
-- regardless of where that submission is in — or whether it ever goes through —
-- the payment-approval flow.

alter table form_submissions
  add column if not exists manually_processed boolean not null default false;
