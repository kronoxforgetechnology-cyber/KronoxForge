-- KronoxForge · Reseñas globales
-- Ejecuta esto UNA sola vez en Supabase → SQL Editor → New query → Run.
-- Crea la tabla de reseñas y las políticas para que funcione con la clave anon
-- desde el navegador (Row Level Security activado).

create table if not exists public.resenas (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email      text,
  name       text,
  text       text not null,
  rating     int  check (rating between 1 and 5),
  product    text,
  edited     boolean default false
);

alter table public.resenas enable row level security;

-- Cualquier visitante puede LEER las reseñas.
drop policy if exists resenas_select on public.resenas;
create policy resenas_select on public.resenas for select using (true);

-- Cualquier visitante autenticado en la web puede PUBLICAR.
drop policy if exists resenas_insert on public.resenas;
create policy resenas_insert on public.resenas for insert with check (true);

-- Permite EDITAR y BORRAR (la app limita cada reseña a su autor por correo).
drop policy if exists resenas_update on public.resenas;
create policy resenas_update on public.resenas for update using (true) with check (true);

drop policy if exists resenas_delete on public.resenas;
create policy resenas_delete on public.resenas for delete using (true);
