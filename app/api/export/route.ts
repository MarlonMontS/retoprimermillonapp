import { getPerfil } from "@/lib/auth";
import { scopeDe } from "@/lib/data/scope";
import { listarLeads, type FiltrosLeads } from "@/lib/data/leads";
import { CIUDAD_LABEL, ESTATUS_LABEL, ETAPA_LABEL, type Ciudad, type LeadEstatus } from "@/lib/types";

function celda(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const perfil = await getPerfil();
  if (!perfil || perfil.rol === "lider") return new Response("No autorizado", { status: 401 });
  const scope = await scopeDe(perfil);

  const url = new URL(req.url);
  const s = (k: string) => url.searchParams.get(k) ?? "";
  const filtros: FiltrosLeads = {
    q: s("q") || undefined,
    estatus: (s("estatus") as LeadEstatus | "pendientes" | "") || undefined,
    ciudad: (s("ciudad") as Ciudad | "") || undefined,
    lider: s("lider") || undefined,
    gerente: s("gerente") || undefined,
    fuente: s("fuente") || undefined,
    bolsa: (s("bolsa") as FiltrosLeads["bolsa"]) || undefined,
    limit: 200,
  };

  const filas: string[][] = [[
    "Nombre", "Apellido", "WhatsApp", "Correo", "Ciudad", "Experiencia", "Motivo", "Cómo se enteró",
    "Responsable", "Fuente", "Tipo de fuente", "De bolsa", "Estatus", "Llamadas", "Último contacto",
    "Calificado el", "Etapa", "Notas", "UTM source", "UTM medium", "UTM campaign", "Origen", "Registrado el", "ID",
  ]];

  for (let page = 1; page <= 50; page++) {
    const { leads, pages } = await listarLeads(scope, { ...filtros, page });
    for (const l of leads) {
      filas.push([
        l.nombre, l.apellido ?? "", l.whatsapp, l.email ?? "", l.ciudad ? CIUDAD_LABEL[l.ciudad] : "", l.experiencia ?? "",
        l.motivo ?? "", l.como_se_entero ?? "", l.lider?.nombre ?? "Bolsa sin asignar", l.fuente?.nombre ?? "", l.fuente?.tipo ?? "",
        l.desde_bolsa ? "Sí" : "No", ESTATUS_LABEL[l.estatus], String(l.intentos), l.ultimo_contacto_at ?? "",
        l.calificado_at ?? "", l.etapa ? ETAPA_LABEL[l.etapa] : "", l.notas ?? "", l.utm_source ?? "", l.utm_medium ?? "",
        l.utm_campaign ?? "", l.origen_registro, l.created_at, l.id,
      ]);
    }
    if (page >= pages) break;
  }

  const csv = "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n");
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-reto-primer-millon-${fecha}.csv"`,
    },
  });
}
