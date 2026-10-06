// Rendu HTML du contenu du portfolio, partagé entre le jeu (panneaux) et le mode lecture.

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Liens http(s), mailto ou chemins relatifs (ex. "cv.pdf" dans public/).
const safeUrl = (url = '') => (/^\s*(javascript|data|vbscript):/i.test(url) ? '#' : esc(url));

const list = (items = []) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');

const links = (items = []) =>
  items.length
    ? `<p class="links">${items
        .map((l) => `<a href="${safeUrl(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
        .join('')}</p>`
    : '';

export function renderProfil({ profil, alternance }) {
  return `
    <h2>${esc(profil.nom)}</h2>
    <p class="meta">${esc(profil.formation)} · ${esc(profil.etablissement)} · ${esc(profil.rythme)}</p>
    <p class="meta">${esc(profil.parcours)}</p>
    <p>${esc(profil.presentation)}</p>
    <h3>Alternance — ${esc(alternance.entreprise)}</h3>
    <p class="meta">${esc(alternance.poste)} · ${esc(alternance.periode)} · ${esc(alternance.rythme)}</p>
    <p>${esc(alternance.description)}</p>
    <h4>Missions</h4>${list(alternance.missions)}
    <h4>Technologies</h4>
    <p class="tags">${alternance.technos.map((t) => `<span>${esc(t)}</span>`).join('')}</p>`;
}

export function renderCompetence(c) {
  return `
    <p class="kicker">Compétence ${c.id}${c.evaluee ? '' : ' · <em>non évaluée en 3e année</em>'}</p>
    <h2>${esc(c.nom)}</h2>
    <p class="meta">${esc(c.intitule)}</p>
    <p class="meta">Niveau : ${esc(c.niveau)}</p>
    <p>${esc(c.description)}</p>
    <h4>Traces</h4>
    <ul>${c.traces.map((t) => `<li>${esc(t.titre)}</li>`).join('')}</ul>`;
}

export function renderTrace(t, c) {
  return `
    ${c ? `<p class="kicker">Compétence ${c.id} · ${esc(c.nom)}</p>` : ''}
    <h2>${esc(t.titre)}</h2>
    <p class="meta">${esc(t.contexte)}</p>
    <h4>Apprentissages critiques</h4>${list(t.apprentissagesCritiques)}
    <h4>Argumentaire</h4><p>${esc(t.argumentaire)}</p>
    ${links(t.liens)}`;
}

export function renderBilan({ bilan, contact }) {
  return `
    <h2>${esc(bilan.titre)}</h2>
    <p>${esc(bilan.texte)}</p>
    <h4>Projet professionnel</h4><p>${esc(bilan.projetPro)}</p>
    ${renderContact(contact)}`;
}

export function renderContact(contact) {
  const items = [
    contact.email && { label: contact.email, url: `mailto:${contact.email}` },
    contact.linkedin && { label: 'LinkedIn', url: contact.linkedin },
    contact.github && { label: 'GitHub', url: contact.github },
    contact.cv && { label: 'Télécharger le CV', url: contact.cv },
  ].filter(Boolean);
  return `<h4>Contact</h4>${links(items)}`;
}
