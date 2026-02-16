#!/bin/bash
set -e

echo "=== Setting up reverse proxy + PM2 ==="

# 1. Install PM2 globally
echo "[1/3] Installing PM2..."
sudo npm install -g pm2
echo "  PM2 installed"

# 2. Configure Apache reverse proxy
echo "[2/3] Configuring Apache..."
sudo a2enmod proxy proxy_http rewrite headers
sudo tee /etc/apache2/sites-available/mededprep.conf > /dev/null << 'EOF'
<VirtualHost *:80>
    ServerName inst.mededprep.app

    # Proxy API requests to Express
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:9001/
    ProxyPassReverse / http://127.0.0.1:9001/

    # WebSocket support (if needed later)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:9001/$1" [P,L]
</VirtualHost>
EOF

sudo a2dissite 000-default.conf 2>/dev/null || true
sudo a2ensite mededprep.conf
sudo systemctl restart apache2
echo "  Apache configured"

# 3. Start app with PM2
echo "[3/3] Starting app with PM2..."
cd ~/mededprep-inst
pm2 delete mededprep 2>/dev/null || true
pm2 start npm --name mededprep -- start
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u admin --hp /home/admin 2>&1 | tail -3
echo "  App running via PM2"

echo ""
echo "=== Deployment complete! ==="
echo "Your app should now be live at https://inst.mededprep.app"
echo ""
echo "Useful commands:"
echo "  pm2 logs mededprep    # View app logs"
echo "  pm2 restart mededprep # Restart app"
echo "  pm2 status            # Check status"
