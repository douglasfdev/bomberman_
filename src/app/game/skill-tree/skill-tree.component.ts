import { Component, effect, signal, computed, ViewChild, ElementRef, inject, OnInit, OnDestroy, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkillTreeService } from '../../core/roguelite/skill-tree.service';
import { SkillNodeComponent } from './skill-node/skill-node.component';

@Component({
  selector: 'app-skill-tree',
  standalone: true,
  imports: [CommonModule, SkillNodeComponent],
  templateUrl: './skill-tree.component.html',
  styleUrl: './skill-tree.component.scss'
})
export class SkillTreeComponent implements OnInit, OnDestroy {
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLDivElement>;

  readonly skillTree = inject(SkillTreeService);

  @Output() close = new EventEmitter<void>();

  private panStart = { x: 0, y: 0 };
  private isPanning = false;
  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private resizeObserver: ResizeObserver | null = null;

  // Threshold for panning (in pixels) - only start panning after moving this many pixels
  private readonly PAN_THRESHOLD = 5;

  // Expose a signal for panning state to disable pointer events on nodes
  readonly isPanningSignal = signal(false);

  private readonly nodePositions = new Map<string, { x: number; y: number }>();

  // Track if mouse has moved enough to start panning
  private hasMovedEnough = false;

  readonly viewBox = computed(() => {
    const scale = this.scale;
    return `${-this.translateX / scale} ${-this.translateY / scale} ${this.viewportWidth / scale} ${this.viewportHeight / scale}`;
  });

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
        this.fitToView();
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

  fitToView(): void {
    const nodes = this.skillTree.nodes();
    if (nodes.length === 0) {
      this.translateX = 0;
      this.translateY = 0;
      this.scale = 1;
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

    // Calculate scale to fit content in viewport with some margin
    const scaleX = this.viewportWidth / contentWidth;
    const scaleY = this.viewportHeight / contentHeight;
    const targetScale = Math.min(scaleX, scaleY, 1.5); // max scale 1.5

    this.scale = targetScale;

    // Center the content in the viewport
    this.translateX = -contentCenterX * this.scale + this.viewportWidth / 2;
    this.translateY = -contentCenterY * this.scale + this.viewportHeight / 2;
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
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(this.scale * delta, 0.5), 3);
    this.scale = newScale;
  }

  onMouseDown(event: MouseEvent): void {
    // Allow panning from anywhere within the canvas area
    const target = event.target as HTMLElement;
    const canvas = this.canvas?.nativeElement;

    // Check if click is within the canvas area (canvas or its children)
    if (canvas && (target === canvas || canvas.contains(target))) {
      this.isPanning = true;
      // Don't set isPanningSignal yet - wait for movement threshold
      this.panStart = { x: event.clientX, y: event.clientY };
      this.hasMovedEnough = false;
      this.container.nativeElement.style.cursor = 'grabbing';
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isPanning) return;
    const dx = event.clientX - this.panStart.x;
    const dy = event.clientY - this.panStart.y;

    // Check if mouse has moved enough to start panning
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (!this.hasMovedEnough && distance >= this.PAN_THRESHOLD) {
      this.hasMovedEnough = true;
      this.isPanningSignal.set(true);
    }

    if (this.hasMovedEnough) {
      this.translateX += dx / this.scale;
      this.translateY += dy / this.scale;
      this.panStart = { x: event.clientX, y: event.clientY };
    }
  }

  onMouseUp(): void {
    this.isPanning = false;
    this.hasMovedEnough = false;
    this.isPanningSignal.set(false);
    this.container.nativeElement.style.cursor = 'grab';
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isPanning = true;
      this.isPanningSignal.set(true);
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
    this.isPanningSignal.set(false);
  }
}