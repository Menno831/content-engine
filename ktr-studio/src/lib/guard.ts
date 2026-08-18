import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";

// Editor-logins horen alleen op het productieboard en hun taken.
// Alle agency-pagina's (dashboard, finance, klanten, team...) sturen
// ze terug naar het board — de navigatie verbergt die pagina's al,
// maar een directe URL (of de login-landing) mag er ook niet komen.
export async function redirectEditorToBoard() {
  const ctx = await getSessionContext();
  if (ctx.profile?.role === "editor") redirect("/platform/pipeline");
  return ctx;
}

// Waar iemand na inloggen hoort te landen, per rol.
export function homeForRole(role: string | null | undefined): string {
  if (role === "editor") return "/platform/pipeline";
  if (role === "setter") return "/platform/leads";
  return "/platform";
}
