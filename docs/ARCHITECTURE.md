# Arquitectura YMALPP ERP

## Vision

YMALPP ERP es una plataforma SaaS multiempresa para controlar procesos empresariales y gobierno: licitaciones, contratos, proyectos, clientes, cotizaciones, pedidos, remisiones, inventario, RH, finanzas y reportes.

La arquitectura separa cuatro capas:

1. **Presentacion**: Next.js App Router, TypeScript, TailwindCSS, componentes estilo ShadCN y Recharts.
2. **Aplicacion**: API routes de Next.js para validacion, orquestacion de Supabase y futuras exportaciones.
3. **Datos**: PostgreSQL en Supabase con relaciones, constraints, triggers, vistas y funciones.
4. **Seguridad**: Supabase Auth, RLS multiempresa y RBAC por permisos.

## Multiempresa

Cada tabla operativa incluye `company_id`. Las policies RLS usan:

- `public.is_company_member(company_id)`
- `public.has_permission(company_id, permission)`
- `public.current_company_id()`

Esto evita que una empresa vea datos de otra aunque compartan la misma base de datos.

## RBAC

Roles:

- `admin`: control total, usuarios, configuracion, aprobaciones, todos los modulos.
- `socio`: finanzas, RH, aprobaciones, reportes y auditoria.
- `licitaciones`: licitaciones, expedientes y documentos.
- `ventas`: clientes, cotizaciones y pedidos.
- `rh`: empleados, expedientes y nomina.
- `logistica`: remisiones, entregas, pedidos e inventario.

La matriz vive en:

- Frontend: `src/lib/auth/permissions.ts`
- Base de datos: tabla `role_permissions`

## Modulos

### Licitaciones

Cuando `contract_type = 'licitacion'`, el trigger `create_contract_document_checklist_trigger` crea automaticamente los documentos obligatorios mexicanos:

- Acta constitutiva
- Poder notarial
- Opinion SAT
- Opinion IMSS
- Opinion INFONAVIT
- Constancia situacion fiscal
- Identificacion representante legal
- Comprobante domicilio
- Declaraciones
- Propuesta tecnica
- Propuesta economica
- Garantias
- Fianzas
- Catalogo de conceptos
- Junta de aclaraciones
- Acta de fallo

Los documentos se versionan en `document_versions` y se aprueban/rechazan desde `contract_documents`.

### Contratos

`contracts` contiene cliente, proyecto, monto, vigencia, responsable y estatus.

`contract_items` modela:

```text
Sector -> Requerimiento -> Partida -> Producto
```

Incluye cantidad contratada, cantidad entregada, pendiente, precio unitario e importe.

### Remisiones

`remission_items` dispara:

- `validate_remission_item_quantity()`: bloquea entregas superiores a lo pendiente.
- `sync_contract_item_delivered()`: actualiza `delivered_quantity` en la partida.
- Movimiento automatico de inventario cuando hay `warehouse_id`.

### Pedidos fuera de contrato

El trigger `flag_out_of_contract_order_item_trigger` marca el item como `pendiente_aprobacion` si no tiene `contract_item_id` o `in_contract = false`, y crea una solicitud en `approvals`.

### Aprobaciones

`approvals` y `approval_actions` cubren:

- Productos fuera de contrato
- Cambios solicitados
- Correcciones
- Modificaciones

Solo `admin` y `socio` pueden aprobar, rechazar o solicitar informacion.

### Auditoria y control de cambios

- `audit_events`: registra creacion, edicion, eliminacion y descargas futuras.
- `change_log`: registra campo modificado, valor anterior, valor nuevo, usuario, fecha y motivo.

Para guardar motivo en una transaccion SQL:

```sql
select set_config('app.change_reason', 'Correccion autorizada por direccion', true);
```

## APIs

### `GET /api/contracts`

Lista contratos con cliente, proyecto y partidas.

### `POST /api/contracts`

Crea contrato y partidas. Si el tipo es licitacion, el SQL genera el checklist documental.

### `POST /api/remisiones`

Crea remision y partidas. El SQL actualiza entregado/pendiente.

### `PATCH /api/approvals/:id`

Actualiza estatus de aprobacion e inserta bitacora en `approval_actions`.

### `POST /api/reports/export`

Registra solicitud de exportacion Excel, PDF o PNG. El worker futuro debe generar el archivo y subirlo a Storage.

## Frontend

La primera pantalla es `/dashboard`, con:

- Dashboard de proyectos
- Dashboard financiero
- Contratos activos
- Licitaciones abiertas
- Entregas pendientes
- Pedidos pendientes
- Productos pendientes de aprobacion
- Proyectos en riesgo

Los modulos comparten `AppShell`, navegacion por permisos y componentes UI reutilizables.
