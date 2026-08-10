Contexto e Papel: Você é um Engenheiro de Software Sênior e Especialista em Desenvolvimento de Jogos 3D para web.
Objetivo: Desenvolver a arquitetura e o código-fonte core de um jogo browser estilo "Bomberman" (mini-aventura) utilizando Angular e Three.js, com suporte nativo e responsivo para Desktop e Mobile.

Stack Tecnológico:

Angular (Standalone Components, TypeScript rigoroso, Injeção de Dependências).

Three.js (Cena 3D, WebGLRenderer, Geometrias primitivas para prototipagem).

Especificações e Arquitetura:

Motor de Renderização (ThreeEngineService): Configure a cena principal, iluminação básica, uma câmera isométrica e o loop de renderização (requestAnimationFrame) otimizado para performance mobile. O redimensionamento do canvas deve ser tratado para ajustar o aspect ratio dinamicamente entre retrato e paisagem.

Gerenciamento de Inputs (InputManagerService): Crie um sistema de controle abstrato e híbrido.

Desktop: Mapeamento de teclado (WASD/Setas para movimento, Espaço para ação/bomba).

Mobile: HUD construído no template Angular sobreposto ao canvas, contendo um D-Pad virtual (ou joystick) e um botão de ação mapeando eventos de touchstart e touchend.

Geração de Nível e Física (LevelService): O jogo deve ser construído sobre um sistema de grid (ex: matriz bidimensional 15x15). Implemente a lógica de paredes indestrutíveis intercaladas e a geração procedural de caixas destrutíveis. A movimentação e a colisão devem ser baseadas em células do grid (lógica discreta), separadas da interpolação visual contínua dos modelos 3D.

Mecânicas de Jogo:

Movimento: O jogador (representado inicialmente por um Mesh simples) deve transitar suavemente de um tile para outro.

Bombas e Explosão: Ao plantar uma bomba no centro de um tile, inicie um timer (ex: 3s). A explosão deve calcular a área de alcance em formato de cruz nas quatro direções (N, S, L, O), sendo interrompida por paredes indestrutíveis. Blocos destrutíveis atingidos devem ser removidos da matriz e da cena.

Integração: O GameComponent deve conter o <canvas #gameCanvas> e inicializar o serviço da engine. O estado do jogo (pontuação, fim de jogo) deve ser gerenciado por Signals do Angular para refletir reativamente na UI HTML.

Instruções de Saída:

Forneça a estrutura de diretórios do projeto.

Escreva o código dos componentes e serviços focando em separação de responsabilidades (Clean Architecture): a lógica do jogo (grid, estado) não deve estar misturada com a lógica de renderização (Three.js meshes).

Entregue um código TypeScript modular, pronto para ser executado e escalado para a adição de texturas e modelos reais no futuro.