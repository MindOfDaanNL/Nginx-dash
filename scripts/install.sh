#!/usr/bin/env bash
# Nginx-Dash installation script for Ubuntu Server
# Run as root or a user with sudo privileges.

set -euo pipefail

APP_DIR="/opt/nginx-dash"
APP_USER="nginx-dash"
DB_NAME="nginx_dash"
DB_USER="nginx_dash"

# 1. Install required packages
echo "[1/11] Installing required packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx mariadb-server certbot python3-certbot-nginx curl gnupg

# 2. Install Node.js LTS
echo "[2/11] Installing Node.js LTS..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
  apt-get install -y nodejs
fi

# 3. Create application user (non-root)
echo "[3/11] Creating application user..."
id -u "$APP_USER" >/dev/null 2>&1 || useradd -r -m -s /bin/bash "$APP_USER"
usermod -aG sudo "$APP_USER" 2>/dev/null || true

# 4. Create MariaDB database and restricted user
echo "[4/11] Configuring MariaDB..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$(openssl rand -hex 16)';"
mysql -u root -e "GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost'; FLUSH PRIVILEGES;"

# 5. Copy application
echo "[5/11] Installing application to $APP_DIR..."
mkdir -p "$APP_DIR"
cp -a /root/projecten/Portfolio/Nginx-dash/. "$APP_DIR/"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# 6. Configure environment variables
echo "[6/11] Configuring environment..."
DB_PASSWORD=$(mysql -N -e "SELECT IFNULL((SELECT authentication_string FROM mysql.user WHERE User='$DB_USER' AND Host='localhost'),'') LIMIT 1;" 2>/dev/null || true)
cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=3000
APP_URL=http://localhost:3000
APP_NAME=Nginx-Dash
SESSION_SECRET=$(openssl rand -hex 32)
SESSION_TIMEOUT_MINUTES=120
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
NGINX_BIN=/usr/sbin/nginx
NGINX_SITES_AVAILABLE=/etc/nginx/sites-available
NGINX_SITES_ENABLED=/etc/nginx/sites-enabled
CERTBOT_BIN=/usr/bin/certbot
DEFAULT_LE_EMAIL=admin@example.com
NGINX_HELPER_PORT=4011
NGINX_HELPER_TOKEN=$(openssl rand -hex 32)
NGINX_HELPER_URL=http://127.0.0.1:4011
EOF
chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# 7. Install Node.js dependencies
echo "[7/11] Installing Node.js dependencies..."
sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npm install --omit=dev"

# 8. Run database migrations
echo "[8/11] Running database migrations..."
sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER='$DB_USER' DB_PASSWORD='$DB_PASSWORD' DB_NAME='$DB_NAME' node scripts/run-migrations.js"

# 9. Create initial administrator account
echo "[9/11] Creating initial administrator..."
sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && ADMIN_USERNAME=admin ADMIN_PASSWORD='Admin123!' ADMIN_EMAIL=admin@example.com node scripts/seed.js"
echo "   -> admin / Admin123!  (change immediately)"

# 10. Configure privileged helper (systemd)
echo "[10/11] Configuring privileged helper..."
cat > /etc/systemd/system/nginx-dash-helper.service <<EOF
[Unit]
Description=Nginx-Dash Privileged Helper
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/nginx-helper
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node nginx-helper/app.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now nginx-dash-helper.service

# 11. Configure application service
echo "[11/11] Configuring application service..."
cat > /etc/systemd/system/nginx-dash.service <<EOF
[Unit]
Description=Nginx-Dash Management Dashboard
After=network.target mariadb.service nginx-dash-helper.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node src/server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now nginx-dash.service

# Reverse proxy from Nginx to the app
cat > /etc/nginx/sites-available/nginx-dash <<'EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/nginx-dash /etc/nginx/sites-enabled/nginx-dash
nginx -t && systemctl reload nginx

echo ""
echo "=== Installation complete ==="
echo "App:   http://$(hostname -I | awk '{print $1}'):3000"
echo "Helper: http://127.0.0.1:4011"
echo "Login: admin / Admin123!  (change immediately)"
echo "Docs:  $APP_DIR/docs/INSTALL.md"
