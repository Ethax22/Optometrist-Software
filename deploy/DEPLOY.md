# Deploying to a Hostinger KVM 2 VPS

One-time setup. After this, redeploys are just `./deploy/deploy.sh`.

## 1. Provision the VPS

- Create the KVM 2 instance with Ubuntu 24.04 LTS.
- Point your domain's DNS `A` record at the VPS's IP.

## 2. Base server setup

SSH in as root, then:

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

apt update && apt install -y fail2ban
systemctl enable --now fail2ban
```

Switch to the `deploy` user for everything below (`su - deploy`), and disable
root SSH login / password auth in `/etc/ssh/sshd_config` once you've
confirmed key-based login as `deploy` works.

## 3. Install runtime

```bash
# Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# nginx + certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# PM2
sudo npm install -g pm2
```

## 4. Create the database

```bash
sudo -u postgres psql
```
```sql
CREATE USER optometrist WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE optometrist OWNER optometrist;
\q
```

## 5. Clone and configure the app

```bash
git clone <your-repo-url> ~/optometrist-app
cd ~/optometrist-app
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL=postgres://optometrist:choose-a-strong-password@localhost:5432/optometrist`
- `NEXT_PUBLIC_SITE_URL=https://your-domain.example`
- `RESEND_API_KEY=` your real Resend key (without this, password-reset emails only log server-side instead of sending)

```bash
npm ci
npm run db:migrate
npm run build
```

## 6. Seed the 3 accounts

```bash
npm run seed:optometrist -- optometrist1@example.com 'choose-a-strong-password'
npm run seed:optometrist -- optometrist2@example.com 'choose-a-strong-password'
npm run seed:optometrist -- admin@example.com 'choose-a-strong-password'
```
The `--` is required so npm passes the email/password through to the script
instead of treating them as npm flags. Run it once per person (each with
their own email/password) so the 2 optometrists + you (admin) each have a
login. Running it again for an email that already exists just resets that
account's password instead of creating a duplicate. There's no public
sign-up — accounts only ever come from this script, which is what keeps the
app closed to outsiders on top of the login gate itself.

## 7. Start the app with PM2

```bash
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup   # follow the printed command to enable on-boot start
```

Note: this stays at 1 PM2 instance deliberately — the app's rate limiter
is in-memory and only correct for a single process. Don't scale this via
PM2 cluster mode without also moving the rate limiter to a shared store.

## 8. nginx + HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/optometrist-app
# edit server_name in that file to your real domain first
sudo ln -s /etc/nginx/sites-available/optometrist-app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.example
```

Certbot rewrites the config to add the TLS block and redirect HTTP to
HTTPS, and sets up auto-renewal.

## 9. Nightly backups

```bash
chmod +x deploy/backup-db.sh
sudo mkdir -p /var/backups/optometrist-db
sudo chown $USER /var/backups/optometrist-db
crontab -e
```
Add:
```
0 2 * * * DATABASE_URL='postgres://optometrist:choose-a-strong-password@localhost:5432/optometrist' /home/deploy/optometrist-app/deploy/backup-db.sh >> /var/log/optometrist-backup.log 2>&1
```

Consider also copying backups off-box (S3/Backblaze via `rclone`) — see
the commented-out section in `backup-db.sh`.

## 10. Verify

- Visit `https://your-domain.example` — should redirect to `/login`.
- Log in with one of the seeded accounts.
- Confirm password reset actually sends an email (not just logs).

## Redeploying later

```bash
cd ~/optometrist-app
./deploy/deploy.sh
```

This pulls `main`, installs deps, runs migrations, rebuilds, and restarts
PM2.
