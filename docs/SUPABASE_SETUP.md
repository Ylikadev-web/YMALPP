# Guia Supabase

## 1. Crear proyecto

1. Crea un proyecto en Supabase.
2. Copia `Project URL` y `anon public key`.
3. Configura `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 2. Ejecutar SQL

Abre:

```text
supabase/migrations/001_erp_core.sql
```

Luego:

1. Ve a **Supabase Dashboard > SQL Editor**.
2. Crea una query nueva.
3. Pega todo el contenido.
4. Ejecuta.

El SQL crea:

- Enums
- Tablas
- Relaciones
- Indices
- Triggers
- Funciones
- Vistas
- Policies RLS
- Bucket privado `erp-files`
- Documentos obligatorios para licitaciones

## 3. Crear primer admin

1. Crea un usuario desde **Authentication > Users**.
2. Copia su `User UID`.
3. Ejecuta:

```sql
select public.create_company_with_admin(
  'YLIKA Materiales',
  'YLI000000XXX',
  'PEGA_AQUI_EL_USER_UID'::uuid
);
```

Ese usuario queda como `admin` de la empresa.

## 4. Storage

El bucket `erp-files` es privado. Usa esta estructura para rutas:

```text
{company_id}/contracts/{contract_id}/documents/{document_id}/v{version}/{file_name}
{company_id}/employees/{employee_id}/documents/{file_name}
{company_id}/exports/{report_export_id}/{file_name}
```

Las policies validan que la primera carpeta sea el `company_id` del usuario.

## 5. Datos minimos recomendados

Despues de crear la empresa:

```sql
insert into public.clients (name, legal_name, rfc, contact_name, email)
values ('Secretaria de Salud', 'Secretaria de Salud', 'SSA000000XXX', 'Contacto Gobierno', 'contacto@salud.gob.mx');

insert into public.sectors (name, description)
values ('Salud', 'Sector salud y equipamiento medico');

insert into public.products (sku, name, unit, default_price)
values
  ('MON-MP-12', 'Monitor Multiparametro', 'pieza', 62000),
  ('CAM-HOS-08', 'Cama hospitalaria electrica', 'pieza', 38500);
```

Ejecuta esos inserts con una sesion autenticada o desde SQL Editor ajustando `company_id` si hace falta.

## 6. Validaciones clave

- Un usuario solo ve datos de empresas donde tiene membresia activa.
- Finanzas solo es visible para `admin` y `socio`.
- RH no es visible para `ventas`.
- Licitaciones no ve finanzas.
- Productos fuera de contrato quedan en `pendiente_aprobacion`.
- Remisiones no pueden entregar mas de lo pendiente.
- Toda modificacion relevante se registra en `change_log`.
