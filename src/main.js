import * as THREE from 'three';
import './styles.css';
import data from './content/portfolio.json';
import { GameMap } from './world/map.js';
import { Player } from './player/player.js';
import { WeaponSystem, WEAPONS } from './player/weapon.js';
import { Spawner } from './enemies/spawner.js';
import { Particles } from './systems/particles.js';
import { initAudio, sfx } from './systems/audio.js';
import { Hud } from './ui/hud.js';

const $ = (id) => document.getElementById(id);
const START_POINTS = 500;
const ZOMBIE_DAMAGE = 40;
const PERK_COSTS = { juggernog: 2500 };

const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } },
};

class Game {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.autoClear = false;

    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 200);
    // Passe séparée pour l'arme en main : elle ne traverse jamais les murs.
    this.viewScene = new THREE.Scene();
    this.viewCamera = new THREE.PerspectiveCamera(65, 1, 0.01, 10);
    this.viewScene.add(this.viewCamera);
    this.viewScene.add(new THREE.HemisphereLight(0xfff0e0, 0x302010, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(1, 2, 1);
    this.viewScene.add(key);

    this.hud = new Hud();
    this.state = 'title';
    this.last = performance.now();

    this.player = new Player(this.camera, document.body, null);
    this.player.sensitivity = Number(storage.get('sensitivity') ?? 1);
    $('sensitivity').value = this.player.controls.pointerSpeed;

    this.weapons = new WeaponSystem(this.camera, this.viewCamera, {
      raycastTargets: () => this.#raycastTargets(),
      onHit: (...a) => this.#onHit(...a),
      onChange: (gun) => this.hud.weapon(gun),
    });

    this.#buildWorld();
    this.#bindUi();
    this.#resize();
    addEventListener('resize', () => this.#resize());
    this.renderer.setAnimationLoop(() => this.#frame());
  }

  // ---------- Monde ----------
  #buildWorld() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0605);
    this.scene.fog = new THREE.Fog(0x0a0605, 8, 40);
    this.scene.add(this.camera);

    this.map = new GameMap(this.scene, data);
    this.player.colliders = this.map.colliders;
    this.player.reset();
    this.weapons.reset();
    this.particles = new Particles(this.scene);
    this.spawner = new Spawner(this.scene, this.map, {
      onRoundStart: (n) => {
        this.hud.round(n, true);
        sfx.roundStart();
      },
      onRoundEnd: () => sfx.roundEnd(),
    });
    this.points = START_POINTS;
    this.kills = 0;
    this.hud.points(this.points);
    this.hud.round(0);
    this.hud.perks(this.player.perks);
    this.hud.health(1);
  }

  #start(explore) {
    initAudio();
    if (this.started) this.#buildWorld();
    if (explore) {
      this.#openAllDoors();
      this.#setPeaceful(true);
    } else {
      this.#setPeaceful(false);
    }
    this.#lock();
  }

  #openAllDoors() {
    for (const d of this.map.doors) if (!d.isOpen) this.map.openDoor(d);
  }

  #setPeaceful(on) {
    this.spawner.setPeaceful(on);
    $('btn-peace').textContent = `Zombies : ${on ? 'désactivés' : 'activés'}`;
    if (on) this.hud.round(0);
  }

  // ---------- Écrans / pointer lock ----------
  #screen(name) {
    for (const id of ['title-screen', 'pause-screen', 'dead-screen', 'panel', 'loading']) $(id).hidden = id !== name;
    this.hud.show(name === null || name === 'panel');
  }

  #lock() {
    // Appel direct pour pouvoir intercepter le refus (ex. relock trop rapide après Échap).
    const req = document.body.requestPointerLock();
    req?.catch?.(() => this.#lockFailed());
  }

  #lockFailed() {
    if (this.state === 'playing') return;
    this.state = 'paused';
    this.#screen('pause-screen');
  }

  #bindUi() {
    const controls = this.player.controls;
    controls.addEventListener('lock', () => {
      this.state = 'playing';
      this.started = true;
      this.#screen(null);
      this.last = performance.now();
    });
    controls.addEventListener('unlock', () => {
      this.player.firing = false;
      if (this.state === 'playing') {
        this.state = 'paused';
        this.#screen('pause-screen');
      }
    });
    document.addEventListener('pointerlockerror', () => this.#lockFailed());

    $('btn-play').onclick = () => this.#start(false);
    $('btn-explore').onclick = () => this.#start(true);
    $('btn-resume').onclick = () => this.#lock();
    $('btn-restart').onclick = () => this.#start(false);
    $('btn-retry').onclick = () => this.#start(false);
    $('btn-open-all').onclick = () => {
      this.#openAllDoors();
      this.#lock();
    };
    $('btn-peace').onclick = () => this.#setPeaceful(!this.spawner.peaceful);
    $('btn-panel-close').onclick = () => this.#closePanel();
    $('sensitivity').oninput = (e) => {
      this.player.sensitivity = Number(e.target.value);
      storage.set('sensitivity', e.target.value);
    };

    addEventListener('keydown', (e) => {
      if (this.state === 'panel' && (e.code === 'KeyF' || e.code === 'Escape')) return this.#closePanel();
      if (this.state !== 'playing' || e.repeat) return;
      if (e.code === 'KeyF' || e.code === 'KeyE') this.#interact();
      if (e.code === 'KeyR') this.weapons.reload();
      if (e.code === 'KeyV') this.weapons.stab();
      if (e.code === 'Digit1') this.weapons.select(0);
      if (e.code === 'Digit2') this.weapons.select(1);
    });
    addEventListener('wheel', (e) => this.state === 'playing' && this.weapons.cycle(Math.sign(e.deltaY)));
    $('title-name').textContent = data.profil.nom;
  }

  #openPanel(html) {
    this.state = 'panel';
    $('panel-content').innerHTML = html;
    this.#screen('panel');
    this.player.controls.unlock();
    sfx.read();
  }

  #closePanel() {
    this.#lock();
  }

  #die() {
    this.state = 'dead';
    this.player.controls.unlock();
    const r = this.spawner.round;
    $('dead-stats').textContent = this.spawner.peaceful
      ? ''
      : `Vous avez survécu ${r} manche${r > 1 ? 's' : ''} · ${this.kills} zombie${this.kills > 1 ? 's' : ''} éliminé${this.kills > 1 ? 's' : ''}`;
    this.#screen('dead-screen');
  }

  // ---------- Points ----------
  #earn(n) {
    this.points += n;
    this.hud.points(this.points, n);
  }

  #spend(n) {
    if (this.points < n) {
      sfx.denied();
      return false;
    }
    this.points -= n;
    this.hud.points(this.points, -n);
    sfx.purchase();
    return true;
  }

  // ---------- Combat ----------
  #raycastTargets() {
    return [
      ...this.spawner.zombies.filter((z) => z.targetable).map((z) => z.mesh),
      ...this.map.wallMeshes,
      ...this.map.doors.filter((d) => !d.isOpen).map((d) => d.mesh),
    ];
  }

  #onHit(zombie, head, damage, point, knife) {
    if (!zombie.targetable) return;
    const killed = zombie.hit(head ? damage * 2.5 : damage);
    this.particles.burst(point, head ? 14 : 8);
    sfx.hit();
    this.hud.hitmarker(killed);
    if (killed) {
      this.kills++;
      this.#earn(knife ? 130 : head ? 100 : 60);
    } else {
      this.#earn(10);
    }
  }

  // ---------- Interactions ----------
  #nearest() {
    const p = this.player.position;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    let best = null;
    let bestD = Infinity;
    for (const it of this.map.interactables) {
      if (it.type === 'door' && it.door.isOpen) continue;
      const dx = it.position.x - p.x;
      const dz = it.position.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > it.radius || d >= bestD) continue;
      if ((dx * dir.x + dz * dir.z) / (d || 1) < 0.3) continue;
      best = it;
      bestD = d;
    }
    return best;
  }

  #promptFor(it) {
    if (!it) return '';
    const cost = (n) => `<span class="${this.points >= n ? 'cost' : 'nope'}">[${n}]</span>`;
    const w = this.weapons;
    switch (it.type) {
      case 'door':
        return `<kbd>F</kbd> Dégager la barricade ${cost(it.door.cost)}`;
      case 'station':
        return `<kbd>F</kbd> Consulter : ${it.label}`;
      case 'wallbuy': {
        const def = WEAPONS[it.weapon];
        return w.has(it.weapon) ? `<kbd>F</kbd> Munitions ${def.name} ${cost(def.ammoCost)}` : `<kbd>F</kbd> Acheter ${def.name} ${cost(def.cost)}`;
      }
      case 'perk':
        return this.player.perks.has(it.perk) ? '' : `<kbd>F</kbd> Boire Juggernog ${cost(it.cost)}`;
      case 'pap':
        return w.gun.upgraded ? 'Arme déjà améliorée' : `<kbd>F</kbd> Améliorer ${w.gun.name} ${cost(it.cost)}`;
    }
    return '';
  }

  #interact() {
    const it = this.#nearest();
    if (!it) return;
    const w = this.weapons;
    switch (it.type) {
      case 'door':
        if (this.#spend(it.door.cost)) {
          this.map.openDoor(it.door);
          sfx.door();
        }
        break;
      case 'station':
        this.#openPanel(it.html);
        break;
      case 'wallbuy': {
        const def = WEAPONS[it.weapon];
        if (w.has(it.weapon)) {
          if (this.#spend(def.ammoCost)) w.refill(it.weapon);
        } else if (this.#spend(def.cost)) w.give(it.weapon);
        break;
      }
      case 'perk':
        if (!this.player.perks.has(it.perk) && this.#spend(PERK_COSTS[it.perk])) {
          this.player.addPerk(it.perk);
          this.hud.perks(this.player.perks);
          sfx.perk();
        }
        break;
      case 'pap':
        if (!w.gun.upgraded && this.#spend(it.cost)) {
          w.upgradeCurrent();
          sfx.perk();
          this.hud.toast(w.gun.name);
        }
        break;
    }
  }

  // ---------- Boucle ----------
  #frame() {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    if (this.state === 'playing') this.update(dt);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.viewScene, this.viewCamera);
  }

  update(dt) {
    this.player.update(dt);
    this.weapons.update(dt, this.player.firing);
    this.map.update(dt);
    this.particles.update(dt);
    this.spawner.update(dt, {
      player: this.player,
      map: this.map,
      playerRoom: this.map.roomAt(this.player.position.x, this.player.position.z),
      onAttack: () => {
        this.player.damage(ZOMBIE_DAMAGE);
        sfx.hurt();
      },
      onGroan: (_, dist) => sfx.groan(Math.max(0, 1 - dist / 25)),
    });
    this.hud.health(this.player.health / this.player.maxHealth);
    this.hud.prompt(this.#promptFor(this.#nearest()));
    if (!this.player.alive) this.#die();
  }

  #resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.renderer.setSize(w, h);
    for (const c of [this.camera, this.viewCamera]) {
      c.aspect = w / h;
      c.updateProjectionMatrix();
    }
  }
}

// Attendre les polices (utilisées dans les textures des panneaux 3D) avant de construire le monde.
const fonts = ['Creepster', 'Special Elite', 'Oswald'].map((f) => document.fonts.load(`40px "${f}"`));
await Promise.race([Promise.allSettled(fonts), new Promise((r) => setTimeout(r, 3000))]);
const game = new Game();
if (import.meta.env.DEV) window.game = game; // débogage
$('loading').hidden = true;
