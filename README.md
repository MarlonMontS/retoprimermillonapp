# Reto Primer Millón · Panel de leads y líderes

Producción: https://reto-primer-millon.vercel.app · Supabase: proyecto `mjznafrsyyxbnsfejgnx` (org Monsieur Proyectos) · Vercel: cuenta marlon-5493 · Repositorio: https://github.com/MarlonMontS/retoprimermillonapp (cada push a main se despliega solo)

App a la medida que reemplaza al CRM para organizar a los prospectos del Reto Primer Millón:
quién invitó a quién, el filtro telefónico de los gerentes, la cuota de cada líder y la
ruleta de la bolsa común.

## Reglas del programa que implementa

- **Atribución.** Cada líder y gerente tiene un enlace único `/r/<slug>`. Todo registro que
  entra por ese enlace queda en su equipo. El formulario general `/registro` muestra el
  selector «¿Quién te invitó?»; quien elige «Nadie» cae en la **bolsa común**. Las campañas
  de publicidad, colaboraciones y contenido también tienen enlace propio y caen en la bolsa.
- **Filtro.** Los gerentes llaman a los leads de **su equipo** (sus líderes y los propios) y
  registran el resultado: Calificado, En contacto, No contesta, No calificado o Descartado.
  Solo **Calificado** suma a la cuota del líder.
- **Cuota.** Un líder desbloquea la bolsa común al llegar a la cuota de invitados calificados
  (5 por defecto, editable en Configuración). El admin puede forzarla abierta o cerrada.
- **Ruleta.** Los leads de la bolsa se reparten automáticamente entre los líderes
  desbloqueados: para cada lead se elige al azar entre los que menos leads de bolsa han
  recibido. Corre al llegar un lead a la bolsa, al desbloquearse un líder y con el botón
  «Repartir ahora». Los leads de bolsa no cuentan para la cuota de quien los recibe.
- **Duplicados.** Se detectan por WhatsApp. Si dos responsables registran a la misma persona,
  **gana el primero que la califica**; la otra copia queda como Duplicado. Un mismo
  responsable que registra dos veces a alguien genera un duplicado inmediato.
- **Seguimiento posterior.** Los calificados tienen una etapa (Inscrito, Día Cero, Activo,
  Con citas, Con venta, Meta cumplida, Baja) lista para la versión 2.

## Roles

| Rol | Ve | Hace |
|---|---|---|
| Admin | Todo, incluida la bolsa sin asignar | Alta de gerentes y líderes, reasignar, importar, configurar, exportar |
| Gerente | Leads de sus líderes y los suyos | Llamadas de filtro, notas, alta de líderes de su equipo, reasignar dentro del equipo |
| Líder | Solo sus invitados y los de bolsa que recibió | Copiar y compartir su enlace, ver avance y ranking |

## Stack

Next.js 16 (App Router, Turbopack) · Supabase (Postgres + Auth) · Tailwind 4 · Vercel.
Toda la lectura y escritura de datos pasa por el servidor con la llave `service_role`; la
autorización se valida en código (`lib/auth.ts`, `lib/data/scope.ts`). RLS está activo sin
políticas, así que la llave pública no puede leer nada.

## Puesta en marcha

1. **Supabase.** Crea un proyecto en supabase.com y copia de *Project Settings → API* la URL,
   la llave pública (anon o publishable) y la privada (service_role o secret). De
   *Project Settings → Database* copia la cadena de conexión «Session pooler».
2. **Variables.** Copia `.env.example` a `.env.local` y llénalo.
3. **Esquema.** `npm install` y luego `npm run db:migrate` (o pega
   `supabase/migrations/0001_init.sql` en el SQL Editor de Supabase).
4. **Primer admin.** Con la app corriendo (`npm run dev` o ya desplegada):

   ```bash
   curl -X POST https://TU-APP/api/setup -H "content-type: application/json" \
     -d '{"secret":"EL_SETUP_SECRET","nombre":"Marlon","email":"tu@correo.com","password":"una-clave-larga"}'
   ```

   Solo funciona mientras no exista ningún admin.
5. **Equipo.** Entra como admin → *Gerentes* para crear a los gerentes → *Líderes → Importar
   equipo* y pega la lista (nombre, correo, WhatsApp, ciudad, gerente). La app genera las
   contraseñas y te da el texto listo para mandar por WhatsApp.
6. **Leads previos.** *Importar* acepta el CSV de contactos exportado de GoHighLevel.
7. **Landing.** En *Enlaces y campañas* está la URL del formulario general y el código para el
   bloque Embed de Framer. Reemplaza con él el formulario de GoHighLevel.
8. **Dominio.** En Vercel agrega el subdominio (por ejemplo `registro.retoprimermillon.com`),
   crea el CNAME que te indique y pon esa URL en `NEXT_PUBLIC_APP_URL`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local en http://localhost:3000 |
| `npm run build` | Compilación de producción |
| `npm run db:migrate` | Aplica las migraciones pendientes con `DATABASE_URL` |
| `npm run seed:demo` | Crea datos de prueba (`-- --limpiar` los borra) |
| `npm run typecheck` / `npm run lint` | Tipos y lint |

## Estructura

```
app/registro, app/r/[slug]   formularios públicos (?embed=1 para iframe, ?tema=claro)
app/api/registrar            recibe los registros
app/app/*                    panel privado por rol
lib/data/*                   acceso a datos (service role) y reglas de alcance
supabase/migrations          esquema y funciones SQL
```

## Medición de pauta (Meta)

- **Enlaces de campaña.** En *Enlaces y campañas* existe un enlace por campaña (`/r/<slug>`, tipo Publicidad);
  los anuncios de Meta usan `meta-tijuana` y `meta-monterrey`. La landing recibe
  `?ref=<slug>&utm_source=meta&utm_medium=paid&utm_campaign=…&utm_term=…&utm_content=…` y el bloque
  Embed de Framer (código en *Enlaces y campañas*) pasa esos parámetros al formulario. Cada lead guarda
  su fuente y sus UTM.
- **Pixel.** Con `NEXT_PUBLIC_META_PIXEL_ID` las páginas públicas cargan el pixel de Meta (también dentro
  del iframe: es un subdominio de la landing, así que las cookies son de primera parte) y el formulario
  dispara `Lead` al registrar, con el id del lead como `eventID`. Los duplicados no disparan el evento.
- **API de conversiones.** Con `META_CAPI_TOKEN` el servidor manda el mismo `Lead` a Meta después de
  responder (`lib/meta.ts`): correo, WhatsApp y nombre hasheados, IP, user agent y cookies `_fbp`/`_fbc`.
  Meta deduplica contra el evento del navegador por `event_id`. `META_TEST_EVENT_CODE` permite verlo en
  «Probar eventos» del Administrador de eventos.
