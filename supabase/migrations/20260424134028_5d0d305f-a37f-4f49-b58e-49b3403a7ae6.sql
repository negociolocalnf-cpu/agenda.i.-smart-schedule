-- ENUMS
create type public.appointment_status as enum ('scheduled','confirmed','completed','no_show','canceled');
create type public.transaction_type as enum ('income','expense');

-- PROFESSIONALS
create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  specialty text,
  email text,
  phone text,
  color text default '#3B82F6',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_professionals_user on public.professionals(user_id);
alter table public.professionals enable row level security;
create policy "own_select_professionals" on public.professionals for select using (auth.uid() = user_id);
create policy "own_insert_professionals" on public.professionals for insert with check (auth.uid() = user_id);
create policy "own_update_professionals" on public.professionals for update using (auth.uid() = user_id);
create policy "own_delete_professionals" on public.professionals for delete using (auth.uid() = user_id);
create trigger trg_professionals_updated_at before update on public.professionals
  for each row execute function public.tg_set_updated_at();

-- PATIENTS
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  email text,
  phone text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_patients_user on public.patients(user_id);
create index idx_patients_user_name on public.patients(user_id, name);
alter table public.patients enable row level security;
create policy "own_select_patients" on public.patients for select using (auth.uid() = user_id);
create policy "own_insert_patients" on public.patients for insert with check (auth.uid() = user_id);
create policy "own_update_patients" on public.patients for update using (auth.uid() = user_id);
create policy "own_delete_patients" on public.patients for delete using (auth.uid() = user_id);
create trigger trg_patients_updated_at before update on public.patients
  for each row execute function public.tg_set_updated_at();

-- APPOINTMENTS
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  price numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_appointment_time check (ends_at > starts_at)
);
create index idx_appointments_user_starts on public.appointments(user_id, starts_at);
create index idx_appointments_patient on public.appointments(patient_id);
create index idx_appointments_professional on public.appointments(professional_id);
alter table public.appointments enable row level security;
create policy "own_select_appointments" on public.appointments for select using (auth.uid() = user_id);
create policy "own_insert_appointments" on public.appointments for insert with check (auth.uid() = user_id);
create policy "own_update_appointments" on public.appointments for update using (auth.uid() = user_id);
create policy "own_delete_appointments" on public.appointments for delete using (auth.uid() = user_id);
create trigger trg_appointments_updated_at before update on public.appointments
  for each row execute function public.tg_set_updated_at();

-- TRANSACTIONS
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  type public.transaction_type not null,
  category text,
  description text,
  amount numeric(10,2) not null check (amount >= 0),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_transactions_user_date on public.transactions(user_id, occurred_on desc);
alter table public.transactions enable row level security;
create policy "own_select_transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "own_insert_transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "own_update_transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "own_delete_transactions" on public.transactions for delete using (auth.uid() = user_id);
create trigger trg_transactions_updated_at before update on public.transactions
  for each row execute function public.tg_set_updated_at();