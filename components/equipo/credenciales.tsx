"use client";

import { BotonCopiar } from "@/components/copiar";
import { Alert } from "@/components/ui";

export function Credenciales({
  credenciales,
  appUrl,
}: {
  credenciales: { nombre: string; email: string; password: string }[];
  appUrl: string;
}) {
  if (credenciales.length === 0) return null;
  const texto = credenciales
    .map((c) => `${c.nombre}\nEntra en ${appUrl}/login\nUsuario: ${c.email}\nContraseña: ${c.password}`)
    .join("\n\n");
  return (
    <Alert tone="ok">
      <p className="font-medium">Guarda estas contraseñas ahora: no se vuelven a mostrar.</p>
      <ul className="mt-2 space-y-1 font-mono text-xs">
        {credenciales.map((c) => (
          <li key={c.email}>
            {c.nombre} · {c.email} · <span className="text-accent">{c.password}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <BotonCopiar texto={texto} etiqueta="Copiar mensaje para WhatsApp" />
      </div>
    </Alert>
  );
}
