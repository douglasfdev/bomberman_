import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SkillNodeData {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  baseCost: number;
  costScaling: number;
  maxLevel: number;
  prerequisites: string[];
  category: string;
  positionX: number;
  positionY: number;
  effects: Record<string, any>;
  isActive: boolean;
}

@Component({
  selector: 'app-skill-node',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="skill-node"
      [class.category]="'cat-' + node().category.toLowerCase()"
      [class.locked]="!isUnlocked()"
      [class.maxed]="isMaxLevel()"
      [class.selected]="isSelected()"
      [style.left.px]="position().x"
      [style.top.px]="position().y"
      (click)="onClick()"
    >
      <div class="node-ring" [style.border-color]="getCategoryColor()">
        <div class="node-content">
          <span class="node-icon">{{ node().icon }}</span>
          <span class="node-level" *ngIf="level() > 0 || isMaxLevel()">
            {{ isMaxLevel() ? 'MAX' : level() }}
          </span>
          <span class="node-lock" *ngIf="locked()">🔒</span>
        </div>
      </div>
      
      <div class="node-label">{{ node().name }}</div>
    </div>
  `,
  styles: [`
    .skill-node {
      position: absolute;
      transform: translate(-50%, -50%);
      cursor: pointer;
      transition: transform 0.15s, filter 0.15s;
      user-select: none;
    }

    .skill-node:hover:not(.locked):not(.maxed) {
      transform: translate(-50%, -50%) scale(1.1);
      filter: brightness(1.2);
      z-index: 10;
    }

    .skill-node.locked {
      opacity: 0.4;
      filter: grayscale(0.8);
    }

    .skill-node.maxed {
      filter: drop-shadow(0 0 12px #3fb950);
    }

    .skill-node.selected {
      filter: drop-shadow(0 0 16px #58a6ff);
    }

    .node-ring {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 3px solid;
      background: linear-gradient(135deg, #161b22, #0d1117);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
    }

    .node-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }

    .node-icon {
      font-size: 1.8rem;
      line-height: 1;
    }

    .node-level {
      font-size: 0.65rem;
      font-weight: bold;
      color: #ffd700;
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    }

    .node-lock {
      position: absolute;
      top: -6px;
      right: -6px;
      background: #da3633;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      border: 2px solid #0d1117;
    }

    .node-label {
      margin-top: 6px;
      text-align: center;
      font-size: 0.7rem;
      color: #8b949e;
      font-weight: 500;
      white-space: nowrap;
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .skill-node.locked .node-label {
      color: #484f58;
    }

    .skill-node.maxed .node-label {
      color: #3fb950;
      font-weight: 600;
    }

    .skill-node.selected .node-label {
      color: #58a6ff;
    }

    /* Category color variations */
    .skill-node.cat-bomb .node-ring {
      border-color: #ff6b35;
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .skill-node.cat-range .node-ring {
      border-color: #4ecdc4;
      box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .skill-node.cat-speed .node-ring {
      border-color: #ffe66d;
      box-shadow: 0 4px 12px rgba(255, 230, 109, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .skill-node.cat-synergy .node-ring {
      border-color: #ff6b9d;
      box-shadow: 0 4px 12px rgba(255, 107, 157, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .skill-node.cat-defense .node-ring {
      border-color: #95e1d3;
      box-shadow: 0 4px 12px rgba(149, 225, 211, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .skill-node.maxed .node-ring {
      border-color: #3fb950 !important;
      box-shadow: 0 0 20px #3fb950, inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
    }

    .skill-node.selected:not(.locked) .node-ring {
      border-width: 4px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 12px #58a6ff, inset 0 1px 0 rgba(255, 255, 255, 0.1); }
      50% { box-shadow: 0 0 24px #58a6ff, inset 0 1px 0 rgba(255, 255, 255, 0.1); }
    }
  `],
})
export class SkillNodeComponent {
  readonly node = input.required<{
    id: string;
    key: string;
    name: string;
    description: string;
    icon: string;
    baseCost: number;
    costScaling: number;
    maxLevel: number;
    prerequisites: string[];
    category: string;
    positionX: number;
    positionY: number;
    effects: Record<string, any>;
    isActive: boolean;
  }>();

  readonly level = input.required<number>();
  readonly isSelected = input.required<boolean>();
  readonly isUnlocked = input.required<boolean>();
  readonly isMaxLevel = input.required<boolean>();
  readonly position = input.required<{ x: number; y: number }>();

  readonly select = output<void>();

  readonly locked = computed(() => !this.isUnlocked());

  readonly levelDisplay = computed(() => this.isMaxLevel() ? 'MAX' : this.level());

  onClick(): void {
    this.select.emit();
  }

  getCategoryColor(): string {
    const colors: Record<string, string> = {
      BOMB: '#ff6b35',
      RANGE: '#4ecdc4',
      SPEED: '#ffe66d',
      SYNERGY: '#ff6b9d',
      DEFENSE: '#95e1d3',
    };
    return colors[this.node().category] ?? '#58a6ff';
  }
}