# TimeFlow - Web Time Tracker

Extension Chrome qui traque automatiquement le temps passé sur chaque site web, 
avec un tableau de bord minimaliste et élégant.

## Fonctionnalités

- Suivi automatique du temps par site web
- Vue Today / Week
- Classement des sites les plus visités
- Pause automatique (idle, écran verrouillé, fenêtre inactive)
- Reset des données avec confirmation
- Interface dark mode avec animations

## Installation (mode développeur)

1. Cloner le repo
2. Ouvrir `chrome://extensions`
3. Activer le **mode développeur** (en haut à droite)
4. Cliquer **"Charger l'extension non empaquetée"**
5. Sélectionner le dossier du projet

## Technologies

- Chrome Extensions API — Manifest V3
- `chrome.storage.session` — persistance cross-redémarrage du service worker
- `chrome.idle` — détection AFK et verrouillage écran
- Vanilla JS / HTML / CSS
