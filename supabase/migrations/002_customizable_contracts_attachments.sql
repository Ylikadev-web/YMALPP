-- YMALPP ERP customization phase.
-- Run after 001_erp_core.sql.

alter type public.contract_type add value if not exists 'licitacion_publica_nacional';
alter type public.contract_type add value if not exists 'licitacion_publica_internacional';
alter type public.contract_type add value if not exists 'invitacion_a_cuando_menos_tres';
alter type public.contract_type add value if not exists 'adjudicacion_directa';
alter type public.contract_type add value if not exists 'contrato_abierto';
alter type public.contract_type add value if not exists 'contrato_marco';
alter type public.contract_type add value if not exists 'pedido';
alter type public.contract_type add value if not exists 'convenio_modificatorio';
alter type public.contract_type add value if not exists 'obra_publica';
alter type public.contract_type add value if not exists 'adquisiciones';
alter type public.contract_type add value if not exists 'arrendamiento';
alter type public.contract_type add value if not exists 'servicios_profesionales';

create table if not exists public.contract_process_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  contract_type public.contract_type not null,
  name text not null,
  sort_order int not null default 100,
  required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_process_stages_unique unique (company_id, contract_type, name)
);

create table if not exists public.contract_item_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  contract_item_id uuid not null references public.contract_items(id) on delete cascade,
  name text not null,
  required boolean not null default false,
  status public.document_status not null default 'pendiente',
  current_version int not null default 0,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.quote_templates
add column if not exists editable_schema jsonb not null default '{}'::jsonb;

alter table public.quote_templates
add column if not exists preview_html text;

alter table public.clients
add column if not exists active boolean not null default true;

alter table public.contract_items
add column if not exists requisition_number text;

alter table public.contract_items
add column if not exists requisition_area text;

alter table public.contract_items
add column if not exists budget_item text;

alter table public.contract_items
add column if not exists authorized_amount numeric(14,2);

alter table public.contract_items
add column if not exists brand text;

alter table public.contract_items
add column if not exists unit text;

alter table public.contract_items
add column if not exists import_source text;

create index if not exists idx_contract_process_stages_company_type
on public.contract_process_stages(company_id, contract_type, active, sort_order);

create index if not exists idx_contract_item_documents_item
on public.contract_item_documents(contract_item_id);

create index if not exists idx_erp_attachments_entity
on public.erp_attachments(entity_type, entity_id);

drop trigger if exists touch_contract_process_stages_updated_at on public.contract_process_stages;
create trigger touch_contract_process_stages_updated_at
before update on public.contract_process_stages
for each row execute function public.touch_updated_at();

drop trigger if exists touch_contract_item_documents_updated_at on public.contract_item_documents;
create trigger touch_contract_item_documents_updated_at
before update on public.contract_item_documents
for each row execute function public.touch_updated_at();

alter table public.contract_process_stages enable row level security;
alter table public.contract_item_documents enable row level security;
alter table public.erp_attachments enable row level security;

drop policy if exists "contract_process_stages_select_member" on public.contract_process_stages;
create policy "contract_process_stages_select_member" on public.contract_process_stages
for select using (public.is_company_member(company_id));

drop policy if exists "contract_process_stages_manage_admin" on public.contract_process_stages;
create policy "contract_process_stages_manage_admin" on public.contract_process_stages
for all using (public.has_permission(company_id, 'system.configure') or public.has_permission(company_id, 'contracts.manage'))
with check (public.has_permission(company_id, 'system.configure') or public.has_permission(company_id, 'contracts.manage'));

drop policy if exists "contract_item_documents_select_member" on public.contract_item_documents;
create policy "contract_item_documents_select_member" on public.contract_item_documents
for select using (public.is_company_member(company_id));

drop policy if exists "contract_item_documents_manage_contracts" on public.contract_item_documents;
create policy "contract_item_documents_manage_contracts" on public.contract_item_documents
for all using (public.has_permission(company_id, 'contracts.manage') or public.has_permission(company_id, 'bids.manage'))
with check (public.has_permission(company_id, 'contracts.manage') or public.has_permission(company_id, 'bids.manage'));

drop policy if exists "erp_attachments_select_member" on public.erp_attachments;
create policy "erp_attachments_select_member" on public.erp_attachments
for select using (public.is_company_member(company_id));

drop policy if exists "erp_attachments_insert_member" on public.erp_attachments;
create policy "erp_attachments_insert_member" on public.erp_attachments
for insert with check (public.is_company_member(company_id));

drop policy if exists "erp_attachments_delete_authorized" on public.erp_attachments;
create policy "erp_attachments_delete_authorized" on public.erp_attachments
for delete using (
  public.has_permission(company_id, 'contracts.manage')
  or public.has_permission(company_id, 'quotes.manage')
  or public.has_permission(company_id, 'hr.manage')
  or public.has_permission(company_id, 'bids.manage')
  or public.has_permission(company_id, 'inventory.manage')
  or public.has_permission(company_id, 'orders.manage')
);
