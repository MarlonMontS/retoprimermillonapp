import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { getConfig } from "@/lib/data/config";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import { appUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Ayuda" };
export const dynamic = "force-dynamic";

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">{n}</span>
      <div>
        <p className="font-medium">{titulo}</p>
        <p className="text-sm text-muted">{children}</p>
      </div>
    </li>
  );
}

export default async function AyudaPage() {
  const [perfil, config] = await Promise.all([requirePerfil(), getConfig()]);
  const cuota = config.cuota_minima;

  return (
    <>
      <PageHeader title="Cómo funciona" subtitle="Guía rápida según tu rol en el Reto Primer Millón" />

      <div className="grid gap-4 lg:grid-cols-2">
        {perfil.rol === "lider" && (
          <Card>
            <CardTitle>Si eres líder de equipo</CardTitle>
            <ol className="space-y-4">
              <Paso n={1} titulo="Comparte solo tu enlace">
                Está en Mi avance. Quien se registre con él queda en tu equipo. No mandes el formulario de la landing: ahí tendrían que elegir tu nombre a mano y se puede perder tu invitado.
              </Paso>
              <Paso n={2} titulo="Tu gerente llama a cada invitado">
                Hace una llamada corta de filtro. Si pasa, el invitado aparece como Calificado y suma a tu cuota. Si no contesta, lo seguirá intentando.
              </Paso>
              <Paso n={3} titulo={`Llega a ${cuota} calificados`}>
                Con {cuota} invitados calificados se abre tu acceso a la bolsa común: desde ese momento la ruleta te asigna, además, leads que llegan por publicidad y colaboraciones.
              </Paso>
              <Paso n={4} titulo="Cuida los duplicados">
                Si dos líderes registran a la misma persona, se la queda quien la califique primero. Invita a gente que de verdad conoces y confírmales que se registren con tu enlace.
              </Paso>
              <Paso n={5} titulo="Revisa el ranking">
                Se ordena por invitados calificados. Los leads de bolsa no cuentan para la cuota, pero sí para tu equipo del Reto.
              </Paso>
            </ol>
          </Card>
        )}

        {perfil.rol === "gerente" && (
          <Card>
            <CardTitle>Si eres gerente</CardTitle>
            <ol className="space-y-4">
              <Paso n={1} titulo="Trabaja la cola Por llamar">
                En tu tablero aparecen los invitados de tus líderes pendientes de filtro, los más antiguos primero. Entra a cada uno; desde ahí marcas o abres WhatsApp.
              </Paso>
              <Paso n={2} titulo="Registra el resultado de cada llamada">
                Calificado si pasa el filtro. En contacto si ya hablaron pero falta definir. No contesta para reintentar después. No calificado si no cumple o no le interesa. Descartado si el número es falso o es una prueba.
              </Paso>
              <Paso n={3} titulo="Solo Calificado suma">
                Es lo único que cuenta para la cuota del líder. Puedes contestar las preguntas del filtro y dejar notas; ambas quedan en la bitácora.
              </Paso>
              <Paso n={4} titulo="Duplicados">
                Si el sistema avisa que el WhatsApp ya está con otro responsable, gana quien lo califique primero. Si tú calificas, la otra copia se marca como duplicado automáticamente.
              </Paso>
              <Paso n={5} titulo="Tu equipo">
                En Mi equipo ves el avance de cada líder y puedes dar de alta líderes nuevos. Si un lead cayó con el líder equivocado dentro de tu equipo, reasígnalo desde su ficha.
              </Paso>
            </ol>
          </Card>
        )}

        {perfil.rol === "admin" && (
          <Card>
            <CardTitle>Si eres administrador</CardTitle>
            <ol className="space-y-4">
              <Paso n={1} titulo="Equipo">
                Crea gerentes en Gerentes y líderes en Líderes, uno por uno o pegando tu lista en Importar equipo. Cada alta genera usuario, contraseña y enlace de invitación.
              </Paso>
              <Paso n={2} titulo="Enlaces y campañas">
                Ahí están el formulario general para la landing, el código para Framer y los enlaces por campaña o marca. Cada campaña tiene su enlace para saber de dónde llega cada lead.
              </Paso>
              <Paso n={3} titulo="Bolsa común">
                Leads sin invitador. La ruleta los reparte entre líderes desbloqueados; puedes forzar el reparto o apagar la ruleta en Configuración.
              </Paso>
              <Paso n={4} titulo="Atribución">
                Desde la ficha de un lead puedes cambiar el responsable o regresarlo a la bolsa. Marca «lead de bolsa» si no debe contar para la cuota.
              </Paso>
              <Paso n={5} titulo="Importar y exportar">
                Importar acepta el CSV de contactos de GoHighLevel. En Leads, Exportar CSV descarga lo que tengas filtrado.
              </Paso>
            </ol>
          </Card>
        )}

        <Card>
          <CardTitle>Reglas del programa</CardTitle>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
            <li>Cada líder necesita {cuota} invitados calificados por llamada para desbloquear la bolsa común.</li>
            <li>Los leads de publicidad, colaboraciones y del formulario general sin invitador van a la bolsa común.</li>
            <li>La ruleta reparte la bolsa al azar entre los líderes desbloqueados, dando prioridad a quien menos ha recibido.</li>
            <li>Un mismo WhatsApp registrado con dos responsables: gana el primero que lo califica.</li>
            <li>Los gerentes solo califican a los invitados de su propio equipo.</li>
            <li>Tu contraseña se cambia en Mi cuenta. Si la olvidas, tu gerente o el administrador te generan una nueva.</li>
          </ul>
          <p className="mt-4 text-xs text-dim">
            Formulario general: {appUrl("/registro")}
          </p>
        </Card>
      </div>
    </>
  );
}
