-- YMALPP ERP core schema for Supabase/PostgreSQL.
-- Paste this file in Supabase SQL Editor or run it with Supabase CLI.

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

do $$
begin
  create type public.app_role as enum (
    'admin',
    'socio',
    'licitaciones',
    'ventas',
    'rh',
    'logistica'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.member_status as enum ('activo', 'invitado', 'suspendido');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.contract_type as enum ('licitacion', 'directo', 'marco', 'servicio');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.workflow_status as enum (
    'borrador',
    'activo',
    'pendiente_aprobacion',
    'aprobado',
    'rechazado',
    'cerrado',
    'cancelado',
    'en_riesgo'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_status as enum ('pendiente', 'subido', 'aprobado', 'rechazado');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.approval_status as enum (
    'pendiente',
    'aprobado',
    'rechazado',
    'informacion_requerida'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.approval_subject as enum (
    'producto_fuera_contrato',
    'cambio',
    'correccion',
    'modificacion'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.inventory_movement_type as enum ('entrada', 'salida', 'ajuste', 'apartado', 'liberacion');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status as enum (
    'borrador',
    'pendiente_aprobacion',
    'aprobado',
    'en_proceso',
    'entregado',
    'cancelado'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.report_format as enum ('excel', 'pdf', 'png');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.export_status as enum ('pendiente', 'procesando', 'completado', 'fallido');
exception when duplicate_object then null;
end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  rfc text,
  logo_url text,
  primary_color text default '#0f6f8f',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_rfc_unique unique (rfc)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'ventas',
  status public.member_status not null default 'invitado',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_memberships_unique_user unique (company_id, user_id)
);

create table if not exists public.role_permissions (
  role public.app_role not null,
  permission text not null,
  created_at timestamptz not null default now(),
  primary key (role, permission)
);

insert into public.role_permissions (role, permission)
values
  ('admin', 'users.manage'),
  ('admin', 'system.configure'),
  ('admin', 'approvals.manage'),
  ('admin', 'bids.manage'),
  ('admin', 'contracts.read'),
  ('admin', 'contracts.manage'),
  ('admin', 'quotes.manage'),
  ('admin', 'orders.manage'),
  ('admin', 'shipments.manage'),
  ('admin', 'inventory.manage'),
  ('admin', 'clients.manage'),
  ('admin', 'hr.manage'),
  ('admin', 'payroll.manage'),
  ('admin', 'finance.read'),
  ('admin', 'finance.manage'),
  ('admin', 'reports.export'),
  ('admin', 'audit.read'),
  ('socio', 'approvals.manage'),
  ('socio', 'contracts.read'),
  ('socio', 'hr.manage'),
  ('socio', 'finance.read'),
  ('socio', 'finance.manage'),
  ('socio', 'reports.export'),
  ('socio', 'audit.read'),
  ('licitaciones', 'bids.manage'),
  ('licitaciones', 'contracts.read'),
  ('licitaciones', 'reports.export'),
  ('ventas', 'contracts.read'),
  ('ventas', 'quotes.manage'),
  ('ventas', 'orders.manage'),
  ('ventas', 'clients.manage'),
  ('ventas', 'reports.export'),
  ('rh', 'hr.manage'),
  ('rh', 'payroll.manage'),
  ('rh', 'reports.export'),
  ('logistica', 'contracts.read'),
  ('logistica', 'shipments.manage'),
  ('logistica', 'orders.manage'),
  ('logistica', 'inventory.manage')
on conflict do nothing;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cm.company_id
  from public.company_memberships cm
  where cm.user_id = auth.uid()
    and cm.status = 'activo'
  order by cm.created_at asc
  limit 1
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.status = 'activo'
  )
$$;

create or replace function public.has_permission(target_company_id uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_memberships cm
    join public.role_permissions rp on rp.role = cm.role
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.status = 'activo'
      and rp.permission = required_permission
  )
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.change_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id),
  table_name text not null,
  record_id uuid not null,
  field_name text not null,
  old_value text,
  new_value text,
  reason text default current_setting('app.change_reason', true),
  created_at timestamptz not null default now()
);

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_company_id uuid;
  record_id uuid;
begin
  record_company_id := coalesce((to_jsonb(new)->>'company_id')::uuid, (to_jsonb(old)->>'company_id')::uuid);
  record_id := coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid);

  insert into public.audit_events (
    company_id,
    actor_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  )
  values (
    record_company_id,
    auth.uid(),
    tg_op,
    tg_table_name,
    record_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.log_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  key text;
  old_json jsonb := to_jsonb(old);
  new_json jsonb := to_jsonb(new);
  record_company_id uuid := coalesce((new_json->>'company_id')::uuid, (old_json->>'company_id')::uuid);
begin
  for key in select jsonb_object_keys(new_json)
  loop
    if key in ('updated_at', 'created_at') then
      continue;
    end if;

    if old_json->key is distinct from new_json->key then
      insert into public.change_log (
        company_id,
        actor_id,
        table_name,
        record_id,
        field_name,
        old_value,
        new_value
      )
      values (
        record_company_id,
        auth.uid(),
        tg_table_name,
        new.id,
        key,
        old_json->>key,
        new_json->>key
      );
    end if;
  end loop;

  return new;
end;
$$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  name text not null,
  legal_name text,
  rfc text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_company_rfc_unique unique (company_id, rfc)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  description text,
  status public.workflow_status not null default 'activo',
  start_date date,
  end_date date,
  risk_level text not null default 'bajo' check (risk_level in ('bajo', 'medio', 'alto')),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sectors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sectors_company_name_unique unique (company_id, name)
);

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  sector_id uuid not null references public.sectors(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requirements_company_sector_name_unique unique (company_id, sector_id, name)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  unit text not null default 'pieza',
  default_price numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_company_sku_unique unique (company_id, sku)
);

