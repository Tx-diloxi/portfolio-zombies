import * as THREE from 'three';

// Petites projections de sang (pool de cubes réutilisés).
export class Particles {
  constructor(scene, size = 120) {
    const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8a0000 });
    this.pool = Array.from({ length: size }, () => {
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.userData.vel = new THREE.Vector3();
      m.userData.life = 0;
      scene.add(m);
      return m;
    });
    this.next = 0;
  }

  burst(point, count = 8) {
    for (let i = 0; i < count; i++) {
      const m = this.pool[this.next];
      this.next = (this.next + 1) % this.pool.length;
      m.position.copy(point);
      m.userData.vel.set((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3);
      m.userData.life = 0.5 + Math.random() * 0.3;
      m.visible = true;
    }
  }

  update(dt) {
    for (const m of this.pool) {
      if (!m.visible) continue;
      const u = m.userData;
      u.life -= dt;
      u.vel.y -= 9.8 * dt;
      m.position.addScaledVector(u.vel, dt);
      if (m.position.y < 0.02) {
        m.position.y = 0.02;
        u.vel.set(0, 0, 0);
      }
      if (u.life <= 0) m.visible = false;
    }
  }
}
