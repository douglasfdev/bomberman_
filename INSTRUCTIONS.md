THINKING                                                                                                      

Here's a thinking process:                                                                                      

 1 Analyze User Input:                                                                                          

 • The user added src/app/core/models/enemy.model.ts and src/app/game/game.component.ts to the chat.            
 • They want me to know if there are other files needed for the changes I previously described (progression,    
   enemy AI, high score).                                                                                       
 • I need to review my previous instructions and see what's missing or needs updating based on the newly        
   provided files.                                                                                              

 2 Review Previous Instructions: I instructed changes to:                                                       

 • src/app/core/models/enemy.model.ts (interface update)                                                        
 • src/app/core/game-logic.service.ts (signals, start(), advanceEnemies(), plantEnemyBomb(), tick(), victory(), 
   nextLevel())                                                                                                 
 • src/app/game/game.component.html (HUD overlay updates)                                                       
 • src/app/game/game.component.ts (expose signals/methods)                                                      

 3 Check Provided Files:                                                                                        

 • enemy.model.ts: I need to see its current content to ensure my interface update matches or replaces it       
   correctly. The user said they added it, so I should acknowledge it and confirm the changes needed.           
 • game.component.ts: I need to see its current content to verify where to add currentLevel, highScore, and     
   nextLevel().                                                                                                 

 4 Identify Missing/Needed Files: Based on my previous instructions, the core files are:                        

 • src/app/core/models/enemy.model.ts (provided)                                                                
 • src/app/core/game-logic.service.ts (needs update)                                                            
 • src/app/game/game.component.html (needs update)                                                              
 • src/app/game/game.component.ts (provided)                                                                    
 • src/app/core/models/game-state.model.ts (might need LevelComplete phase if not exists)                       
 • src/app/core/models/game-config.ts (might need constants, but I used existing ones like BASE_RANGE,          
   BASE_MOVE_DURATION_MS)                                                                                       

Let's check game-state.model.ts from the initial context:                                                       

                                                                                                                
export enum GamePhase {                                                                                         
  Playing = 'playing',                                                                                          
  Victory = 'victory',                                                                                          
  Defeat = 'defeat',                                                                                            
}                                                                                                               
                                                                                                                

I need to add LevelComplete to this enum. This is a critical missing piece!                                     

 5 Formulate Response (in Portuguese as requested):                                                             

 • Acknowledge the added files.                                                                                 
 • Point out that src/app/core/models/game-state.model.ts needs an update (GamePhase.LevelComplete).            
 • Confirm that the other files I mentioned (game-logic.service.ts, game.component.html) are still needed.      
 • Provide the exact, unambiguous changes for the missing/needed files, focusing on what's strictly necessary to
   complete the request.                                                                                        
 • Keep it concise and follow the system prompt rules (act as architect engineer, give direction to editor      
   engineer, show only changes, reply in Portuguese).                                                           

Structure:                                                                                                      

 • Acknowledge added files.                                                                                     
 • List needed files for completion.                                                                            
 • Provide exact code snippets for each needed file.                                                            
 • Emphasize game-state.model.ts update.                                                                        
 • Keep it strictly within the requested format.                                                                

Draft (mental): Os arquivos adicionados estão corretos. Para completar a implementação, ainda precisamos        
atualizar:                                                                                                      

 1 src/app/core/models/game-state.model.ts (adicionar fase de nível completo)                                   
 2 src/app/core/game-logic.service.ts (lógica da IA e progressão)                                               
 3 src/app/game/game.component.html (UI para níveis/recorde)                                                    

Vou fornecer as alterações exatas apenas nos arquivos necessários:                                              

1. src/app/core/models/game-state.model.ts Adicione LevelComplete ao enum GamePhase:                            

                                                                                                                
export enum GamePhase {                                                                                         
  Playing = 'playing',                                                                                          
  Victory = 'victory',                                                                                          
  Defeat = 'defeat',                                                                                            
  LevelComplete = 'level_complete', // ADICIONE ESTA LINHA                                                      
}                                                                                                               
                                                                                                                

