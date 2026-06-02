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
  contracted_quantity: number;
  delivered_quantity: number;
  pending_quantity: number;
  unit_price: number;
  products?: { name?: string | null; sku?: string | null } | null;
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
  name: string;
  required: boolean;
  status: string;
  current_version: number;
  contracts?: { code?: string | null; name?: string | null } | null;
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
    supabase.from("clients").select("id,name,rfc,email,phone").order("created_at", { ascending: false })
  );
}

export async function getProducts() {
  const supabase = await createClient();
  return safeSelect<LiveProduct>(
    supabase
      .from("products")
      .select("id,sku,name,unit,default_price")
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
      "id,contract_id,product_id,item_number,contracted_quantity,delivered_quantity,pending_quantity,unit_price,products(name,sku)"
    )
    .order("created_at", { ascending: false });

  if (contractId) {
    query = query.eq("contract_id", contractId);
  }

  return safeSelect<LiveContractItem>(query);
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
      .select("id,name,required,status,current_version,contracts(code,name)")
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