create table if not exists public.contract_document_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  contract_type public.contract_type,
  name text not null,
  required boolean not null default true,
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_document_template_unique unique (company_id, contract_type, name)
);

create unique index if not exists idx_contract_document_templates_unique_scope
on public.contract_document_templates (
  coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
  contract_type,
  lower(name)
);

insert into public.contract_document_templates (company_id, contract_type, name, required, sort_order)
values
  (null, 'licitacion', 'Acta constitutiva', true, 10),
  (null, 'licitacion', 'Poder notarial', true, 20),
  (null, 'licitacion', 'Opinion SAT', true, 30),
  (null, 'licitacion', 'Opinion IMSS', true, 40),
  (null, 'licitacion', 'Opinion INFONAVIT', true, 50),
  (null, 'licitacion', 'Constancia situacion fiscal', true, 60),
  (null, 'licitacion', 'Identificacion representante legal', true, 70),
  (null, 'licitacion', 'Comprobante domicilio', true, 80),
  (null, 'licitacion', 'Declaraciones', true, 90),
  (null, 'licitacion', 'Propuesta tecnica', true, 100),
  (null, 'licitacion', 'Propuesta economica', true, 110),
  (null, 'licitacion', 'Garantias', true, 120),
  (null, 'licitacion', 'Fianzas', true, 130),
  (null, 'licitacion', 'Catalogo de conceptos', true, 140),
  (null, 'licitacion', 'Junta de aclaraciones', true, 150),
  (null, 'licitacion', 'Acta de fallo', true, 160)
on conflict do nothing;

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  contract_type public.contract_type not null,
  code text not null,
  name text not null,
  amount numeric(14,2) not null default 0,
  currency text not null default 'MXN',
  start_date date not null,
  end_date date not null,
  responsible_user_id uuid references auth.users(id),
  status public.workflow_status not null default 'borrador',
  financial_progress numeric(5,2) not null default 0 check (financial_progress between 0 and 100),
  physical_progress numeric(5,2) not null default 0 check (physical_progress between 0 and 100),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_company_code_unique unique (company_id, code),
  constraint contracts_dates_valid check (end_date >= start_date)
);

create table if not exists public.contract_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  item_number text not null,
  sector_id uuid references public.sectors(id) on delete set null,
  requirement_id uuid references public.requirements(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  description text,
  contracted_quantity numeric(14,3) not null check (contracted_quantity > 0),
  delivered_quantity numeric(14,3) not null default 0 check (delivered_quantity >= 0),
  pending_quantity numeric(14,3) generated always as (contracted_quantity - delivered_quantity) stored,
  unit_price numeric(14,2) not null default 0,
  amount numeric(14,2) generated always as (contracted_quantity * unit_price) stored,
  status public.workflow_status not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_items_unique_number unique (contract_id, item_number),
  constraint contract_items_delivered_not_over check (delivered_quantity <= contracted_quantity)
);

create table if not exists public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  template_id uuid references public.contract_document_templates(id) on delete set null,
  name text not null,
  required boolean not null default true,
  status public.document_status not null default 'pendiente',
  current_version int not null default 0,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_documents_unique_name unique (contract_id, name)
);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  contract_document_id uuid not null references public.contract_documents(id) on delete cascade,
  version int not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  status public.document_status not null default 'subido',
  uploaded_by uuid references auth.users(id) default auth.uid(),
  comments text,
  created_at timestamptz not null default now(),
  constraint document_versions_unique_version unique (contract_document_id, version)
);

