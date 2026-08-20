# Monster Study Squad

Crie um aplicativo web completo chamado Monster Study.

O Monster Study é uma plataforma de estudo e leitura gamificada, misturando produtividade, biblioteca pessoal, coleção de criaturas, progressão RPG e recompensas.

A ideia principal é:

Quanto mais tempo o usuário estuda ou lê, mais ele progride e maiores são suas chances de conseguir monstros raros.

O aplicativo deve parecer um jogo de coleção de criaturas, mas continuar sendo uma ferramenta séria, bonita e confortável para estudar e ler.

Não criar apenas uma landing page. Criar um aplicativo funcional, com persistência de dados e todas as funcionalidades descritas abaixo.

🎨 IDENTIDADE VISUAL

Criar uma identidade visual própria para o Monster Study.

Estética:

Fantasia

RPG

Coleção de criaturas

Produtividade

Leitura

O visual deve ser moderno e sofisticado, não infantil.

Usar:

Interface dark

Roxo, azul, violeta e tons mágicos

Cards arredondados

Sombras

Brilhos discretos

Animações suaves

Microinterações

Ícones modernos

Tipografia bonita e legível

A aplicação deve transmitir a sensação de estar entrando em um pequeno universo de criaturas mágicas.

Criar uma experiência visual especialmente bonita para:

Cronômetros

Descoberta de monstros

MonsterDex

Biblioteca

Dashboard

Loja

🧭 NAVEGAÇÃO PRINCIPAL

Criar uma sidebar no desktop e uma barra inferior no mobile.

Abas:

🏠 Dashboard

📚 Estudar

📖 Ler

🐾 MonsterDex
🐾 Meus Monstros

📕 Biblioteca

🛍️ Loja

🏆 Conquistas

📊 Estatísticas

No topo da interface mostrar:

💰 Dinheiro atual

🔥 Streak

⭐ Nível do usuário

⏱️ DUAS FORMAS DIFERENTES DE ESTUDAR

IMPORTANTE:

Estudo e Leitura são duas abas diferentes.

Ambas utilizam cronômetros e fornecem as mesmas recompensas de monstros, mas registram informações diferentes.

📚 ABA "ESTUDAR"

Essa área é destinada ao estudo de matérias, cursos, conteúdos, provas etc.

O usuário pode escolher um cronômetro.

Inicialmente:

10 minutos

20 minutos

30 minutos

Cronômetros maiores serão desbloqueados posteriormente.

Antes de iniciar a sessão, mostrar um formulário:

O que você está estudando?

Campo:

Tema / matéria

Exemplos:

Matemática

História

Programação

Biologia

Inglês

Física

Campo opcional:

Assunto específico

Exemplo:

Equações de segundo grau

Campo opcional:

Objetivo da sessão

Exemplo:

Revisar para a prova de sexta-feira.

Também permitir selecionar um livro relacionado, caso o usuário queira.

⏱️ CRONÔMETRO DE ESTUDO

Mostrar um cronômetro grande e central.

Exemplo:

29:42

Informações abaixo:

📚 Matemática

📌 Equações de segundo grau

Botões:

Pausar

Encerrar (caso desista, tem a probabilidade de ganhar pets mais raros significantemente abaixada)

Cancelar sessão

O cronômetro deve funcionar corretamente mesmo se a página for atualizada.

📝 FINALIZAÇÃO DO ESTUDO

Quando o cronômetro terminar, NÃO mostrar imediatamente apenas o monstro.

Primeiro abrir uma tela de conclusão:

"Sessão concluída!"

Mostrar:

⏱️ Tempo estudado:
30 minutos

📚 Matéria:
Matemática

📌 Assunto:
Equações de segundo grau

Depois permitir que o usuário registre:

O que você aprendeu?

Campo de texto grande.

Exemplo:

Aprendi como resolver equações usando a fórmula de Bhaskara.

Anotações

Campo opcional.

Exemplo:

Preciso revisar o discriminante depois.

Botão:

Salvar sessão

Depois de salvar, mostrar a recompensa.

📖 ABA "LER"

A aba de leitura deve ser completamente separada da aba de estudo.

Aqui o usuário seleciona um livro da própria biblioteca.

Exemplo:

📖 Harry Potter e a Pedra Filosofal

143 / 310 páginas

46% concluído

Depois escolhe o cronômetro.

Inicialmente:

10 minutos

20 minutos

30 minutos

📖 CRONÔMETRO DE LEITURA

Antes de começar, mostrar:

📖 Livro selecionado

Página inicial:

