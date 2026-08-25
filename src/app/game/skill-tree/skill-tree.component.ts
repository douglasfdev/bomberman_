import { Component, effect, signal, computed, ViewChild, ElementRef, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkillTreeService, SkillNode, UserSkill } from '../../core/roguelite/skill-tree.service';
import { SkillNodeComponent } from './skill-node/skill-node.component';

@Component({
  selector: 'app-skill-tree',
  standalone: true,
  imports: [CommonModule, SkillNodeComponent],
template: `
      <div class="skill-tree-overlay" (click)="closeSkillTree()">
        <div 
          class="skill-tree-container" 
          #container
          (click)="$event.stopPropagation()"
          (wheel)="onWheel($event)"
          (mousedown)="onMouseDown($event)"
          (mousemove)="onMouseMove($event)"
          (mouseup)="onMouseUp()"
          (mouseleave)="onMouseUp()"
          (touchstart)="onTouchStart($event)"
          (touchmove)="onTouchMove($event)"
          (touchend)="onTouchEnd()"
        >
          <header class="skill-tree-header">
            <h2>Árvore de Habilidades</h2>
            <div class="header-info">
              <span class="sp-display">💎 SP: {{ skillTree.userSkillPoints() }}</span>
              <div class="category-legend">
                <span class="legend-item bomb">BOMB</span>
                <span class="legend-item range">RANGE</span>
                <span class="legend-item speed">SPEED</span>
                <span class="legend-item synergy">SYNERGY</span>
                <span class="legend-item defense">DEFENSE</span>
              </div>
            </div>
            <button class="close-btn" (click)="closeSkillTree()">✕</button>
          </header>

          <div class="skill-tree-canvas" #canvas>
            @if (skillTree.isLoading()) {
              <div class="loading-indicator">Carregando árvore de habilidades...</div>
            } @else {
              <svg class="connections-svg" [attr.viewBox]="viewBox()">
                @for (node of skillTree.nodes(); track node.key) {
                  @for (prereqKey of node.prerequisites; track prereqKey) {
                    <path 
                      class="connection-path"
                      [attr.d]="getConnectionPath(node.key, prereqKey)"
                      [attr.stroke]="getCategoryColor(node.category)"
                      [attr.stroke-width]="isPrereqMet(prereqKey) ? 3 : 1"
                      [attr.stroke-dasharray]="isPrereqMet(prereqKey) ? 'none' : '5,5'"
                      fill="none"
                    />
                  }
                }
              </svg>
              
@for (node of skillTree.nodes(); track node.key) {
              <app-skill-node
                [node]="node"
                [level]="skillTree.getUserSkillLevel(node.key)"
                [isSelected]="skillTree.selectedNodeKey() === node.key"
                [isUnlocked]="skillTree.isUnlocked(node)"
                [isMaxLevel]="skillTree.isMaxLevel(node)"
                [position]="skillTree.getNodePosition(node.key) ?? { x: 0, y: 0 }"
                (select)="skillTree.selectNode(node.key)"
              />
            }
            }
          </div>

          @if (skillTree.selectedNode(); as selected) {
            <div class="skill-tooltip-panel">
              <h3>{{ selected.icon }} {{ selected.name }}</h3>
              <p>{{ selected.description }}</p>
              <div class="tooltip-stats">
                <span>Categoria: {{ selected.category }}</span>
                <span>Nível: {{ skillTree.getUserSkillLevel(selected.key) }} / {{ selected.maxLevel }}</span>
                @if (!skillTree.isMaxLevel(selected)) {
                  <span class="cost">Custo: {{ skillTree.upgradeCost()?.cost ?? 0 }} SP</span>
                  @if (skillTree.upgradeCost()!.missingPrereqs.length > 0) {
                    <span class="prereq-warning">Requer: {{ skillTree.upgradeCost()!.missingPrereqs.join(', ') }}</span>
                  }
                } @else {
                  <span class="maxed">MÁXIMO</span>
                }
              </div>
              @if (!skillTree.isMaxLevel(selected) && skillTree.isUnlocked(selected)) {
                <button 
                  class="upgrade-btn" 
                  (click)="upgradeSelected()"
                  [disabled]="!skillTree.upgradeCost()?.canAfford || skillTree.isLoading()"
                >
                  {{ skillTree.isLoading() ? 'Aplicando...' : 'Upgradear (' + (skillTree.upgradeCost()?.cost ?? 0) + ' SP)' }}
                </button>
              }
            </div>
          }
        </div>
      </div>
  `,
  styles: [`
    .skill-tree-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.2s ease;
    }

    .skill-tree-container {
      background: #0d1117;
      border: 2px solid #30363d;
      border-radius: 16px;
      width: 95vw;
      height: 90vh;
      max-width: 1400px;
      max-height: 900px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(88, 166, 255, 0.2);
      animation: slideUp 0.3s ease;
    }

    .skill-tree-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #30363d;
      background: linear-gradient(180deg, rgba(88, 166, 255, 0.1), transparent);
    }

    .skill-tree-header h2 {
      margin: 0;
      color: #58a6ff;
      font-size: 1.5rem;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 24px;
      flex: 1;
    }

    .sp-display {
      background: linear-gradient(135deg, #ffd700, #ffaa00);
      color: #0d1117;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 1rem;
      box-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
    }

    .category-legend {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .legend-item {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .legend-item.bomb { background: #ff6b35; color: #fff; }
    .legend-item.range { background: #4ecdc4; color: #fff; }
    .legend-item.speed { background: #ffe66d; color: #000; }
    .legend-item.synergy { background: #ff6b9d; color: #fff; }
    .legend-item.defense { background: #95e1d3; color: #000; }

    .close-btn {
      background: #da3633;
      color: #fff;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 1.2rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #f85149;
      transform: scale(1.1);
    }

    .skill-tree-canvas {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: 
        radial-gradient(ellipse at 20% 20%, rgba(88, 166, 255, 0.05) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(255, 107, 157, 0.05) 0%, transparent 50%);
    }

    .connections-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }

    .connection-path {
      transition: stroke 0.3s, stroke-width 0.3s;
      filter: drop-shadow(0 0 4px currentColor);
    }

    app-skill-node {
      position: absolute;
      z-index: 2;
    }

    .skill-tooltip-panel {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 400px;
      background: #161b22;
      border: 2px solid #30363d;
      border-radius: 12px;
      padding: 20px;
      z-index: 10;
      animation: slideUp 0.2s ease;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .skill-tooltip-panel h3 {
      margin: 0 0 12px;
      color: #58a6ff;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .skill-tooltip-panel p {
      margin: 0 0 16px;
      color: #8b949e;
      line-height: 1.5;
    }

    .tooltip-stats {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      font-size: 0.9rem;
    }

    .tooltip-stats span {
      color: #c9d1d9;
    }

    .cost {
      color: #ffd700 !important;
      font-weight: 600;
    }

    .prereq-warning {
      color: #f85149 !important;
      font-size: 0.8rem;
    }

    .maxed {
      color: #3fb950 !important;
      font-weight: bold;
    }

    .upgrade-btn {
      width: 100%;
      padding: 12px 24px;
      background: linear-gradient(135deg, #238636, #2ea043);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .upgrade-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #2ea043, #3fb950);
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(46, 160, 67, 0.4);
    }

    .upgrade-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .skill-tree-container {
        width: 100vw;
        height: 100vh;
        max-width: none;
        max-height: none;
        border-radius: 0;
      }
      .skill-tooltip-panel {
        width: 100%;
        max-width: none;
        bottom: 0;
        left: 0;
        transform: none;
        border-radius: 16px 16px 0 0;
      }
    }

    .loading-indicator {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8b949e;
      font-size: 1.2rem;
      background: rgba(13, 17, 23, 0.9);
      z-index: 10;
    }
  `],
})
export class SkillTreeComponent implements OnInit, OnDestroy {
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLDivElement>;

