# Manual Server Restart and Troubleshooting for AL2 Instances

If the automated deployment doesn't successfully start the server, follow these instructions to manually restart and troubleshoot:

## SSH into the EC2 Instance

1. Connect to your EC2 instance using SSH:

```bash
ssh ec2-user@<instance-ip>
```

## Check Server Status

1. Check if the gabiyoga service is running:

```bash
sudo systemctl status gabiyoga
```

2. View the latest logs:

```bash
sudo journalctl -u gabiyoga -n 50
```

## Manual Restart

If the service is failed or not running, try these steps:

1. Check the Node.js installation:

```bash
node -v
```

2. Check if the server.js file exists:

```bash
ls -la /var/www/gabiyoga/server.js
```

3. Test Node.js directly:

```bash
cd /var/www/gabiyoga
sudo node server.js
```
(Press Ctrl+C to exit if it works)

4. Restart the service:

```bash
sudo systemctl restart gabiyoga
```

5. Check status after restart:

```bash
sudo systemctl status gabiyoga
```

## Fix Common Issues

If still not working, try these fixes:

1. Fix permissions:

```bash
sudo chmod 755 /var/www/gabiyoga
sudo chown -R root:root /var/www/gabiyoga
```

2. Update the service file:

```bash
sudo nano /etc/systemd/system/gabiyoga.service
```

Make sure it looks like this:
```
[Unit]
Description=Gabi Yoga Web Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/gabiyoga
ExecStart=/usr/bin/node /var/www/gabiyoga/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gabiyoga
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

3. Reload systemd and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart gabiyoga
```

## Testing Network Connectivity

Check if the server is listening on the expected port:

```bash
sudo netstat -tulpn | grep 5001
```

## Access the Application

Once the service is running, access it through the load balancer URL:

```
http://GabiYo-LoadB-go6jsRpXRCQ0-433005971.us-west-2.elb.amazonaws.com
```