2. src/app/core/game-logic.service.ts (Instruções resumidas conforme solicitado, focando apenas nas mudanças    
críticas)                                                                                                       

 • Adicione os signals no topo da classe:                                                                       
                                                                                                                
   readonly currentLevel = signal(1);                                                                           
   readonly highScore = signal(typeof window !== 'undefined' ?                                                  
   parseInt(localStorage.getItem('bomberman_highscore') || '0', 10) : 0);                                       
                                                                                                                
 • Atualize a criação de inimigos em start() para incluir os novos campos:                                      
                                                                                                                
   this.enemies = this.level.enemySpawns.map((position, i) => ({                                                
     id: i + 1,                                                                                                 
     position: { ...position },                                                                                 
     alive: true,                                                                                               
     moveDurationMs: Math.round(BASE_MOVE_DURATION_MS * 1.15 * (1 + (i - 1) * 0.08)),                           
     direction: null as Direction | null,                                                                       
     nextMoveTime: 0,                                                                                           
     bombTimer: 2000 + Math.random() * 4000,                                                                    
   }));                                                                                                         
                                                                                                                
 • Adicione os métodos auxiliares e atualize tick() e victory() conforme descrito anteriormente. (Vou fornecer o
   código exato para garantir precisão).                                                                        

Wait, the prompt says "Just show the changes needed." and "DO NOT show the entire updated function/file/etc!". I
will strictly follow this. I'll provide only the exact diffs/snippets needed for each file.                     

Let's refine the response to be extremely precise and match the system instructions perfectly.                  

Structure:                                                                                                      

 • Acknowledge added files.                                                                                     
 • State which other files are still needed.                                                                    
 • Provide exact changes for each needed file.                                                                  
 • Keep it in Portuguese.                                                                                       
 • Ensure no full files are shown.                                                                              

I will explicitly list the required files and provide the exact code blocks to insert/modify.                   