  readonly skillTree = inject(SkillTreeService);

  private panStart = { x: 0, y: 0 };
  private isPanning = false;
  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private resizeObserver: ResizeObserver | null = null;

  readonly viewBox = computed(() => {
    const scale = this.scale;
    return `${-this.translateX / scale} ${-this.translateY / scale} ${this.viewportWidth / scale} ${this.viewportHeight / scale}`;
  });

  private readonly nodePositions = new Map<string, { x: number; y: number }>();

  ngOnInit(): void {
    this.skillTree.load().catch(console.error);
  }

  ngAfterViewInit(): void {
    // Wait for nodes to load, then calculate positions
    effect(() => {
      const nodes = this.skillTree.nodes();
      if (nodes.length > 0) {
        this.calculateViewport();
        this.calculateNodePositions();
      }
    });
    
    this.resizeObserver = new ResizeObserver(() => this.calculateViewport());
    this.resizeObserver.observe(this.container.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private calculateViewport(): void {
    const rect = this.container.nativeElement.getBoundingClientRect();
    this.viewportWidth = rect.width;
    this.viewportHeight = rect.height;
    this.fitToView();
  }

  private calculateNodePositions(): void {
    this.skillTree.nodes().forEach(node => {
      // Positions are normalized (0-1), convert to canvas coordinates
      // Using a force-directed layout would be better, but for now use predefined positions
      this.nodePositions.set(node.key, {
        x: node.positionX * (this.viewportWidth || 1200),
        y: node.positionY * (this.viewportHeight || 800),
      });
    });
  }

  private fitToView(): void {
    // Center the tree initially
    this.translateX = 0;
    this.translateY = 0;
    this.scale = 1;
  }

  getConnectionPath(fromKey: string, toKey: string): string {
    const from = this.nodePositions.get(fromKey);
    const to = this.nodePositions.get(toKey);
    if (!from || !to) return '';

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const midX = from.x + dx * 0.5;
    const midY = from.y + dy * 0.5 - Math.abs(dx) * 0.15; // slight curve

    return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
  }

  isPrereqMet(key: string): boolean {
    return this.skillTree.getUserSkillLevel(key) > 0;
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      BOMB: '#ff6b35',
      RANGE: '#4ecdc4',
      SPEED: '#ffe66d',
      SYNERGY: '#ff6b9d',
      DEFENSE: '#95e1d3',
    };
    return colors[category] ?? '#58a6ff';
  }

  async upgradeSelected(): Promise<void> {
    const selected = this.skillTree.selectedNode();
    if (selected) {
      await this.skillTree.upgradeSkill(selected.key);
    }
  }

  closeSkillTree(): void {
    // The parent handles closing via the signal
    // This component just emits or the parent handles it
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // Parent handles close
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(this.scale * delta, 0.5), 3);
    this.scale = newScale;
  }

  onMouseDown(event: MouseEvent): void {
    if (event.target === this.container.nativeElement || event.target === this.canvas?.nativeElement) {
      this.isPanning = true;
      this.panStart = { x: event.clientX, y: event.clientY };
      this.container.nativeElement.style.cursor = 'grabbing';
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isPanning) return;
    const dx = event.clientX - this.panStart.x;
    const dy = event.clientY - this.panStart.y;
    this.translateX += dx / this.scale;
    this.translateY += dy / this.scale;
    this.panStart = { x: event.clientX, y: event.clientY };
  }

  onMouseUp(): void {
    this.isPanning = false;
    this.container.nativeElement.style.cursor = 'grab';
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isPanning = true;
      this.panStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isPanning || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - this.panStart.x;
    const dy = event.touches[0].clientY - this.panStart.y;
    this.translateX += dx / this.scale;
    this.translateY += dy / this.scale;
    this.panStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    event.preventDefault();
  }

  onTouchEnd(): void {
    this.isPanning = false;
  }
}