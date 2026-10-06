import * as THREE from 'three';
import { textTexture, woodTexture } from './textures.js';

// Accessoires interactifs placés contre les murs. Chaque fonction reçoit un "slot"
// { x, z, rotY } dont l'axe local +Z pointe vers le centre de la salle.

const BEAM_COLORS = { trace: 0x3fd0ff, competence: 0xff3030, profil: 0xffc040, bilan: 0xb060ff };

function wrap(text, max = 22, maxLines = 3) {
  const words = String(text).split(/\s+/);
  const lines = [''];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + ' ' + w).trim().length > max && cur) lines.push(w);
    else lines[lines.length - 1] = (cur + ' ' + w).trim();
  }
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] += '…';
  }
  return lines;
}

function place(group, scene, slot) {
  group.position.set(slot.x, 0, slot.z);
  group.rotation.y = slot.rotY;
  scene.add(group);
  return group;
}

function beam(color) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.7, 4, 16, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  m.position.y = 2;
  m.userData.beam = true;
  return m;
}

// Terminal (bureau + écran cathodique) qui affiche une trace / une fiche.
export function terminal(scene, slot, { kind, label, title }) {
  const g = new THREE.Group();
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 0.9), new THREE.MeshLambertMaterial({ map: woodTexture() }));
  desk.position.set(0, 0.425, 0);
  g.add(desk);

  const crt = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.7), new THREE.MeshLambertMaterial({ color: 0xc9bfa5 }));
  crt.position.set(0, 1.25, -0.05);
  g.add(crt);

  const color = BEAM_COLORS[kind];
  const css = `#${color.toString(16).padStart(6, '0')}`;
  const lines = [label, ...wrap(title)];
  const tex = textTexture(lines, {
    width: 512, height: 384, bg: '#050a08', color: [css, '#d8ffe8'], font: ['Oswald', 'Special Elite'], sizes: [44, ...lines.slice(1).map(() => 38)],
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.57), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.set(0, 1.27, 0.31);
  g.add(screen);
  g.add(beam(color));
  return place(g, scene, slot);
}

// Arme dessinée à la craie sur le mur (achat d'arme / munitions).
export function wallBuy(scene, slot, { name, cost, ammoCost }) {
  const g = new THREE.Group();
  const tex = textTexture([name, cost ? `Arme : ${cost}` : 'Arme de départ', `Munitions : ${ammoCost}`], {
    width: 512, height: 256, bg: 'rgba(0,0,0,0)', color: ['#ffffff', '#d9a441', '#d9a441'], font: ['Creepster', 'Oswald', 'Oswald'], sizes: [84, 36, 36],
  });
  const chalk = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  chalk.position.set(0, 1.7, -0.58);
  g.add(chalk);
  // Silhouette de l'arme
  const gun = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  gun.position.set(0, 1.15, -0.58);
  g.add(gun);
  return place(g, scene, slot);
}

// Distributeur de perk (façon Juggernog).
export function perkMachine(scene, slot, { name, cost, color }) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.9), new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.25 }));
  body.position.set(0, 1.2, -0.2);
  g.add(body);
  const tex = textTexture([name, `${cost}`], {
    width: 512, height: 256, bg: '#1a0000', color: ['#ffdddd', '#d9a441'], font: ['Creepster', 'Oswald'], sizes: [80, 44],
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(0, 1.9, 0.26);
  g.add(sign);
  const light = new THREE.PointLight(color, 6, 6, 1.5);
  light.position.set(0, 2, 1);
  g.add(light);
  return place(g, scene, slot);
}

// Machine Pack-a-Punch.
export function packAPunch(scene, slot, { cost }) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.2), new THREE.MeshLambertMaterial({ color: 0x2a2433 }));
  base.position.set(0, 0.6, -0.1);
  g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1), new THREE.MeshLambertMaterial({ color: 0x40305a, emissive: 0x6020c0, emissiveIntensity: 0.6 }));
  top.position.set(0, 1.5, -0.1);
  g.add(top);
  const tex = textTexture(['Pack-a-Punch', `${cost}`], {
    width: 512, height: 192, bg: '#0d0614', color: ['#d6b0ff', '#d9a441'], font: ['Creepster', 'Oswald'], sizes: [64, 40],
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.52), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(0, 0.75, 0.51);
  g.add(sign);
  g.add(beam(BEAM_COLORS.bilan));
  const light = new THREE.PointLight(0x9040ff, 8, 7, 1.5);
  light.position.set(0, 2.2, 1);
  g.add(light);
  return place(g, scene, slot);
}
