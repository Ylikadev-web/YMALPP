export const mexicanContractTypes = [
  { value: "licitacion_publica_nacional", label: "Licitacion publica nacional" },
  { value: "licitacion_publica_internacional", label: "Licitacion publica internacional" },
  { value: "invitacion_a_cuando_menos_tres", label: "Invitacion a cuando menos tres" },
  { value: "adjudicacion_directa", label: "Adjudicacion directa" },
  { value: "contrato_abierto", label: "Contrato abierto" },
  { value: "contrato_marco", label: "Contrato marco" },
  { value: "pedido", label: "Pedido / orden de compra" },
  { value: "convenio_modificatorio", label: "Convenio modificatorio" },
  { value: "obra_publica", label: "Obra publica" },
  { value: "adquisiciones", label: "Adquisiciones" },
  { value: "arrendamiento", label: "Arrendamiento" },
  { value: "servicios_profesionales", label: "Servicios profesionales" },
  { value: "licitacion", label: "Licitacion generica" },
  { value: "directo", label: "Contrato directo" },
  { value: "marco", label: "Marco generico" },
  { value: "servicio", label: "Servicio generico" }
];

export function contractTypeLabel(value: string) {
  return mexicanContractTypes.find((type) => type.value === value)?.label ?? value;
}
