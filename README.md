# Portfolio Zombies

Portfolio de BUT Informatique (3e année, IUT de Lannion, alternance) sous forme de FPS zombie
façon *Call of Duty Zombies*, jouable dans le navigateur (Three.js + Vite).

- **Spawn « Bureau de l'alternant »** : profil et alternance.
- **6 salles = 6 compétences du BUT**, reliées par des barricades achetables avec les points gagnés en tuant des zombies.
- Dans chaque salle, des **terminaux** (touche `F`) affichent la fiche compétence et les traces.
- **Salle finale Pack-a-Punch** : bilan, projet professionnel, contact.
- **Mode lecture** (`lecture.html`) : tout le contenu en page classique, sans jouer.
- Menu pause : ouvrir toutes les portes, désactiver les zombies (pratique pour le jury).

## Lancer

```bash
npm install
npm run dev
```

## Modifier le contenu

Tout le texte est dans [`src/content/portfolio.json`](src/content/portfolio.json) : il alimente à la fois le jeu et le mode lecture.

- `competences[].evaluee` : `false` affiche la salle comme « non évaluée en 3e année » (astérisque sur le panneau).
- `competences[].traces` : chaque trace devient un terminal dans la salle (6 emplacements par salle maximum en plus de la fiche).
- `contact.cv` : chemin d'un PDF placé dans `public/` (ex. `"cv.pdf"`).

## Commandes

| Touche | Action |
| --- | --- |
| ZQSD / WASD | Se déplacer |
| Maj | Sprint |
| Clic gauche | Tirer |
| R | Recharger |
| F (ou E) | Interagir (portes, terminaux, armes, perks) |
| V | Couteau |
| 1 / 2 / molette | Changer d'arme |
| Échap | Pause |

## Déployer

`npm run build` produit `dist/` (chemins relatifs, hébergeable n'importe où).
Le workflow `.github/workflows/deploy.yml` publie sur GitHub Pages à chaque push sur `main`
(activer *Settings → Pages → Source : GitHub Actions*).


https://tx-diloxi.github.io/portfolio-zombies/