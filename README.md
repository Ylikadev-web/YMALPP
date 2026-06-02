# YMALPP ERP

ERP web multiempresa para licitaciones mexicanas, contratos, proyectos, cotizaciones, pedidos, remisiones, inventario, RH, finanzas y reportes.

## Stack

- Frontend: Next.js 15 + TypeScript
- Backend: Supabase
- Base de datos: PostgreSQL
- UI: TailwindCSS + componentes estilo ShadCN
- Auth: Supabase Auth
- Storage: Supabase Storage
- Dashboard: Recharts
- Exportaciones: Excel, PDF y PNG
- Seguridad: RLS + RBAC por empresa

## Estructura

```text
src/app                 Rutas Next.js y API routes
src/components          Componentes de UI y modulos ERP
src/lib/auth            Roles y permisos RBAC
src/lib/db              Validadores y helpers de API
src/lib/supabase        Clientes Supabase browser/server
supabase/migrations     SQL completo para Supabase
docs                    Arquitectura y guia de instalacion
```

## SQL de Supabase

El archivo que debes insertar en Supabase es:

```text
supabase/migrations/001_erp_core.sql
```

Puedes copiarlo completo en **Supabase Dashboard > SQL Editor > New query** y ejecutarlo. Incluye tablas, relaciones, indices, triggers, RLS, funciones RBAC, auditoria, control de cambios, bucket privado y documentos obligatorios para licitaciones.

## Configuracion local

1. Copia `.env.example` a `.env.local`.
2. Agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Instala dependencias con `npm install`.
4. Ejecuta `npm run dev`.

En este entorno no pude instalar dependencias porque `npm` no esta disponible y el `node.exe` del sistema esta bloqueado; el proyecto queda listo para ejecutarse cuando Node/npm esten habilitados.

## Rutas principales

- `/dashboard`
- `/licitaciones`
- `/contratos`
- `/cotizaciones`
- `/pedidos`
- `/remisiones`
- `/inventario`
- `/rh`
- `/finanzas`
- `/reportes`
- `/aprobaciones`
- `/configuracion`

## APIs incluidas

- `GET /api/contracts`
- `POST /api/contracts`
- `POST /api/remisiones`
- `PATCH /api/approvals/:id`
- `POST /api/reports/export`
