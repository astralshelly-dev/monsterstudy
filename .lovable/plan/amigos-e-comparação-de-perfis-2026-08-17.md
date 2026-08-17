# Amigos e comparação de perfis

Novo sistema social: adicionar amigos por ID público e comparar seu desempenho com o deles por período (hoje, semana, mês, total). Nada existente é removido — a busca de jogadores, batalha amistosa e os perfis atuais continuam iguais, só ganham entradas para "adicionar amigo" e "comparar".

## 1. Amigos

- Nova aba **Amigos** no menu (perto de "Pesquisar jogador").
- Adicionar por **ID público** ou direto do perfil em Pesquisar jogador / resultado de batalha.
- Fluxo com convite: pedido enviado → o outro aceita ou recusa. Listas de "Pedidos recebidos", "Pedidos enviados" e "Amigos".
- Cada amigo na lista mostra: avatar/moldura, nome com a cor do título, nível, liga e troféus, streak, tempo estudado hoje e se está ativo hoje.
- Ações por amigo: ver perfil, comparar, batalha amistosa (já existe), remover amigo.
- Ordenação da lista: atividade de hoje, troféus ou nível.

## 2. Comparação de perfis

Tela de comparação lado a lado (você × amigo), com abas de período: **Hoje · Semana · Mês · Total**.

Métricas comparadas em cada período:

- Tempo estudado, tempo lido, tempo total
- Páginas lidas e sessões concluídas
- XP ganho e monstros capturados
- Troféus (variação no período) e vitórias/derrotas
- Missões diárias concluídas
- Streak atual e melhor streak

Apresentação: para cada métrica, duas barras proporcionais com destaque para quem lidera, diferença absoluta e em %, além de um placar geral ("você lidera 7 de 11 métricas"). Um gráfico de linha compara o tempo diário dos dois nos últimos 30 dias.

Também dá para comparar com qualquer jogador encontrado na busca, não só amigos.

## 3. Mini-ranking entre amigos

Dentro da aba Amigos, um quadro "Ranking dos amigos" com você incluído, alternável por período (hoje/semana/mês/total) e por métrica (tempo de estudo, XP, troféus, streak). Serve como competição leve e usa exatamente os mesmos dados da comparação.

## 4. Dashboard

Um cartão compacto "Seus amigos hoje" com os 3 amigos mais ativos do dia e um atalho para a aba Amigos. Aparece só para quem tem conta e amigos.

## Detalhes técnicos

**Banco (migração)**

- `friendships`: `id`, `requester_id`, `addressee_id`, `status` (`pending`/`accepted`), `created_at`, `responded_at`, único por par normalizado (menor id primeiro em índice), RLS permitindo que só os dois envolvidos leiam; requester cria; addressee atualiza para aceito; ambos podem apagar. GRANTs para `authenticated` e `service_role`.
- `profiles` ganha `activity jsonb` (mapa dia → `{studySec, readSec, pages, sessions, xp, monsters, quests}` dos últimos 60 dias) e `trophy_log jsonb` (dia → troféus no fim do dia), para permitir comparação por período sem expor o save inteiro.

**Sync**

- `src/lib/game/cloud.ts`: `summarize()` passa a publicar `activity` (recorte de `state.activity` dos últimos 60 dias, já existente) e o log diário de troféus; `PublicProfile` ganha esses campos e um helper `periodTotals(profile, "today" | "week" | "month" | "all")`.
- `src/lib/game/state.ts`: registrar no `activity` diário também XP ganho, monstros capturados e missões concluídas (hoje só grava tempo/páginas/sessões), e gravar troféus do dia após cada batalha.

**Server functions** (`src/lib/friends.functions.ts`, com `requireSupabaseAuth`)

- `sendFriendRequest(publicId)`, `respondFriendRequest(id, accept)`, `removeFriend(id)`, `listFriends()` — devolve amigos + pedidos já com o resumo público de cada um, resolvendo `public_id` → `user_id` no servidor.

**Frontend**

- `src/routes/amigos.tsx`: listas, busca por ID, pedidos, ranking entre amigos.
- `src/routes/comparar.$publicId.tsx`: tela de comparação com abas de período e gráfico de 30 dias (recharts, já usado em Estatísticas).
- `src/components/game/friends/ComparePanel.tsx` e `FriendRow.tsx`: barras comparativas e linha de amigo reutilizáveis.
- `src/components/game/AppShell.tsx`: entrada "Amigos" no menu (com contador de pedidos pendentes).
- `src/routes/jogadores.tsx`: botões "Adicionar amigo" e "Comparar" no perfil visualizado.
- `src/routes/index.tsx`: cartão "Seus amigos hoje".
- Tema de cena próprio para as novas rotas em `src/lib/game/themes.ts`, e `head()` com título/descrição próprios em cada rota nova.
