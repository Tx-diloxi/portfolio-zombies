import * as THREE from 'three';

const RADIUS = 0.35;
const ATTACK_RANGE = 1.25;
const ATTACK_COOLDOWN = 1.1;

const SKINS = [0x6f7d55, 0x7d8a63, 0x5f6b4a, 0x8a8a6a];
const CLOTHES = [0x3b3f4a, 0x4a3b30, 0x2f3a2c, 0x50463a, 0x5a2a2a];
let mats;

function materials() {
  if (mats) return mats;
  mats = {
    skins: SKINS.map((c) => new THREE.MeshLambertMaterial({ color: c })),
    clothes: CLOTHES.map((c) => new THREE.MeshLambertMaterial({ color: c })),
    pants: new THREE.MeshLambertMaterial({ color: 0x24221f }),
    eyes: new THREE.MeshBasicMaterial({ color: 0xffd23a }),
    blood: new THREE.MeshLambertMaterial({ color: 0x5a0606 }),
  };
  return mats;
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];

function box(parent, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export class Zombie {
  constructor(scene, position, { health, speed }) {
    const M = materials();
    const skin = pick(M.skins);
    const cloth = pick(M.clothes);
    this.scene = scene;
    this.health = health;
    this.speed = speed;
    this.state = 'rising';
    this.timer = 0;
    this.attackCooldown = 0.6;
    this.phase = Math.random() * 10;
    this.position = position.clone();
    this.groanIn = 2 + Math.random() * 6;

    const g = new THREE.Group();
    g.userData.zombie = this;
    this.mesh = g;

    // Jambes (pivot à la hanche)
    this.legs = [-0.13, 0.13].map((x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.9, 0);
      box(pivot, 0.2, 0.9, 0.22, 0, -0.45, 0, M.pants);
      g.add(pivot);
      return pivot;
    });
    const torso = box(g, 0.55, 0.7, 0.3, 0, 1.25, 0, cloth);
    if (Math.random() < 0.6) box(torso, 0.2, 0.25, 0.02, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0.16, M.blood);
    // Bras tendus vers l'avant
    this.arms = [-0.36, 0.36].map((x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.52, 0);
      box(pivot, 0.16, 0.16, 0.65, 0, -0.04, 0.3, cloth);
      box(pivot, 0.13, 0.13, 0.15, 0, -0.04, 0.68, skin);
      g.add(pivot);
      return pivot;
    });
    this.head = new THREE.Group();
    this.head.position.set(0, 1.78, 0.03);
    const head = box(this.head, 0.34, 0.36, 0.34, 0, 0, 0, skin);
    head.userData.head = true;
    for (const x of [-0.08, 0.08]) box(this.head, 0.07, 0.05, 0.02, x, 0.04, 0.175, M.eyes).userData.head = true;
    box(this.head, 0.2, 0.06, 0.02, 0, -0.1, 0.175, M.blood).userData.head = true;
    g.add(this.head);

    this.scale = 0.95 + Math.random() * 0.15;
    g.scale.setScalar(this.scale);
    g.position.copy(this.position);
    g.position.y = -2;
    scene.add(g);
  }

  get targetable() {
    return this.state !== 'dying';
  }

  hit(damage) {
    this.health -= damage;
    this.flinch = 0.12;
    if (this.health <= 0 && this.state !== 'dying') {
      this.state = 'dying';
      this.timer = 0;
      this.fallDir = Math.random() < 0.5 ? 1 : -1;
      return true;
    }
    return false;
  }

  // Retourne false quand le zombie doit être retiré de la scène.
  update(dt, ctx) {
    this.timer += dt;
    const g = this.mesh;

    if (this.state === 'rising') {
      g.position.y = Math.min(0, -2 + this.timer * 1.6);
      g.rotation.z = Math.sin(this.timer * 8) * 0.1;
      if (g.position.y >= 0) {
        this.state = 'walking';
        g.rotation.z = 0;
      }
      return true;
    }

    if (this.state === 'dying') {
      const t = Math.min(1, this.timer / 0.5);
      g.rotation.x = -t * (Math.PI / 2) * 0.95;
      g.position.y = t * 0.15;
      if (this.timer > 2.5) g.position.y -= (this.timer - 2.5) * 0.6;
      if (this.timer > 4) {
        this.scene.remove(g);
        return false;
      }
      return true;
    }

    // Choix de la cible : le joueur, ou la prochaine porte vers sa salle.
    const { player, map, zombies } = ctx;
    const myRoom = map.roomAt(this.position.x, this.position.z);
    const target = map.nextWaypoint(myRoom, ctx.playerRoom) ?? player.position;
    const to = new THREE.Vector3(target.x - this.position.x, 0, target.z - this.position.z);
    const distPlayer = Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z);

    this.flinch = Math.max(0, (this.flinch ?? 0) - dt);
    const slow = this.flinch > 0 ? 0.3 : 1;

    if (distPlayer > ATTACK_RANGE * 0.8) {
      to.normalize().multiplyScalar(this.speed * slow * dt);
      this.position.add(to);
    }
    // Séparation entre zombies
    for (const o of zombies) {
      if (o === this || o.state === 'dying') continue;
      const dx = this.position.x - o.position.x;
      const dz = this.position.z - o.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 0.0001 && d2 < 0.5) {
        const d = Math.sqrt(d2);
        this.position.x += (dx / d) * (0.71 - d) * 0.5;
        this.position.z += (dz / d) * (0.71 - d) * 0.5;
      }
    }
    map.colliders.resolve(this.position, RADIUS);
    g.position.set(this.position.x, 0, this.position.z);

    // Orientation vers la cible (lissée)
    const look = distPlayer < 3 ? player.position : target;
    const yaw = Math.atan2(look.x - this.position.x, look.z - this.position.z);
    let diff = yaw - g.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    g.rotation.y += diff * Math.min(1, dt * 8);

    // Animation de marche
    this.phase += dt * this.speed * 3.2;
    const s = Math.sin(this.phase);
    this.legs[0].rotation.x = s * 0.6;
    this.legs[1].rotation.x = -s * 0.6;
    this.arms[0].rotation.x = -0.15 + Math.sin(this.phase * 0.5) * 0.15;
    this.arms[1].rotation.x = -0.15 - Math.sin(this.phase * 0.5) * 0.15;
    this.head.rotation.z = Math.sin(this.phase * 0.3) * 0.25;
    g.rotation.z = s * 0.05;

    // Attaque
    this.attackCooldown -= dt;
    if (distPlayer < ATTACK_RANGE && this.attackCooldown <= 0) {
      this.attackCooldown = ATTACK_COOLDOWN;
      this.arms.forEach((a) => (a.rotation.x = -0.9));
      ctx.onAttack(this);
    }

    this.groanIn -= dt;
    if (this.groanIn <= 0) {
      this.groanIn = 4 + Math.random() * 8;
      ctx.onGroan(this, distPlayer);
    }
    return true;
  }
}
