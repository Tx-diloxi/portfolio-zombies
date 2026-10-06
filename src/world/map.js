import * as THREE from 'three';
import { Colliders } from '../systems/collision.js';
import { floorTexture, wallTexture, textTexture } from './textures.js';
import { Door, DOOR_W } from './door.js';
import { terminal, wallBuy, perkMachine, packAPunch } from './props.js';
import { WEAPONS } from '../player/weapon.js';
import { renderProfil, renderCompetence, renderTrace, renderBilan } from '../content/render.js';

export const ROOM = 20; // taille d'une salle (m)
const WALL_H = 4.2;
const WALL_T = 0.6;
const SLOT_INSET = WALL_T / 2 + 0.6;

// Grille des salles :      C4  C3  C2
//                          C5  SP  C1
//                          C6  FIN
const LAYOUT = [
  [0, 0], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1],
];
const DOOR_COSTS = [750, 1000, 1250, 1500, 1750, 2000, 2500];
const LIGHT_COLORS = [0xffb070, 0xff6a50, 0x9fc4ff, 0xffd27a, 0x8cff9c, 0xff8a3c, 0xc4a0ff, 0xd070ff];

const SIDES = [
  { dx: 0, dz: -1, rotY: 0 },            // nord
  { dx: 1, dz: 0, rotY: -Math.PI / 2 },  // est
  { dx: 0, dz: 1, rotY: Math.PI },       // sud
  { dx: -1, dz: 0, rotY: Math.PI / 2 },  // ouest
];

export class GameMap {
  constructor(scene, data) {
    this.scene = scene;
    this.colliders = new Colliders();
    this.doors = [];
    this.interactables = [];
    this.lights = [];
    this.wallMeshes = [];

    this.rooms = LAYOUT.map(([gx, gz], i) => ({
      index: i, gx, gz, cx: gx * ROOM, cz: gz * ROOM, open: i === 0, slotsUsed: 0,
    }));
    this.#describeRooms(data);
    this.#buildShell();
    this.#buildWalls();
    this.#buildRooms();
  }