Files needed:                                                                                                   

 1 src/app/core/models/game-state.model.ts (critical missing enum value)                                        
 2 src/app/core/game-logic.service.ts (core logic)                                                              
 3 src/app/game/game.component.html (UI)                                                                        
 4 src/app/game/game.component.ts (already added, I'll show the exact additions needed here)                    

Let's draft carefully. I'll make sure to follow: "Explain all needed code changes clearly and completely, but   
concisely. Just show the changes needed." and "Always reply to the user in Portuguese." I will structure it as  
direct instructions for the editor engineer. I'll check game.component.ts from the initial context to give exact
line/context for additions. Initial context for game.component.ts:                                              

                                                                                                                
readonly score = this.logic.score;                                                                              
readonly enemiesRemaining = this.logic.enemiesRemaining;                                                        
// ... other signals                                                                                            
readonly Direction = Direction;                                                                                 
readonly GamePhase = GamePhase;                                                                                 
// ...                                                                                                          
restart(): void {                                                                                               
  this.logic.restart();                                                                                         
}                                                                                                               
                                                                                                                

I'll tell them exactly where to add currentLevel, highScore, and nextLevel().                                   

All set. Generating response. Self-Correction/Verification during thought:                                      

 • The prompt says "I added these files to the chat... Let me know if there are others we should add."          
 • I should explicitly state which files are still needed.                                                      
 • I will provide the exact changes for those files.                                                            
 • I must ensure the tone matches an architect directing an editor.                                             
 • Portuguese language required.                                                                                
 • No full files.                                                                                               
 • Clear, unambiguous instructions.                                                                             

Draft: Os arquivos adicionados estão corretos. Para completar a implementação da progressão de níveis, IA dos   
inimigos e High Score, ainda precisamos modificar os seguintes arquivos:                                        

 1 src/app/core/models/game-state.model.ts (adicionar fase de nível completo)                                   
 2 src/app/core/game-logic.service.ts (lógica da IA, timers e progressão)                                       
 3 src/app/game/game.component.html (atualizar HUD e overlays)                                                  
 4 src/app/game/game.component.ts (expor novos signals/métodos)                                                 

Abaixo estão as alterações exatas para cada um. Aplique-as conforme indicado:                                   

1. src/app/core/models/game-state.model.ts                                                                      

Adicione a fase LevelComplete ao enum GamePhase:                                                                

                                                                                                                
export enum GamePhase {                                                                                         
  Playing = 'playing',                                                                                          
  Victory = 'victory',                                                                                          
  Defeat = 'defeat',                                                                                            
  LevelComplete = 'level_complete', // ADICIONE ESTA LINHA                                                      
}                                                                                                               
                                                                                                                

2. src/app/core/game-logic.service.ts                                                                           

A. No topo da classe (após as declarações de signals existentes), adicione:                                     

                                                                                                                
readonly currentLevel = signal(1);                                                                              
readonly highScore = signal(typeof window !== 'undefined' ? parseInt(localStorage.getItem('bomberman_highscore')
|| '0', 10) : 0);                                                                                               
                                                                                                                

B. No método start(), substitua a criação de this.enemies por:                                                  

                                                                                                                
this.enemies = this.level.enemySpawns.map((position, i) => ({                                                   
  id: i + 1,                                                                                                    
  position: { ...position },                                                                                    
  alive: true,                                                                                                  
  moveDurationMs: Math.round(BASE_MOVE_DURATION_MS * 1.15 * (1 + (i - 1) * 0.08)),                              
  direction: null as Direction | null,                                                                          
  nextMoveTime: 0,                                                                                              
  bombTimer: 2000 + Math.random() * 4000,                                                                       
}));                                                                                                            
                                                                                                                

C. Adicione os métodos auxiliares antes de tick() ou advancePlayer():                                           

                                                                                                                
private isEnemyWalkable(p: GridPosition): boolean {                                                             
  if (!this.level.isInBounds(p)) return false;                                                                  
  const tile = this.level.tileAt(p);                                                                            
  if (tile.type === TileType.Wall || tile.type === TileType.Box) return false;                                  
  const occupiedByEnemy = this.enemies.some(e => e.alive && samePosition(e.position, p));                       
  const occupiedByBomb = this.bombs.some(b => samePosition(b.position, p));                                     
  return !occupiedByEnemy && !occupiedByBomb;                                                                   
}                                                                                                               
                                                                                                                
private advanceEnemies(deltaMs: number): void {                                                                 
  for (const enemy of this.enemies) {                                                                           
    if (!enemy.alive) continue;                                                                                 
    const now = this.gameTimeMs;                                                                                
    if (now < enemy.nextMoveTime) continue;                                                                     
                                                                                                                
    let dir = enemy.direction;                                                                                  
    if (!dir || Math.random() < 0.25) {                                                                         
      const candidates: Direction[] = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];          
      dir = candidates.find(d => this.isEnemyWalkable({                                                         
        x: enemy.position.x + directionDelta(d).x,                                                              
        y: enemy.position.y + directionDelta(d).y                                                               
      })) ?? null;                                                                                              
    }                                                                                                           
                                                                                                                
    if (dir) {                                                                                                  
      const target = { x: enemy.position.x + directionDelta(dir).x, y: enemy.position.y + directionDelta(dir).y 
};                                                                                                              
      if (this.isEnemyWalkable(target)) {                                                                       
        enemy.direction = dir;                                                                                  
        enemy.nextMoveTime = now + enemy.moveDurationMs;                                                        
        enemy.position = target;                                                                                
      } else {                                                                                                  
        enemy.nextMoveTime = now + 400;                                                                         
      }                                                                                                         
    }                                                                                                           
                                                                                                                
    enemy.bombTimer -= deltaMs;                                                                                 
    if (enemy.bombTimer <= 0 && Math.random() < 0.15) {                                                         
      this.plantEnemyBomb(enemy);                                                                               
      enemy.bombTimer = 3000 + Math.random() * 5000;                                                            
    }                                                                                                           
  }                                                                                                             
}                                                                                                               
                                                                                                                
