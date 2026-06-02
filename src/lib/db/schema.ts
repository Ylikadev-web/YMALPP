import type { AppRole } from "@/lib/auth/permissions";

export type Status =
  | "borrador"
  | "activo"
  | "pendiente_aprobacion"
  | "aprobado"
  | "rechazado"
  | "cerrado"
  | "cancelado"
  | "en_riesgo";

export type Company = {
  id: string;
  name: string;
  rfc?: string;
  logoUrl?: string;
};

export type SessionProfile = {
  id: string;
  fullName: string;
  email: string;
  companyId: string;
  companyName: string;
  role: AppRole;
};

export type Client = {
  id: string;
  name: string;
  rfc: string;
  contactName?: string;
  email?: string;
  phone?: string;
};

export type ContractType = "licitacion" | "directo" | "marco" | "servicio";

export type Contract = {
  id: string;
  code: string;
  name: string;
  type: ContractType;
  client: string;
  project: string;
  amount: number;
  startDate: string;
  endDate: string;
  responsible: string;
  status: Status;
  financialProgress: number;
  physicalProgress: number;
};

export type ContractItem = {
  id: string;
  contractId: string;
  itemNumber: string;
  sector: string;
  requirement: string;
  product: string;
  contractedQuantity: number;
  deliveredQuantity: number;
  unitPrice: number;
};

export type BidDocument = {
  id: string;
  name: string;
  required: boolean;
  status: "pendiente" | "subido" | "aprobado" | "rechazado";
  version: number;
};

export type Approval = {
  id: string;
  module: string;
  title: string;
  requestedBy: string;
  status: "pendiente" | "aprobado" | "rechazado" | "informacion_requerida";
  reason: string;
  createdAt: string;
};

export type FinancialMetric = {
  label: string;
  value: number;
  delta: number;
  intent?: "success" | "warning" | "danger" | "neutral";
};

export type ProjectRisk = {
  id: string;
  name: string;
  contract: string;
  risk: "bajo" | "medio" | "alto";
  pendingDeliveries: number;
  pendingApprovals: number;
};
