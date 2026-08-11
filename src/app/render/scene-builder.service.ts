import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GameLogicService } from '../core/game-logic.service';
import { EXPLOSION_MS, GRID_SIZE } from '../core/models/game-config';
import { EnemyView, Explosion, InterpolatedMove } from '../core/models/game-state.model';
import { GridPosition, keyOf, samePosition } from '../core/models/position.model';
import { PowerUpType } from '../core/models/power-up.model';
import { TileType } from '../core/models/tile.model';

function tileToWorld(p: GridPosition): { x: number; z: number } {
  const offset = (GRID_SIZE - 1) / 2;
  return { x: p.x - offset, z: p.y - offset };
}

@Injectable({ providedIn: 'root' })
export class SceneBuilderService {
  private scene?: THREE.Scene;
  private readonly tileMeshes = new Map<string, THREE.Mesh>();
  private readonly bombMeshes = new Map<number, THREE.Mesh>();
  private readonly enemyMeshes = new Map<number, THREE.Group>();
  private readonly powerUpMeshes = new Map<string, THREE.Group>();
  private readonly renderedExplosions = new Map<number, { group: THREE.Group; startedAt: number }>();
  private playerMesh?: THREE.Group;
  private ground?: THREE.Mesh;

  init(scene: THREE.Scene): void {
    this.scene = scene;
    const geometry = new THREE.PlaneGeometry(GRID_SIZE + 3, GRID_SIZE + 3);
    const material = new THREE.MeshStandardMaterial({ color: 0x2a3245, roughness: 0.9 });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.ground = ground;
    this.scene.add(ground);
  }

  sync(logic: GameLogicService, deltaMs: number): void {
    if (!this.scene) {
      return;
    }
    const timeMs = 'getGameTimeMs' in logic ? (logic as any).getGameTimeMs() : performance.now();
    this.syncTiles(logic);
    this.syncPlayer(logic);
    this.syncEnemies(logic);
    this.syncBombs(logic, timeMs);
    this.syncPowerUps(logic, timeMs);
    this.syncExplosions(logic, timeMs);
  }

  dispose(): void {
    this.tileMeshes.forEach((m) => this.disposeMesh(m));
    this.tileMeshes.clear();
    this.bombMeshes.forEach((m) => this.disposeMesh(m));
    this.bombMeshes.clear();
    this.enemyMeshes.forEach((g) => this.disposeGroup(g));
    this.enemyMeshes.clear();
    this.powerUpMeshes.forEach((g) => this.disposeGroup(g));
    this.powerUpMeshes.clear();
    this.renderedExplosions.forEach(({ group }) => this.disposeGroup(group));
    this.renderedExplosions.clear();
    if (this.playerMesh) {
      this.disposeGroup(this.playerMesh);
      this.playerMesh = undefined;
    }
    if (this.ground) {
      this.scene?.remove(this.ground);
      this.disposeMesh(this.ground);
      this.ground = undefined;
    }
  }

