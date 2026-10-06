import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const EYE = 1.65;
const RADIUS = 0.4;
const WALK = 4.6;
const SPRINT = 7.2;
const REGEN_DELAY = 3;

export class Player {
  constructor(camera, dom, colliders) {
    this.camera = camera;
    this.colliders = colliders;
    this.controls = new PointerLockControls(camera, dom);
    this.keys = new Set();
    this.firing = false;
    this.bob = 0;
    this.reset();

    addEventListener('keydown', (e) => this.keys.add(e.code));
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => {
      this.keys.clear();
      this.firing = false;
    });
    dom.addEventListener('mousedown', (e) => e.button === 0 && (this.firing = true));
    addEventListener('mouseup', (e) => e.button === 0 && (this.firing = false));
  }

  reset() {
    this.position = new THREE.Vector3(0, 0, 4);
    this.camera.position.set(0, EYE, 4);
    this.camera.rotation.set(0, 0, 0);
    this.maxHealth = 100;
    this.health = 100;
    this.sinceHurt = 99;
    this.perks = new Set();
  }

  set sensitivity(v) {
    this.controls.pointerSpeed = v;
  }

  get alive() {
    return this.health > 0;
  }

  damage(n) {
    this.health = Math.max(0, this.health - n);
    this.sinceHurt = 0;
  }

  addPerk(name) {
    this.perks.add(name);
    if (name === 'juggernog') {
      this.maxHealth = 250;
      this.health = 250;
    }
  }

  update(dt) {
    const k = this.keys;
    const forward = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const strafe = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const sprinting = (k.has('ShiftLeft') || k.has('ShiftRight')) && forward > 0;
    const speed = sprinting ? SPRINT : WALK;

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);
    const move = dir.multiplyScalar(forward).add(right.multiplyScalar(strafe));
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);

    this.position.add(move);
    this.colliders.resolve(this.position, RADIUS);

    // Balancement de la tête
    const moving = move.lengthSq() > 0;
    this.bob += moving ? dt * (sprinting ? 13 : 9) : 0;
    const bobY = moving ? Math.sin(this.bob) * 0.05 : 0;
    this.camera.position.set(this.position.x, EYE + bobY, this.position.z);

    // Régénération
    this.sinceHurt += dt;
    if (this.sinceHurt > REGEN_DELAY) this.health = Math.min(this.maxHealth, this.health + 80 * dt);
  }
}
