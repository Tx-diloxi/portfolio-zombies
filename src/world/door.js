import * as THREE from 'three';
import { textTexture, woodTexture } from './textures.js';

export const DOOR_W = 4;
const DOOR_H = 3;

let woodMat;

// Barricade en planches qui bloque un passage entre deux salles, achetable avec des points.
export class Door {
  constructor(scene, colliders, { x, z, horizontal, cost, rooms }) {
    woodMat ??= new THREE.MeshLambertMaterial({ map: woodTexture() });
    this.cost = cost;
    this.rooms = rooms;
    this.isOpen = false;
    this.position = new THREE.Vector3(x, 1.5, z);
    this.horizontal = horizontal;
    this.colliders = colliders;
    this.scene = scene;
    this.sink = 0;

    const g = new THREE.Group();
    g.position.set(x, 0, z);
    if (!horizontal) g.rotation.y = Math.PI / 2;

    // Planches croisées
    for (let i = 0; i < 5; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.2, 0.42, 0.12), woodMat);
      plank.position.set(0, 0.35 + i * 0.6, (i % 2) * 0.1 - 0.05);
      plank.rotation.z = (Math.random() - 0.5) * 0.12;
      g.add(plank);
    }
    for (const s of [-1, 1]) {
      const diag = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 0.1), woodMat);
      diag.position.set(0, 1.5, s * 0.15);
      diag.rotation.z = s * 0.6;
      g.add(diag);
    }

    // Prix affiché des deux côtés
    const tex = textTexture([`${cost}`, 'points'], {
      width: 256, height: 128, bg: 'rgba(10,8,6,0.85)', color: ['#d9a441', '#e9e1cf'], font: ['Oswald', 'Special Elite'], sizes: [56, 26],
    });
    for (const side of [1, -1]) {
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: tex }));
      label.position.set(0, 1.6, side * 0.22);
      if (side < 0) label.rotation.y = Math.PI;
      g.add(label);
    }

    scene.add(g);
    this.mesh = g;

    const hw = DOOR_W / 2;
    this.collider = horizontal
      ? colliders.add(x - hw, x + hw, z - 0.25, z + 0.25)
      : colliders.add(x - 0.25, x + 0.25, z - hw, z + hw);
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.colliders.remove(this.collider);
  }

  update(dt) {
    if (!this.isOpen || !this.mesh) return;
    this.sink += dt;
    this.mesh.position.y = -this.sink * 3;
    this.mesh.rotation.z = Math.sin(this.sink * 30) * 0.03;
    if (this.mesh.position.y < -DOOR_H - 0.5) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
  }
}
