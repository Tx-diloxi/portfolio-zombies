import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function noise(ctx, w, h, amount, alpha) {
  for (let i = 0; i < amount; i++) {
    const v = Math.random() * 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
}

function stains(ctx, w, h, count, color) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 10 + Math.random() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function toTexture(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function floorTexture() {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#4a4339';
  ctx.fillRect(0, 0, 256, 256);
  // Carrelage
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const v = 60 + Math.random() * 20;
      ctx.fillStyle = `rgb(${v + 10},${v + 4},${v - 6})`;
      ctx.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    }
  noise(ctx, 256, 256, 4000, 0.08);
  stains(ctx, 256, 256, 6, 'rgba(20,12,6,0.5)');
  stains(ctx, 256, 256, 2, 'rgba(90,0,0,0.45)');
  return toTexture(c, 5, 5);
}

export function wallTexture() {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#5b5446';
  ctx.fillRect(0, 0, 256, 256);
  // Briques
  ctx.strokeStyle = 'rgba(25,20,15,0.6)';
  ctx.lineWidth = 3;
  for (let y = 0; y < 8; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * 32);
    ctx.lineTo(256, y * 32);
    ctx.stroke();
    for (let x = 0; x < 4; x++) {
      const ox = (y % 2) * 32 + x * 64;
      ctx.beginPath();
      ctx.moveTo(ox, y * 32);
      ctx.lineTo(ox, y * 32 + 32);
      ctx.stroke();
    }
  }
  noise(ctx, 256, 256, 5000, 0.07);
  stains(ctx, 256, 256, 8, 'rgba(15,12,8,0.55)');
  // Bas du mur sale
  const g = ctx.createLinearGradient(0, 180, 0, 256);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,6,2,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return toTexture(c);
}

export function woodTexture() {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#4a2f17' : '#6a4524';
    ctx.fillRect(0, i * 21, 128, 20);
  }
  noise(ctx, 128, 128, 1500, 0.1);
  return toTexture(c);
}

// Texture de texte (panneaux, coûts, titres).
export function textTexture(lines, { width = 512, height = 256, bg = 'rgba(0,0,0,0)', color = '#e9e1cf', font = 'Special Elite', sizes = [] } = {}) {
  const [c, ctx] = canvas(width, height);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const total = lines.reduce((s, _, i) => s + (sizes[i] ?? 40) * 1.25, 0);
  let y = height / 2 - total / 2;
  lines.forEach((line, i) => {
    const size = sizes[i] ?? 40;
    const f = Array.isArray(font) ? font[i] ?? font[0] : font;
    ctx.font = `${size}px "${f}"`;
    ctx.fillStyle = Array.isArray(color) ? color[i] ?? color[0] : color;
    let text = line;
    while (ctx.measureText(text).width > width - 24 && text.length > 4) text = text.slice(0, -2);
    if (text !== line) text = text.slice(0, -1) + '…';
    y += size * 0.625;
    ctx.fillText(text, width / 2, y);
    y += size * 0.625;
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
