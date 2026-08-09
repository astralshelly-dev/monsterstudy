# Ajustes: códigos, sons, histórico, encerramento antecipado e stats de leitura

## 1. Códigos mais equilibrados

Manter apenas 4 códigos: `BEMVINDO`, `MONSTERSTUDY`, `FOCOTOTAL`, `AMIGODOSMONSTROS`.

- Cada um dá recompensa aleatória: 100–400 moedas e 5–15 fragmentos (sorteados no resgate).
- Sem XP, sem desbloqueio de cronômetro.
- Só `AMIGODOSMONSTROS` também dá um monstro **aleatório de raridade Raro**.
- A tela de Códigos passa a mostrar "100–400 moedas · 5–15 fragmentos" (e "+ monstro raro" no último), já que o valor exato só é definido no resgate.
- Códigos antigos já resgatados continuam salvos sem quebrar nada.

## 2. Sons

Sons gerados na hora pelo navegador (Web Audio), sem arquivos e sem atraso de download:

- **Ao ganhar monstro:** fanfarra que escala com a raridade — Comum: 2 notas curtas; até Divino: arpejo longo, mais vozes, brilho e um baixo final. Quanto mais raro, mais animado.
- **Efeitos visuais também escalam:** as raridades altas ganham mais partículas/flashes na revelação (reforçando o que já existe).
- **Ao cronômetro zerar:** som de alarme suave (dois toques ascendentes).
- Respeita a preferência "Sons" já existente em Configurações e a política do navegador (só toca após interação do usuário).

## 3. Histórico: imagem do monstro quebrada

No histórico o monstro é renderizado como texto, então aparece o caminho da imagem. Passa a usar o mesmo componente de arte usado nas outras telas (imagem real, tamanho pequeno).

## 4. Encerrar antes do tempo

- Menos de **50%** do tempo planejado: **nenhum monstro** é concedido (a sessão é salva, com XP reduzido, e conta para o streak/atividade).
- A partir de 50%: o monstro é concedido, mas as chances de raridade alta caem proporcionalmente ao percentual cumprido (50% → penalidade máxima; 100% → sem penalidade).
- A tela mostra o aviso antes de confirmar o encerramento ("abaixo de 50% você não ganha monstro").

## 5. Horas de leitura nos stats

Onde hoje aparece só páginas, passa a mostrar também o tempo lido:

- Dashboard "Leitura de hoje": páginas + tempo (ex: "12 páginas · 35 min").
- Estatísticas: total e por período já tem tempo lendo; incluir tempo também no card de páginas e no gráfico/tooltip.
- Página do livro e histórico de leitura: total de horas lidas do livro junto com as páginas.

## Detalhes técnicos

- `src/lib/game/config.ts`: reduzir `GIFT_CODES` a 4 entradas com faixas (`moneyRange`, `shardRange`) e flag `randomRarity: "raro"`.
- `src/lib/game/state.ts`: `redeemCode` sorteia valores e escolhe monstro aleatório entre os de raridade rara; `endTimerEarly`/`buildReward` passam a receber a fração cumprida (`completion`) e retornam `monsterId: null` quando `< 0.5`.
- `src/lib/game/types.ts`: `Reward.monsterId` aceita `null`; `RewardReveal`, histórico e dashboard tratam esse caso.
- Novo `src/lib/game/sfx.ts` com síntese Web Audio (`playRewardSfx(rarity)`, `playTimerEndSfx()`), chamado nas telas de estudo/leitura e na revelação.
- `src/routes/historico.tsx`: usar `MonsterArt` em vez de `{def.art}`.
- `src/routes/index.tsx`, `src/routes/estatisticas.tsx`, `src/routes/biblioteca.$bookId.tsx`: acrescentar tempo de leitura formatado.
