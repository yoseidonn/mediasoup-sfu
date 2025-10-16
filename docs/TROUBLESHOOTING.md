# mediasoup SFU Troubleshooting Guide

## Common Issues and Solutions

### 1. Service Won't Start

#### Issue: Permission Denied
```
mediasoup.service: Changing to the requested working directory failed: Permission denied
```

**Solution:**
```bash
# Fix directory permissions
sudo chown -R mediasoup:mediasoup /opt/mediasoup
sudo chmod 755 /opt/mediasoup

# Check if mediasoup user can access directory
sudo -u mediasoup ls -la /opt/mediasoup
```

#### Issue: No Such File or Directory
```
mediasoup.service: Failed to set up mount namespacing: /opt/mediasoup/logs: No such file or directory
```

**Solution:**
```bash
# Create missing directories
sudo mkdir -p /opt/mediasoup/logs
sudo chown mediasoup:mediasoup /opt/mediasoup/logs

# Or remove ReadWritePaths from service file
sudo nano /etc/systemd/system/mediasoup-sfu.service
# Comment out or remove ReadWritePaths lines
```

### 2. Node.js Version Issues

#### Issue: Unsupported Engine
```
npm WARN EBADENGINE Unsupported engine {
npm WARN EBADENGINE   package: 'mediasoup@3.19.4',
npm WARN EBADENGINE   required: { node: '>=22' },
npm WARN EBADENGINE   current: { node: 'v18.19.1' }
```

**Solution:**
```bash
# Upgrade Node.js to version 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify version
node --version
```

### 3. Port Issues

#### Issue: Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or change port in configuration
export PORT=3001
```

#### Issue: RTP Ports Not Available
```
Error: Worker creation failed: RTP port range not available
```

**Solution:**
```bash
# Check if RTP ports are in use
sudo netstat -ulnp | grep 40000

# Change RTP port range
export RTC_MIN_PORT=50000
export RTC_MAX_PORT=59999
```

### 4. Memory Issues

#### Issue: Out of Memory
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or reduce worker count
export WORKER_COUNT=1
```

### 5. Network Issues

#### Issue: Cannot Connect to mediasoup
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Solution:**
```bash
# Check if service is running
sudo systemctl status mediasoup-sfu

# Check if port is listening
sudo netstat -tlnp | grep 3000

# Check firewall
sudo ufw status
```

#### Issue: WebRTC Connection Failed
```
Error: ICE connection failed
```

**Solution:**
```bash
# Check ANNOUNCED_IP configuration
echo $ANNOUNCED_IP

# Ensure public IP is correct
curl ifconfig.me

# Check STUN/TURN server configuration
```

### 6. Logging Issues

#### Issue: No Logs Generated
```
No log files found in logs/ directory
```

**Solution:**
```bash
# Check log directory permissions
ls -la /opt/mediasoup/logs/

# Fix permissions
sudo chown -R mediasoup:mediasoup /opt/mediasoup/logs
sudo chmod 755 /opt/mediasoup/logs

# Check logger configuration
cat /opt/mediasoup/logger.js
```

### 7. Worker Issues

#### Issue: Worker Creation Failed
```
Error: Worker creation failed: Invalid RTP port range
```

**Solution:**
```bash
# Check RTP port configuration
echo $RTC_MIN_PORT
echo $RTC_MAX_PORT

# Ensure port range is valid
if [ $RTC_MIN_PORT -gt $RTC_MAX_PORT ]; then
    echo "Invalid port range: MIN > MAX"
fi

# Check if ports are available
sudo netstat -ulnp | grep -E "40000|40001|40002"
```

#### Issue: Worker Died
```
Error: Mediasoup worker died, exiting in 2 seconds...
```

**Solution:**
```bash
# Check worker logs
sudo journalctl -u mediasoup-sfu -f

# Check system resources
free -h
df -h
top

# Restart service
sudo systemctl restart mediasoup-sfu
```

## Debug Mode

### Enable Debug Logging

```bash
# Set debug log level
export LOG_LEVEL=debug

# Start service
sudo systemctl restart mediasoup-sfu

# View debug logs
sudo journalctl -u mediasoup-sfu -f
```

### Check Service Status

```bash
# Detailed service status
sudo systemctl status mediasoup-sfu -l

# Check if service is enabled
sudo systemctl is-enabled mediasoup-sfu

# Check service configuration
sudo systemctl cat mediasoup-sfu
```

### Monitor Resources

```bash
# Check memory usage
free -h

# Check CPU usage
top -p $(pgrep -f mediasoup)

# Check disk usage
df -h

# Check network connections
sudo netstat -tulnp | grep mediasoup
```

## Performance Issues

### High CPU Usage

**Symptoms:**
- CPU usage > 80%
- Slow response times
- High worker CPU usage

**Solutions:**
```bash
# Reduce worker count
export WORKER_COUNT=1

# Check for memory leaks
sudo journalctl -u mediasoup-sfu | grep -i memory

# Monitor worker processes
ps aux | grep mediasoup-worker
```

### High Memory Usage

**Symptoms:**
- Memory usage > 80%
- Out of memory errors
- Slow performance

**Solutions:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

# Reduce worker count
export WORKER_COUNT=1

# Check for memory leaks
sudo journalctl -u mediasoup-sfu | grep -i memory
```

### Network Issues

**Symptoms:**
- WebRTC connection failures
- Poor audio/video quality
- High latency

**Solutions:**
```bash
# Check network configuration
ip addr show
ip route show

# Test network connectivity
ping google.com
curl -I http://localhost:3000/health

# Check firewall rules
sudo ufw status verbose
```

## Recovery Procedures

### Service Recovery

```bash
# Stop service
sudo systemctl stop mediasoup-sfu

# Check for stuck processes
sudo pkill -f mediasoup

# Restart service
sudo systemctl start mediasoup-sfu

# Check status
sudo systemctl status mediasoup-sfu
```

### Configuration Recovery

```bash
# Backup current configuration
sudo cp /etc/systemd/system/mediasoup-sfu.service /etc/systemd/system/mediasoup-sfu.service.backup

# Restore from backup
sudo cp /etc/systemd/system/mediasoup-sfu.service.backup /etc/systemd/system/mediasoup-sfu.service

# Reload systemd
sudo systemctl daemon-reload
sudo systemctl restart mediasoup-sfu
```

### Data Recovery

```bash
# Backup logs
sudo tar -czf mediasoup-logs-$(date +%Y%m%d).tar.gz /var/log/mediasoup

# Backup configuration
sudo tar -czf mediasoup-config-$(date +%Y%m%d).tar.gz /opt/mediasoup /etc/systemd/system/mediasoup-sfu.service
```

## Getting Help

### Log Collection

```bash
# Collect system information
uname -a > mediasoup-debug.txt
node --version >> mediasoup-debug.txt
npm --version >> mediasoup-debug.txt

# Collect service logs
sudo journalctl -u mediasoup-sfu --no-pager -l >> mediasoup-debug.txt

# Collect system logs
sudo dmesg | tail -50 >> mediasoup-debug.txt

# Collect network information
sudo netstat -tulnp >> mediasoup-debug.txt
sudo ufw status >> mediasoup-debug.txt
```

### Health Check

```bash
# Run comprehensive health check
curl -s http://localhost:3000/health | jq .

# Check service status
sudo systemctl status mediasoup-sfu

# Check resource usage
free -h
df -h
```

### Contact Information

- **GitHub Issues**: Create an issue with debug information
- **Documentation**: Check the `docs/` directory
- **Logs**: Check `/var/log/mediasoup/` directory
