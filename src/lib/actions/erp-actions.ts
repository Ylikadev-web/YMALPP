"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length > 0 ? value : null;
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

async function assertOk(error: unknown) {
  if (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar en Supabase.";
    throw new Error(message);
  }
}

export async function createClientAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    name: text(formData, "name"),
    legal_name: optionalText(formData, "legal_name"),
    rfc: text(formData, "rfc"),
    contact_name: optionalText(formData, "contact_name"),
    email: optionalText(formData, "email"),
    phone: optionalText(formData, "phone")
  });

  await assertOk(error);
  revalidatePath("/cotizaciones");
  revalidatePath("/contratos");
}

export async function createProductAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    sku: text(formData, "sku"),
    name: text(formData, "name"),
    unit: text(formData, "unit") || "pieza",
    default_price: numberValue(formData, "default_price")
  });

  await assertOk(error);
  revalidatePath("/inventario");
  revalidatePath("/contratos");
}

export async function createWarehouseAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("warehouses").insert({
    name: text(formData, "name"),
    address: optionalText(formData, "address")
  });

  await assertOk(error);
  revalidatePath("/inventario");
  revalidatePath("/remisiones");
}

export async function addInventoryStockAction(formData: FormData) {
  const supabase = await createClient();
  const warehouseId = text(formData, "warehouse_id");
  const productId = text(formData, "product_id");
  const quantity = numberValue(formData, "quantity", 0);

  const { data: current, error: currentError } = await supabase
    .from("inventory_items")
    .select("id,stock")
    .eq("warehouse_id", warehouseId)
    .eq("product_id", productId)
    .maybeSingle();

  await assertOk(currentError);

  if (current?.id) {
    const { error } = await supabase
      .from("inventory_items")
      .update({ stock: Number(current.stock) + quantity })
      .eq("id", current.id);
    await assertOk(error);
  } else {
    const { error } = await supabase.from("inventory_items").insert({
      warehouse_id: warehouseId,
      product_id: productId,
      stock: quantity,
      reserved_quantity: 0
    });
    await assertOk(error);
  }

  const { error: movementError } = await supabase.from("inventory_movements").insert({
    warehouse_id: warehouseId,
    product_id: productId,
    movement_type: "entrada",
    quantity,
    notes: optionalText(formData, "notes")
  });

  await assertOk(movementError);
  revalidatePath("/inventario");
}

export async function createContractAction(formData: FormData) {
  const supabase = await createClient();
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      client_id: text(formData, "client_id"),
      contract_type: text(formData, "contract_type") || "directo",
      code: text(formData, "code"),
      name: text(formData, "name"),
      amount: numberValue(formData, "amount"),
      start_date: text(formData, "start_date"),
      end_date: text(formData, "end_date"),
      status: "activo"
    })
    .select("id")
    .single();

  await assertOk(contractError);

  const productId = text(formData, "product_id");
  if (contract?.id && productId) {
    const { error: itemError } = await supabase.from("contract_items").insert({
      contract_id: contract.id,
      item_number: text(formData, "item_number") || "1",
      product_id: productId,
      contracted_quantity: numberValue(formData, "contracted_quantity", 1),
      unit_price: numberValue(formData, "unit_price")
    });

    await assertOk(itemError);
  }

  revalidatePath("/contratos");
  revalidatePath("/licitaciones");
  revalidatePath("/dashboard");
}

export async function createOrderAction(formData: FormData) {
  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      contract_id: optionalText(formData, "contract_id"),
      folio: text(formData, "folio"),
      status: "borrador",
      notes: optionalText(formData, "notes")
    })
    .select("id")
    .single();

  await assertOk(orderError);

  if (order?.id) {
    const contractItemId = optionalText(formData, "contract_item_id");
    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      contract_item_id: contractItemId,
      product_id: text(formData, "product_id"),
      quantity: numberValue(formData, "quantity", 1),
      unit_price: numberValue(formData, "unit_price"),
      in_contract: Boolean(contractItemId)
    });

    await assertOk(itemError);
  }

  revalidatePath("/pedidos");
  revalidatePath("/aprobaciones");
}

