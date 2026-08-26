import { Component, effect, signal, computed, ViewChild, ElementRef, inject, OnInit, OnDestroy, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkillTreeService } from '../../core/roguelite/skill-tree.service';
import { SkillNodeComponent } from './skill-node/skill-node.component';
import Panzoom from '@panzoom/panzoom';

@Component({
  selector: 'app-skill-tree',
  standalone: true,
  imports: [CommonModule, SkillNodeComponent],
  templateUrl: './skill-tree.component.html',
  styleUrl: './skill-tree.component.scss'
})
export class SkillTreeComponent implements OnInit, OnDestroy {
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;
  @ViewChild('panzoom') panzoomElement!: ElementRef<HTMLElement>;

  readonly skillTree = inject(SkillTreeService);

  @Output() close = new EventEmitter<void>();

  public panzoomInstance: any = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly nodePositions = new Map<string, { x: number; y: number }>();

  // ViewBox computed for SVG
  readonly viewBox = computed(() => {
    const canvas = this.panzoomElement?.nativeElement;
    if (!canvas) return '0 0 1200 800';
    const rect = canvas.getBoundingClientRect();
    return `0 0 ${rect.width} ${rect.height}`;
  });

  ngOnInit(): void {
    this.skillTree.load().catch(console.error);
  }

  ngAfterViewInit(): void {
    // Initialize panzoom on the canvas element
    this.initPanzoom();

    // Wait for nodes to load, then calculate positions
    effect(() => {
      const nodes = this.skillTree.nodes();
      if (nodes.length > 0) {
        this.calculateViewport();
        this.calculateNodePositions();
        this.fitToView();
      }
    });
    
    this.resizeObserver = new ResizeObserver(() => this.calculateViewport());
    this.resizeObserver.observe(this.container.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.panzoomInstance?.destroy();
  }

  private calculateViewport(): void {
    this.fitToView();
  }

  private calculateNodePositions(): void {
    this.skillTree.nodes().forEach(node => {
      // Positions are normalized (0-1), convert to canvas coordinates
      // Using a force-directed layout would be better, but for now use predefined positions
      this.nodePositions.set(node.key, {
        x: node.positionX * 1200,
        y: node.positionY * 800,
      });
    });
  }

  fitToView(): void {
    const nodes = this.skillTree.nodes();
    if (nodes.length === 0) {
      this.panzoomInstance?.reset();
      return;
    }

    // Calculate bounding box of all nodes
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    this.skillTree.nodes().forEach(node => {
      const pos = this.nodePositions.get(node.key);
      if (pos) {
        // Account for node size (64px diameter)
        minX = Math.min(minX, pos.x - 32);
        maxX = Math.max(maxX, pos.x + 32);
        minY = Math.min(minY, pos.y - 32);
        maxY = Math.max(maxY, pos.y + 32);
      }
    });

    // Add padding
    const padding = 80;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    // Get viewport dimensions
    const rect = this.panzoomElement?.nativeElement?.getBoundingClientRect();
    const viewportWidth = rect?.width || this.container.nativeElement.clientWidth;
    const viewportHeight = rect?.height || this.container.nativeElement.clientHeight;

    // Calculate scale to fit content in viewport with some margin
    const scaleX = viewportWidth / contentWidth;
    const scaleY = viewportHeight / contentHeight;
    const targetScale = Math.min(scaleX, scaleY, 1.5); // max scale 1.5

    // Center the content in the viewport
    const translateX = -contentCenterX * targetScale + viewportWidth / 2;
    const translateY = -contentCenterY * targetScale + viewportHeight / 2;

    // Apply via panzoom
    this.panzoomInstance?.pan({
      x: translateX,
      y: translateY,
      scale: targetScale,
      animate: false
    });
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
    this.close.emit();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeSkillTree();
    }
    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      this.fitToView();
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.panzoomInstance?.zoomIn({ animate: true });
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.panzoomInstance?.zoomOut({ animate: true });
    }
  }

  private initPanzoom(): void {
    const canvas = this.panzoomElement?.nativeElement;
    if (!canvas) return;

    this.panzoomInstance = Panzoom(canvas, {
      maxScale: 3,
      minScale: 0.3,
      animate: true,
      duration: 200,
      easing: 'ease-out',
      cursor: 'grab',
      contain: 'inside',
      startScale: 1,
      startX: 0,
      startY: 0,
      // Exclude interactive elements from panzoom
      excludeClass: 'panzoom-exclude',
    });

    // Bind wheel zoom to the canvas element
    canvas.addEventListener('wheel', (event) => {
      this.panzoomInstance.zoomWithWheel(event);
    }, { passive: false });

    // Exclude interactive elements from panzoom
    const excludeClass = 'panzoom-exclude';
    canvas.querySelectorAll('.skill-node, .skill-tooltip-panel, .reset-btn, .close-btn, .tooltip-close, .upgrade-btn, .zoom-in-btn, .zoom-out-btn').forEach(el => {
      el.classList.add(excludeClass);
    });
  }
}