create or replace function public.create_contract_document_checklist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.contract_documents (
    company_id,
    contract_id,
    template_id,
    name,
    required
  )
  select
    new.company_id,
    new.id,
    t.id,
    t.name,
    t.required
  from public.contract_document_templates t
  where t.active = true
    and t.contract_type = new.contract_type
    and (
      (new.contract_type = 'licitacion' and t.company_id is null)
      or t.company_id = new.company_id
    )
  order by t.sort_order
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists create_contract_document_checklist_trigger on public.contracts;
create trigger create_contract_document_checklist_trigger
after insert on public.contracts
for each row execute function public.create_contract_document_checklist();

create table if not exists public.quote_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  name text not null,
  logo_url text,
  primary_color text not null default '#0f6f8f',
  secondary_color text not null default '#26836d',
  header jsonb not null default '{}'::jsonb,
  footer jsonb not null default '{}'::jsonb,
  signature jsonb not null default '{}'::jsonb,
  canvas_schema jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_templates_company_name_unique unique (company_id, name)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  template_id uuid references public.quote_templates(id) on delete set null,
  folio text not null,
  title text not null,
  status public.workflow_status not null default 'borrador',
  subtotal numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  valid_until date,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_company_folio_unique unique (company_id, folio)
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null default 0,
  amount numeric(14,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  folio text not null,
  status public.order_status not null default 'borrador',
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_company_folio_unique unique (company_id, folio)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  contract_item_id uuid references public.contract_items(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null default 0,
  in_contract boolean not null default true,
  status public.order_status not null default 'borrador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  subject public.approval_subject not null,
  module text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.approval_status not null default 'pendiente',
  requested_by uuid references auth.users(id) default auth.uid(),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_actions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  approval_id uuid not null references public.approvals(id) on delete cascade,
  action public.approval_status not null,
  comment text,
  actor_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function public.flag_out_of_contract_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  order_folio text;
begin
  if new.contract_item_id is null or new.in_contract = false then
    new.in_contract := false;
    new.status := 'pendiente_aprobacion';

    select o.folio into order_folio
    from public.orders o
    where o.id = new.order_id;

    insert into public.approvals (
      company_id,
      subject,
      module,
      title,
      payload,
      status,
      requested_by
    )
    values (
      new.company_id,
      'producto_fuera_contrato',
      'pedidos',
      'Producto fuera de contrato en pedido ' || coalesce(order_folio, new.order_id::text),
      jsonb_build_object(
        'order_id', new.order_id,
        'order_item_id', new.id,
        'product_id', new.product_id,
        'quantity', new.quantity
      ),
      'pendiente',
      auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists flag_out_of_contract_order_item_trigger on public.order_items;
create trigger flag_out_of_contract_order_item_trigger
before insert or update of contract_item_id, in_contract on public.order_items
for each row execute function public.flag_out_of_contract_order_item();

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warehouses_company_name_unique unique (company_id, name)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  stock numeric(14,3) not null default 0,
  reserved_quantity numeric(14,3) not null default 0,
  available_quantity numeric(14,3) generated always as (stock - reserved_quantity) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_unique unique (warehouse_id, product_id),
  constraint inventory_quantities_valid check (stock >= 0 and reserved_quantity >= 0 and reserved_quantity <= stock)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity numeric(14,3) not null check (quantity > 0),
  reference_table text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  contract_id uuid references public.contracts(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  quantity numeric(14,3) not null check (quantity > 0),
  status public.workflow_status not null default 'activo',
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.remissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete restrict,
  folio text,
  delivery_date date not null default current_date,
  status text not null default 'emitida',
  received_by text,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint remissions_company_folio_unique unique (company_id, folio)
);

create table if not exists public.remission_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  remission_id uuid not null references public.remissions(id) on delete cascade,
  contract_item_id uuid not null references public.contract_items(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  quantity numeric(14,3) not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create or replace function public.validate_remission_item_quantity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ci public.contract_items%rowtype;
  pending numeric(14,3);
  old_quantity numeric(14,3) := 0;
begin
  select *
  into ci
  from public.contract_items
  where id = new.contract_item_id
  for update;

  if not found then
    raise exception 'Contract item not found: %', new.contract_item_id;
  end if;

  if ci.product_id <> new.product_id then
    raise exception 'Remission product does not match contract item product.';
  end if;

  if tg_op = 'UPDATE' then
    old_quantity := old.quantity;
  end if;

  pending := ci.contracted_quantity - ci.delivered_quantity + old_quantity;

  if new.quantity > pending then
    raise exception 'Remission quantity % exceeds pending quantity % for contract item %',
      new.quantity,
      pending,
      new.contract_item_id;
  end if;

  new.company_id := ci.company_id;
  return new;
end;
$$;

create or replace function public.sync_contract_item_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta numeric(14,3);
  target_contract_item_id uuid;
begin
  if tg_op = 'INSERT' then
    delta := new.quantity;
    target_contract_item_id := new.contract_item_id;
  elsif tg_op = 'UPDATE' then
    delta := new.quantity - old.quantity;
    target_contract_item_id := new.contract_item_id;
  else
    delta := -old.quantity;
    target_contract_item_id := old.contract_item_id;
  end if;

  update public.contract_items
  set delivered_quantity = delivered_quantity + delta,
      updated_at = now()
  where id = target_contract_item_id;

  if tg_op in ('INSERT', 'UPDATE') and new.warehouse_id is not null then
    insert into public.inventory_movements (
      company_id,
      warehouse_id,
      product_id,
      movement_type,
      quantity,
      reference_table,
      reference_id,
      notes
    )
    values (
      new.company_id,
      new.warehouse_id,
      new.product_id,
      'salida',
      abs(delta),
      'remission_items',
      new.id,
      'Salida automatica por remision'
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists validate_remission_item_quantity_trigger on public.remission_items;
create trigger validate_remission_item_quantity_trigger
before insert or update on public.remission_items
for each row execute function public.validate_remission_item_quantity();

drop trigger if exists sync_contract_item_delivered_trigger on public.remission_items;
create trigger sync_contract_item_delivered_trigger
after insert or update or delete on public.remission_items
for each row execute function public.sync_contract_item_delivered();

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  full_name text not null,
  curp text,
  rfc text,
  nss text,
  address text,
  phone text,
  email text,
  labor_contract_type text,
  base_salary numeric(14,2) not null default 0,
  benefits jsonb not null default '{}'::jsonb,
  status public.workflow_status not null default 'activo',
  hired_at date,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employees_company_rfc_unique unique (company_id, rfc)
);

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  name text not null,
  storage_path text not null,
  status public.document_status not null default 'subido',
  uploaded_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status public.workflow_status not null default 'borrador',
  total_base_salary numeric(14,2) not null default 0,
  total_bonuses numeric(14,2) not null default 0,
  total_deductions numeric(14,2) not null default 0,
  total_isr numeric(14,2) not null default 0,
  total_imss numeric(14,2) not null default 0,
  total_net numeric(14,2) not null default 0,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payroll_period_valid check (period_end >= period_start)
);

create table if not exists public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  base_salary numeric(14,2) not null default 0,
  bonuses numeric(14,2) not null default 0,
  deductions numeric(14,2) not null default 0,
  isr numeric(14,2) not null default 0,
  imss numeric(14,2) not null default 0,
  net_pay numeric(14,2) generated always as (base_salary + bonuses - deductions - isr - imss) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  name text not null,
  account_type text not null check (account_type in ('ingreso', 'egreso', 'nomina', 'operativo', 'proyecto', 'contrato')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_accounts_company_name_unique unique (company_id, name)
);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  account_id uuid not null references public.finance_accounts(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  amount numeric(14,2) not null,
  transaction_date date not null default current_date,
  description text,
  reference text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  channel text not null default 'panel' check (channel in ('panel', 'correo', 'whatsapp')),
  title text not null,
  body text,
  read_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  module text not null,
  format public.report_format not null,
  filters jsonb not null default '{}'::jsonb,
  status public.export_status not null default 'pendiente',
  storage_path text,
  requested_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create or replace view public.financial_dashboard
with (security_invoker = true)
as
select
  c.id as company_id,
  coalesce(sum(ft.amount) filter (where fa.account_type = 'ingreso'), 0) as ingresos,
  coalesce(abs(sum(ft.amount) filter (where fa.account_type = 'egreso')), 0) as egresos,
  coalesce(abs(sum(ft.amount) filter (where fa.account_type = 'nomina')), 0) as nomina,
  coalesce(abs(sum(ft.amount) filter (where fa.account_type = 'operativo')), 0) as gastos_operativos,
  coalesce(sum(ft.amount), 0) as utilidad_neta
from public.companies c
left join public.finance_transactions ft on ft.company_id = c.id
left join public.finance_accounts fa on fa.id = ft.account_id
group by c.id;

create or replace view public.project_dashboard
with (security_invoker = true)
as
select
  c.company_id,
  count(*) filter (where c.status = 'activo') as contratos_activos,
  count(*) filter (where c.status = 'en_riesgo') as proyectos_en_riesgo,
  avg(c.financial_progress) as avance_financiero_promedio,
  avg(c.physical_progress) as avance_fisico_promedio,
  count(a.id) filter (where a.status = 'pendiente') as aprobaciones_pendientes
from public.contracts c
left join public.approvals a on a.company_id = c.company_id
group by c.company_id;

create index if not exists idx_company_memberships_user on public.company_memberships(user_id);
create index if not exists idx_clients_company on public.clients(company_id);
create index if not exists idx_projects_company on public.projects(company_id);
create index if not exists idx_contracts_company_status on public.contracts(company_id, status);
create index if not exists idx_contracts_client on public.contracts(client_id);
create index if not exists idx_contract_items_contract on public.contract_items(contract_id);
create index if not exists idx_contract_items_product on public.contract_items(product_id);
create index if not exists idx_contract_documents_contract on public.contract_documents(contract_id);
create index if not exists idx_document_versions_document on public.document_versions(contract_document_id);
create index if not exists idx_orders_company_status on public.orders(company_id, status);
create index if not exists idx_remissions_contract on public.remissions(contract_id);
create index if not exists idx_remission_items_contract_item on public.remission_items(contract_item_id);
create index if not exists idx_inventory_items_product on public.inventory_items(product_id);
create index if not exists idx_inventory_movements_reference on public.inventory_movements(reference_table, reference_id);
create index if not exists idx_approvals_company_status on public.approvals(company_id, status);
create index if not exists idx_audit_events_company_created on public.audit_events(company_id, created_at desc);
create index if not exists idx_change_log_record on public.change_log(table_name, record_id);
create index if not exists idx_finance_transactions_company_date on public.finance_transactions(company_id, transaction_date desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'companies',
    'profiles',
    'company_memberships',
    'clients',
    'projects',
    'sectors',
    'requirements',
    'products',
    'contract_document_templates',
    'contracts',
    'contract_items',
    'contract_documents',
    'quote_templates',
    'quotes',
    'orders',
    'order_items',
    'warehouses',
    'inventory_items',
    'inventory_reservations',
    'employees',
    'payroll_runs',
    'finance_accounts'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'touch_' || table_name || '_updated_at',
      table_name
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      'touch_' || table_name || '_updated_at',
      table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clients',
    'projects',
    'contracts',
    'contract_items',
    'contract_documents',
    'document_versions',
    'quotes',
    'orders',
    'order_items',
    'remissions',
    'remission_items',
    'inventory_movements',
    'inventory_reservations',
    'employees',
    'payroll_runs',
    'payroll_items',
    'finance_transactions',
    'approvals',
    'approval_actions',
    'report_exports'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'audit_' || table_name,
      table_name
    );
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row_change()',
      'audit_' || table_name,
      table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clients',
    'projects',
    'contracts',
    'contract_items',
    'contract_documents',
    'quotes',
    'orders',
    'order_items',
    'employees',
    'payroll_runs',
    'finance_transactions',
    'approvals'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'change_log_' || table_name,
      table_name
    );
    execute format(
      'create trigger %I after update on public.%I for each row execute function public.log_field_changes()',
      'change_log_' || table_name,
      table_name
    );
  end loop;
end $$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_memberships enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_events enable row level security;
alter table public.change_log enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.sectors enable row level security;
alter table public.requirements enable row level security;
alter table public.products enable row level security;
alter table public.contract_document_templates enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_items enable row level security;
alter table public.contract_documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.quote_templates enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.approvals enable row level security;
alter table public.approval_actions enable row level security;
alter table public.warehouses enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.remissions enable row level security;
alter table public.remission_items enable row level security;
alter table public.employees enable row level security;
alter table public.employee_documents enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_items enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.report_exports enable row level security;

drop policy if exists "companies_select_member" on public.companies;
create policy "companies_select_member" on public.companies
for select using (public.is_company_member(id));

drop policy if exists "companies_update_admin" on public.companies;
create policy "companies_update_admin" on public.companies
for update using (public.has_permission(id, 'system.configure'))
with check (public.has_permission(id, 'system.configure'));

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
for select using (
  id = auth.uid()
  or exists (
    select 1
    from public.company_memberships cm_self
    join public.company_memberships cm_target on cm_target.company_id = cm_self.company_id
    where cm_self.user_id = auth.uid()
      and cm_target.user_id = profiles.id
      and cm_self.status = 'activo'
  )
);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "memberships_select_company" on public.company_memberships;
create policy "memberships_select_company" on public.company_memberships
for select using (
  user_id = auth.uid()
  or public.is_company_member(company_id)
);

drop policy if exists "memberships_manage_admin" on public.company_memberships;
create policy "memberships_manage_admin" on public.company_memberships
for all using (public.has_permission(company_id, 'users.manage'))
with check (public.has_permission(company_id, 'users.manage'));

drop policy if exists "role_permissions_read" on public.role_permissions;
create policy "role_permissions_read" on public.role_permissions
for select to authenticated using (true);

drop policy if exists "templates_select_member_or_global" on public.contract_document_templates;
create policy "templates_select_member_or_global" on public.contract_document_templates
for select using (company_id is null or public.is_company_member(company_id));

drop policy if exists "templates_manage_admin" on public.contract_document_templates;
create policy "templates_manage_admin" on public.contract_document_templates
for all using (company_id is not null and public.has_permission(company_id, 'system.configure'))
with check (company_id is not null and public.has_permission(company_id, 'system.configure'));

drop policy if exists "audit_read_authorized" on public.audit_events;
create policy "audit_read_authorized" on public.audit_events
for select using (public.has_permission(company_id, 'audit.read'));

drop policy if exists "change_log_read_authorized" on public.change_log;
create policy "change_log_read_authorized" on public.change_log
for select using (public.has_permission(company_id, 'audit.read'));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clients',
    'projects',
    'sectors',
    'requirements',
    'products',
    'contracts',
    'contract_items',
    'contract_documents',
    'document_versions',
    'quote_templates',
    'quotes',
    'quote_items',
    'orders',
    'order_items',
    'warehouses',
    'inventory_items',
    'inventory_movements',
    'inventory_reservations',
    'remissions',
    'remission_items',
    'notifications'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_select_member',
      table_name
    );
    execute format(
      'create policy %I on public.%I for select using (public.is_company_member(company_id))',
      table_name || '_select_member',
      table_name
    );
  end loop;
end $$;

drop policy if exists "employees_select_member" on public.employees;
drop policy if exists "employee_documents_select_member" on public.employee_documents;
drop policy if exists "payroll_runs_select_member" on public.payroll_runs;
drop policy if exists "payroll_items_select_member" on public.payroll_items;
drop policy if exists "finance_accounts_select_member" on public.finance_accounts;
drop policy if exists "finance_transactions_select_member" on public.finance_transactions;
drop policy if exists "report_exports_select_member" on public.report_exports;

drop policy if exists "employees_select_hr" on public.employees;
create policy "employees_select_hr" on public.employees
for select using (public.has_permission(company_id, 'hr.manage'));

drop policy if exists "employee_documents_select_hr" on public.employee_documents;
create policy "employee_documents_select_hr" on public.employee_documents
for select using (public.has_permission(company_id, 'hr.manage'));

drop policy if exists "payroll_runs_select_authorized" on public.payroll_runs;
create policy "payroll_runs_select_authorized" on public.payroll_runs
for select using (
  public.has_permission(company_id, 'payroll.manage')
  or public.has_permission(company_id, 'finance.read')
);

drop policy if exists "payroll_items_select_authorized" on public.payroll_items;
create policy "payroll_items_select_authorized" on public.payroll_items
for select using (
  public.has_permission(company_id, 'payroll.manage')
  or public.has_permission(company_id, 'finance.read')
);

drop policy if exists "finance_accounts_select_authorized" on public.finance_accounts;
create policy "finance_accounts_select_authorized" on public.finance_accounts
for select using (public.has_permission(company_id, 'finance.read'));

drop policy if exists "finance_transactions_select_authorized" on public.finance_transactions;
create policy "finance_transactions_select_authorized" on public.finance_transactions
for select using (public.has_permission(company_id, 'finance.read'));

drop policy if exists "report_exports_select_authorized" on public.report_exports;
create policy "report_exports_select_authorized" on public.report_exports
for select using (public.has_permission(company_id, 'reports.export'));

drop policy if exists "clients_manage" on public.clients;
create policy "clients_manage" on public.clients
for all using (public.has_permission(company_id, 'clients.manage'))
with check (public.has_permission(company_id, 'clients.manage'));

drop policy if exists "projects_manage" on public.projects;
create policy "projects_manage" on public.projects
for all using (public.has_permission(company_id, 'contracts.manage'))
with check (public.has_permission(company_id, 'contracts.manage'));

drop policy if exists "sectors_manage" on public.sectors;
create policy "sectors_manage" on public.sectors
for all using (public.has_permission(company_id, 'contracts.manage'))
with check (public.has_permission(company_id, 'contracts.manage'));

drop policy if exists "requirements_manage" on public.requirements;
create policy "requirements_manage" on public.requirements
for all using (public.has_permission(company_id, 'contracts.manage'))
with check (public.has_permission(company_id, 'contracts.manage'));

drop policy if exists "products_manage_inventory" on public.products;
create policy "products_manage_inventory" on public.products
for all using (public.has_permission(company_id, 'inventory.manage'))
with check (public.has_permission(company_id, 'inventory.manage'));

drop policy if exists "contracts_manage" on public.contracts;
create policy "contracts_manage" on public.contracts
for all using (public.has_permission(company_id, 'contracts.manage') or public.has_permission(company_id, 'bids.manage'))
with check (public.has_permission(company_id, 'contracts.manage') or public.has_permission(company_id, 'bids.manage'));

drop policy if exists "contract_items_manage" on public.contract_items;
create policy "contract_items_manage" on public.contract_items
for all using (public.has_permission(company_id, 'contracts.manage') or public.has_permission(company_id, 'bids.manage'))
with check (public.has_permission(company_id, 'contracts.manage') or public.has_permission(company_id, 'bids.manage'));

drop policy if exists "contract_documents_manage" on public.contract_documents;
create policy "contract_documents_manage" on public.contract_documents
for all using (public.has_permission(company_id, 'bids.manage') or public.has_permission(company_id, 'contracts.manage'))
with check (public.has_permission(company_id, 'bids.manage') or public.has_permission(company_id, 'contracts.manage'));

drop policy if exists "document_versions_manage" on public.document_versions;
create policy "document_versions_manage" on public.document_versions
for all using (public.has_permission(company_id, 'bids.manage') or public.has_permission(company_id, 'contracts.manage'))
with check (public.has_permission(company_id, 'bids.manage') or public.has_permission(company_id, 'contracts.manage'));

drop policy if exists "quotes_manage" on public.quote_templates;
create policy "quotes_manage" on public.quote_templates
for all using (public.has_permission(company_id, 'quotes.manage'))
with check (public.has_permission(company_id, 'quotes.manage'));

drop policy if exists "quotes_rows_manage" on public.quotes;
create policy "quotes_rows_manage" on public.quotes
for all using (public.has_permission(company_id, 'quotes.manage'))
with check (public.has_permission(company_id, 'quotes.manage'));

drop policy if exists "quote_items_manage" on public.quote_items;
create policy "quote_items_manage" on public.quote_items
for all using (public.has_permission(company_id, 'quotes.manage'))
with check (public.has_permission(company_id, 'quotes.manage'));

drop policy if exists "orders_manage" on public.orders;
create policy "orders_manage" on public.orders
for all using (public.has_permission(company_id, 'orders.manage'))
with check (public.has_permission(company_id, 'orders.manage'));

drop policy if exists "order_items_manage" on public.order_items;
create policy "order_items_manage" on public.order_items
for all using (public.has_permission(company_id, 'orders.manage'))
with check (public.has_permission(company_id, 'orders.manage'));

drop policy if exists "approvals_read_manage" on public.approvals;
create policy "approvals_read_manage" on public.approvals
for select using (
  public.has_permission(company_id, 'approvals.manage')
  or requested_by = auth.uid()
);

drop policy if exists "approvals_insert_requester" on public.approvals;
create policy "approvals_insert_requester" on public.approvals
for insert with check (public.is_company_member(company_id));

drop policy if exists "approvals_update_admin_socio" on public.approvals;
create policy "approvals_update_admin_socio" on public.approvals
for update using (public.has_permission(company_id, 'approvals.manage'))
with check (public.has_permission(company_id, 'approvals.manage'));

drop policy if exists "approval_actions_read_manage" on public.approval_actions;
create policy "approval_actions_read_manage" on public.approval_actions
for select using (public.has_permission(company_id, 'approvals.manage'));

drop policy if exists "approval_actions_insert_manage" on public.approval_actions;
create policy "approval_actions_insert_manage" on public.approval_actions
for insert with check (public.has_permission(company_id, 'approvals.manage'));

drop policy if exists "warehouses_manage" on public.warehouses;
create policy "warehouses_manage" on public.warehouses
for all using (public.has_permission(company_id, 'inventory.manage'))
with check (public.has_permission(company_id, 'inventory.manage'));

drop policy if exists "inventory_items_manage" on public.inventory_items;
create policy "inventory_items_manage" on public.inventory_items
for all using (public.has_permission(company_id, 'inventory.manage'))
with check (public.has_permission(company_id, 'inventory.manage'));

drop policy if exists "inventory_movements_manage" on public.inventory_movements;
create policy "inventory_movements_manage" on public.inventory_movements
for all using (public.has_permission(company_id, 'inventory.manage') or public.has_permission(company_id, 'shipments.manage'))
with check (public.has_permission(company_id, 'inventory.manage') or public.has_permission(company_id, 'shipments.manage'));

drop policy if exists "inventory_reservations_manage" on public.inventory_reservations;
create policy "inventory_reservations_manage" on public.inventory_reservations
for all using (public.has_permission(company_id, 'inventory.manage') or public.has_permission(company_id, 'orders.manage'))
with check (public.has_permission(company_id, 'inventory.manage') or public.has_permission(company_id, 'orders.manage'));

drop policy if exists "remissions_manage" on public.remissions;
create policy "remissions_manage" on public.remissions
for all using (public.has_permission(company_id, 'shipments.manage'))
with check (public.has_permission(company_id, 'shipments.manage'));

drop policy if exists "remission_items_manage" on public.remission_items;
create policy "remission_items_manage" on public.remission_items
for all using (public.has_permission(company_id, 'shipments.manage'))
with check (public.has_permission(company_id, 'shipments.manage'));

drop policy if exists "employees_manage" on public.employees;
create policy "employees_manage" on public.employees
for all using (public.has_permission(company_id, 'hr.manage'))
with check (public.has_permission(company_id, 'hr.manage'));

drop policy if exists "employee_documents_manage" on public.employee_documents;
create policy "employee_documents_manage" on public.employee_documents
for all using (public.has_permission(company_id, 'hr.manage'))
with check (public.has_permission(company_id, 'hr.manage'));

drop policy if exists "payroll_manage" on public.payroll_runs;
create policy "payroll_manage" on public.payroll_runs
for all using (public.has_permission(company_id, 'payroll.manage'))
with check (public.has_permission(company_id, 'payroll.manage'));

drop policy if exists "payroll_items_manage" on public.payroll_items;
create policy "payroll_items_manage" on public.payroll_items
for all using (public.has_permission(company_id, 'payroll.manage'))
with check (public.has_permission(company_id, 'payroll.manage'));

drop policy if exists "finance_accounts_manage" on public.finance_accounts;
create policy "finance_accounts_manage" on public.finance_accounts
for all using (public.has_permission(company_id, 'finance.manage'))
with check (public.has_permission(company_id, 'finance.manage'));

drop policy if exists "finance_transactions_manage" on public.finance_transactions;
create policy "finance_transactions_manage" on public.finance_transactions
for all using (public.has_permission(company_id, 'finance.manage'))
with check (public.has_permission(company_id, 'finance.manage'));

drop policy if exists "notifications_user_read" on public.notifications;
create policy "notifications_user_read" on public.notifications
for select using (public.is_company_member(company_id) and (user_id is null or user_id = auth.uid()));

drop policy if exists "notifications_system_insert" on public.notifications;
create policy "notifications_system_insert" on public.notifications
for insert with check (public.is_company_member(company_id));

drop policy if exists "report_exports_manage" on public.report_exports;
create policy "report_exports_manage" on public.report_exports
for all using (public.has_permission(company_id, 'reports.export'))
with check (public.has_permission(company_id, 'reports.export'));

insert into storage.buckets (id, name, public)
values ('erp-files', 'erp-files', false)
on conflict (id) do nothing;

drop policy if exists "erp_files_select_member" on storage.objects;
create policy "erp_files_select_member" on storage.objects
for select using (
  bucket_id = 'erp-files'
  and public.is_company_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "erp_files_insert_member" on storage.objects;
create policy "erp_files_insert_member" on storage.objects
for insert with check (
  bucket_id = 'erp-files'
  and public.is_company_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "erp_files_update_member" on storage.objects;
create policy "erp_files_update_member" on storage.objects
for update using (
  bucket_id = 'erp-files'
  and public.is_company_member((storage.foldername(name))[1]::uuid)
);

create or replace function public.create_company_with_admin(
  company_name text,
  company_rfc text default null,
  admin_user_id uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
begin
  insert into public.companies (name, rfc)
  values (company_name, company_rfc)
  returning id into new_company_id;

  insert into public.company_memberships (company_id, user_id, role, status)
  values (new_company_id, admin_user_id, 'admin', 'activo');

  return new_company_id;
end;
$$;
