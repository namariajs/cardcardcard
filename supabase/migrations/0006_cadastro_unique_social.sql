-- Database-level guarantee that no two cadastro rows can share the same @
-- handle (case-insensitive) — stronger than any application-level check,
-- so no current or future write path can silently create a duplicate for
-- the same person. Safe to apply now: the table is currently empty, so
-- this can't fail on a pre-existing collision.

create unique index if not exists cadastro_social_lower_idx on cadastro (lower(social));