  private syncTiles(logic: GameLogicService): void {
    const grid = logic.getGrid();
    const exitBox = logic.getExitBox();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const p = { x, y };
        const key = keyOf(p);
        const type = grid[y][x].type;
        const existing = this.tileMeshes.get(key);
        if (existing && existing.userData['tileType'] === type) {
          continue;
        }
        if (existing) {
          this.scene?.remove(existing);
          this.disposeMesh(existing);
          this.tileMeshes.delete(key);
        }
        if (type === TileType.Empty) {
          continue;
        }
        const mesh = this.createTileMesh(p, type, samePosition(p, exitBox));
        mesh.userData['tileType'] = type;
        this.tileMeshes.set(key, mesh);
        this.scene?.add(mesh);
      }
    }
  }

  private createTileMesh(p: GridPosition, type: TileType, isExitBox: boolean): THREE.Mesh {
    const { x, z } = tileToWorld(p);
    let mesh: THREE.Mesh;
    if (type === TileType.Wall) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.2, 1),
        new THREE.MeshStandardMaterial({ color: 0x6b7280 }),
      );
      mesh.position.set(x, 0.6, z);
    } else if (type === TileType.Box) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        new THREE.MeshStandardMaterial({ color: isExitBox ? 0xc8862b : 0x9a6b2f }),
      );
      mesh.position.set(x, 0.45, z);
    } else {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.1, 24),
        new THREE.MeshStandardMaterial({ color: 0x37e06b, emissive: 0x1f8f42, emissiveIntensity: 0.8 }),
      );
      mesh.position.set(x, 0.05, z);
    }
    mesh.castShadow = type !== TileType.Exit;
    mesh.receiveShadow = true;
    return mesh;
  }

  private syncPlayer(logic: GameLogicService): void {
    const view = logic.getPlayerView();
    if (!this.playerMesh) {
      this.playerMesh = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.28, 0.55, 4, 12),
        new THREE.MeshStandardMaterial({ color: 0x4aa3ff }),
      );
      body.position.y = 0.75;
      body.castShadow = true;
      this.playerMesh.add(body);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.07),
        new THREE.MeshStandardMaterial({ color: 0x111111 }),
      );
      eye.position.set(0.14, 0.98, 0.22);
      this.playerMesh.add(eye);
      this.scene?.add(this.playerMesh);
    }
    this.applyView(this.playerMesh, view?.position!, view?.move!);
  }

  private syncEnemies(logic: GameLogicService): void {
    const views = logic.getEnemyViews();
    const seen = new Set<number>();
    for (const view of views) {
      seen.add(view.id);
      let group = this.enemyMeshes.get(view.id);
      if (!group) {
        group = this.createEnemyMesh();
        this.enemyMeshes.set(view.id, group);
        this.scene?.add(group);
      }
      this.applyView(group, view.position, view.move);
    }
    for (const [id, group] of this.enemyMeshes) {
      if (!seen.has(id)) {
        this.scene?.remove(group);
        this.disposeGroup(group);
        this.enemyMeshes.delete(id);
      }
    }
  }

  private createEnemyMesh(): THREE.Group {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.5, 4, 12),
      new THREE.MeshStandardMaterial({ color: 0xff5252 }),
    );
    body.position.y = 0.72;
    body.castShadow = true;
    group.add(body);
    return group;
  }

  private syncBombs(logic: GameLogicService, timeMs: number): void {
    const bombs = logic.getBombs();
    const seen = new Set<number>();
    for (const bomb of bombs) {
      seen.add(bomb.id);
      let mesh = this.bombMeshes.get(bomb.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.5 }),
        );
        mesh.castShadow = true;
        this.bombMeshes.set(bomb.id, mesh);
        this.scene?.add(mesh);
      }
      const w = tileToWorld(bomb.position);
      mesh.position.set(w.x, 0.32, w.z);
      mesh.scale.setScalar(1 + 0.15 * Math.sin(timeMs / 150));
    }
    for (const [id, mesh] of this.bombMeshes) {
      if (!seen.has(id)) {
        this.scene?.remove(mesh);
        this.disposeMesh(mesh);
        this.bombMeshes.delete(id);
      }
    }
  }

  private syncPowerUps(logic: GameLogicService, timeMs: number): void {
    const drops = logic.getPowerUps();
    const seen = new Set<string>();
    for (const drop of drops) {
      const key = keyOf(drop.position);
      seen.add(key);
      let group = this.powerUpMeshes.get(key);
      if (!group) {
        group = this.createPowerUpMesh(drop.type);
        group.userData['phase'] = Math.random() * Math.PI * 2;
        this.powerUpMeshes.set(key, group);
        this.scene?.add(group);
      }
      const w = tileToWorld(drop.position);
      group.position.set(w.x, 0.55 + 0.12 * Math.sin(timeMs / 200 + (group.userData['phase'] as number)), w.z);
    }
    for (const [key, group] of this.powerUpMeshes) {
      if (!seen.has(key)) {
        this.scene?.remove(group);
        this.disposeGroup(group);
        this.powerUpMeshes.delete(key);
      }
    }
  }

  private createPowerUpMesh(type: PowerUpType): THREE.Group {
    const group = new THREE.Group();
    let mesh: THREE.Mesh;
    if (type === PowerUpType.Bomb) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xffd166 }),
      );
    } else if (type === PowerUpType.Range) {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xff8c42 }),
      );
    } else if (type === PowerUpType.Speed) {
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x7ce38b }),
      );
    } else {
      mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.25),
        new THREE.MeshStandardMaterial({ color: 0xcf9bff }),
      );
    }
    mesh.castShadow = true;
    group.add(mesh);
    return group;
  }

  private syncExplosions(logic: GameLogicService, timeMs: number): void {
    const explosions = logic.getExplosions();
    for (const explosion of explosions) {
      if (this.renderedExplosions.has(explosion.id)) {
        continue;
      }
      const group = new THREE.Group();
      for (const tile of explosion.tiles) {
        const w = tileToWorld(tile);
        const isCenter = samePosition(tile, explosion.position);
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.7, 0.7),
          new THREE.MeshBasicMaterial({
            color: isCenter ? 0xfff3b0 : 0xffa927,
            transparent: true,
            opacity: 0.95,
          }),
        );
        cube.position.set(w.x, 0.35, w.z);
        group.add(cube);
      }
      this.scene?.add(group);
      this.renderedExplosions.set(explosion.id, { group, startedAt: timeMs });
    }
    for (const [id, { group, startedAt }] of this.renderedExplosions) {
      if (!explosions.some((e: Explosion) => e.id === id)) {
        this.scene?.remove(group);
        this.disposeGroup(group);
        this.renderedExplosions.delete(id);
        continue;
      }
      const progress = (timeMs - startedAt) / EXPLOSION_MS;
      for (const child of group.children) {
        child.scale.setScalar(Math.max(0.1, progress));
      }
    }
  }

  private applyView(mesh: THREE.Object3D, position: GridPosition, move: InterpolatedMove | null): void {
    let x: number;
    let z: number;
    if (move) {
      const from = tileToWorld(move.from);
      const to = tileToWorld(move.to);
      const t = move.progress;
      x = from.x + (to.x - from.x) * t;
      z = from.z + (to.z - from.z) * t;
    } else {
      const w = tileToWorld(position);
      x = w.x;
      z = w.z;
    }
    mesh.position.set(x, mesh.position.y, z);
  }

  private disposeMesh(mesh: THREE.Mesh): void {
    mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(material)) {
      material.forEach((m) => m.dispose());
    } else {
      material.dispose();
    }
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        this.disposeMesh(mesh);
      }
    });
  }
}