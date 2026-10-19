import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Aviso de privacidad" };

/**
 * BORRADOR. Debe revisarse y completarse con los datos del responsable
 * (razón social, domicilio y correo de contacto) antes de publicarse.
 * Si ya existe un aviso oficial, pon su URL en Configuración → Aviso de privacidad.
 */
export default function PrivacidadPage() {
  return (
    <PublicShell embed={false} titulo="Aviso de privacidad" subtitulo="Reto Primer Millón">
      <div className="space-y-4 text-sm leading-relaxed text-muted">
        <p className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-fg">
          Borrador pendiente de revisión. Sustituir los datos entre corchetes antes de publicar.
        </p>
        <p>
          <strong className="text-fg">Responsable.</strong> [RAZÓN SOCIAL O NOMBRE DEL RESPONSABLE], con domicilio en
          [DOMICILIO], es responsable del tratamiento de los datos personales que proporcionas al registrarte al Reto
          Primer Millón.
        </p>
        <p>
          <strong className="text-fg">Datos que recabamos.</strong> Nombre, apellido, número de WhatsApp, correo
          electrónico, ciudad de interés, experiencia previa y los comentarios que decidas compartir.
        </p>
        <p>
          <strong className="text-fg">Finalidades.</strong> Contactarte para confirmar tu interés y tu lugar en el
          programa, darte seguimiento durante el Reto, informarte sobre eventos, capacitaciones y premios, y llevar el
          registro de los participantes y de la persona que te invitó.
        </p>
        <p>
          <strong className="text-fg">Transferencias.</strong> Tus datos pueden compartirse con el equipo comercial
          que acompaña el programa y con Ciudad Maderas como aliado comercial, únicamente para las finalidades descritas.
        </p>
        <p>
          <strong className="text-fg">Derechos ARCO.</strong> Puedes solicitar el acceso, rectificación, cancelación u
          oposición al tratamiento de tus datos escribiendo a [CORREO DE CONTACTO].
        </p>
        <p>
          <strong className="text-fg">Cambios.</strong> Cualquier modificación a este aviso se publicará en esta misma
          página.
        </p>
        <p className="text-xs text-dim">Última actualización: [FECHA].</p>
      </div>
    </PublicShell>
  );
}
