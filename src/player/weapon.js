import * as THREE from 'three';
import { sfx } from '../systems/audio.js';

export const WEAPONS = {
  m1911: {
    name: 'M1911', cost: 0, ammoCost: 250, damage: 45, fireDelay: 0.16, auto: false,
    mag: 8, reserve: 80, reloadTime: 1.4, spread: 0.004, sound: 'pistol',
    upgrade: { name: 'Compile & Deploy', damage: 120, mag: 12, reserve: 120 },
  },
  mp40: {
    name: 'MP40', cost: 1000, ammoCost: 500, damage: 34, fireDelay: 0.095, auto: true,
    mag: 32, reserve: 192, reloadTime: 2.0, spread: 0.022, sound: 'smg',
    upgrade: { name: 'Full-Stack 115', damage: 85, mag: 64, reserve: 320 },
  },
};

const KNIFE = { damage: 150, range: 1.9, cooldown: 0.55 };
const UPGRADE_COLOR = 0x8a3cff;

function gunModel(id, upgraded) {
  const metal = new THREE.MeshLambertMaterial({ color: upgraded ? 0x3a2560 : 0x2b2b2e, emissive: upgraded ? UPGRADE_COLOR : 0, emissiveIntensity: 0.35 });
  const grip = new THREE.MeshLambertMaterial({ color: 0x4a3020 });
  const g = new THREE.Group();
  const box = (w, h, d, x, y, z, mat = metal) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  if (id === 'm1911') {
    box(0.07, 0.08, 0.32, 0, 0, -0.05);            // culasse
    box(0.06, 0.16, 0.08, 0, -0.1, 0.06, grip).rotation.x = -0.25; // crosse
    box(0.03, 0.03, 0.06, 0, -0.06, -0.02);        // pontet
    g.userData.muzzle = new THREE.Vector3(0, 0.0, -0.24);
  } else {
    box(0.07, 0.09, 0.5, 0, 0, -0.12);             // carcasse
    box(0.03, 0.03, 0.22, 0, 0.0, -0.47);          // canon
    box(0.04, 0.22, 0.05, 0, -0.15, -0.18);        // chargeur
    box(0.05, 0.13, 0.07, 0, -0.1, 0.07, grip).rotation.x = -0.3;
    box(0.02, 0.02, 0.3, 0, 0.06, 0.18);           // crosse pliante
    g.userData.muzzle = new THREE.Vector3(0, 0, -0.6);
  }
  return g;
}

function flashTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,220,1)');
  grd.addColorStop(0.3, 'rgba(255,190,80,0.9)');
  grd.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class WeaponSystem {
  // camera : caméra de jeu (visée) ; viewCamera : caméra de la passe "arme en main".
  constructor(camera, viewCamera, { raycastTargets, onHit, onChange }) {
    this.camera = camera;
    this.raycastTargets = raycastTargets;
    this.onHit = onHit;
    this.onChange = onChange;
    this.raycaster = new THREE.Raycaster();
    this.holder = new THREE.Group();
    this.holder.position.set(0.2, -0.2, -0.5);
    this.holder.scale.setScalar(0.8);
    viewCamera.add(this.holder);

    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    this.flash.scale.setScalar(0.3);
    this.flash.renderOrder = 10;
    this.flashLight = new THREE.PointLight(0xffaa55, 0, 8, 2);
    camera.add(this.flashLight);

    const knifeMat = new THREE.MeshLambertMaterial({ color: 0xb8b8c0 });
    this.knife = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.35), knifeMat);
    this.knife.position.set(-0.25, -0.25, -0.5);
    this.knife.visible = false;
    viewCamera.add(this.knife);

    this.reset();
  }

  reset() {
    this.slots = [];
    this.current = 0;
    this.cooldown = 0;
    this.reloading = 0;
    this.knifeTime = 0;
    this.recoil = 0;
    this.triggerHeld = false;
    this.give('m1911');
  }

  get gun() {
    return this.slots[this.current];
  }

  has(id) {
    return this.slots.some((s) => s.id === id);
  }

  give(id) {
    const def = WEAPONS[id];
    const slot = { id, def, upgraded: false, mag: def.mag, reserve: def.reserve, damage: def.damage, name: def.name, maxMag: def.mag, maxReserve: def.reserve };
    if (this.slots.length < 2) this.slots.push(slot);
    else this.slots[this.current] = slot;
    this.select(this.slots.indexOf(slot));
  }

  refill(id) {
    const s = this.slots.find((x) => x.id === id);
    s.mag = s.maxMag;
    s.reserve = s.maxReserve;
    this.onChange(this.gun);
  }

  upgradeCurrent() {
    const s = this.gun;
    const up = s.def.upgrade;
    Object.assign(s, { upgraded: true, name: up.name, damage: up.damage, maxMag: up.mag, maxReserve: up.reserve, mag: up.mag, reserve: up.reserve });
    this.select(this.current);
  }

  select(i) {
    if (!this.slots[i]) return;
    this.current = i;
    this.reloading = 0;
    this.holder.clear();
    const model = gunModel(this.gun.id, this.gun.upgraded);
    this.holder.add(model);
    this.flash.position.copy(model.userData.muzzle);
    model.add(this.flash);
    this.flash.visible = false;
    this.swap = 0.35;
    this.onChange(this.gun);
  }

  cycle(dir) {
    if (this.slots.length > 1) this.select((this.current + dir + this.slots.length) % this.slots.length);
  }

  reload() {
    const s = this.gun;
    if (this.reloading || s.mag === s.maxMag || s.reserve === 0) return;
    this.reloading = s.def.reloadTime;
    sfx.reload();
  }

  #shoot(spread, far, damage, isKnife = false) {
    const dir = new THREE.Vector2((Math.random() - 0.5) * spread * 2, (Math.random() - 0.5) * spread * 2);
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(dir, this.camera);
    this.raycaster.far = far;
    const hit = this.raycaster.intersectObjects(this.raycastTargets(), true)[0];
    if (hit) {
      let o = hit.object;
      while (o && !o.userData.zombie) o = o.parent === null ? null : o.parent;
      if (o) this.onHit(o.userData.zombie, hit.object.userData.head === true && !isKnife, damage, hit.point, isKnife);
    }
  }

  stab() {
    if (this.knifeTime > 0 || this.reloading) return;
    this.knifeTime = KNIFE.cooldown;
    sfx.knife();
    this.#shoot(0, KNIFE.range, KNIFE.damage, true);
  }

  update(dt, firing) {
    this.cooldown -= dt;
    this.knifeTime = Math.max(0, this.knifeTime - dt);
    this.swap = Math.max(0, (this.swap ?? 0) - dt);
    const s = this.gun;

    if (this.reloading) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        this.reloading = 0;
        const n = Math.min(s.maxMag - s.mag, s.reserve);
        s.mag += n;
        s.reserve -= n;
        this.onChange(this.gun);
      }
    }

    const wantsShot = firing && (s.def.auto || !this.triggerHeld);
    this.triggerHeld = firing;
    if (wantsShot && this.cooldown <= 0 && !this.reloading && this.knifeTime <= 0.2 && this.swap <= 0) {
      if (s.mag <= 0) {
        sfx.empty();
        this.cooldown = 0.25;
        if (s.reserve > 0) this.reload();
      } else {
        s.mag--;
        this.cooldown = s.def.fireDelay;
        sfx[s.def.sound]();
        this.recoil = Math.min(this.recoil + 1, 1.5);
        this.flash.visible = true;
        this.flash.material.rotation = Math.random() * Math.PI;
        this.flashLight.intensity = 6;
        this.#shoot(s.def.spread * (1 + this.recoil * 0.5), 200, s.damage);
        if (s.mag === 0 && s.reserve > 0) setTimeout(() => this.reload(), 200);
        this.onChange(this.gun);
      }
    }

    // Animation de l'arme
    this.recoil = Math.max(0, this.recoil - dt * 6);
    if (this.cooldown < s.def.fireDelay - 0.04) {
      this.flash.visible = false;
      this.flashLight.intensity = 0;
    }
    const reloadPhase = this.reloading ? Math.sin((1 - this.reloading / s.def.reloadTime) * Math.PI) : 0;
    this.holder.position.z = -0.5 + this.recoil * 0.05;
    this.holder.position.y = -0.2 - reloadPhase * 0.25 - this.swap * 0.8;
    this.holder.rotation.x = this.recoil * 0.12 - reloadPhase * 0.6;

    const k = this.knifeTime > 0 ? 1 - this.knifeTime / KNIFE.cooldown : 1;
    this.knife.visible = k < 1;
    this.knife.rotation.y = -1.2 + k * 2.2;
    this.knife.position.x = 0.15 - k * 0.5;
  }
}
