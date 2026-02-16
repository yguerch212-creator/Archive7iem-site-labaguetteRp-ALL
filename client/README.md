# Archives 7e Armeekorps — Client

Frontend React de la plateforme Archives Wehrmacht RP.

## Stack

- React 18 + Vite
- React Router v6
- Axios (API client)
- InteractJS (drag & drop layout editors)
- DOMPurify (XSS protection)
- CSS Variables (design parchemin militaire)

## Développement

```bash
npm install
npm run dev     # Serveur dev (port 5173)
npm run build   # Build production → dist/
```

## Structure

```
src/
├── api/            # Client Axios configuré
├── auth/           # AuthContext, ProtectedRoute, useAuth
├── components/     # Composants réutilisables
│   ├── LayoutEditor.jsx       # Éditeur drag & drop
│   ├── LayoutRenderer.jsx     # Rendu des blocs
│   ├── SignatureCanvas.jsx    # Canvas de signature Paint-style
│   ├── SignaturePopup.jsx     # Popup signer / demander signature
│   ├── EffectifAutocomplete.jsx # Autocomplete effectifs
│   ├── ShareButton.jsx        # Liens partageables
│   └── layout/Topbar.jsx     # Navigation principale
├── pages/          # Pages par module
│   ├── effectifs/  # Soldbuch, organigramme, liste
│   ├── rapports/   # Création, vue, validation, layout
│   ├── sanctions/  # Affaires, pièces judiciaires
│   ├── medical/    # Visites médicales
│   ├── pds/        # Plan de service
│   └── ...
├── styles/         # CSS global + unités
├── utils/          # Helpers (dates, export PDF/CSV)
└── router.jsx      # Routes de l'application
```
