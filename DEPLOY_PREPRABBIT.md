# 🚀 Deploy PrepRabbit to spark.preprabbit.in

## DNS Configuration Required

Add these DNS records to your `preprabbit.in` domain:

```
Type    Name        Value               TTL
A       spark       YOUR_SERVER_IP      300
A       api.spark   YOUR_SERVER_IP      300
```

Or using CNAME:
```
Type    Name        Value                   TTL
A       spark       YOUR_SERVER_IP          300
CNAME   api.spark   spark.preprabbit.in     300
```

**Verify DNS propagation:**
```bash
dig spark.preprabbit.in
dig api.spark.preprabbit.in
```

---

## Dokploy Deployment Steps

### 1. Create Project
- Open Dokploy dashboard
- Click **"Create Project"**
- Name: `preprabbit`

### 2. Add Docker Compose Service
- Click **"Add Service"** → **"Docker Compose"**
- **Name:** `preprabbit-prod`
- **Repository:** Your Git repository
- **Branch:** `main`
- **Compose Path:** `docker-compose-prod.yml`

### 3. Set Environment Variables

Go to **Environment** tab and paste:

```env
FRONTEND_DOMAIN=spark.preprabbit.in
BACKEND_DOMAIN=api.spark.preprabbit.in
NEXT_PUBLIC_API_URL=https://api.spark.preprabbit.in
CORS_ORIGINS=https://spark.preprabbit.in
NODE_ENV=production
PYTHONUNBUFFERED=1
DEBUG=true
```

### 4. Configure Domains

Go to **Domains** tab:

**Frontend Domain:**
- Domain: `spark.preprabbit.in`
- Container: `frontend`
- Container Port: `3000`
- ✅ Enable "Generate SSL Certificate"

**Backend Domain:**
- Domain: `api.spark.preprabbit.in`
- Container: `backend`
- Container Port: `8000`
- ✅ Enable "Generate SSL Certificate"

### 5. Deploy!

- Go to **Deployments** tab
- Click **"Deploy"**
- Watch build logs

---

## Post-Deployment Verification

Check these URLs (wait ~2 minutes for SSL):

1. **Frontend:** https://spark.preprabbit.in
2. **Backend Health:** https://api.spark.preprabbit.in/health
3. **API Docs:** https://api.spark.preprabbit.in/docs

Expected responses:
- Frontend: Spark-Sword landing page
- Health: `{"status":"healthy","timestamp":"..."}`
- Docs: Interactive API documentation

---

## Enable Auto-Deploy (Optional)

1. In Dokploy **General** tab → Enable "Auto Deploy"
2. Copy the webhook URL
3. Add to GitHub:
   - Go to your repo → Settings → Webhooks
   - Add webhook with the Dokploy URL
   - Select "Just the push event"

Now `git push` auto-deploys! 🎉

---

## Enable Volume Backups (Recommended)

Your DuckDB data is in the `backend_data` volume.

**Set up S3 backups:**
1. Dokploy → Server → S3 Destinations
2. Add your S3 credentials (AWS, Backblaze, etc.)
3. Go to service → Volume Backups tab
4. Create schedule: Daily at 2 AM UTC

---

## Troubleshooting

### DNS not resolving
```bash
# Check DNS
dig spark.preprabbit.in
dig api.spark.preprabbit.in

# Should return your server IP
```

### SSL certificate not generating
- Wait 5-10 minutes after deployment
- Ensure ports 80 and 443 are open on your server
- Check Dokploy logs for Traefik errors

### Frontend shows "Failed to fetch"
- Check browser console for CORS errors
- Verify `NEXT_PUBLIC_API_URL=https://api.spark.preprabbit.in` in environment
- Test backend directly: `curl https://api.spark.preprabbit.in/health`

### Backend database errors
- Check volume exists: Dokploy → Advanced → Volumes
- View logs: Dokploy → Logs → Select `backend` service

---

## Quick Commands

**Check deployment status:**
```bash
# In Dokploy, go to Monitoring tab
# Or check containers directly:
docker ps | grep preprabbit
```

**View logs:**
```bash
# In Dokploy → Logs tab
# Or terminal:
docker logs preprabbit-backend-1
docker logs preprabbit-frontend-1
```

**Restart services:**
```bash
# In Dokploy → General tab → Click "Restart"
# Or terminal:
docker compose -f docker-compose-prod.yml restart
```

---

## Next Steps After Deployment

- ✅ Test all features (Upload, Playground, Tutorials)
- ✅ Set up monitoring alerts
- ✅ Configure volume backups
- ✅ Enable auto-deploy webhook
- 🔐 Add Google OAuth (we'll implement this next!)

---

## Your URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://spark.preprabbit.in |
| **Backend API** | https://api.spark.preprabbit.in |
| **API Docs** | https://api.spark.preprabbit.in/docs |
| **Health Check** | https://api.spark.preprabbit.in/health |

---

**Need help?** Check the full guide in [DOKPLOY_DEPLOYMENT.md](./DOKPLOY_DEPLOYMENT.md)