  #describeRooms(data) {
    const [spawn, ...rest] = this.rooms;
    const final = rest.pop();
    spawn.title = ["Bureau de", "l'alternant"];
    spawn.items = [
      { type: 'station', kind: 'profil', label: 'PROFIL', title: data.profil.nom, html: renderProfil(data) },
      { type: 'wallbuy', weapon: 'm1911' },
      { type: 'station', kind: 'profil', label: 'ALTERNANCE', title: data.alternance.entreprise, html: renderProfil(data) },
    ];
    data.competences.forEach((c, i) => {
      const room = rest[i];
      if (!room) return;
      room.title = [`Compétence ${c.id}`, c.nom + (c.evaluee ? '' : ' *')];
      room.items = [
        { type: 'station', kind: 'competence', label: `COMPÉTENCE ${c.id}`, title: c.nom, html: renderCompetence(c) },
        ...c.traces.map((t, j) => ({ type: 'station', kind: 'trace', label: `TRACE ${c.id}.${j + 1}`, title: t.titre, html: renderTrace(t, c) })),
      ];
      if (i === 0) room.items.push({ type: 'wallbuy', weapon: 'mp40' });
      if (i === 2) room.items.push({ type: 'perk', perk: 'juggernog', cost: 2500 });
    });
    final.title = ['Pack-a-Punch', 'Bilan'];
    final.items = [
      { type: 'station', kind: 'bilan', label: 'BILAN', title: data.bilan.titre, html: renderBilan(data) },
      { type: 'pap', cost: 5000 },
    ];
  }

  #buildShell() {
    const xs = this.rooms.map((r) => r.cx);
    const zs = this.rooms.map((r) => r.cz);
    const w = Math.max(...xs) - Math.min(...xs) + ROOM;
    const d = Math.max(...zs) - Math.min(...zs) + ROOM;
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cz = (Math.max(...zs) + Math.min(...zs)) / 2;

    const floorTex = floorTexture();
    floorTex.repeat.set(w / 4, d / 4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ color: 0x1a1612 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(cx, WALL_H, cz);
    this.scene.add(ceiling);
  }

  #wall(x, z, sx, sz, y = WALL_H / 2, sy = WALL_H) {
    this.wallMat ??= new THREE.MeshLambertMaterial({ map: wallTexture() });
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    // Répète la texture selon la longueur du mur
    const len = Math.max(sx, sz);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (len / 4), uv.getY(i) * (sy / 4));
    const m = new THREE.Mesh(geo, this.wallMat);
    m.position.set(x, y, z);
    this.scene.add(m);
    this.wallMeshes.push(m);
    if (sy === WALL_H) this.colliders.add(x - sx / 2, x + sx / 2, z - sz / 2, z + sz / 2);
  }

  #buildWalls() {
    const at = new Map(this.rooms.map((r) => [`${r.gx},${r.gz}`, r]));
    const links = new Map();
    for (let i = 0; i < this.rooms.length - 1; i++) {
      const a = this.rooms[i];
      const b = this.rooms[i + 1];
      links.set([a.index, b.index].sort().join('-'), DOOR_COSTS[i]);
    }

    const done = new Set();
    for (const r of this.rooms) {
      for (const s of SIDES) {
        const n = at.get(`${r.gx + s.dx},${r.gz + s.dz}`);
        const key = n ? [r.index, n.index].sort().join('-') : `${r.index}:${s.dx},${s.dz}`;
        if (done.has(key)) continue;
        done.add(key);

        const horizontal = s.dz !== 0; // mur orienté selon X
        const ex = r.cx + (s.dx * ROOM) / 2;
        const ez = r.cz + (s.dz * ROOM) / 2;
        const cost = n ? links.get(key) : undefined;
        const L = ROOM + WALL_T;

        if (cost === undefined) {
          horizontal ? this.#wall(ex, ez, L, WALL_T) : this.#wall(ex, ez, WALL_T, L);
          continue;
        }
        // Mur avec ouverture centrale + linteau
        const seg = (L - DOOR_W) / 2;
        const off = DOOR_W / 2 + seg / 2;
        if (horizontal) {
          this.#wall(ex - off, ez, seg, WALL_T);
          this.#wall(ex + off, ez, seg, WALL_T);
          this.#wall(ex, ez, DOOR_W, WALL_T, 3.6, 1.2);
        } else {
          this.#wall(ex, ez - off, WALL_T, seg);
          this.#wall(ex, ez + off, WALL_T, seg);
          this.#wall(ex, ez, WALL_T, DOOR_W, 3.6, 1.2);
        }
        const door = new Door(this.scene, this.colliders, { x: ex, z: ez, horizontal, cost, rooms: [r.index, n.index] });
        this.doors.push(door);
        this.interactables.push({ type: 'door', door, position: door.position, radius: 2.6 });
      }
    }
  }

  #slot(room) {
    // 8 emplacements : 2 par mur, de part et d'autre de la porte centrale
    const i = room.slotsUsed++;
    const side = SIDES[i % 4];
    const offset = i < 4 ? -5.5 : 5.5;
    const d = ROOM / 2 - SLOT_INSET;
    const x = room.cx + side.dx * d + (side.dz !== 0 ? offset : 0);
    const z = room.cz + side.dz * d + (side.dx !== 0 ? offset : 0);
    return { x, z, rotY: side.rotY, horizontal: side.dz !== 0 };
  }

  #propCollider(slot, hx, hz) {
    const [ax, az] = slot.horizontal ? [hx, hz] : [hz, hx];
    this.colliders.add(slot.x - ax, slot.x + ax, slot.z - az, slot.z + az);
  }

  #buildRooms() {
    this.scene.add(new THREE.HemisphereLight(0x8a7a6a, 0x1a1008, 0.6));

    for (const room of this.rooms) {
      // Éclairage
      const color = LIGHT_COLORS[room.index % LIGHT_COLORS.length];
      const light = new THREE.PointLight(color, 60, 32, 1.4);
      light.position.set(room.cx, WALL_H - 0.5, room.cz);
      this.scene.add(light);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({ color }));
      bulb.position.copy(light.position);
      this.scene.add(bulb);
      this.lights.push({ light, bulb, base: 60, flicker: room.index % 3 === 1, t: Math.random() * 10 });

      // Panneau suspendu à 4 faces avec le nom de la salle
      const tex = textTexture(room.title, {
        width: 512, height: 160, bg: 'rgba(15,5,5,0.9)', color: ['#a39b8b', '#e3242b'], font: ['Oswald', 'Creepster'], sizes: [34, 64],
      });
      const signMat = new THREE.MeshBasicMaterial({ map: tex });
      for (let k = 0; k < 4; k++) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1), signMat);
        const a = (k * Math.PI) / 2;
        p.position.set(room.cx + Math.sin(a) * 1.6, 3.2, room.cz + Math.cos(a) * 1.6);
        p.rotation.y = a;
        this.scene.add(p);
      }

      // Points d'apparition des zombies (coins)
      room.spawns = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(
        ([sx, sz]) => new THREE.Vector3(room.cx + sx * 8, 0, room.cz + sz * 8),
      );

      for (const item of room.items) this.#buildItem(room, item);
    }
  }

  #buildItem(room, item) {
    const slot = this.#slot(room);
    const position = new THREE.Vector3(slot.x, 1, slot.z);
    switch (item.type) {
      case 'station':
        terminal(this.scene, slot, item);
        this.#propCollider(slot, 0.9, 0.45);
        break;
      case 'wallbuy':
        wallBuy(this.scene, slot, WEAPONS[item.weapon]);
        break;
      case 'perk':
        perkMachine(this.scene, slot, { name: 'Juggernog', cost: item.cost, color: 0xc01818 });
        this.#propCollider(slot, 0.65, 0.65);
        break;
      case 'pap':
        packAPunch(this.scene, slot, { cost: item.cost });
        this.#propCollider(slot, 0.9, 0.7);
        break;
    }
    this.interactables.push({ ...item, room: room.index, position, radius: 2.3 });
  }

  roomAt(x, z) {
    const gx = Math.round(x / ROOM);
    const gz = Math.round(z / ROOM);
    const r = this.rooms.find((room) => room.gx === gx && room.gz === gz);
    return r ? r.index : -1;
  }

  openDoor(door) {
    door.open();
    for (const i of door.rooms) this.rooms[i].open = true;
  }

  // Prochain point de passage pour aller de la salle "from" à la salle "to" (BFS par portes ouvertes).
  nextWaypoint(from, to) {
    if (from === to || from < 0 || to < 0) return null;
    const prev = new Map([[from, null]]);
    const queue = [from];
    while (queue.length) {
      const cur = queue.shift();
      if (cur === to) break;
      for (const d of this.doors) {
        if (!d.isOpen || !d.rooms.includes(cur)) continue;
        const next = d.rooms[0] === cur ? d.rooms[1] : d.rooms[0];
        if (prev.has(next)) continue;
        prev.set(next, { room: cur, door: d });
        queue.push(next);
      }
    }
    if (!prev.has(to)) return null;
    let step = to;
    while (prev.get(step).room !== from) step = prev.get(step).room;
    const door = prev.get(step).door;
    // Vise un point légèrement au-delà de la porte pour la franchir franchement
    const target = this.rooms[step];
    const p = door.position.clone();
    p.x += Math.sign(target.cx - p.x) * 1.5;
    p.z += Math.sign(target.cz - p.z) * 1.5;
    p.y = 0;
    return p;
  }

  update(dt) {
    for (const d of this.doors) d.update(dt);
    for (const l of this.lights) {
      if (!l.flicker) continue;
      l.t += dt;
      const off = Math.sin(l.t * 13) > 0.97 || Math.random() < 0.02;
      l.light.intensity = off ? l.base * 0.15 : l.base;
      l.bulb.visible = !off;
    }
  }
}