export async function createQuoteAction(formData: FormData) {
  const supabase = await createClient();
  const subtotal = numberValue(formData, "subtotal");
  const tax = subtotal * 0.16;
  const { error } = await supabase.from("quotes").insert({
    client_id: optionalText(formData, "client_id"),
    folio: text(formData, "folio"),
    title: text(formData, "title"),
    subtotal,
    tax,
    total: subtotal + tax,
    valid_until: optionalText(formData, "valid_until"),
    status: "borrador"
  });

  await assertOk(error);
  revalidatePath("/cotizaciones");
}

export async function createRemissionAction(formData: FormData) {
  const supabase = await createClient();
  const { data: remission, error: remissionError } = await supabase
    .from("remissions")
    .insert({
      contract_id: text(formData, "contract_id"),
      folio: optionalText(formData, "folio"),
      delivery_date: text(formData, "delivery_date"),
      received_by: optionalText(formData, "received_by"),
      notes: optionalText(formData, "notes")
    })
    .select("id")
    .single();

  await assertOk(remissionError);

  if (remission?.id) {
    const contractItemId = text(formData, "contract_item_id");
    const { data: contractItem, error: contractItemError } = await supabase
      .from("contract_items")
      .select("product_id")
      .eq("id", contractItemId)
      .single();

    await assertOk(contractItemError);

    const { error: itemError } = await supabase.from("remission_items").insert({
      remission_id: remission.id,
      contract_item_id: contractItemId,
      product_id: contractItem?.product_id,
      warehouse_id: optionalText(formData, "warehouse_id"),
      quantity: numberValue(formData, "quantity", 1)
    });

    await assertOk(itemError);
  }

  revalidatePath("/remisiones");
  revalidatePath("/contratos");
  revalidatePath("/inventario");
}

export async function updateApprovalAction(formData: FormData) {
  const supabase = await createClient();
  const id = text(formData, "id");
  const status = text(formData, "status");
  const comment = optionalText(formData, "comment");

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error: approvalError } = await supabase
    .from("approvals")
    .update({
      status,
      resolved_by: status === "informacion_requerida" ? null : user?.id,
      resolved_at: status === "informacion_requerida" ? null : new Date().toISOString()
    })
    .eq("id", id);

  await assertOk(approvalError);

  const { error: actionError } = await supabase.from("approval_actions").insert({
    approval_id: id,
    action: status,
    comment
  });

  await assertOk(actionError);
  revalidatePath("/aprobaciones");
}

export async function updateDocumentStatusAction(formData: FormData) {
  const supabase = await createClient();
  const status = text(formData, "status");
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("contract_documents")
    .update({
      status,
      approved_by: status === "aprobado" ? user?.id : null,
      approved_at: status === "aprobado" ? new Date().toISOString() : null,
      rejection_reason: status === "rechazado" ? optionalText(formData, "rejection_reason") : null
    })
    .eq("id", text(formData, "id"));

  await assertOk(error);
  revalidatePath("/licitaciones");
}

export async function createEmployeeAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("employees").insert({
    full_name: text(formData, "full_name"),
    curp: optionalText(formData, "curp"),
    rfc: optionalText(formData, "rfc"),
    nss: optionalText(formData, "nss"),
    phone: optionalText(formData, "phone"),
    email: optionalText(formData, "email"),
    base_salary: numberValue(formData, "base_salary"),
    status: "activo"
  });

  await assertOk(error);
  revalidatePath("/rh");
}

export async function createFinanceAccountAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("finance_accounts").insert({
    name: text(formData, "name"),
    account_type: text(formData, "account_type")
  });

  await assertOk(error);
  revalidatePath("/finanzas");
}

export async function createFinanceTransactionAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("finance_transactions").insert({
    account_id: text(formData, "account_id"),
    contract_id: optionalText(formData, "contract_id"),
    amount: numberValue(formData, "amount"),
    transaction_date: text(formData, "transaction_date"),
    description: optionalText(formData, "description")
  });

  await assertOk(error);
  revalidatePath("/finanzas");
  revalidatePath("/dashboard");
}

export async function createReportExportAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("report_exports").insert({
    module: text(formData, "module"),
    format: text(formData, "format"),
    filters: {
      from: optionalText(formData, "from"),
      to: optionalText(formData, "to"),
      status: optionalText(formData, "status")
    },
    status: "pendiente"
  });

  await assertOk(error);
  revalidatePath("/reportes");
}
