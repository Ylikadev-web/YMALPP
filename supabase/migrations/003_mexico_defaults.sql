-- YMALPP ERP Mexico defaults.
-- Run after 002_customizable_contracts_attachments.sql.

insert into public.contract_document_templates (company_id, contract_type, name, required, sort_order)
select null, contract_type, name, required, sort_order
from (
  values
    ('licitacion_publica_nacional'::public.contract_type, 'Convocatoria', true, 5),
    ('licitacion_publica_nacional'::public.contract_type, 'Bases de licitacion', true, 10),
    ('licitacion_publica_nacional'::public.contract_type, 'Junta de aclaraciones', true, 20),
    ('licitacion_publica_nacional'::public.contract_type, 'Propuesta tecnica', true, 30),
    ('licitacion_publica_nacional'::public.contract_type, 'Propuesta economica', true, 40),
    ('licitacion_publica_nacional'::public.contract_type, 'Acta de fallo', true, 50),
    ('licitacion_publica_internacional'::public.contract_type, 'Convocatoria internacional', true, 5),
    ('licitacion_publica_internacional'::public.contract_type, 'Bases de licitacion internacional', true, 10),
    ('licitacion_publica_internacional'::public.contract_type, 'Propuesta tecnica', true, 30),
    ('licitacion_publica_internacional'::public.contract_type, 'Propuesta economica', true, 40),
    ('invitacion_a_cuando_menos_tres'::public.contract_type, 'Invitacion', true, 10),
    ('invitacion_a_cuando_menos_tres'::public.contract_type, 'Cotizaciones recibidas', true, 20),
    ('invitacion_a_cuando_menos_tres'::public.contract_type, 'Cuadro comparativo', true, 30),
    ('invitacion_a_cuando_menos_tres'::public.contract_type, 'Fallo / adjudicacion', true, 40),
    ('adjudicacion_directa'::public.contract_type, 'Justificacion de adjudicacion', true, 10),
    ('adjudicacion_directa'::public.contract_type, 'Suficiencia presupuestal', true, 20),
    ('adjudicacion_directa'::public.contract_type, 'Cotizacion autorizada', true, 30),
    ('contrato_abierto'::public.contract_type, 'Minimos y maximos', true, 10),
    ('contrato_abierto'::public.contract_type, 'Contrato abierto firmado', true, 20),
    ('contrato_marco'::public.contract_type, 'Contrato marco firmado', true, 10),
    ('pedido'::public.contract_type, 'Pedido / orden de compra', true, 10),
    ('convenio_modificatorio'::public.contract_type, 'Solicitud de modificacion', true, 10),
    ('convenio_modificatorio'::public.contract_type, 'Convenio firmado', true, 20),
    ('obra_publica'::public.contract_type, 'Catalogo de conceptos', true, 10),
    ('obra_publica'::public.contract_type, 'Programa de obra', true, 20),
    ('adquisiciones'::public.contract_type, 'Ficha tecnica', true, 10),
    ('arrendamiento'::public.contract_type, 'Contrato de arrendamiento', true, 10),
    ('servicios_profesionales'::public.contract_type, 'Alcance de servicios', true, 10)
) as t(contract_type, name, required, sort_order)
on conflict do nothing;

insert into public.contract_documents (company_id, contract_id, template_id, name, required, status)
select
  c.company_id,
  c.id,
  t.id,
  t.name,
  t.required,
  'pendiente'::public.document_status
from public.contracts c
join public.contract_document_templates t
  on t.contract_type = c.contract_type
  and t.active = true
  and (t.company_id is null or t.company_id = c.company_id)
where not exists (
  select 1
  from public.contract_documents cd
  where cd.contract_id = c.id
    and lower(cd.name) = lower(t.name)
)
on conflict do nothing;

