import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Registro recibido" };

export default function GraciasPage() {
  return (
    <PublicShell embed={false} titulo="¡Registro recibido!" subtitulo="Gracias por aceptar el reto.">
      <div className="space-y-3 text-muted">
        <p>
          En los próximos días alguien del equipo te va a contactar por WhatsApp para confirmar tu lugar y resolver
          tus dudas.
        </p>
        <p>Registrarte no garantiza automáticamente tu lugar: hay un proceso de selección.</p>
        <p className="text-sm text-dim">Mientras tanto, guarda este número en tu agenda cuando te escriban, para no perder el mensaje.</p>
      </div>
    </PublicShell>
  );
}