private plantEnemyBomb(enemy: EnemyState): void {                                                               
  this.bombs.push({                                                                                             
    id: this.nextBombId++,                                                                                      
    position: { ...enemy.position },                                                                            
    range: BASE_RANGE,                                                                                          
    pierce: false,                                                                                              
    plantedAtMs: this.gameTimeMs,                                                                               
  });                                                                                                           
}                                                                                                               
                                                                                                                

D. No método tick(), adicione a chamada da IA logo após this.gameTimeMs += deltaMs;:                            

                                                                                                                
this.advanceEnemies(deltaMs);                                                                                   
                                                                                                                

E. Substitua o método victory() por:                                                                            

                                                                                                                
private victory(): void {                                                                                       
  if (this.score() > this.highScore()) {                                                                        
    this.highScore.set(this.score());                                                                           
    localStorage.setItem('bomberman_highscore', String(this.score()));                                          
  }                                                                                                             
  this.gamePhase.set(GamePhase.LevelComplete);                                                                  
}                                                                                                               
                                                                                                                
public nextLevel(): void {                                                                                      
  this.currentLevel.update(l => l + 1);                                                                         
  this.level.generate();                                                                                        
  this.enemies = this.level.enemySpawns.map((position, i) => ({                                                 
    id: i + 1, position: { ...position }, alive: true,                                                          
    moveDurationMs: Math.round(BASE_MOVE_DURATION_MS * 1.15 * (1 + (i - 1) * 0.08)),                            
    direction: null as Direction | null, nextMoveTime: 0, bombTimer: 2000 + Math.random() * 4000,               
  }));                                                                                                          
  this.enemiesRemaining.set(this.enemies.length);                                                               
  this.bombs = []; this.explosions = []; this.powerUps = [];                                                    
  this.playerMove = null; this.activeDirection = null;                                                          
  this.player = { position: { ...this.level.playerSpawn }, alive: true, maxBombs: BASE_BOMBS, range: BASE_RANGE,
moveDurationMs: BASE_MOVE_DURATION_MS, pierce: false };                                                         
  this.maxBombs.set(BASE_BOMBS); this.range.set(BASE_RANGE); this.speed.set(0); this.pierce.set(false);         
  this.gamePhase.set(GamePhase.Playing);                                                                        
}                                                                                                               
                                                                                                                

3. src/app/game/game.component.html                                                                             

Substitua o bloco .hud-top e as overlays existentes por:                                                        

                                                                                                                
<div class="hud-top">                                                                                           
  <span>Nível: {{ currentLevel() }}</span>                                                                      
  <span>Pontos: {{ score() }}</span>                                                                            
  <span>Recorde: {{ highScore() }}</span>                                                                       
  <span>Inimigos: {{ enemiesRemaining() }}</span>                                                               
  <span>Bombas: {{ maxBombs() }}</span>                                                                         
  <span>Alcance: {{ range() }}</span>                                                                           
  <span *ngIf="speed()">Vel +{{ speed() }}</span>                                                               
  <span *ngIf="pierce()">Atravessa</span>                                                                       
</div>                                                                                                          
                                                                                                                
<!-- ... (mantenha os controles D-pad e action-btn inalterados) ... -->                                         
                                                                                                                
<div class="overlay" *ngIf="gamePhase() === GamePhase.LevelComplete">                                           
  <h2 class="overlay-title">Nível {{ currentLevel() }} Completo!</h2>                                           
  <p style="margin-bottom: 16px; color: #ccc;">Pontuação acumulada: {{ score() }}</p>                           
  <button class="restart-btn" (click)="nextLevel()">Próximo Nível</button>                                      
</div>                                                                                                          
                                                                                                                
<div class="overlay" *ngIf="gamePhase() === GamePhase.Victory">                                                 
  <h2 class="overlay-title">Vitória!</h2>                                                                       
  <p style="margin-bottom: 16px; color: #ccc;">Recorde atualizado: {{ highScore() }}</p>                        
  <button class="restart-btn" (click)="nextLevel()">Próximo Nível</button>                                      
</div>                                                                                                          
                                                                                                                
