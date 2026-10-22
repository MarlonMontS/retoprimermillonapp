"use client";

import Script from "next/script";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Pixel de Meta para las páginas públicas (registro y gracias).
 * Solo se carga si NEXT_PUBLIC_META_PIXEL_ID está definido. Se carga también en modo embed:
 * el iframe vive en un subdominio de la landing, así que las cookies _fbp/_fbc son de primera parte.
 */
export function MetaPixel() {
  if (!PIXEL_ID) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}

type Fbq = (accion: string, evento: string, datos?: Record<string, unknown>, opciones?: Record<string, unknown>) => void;

/** Dispara un evento estándar del pixel si está cargado. No falla si no lo está. */
export function metaEvento(evento: string, datos?: Record<string, unknown>, opciones?: { eventID?: string }) {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq !== "function") return;
  fbq("track", evento, datos ?? {}, opciones ?? {});
}
