-- Temperature is another thing normally checked at a vet visit alongside
-- weight (0016_drop_groups_add_weight.sql) — same treatment: optional,
-- captured right on the visit rather than a separate log-vitals flow.
-- Fahrenheit specifically (not stored as Celsius and converted for
-- display) since that's the unit vets in this app's market read
-- thermometers in.
alter table menagerie.visits add column temperature_f numeric;