<div class="overlay" *ngIf="gamePhase() === GamePhase.Defeat">                                                  
  <h2 class="overlay-title">Derrota</h2>                                                                        
  <p style="margin-bottom: 16px; color: #ccc;">Recorde: {{ highScore() }}</p>                                   
  <button class="restart-btn" (click)="restart()">Tentar Novamente</button>                                     
</div>                                                                                                          
                                                                                                                
<div class="error" *ngIf="initError()">Seu navegador não suporta WebGL.</div>                                   
                                                                                                                

4. src/app/game/game.component.ts                                                                               

Adicione ao bloco de signals expostos (logo após readonly GamePhase = GamePhase;):                              

                                                                                                                
readonly currentLevel = this.logic.currentLevel;                                                                
readonly highScore = this.logic.highScore;                                                                      
                                                                                                                

E adicione o método público abaixo de restart():                                                                

                                                                                                                
nextLevel(): void {                                                                                             
  this.logic.nextLevel();                                                                                       
}                                                                                                               
                                                                                                                

Aplique estas alterações exatamente como estruturadas. A IA dos inimigos agora moverá e plantará bombas         
autonomamente, a pontuação acumulará entre fases e o recorde será persistido no localStorage. Após aplicar,     
execute os testes de progressão e validação de High Score. Fico no aguardo do retorno para as próximas etapas.  
(Self-Correction/Refinement during drafting):                                                                   

 • Check constraints: "DO NOT show the entire updated function/file/etc!" -> I'm showing only snippets/diffs.   
   Good.                                                                                                        
 • "Always reply to the user in Portuguese." -> Done.                                                           
 • "Explain all needed code changes clearly and completely, but concisely." -> Done.                            
 • The prompt says "I added these files to the chat... Let me know if there are others we should add." I        
   explicitly listed them and provided the exact changes. This matches perfectly.                               
 • I will ensure the formatting is crisp and directly actionable.                                               
 • All good. Proceeds. Output matches the refined draft.✅ Note: I'll make sure the code blocks are strictly the
   changes needed, as requested. I'll keep it tight. One minor thing: game-state.model.ts wasn't in the initial 
   context fully, but I know its structure from the prompt. I'll just give the exact enum update. It's fine.    
   Ready. Output generation. [Proceeds]                                                                         

----------------------------------------------------------------------------------------------------------------

► ANSWER                                                                                                        

Os arquivos adicionados estão corretos. Para completar a implementação da progressão de níveis, IA dos inimigos 
e High Score, ainda precisamos modificar os seguintes arquivos:                                                 

 1 src/app/core/models/game-state.model.ts (adicionar fase de nível completo)                                   
 2 src/app/core/game-logic.service.ts (lógica da IA, timers e progressão)                                       
 3 src/app/game/game.component.html (atualizar HUD e overlays)                                                  
 4 src/app/game/game.component.ts (expor novos signals/métodos)                                                 

Abaixo estão as alterações exatas para cada um. Aplique-as conforme indicado:                                   

1. src/app/core/models/game-state.model.ts                                                                      

Adicione a fase LevelComplete ao enum GamePhase:                                                                

                                                                                                                
export enum GamePhase {                                                                                         
  Playing = 'playing',                                                                                          
  Victory = 'victory',                                                                                          
  Defeat = 'defeat',                                                                                            
  LevelComplete = 'level_complete', // ADICIONE ESTA LINHA                                                      
}                                                                                                               
                                                                                                                

2. src/app/core/game-logic.service.ts                                                                           

A. No topo da classe (após as declarações de signals existentes), adicione:                                     

                                                                                                                
readonly currentLevel = signal(1);                                                                              
readonly highScore = signal(typeof window !== 'undefined' ? parseInt(localStorage.getItem('bomberman_highscore')
|| '0', 10) : 0);                                                                                               
                                                                                                                

B. No método start(), substitua a criação de this.enemies por:                                                  

                                                                                                                
this.enemies = this.level.enemySpawns.map((position, i) => ({                                                   
  id: i + 1,                                                                                                    
  position: { ...position },                                                                                    
  alive: true,                                                                                                  
  moveDurationMs: Math.round(BASE_MOVE_DURATION_MS * 1.15 * (1 + (i - 1) * 0.08)),                              
  direction: null as Direction | null,                                                                          
  nextMoveTime: 0,                                                                                              
  bombTimer: 2000 + Math.random() * 4000,                                                                       
}));                                                                                                            
                                                                                                                

