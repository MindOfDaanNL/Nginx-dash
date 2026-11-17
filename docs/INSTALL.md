# Installatiehandleiding — Nginx-Dash

Deze handleiding leidt je door de installatie van Nginx-Dash op een schone Ubuntu Server.

## Vereisten

- Ubuntu Server 22.04 of nieuwer
- `sudo` / root-toegang
- Een domein dat naar de server wijst (voor SSL via Let's Encrypt)

## Snel starten (installatiescript)

```bash
sudo ./scripts/install.sh
```

Het script doet het volgende:

1. Installeert Nginx, MariaDB, Certbot en Node.js LTS.
2. Maakt een niet-root applicatiegebruiker `nginx-dash`.
3. Maakt de MariaDB-database en een beperkte databasegebruiker aan.
4. Kopieert de applicatie naar `/opt/nginx-dash`.
5. Genereert een veilig `.env` met sessie-secret, DB-wachtwoord en helper-token.
6. Installeert Node.js-dependenties.
7. Voert database-migraties uit.
8. Maakt de eerste administrator aan (`admin` / `Admin123!`).
9. Configureert de bevoorrechte helper-service (root) en de applicatie-service via systemd.
10. Configureert Nginx als reverse proxy naar de applicatie.

## Handmatige installatie

### 1. Pakketten installeren

```bash
sudo apt-get update
sudo apt-get install -y nginx mariadb-server certbot python3-certbot-nginx nodejs npm
```

### 2. Gebruiker en database

```bash
sudo useradd -r -m -s /bin/bash nginx-dash
sudo mysql -e "CREATE DATABASE nginx_dash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'nginx_dash'@'localhost' IDENTIFIED BY '<sterk-wachtwoord>';"
sudo mysql -e "GRANT ALL PRIVILEGES ON nginx_dash.* TO 'nginx_dash'@'localhost'; FLUSH PRIVILEGES;"
```

### 3. Applicatie

```bash
sudo cp -a . /opt/nginx-dash
sudo chown -R nginx-dash:nginx-dash /opt/nginx-dash
```

Kopieer `.env.example` naar `.env` en pas de waarden aan (vooral `SESSION_SECRET`, `DB_PASSWORD`, `NGINX_HELPER_TOKEN`).

```bash
sudo -u nginx-dash bash -c "cd /opt/nginx-dash && npm install --omit=dev"
```

### 4. Migraties

```bash
sudo -u nginx-dash bash -c "cd /opt/nginx-dash && node scripts/run-migrations.js"
```

### 5. Eerste administrator

```bash
sudo -u nginx-dash bash -c "cd /opt/nginx-dash && ADMIN_USERNAME=admin ADMIN_PASSWORD='<wachtwoord>' ADMIN_EMAIL=admin@example.com node scripts/seed.js"
```

### 6. Diensten starten

Voorbeelden van systemd units staan in `scripts/install.sh`. Start de applicatie en de helper, en configureer Nginx als reverse proxy.

## Beveiliging

- De Node.js-applicatie draait **nooit als root**.
- Bevoorrechte bewerkingen (Nginx, Certbot, bestandswijzigingen in `/etc/nginx`) verlopen via de aparte `nginx-helper` die met root-rechten draait en alleen een beperkte set acties toestaat.
- Alle shell-aanroepen gebruiken argument arrays, nooit door de gebruiker samengestelde commandostrings.
- Bewaar `.env` nooit in versiebeheer (staat in `.gitignore`).
- Wijzig het standaard admin-wachtwoord direct na de eerste login.

## Onderhoud

- Migraties: `npm run migrate`
- Logs: `journalctl -u nginx-dash -f` en `journalctl -u nginx-dash-helper -f`
- Back-up: maak een dump van de MariaDB-database en kopieer `/etc/nginx` en `/etc/letsencrypt`.
