-- Synthetic auth fixture ONLY: this does not exercise GoTrue or JWT verification.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- Emulate Supabase's broad defaults; migration must explicitly remove them.
alter default privileges in schema public grant all on tables to anon, authenticated;
