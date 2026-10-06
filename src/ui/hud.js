// Interface en surimpression (manche, points, munitions, invites).
const $ = (id) => document.getElementById(id);

const TALLY = ['', 'I', 'II', 'III', 'IIII', 'IIIII'];

export class Hud {
  constructor() {
    this.el = $('hud');
    this.toastTimer = null;
    this.hitTimer = null;
  }

  show(on) {
    this.el.hidden = !on;
  }

  round(n, flash = false) {
    const r = $('round');
    r.textContent = n <= 0 ? '' : n <= 5 ? TALLY[n] : String(n);
    r.classList.toggle('flash', false);
    if (flash) {
      void r.offsetWidth;
      r.classList.add('flash');
    }
  }

  points(total, delta) {
    $('points-value').textContent = total;
    if (!delta) return;
    const s = document.createElement('span');
    s.textContent = delta > 0 ? `+${delta}` : `${delta}`;
    if (delta < 0) s.className = 'neg';
    $('points-pop').append(s);
    setTimeout(() => s.remove(), 900);
  }

  weapon(gun) {
    $('weapon-name').textContent = gun.name;
    $('ammo').innerHTML = `<span class="mag">${gun.mag}</span> <span class="reserve">/ ${gun.reserve}</span>`;
    $('ammo').classList.toggle('low', gun.mag <= Math.ceil(gun.maxMag * 0.25));
  }

  perks(set) {
    const icons = { juggernog: ['🛡', '#c01818'] };
    $('perks').innerHTML = [...set].map((p) => `<span style="background:${icons[p][1]}">${icons[p][0]}</span>`).join('');
  }

  health(ratio) {
    $('damage').style.opacity = String(Math.max(0, 1 - ratio) * 1.1);
  }

  prompt(html) {
    const p = $('prompt');
    if (p.innerHTML !== html) p.innerHTML = html;
  }

  hitmarker(kill) {
    const h = $('hitmarker');
    h.className = `show${kill ? ' kill' : ''}`;
    clearTimeout(this.hitTimer);
    this.hitTimer = setTimeout(() => (h.className = `fade${kill ? ' kill' : ''}`), 60);
  }

  toast(text, ms = 2500) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }
}
