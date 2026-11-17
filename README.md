# Nginx-Dash

Self-hosted Nginx Management Dashboard. Beheer Nginx-virtualhosts, SSL-certificaten (Let's Encrypt / Certbot) en de Nginx-service vanuit één webinterface.

## Tech-stack

- Backend: Node.js, Express.js, MariaDB (`mysql2`)
- Frontend: HTML5, CSS3, Vanilla JavaScript, Lucide icons
- Systeem: Nginx, Certbot, systemd

## Snel starten (ontwikkeling)

```bash
npm install
cp .env.example .env
# Pas .env aan (DB, sessie-secret, helper-token)
npm run migrate
node scripts/seed.js
npm run dev
```

Open `http://localhost:3000` en log in met de seeding-gegevens.

## Projectstructuur

```
src/            Applicatiecode (Express, modules, services, config)
public/         Statische assets (CSS, JS)
nginx-helper/   Bevoorrechte helper-service (root)
scripts/        Migraties, seed, installatie
tests/          Automatische tests
docs/           Documentatie
```

## Beveiliging

- Rolgebaseerd toegangsbeheer (Admin / Viewer), afgedwongen server-side.
- bcrypt wachtwoordhashing, secure sessions, CSRF, rate limiting.
- Geen root voor de Node.js-applicatie; bevoorrechte bewerkingen via `nginx-helper`.
- Argument arrays in plaats van shell-strings; padtraversie-bescherming.
- `nginx -t` validatie met backup en rollback voor elke configuratiewijziging.

## Licentie

MIT