143

Página final será preenchida ao terminar.

Mostrar:

⏱️ 29:42

Durante a leitura, mostrar também estatísticas em tempo real quando possível.

Por exemplo:

Páginas lidas: 8

Velocidade: 2,4 páginas/min

📄 FINALIZAÇÃO DA LEITURA

Quando o cronômetro terminar, abrir uma tela de conclusão.

Mostrar:

"Leitura concluída!"

Livro:

📖 Harry Potter e a Pedra Filosofal

Página inicial:
143

Campo:

Em qual página você parou?

Exemplo:

162

Calcular automaticamente:

19 páginas lidas

0,63 páginas/min

Tempo total: 30 minutos

Percentual do livro: 52,3%

Permitir também adicionar uma anotação opcional:

Anotações

Campo de texto.

Exemplo:

A história começou a ficar mais interessante nessa parte.

Botão:

Salvar leitura

Depois disso, mostrar a recompensa de monstro.

📊 ESTATÍSTICAS DE LEITURA

Cada sessão de leitura deve registrar automaticamente:

Livro

Data

Horário

Duração

Página inicial

Página final

Páginas lidas

Páginas por minuto

Percentual do livro

Anotações

Monstro recebido

Raridade do monstro

XP recebido

Dinheiro gerado

Na página de estatísticas, mostrar gráficos como:

📈 Páginas lidas por dia

📈 Tempo de leitura por dia

📊 Velocidade média de leitura

📚 Livros mais lidos

⏱️ Tempo total de leitura

📖 Total de páginas lidas

📊 ESTATÍSTICAS DE ESTUDO

As sessões de estudo devem registrar:

Matéria

Assunto

Objetivo

Data

Horário

Duração

O que foi aprendido

Anotações

Monstro recebido

Raridade

XP recebido

Dinheiro gerado

Criar estatísticas como:

⏱️ Tempo total estudado

📚 Matérias mais estudadas

📈 Tempo estudado por dia

🔥 Dias consecutivos

🏆 Sessões concluídas

📜 HISTÓRICO

Criar uma página de histórico completa.

TODAS as sessões devem aparecer aqui.

Separar visualmente entre:

📚 Estudo

📖 Leitura

Cada registro deve mostrar:

Data
Horário
Tipo
Duração
Informações da sessão
Monstro recebido
Raridade
XP
Dinheiro

Exemplo de estudo:

📚 ESTUDO

08/08/2026 — 14:30

30 minutos

Matemática
Equações de segundo grau

"Aprendi a resolver equações usando Bhaskara."

🎁 Monstro encontrado:

🐉 Emberfang
Raro

+150 XP
+$2,40

Exemplo de leitura:

📖 LEITURA

08/08/2026 — 19:10

30 minutos

Harry Potter e a Pedra Filosofal

Página 143 → 162

19 páginas
0,63 páginas/min

🎁 Monstro encontrado:

🐺 Moonfang
Incomum

+120 XP
+$1,20

🎁 SISTEMA DE RECOMPENSAS

Depois de qualquer sessão concluída — seja Estudo ou Leitura — o usuário recebe um monstro.

Os dois modos possuem o mesmo sistema de recompensa.

A diferença é apenas o tipo de informação registrada.

🐾 RARIDADES

As raridades são:

Comum

Incomum

Raro

Super Raro

Épico

Lendário

Mítico

Divino

Criar identidade visual própria para cada raridade.

Quanto maior a raridade, mais impressionante deve ser o visual.

🎲 CHANCES DE MONSTRO

Cronômetros iniciais:

10 minutos

Comum → Incomum

20 minutos

Comum → Raro

30 minutos

Incomum → Raro

A raridade deve ser determinada por um sistema de probabilidades.

Não garantir que o usuário receberá a raridade máxima disponível.

Cronômetros maiores aumentam progressivamente a chance de recompensas melhores.

⏰ CRONÔMETROS DESBLOQUEÁVEIS

Na loja, permitir desbloquear:

1 hora

1h30

2 horas

2h30

3 horas

3h30

4 horas

4h30

5 horas

Cada cronômetro deve ter seu próprio preço e sua própria configuração de chances.

Manter essas configurações centralizadas para facilitar o balanceamento posteriormente.

🎉 ANIMAÇÃO DE RECOMPENSA

O final da sessão deve ser um momento especial.

Após salvar a sessão:

Mostrar:

SEU ESTUDO TERMINOU!

ou

SUA LEITURA TERMINOU!

Depois:

VOCÊ ENCONTROU...

