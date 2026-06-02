import type {
  Approval,
  BidDocument,
  Contract,
  ContractItem,
  FinancialMetric,
  ProjectRisk,
  SessionProfile
} from "@/lib/db/schema";

export const demoProfile: SessionProfile = {
  id: "demo-admin",
  fullName: "Administracion YLIKA",
  email: "admin@ylika.local",
  companyId: "demo-company",
  companyName: "YLIKA Materiales",
  role: "admin"
};

export const contracts: Contract[] = [
  {
    id: "ctr-001",
    code: "LPN-YLK-2026-001",
    name: "Equipamiento medico hospital regional",
    type: "licitacion",
    client: "Secretaria de Salud",
    project: "Hospital Regional Norte",
    amount: 14850000,
    startDate: "2026-01-15",
    endDate: "2026-11-30",
    responsible: "Laura Medina",
    status: "activo",
    financialProgress: 62,
    physicalProgress: 54
  },
  {
    id: "ctr-002",
    code: "CD-YLK-2026-014",
    name: "Suministro materiales de obra",
    type: "directo",
    client: "Municipio de Queretaro",
    project: "Rehabilitacion urbana",
    amount: 4320000,
    startDate: "2026-02-01",
    endDate: "2026-08-15",
    responsible: "Roberto Ruiz",
    status: "en_riesgo",
    financialProgress: 48,
    physicalProgress: 35
  },
  {
    id: "ctr-003",
    code: "CM-YLK-2026-021",
    name: "Contrato marco consumibles",
    type: "marco",
    client: "Instituto Estatal de Educacion",
    project: "Abasto semestral",
    amount: 2850000,
    startDate: "2026-03-10",
    endDate: "2026-09-10",
    responsible: "Nadia Torres",
    status: "activo",
    financialProgress: 36,
    physicalProgress: 41
  }
];

export const contractItems: ContractItem[] = [
  {
    id: "item-001",
    contractId: "ctr-001",
    itemNumber: "12",
    sector: "Salud",
    requirement: "Equipamiento Medico",
    product: "Monitor Multiparametro",
    contractedQuantity: 80,
    deliveredQuantity: 47,
    unitPrice: 62000
  },
  {
    id: "item-002",
    contractId: "ctr-001",
    itemNumber: "18",
    sector: "Salud",
    requirement: "Mobiliario Clinico",
    product: "Cama hospitalaria electrica",
    contractedQuantity: 120,
    deliveredQuantity: 70,
    unitPrice: 38500
  },
  {
    id: "item-003",
    contractId: "ctr-002",
    itemNumber: "04",
    sector: "Infraestructura",
    requirement: "Construccion",
    product: "Cemento CPC 30R",
    contractedQuantity: 1500,
    deliveredQuantity: 610,
    unitPrice: 216
  }
];

export const mandatoryBidDocuments: BidDocument[] = [
  { id: "doc-01", name: "Acta constitutiva", required: true, status: "aprobado", version: 2 },
  { id: "doc-02", name: "Poder notarial", required: true, status: "subido", version: 1 },
  { id: "doc-03", name: "Opinion SAT", required: true, status: "pendiente", version: 0 },
  { id: "doc-04", name: "Opinion IMSS", required: true, status: "aprobado", version: 1 },
  { id: "doc-05", name: "Opinion INFONAVIT", required: true, status: "pendiente", version: 0 },
  { id: "doc-06", name: "Constancia situacion fiscal", required: true, status: "subido", version: 1 },
  { id: "doc-07", name: "Identificacion representante legal", required: true, status: "aprobado", version: 1 },
  { id: "doc-08", name: "Comprobante domicilio", required: true, status: "rechazado", version: 3 },
  { id: "doc-09", name: "Declaraciones", required: true, status: "pendiente", version: 0 },
  { id: "doc-10", name: "Propuesta tecnica", required: true, status: "subido", version: 1 },
  { id: "doc-11", name: "Propuesta economica", required: true, status: "pendiente", version: 0 },
  { id: "doc-12", name: "Garantias", required: true, status: "pendiente", version: 0 },
  { id: "doc-13", name: "Fianzas", required: true, status: "pendiente", version: 0 },
  { id: "doc-14", name: "Catalogo de conceptos", required: true, status: "subido", version: 1 },
  { id: "doc-15", name: "Junta de aclaraciones", required: true, status: "pendiente", version: 0 },
  { id: "doc-16", name: "Acta de fallo", required: true, status: "pendiente", version: 0 }
];

export const approvals: Approval[] = [
  {
    id: "apr-001",
    module: "Pedidos",
    title: "Producto fuera de contrato: Kit de instalacion avanzada",
    requestedBy: "Ventas",
    status: "pendiente",
    reason: "El cliente solicito accesorios no incluidos en la partida 12.",
    createdAt: "2026-05-28"
  },
  {
    id: "apr-002",
    module: "Contratos",
    title: "Cambio de precio unitario en partida 04",
    requestedBy: "Contratos",
    status: "informacion_requerida",
    reason: "Se requiere soporte de proveedor y motivo comercial.",
    createdAt: "2026-05-27"
  }
];

export const financialMetrics: FinancialMetric[] = [
  { label: "Ingresos", value: 22150000, delta: 14.2, intent: "success" },
  { label: "Egresos", value: 14220000, delta: 6.8, intent: "neutral" },
  { label: "Utilidad bruta", value: 7930000, delta: 18.4, intent: "success" },
  { label: "Utilidad neta", value: 5165000, delta: 11.6, intent: "success" },
  { label: "Nomina", value: 1860000, delta: 4.1, intent: "neutral" },
  { label: "Gastos operativos", value: 910000, delta: -2.4, intent: "success" },
  { label: "ROI", value: 27.5, delta: 3.2, intent: "success" },
  { label: "Margen", value: 23.3, delta: 2.1, intent: "success" }
];

export const projectRisks: ProjectRisk[] = [
  {
    id: "risk-001",
    name: "Hospital Regional Norte",
    contract: "LPN-YLK-2026-001",
    risk: "medio",
    pendingDeliveries: 9,
    pendingApprovals: 1
  },
  {
    id: "risk-002",
    name: "Rehabilitacion urbana",
    contract: "CD-YLK-2026-014",
    risk: "alto",
    pendingDeliveries: 14,
    pendingApprovals: 2
  }
];

export const cashflow = [
  { month: "Ene", ingresos: 2800000, egresos: 1700000 },
  { month: "Feb", ingresos: 3100000, egresos: 1950000 },
  { month: "Mar", ingresos: 3600000, egresos: 2200000 },
  { month: "Abr", ingresos: 4100000, egresos: 2450000 },
  { month: "May", ingresos: 4550000, egresos: 2920000 },
  { month: "Jun", ingresos: 5200000, egresos: 3180000 }
];
