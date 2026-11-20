-- Reproduce el contrato mínimo de Auth en la base efímera de CI.
-- Este archivo se usa exclusivamente antes de la migración en PostgreSQL local.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
