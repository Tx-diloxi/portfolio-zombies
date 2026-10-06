import '../styles.css';
import data from '../content/portfolio.json';
import { renderProfil, renderCompetence, renderTrace, renderBilan } from '../content/render.js';

const sections = [
  { id: 'profil', label: 'Profil & alternance', html: renderProfil(data) },
  ...data.competences.map((c) => ({
    id: `competence-${c.id}`,
    label: c.nom,
    html: renderCompetence(c) + c.traces.map((t) => `<div class="trace">${renderTrace(t)}</div>`).join(''),
  })),
  { id: 'bilan', label: 'Bilan & contact', html: renderBilan(data) },
];

document.title = `${data.profil.nom} — Portfolio`;
document.getElementById('toc').innerHTML = sections.map((s) => `<a href="#${s.id}">${s.label}</a>`).join('');
document.getElementById('lecture-content').innerHTML = sections
  .map((s) => `<section id="${s.id}" class="lecture-section">${s.html}</section>`)
  .join('');
