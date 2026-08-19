# Habilidade Especial do Aetheryon — Proposta Criativa

## Contexto
- Aetheryon é o único monstro de raridade **Secreto** no jogo.
- Elemento **Deus**: imune a vantagens/desvantagens elementais.
- Lore: "Serafim Prismático do Fim das Eras", aparece após 5 horas de foco absoluto.
- Hoje usa `golpe_pesado` (2,2× dano, recarga 3) — genérico demais para sua raridade.

## Objetivo
Criar uma habilidade especial exclusiva que:
1. Combine com o lore de serafim prismático / fim das eras.
2. Seja mecanicamente única (não apenas "mais dano").
3. Seja balanceada para um monstro Secreto: forte, mas não quebrada.
4. Reutilize o sistema de `AbilityEffect` existente sem reinventar a roda.

## Propostas

### Opção A — "Anomalia Temporal" (recomendada)
Aetheryon distorce o tempo da batalha, revertendo o último turno do oponente.

**Efeito:**
- Remove o dano do último ataque recebido (cura o aliado ativo).
- Anula qualquer efeito negativo aplicado no último turno (queimadura, veneno, julgamento, etc.).
- Em seguida, Aetheryon desfere um ataque com multiplicador 1,6×.

**Por que funciona:**
- Tema perfeito: "Fim das Eras" / controle do tempo.
- Mecânica única: nenhum outro monstro faz "rewind".
- Não é só dano: exige leitura de jogo para usar no momento certo.
- Recarga 4 rodadas mantém o poder sob controle.

### Opção B — "Prisma Absoluto"
Aetheryon copia a última habilidade especial usada por qualquer monstro na batalha.

**Efeito:**
- Armazena a última `Ability` usada (aliada ou inimiga).
- Ao ativar, replica essa habilidade com 85% da potência original.
- Se nenhuma habilidade foi usada ainda, usa um raio prismático com dano 1,8×.

**Por que funciona:**
- Tema "prismático" — reflete tudo.
- Alta versatilidade: recompende conhecimento dos monstros do oponente.
- Recarga 3 rodadas.

### Opção C — "Era de Foco"
Referência meta ao lore de 5 horas de foco: Aetheryon acumula "foco" durante a batalha.

**Efeito:**
- A cada turno que Aetheryon permanece ativo, ganha 1 stack de Foco (máx 5).
- A habilidade consome todos os stacks e causa dano base 1,4× + 0,15× por stack.
- Com 5 stacks, também cura 15% da vida máxima de todo o time.

**Por que funciona:**
- Conecta diretamente ao lore de foco prolongado.
- Recompende manter Aetheryon vivo por vários turnos.
- Recarga 3 rodadas.

## Implementação técnica (após aprovação)
1. Adicionar nova `Ability` em `src/lib/game/battle/config.ts`.
2. Adicionar novo `AbilityEffect` tipo (se necessário) ou combinar efeitos existentes.
3. Atualizar o mapa de habilidades para vincular `aetheryon` → nova habilidade.
4. Adicionar a habilidade à lista `EXCLUSIVE_ABILITIES` (como Equinoxis), garantindo que só Aetheryon a use.
5. Atualizar descrição no Monsterdex e no painel de batalha.

## Recomendação
**Opção A — "Anomalia Temporal"** é a mais alinhada ao lore, a mais distinta mecanicamente e cria momentos memoráveis de "virada" sem ser estatisticamente opressora.
