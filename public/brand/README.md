# Kit de marque QMS SaaS

Le logo fourni est conservé avec son rendu et son fond blanc. Les exports PNG
ne sont pas des versions vectorielles ni des images à fond transparent.
Seul le favicon est redessiné en version simplifiée.

| Fichier | Dimensions | Usage |
| --- | --- | --- |
| logo-complet.png | 768 × 768 | Présentations, couverture, communication |
| logo-appli-512.png | 512 × 512 | Symbole seul, application |
| logo-appli-192.png | 192 × 192 | Icône compacte |
| logo-horizontal.png | 1200 × 360 | Landing page, bandeaux |
| logo-signature.png | 600 × 180 | Signature email, affichée à 300 × 90 |
| apple-touch-icon.png | 180 × 180 | Favori sur écran d'accueil Apple |
| favicon.svg | Vectoriel | Symbole simplifié pour les navigateurs |
| favicon-16.png / favicon-32.png / favicon-48.png | 16 / 32 / 48 px | Favoris et compatibilité |
| favicon.ico | 16, 32, 48 px | Format navigateur multi-tailles |
| signature.html | — | Modèle de signature sans données personnelles |

Le fichier `qms-saas-brand-pack.zip` rassemble ces variantes et ce guide.
Les favicons et l'icône Apple sont situés à la racine de `public` dans le projet,
et à la racine du kit dans l'archive.

## Signature email

Ouvrir `signature.html` pour prévisualiser le modèle. Pour l'utiliser dans un
client email, héberger `logo-signature.png` sur une URL HTTPS publique et remplacer
le chemin relatif de l'image par cette URL avant de copier la signature.
Une image relative ne sera pas visible chez les destinataires.
Les signatures manuscrites des utilisateurs ne sont pas modifiées.

## Régénération

Avec Python et Pillow disponibles :

```sh
python3 scripts/generate-brand-assets.py public/brand/logo-complet.png
```

La génération utilise le cadrage du logo source de 768 × 768 pixels.
