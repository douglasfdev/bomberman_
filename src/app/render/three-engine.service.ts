import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GRID_SIZE } from '../core/models/game-config';

@Injectable({ providedIn: 'root' })
export class ThreeEngineService {
  scene!: THREE.Scene;
  camera!: THREE.OrthographicCamera;
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;

  private readonly clock = new THREE.Timer();
  private container!: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private running = false;
  private frame = 0;

  private readonly platformId = inject(PLATFORM_ID);

  init(container: HTMLElement, canvas: HTMLCanvasElement): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1420);

    const extent = GRID_SIZE * 0.8;
    this.camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, 0.1, 100);

    this.camera.position.set(0, 16, 8);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enableRotate = true;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(8, 20, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    this.scene.add(sun);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  startLoop(callback: (deltaMs: number) => void): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.running = true;
    const loop = (): void => {
      if (!this.running) {
        return;
      }
      this.frame = requestAnimationFrame(loop);
      const deltaMs = Math.min(this.clock.getDelta() * 1000, 50);

      if (this.controls) {
        this.controls.update();
      }

      callback(deltaMs);
      this.renderer.render(this.scene, this.camera);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stopLoop(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.stopLoop();
    this.resizeObserver?.disconnect();

    if (this.controls) {
      this.controls.dispose();
    }

    this.scene?.traverse((obj) => {
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
    if (!isPlatformBrowser(this.platformId) || !this.container || !this.renderer || !this.camera) {
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