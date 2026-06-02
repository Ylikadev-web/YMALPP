import { createClient } from "@/lib/supabase/server";

export type LiveClient = {
  id: string;
  name: string;
  rfc: string;
  email?: string | null;
  phone?: string | null;
};

export type LiveProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  default_price: number;
};

export type LiveProcessStage = {
  id: string;
  contract_type: string;
  name: string;
  sort_order: number;
  required: boolean;
  active: boolean;
};

export type LiveContract = {
  id: string;
  code: string;
  name: string;
  contract_type: string;
  status: string;
  amount: number;
  start_date: string;
  end_date: string;
  clients?: { name?: string | null } | null;
};

export type LiveContractItem = {
  id: string;
  contract_id: string;
  product_id: string;
  item_number: string;
  description?: string | null;
  requisition_number?: string | null;
  requisition_area?: string | null;
  budget_item?: string | null;
  authorized_amount?: number | null;
  brand?: string | null;
  unit?: string | null;
  import_source?: string | null;
  contracted_quantity: number;
  delivered_quantity: number;
  pending_quantity: number;
  unit_price: number;
  products?: { name?: string | null; sku?: string | null } | null;
};

export type LiveQuote = {
  id: string;
  folio: string;
  title: string;
  status: string;
  total: number;
  valid_until?: string | null;
  clients?: { name?: string | null } | null;
};

export type LiveQuoteTemplate = {
  id: string;
  name: string;
  logo_url?: string | null;
  primary_color: string;
  secondary_color: string;
  header?: Record<string, unknown> | null;
  footer?: Record<string, unknown> | null;
  signature?: Record<string, unknown> | null;
  editable_schema?: Record<string, unknown> | null;
};

export type LiveAttachment = {
  id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  storage_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  created_at: string;
};

export type LiveWarehouse = {
  id: string;
  name: string;
};

export type LiveInventoryItem = {
  id: string;
  stock: number;
  reserved_quantity: number;
  available_quantity: number;
  products?: { name?: string | null; sku?: string | null } | null;
  warehouses?: { name?: string | null } | null;
};

export type LiveApproval = {
  id: string;
  module: string;
  title: string;
  status: string;
  created_at: string;
};

export type LiveOrder = {
  id: string;
  folio: string;
  status: string;
  created_at: string;
  contracts?: { code?: string | null } | null;
};

export type LiveEmployee = {
  id: string;
  full_name: string;
  rfc?: string | null;
  email?: string | null;
  base_salary: number;
  status: string;
};

export type LiveFinanceAccount = {
  id: string;
  name: string;
  account_type: string;
};

export type LiveDocument = {
  id: string;
  contract_id: string;
  name: string;
  required: boolean;
  status: string;
  current_version: number;
  contracts?: { code?: string | null; name?: string | null } | null;
};

export type LiveEmployeeDocument = {
  id: string;
  employee_id: string;
  name: string;
  storage_path: string;
  status: string;
  created_at: string;
  employees?: { full_name?: string | null } | null;
};

export type LiveFinancialSummary = {
  ingresos: number;
  egresos: number;
  nomina: number;
  gastos_operativos: number;
  utilidad_neta: number;
};

async function safeSelect<T>(query: PromiseLike<{ data: unknown; error: unknown }>) {
  const { data, error } = await query;
  if (error) {
    return [] as T[];
  }

  return Array.isArray(data) ? (data as T[]) : [];
}

export async function getClients() {
  const supabase = await createClient();
  return safeSelect<LiveClient>(
    supabase
      .from("clients")
      .select("id,name,rfc,email,phone")
      .eq("active", true)
      .order("created_at", { ascending: false })
  );
}

export async function getProducts() {
  const supabase = await createClient();
  return safeSelect<LiveProduct>(
    supabase
      .from("products")
      .select("id,sku,name,unit,default_price")
      .eq("active", true)
      .order("created_at", { ascending: false })
  );
}

export async function getContracts() {
  const supabase = await createClient();
  return safeSelect<LiveContract>(
    supabase
      .from("contracts")
      .select("id,code,name,contract_type,status,amount,start_date,end_date,clients(name)")
      .order("created_at", { ascending: false })
  );
}

