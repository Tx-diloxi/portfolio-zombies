import { Zombie } from './zombie.js';

const MAX_ALIVE = 24;
const BREAK_TIME = 8;

// Gestion des manches façon COD Zombies.
export class Spawner {
  constructor(scene, map, { onRoundStart, onRoundEnd }) {
    this.scene = scene;
    this.map = map;
    this.onRoundStart = onRoundStart;
    this.onRoundEnd = onRoundEnd;
    this.zombies = [];
    this.reset();
  }

  reset() {
    for (const z of this.zombies) this.scene.remove(z.mesh);
    this.zombies = [];
    this.round = 0;
    this.toSpawn = 0;
    this.spawnTimer = 0;
    this.breakTimer = 3;
    this.peaceful = false;
  }

  setPeaceful(on) {
    this.peaceful = on;
    if (on) {
      for (const z of this.zombies) this.scene.remove(z.mesh);
      this.zombies = [];
      this.toSpawn = 0;
    } else {
      this.breakTimer = 3;
    }
  }

  get alive() {
    return this.zombies.filter((z) => z.state !== 'dying').length;
  }

  #startRound() {
    this.round++;
    this.toSpawn = Math.min(6 + this.round * 2, 60);
    this.health = Math.round(100 + 60 * (this.round - 1) * (this.round > 9 ? 1.4 : 1));
    this.speedMin = Math.min(1.3 + this.round * 0.25, 4.2);
    this.onRoundStart(this.round);
  }

  #spawn(player) {
    const points = this.map.rooms
      .filter((r) => r.open)
      .flatMap((r) => r.spawns)
      .map((p) => ({ p, d: p.distanceTo(player.position) }))
      .filter(({ d }) => d > 5)
      .sort((a, b) => a.d - b.d)
      .slice(0, 4);
    if (!points.length) return;
    const { p } = points[Math.floor(Math.random() * points.length)];
    const speed = this.speedMin + Math.random() * 0.8;
    this.zombies.push(new Zombie(this.scene, p, { health: this.health, speed }));
    this.toSpawn--;
  }

  update(dt, ctx) {
    this.zombies = this.zombies.filter((z) => z.update(dt, { ...ctx, zombies: this.zombies }));
    if (this.peaceful) return;

    if (this.toSpawn === 0 && this.alive === 0) {
      if (this.round > 0 && this.breakTimer === BREAK_TIME) this.onRoundEnd(this.round);
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) {
        this.breakTimer = BREAK_TIME;
        this.#startRound();
      }
      return;
    }

    this.spawnTimer -= dt;
    if (this.toSpawn > 0 && this.spawnTimer <= 0 && this.alive < MAX_ALIVE) {
      this.spawnTimer = Math.max(0.4, 2.2 - this.round * 0.15);
      this.#spawn(ctx.player);
    }
  }
}