C. Adicione os métodos auxiliares antes de tick() ou advancePlayer():                                           

                                                                                                                
private isEnemyWalkable(p: GridPosition): boolean {                                                             
  if (!this.level.isInBounds(p)) return false;                                                                  
  const tile = this.level.tileAt(p);                                                                            
  if (tile.type === TileType.Wall || tile.type === TileType.Box) return false;                                  
  const occupiedByEnemy = this.enemies.some(e => e.alive && samePosition(e.position, p));                       
  const occupiedByBomb = this.bombs.some(b => samePosition(b.position, p));                                     
  return !occupiedByEnemy && !occupiedByBomb;                                                                   
}                                                                                                               
                                                                                                                
private advanceEnemies(deltaMs: number): void {                                                                 
  for (const enemy of this.enemies) {                                                                           
    if (!enemy.alive) continue;                                                                                 
    const now = this.gameTimeMs;                                                                                
    if (now < enemy.nextMoveTime) continue;                                                                     
                                                                                                                
    let dir = enemy.direction;                                                                                  
    if (!dir || Math.random() < 0.25) {                                                                         
      const candidates: Direction[] = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];          
      dir = candidates.find(d => this.isEnemyWalkable({                                                         
        x: enemy.position.x + directionDelta(d).x,                                                              
        y: enemy.position.y + directionDelta(d).y                                                               
      })) ?? null;                                                                                              
    }                                                                                                           
                                                                                                                
    if (dir) {                                                                                                  
      const target = { x: enemy.position.x + directionDelta(dir).x, y: enemy.position.y + directionDelta(dir).y 
};                                                                                                              
      if (this.isEnemyWalkable(target)) {                                                                       
        enemy.direction = dir;                                                                                  
        enemy.nextMoveTime = now + enemy.moveDurationMs;                                                        
        enemy.position = target;                                                                                
      } else {                                                                                                  
        enemy.nextMoveTime = now + 400;                                                                         
      }                                                                                                         
    }                                                                                                           
                                                                                                                
    enemy.bombTimer -= deltaMs;                                                                                 
    if (enemy.bombTimer <= 0 && Math.random() < 0.15) {                                                         
      this.plantEnemyBomb(enemy);                                                                               
      enemy.bombTimer = 3000 + Math.random() * 5000;                                                            
    }                                                                                                           
  }                                                                                                             
}                                                                                                               
                                                                                                                
private plantEnemyBomb(enemy: EnemyState): void {                                                               
  this.bombs.push({                                                                                             
    id: this.nextBombId++,                                                                                      
    position: { ...enemy.position },                                                                            
    range: BASE_RANGE,                                                                                          
    pierce: false,                                                                                              
    plantedAtMs: this.gameTimeMs,                                                                               
  });                                                                                                           
}                                                                                                               
                                                                                                                

D. No método tick(), adicione a chamada da IA logo após this.gameTimeMs += deltaMs;:                            

                                                                                                                
this.advanceEnemies(deltaMs);                                                                                   
                                                                                                                

E. Substitua o método victory() por:                                                                            

                                                                                                                
private victory(): void {                                                                                       
  if (this.score() > this.highScore()) {                                                                        
    this.highScore.set(this.score());                                                                           
    localStorage.setItem('bomberman_highscore', String(this.score()));                                          
  }                                                                                                             
  this.gamePhase.set(GamePhase.LevelComplete);                                                                  
}                                                                                                               
                                                                                                                
