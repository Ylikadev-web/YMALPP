import type { Permission } from "@/lib/auth/permissions";

export type ModuleKey =
  | "dashboard"
  | "licitaciones"
  | "contratos"
  | "cotizaciones"
  | "pedidos"
  | "remisiones"
  | "inventario"
  | "rh"
  | "finanzas"
  | "reportes"
  | "aprobaciones"
  | "configuracion";

export type AppModule = {
  key: ModuleKey;
  label: string;
  href: string;
  icon: string;
  description: string;
  permissions: Permission[];
};

export const appModules: AppModule[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    description: "Indicadores operativos, financieros y de riesgo.",
    permissions: ["contracts.read"]
  },
  {
    key: "licitaciones",
    label: "Licitaciones",
    href: "/licitaciones",
    icon: "FileCheck2",
    description: "Expedientes, documentos obligatorios y estatus de concursos.",
    permissions: ["bids.manage"]
  },
  {
    key: "contratos",
    label: "Contratos",
    href: "/contratos",
    icon: "ScrollText",
    description: "Contratos, partidas, jerarquia sector-requerimiento-producto.",
    permissions: ["contracts.read"]
  },
  {
    key: "cotizaciones",
    label: "Cotizaciones",
    href: "/cotizaciones",
    icon: "FilePenLine",
    description: "Clientes, plantillas, partidas y exportaciones comerciales.",
    permissions: ["quotes.manage"]
  },
  {
    key: "pedidos",
    label: "Pedidos",
    href: "/pedidos",
    icon: "ShoppingCart",
    description: "Pedidos dentro y fuera de contrato con bloqueo por aprobacion.",
    permissions: ["orders.manage"]
  },
  {
    key: "remisiones",
    label: "Remisiones",
    href: "/remisiones",
    icon: "Truck",
    description: "Entregas por contrato, partida y producto con saldo en tiempo real.",
    permissions: ["shipments.manage"]
  },
  {
    key: "inventario",
    label: "Inventario",
    href: "/inventario",
    icon: "Warehouse",
    description: "Existencias, entradas, salidas y apartados por contrato/pedido.",
    permissions: ["inventory.manage"]
  },
  {
    key: "rh",
    label: "RH",
    href: "/rh",
    icon: "UsersRound",
    description: "Empleados, expedientes, documentos y nomina.",
    permissions: ["hr.manage"]
  },
  {
    key: "finanzas",
    label: "Finanzas",
    href: "/finanzas",
    icon: "Landmark",
    description: "Ingresos, egresos, utilidad, ROI y flujo de efectivo.",
    permissions: ["finance.read"]
  },
  {
    key: "reportes",
    label: "Reportes",
    href: "/reportes",
    icon: "BarChart3",
    description: "Filtros dinamicos y exportaciones Excel, PDF y PNG.",
    permissions: ["reports.export"]
  },
  {
    key: "aprobaciones",
    label: "Aprobaciones",
    href: "/aprobaciones",
    icon: "ShieldCheck",
    description: "Productos fuera de contrato, cambios y correcciones.",
    permissions: ["approvals.manage"]
  },
  {
    key: "configuracion",
    label: "Configuracion",
    href: "/configuracion",
    icon: "Settings",
    description: "Usuarios, roles, documentos configurables y parametros.",
    permissions: ["system.configure"]
  }
];