insert into public.contract_process_stages (company_id, contract_type, name, sort_order, required)
select c.id, s.contract_type, s.name, s.sort_order, s.required
from public.companies c
cross join (
  values
    ('licitacion_publica_nacional'::public.contract_type, 'Planeacion y requisicion', 10, true),
    ('licitacion_publica_nacional'::public.contract_type, 'Convocatoria y bases', 20, true),
    ('licitacion_publica_nacional'::public.contract_type, 'Junta de aclaraciones', 30, true),
    ('licitacion_publica_nacional'::public.contract_type, 'Propuesta tecnica', 40, true),
    ('licitacion_publica_nacional'::public.contract_type, 'Propuesta economica', 50, true),
    ('licitacion_publica_nacional'::public.contract_type, 'Fallo', 60, true),
    ('licitacion_publica_nacional'::public.contract_type, 'Contrato y entrega', 70, true),
    ('licitacion_publica_internacional'::public.contract_type, 'Planeacion y requisicion', 10, true),
    ('licitacion_publica_internacional'::public.contract_type, 'Convocatoria internacional', 20, true),
    ('licitacion_publica_internacional'::public.contract_type, 'Propuesta tecnica', 40, true),
    ('licitacion_publica_internacional'::public.contract_type, 'Propuesta economica', 50, true),
    ('licitacion_publica_internacional'::public.contract_type, 'Fallo', 60, true),
    ('invitacion_a_cuando_menos_tres'::public.contract_type, 'Invitacion a proveedores', 10, true),
    ('invitacion_a_cuando_menos_tres'::public.contract_type, 'Recepcion de propuestas', 20, true),
    ('invitacion_a_cuando_menos_tres'::public.contract_type, 'Cuadro comparativo', 30, true),
    ('invitacion_a_cuando_menos_tres'::public.contract_type, 'Adjudicacion', 40, true),
    ('adjudicacion_directa'::public.contract_type, 'Justificacion', 10, true),
    ('adjudicacion_directa'::public.contract_type, 'Cotizacion', 20, true),
    ('adjudicacion_directa'::public.contract_type, 'Autorizacion', 30, true),
    ('adjudicacion_directa'::public.contract_type, 'Contrato / pedido', 40, true),
    ('contrato_abierto'::public.contract_type, 'Minimos y maximos', 10, true),
    ('contrato_abierto'::public.contract_type, 'Ordenes derivadas', 20, false),
    ('contrato_abierto'::public.contract_type, 'Cierre', 90, false),
    ('pedido'::public.contract_type, 'Solicitud', 10, true),
    ('pedido'::public.contract_type, 'Autorizacion', 20, true),
    ('pedido'::public.contract_type, 'Entrega', 30, true),
    ('convenio_modificatorio'::public.contract_type, 'Solicitud de modificacion', 10, true),
    ('convenio_modificatorio'::public.contract_type, 'Autorizacion juridica', 20, true),
    ('convenio_modificatorio'::public.contract_type, 'Firma', 30, true)
) as s(contract_type, name, sort_order, required)
on conflict do nothing;

insert into public.quote_templates (
  company_id,
  name,
  primary_color,
  secondary_color,
  header,
  footer,
  signature,
  editable_schema,
  canvas_schema
)
select
  c.id,
  q.name,
  q.primary_color,
  q.secondary_color,
  q.header::jsonb,
  q.footer::jsonb,
  q.signature::jsonb,
  q.editable_schema::jsonb,
  '{}'::jsonb
from public.companies c
cross join (
  values
    (
      'YLIKA MATERIALES',
      '#1f766f',
      '#c29a54',
      '{"text":"YLIKA MATERIALES"}',
      '{"text":"Gracias por su preferencia"}',
      '{"name":"Direccion Comercial"}',
      '{"font":"Inter","terms":"Precios sujetos a disponibilidad. Tiempo de entrega y vigencia segun propuesta."}'
    ),
    (
      'MONE',
      '#20344a',
      '#b9965a',
      '{"text":"MONE"}',
      '{"text":"Cotizacion confidencial"}',
      '{"name":"Representante autorizado"}',
      '{"font":"Inter","terms":"Vigencia segun propuesta. Condiciones comerciales personalizables."}'
    )
) as q(name, primary_color, secondary_color, header, footer, signature, editable_schema)
on conflict do nothing;