public nextLevel(): void {                                                                                      
  this.currentLevel.update(l => l + 1);                                                                         
  this.level.generate();                                                                                        
  this.enemies = this.level.enemySpawns.map((position, i) => ({                                                 
    id: i + 1, position: { ...position }, alive: true,                                                          
    moveDurationMs: Math.round(BASE_MOVE_DURATION_MS * 1.15 * (1 + (i - 1) * 0.08)),                            
    direction: null as Direction | null, nextMoveTime: 0, bombTimer: 2000 + Math.random() * 4000,               
  }));                                                                                                          
  this.enemiesRemaining.set(this.enemies.length);                                                               
  this.bombs = []; this.explosions = []; this.powerUps = [];                                                    
  this.playerMove = null; this.activeDirection = null;                                                          
  this.player = { position: { ...this.level.playerSpawn }, alive: true, maxBombs: BASE_BOMBS, range: BASE_RANGE,
moveDurationMs: BASE_MOVE_DURATION_MS, pierce: false };                                                         
  this.maxBombs.set(BASE_BOMBS); this.range.set(BASE_RANGE); this.speed.set(0); this.pierce.set(false);         
  this.gamePhase.set(GamePhase.Playing);                                                                        
}                                                                                                               
                                                                                                                

3. src/app/game/game.component.html                                                                             

Substitua o bloco .hud-top e as overlays existentes por:                                                        

                                                                                                                
<div class="hud-top">                                                                                           
  <span>Nível: {{ currentLevel() }}</span>                                                                      
  <span>Pontos: {{ score() }}</span>                                                                            
  <span>Recorde: {{ highScore() }}</span>                                                                       
  <span>Inimigos: {{ enemiesRemaining() }}</span>                                                               
  <span>Bombas: {{ maxBombs() }}</span>                                                                         
  <span>Alcance: {{ range() }}</span>                                                                           
  <span *ngIf="speed()">Vel +{{ speed() }}</span>                                                               
  <span *ngIf="pierce()">Atravessa</span>                                                                       
</div>                                                                                                          
                                                                                                                
<!-- ... (mantenha os controles D-pad e action-btn inalterados) ... -->                                         
                                                                                                                
<div class="overlay" *ngIf="gamePhase() === GamePhase.LevelComplete">                                           
  <h2 class="overlay-title">Nível {{ currentLevel() }} Completo!</h2>                                           
  <p style="margin-bottom: 16px; color: #ccc;">Pontuação acumulada: {{ score() }}</p>                           
  <button class="restart-btn" (click)="nextLevel()">Próximo Nível</button>                                      
</div>                                                                                                          
                                                                                                                
<div class="overlay" *ngIf="gamePhase() === GamePhase.Victory">                                                 
  <h2 class="overlay-title">Vitória!</h2>                                                                       
  <p style="margin-bottom: 16px; color: #ccc;">Recorde atualizado: {{ highScore() }}</p>                        
  <button class="restart-btn" (click)="nextLevel()">Próximo Nível</button>                                      
</div>                                                                                                          
                                                                                                                
<div class="overlay" *ngIf="gamePhase() === GamePhase.Defeat">                                                  
  <h2 class="overlay-title">Derrota</h2>                                                                        
  <p style="margin-bottom: 16px; color: #ccc;">Recorde: {{ highScore() }}</p>                                   
  <button class="restart-btn" (click)="restart()">Tentar Novamente</button>                                     
</div>                                                                                                          
                                                                                                                
<div class="error" *ngIf="initError()">Seu navegador não suporta WebGL.</div>                                   
                                                                                                                

4. src/app/game/game.component.ts                                                                               

Adicione ao bloco de signals expostos (logo após readonly GamePhase = GamePhase;):                              

                                                                                                                
readonly currentLevel = this.logic.currentLevel;                                                                
readonly highScore = this.logic.highScore;                                                                      
                                                                                                                

E adicione o método público abaixo de restart():                                                                

                                                                                                                
nextLevel(): void {                                                                                             
  this.logic.nextLevel();                                                                                       
}                                                                                                               
                                                                                                                

Aplique estas alterações exatamente como estruturadas. A IA dos inimigos agora moverá e plantará bombas         
autonomamente, a pontuação acumulará entre fases e o recorde será persistido no localStorage. Após aplicar,     
execute os testes de progressão e validação de High Score. Fico no aguardo do retorno para as próximas etapas. 