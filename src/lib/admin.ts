/** Único e-mail com acesso ao painel administrativo. */
export const ADMIN_EMAIL = "yoshrokmohamedd@gmail.com";

export function isAdminEmail(email?: string | null): boolean {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}
