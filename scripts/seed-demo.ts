/**
 * Datos de prueba para revisar la app con un flujo realista.
 *
 *   npm run seed:demo              crea 2 gerentes, 6 líderes, 2 campañas y ~30 leads
 *   npm run seed:demo -- --limpiar borra todo lo creado por este script
 *
 * Todos los usuarios demo usan correos @demo.reto y la contraseña DemoReto2026!
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const PASSWORD = "DemoReto2026!";
const DOMINIO = "demo.reto";

const GERENTES = [
  { nombre: "Gerente Tijuana Demo", email: `gerente.tj@${DOMINIO}`, ciudad: "tijuana" },
  { nombre: "Gerente Monterrey Demo", email: `gerente.mty@${DOMINIO}`, ciudad: "monterrey" },
] as const;

const LIDERES = [
  { nombre: "María López Demo", email: `maria@${DOMINIO}`, ciudad: "tijuana", gerente: 0 },
  { nombre: "Juan Pérez Demo", email: `juan@${DOMINIO}`, ciudad: "tijuana", gerente: 0 },
  { nombre: "Sofía Ramírez Demo", email: `sofia@${DOMINIO}`, ciudad: "tijuana", gerente: 0 },
  { nombre: "Carlos Treviño Demo", email: `carlos@${DOMINIO}`, ciudad: "monterrey", gerente: 1 },
  { nombre: "Ana Garza Demo", email: `ana@${DOMINIO}`, ciudad: "monterrey", gerente: 1 },
  { nombre: "Luis Cantú Demo", email: `luis@${DOMINIO}`, ciudad: "monterrey", gerente: 1 },
] as const;

const NOMBRES = ["Pedro", "Lucía", "Diego", "Valeria", "Andrés", "Camila", "Jorge", "Fernanda", "Raúl", "Daniela", "Héctor", "Paola", "Emilio", "Regina", "Mateo", "Ximena"];
const APELLIDOS = ["Hernández", "García", "Martínez", "Rodríguez", "Sánchez", "Flores", "Torres", "Ruiz", "Mendoza", "Castillo"];

function slugify(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function azar<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
let contador = 1000;
function telefono(lada: string) {
  contador++;
  return `+52${lada}${String(contador).padStart(7, "0")}`;
}

async function crearUsuario(u: { nombre: string; email: string; ciudad: string }, rol: "gerente" | "lider", gerente_id: string | null) {
  const { data, error } = await sb.auth.admin.createUser({ email: u.email, password: PASSWORD, email_confirm: true, user_metadata: { nombre: u.nombre } });
  if (error) throw new Error(`${u.email}: ${error.message}`);
  const id = data.user!.id;
  const slug = slugify(u.nombre);
  const { error: e1 } = await sb.from("perfiles").insert({ id, nombre: u.nombre, email: u.email, rol, gerente_id, ciudad: u.ciudad, slug });
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await sb.from("fuentes").insert({ slug, nombre: u.nombre, tipo: rol, perfil_id: id });
  if (e2) throw new Error(e2.message);
  return { id, slug };
}

async function limpiar() {
  const { data: perfiles } = await sb.from("perfiles").select("id, email").like("email", `%@${DOMINIO}`);
  const ids = (perfiles ?? []).map((p) => p.id);
  if (ids.length) {
    await sb.from("leads").delete().in("lider_id", ids);
  }
  await sb.from("leads").delete().like("email", `%@${DOMINIO}`);
  await sb.from("leads").delete().like("como_se_entero", "seed-demo%");
  await sb.from("fuentes").delete().in("slug", ["demo-meta-ads", "demo-colab-marca"]);
  for (const id of ids) {
    await sb.auth.admin.deleteUser(id); // borra perfil y fuente en cascada
  }
  console.log(`Borrados ${ids.length} usuarios demo y sus leads.`);
}

async function sembrar() {
  console.log("Creando gerentes…");
  const gerentes = [];
  for (const g of GERENTES) gerentes.push(await crearUsuario(g, "gerente", null));

  console.log("Creando líderes…");
  const lideres = [];
  for (const l of LIDERES) lideres.push({ ...(await crearUsuario(l, "lider", gerentes[l.gerente].id)), ciudad: l.ciudad });

  console.log("Creando campañas…");
  await sb.from("fuentes").insert([
    { slug: "demo-meta-ads", nombre: "Meta Ads demo", tipo: "publicidad" },
    { slug: "demo-colab-marca", nombre: "Colaboración Marca demo", tipo: "colaboracion" },
  ]);

  console.log("Registrando leads…");
  const creados: { id: string; lider: number | null }[] = [];
  const registrar = async (fuente_slug: string | null, lider_id: string | null, ciudad: string, origen: string, idx: number | null) => {
    const nombre = azar(NOMBRES);
    const { data, error } = await sb.rpc("registrar_lead", {
      p_nombre: nombre,
      p_apellido: azar(APELLIDOS),
      p_whatsapp: telefono(ciudad === "monterrey" ? "81" : "664"),
      p_email: `${slugify(nombre)}${contador}@${DOMINIO}`,
      p_ciudad: ciudad,
      p_experiencia: azar(["bienes_raices", "ventas_marketing", "ninguna"]),
      p_motivo: "Quiero aprender a vender y generar ingresos extra.",
      p_como_se_entero: "seed-demo",
      p_fuente_slug: fuente_slug,
      p_lider_id: lider_id,
      p_utm: fuente_slug === "demo-meta-ads" ? { utm_source: "facebook", utm_campaign: "nov-demo" } : {},
      p_origen: origen,
      p_consentimiento: true,
    });
    if (error) throw new Error(error.message);
    creados.push({ id: data.id, lider: idx });
  };

  // Invitados por enlace: entre 2 y 7 por líder
  for (const [i, l] of lideres.entries()) {
    const n = 2 + Math.floor(Math.random() * 6);
    for (let k = 0; k < n; k++) await registrar(l.slug, null, l.ciudad, "link", i);
  }
  // Bolsa: publicidad y colaboración (se quedan sin asignar hasta que alguien desbloquee)
  for (let k = 0; k < 6; k++) await registrar("demo-meta-ads", null, azar(["tijuana", "monterrey", "en_linea"]), "link", null);
  for (let k = 0; k < 3; k++) await registrar("demo-colab-marca", null, "en_linea", "link", null);
  // Formulario general sin invitador
  for (let k = 0; k < 2; k++) await registrar(null, null, "tijuana", "selector", null);

  console.log("Simulando llamadas de filtro…");
  // María (líder 0) califica 5 para desbloquear la bolsa; otros reciben resultados variados
  for (const c of creados) {
    if (c.lider === null) continue;
    const gerente = gerentes[LIDERES[c.lider].gerente].id;
    const resultado = c.lider === 0 ? "calificado" : azar(["calificado", "en_contacto", "no_contesta", "no_calificado", "nuevo", "nuevo"]);
    if (resultado === "nuevo") continue;
    const { error } = await sb.rpc("registrar_llamada", {
      p_lead: c.id,
      p_actor: gerente,
      p_resultado: resultado,
      p_notas: resultado === "calificado" ? "Interesado, puede asistir al Día Cero." : "Pendiente de seguimiento.",
      p_respuestas: null,
    });
    if (error) throw new Error(error.message);
  }
  const { data: n } = await sb.rpc("repartir_bolsa", { p_actor: null });
  console.log(`Ruleta: ${n ?? 0} leads de bolsa repartidos.`);
  console.log(`\nListo. Usuarios demo (contraseña ${PASSWORD}):`);
  for (const g of GERENTES) console.log(`  gerente  ${g.email}`);
  for (const l of LIDERES) console.log(`  líder    ${l.email}`);
}

(process.argv.includes("--limpiar") ? limpiar() : sembrar()).catch((e) => {
  console.error(e);
  process.exit(1);
});
