import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { darDeBaja } from "@/lib/correos/motor";
import { Button } from "@/components/ui";

export const metadata: Metadata = { title: "Darse de baja" };
export const dynamic = "force-dynamic";

/** Pide confirmar con un botón para que los antivirus de correo, que abren enlaces, no den de baja a nadie. */
export default async function BajaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valido = /^[0-9a-f-]{36}$/i.test(token);
  const db = createAdminClient();
  const { data: envio } = valido ? await db.from("mail_envios").select("email, campana_id").eq("token", token).maybeSingle() : { data: null };
  const { data: baja } = envio ? await db.from("mail_bajas").select("email").eq("email", envio.email).maybeSingle() : { data: null };

  async function confirmar() {
    "use server";
    if (envio) await darDeBaja(envio.email, "baja", envio.campana_id);
    revalidatePath(`/baja/${token}`);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Reto Tu Primer Millón</p>
        {!envio ? (
          <p className="mt-4 text-muted">Este enlace no es válido o ya no está disponible.</p>
        ) : baja ? (
          <>
            <h1 className="mt-3 text-2xl font-semibold">Listo, ya no recibirás correos</h1>
            <p className="mt-2 text-sm text-muted">{envio.email} quedó fuera de nuestras campañas.</p>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-semibold">¿Dejar de recibir correos?</h1>
            <p className="mt-2 text-sm text-muted">Dejaremos de escribirle a {envio.email}.</p>
            <form action={confirmar} className="mt-5">
              <Button type="submit" size="lg" className="w-full">
                Darme de baja
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
