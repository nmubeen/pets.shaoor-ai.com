-- A plain text column, deliberately not a Postgres enum like
-- service_providers.category — that one needs a migration (and, per
-- Postgres's own rule, a *separate* one from anything that uses the new
-- value) every time a category is added. Categories here are meant to
-- keep growing (Food, Toys, Grooming, ...), so the option list lives in
-- application code (lib/shopping-categories.ts) instead, where adding
-- one is a one-line change with no migration at all.
alter table menagerie.shopping_orders add column category text;
