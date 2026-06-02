import { deflateSync } from "node:zlib";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportRow = Record<string, string | number | null>;

function fileName(moduleName: string, extension: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `ymalpp-${moduleName}-${stamp}.${extension}`;
}

function normalizeRows(data: unknown[] | null, moduleName: string): ReportRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row) => {
    const record = row as Record<string, unknown>;

    if (moduleName === "inventario") {
      const product = record.products as Record<string, unknown> | null;
      const warehouse = record.warehouses as Record<string, unknown> | null;
      return {
        sku: String(product?.sku ?? ""),
        producto: String(product?.name ?? ""),
        almacen: String(warehouse?.name ?? ""),
        existencia: Number(record.stock ?? 0),
        apartado: Number(record.reserved_quantity ?? 0),
        disponible: Number(record.available_quantity ?? 0)
      };
    }

    if (moduleName === "finanzas") {
      const account = record.finance_accounts as Record<string, unknown> | null;
      const contract = record.contracts as Record<string, unknown> | null;
      return {
        fecha: String(record.transaction_date ?? ""),
        cuenta: String(account?.name ?? ""),
        tipo: String(account?.account_type ?? ""),
        contrato: String(contract?.code ?? ""),
        descripcion: String(record.description ?? ""),
        monto: Number(record.amount ?? 0)
      };
    }

    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [
        key,
        typeof value === "number" || typeof value === "string" ? value : value == null ? null : String(value)
      ])
    );
  });
}

async function getRows(moduleName: string, status: string | null) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { rows: [] as ReportRow[], unauthorized: true };
  }

  if (moduleName === "contratos") {
    let query = supabase
      .from("contracts")
      .select("code,name,contract_type,status,amount,start_date,end_date")
      .limit(500);

    if (status && status !== "todos") {
      query = query.eq("status", status === "riesgo" ? "en_riesgo" : status);
    }

    const { data } = await query;
    return { rows: normalizeRows(data, moduleName), unauthorized: false };
  }

  if (moduleName === "inventario") {
    const { data } = await supabase
      .from("inventory_items")
      .select("stock,reserved_quantity,available_quantity,products(name,sku),warehouses(name)")
      .limit(500);
    return { rows: normalizeRows(data, moduleName), unauthorized: false };
  }

  if (moduleName === "rh") {
    const { data } = await supabase
      .from("employees")
      .select("full_name,rfc,curp,nss,email,phone,base_salary,status")
      .limit(500);
    return { rows: normalizeRows(data, moduleName), unauthorized: false };
  }

  if (moduleName === "finanzas") {
    const { data } = await supabase
      .from("finance_transactions")
      .select("transaction_date,description,amount,finance_accounts(name,account_type),contracts(code)")
      .limit(500);
    return { rows: normalizeRows(data, moduleName), unauthorized: false };
  }

  return { rows: [] as ReportRow[], unauthorized: false };
}

function textRows(rows: ReportRow[]) {
  if (rows.length === 0) {
    return ["Sin datos"];
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(","));
  }

  return lines;
}

async function excelResponse(moduleName: string, rows: ReportRow[]) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ mensaje: "Sin datos" }]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
  const body = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;

  return new Response(body, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${fileName(moduleName, "xlsx")}"`
    }
  });
}

async function pdfResponse(moduleName: string, rows: ReportRow[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Reporte ${moduleName}`, 14, 18);
  doc.setFontSize(9);
  textRows(rows)
    .slice(0, 42)
    .forEach((line, index) => {
      doc.text(line.slice(0, 110), 14, 30 + index * 5);
    });

  return new Response(doc.output("arraybuffer"), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName(moduleName, "pdf")}"`
    }
  });
}

function crc32(buffer: Buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ -1) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function pngResponse(moduleName: string, rows: ReportRow[]) {
  const width = 900;
  const height = 420;
  const channels = 4;
  const raw = Buffer.alloc((width * channels + 1) * height);
  const rowCount = Math.max(rows.length, 1);
  const barCount = Math.min(rowCount, 12);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * channels + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = rowStart + 1 + x * channels;
      raw[offset] = 5;
      raw[offset + 1] = 9;
      raw[offset + 2] = 18;
      raw[offset + 3] = 255;
    }
  }

  for (let index = 0; index < barCount; index += 1) {
    const barWidth = 48;
    const gap = 22;
    const xStart = 80 + index * (barWidth + gap);
    const barHeight = 60 + ((index + 1) / barCount) * 260;
    for (let y = height - 70; y > height - 70 - barHeight; y -= 1) {
      for (let x = xStart; x < xStart + barWidth; x += 1) {
        const offset = y * (width * channels + 1) + 1 + x * channels;
        raw[offset] = 0;
        raw[offset + 1] = 229;
        raw[offset + 2] = 255;
        raw[offset + 3] = 255;
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const png = Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);

  return new Response(png, {
    headers: {
      "content-type": "image/png",
      "content-disposition": `attachment; filename="${fileName(moduleName, "png")}"`
    }
  });
}

export async function GET(request: NextRequest) {
  const moduleName = request.nextUrl.searchParams.get("module") ?? "contratos";
  const format = request.nextUrl.searchParams.get("format") ?? "excel";
  const status = request.nextUrl.searchParams.get("status");
  const { rows, unauthorized } = await getRows(moduleName, status);

  if (unauthorized) {
    return new Response("No autorizado", { status: 401 });
  }

  if (format === "pdf") {
    return pdfResponse(moduleName, rows);
  }

  if (format === "png") {
    return pngResponse(moduleName, rows);
  }

  return excelResponse(moduleName, rows);
}
