-- Tags where a cadastro row came from — specifically "Importar joiners dos
-- itens" (bulk-creating Cadastro entries from item joiner @handles that
-- were never formally registered). Nullable: existing rows, manual
-- "Cadastrar joiner" entries, and public-form self-registrations are left
-- null (i.e. "not from this import"), not backfilled with a guessed value.

alter table cadastro add column if not exists source text;
