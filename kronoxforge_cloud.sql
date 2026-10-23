-- ============================================================
-- KRONOX FORGE — Esquema SQL para la nube (PostgreSQL / Supabase)
-- Registro de cuentas + comentarios
-- Ejecuta este script en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Extensión para generar UUIDs (en Supabase ya viene disponible)
create extension if not exists "pgcrypto";


-- ============================================================
-- OPCIÓN A (RECOMENDADA): usar la autenticación de Supabase
-- Supabase ya guarda el correo y la contraseña (cifrada) en
-- la tabla interna auth.users cuando el usuario se registra con
-- supabase.auth.signUp(). Aquí solo guardamos el PERFIL público.
-- ============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Crea automáticamente el perfil al registrarse un usuario nuevo
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seguridad a nivel de fila (RLS): cada quien ve/edita su propio perfil
alter table public.profiles enable row level security;

drop policy if exists "perfiles visibles para todos" on public.profiles;
create policy "perfiles visibles para todos"
  on public.profiles for select
  using (true);

drop policy if exists "el usuario edita su perfil" on public.profiles;
create policy "el usuario edita su perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ============================================================
-- OPCIÓN B (ALTERNATIVA): tabla de cuentas propia
-- Úsala SOLO si NO usas la autenticación de Supabase.
-- ⚠️ IMPORTANTE: nunca guardes la contraseña en texto plano.
--    Guarda un HASH (bcrypt / argon2) generado en el servidor.
-- ============================================================

create table if not exists public.accounts (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  password_hash  text not null,                 -- hash, NUNCA la clave real
  full_name      text,
  phone          text,
  role           text not null default 'user',  -- 'user' | 'admin'
  created_at     timestamptz not null default now()
);

create index if not exists accounts_email_idx on public.accounts (lower(email));

-- Ejemplo de inserción (el hash se calcula en tu backend, aquí es ilustrativo):
-- insert into public.accounts (email, password_hash, full_name)
-- values ('cliente@ejemplo.com', '$2b$10$....hash_bcrypt....', 'Juan Pérez');


-- ============================================================
-- COMENTARIOS
-- Un usuario con sesión puede publicar; solo el autor puede
-- editar o borrar sus propios comentarios.
-- Esta versión referencia auth.users (Opción A).
-- Si usas la Opción B, cambia la referencia a public.accounts(id).
-- ============================================================

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  author_name text,
  body        text not null check (char_length(body) between 2 and 600),
  edited      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists comments_created_idx on public.comments (created_at desc);

-- Marca "edited" y actualiza la fecha al editar
create or replace function public.touch_comment()
returns trigger
language plpgsql
as $$
begin
  if (new.body is distinct from old.body) then
    new.edited := true;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists comments_touch on public.comments;
create trigger comments_touch
  before update on public.comments
  for each row execute function public.touch_comment();

-- RLS para comentarios
alter table public.comments enable row level security;

-- Cualquiera puede leer los comentarios
drop policy if exists "comentarios: lectura pública" on public.comments;
create policy "comentarios: lectura pública"
  on public.comments for select
  using (true);

-- Solo un usuario autenticado puede crear, y a nombre propio
drop policy if exists "comentarios: crear propio" on public.comments;
create policy "comentarios: crear propio"
  on public.comments for insert
  with check (auth.uid() = user_id);

-- Solo el autor puede editar su comentario
drop policy if exists "comentarios: editar propio" on public.comments;
create policy "comentarios: editar propio"
  on public.comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Solo el autor puede borrar su comentario
drop policy if exists "comentarios: borrar propio" on public.comments;
create policy "comentarios: borrar propio"
  on public.comments for delete
  using (auth.uid() = user_id);


-- ============================================================
-- EJEMPLOS DE USO DESDE EL FRONTEND (supabase-js v2)
-- ============================================================
-- 1) Registro de cuenta (Opción A):
--    await supabase.auth.signUp({
--      email, password,
--      options: { data: { full_name: 'Juan Pérez' } }
--    });
--
-- 2) Iniciar sesión:
--    await supabase.auth.signInWithPassword({ email, password });
--
-- 3) Publicar comentario:
--    const { data: { user } } = await supabase.auth.getUser();
--    await supabase.from('comments').insert({
--      user_id: user.id,
--      author_name: user.user_metadata.full_name,
--      body: texto
--    });
--
-- 4) Editar comentario propio:
--    await supabase.from('comments').update({ body: nuevoTexto }).eq('id', comentarioId);
--
-- 5) Listar comentarios:
--    await supabase.from('comments').select('*').order('created_at', { ascending: false });
-- ============================================================