export async function getContractItems(contractId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("contract_items")
    .select(
      "id,contract_id,product_id,item_number,description,requisition_number,requisition_area,budget_item,authorized_amount,brand,unit,import_source,contracted_quantity,delivered_quantity,pending_quantity,unit_price,products(name,sku)"
    )
    .order("created_at", { ascending: false });

  if (contractId) {
    query = query.eq("contract_id", contractId);
  }

  return safeSelect<LiveContractItem>(query);
}

export async function getQuotes() {
  const supabase = await createClient();
  return safeSelect<LiveQuote>(
    supabase
      .from("quotes")
      .select("id,folio,title,status,total,valid_until,clients(name)")
      .order("created_at", { ascending: false })
  );
}

export async function getQuoteTemplates() {
  const supabase = await createClient();
  return safeSelect<LiveQuoteTemplate>(
    supabase
      .from("quote_templates")
      .select("id,name,logo_url,primary_color,secondary_color,header,footer,signature,editable_schema")
      .order("created_at", { ascending: false })
  );
}

export async function getContractProcessStages() {
  const supabase = await createClient();
  return safeSelect<LiveProcessStage>(
    supabase
      .from("contract_process_stages")
      .select("id,contract_type,name,sort_order,required,active")
      .eq("active", true)
      .order("contract_type", { ascending: true })
      .order("sort_order", { ascending: true })
  );
}

export async function getAttachments(entityType?: string, entityId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("erp_attachments")
    .select("id,entity_type,entity_id,name,storage_path,mime_type,file_size,created_at")
    .order("created_at", { ascending: false });

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (entityId) {
    query = query.eq("entity_id", entityId);
  }

  return safeSelect<LiveAttachment>(query);
}

export async function getWarehouses() {
  const supabase = await createClient();
  return safeSelect<LiveWarehouse>(
    supabase.from("warehouses").select("id,name").order("created_at", { ascending: false })
  );
}

export async function getInventoryItems() {
  const supabase = await createClient();
  return safeSelect<LiveInventoryItem>(
    supabase
      .from("inventory_items")
      .select("id,stock,reserved_quantity,available_quantity,products(name,sku),warehouses(name)")
      .order("created_at", { ascending: false })
  );
}

export async function getApprovals() {
  const supabase = await createClient();
  return safeSelect<LiveApproval>(
    supabase.from("approvals").select("id,module,title,status,created_at").order("created_at", {
      ascending: false
    })
  );
}

export async function getOrders() {
  const supabase = await createClient();
  return safeSelect<LiveOrder>(
    supabase
      .from("orders")
      .select("id,folio,status,created_at,contracts(code)")
      .order("created_at", { ascending: false })
  );
}

export async function getEmployees() {
  const supabase = await createClient();
  return safeSelect<LiveEmployee>(
    supabase
      .from("employees")
      .select("id,full_name,rfc,email,base_salary,status")
      .order("created_at", { ascending: false })
  );
}

export async function getFinanceAccounts() {
  const supabase = await createClient();
  return safeSelect<LiveFinanceAccount>(
    supabase.from("finance_accounts").select("id,name,account_type").order("created_at", {
      ascending: false
    })
  );
}

export async function getBidDocuments() {
  const supabase = await createClient();
  return safeSelect<LiveDocument>(
    supabase
      .from("contract_documents")
      .select("id,contract_id,name,required,status,current_version,contracts(code,name)")
      .order("created_at", { ascending: false })
  );
}

export async function getEmployeeDocuments() {
  const supabase = await createClient();
  return safeSelect<LiveEmployeeDocument>(
    supabase
      .from("employee_documents")
      .select("id,employee_id,name,storage_path,status,created_at,employees(full_name)")
      .order("created_at", { ascending: false })
  );
}

export async function getFinancialSummary() {
  const supabase = await createClient();
  const rows = await safeSelect<LiveFinancialSummary>(
    supabase
      .from("financial_dashboard")
      .select("ingresos,egresos,nomina,gastos_operativos,utilidad_neta")
      .limit(1)
  );

  return (
    rows[0] ?? {
      ingresos: 0,
      egresos: 0,
      nomina: 0,
      gastos_operativos: 0,
      utilidad_neta: 0
    }
  );
}
