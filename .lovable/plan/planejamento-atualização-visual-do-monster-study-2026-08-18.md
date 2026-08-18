# Planejamento: Atualização Visual do Monster Study

Reformular os fundos das áreas para ambientes vivos e temáticos, e recriar completamente a experiência de busca de jogadores.

## Toque do Usuário (Resumo)
- **Fundos**: Substituir gradientes por cenários temáticos discretos com profundidade e movimento sutil (paralaxe/partículas contextuais).
- **Busca de Jogadores**: Transformar em uma área social rica, com histórico de pesquisas, cards de resultados detalhados e perfis públicos completos.
- **Correções Adicionais**:
    - Elementos dos monstros visíveis na batalha.
    - Stats detalhados ao clicar em monstros em "Meus Monstros".
    - Bug da renda offline: coletar apenas ao clicar no botão.

## Detalhes Técnicos

### 1. Sistema de Fundos (SceneTheme)
- **Refatoração do `SceneBackground`**: Evoluir de um padrão de repetição SVG simples para camadas de profundidade.
- **Camadas de Cenário**: Adicionar suporte a múltiplos elementos de "prop" (estantes, pedras, etc.) posicionados estrategicamente.
- **Animações Ambientais**: Implementar keyframes suaves para névoa, poeira e iluminação variante em `styles.css`.
- **Temas Específicos**:
    - `home`: Torre Arcana (livros, símbolos).
    - `study`: Biblioteca (estantes, mesas).
    - `battle`: Arena (pedras, energia).
    - `players`: Guilda (estrelas, profundidade).

### 2. Pesquisa de Jogadores (`/jogadores`)
- **UI de Busca**: Campo centralizado com animações de foco e feedback de carregamento.
- **Histórico**: Armazenar últimas 5 pesquisas no estado local/nuvem.
- **Resultado Rico**: Componente `PlayerCard` com avatar, liga, streak e estatísticas principais.
- **Perfil Público**: Visualização em seções (Visão Geral, Monstros em Destaque, Conquistas).

### 3. Ajustes de Funcionalidade
- **Batalha**: Atualizar `FighterView` em `BattleArena.tsx` para mostrar ícones de elementos ao lado do nome.
- **Meus Monstros**: Integrar o modal de detalhes (usado no MonsterDex) ao clicar em um monstro na lista.
- **Renda Offline**: Alterar `hydrate` em `state.ts` para não somar o dinheiro imediatamente; a soma ocorrerá apenas no `onClose` do `WelcomeBack.tsx` através de uma nova função `collectOfflineEarnings`.

## Ordem de Implementação
1. Atualizar `themes.ts` com novos metadados de cenário.
2. Evoluir `SceneTheme.tsx` para renderizar o novo sistema de camadas.
3. Reformular a rota `jogadores.tsx`.
4. Aplicar correções na batalha e nos monstros.
5. Corrigir a lógica de coleta offline.

---
Vou começar agora a transformar o visual do Monster Study para algo mais imersivo.
