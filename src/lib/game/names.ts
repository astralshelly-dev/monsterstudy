// ============================================================
// Monster Study — validação de nomes de jogador
// Emojis e pictogramas são proibidos em nomes.
// ============================================================

/** emojis, pictogramas, símbolos diversos e seletores de variação */
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{2BFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

export const NAME_MAX_LENGTH = 24;

export function hasEmoji(value: string): boolean {
  return EMOJI_RE.test(value);
}

/** remove emojis e normaliza espaços */
export function sanitizeName(value: string): string {
  const clean = value.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
  return clean.slice(0, NAME_MAX_LENGTH);
}

export function validateName(value: string): { ok: boolean; name: string; error?: string } {
  if (hasEmoji(value)) return { ok: false, name: sanitizeName(value), error: "Emojis não são permitidos no nome." };
  const name = sanitizeName(value);
  if (name.length < 2) return { ok: false, name, error: "O nome precisa ter ao menos 2 caracteres." };
  return { ok: true, name };
}
