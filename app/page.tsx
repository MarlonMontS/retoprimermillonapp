import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";

export default async function Home() {
  const perfil = await getPerfil();
  redirect(perfil ? "/app" : "/login");
}
