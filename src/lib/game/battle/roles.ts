// ============================================================
// Monster Study — Funções estratégicas dos monstros
// A função descreve a IDENTIDADE do monstro em combate.
// Ela NUNCA altera vida, ataque, defesa, velocidade ou habilidades:
// é só leitura (interface) e uma dica de intenção para a IA.
// ============================================================
import { abilityFor, statProfile } from "./config";

export type RoleId = "atacante" | "tanque" | "suporte" | "controle";

export type RoleDef = {
  id: RoleId;
  name: string;
  icon: string;
  description: string;
  text: string;
  ring: string;
};

export const ROLES: RoleDef[] = [
  {
    id: "atacante",
    name: "Atacante",
    icon: "⚔️",
    description: "Foco em causar dano e manter pressão ofensiva.",
    text: "text-ember",
    ring: "ring-ember/40",
  },
  {
    id: "tanque",
    name: "Tanque",
    icon: "🛡️",
    description: "Foco em sobreviver, absorver golpes e proteger a equipe.",
    text: "text-rarity-comum",
    ring: "ring-rarity-comum/40",
  },
  {
    id: "suporte",
    name: "Suporte",
    icon: "💚",
    description: "Foco em curar, reforçar e recuperar os aliados.",
    text: "text-rarity-incomum",
    ring: "ring-rarity-incomum/40",
  },
  {
    id: "controle",
    name: "Controle",
    icon: "🔮",
    description: "Foco em alterar o estado da batalha com efeitos e reduções.",
    text: "text-mana",
    ring: "ring-mana/40",
  },
];

export const ROLES_BY_ID: Record<RoleId, RoleDef> = Object.fromEntries(
  ROLES.map((r) => [r.id, r]),
) as Record<RoleId, RoleDef>;

/**
 * Identidade escrita à mão para as criaturas em que a função faz parte do
 * personagem. Os demais monstros derivam a função da habilidade + perfil.
 */
const ROLE_OVERRIDES: Record<string, RoleId> = {
  // tanques clássicos
  barkgolem: "tanque",
  quartzox: "tanque",
  gaiaruk: "tanque",
  titanox: "tanque",
  cryotaur: "tanque",
  nebulith: "tanque",
  terrabor: "tanque",
  cragling: "tanque",
  pebbly: "tanque",
  ferrik: "tanque",
  eclipsaur: "tanque",
  // suportes
  abyssaria: "suporte",
  seraphae: "suporte",
  aeromyr: "suporte",
  luminara: "suporte",
  glaciva: "suporte",
  mosslet: "suporte",
  dunephar: "suporte",
  // controle
  malachor: "controle",
  venomyra: "controle",
  toxlet: "controle",
  abyssquill: "controle",
  thornmaw: "controle",
  chromaw: "controle",
  dunecoil: "controle",
  chronavyr: "controle",
  equinoxis: "controle",
  voidbloom: "controle",
  umbraleth: "controle",
  mistmote: "controle",
  // atacantes marcantes
  emberfang: "atacante",
  voltyx: "atacante",
  thundrix: "atacante",
  arcanyx: "atacante",
  solmyrr: "atacante",
  petalynx: "atacante",
  moonfang: "atacante",
  tempestrix: "atacante",
  aetheryon: "atacante",
  astraeon: "atacante",
  obsidrake: "atacante",
  magmaw: "tanque",
};

const SUPPORT_EFFECTS = ["team_heal", "purge", "drain"];
const GUARD_EFFECTS = ["shield", "team_shield", "fortify"];
const CONTROL_EFFECTS = ["weaken", "slow", "break_def", "poison", "burn", "judgment", "echo"];

/** função do monstro (determinística e estável — nunca aleatória) */
export function roleOf(monsterId: string): RoleDef {
  const forced = ROLE_OVERRIDES[monsterId];
  if (forced) return ROLES_BY_ID[forced];
  const p = statProfile(monsterId);
  const effect = abilityFor(monsterId).effect.type;
  if (SUPPORT_EFFECTS.includes(effect)) return ROLES_BY_ID.suporte;
  if (GUARD_EFFECTS.includes(effect)) {
    return p.def >= 1.15 || p.hp >= 1.2 ? ROLES_BY_ID.tanque : ROLES_BY_ID.suporte;
  }
  if (CONTROL_EFFECTS.includes(effect)) return ROLES_BY_ID.controle;
  if (p.hp >= 1.3 || p.def >= 1.35) return ROLES_BY_ID.tanque;
  return ROLES_BY_ID.atacante;
}

export function roleIdOf(monsterId: string): RoleId {
  return roleOf(monsterId).id;
}
