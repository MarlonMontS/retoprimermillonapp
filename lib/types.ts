export type Rol = "admin" | "gerente" | "lider";
export type Ciudad = "tijuana" | "monterrey" | "en_linea";
export type LeadEstatus =
  | "nuevo"
  | "en_contacto"
  | "no_contesta"
  | "calificado"
  | "no_calificado"
  | "duplicado"
  | "descartado";
export type FuenteTipo =
  | "lider"
  | "gerente"
  | "colaboracion"
  | "publicidad"
  | "contenido"
  | "organico"
  | "otro";
export type Etapa =
  | "inscrito"
  | "dia_cero"
  | "activo"
  | "con_citas"
  | "con_venta"
  | "meta_cumplida"
  | "baja";

export interface Perfil {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: Rol;
  gerente_id: string | null;
  ciudad: Ciudad | null;
  slug: string | null;
  activo: boolean;
  bolsa_manual: boolean | null;
  created_at: string;
}

export interface Fuente {
  id: string;
  slug: string;
  nombre: string;
  tipo: FuenteTipo;
  perfil_id: string | null;
  activo: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  created_at: string;
  nombre: string;
  apellido: string | null;
  whatsapp: string;
  email: string | null;
  ciudad: Ciudad | null;
  experiencia: string | null;
  motivo: string | null;
  como_se_entero: string | null;
  fuente_id: string | null;
  lider_id: string | null;
  desde_bolsa: boolean;
  asignado_at: string | null;
  estatus: LeadEstatus;
  intentos: number;
  ultimo_contacto_at: string | null;
  calificado_at: string | null;
  calificado_por: string | null;
  respuestas_filtro: Record<string, string> | null;
  notas: string | null;
  duplicado_de: string | null;
  etapa: Etapa | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  origen_registro: string;
  external_id: string | null;
  consentimiento: boolean;
}

/** Lead con los nombres de responsable, gerente y fuente ya resueltos. */
export interface LeadConRelaciones extends Lead {
  lider: Pick<Perfil, "id" | "nombre" | "gerente_id" | "rol"> | null;
  fuente: Pick<Fuente, "id" | "slug" | "nombre" | "tipo"> | null;
  posible_duplicado?: boolean;
}

export interface LeadEvento {
  id: number;
  lead_id: string;
  actor_id: string | null;
  tipo: string;
  detalle: Record<string, unknown> | null;
  created_at: string;
  actor?: Pick<Perfil, "id" | "nombre"> | null;
}

/** Fila de la vista lideres_estado */
export interface LiderEstado {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  ciudad: Ciudad | null;
  slug: string | null;
  activo: boolean;
  gerente_id: string | null;
  rol: Rol;
  bolsa_manual: boolean | null;
  created_at: string;
  gerente_nombre: string | null;
  registrados: number;
  calificados: number;
  pendientes: number;
  descartados: number;
  bolsa_recibidos: number;
  bolsa_calificados: number;
  cuota: number;
  desbloqueado: boolean;
}

export const ESTATUS_LABEL: Record<LeadEstatus, string> = {
  nuevo: "Nuevo",
  en_contacto: "En contacto",
  no_contesta: "No contesta",
  calificado: "Calificado",
  no_calificado: "No calificado",
  duplicado: "Duplicado",
  descartado: "Descartado",
};

export const ESTATUS_ORDEN: LeadEstatus[] = [
  "nuevo",
  "en_contacto",
  "no_contesta",
  "calificado",
  "no_calificado",
  "duplicado",
  "descartado",
];

/** Estatus que cuentan como "pendientes de llamar" */
export const ESTATUS_PENDIENTES: LeadEstatus[] = ["nuevo", "en_contacto", "no_contesta"];

export const CIUDAD_LABEL: Record<Ciudad, string> = {
  tijuana: "Tijuana",
  monterrey: "Monterrey",
  en_linea: "En línea",
};

export const ROL_LABEL: Record<Rol, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  lider: "Líder de equipo",
};

export const FUENTE_TIPO_LABEL: Record<FuenteTipo, string> = {
  lider: "Líder",
  gerente: "Gerente",
  colaboracion: "Colaboración",
  publicidad: "Publicidad",
  contenido: "Contenido",
  organico: "Orgánico",
  otro: "Otro",
};

export const ETAPA_LABEL: Record<Etapa, string> = {
  inscrito: "Inscrito",
  dia_cero: "Asistió al Día Cero",
  activo: "Activo",
  con_citas: "Con citas",
  con_venta: "Con venta",
  meta_cumplida: "Meta cumplida",
  baja: "Baja",
};

export const EXPERIENCIA_OPCIONES = [
  { value: "bienes_raices", label: "Sí, en bienes raíces" },
  { value: "ventas_marketing", label: "Sí, en ventas o marketing" },
  { value: "ninguna", label: "No, estoy empezando" },
] as const;

export const COMO_SE_ENTERO_OPCIONES = [
  "Me invitó un líder o conocido",
  "Instagram",
  "Facebook",
  "TikTok",
  "Contenido de Marco Montiel",
  "Colaboración con otra marca",
  "Otro",
] as const;
