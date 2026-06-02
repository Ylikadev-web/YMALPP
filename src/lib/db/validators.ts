import { z } from "zod";

export const contractItemSchema = z.object({
  item_number: z.string().min(1),
  sector_id: z.string().uuid().optional(),
  requirement_id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  description: z.string().optional(),
  contracted_quantity: z.number().positive(),
  unit_price: z.number().nonnegative()
});

export const contractSchema = z.object({
  client_id: z.string().uuid(),
  project_id: z.string().uuid().optional(),
  contract_type: z.enum(["licitacion", "directo", "marco", "servicio"]),
  code: z.string().min(3),
  name: z.string().min(3),
  amount: z.number().nonnegative(),
  start_date: z.string().date(),
  end_date: z.string().date(),
  responsible_user_id: z.string().uuid().optional(),
  items: z.array(contractItemSchema).default([])
});

export const remissionSchema = z.object({
  contract_id: z.string().uuid(),
  delivery_date: z.string().date(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        contract_item_id: z.string().uuid(),
        product_id: z.string().uuid(),
        quantity: z.number().positive(),
        warehouse_id: z.string().uuid().optional()
      })
    )
    .min(1)
});

export const approvalActionSchema = z.object({
  action: z.enum(["aprobado", "rechazado", "informacion_requerida"]),
  comment: z.string().min(3).optional()
});

export const reportExportSchema = z.object({
  module: z.enum([
    "licitaciones",
    "contratos",
    "proyectos",
    "cotizaciones",
    "pedidos",
    "remisiones",
    "inventario",
    "rh",
    "finanzas"
  ]),
  format: z.enum(["excel", "pdf", "png"]),
  filters: z.record(z.unknown()).default({})
});
