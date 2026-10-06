// Collisions 2D (plan XZ) : cercles contre boîtes alignées sur les axes.
export class Colliders {
  constructor() {
    this.boxes = new Set();
  }

  add(minX, maxX, minZ, maxZ) {
    const box = { minX, maxX, minZ, maxZ };
    this.boxes.add(box);
    return box;
  }

  remove(box) {
    this.boxes.delete(box);
  }

  // Repousse la position (Vector3, modifiée en place) hors de toutes les boîtes.
  resolve(pos, radius) {
    for (const b of this.boxes) {
      const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x += (dx / d) * (radius - d);
        pos.z += (dz / d) * (radius - d);
      } else {
        // Centre à l'intérieur : sortie par l'axe de pénétration minimale.
        const pushes = [
          [b.minX - radius - pos.x, 0],
          [b.maxX + radius - pos.x, 0],
          [0, b.minZ - radius - pos.z],
          [0, b.maxZ + radius - pos.z],
        ];
        pushes.sort((a, c) => Math.abs(a[0] + a[1]) - Math.abs(c[0] + c[1]));
        pos.x += pushes[0][0];
        pos.z += pushes[0][1];
      }
    }
  }
}
