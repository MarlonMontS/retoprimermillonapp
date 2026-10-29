import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { Alert, PageHeader } from "@/components/ui";
import { Chat } from "./chat";

export const metadata: Metadata = { title: "Soporte 24/7" };
export const dynamic = "force-dynamic";

const SUGERENCIAS = {
  lider: [
    "¿Cuántos invitados me faltan para la bolsa común?",
    "Escríbeme un mensaje de WhatsApp para invitar a un amigo",
    "¿Cómo funcionan los premios y los folios?",
    "¿Qué hago si alguien ya se registró con otro líder?",
  ],
  gerente: [
    "Dame un guion corto para la llamada de filtro",
    "¿Qué resultado pongo si no contesta?",
    "¿Cómo reasigno un lead dentro de mi equipo?",
    "¿Cómo respondo si dicen que no tienen experiencia?",
  ],
  admin: [
    "¿Cómo funciona la ruleta de la bolsa común?",
    "¿Qué pasa si un lead de Tijuana entra con un líder de Monterrey?",
    "Resume las reglas del programa para mandarlas al equipo",
    "¿Cuáles son las fechas de cada ciudad?",
  ],
} as const;

export default async function AsistentePage() {
  const perfil = await requirePerfil();
  const configurado = Boolean(process.env.ANTHROPIC_API_KEY);
  return (
    <>
      <PageHeader title="Soporte 24/7" subtitle="Resuelve dudas del Reto, de la app, y te ayuda a invitar y vender. Puede equivocarse: confirma lo importante con tu gerente." />
      {configurado ? (
        <Chat sugerencias={[...SUGERENCIAS[perfil.rol]]} nombre={perfil.nombre} />
      ) : (
        <Alert tone="warn">El asistente todavía no está activado. El administrador debe configurar la llave de la API de Claude.</Alert>
      )}
    </>
  );
}
