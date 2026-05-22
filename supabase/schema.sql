-- ============================================
-- GUAYRÁ COMANDAS — Schema SQL para Supabase
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Profiles (extiende auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  rol text not null check (rol in ('admin', 'cocina', 'mozo')),
  activo boolean default true,
  created_at timestamptz default now()
);

-- Categorías
create table if not exists public.categorias (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  descripcion text,
  orden integer default 0,
  activo boolean default true,
  created_at timestamptz default now()
);

-- Productos
create table if not exists public.productos (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  descripcion text,
  precio decimal(10,2) not null check (precio >= 0),
  categoria_id uuid references public.categorias(id) on delete set null,
  disponible boolean default true,
  imagen_url text,
  created_at timestamptz default now()
);

-- Mesas
create table if not exists public.mesas (
  id uuid default gen_random_uuid() primary key,
  numero integer not null unique,
  nombre text,
  capacidad integer default 4 check (capacidad > 0),
  activa boolean default true,
  created_at timestamptz default now()
);

-- Pedidos
create table if not exists public.pedidos (
  id uuid default gen_random_uuid() primary key,
  mesa_id uuid references public.mesas(id),
  mozo_id uuid references public.profiles(id),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado')),
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pedido items
create table if not exists public.pedido_items (
  id uuid default gen_random_uuid() primary key,
  pedido_id uuid references public.pedidos(id) on delete cascade,
  producto_id uuid references public.productos(id),
  cantidad integer not null default 1 check (cantidad > 0),
  precio_unitario decimal(10,2) not null check (precio_unitario >= 0),
  notas text,
  created_at timestamptz default now()
);

-- ============================================
-- TRIGGER: updated_at automático
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pedidos_updated_at
  before update on public.pedidos
  for each row execute function update_updated_at();

-- ============================================
-- TRIGGER: crear profile al registrar usuario
-- ============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'rol', 'mozo')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.mesas enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;

-- Profiles
create policy "Usuarios ven su propio perfil" on public.profiles
  for select using (auth.uid() = id);

create policy "Admin ve todos los perfiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'admin')
  );

create policy "Admin actualiza perfiles" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'admin')
  );

-- Categorías (solo lectura para mozo/cocina, CRUD para admin)
create policy "Todos leen categorias activas" on public.categorias
  for select using (activo = true or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'admin')
  );

create policy "Admin gestiona categorias" on public.categorias
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'admin')
  );

-- Productos
create policy "Todos leen productos disponibles" on public.productos
  for select using (disponible = true or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'admin')
  );

create policy "Admin gestiona productos" on public.productos
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'admin')
  );

-- Mesas
create policy "Usuarios leen mesas activas" on public.mesas
  for select using (activa = true or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'admin')
  );

create policy "Admin gestiona mesas" on public.mesas
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'admin')
  );

-- Pedidos
create policy "Mozos ven sus pedidos" on public.pedidos
  for select using (
    mozo_id = auth.uid() or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol in ('admin', 'cocina'))
  );

create policy "Mozos crean pedidos" on public.pedidos
  for insert with check (mozo_id = auth.uid());

create policy "Cocina y admin actualizan pedidos" on public.pedidos
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol in ('admin', 'cocina', 'mozo'))
  );

create policy "Admin elimina pedidos" on public.pedidos
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'admin')
  );

-- Pedido items
create policy "Usuarios ven items de sus pedidos" on public.pedido_items
  for select using (
    exists (
      select 1 from public.pedidos pd
      where pd.id = pedido_id and (
        pd.mozo_id = auth.uid() or
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol in ('admin', 'cocina'))
      )
    )
  );

create policy "Mozos insertan items" on public.pedido_items
  for insert with check (
    exists (
      select 1 from public.pedidos pd
      where pd.id = pedido_id and pd.mozo_id = auth.uid()
    )
  );

-- ============================================
-- REALTIME
-- ============================================
alter publication supabase_realtime add table public.pedidos;
alter publication supabase_realtime add table public.pedido_items;

-- ============================================
-- DATOS DE EJEMPLO (opcional, descomentar)
-- ============================================

-- insert into public.mesas (numero, nombre, capacidad) values
--   (1, 'Terraza A', 4),
--   (2, 'Terraza B', 4),
--   (3, 'Interior', 6),
--   (4, 'Barra', 2),
--   (5, 'VIP', 8);

-- insert into public.categorias (nombre, orden) values
--   ('Entradas', 1),
--   ('Platos principales', 2),
--   ('Bebidas', 3),
--   ('Postres', 4);
