import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Aviso de privacidad" };

/**
 * Aviso de privacidad integral del Reto Primer Millón.
 * Los únicos datos por completar son el domicilio del responsable y el correo
 * de contacto para derechos ARCO (constantes DOMICILIO y CORREO_CONTACTO).
 */
const RESPONSABLE = "Reto Primer Millón, programa dirigido por Marco Montiel";
const DOMICILIO = "[domicilio del responsable]";
const CORREO_CONTACTO = "[correo de contacto para privacidad]";
const FECHA = "19 de octubre de 2026";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 text-base font-semibold text-fg">{children}</h2>;
}

export default function PrivacidadPage() {
  return (
    <PublicShell embed={false} titulo="Aviso de privacidad" subtitulo="Reto Primer Millón · Participantes y prospectos">
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y su
          reglamento, ponemos a tu disposición este aviso de privacidad.
        </p>

        <H>1. Responsable del tratamiento</H>
        <p>
          <strong className="text-fg">{RESPONSABLE}</strong>, con domicilio en {DOMICILIO}, es el responsable del
          tratamiento de los datos personales que proporcionas al registrarte y participar en el Reto Primer Millón. Para
          cualquier asunto relacionado con este aviso puedes escribir a {CORREO_CONTACTO}.
        </p>

        <H>2. Datos personales que recabamos</H>
        <p>Al llenar el formulario de registro, y durante tu participación, recabamos los siguientes datos:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Datos de identificación y contacto: nombre, apellido, número de WhatsApp y correo electrónico.</li>
          <li>Datos del registro: ciudad en la que quieres participar, si tienes experiencia previa en bienes raíces, ventas o marketing, el motivo por el que quieres participar, cómo te enteraste del Reto y la persona que te invitó.</li>
          <li>Datos del seguimiento: el resultado y las notas de la llamada de confirmación que te hace el equipo, tu estatus en el proceso de selección y tu avance durante el programa.</li>
          <li>Datos técnicos: parámetros de la campaña o enlace desde el que llegaste al formulario. El formulario no utiliza cookies de rastreo; el panel del equipo usa únicamente cookies necesarias para la sesión.</li>
        </ul>
        <p>No recabamos datos personales sensibles. El programa está dirigido a personas mayores de edad.</p>

        <H>3. Finalidades del tratamiento</H>
        <p>Finalidades primarias, necesarias para la relación contigo:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Registrar tu solicitud de participación y contactarte por WhatsApp, llamada o correo para confirmar tu interés, resolver dudas y llevar a cabo el proceso de selección.</li>
          <li>Integrarte a un microequipo y registrar qué líder te invitó, para organizar el acompañamiento durante el programa.</li>
          <li>Informarte sobre la logística, las sesiones de capacitación, los eventos presenciales y en línea, los premios, los sorteos y los reconocimientos del Reto.</li>
          <li>Dar seguimiento a tu participación y a tu avance comercial durante los 30 días del programa.</li>
          <li>Atender tus solicitudes de derechos y cumplir las obligaciones legales aplicables.</li>
        </ul>
        <p>Finalidad secundaria, no necesaria para la relación contigo:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Enviarte información sobre futuras ediciones del Reto Primer Millón y sobre programas, eventos y oportunidades comerciales de Ciudad Maderas.</li>
        </ul>
        <p>
          Si no deseas que tus datos se usen para la finalidad secundaria, envía un correo a {CORREO_CONTACTO} indicándolo.
          Tu negativa no afecta tu participación en el programa.
        </p>

        <H>4. Con quién compartimos tus datos</H>
        <ul className="list-disc space-y-1 pl-5">
          <li>Con la persona que te invitó y con el gerente responsable de su equipo, quienes forman parte del programa y pueden ver tu nombre, tu contacto y tu estatus para darte seguimiento.</li>
          <li>Con Ciudad Maderas, aliado comercial del Reto, para el acompañamiento comercial y, en su caso, para formalizar operaciones inmobiliarias en las que participes.</li>
          <li>Con proveedores de servicios tecnológicos que alojan la plataforma y la base de datos, los cuales actúan por cuenta del responsable y pueden tener servidores fuera de México. Estos proveedores no usan tus datos para fines propios.</li>
        </ul>
        <p>
          Fuera de estos casos, no transferimos tus datos a terceros sin tu consentimiento, salvo que la ley lo exija.
          Al enviar el formulario y marcar la casilla de aceptación otorgas tu consentimiento para el tratamiento y las
          transferencias descritas.
        </p>

        <H>5. Derechos ARCO y revocación del consentimiento</H>
        <p>
          Tienes derecho a acceder a tus datos personales, rectificarlos cuando sean inexactos, cancelarlos cuando
          consideres que no se requieren para las finalidades señaladas, y oponerte a su tratamiento. También puedes
          revocar el consentimiento que nos otorgaste y solicitar que limitemos el uso o divulgación de tus datos.
        </p>
        <p>
          Para ejercer cualquiera de estos derechos envía una solicitud a {CORREO_CONTACTO} con tu nombre completo, el
          número de WhatsApp o correo con el que te registraste, una descripción clara de lo que solicitas y, si aplica,
          una copia de tu identificación oficial. Te responderemos por el mismo medio en los plazos que establece la ley.
          Ten en cuenta que, si cancelas tus datos o revocas tu consentimiento, es posible que no podamos continuar con tu
          participación en el programa.
        </p>

        <H>6. Conservación y seguridad</H>
        <p>
          Conservamos tus datos durante la vigencia del programa y el tiempo necesario para cumplir las finalidades
          descritas y las obligaciones legales aplicables. Aplicamos medidas administrativas, técnicas y físicas para
          proteger tus datos contra daño, pérdida, alteración, destrucción o uso no autorizado. El acceso al panel donde se
          gestionan los registros está restringido a personal autorizado mediante usuario y contraseña.
        </p>

        <H>7. Cambios al aviso de privacidad</H>
        <p>
          Cualquier modificación a este aviso se publicará en esta misma página, en registro.retoprimermillon.com/privacidad,
          y aplicará a partir de su publicación.
        </p>

        <p className="pt-2 text-xs text-dim">Última actualización: {FECHA}.</p>
      </div>
    </PublicShell>
  );
}