Criar uma animação de revelação do monstro.

A animação deve ficar mais impressionante conforme a raridade.

Comum:
animação simples

Incomum:
pequeno brilho

Raro:
efeitos mágicos

Super Raro:
efeitos maiores

Épico:
animação especial

Lendário:
animação muito chamativa

Mítico:
efeitos extremamente especiais

Divino:
uma verdadeira tela de recompensa, extremamente rara e especial

Mostrar:

Nome
Imagem
Raridade
Nível
XP recebido
Dinheiro por segundo

🐾 MONSTROS

Cada monstro possui:

Nome

Imagem

Raridade

Habitat

Nível

XP

XP necessário

Dinheiro por segundo

Descrição

Quantidade de cópias

Criar inicialmente pelo menos 30 monstros fictícios originais.

Não utilizar personagens protegidos por copyright.

Criar criaturas com aparência original.

🌎 HABITATS

Criar diferentes habitats:

🌲 Floresta

🌊 Oceano

🌋 Vulcão

❄️ Tundra

🏜️ Deserto

🌿 Selva

🌌 Espaço

✨ Dimensão Mística

🐾 MONSTERDEX

Criar uma coleção estilo Pokédex.

Mostrar:

27 / 100 descobertos

Os monstros descobertos aparecem normalmente.

Os não descobertos aparecem como silhuetas.

Filtros:

Todos

Comum

Incomum

Raro

Super Raro

Épico

Lendário

Mítico

Divino

Habitat

Ao clicar em um monstro mostrar uma página/modal com todas as informações.

📈 EVOLUÇÃO DOS MONSTROS

Cada monstro possui nível próprio.

Exemplo:

🐉 Emberfang

Nível 8

XP:

4.200 / 5.000

O usuário pode selecionar um monstro para treinar.

🧠 ESTUDO LIVRE

Criar também um terceiro modo chamado:

Estudo Livre

IMPORTANTE:

Esse modo é diferente dos cronômetros de recompensa.

Ele começa em:

00:00:00

Não possui limite máximo.

O usuário pode estudar pelo tempo que quiser e parar quando quiser.

O objetivo é ganhar XP para o monstro selecionado.

Exemplo:

🐉 Emberfang

Nível 8

4.200 / 5.000 XP

O usuário inicia o Estudo Livre.

Depois de 45 minutos:

+XP para Emberfang

Ao subir de nível, mostrar uma animação de Level Up.

Esse modo não precisa necessariamente gerar um novo monstro.

💰 ECONOMIA

Cada monstro gera dinheiro por segundo.

Exemplo inicial:

Comum:
$0,01/s

Incomum:
$0,03/s

Raro:
$0,08/s

Super Raro:
$0,20/s

Épico:
$0,50/s

Lendário:
$1/s

Mítico:
$3/s

Divino:
$10/s

Os valores devem ficar em uma configuração central para permitir balanceamento futuro.

O dinheiro deve acumular enquanto o usuário estiver fora da aplicação também.

Ao voltar para o site, mostrar quanto foi acumulado.

🛍️ LOJA

Criar uma loja com:

Cronômetros

Desbloqueio de cronômetros maiores.

Upgrades

Exemplos:

🍀 Lucky Charm

Aumenta a chance de monstros raros.

💰 Golden Wallet

Aumenta o dinheiro recebido.

📚 Knowledge Boost

Aumenta XP recebido.

🔥 Streak Booster

Melhora recompensas de streak.

Cada upgrade possui:

Nível

Preço

Efeito

Próximo nível

Os preços devem aumentar progressivamente.

📚 BIBLIOTECA

Criar uma biblioteca pessoal.

Botão:

+ Adicionar livro

Ao adicionar:

Capa do livro

Título

Autor

Número total de páginas

Sinopse

Gênero/estilo

Permitir upload da capa.

Gêneros:

Fantasia

Romance

Ficção

Terror

Mistério

Suspense

Ficção científica

História

Biografia

Desenvolvimento pessoal

Outros

Separar livros em:

📖 Lendo agora

📚 Quero ler

✅ Concluídos

Cada livro mostra:

Capa
Título
Autor
Página atual / total
Percentual concluído

📕 PÁGINA DO LIVRO

Ao clicar em um livro, abrir uma página detalhada.

Mostrar:

Capa

Título

Autor

Gênero

Sinopse

Página atual

Total de páginas

Percentual concluído

Tempo total lendo esse livro

Total de páginas lidas

Velocidade média de leitura

Número de sessões

Histórico de leitura desse livro

