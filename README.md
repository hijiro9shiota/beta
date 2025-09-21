# Assistant de cours

Assistant de cours complet avec transcription live, IA simulée et organisation par matières/sections. Projet de démonstration généré pour tests.

## Installation

Aucune dépendance externe n'est requise, mais vous pouvez exécuter `npm install` pour créer le dossier `node_modules` si nécessaire.

## Développement

```bash
npm run dev
```

Le serveur HTTP custom démarre sur `http://localhost:3000` et sert le front-end PWA depuis `/public`.

## Tests

```bash
npm test
```

Les tests utilisent l'exécuteur natif `node --test`.

## Fonctionnalités principales

- Transcription live avec Web Speech API (fallback simulé).
- Organisation des sessions par sections et recherche plein texte.
- Génération locale simulée de résumés, QCM, textes à trous et flashcards.
- Support multilingue (FR/EN) et thèmes clair/sombre.
- Backend Node sans dépendance externe avec base JSON.
- PWA avec manifeste et service worker.

## Limitations

- La reconnaissance vocale dépend du navigateur.
- Les générateurs IA sont simulés localement, prévoir branchement à un vrai service.
- Base de données JSON pour démonstration seulement.

