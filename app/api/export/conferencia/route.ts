import { getPerfil } from "@/lib/auth";
import { listarConferencia } from "@/lib/data/conferencia";

function celda(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV de registrados a la conferencia de apertura en Monterrey. Solo administradores. */
export async function GET() {
  const perfil = await getPerfil();
  if (!perfil || perfil.rol !== "admin") return new Response("No autorizado", { status: 401 });
  const filas = [["Nombre", "Correo", "WhatsApp", "Registrado el"]];
  for (const r of await listarConferencia()) filas.push([r.nombre, r.email, r.whatsapp, r.created_at]);
  const csv = "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="conferencia-apertura-monterrey-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
