-- Adds a free-text group_name to members (e.g. "SKZOO", "Stray Kids") so the
-- Formulários item option-picker can organize a long member list visually.
-- Not an enum on purpose — GOM should be able to type a brand new group name
-- without a code change. Existing members are backfilled into a "Geral"
-- default group rather than left null, so nothing renders as ungrouped.

alter table members add column if not exists group_name text not null default 'Geral';
