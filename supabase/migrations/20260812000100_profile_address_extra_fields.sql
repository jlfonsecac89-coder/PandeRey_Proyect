-- Frontend integral: registro pide RUT/género/fecha de nacimiento
-- (género y fecha de nacimiento opcionales, para marketing/cumpleaños —
-- decisión explícita del cliente, no estaban en el blueprint original);
-- direcciones necesitan distinguir casa/departamento y el número de depto.
alter table profiles add column gender text;
alter table profiles add column birth_date date;

alter table addresses add column housing_type text check (housing_type in ('casa', 'departamento'));
alter table addresses add column depto_numero text;

-- protect_profile_columns (business_triggers.sql) protege columnas fijas
-- por nombre — gender/birth_date no son sensibles del mismo modo que
-- role/rut_encrypted/etc, así que un cliente puede seguir editándolas junto
-- con full_name/phone (self_update_profile ya lo permite a nivel de fila,
-- protect_profile_columns no las incluye en su lista de columnas protegidas
-- por lo tanto ya quedan editables sin cambios adicionales).
