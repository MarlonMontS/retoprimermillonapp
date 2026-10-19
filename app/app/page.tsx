import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { TableroAdmin } from "@/components/tableros/admin";
import { TableroGerente } from "@/components/tableros/gerente";
import { TableroLider } from "@/components/tableros/lider";

export const metadata: Metadata = { title: "Tablero" };
export const dynamic = "force-dynamic";

export default async function TableroPage() {
  const perfil = await requirePerfil();
  if (perfil.rol === "lider") return <TableroLider perfil={perfil} />;
  if (perfil.rol === "gerente") return <TableroGerente perfil={perfil} />;
  return <TableroAdmin />;
}
