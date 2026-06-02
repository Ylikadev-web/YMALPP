"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ImportedContractRow = {
  requisition_number: string;
  requisition_area: string;
  budget_item: string;
  authorized_amount: number;
  item_number: string;
  description: string;
  brand: string;
  quantity: number;
  unit: string;
  unit_price: number;
};

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

function booleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function fileValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function headerValue(row: Record<string, unknown>, aliases: string[]) {
  const entries = Object.entries(row);
  const normalizedAliases = aliases.map(normalizeHeader);
  for (const alias of aliases) {
    const found = entries.find(([key]) => normalizeHeader(key) === normalizeHeader(alias));
    if (found) {
      return found[1];
    }
  }

  const looseFound = entries.find(([key]) => normalizedAliases.some((alias) => normalizeHeader(key).includes(alias)));
  if (looseFound) {
    return looseFound[1];
  }

  return "";
}

function stringCell(row: Record<string, unknown>, aliases: string[]) {
  const value = headerValue(row, aliases);
  return value == null ? "" : String(value).trim();
}

function numberCell(row: Record<string, unknown>, aliases: string[]) {
  const value = Number(String(headerValue(row, aliases)).replace(/[$,]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

async function assertOk(error: unknown) {
  if (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar en Supabase.";
    throw new Error(message);
  }
}

async function deleteEntityAttachments(supabase: SupabaseServerClient, entityType: string, entityId: string) {
  const { data: attachments, error: attachmentsError } = await supabase
    .from("erp_attachments")
    .select("storage_path")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  await assertOk(attachmentsError);

  const paths = attachments?.map((attachment) => attachment.storage_path).filter(Boolean) ?? [];
  if (paths.length > 0) {
    await supabase.storage.from("erp-files").remove(paths);
  }

  const { error } = await supabase
    .from("erp_attachments")
    .delete()
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  await assertOk(error);
}

export async function uploadContractDocumentVersionAction(formData: FormData) {
  const supabase = await createClient();
  const documentId = text(formData, "document_id");
  const file = fileValue(formData, "file");

  if (!file) {
    throw new Error("Selecciona un archivo para subir.");
  }

  const { data: document, error: documentError } = await supabase
    .from("contract_documents")
    .select("id,company_id,contract_id,current_version")
    .eq("id", documentId)
    .single();

  await assertOk(documentError);

  const nextVersion = Number(document?.current_version ?? 0) + 1;
  const fileName = safeFileName(file.name);
  const storagePath = `${document?.company_id}/contracts/${document?.contract_id}/documents/${documentId}/v${nextVersion}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from("erp-files").upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  await assertOk(uploadError);

  const { error: versionError } = await supabase.from("document_versions").insert({
    contract_document_id: documentId,
    version: nextVersion,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type || null,
    file_size: file.size,
    status: "subido",
    comments: optionalText(formData, "comments")
  });

  await assertOk(versionError);

  const { error: updateError } = await supabase
    .from("contract_documents")
    .update({
      current_version: nextVersion,
      status: "subido",
      rejection_reason: null
    })
    .eq("id", documentId);

  await assertOk(updateError);
  revalidatePath("/licitaciones");
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

export async function deleteProductAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ active: false }).eq("id", text(formData, "id"));

  await assertOk(error);
  revalidatePath("/inventario");
  revalidatePath("/contratos");
  revalidatePath("/licitaciones");
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

export async function createContractItemAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("contract_items").insert({
    contract_id: text(formData, "contract_id"),
    item_number: text(formData, "item_number"),
    product_id: text(formData, "product_id"),
    contracted_quantity: numberValue(formData, "contracted_quantity", 1),
    unit_price: numberValue(formData, "unit_price"),
    description: optionalText(formData, "description"),
    requisition_number: optionalText(formData, "requisition_number"),
    requisition_area: optionalText(formData, "requisition_area"),
    budget_item: optionalText(formData, "budget_item"),
    authorized_amount: numberValue(formData, "authorized_amount"),
    brand: optionalText(formData, "brand"),
    unit: optionalText(formData, "unit"),
    import_source: optionalText(formData, "import_source")
  });

  await assertOk(error);
  revalidatePath("/contratos");
  revalidatePath("/licitaciones");
}

export async function importContractItemsSpreadsheetAction(formData: FormData) {
  const supabase = await createClient();
  const contractId = text(formData, "contract_id");
  const file = fileValue(formData, "file");

  if (!file) {
    throw new Error("Selecciona un Excel, CSV o el PDF CAAPS26-04006.");
  }

  if (!contractId) {
    throw new Error("Selecciona un contrato o licitacion.");
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    if (!file.name.toLowerCase().includes("caaps26-04006")) {
      throw new Error("Este PDF es escaneado. Sube Excel/CSV o usa la precarga CAAPS26-04006.");
    }

    await insertImportedContractRows(supabase, contractId, caapsSeedRows, file.name);
    revalidatePath("/contratos");
    revalidatePath("/licitaciones");
    return;
  }

  const XLSX = await import("xlsx");
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const importedRows: ImportedContractRow[] = [];

  for (const row of rows) {
    const itemNumber = stringCell(row, ["partida", "part.", "part", "numero", "no"]);
    const description = stringCell(row, ["descripcion", "descripción", "producto", "concepto"]);
    const brand = stringCell(row, ["marca"]);
    const quantity = numberCell(row, ["cant", "cantidad"]);
    const unit = stringCell(row, ["u.m.", "um", "unidad", "unidad de medida"]);
    const unitPrice = numberCell(row, ["p.u.", "pu", "precio unitario", "precio_unitario"]);
    const requisitionNumber = stringCell(row, ["requerimiento", "requisicion", "requisición", "numero requerimiento"]);
    const requisitionArea = stringCell(row, ["area requirente", "área requirente", "area"]);
    const budgetItem = stringCell(row, ["partida presupuestal", "partida_presupuestal"]);
    const authorizedAmount = numberCell(row, ["monto autorizado", "monto_autorizado"]);

    if (!itemNumber || !description) {
      continue;
    }

    importedRows.push({
      item_number: itemNumber,
      description,
      quantity: quantity || 1,
      unit_price: unitPrice,
      requisition_number: requisitionNumber,
      requisition_area: requisitionArea,
      budget_item: budgetItem,
      authorized_amount: authorizedAmount,
      brand,
      unit: unit || "pieza"
    });
  }

  if (importedRows.length === 0) {
    throw new Error("No encontre partidas importables. Revisa encabezados: partida, descripcion, marca, cantidad, unidad y precio unitario.");
  }

  await insertImportedContractRows(supabase, contractId, importedRows, file.name);
  revalidatePath("/contratos");
  revalidatePath("/licitaciones");
}

const caapsSeedRows = [
  {
    requisition_number: "03-010",
    requisition_area: "Direccion General de Obras y Desarrollo Urbano / Coordinador de Obras e Infraestructura",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 4000000,
    item_number: "1",
    description: "Cable 2+1 para acometida, aluminio, calibre 6 de 220 volts, primera calidad, rollo de 100 mts.",
    brand: "VIAKON",
    quantity: 1,
    unit: "Rollo",
    unit_price: 4815
  },
  {
    requisition_number: "03-010",
    requisition_area: "Direccion General de Obras y Desarrollo Urbano / Coordinador de Obras e Infraestructura",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 4000000,
    item_number: "2",
    description:
      "Cable T.H.W. calibre no. 8, cable de fuerza de cobre suave, 7 hilos, policloruro de vinilo PVC, rollo de 100 mts.",
    brand: "ARGOS",
    quantity: 1,
    unit: "Rollo",
    unit_price: 10945
  },
  {
    requisition_number: "03-010",
    requisition_area: "Direccion General de Obras y Desarrollo Urbano / Coordinador de Obras e Infraestructura",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 4000000,
    item_number: "3",
    description: "Cable al neutro mensajero ACSR 600V T/PSD 3x3/0 + 1x1/0, rollo de 250 mts.",
    brand: "VIAKON",
    quantity: 1,
    unit: "Rollo",
    unit_price: 97800
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "1",
    description: "Luminaria vial 100 watts, carcasa de aluminio, tecnologia LED, 160 lm/W, 5000K.",
    brand: "PHILCO",
    quantity: 1,
    unit: "Pieza",
    unit_price: 3750.5
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "2",
    description: "Luminaria vial 60 watts, carcasa de aluminio y cristal templado, tecnologia LED, 145 lm/W, 5000K.",
    brand: "PHILCO",
    quantity: 1,
    unit: "Pieza",
    unit_price: 3367
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "3",
    description: "Luminaria punta de poste, cuerpo de aluminio y policarbonato, tecnologia Scolled optica T5E.",
    brand: "FORLIGHTHING",
    quantity: 1,
    unit: "Pieza",
    unit_price: 15560
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "4",
    description: "Modulo retrofit LED para puntas de poste, tecnologia LED CREE, optica simetrica T5E, 50W.",
    brand: "FORTLIGHTHING",
    quantity: 1,
    unit: "Pieza",
    unit_price: 6730
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "5",
    description: "Reflector 100 W, carcasa de aluminio, voltaje de operacion 100-240V, 5000K.",
    brand: "PHILCO",
    quantity: 1,
    unit: "Pieza",
    unit_price: 700
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "6",
    description:
      "Reflector 100 W, carcasa de aluminio, voltaje de operacion 100-240V a 50-60Hz, color RGB modificable con control remoto, optica simetrica extensiva, 50,000 horas de vida, eficiencia nominal 140 lm/W.",
    brand: "PHILCO",
    quantity: 1,
    unit: "Pieza",
    unit_price: 3370
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "7",
    description:
      "Cable T.H.W. calibre no. 10, conductor de cobre suave solido o cableado, aislamiento PVC THW-LS 90C 600V, color azul, rollo de 100 mts.",
    brand: "ARGOS",
    quantity: 1,
    unit: "Rollo",
    unit_price: 6823
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "8",
    description:
      "Cable T.H.W. calibre no. 14, conductor de cobre suave solido o cableado, aislamiento PVC THW-LS 90C 600V, color azul, rollo de 100 mts.",
    brand: "ARGOS",
    quantity: 1,
    unit: "Rollo",
    unit_price: 2997
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "9",
    description:
      "Cable de aluminio multiple neutrokob 75C 600V AAC tipo PSD (2MAS1) cal 6, forrado con aislamiento individual termoplastico de polietileno de alta densidad color negro, rollo de 100 mts.",
    brand: "VIAKON",
    quantity: 1,
    unit: "Rollo",
    unit_price: 4815
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "10",
    description:
      "Cable de aluminio multiple neutrokob 75C 600V AAC tipo PSD (1MAS1) cal 6, forrado con aislamiento individual termoplastico de polietileno de alta densidad color negro, rollo de 100 mts.",
    brand: "VIAKON",
    quantity: 1,
    unit: "Rollo",
    unit_price: 5279
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "11",
    description: "Cinta electrica de vinil 1600 color negro de 19 mm x 18 mts.",
    brand: "NACIONAL",
    quantity: 1,
    unit: "Pieza",
    unit_price: 78.5
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "12",
    description:
      "Multimetro industrial para corriente alterna/directa, 6,000 conteos, lecturas RMS en CA, precision 0.5%, rango automatico para lectura de voltaje hasta 600V, 10A, 40 mega ohms y 100 Khz.",
    brand: "URREA",
    quantity: 1,
    unit: "Pieza",
    unit_price: 9900
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "13",
    description:
      "Fotocontrol multivoltaje de 3 pines, operacion 100-277V a 50/60Hz, corriente 10A, control de encendido 10-45lx, cuerpo de polipropileno, base ABS, temperatura -40C a 70C.",
    brand: "PHILCO",
    quantity: 1,
    unit: "Pieza",
    unit_price: 320
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "14",
    description: "Base para fotocelda de 3 pines, multivoltaje de operacion 127-220V, frecuencia 60Hz, longitud de cables 25 cm.",
    brand: "ARGOS",
    quantity: 1,
    unit: "Pieza",
    unit_price: 228.02
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "15",
    description: "Cable conductor THW calibre del no. 0, rollo de 100 metros.",
    brand: "ARGOS",
    quantity: 1,
    unit: "Rollo",
    unit_price: 19631
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "16",
    description: "Cable conductor THW calibre del no. 4, rollo de 100 metros.",
    brand: "ARGOS",
    quantity: 1,
    unit: "Rollo",
    unit_price: 7884
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "17",
    description: "Cable conductor THW calibre del no. 6, rollo de 100 metros.",
    brand: "ARGOS",
    quantity: 1,
    unit: "Rollo",
    unit_price: 4989
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "18",
    description: "Cable conductor THW calibre del no. 8, rollo de 100 metros.",
    brand: "ARGOS",
    quantity: 1,
    unit: "Rollo",
    unit_price: 10945
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "19",
    description: "Cable conductor THW calibre del no. 10, rollo de 100 metros.",
    brand: "ARGOS",
    quantity: 1,
    unit: "Rollo",
    unit_price: 6823
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "20",
    description: "Cable conductor THW calibre del no. 12, rollo de 100 metros.",
    brand: "ARGOS",
    quantity: 1,
    unit: "Rollo",
    unit_price: 4215
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "21",
    description: "Fusible de 60 amp reforzado con liston.",
    brand: "DROF/NACIONAL",
    quantity: 1,
    unit: "Pieza",
    unit_price: 336
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "22",
    description: "Fusible de 30 amp reforzado con liston.",
    brand: "DROF/NACIONAL",
    quantity: 1,
    unit: "Pieza",
    unit_price: 141.76
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "23",
    description: "Interruptor de seguridad 2 polos de 60 amp.",
    brand: "SCHNEIDER",
    quantity: 1,
    unit: "Pieza",
    unit_price: 7828.26
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "24",
    description: "Interruptor de seguridad 2 polos de 30 amp.",
    brand: "SCHNEIDER",
    quantity: 1,
    unit: "Pieza",
    unit_price: 4234.18
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "25",
    description: "Interruptor de seguridad 3 polos de 60 amp.",
    brand: "SCHNEIDER",
    quantity: 1,
    unit: "Pieza",
    unit_price: 16213.72
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "26",
    description: "Interruptor de seguridad de 60 amp 30.",
    brand: "SCHNEIDER",
    quantity: 1,
    unit: "Pieza",
    unit_price: 16213.72
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "27",
    description: "Interruptor de tiempo mecanico de 220 V.",
    brand: "SCHNEIDER",
    quantity: 1,
    unit: "Pieza",
    unit_price: 2306.37
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "28",
    description: "Interruptor de tiempo mecanico de 120 V.",
    brand: "SCHNEIDER",
    quantity: 1,
    unit: "Pieza",
    unit_price: 2306.37
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "29",
    description: "Arrancador de bomba de 5HP 220 V.",
    brand: "NACIONAL",
    quantity: 1,
    unit: "Pieza",
    unit_price: 17138.47
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "30",
    description: "Arrancador de bomba 120 V.",
    brand: "NACIONAL",
    quantity: 1,
    unit: "Pieza",
    unit_price: 17138.47
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "31",
    description: "Centro de carga de 2 polos x 30 A.",
    brand: "SCHNEIDER",
    quantity: 1,
    unit: "Pieza",
    unit_price: 672.04
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "32",
    description: "Centro de carga de 3 polos x 30 A.",
    brand: "SCHNEIDER",
    quantity: 1,
    unit: "Pieza",
    unit_price: 1549.29
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "33",
    description: "Interruptor termomagnetico 30 a 2 polos.",
    brand: "SCHNEIDER",
    quantity: 1,
    unit: "Pieza",
    unit_price: 1966.83
  },
  {
    requisition_number: "03-011",
    requisition_area: "Encargado del Despacho de la Direccion General de Servicios Urbanos / Alumbrado Publico",
    budget_item: "2461 Material Electrico y Electronico",
    authorized_amount: 32000000,
    item_number: "34",
    description: "Interruptor termomagnetico 60 a 2 polos.",
    brand: "SCHNEIDER",
    quantity: 1,
    unit: "Pieza",
    unit_price: 1966.83
  }
];

async function insertImportedContractRows(
  supabase: SupabaseServerClient,
  contractId: string,
  rows: ImportedContractRow[],
  importSource: string
) {
  for (const row of rows) {
    const sku = `${importSource.toUpperCase().startsWith("CAAPS") ? "CAAPS" : "IMP"}-${row.requisition_number || contractId.slice(0, 8)}-${row.item_number}`
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .toUpperCase();

    const { data: product, error: productError } = await supabase
      .from("products")
      .upsert(
        {
          sku,
          name: row.description.slice(0, 180),
          description: row.description,
          unit: row.unit || "pieza",
          default_price: row.unit_price,
          active: true
        },
        { onConflict: "company_id,sku" }
      )
      .select("id")
      .single();

    await assertOk(productError);

    const { error: itemError } = await supabase.from("contract_items").insert({
      contract_id: contractId,
      item_number: row.requisition_number ? `${row.requisition_number}-${row.item_number}` : row.item_number,
      product_id: product?.id,
      description: row.description,
      contracted_quantity: row.quantity || 1,
      unit_price: row.unit_price,
      requisition_number: row.requisition_number || null,
      requisition_area: row.requisition_area || null,
      budget_item: row.budget_item || null,
      authorized_amount: row.authorized_amount || 0,
      brand: row.brand || null,
      unit: row.unit || "pieza",
      import_source: importSource
    });

    await assertOk(itemError);
  }
}

export async function importCaapsSeedAction(formData: FormData) {
  const supabase = await createClient();
  const contractId = text(formData, "contract_id");

  if (!contractId) {
    throw new Error("Selecciona un contrato o licitacion.");
  }

  await insertImportedContractRows(supabase, contractId, caapsSeedRows, "CAAPS26-04006.pdf");
  revalidatePath("/contratos");
  revalidatePath("/licitaciones");
}

export async function deleteContractItemAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("contract_items").delete().eq("id", text(formData, "id"));

  await assertOk(error);
  revalidatePath("/contratos");
  revalidatePath("/licitaciones");
}

export async function deleteContractAction(formData: FormData) {
  const supabase = await createClient();
  const contractId = text(formData, "id");
  const { error } = await supabase.from("contracts").delete().eq("id", contractId);

  await assertOk(error);
  await deleteEntityAttachments(supabase, "contract", contractId);
  await deleteEntityAttachments(supabase, "bid", contractId);
  revalidatePath("/contratos");
  revalidatePath("/licitaciones");
  revalidatePath("/dashboard");
}

export async function deleteClientAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ active: false }).eq("id", text(formData, "id"));

  await assertOk(error);
  revalidatePath("/cotizaciones");
  revalidatePath("/contratos");
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

export async function deleteQuoteAction(formData: FormData) {
  const supabase = await createClient();
  const quoteId = text(formData, "id");
  const { error } = await supabase.from("quotes").delete().eq("id", quoteId);

  await assertOk(error);
  await deleteEntityAttachments(supabase, "quote", quoteId);
  revalidatePath("/cotizaciones");
}

export async function createProcessStageAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("contract_process_stages").insert({
    contract_type: text(formData, "contract_type"),
    name: text(formData, "name"),
    sort_order: numberValue(formData, "sort_order", 100),
    required: booleanValue(formData, "required"),
    active: true
  });

  await assertOk(error);
  revalidatePath("/configuracion");
}

export async function deleteProcessStageAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("contract_process_stages").delete().eq("id", text(formData, "id"));

  await assertOk(error);
  revalidatePath("/configuracion");
}

export async function updateQuoteTemplateAction(formData: FormData) {
  const supabase = await createClient();
  const templateId = optionalText(formData, "template_id");
  const payload = {
    name: text(formData, "name"),
    primary_color: text(formData, "primary_color") || "#1f766f",
    secondary_color: text(formData, "secondary_color") || "#c29a54",
    logo_url: optionalText(formData, "logo_url"),
    header: { text: optionalText(formData, "header_text") },
    footer: { text: optionalText(formData, "footer_text") },
    signature: { name: optionalText(formData, "signature_name") },
    editable_schema: {
      font: optionalText(formData, "font"),
      terms: optionalText(formData, "terms")
    }
  };

  if (templateId) {
    const { error } = await supabase.from("quote_templates").update(payload).eq("id", templateId);
    await assertOk(error);
  } else {
    const { error } = await supabase.from("quote_templates").insert(payload);
    await assertOk(error);
  }

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

export async function uploadEmployeeDocumentAction(formData: FormData) {
  const supabase = await createClient();
  const employeeId = text(formData, "employee_id");
  const documentName = text(formData, "name");
  const file = fileValue(formData, "file");

  if (!file) {
    throw new Error("Selecciona un archivo para subir.");
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id,company_id")
    .eq("id", employeeId)
    .single();

  await assertOk(employeeError);

  const fileName = `${Date.now()}-${safeFileName(file.name)}`;
  const storagePath = `${employee?.company_id}/employees/${employeeId}/documents/${fileName}`;

  const { error: uploadError } = await supabase.storage.from("erp-files").upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  await assertOk(uploadError);

  const { error } = await supabase.from("employee_documents").insert({
    employee_id: employeeId,
    name: documentName || file.name,
    storage_path: storagePath,
    status: "subido"
  });

  await assertOk(error);
  revalidatePath("/rh");
}

export async function uploadGenericAttachmentAction(formData: FormData) {
  const supabase = await createClient();
  const entityType = text(formData, "entity_type");
  const entityId = text(formData, "entity_id");
  const displayName = optionalText(formData, "name");
  const file = fileValue(formData, "file");

  if (!file) {
    throw new Error("Selecciona un archivo para subir.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No hay sesion activa.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  await assertOk(membershipError);

  if (!membership?.company_id) {
    throw new Error("El usuario no tiene empresa activa.");
  }

  const fileName = `${Date.now()}-${safeFileName(file.name)}`;
  const storagePath = `${membership.company_id}/attachments/${entityType}/${entityId}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from("erp-files").upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  await assertOk(uploadError);

  const { error } = await supabase.from("erp_attachments").insert({
    entity_type: entityType,
    entity_id: entityId,
    name: displayName || file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    file_size: file.size
  });

  await assertOk(error);
  revalidatePath("/contratos");
  revalidatePath("/licitaciones");
  revalidatePath("/cotizaciones");
  revalidatePath("/rh");
  revalidatePath("/inventario");
  revalidatePath("/pedidos");
}

export async function deleteAttachmentAction(formData: FormData) {
  const supabase = await createClient();
  const id = text(formData, "id");
  const { data: attachment, error: attachmentError } = await supabase
    .from("erp_attachments")
    .select("storage_path")
    .eq("id", id)
    .single();

  await assertOk(attachmentError);

  if (attachment?.storage_path) {
    await supabase.storage.from("erp-files").remove([attachment.storage_path]);
  }

  const { error } = await supabase.from("erp_attachments").delete().eq("id", id);
  await assertOk(error);
  revalidatePath("/contratos");
  revalidatePath("/licitaciones");
  revalidatePath("/cotizaciones");
  revalidatePath("/rh");
  revalidatePath("/inventario");
  revalidatePath("/pedidos");
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
