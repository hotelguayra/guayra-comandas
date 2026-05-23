-- Tabla para almacenar suscripciones de notificaciones push por usuario
create table if not exists push_subscriptions (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  subscription jsonb not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "usuarios gestionan sus propias suscripciones"
  on push_subscriptions for all
  using (auth.uid() = user_id);
