import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GRID_SIZE } from '../core/models/game-config';

@Injectable({ providedIn: 'root' })
export class ThreeEngineService {
  scene!: THREE.Scene;
  camera!: THREE.OrthographicCamera;
  renderer!: THREE.WebGLRenderer;

  private readonly clock = new THREE.Clock();
  private container!: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private running = false;
  private frame = 0;

  init(container: HTMLElement, canvas: HTMLCanvasElement): void {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1420);

    const extent = GRID_SIZE * 0.8;
    this.camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, 0.1, 100);
    this.camera.position.set(10, 14, 10);
    this.camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    this.scene.add(sun);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  startLoop(callback: (deltaMs: number) => void): void {
    this.running = true;
    const loop = (): void => {
      if (!this.running) {
        return;
      }
      this.frame = requestAnimationFrame(loop);
      const deltaMs = Math.min(this.clock.getDelta() * 1000, 50);
      callback(deltaMs);
      this.renderer.render(this.scene, this.camera);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stopLoop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose(): void {
    this.stopLoop();
    this.resizeObserver?.disconnect();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material.dispose();
      }
    });
    this.renderer?.dispose();
  }

  private resize(): void {
    if (!this.container || !this.renderer || !this.camera) {
      return;
    }
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const half = GRID_SIZE * 0.7;
    let halfW: number;
    let halfH: number;
    if (aspect >= 1) {
      halfH = half;
      halfW = half * aspect;
    } else {
      halfW = half;
      halfH = half / aspect;
    }
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }
}