Botão:

Começar leitura

🔥 STREAK

Criar sequência diária.

Exemplo:

🔥 7 dias consecutivos

Completar pelo menos uma sessão de estudo ou leitura no dia mantém o streak.

Criar calendário visual de atividade.

Marcos:

3 dias
7 dias
14 dias
30 dias
60 dias
100 dias

Dar pequenas recompensas.

🏆 CONQUISTAS

Criar achievements.

Exemplos:

🏆 Primeiro Estudo
Complete sua primeira sessão.

📖 Primeiro Livro
Conclua seu primeiro livro.

🔥 Incansável
Estude por 7 dias consecutivos.

💎 Sortudo
Encontre um Super Raro.

👑 Lenda
Encontre um Lendário.

🌌 Além dos Limites
Encontre um Divino.

⏰ Maratonista
Complete uma sessão de 5 horas.

📚 Devorador de Livros
Leia 1.000 páginas.

📊 DASHBOARD

A página inicial deve mostrar um resumo de tudo.

Perfil

Nome

Nível

XP

Streak

Dinheiro

💰 $12.450

+ $8,32/s

Estudo de hoje

⏱️ 1h 42min

Leitura de hoje

📖 43 páginas

Monstro ativo

🐉 Emberfang

Nível 8

XP

Dinheiro/s

Ações rápidas

📚 Começar estudo

📖 Começar leitura

🧠 Estudo livre

Coleção recente

Mostrar os últimos monstros encontrados.

📈 ESTATÍSTICAS

Criar uma página completa de estatísticas.

Mostrar:

Geral

Tempo total estudado

Tempo total lendo

Total de sessões

Livros concluídos

Páginas lidas

Monstros descobertos

Dinheiro por segundo

Nível atual

Estudo

Tempo por dia

Matérias mais estudadas

Sessões por semana

Tempo médio por sessão

Leitura

Páginas por dia

Velocidade média

Livros mais lidos

Tempo médio por sessão

Total de páginas

Usar gráficos bonitos e interativos.

📜 HISTÓRICO

Criar histórico completo de todas as atividades.

Filtros:

Tudo

Estudos

Leituras

Data

Livro

Matéria

Cada registro deve mostrar a atividade realizada e a recompensa obtida.

O monstro recebido deve ficar visualmente associado à sessão que o gerou.

🎮 DUPLICATAS

Caso o usuário receba um monstro que já possui:

Mostrar:

MONSTRO DUPLICADO!

Permitir futuramente usar duplicatas para:

Evoluir monstros

Trocar

Converter em recursos

Implementar inicialmente pelo menos um sistema simples de duplicatas que possa ser expandido.

👤 PERFIL

Criar página de perfil.

Mostrar:

Avatar

Nome

Nível

XP

Streak

Tempo total estudado

Tempo total lendo

Livros concluídos

Monstros descobertos

Raridade mais alta encontrada

Data de criação da conta

💾 PERSISTÊNCIA

O progresso deve ser persistente.

Salvar:

Usuário

Monstros

Inventário

Dinheiro

XP

Níveis

Livros

Sessões

Histórico

Estatísticas

Conquistas

Streak

Upgrades

Cronômetros desbloqueados

O cronômetro não pode simplesmente zerar se a página for atualizada.

Calcular o tempo usando timestamps para garantir precisão.

⚙️ CONFIGURAÇÕES

Criar página de configurações com:

Nome

Avatar

Tema

Sons

Animações

Notificações

Preferências

🎯 PRINCÍPIO DO PRODUTO

O Monster Study não deve parecer apenas um Pomodoro com uma skin de jogo.

A sensação deve ser:

"Vou estudar mais 30 minutos porque quero tentar conseguir aquele monstro."

A gamificação deve incentivar o usuário a estudar e ler, sem substituir a função principal de produtividade.

A experiência deve ser divertida, recompensadora e visualmente satisfatória.

Priorizar primeiro:

Cronômetros

Sistema de recompensa

Monstros

Biblioteca

Histórico

Estatísticas

Progressão

Loja

Conquistas

Criar uma base de código organizada e escalável para que novos monstros, habitats, eventos, itens, upgrades e sistemas possam ser adicionados posteriormente.

Use componentes reutilizáveis e mantenha os dados de monstros, raridades, recompensas, XP, dinheiro e cronômetros configuráveis em estruturas separadas.

O resultado final deve parecer um produto real e pronto para uso, e não um protótipo genérico.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://monsterstudy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f2c88721-f4f1-435d-8b60-060fe4171beb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
