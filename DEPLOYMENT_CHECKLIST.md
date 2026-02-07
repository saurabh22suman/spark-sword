# Pre-Deployment Checklist

## Before Deploying to Dokploy

- [ ] **Domain Setup**
  - [ ] Purchase/configure domain name
  - [ ] Point DNS A records to your server IP
  - [ ] Wait for DNS propagation (5-30 minutes)

- [ ] **Code Preparation**
  - [ ] All tests passing locally
  - [ ] Docker Compose builds successfully: `docker compose -f docker-compose-prod.yml build`
  - [ ] Git repository is up to date: `git push origin main`

- [ ] **Environment Variables**
  - [ ] Update `.env.production` with your actual domains
  - [ ] Replace `yourdomain.com` with your real domain
  - [ ] Keep `.env.production` for reference (don't commit sensitive data)

- [ ] **Dokploy Setup**
  - [ ] Dokploy installed on your server
  - [ ] SSL certificates will be auto-generated (Traefik + Let's Encrypt)
  - [ ] Server firewall allows ports 80, 443

## Quick Test Before Deploy

Run locally with production compose:
```bash
# Test production build locally
docker compose -f docker-compose-prod.yml build

# Check for any build errors
# Don't run `up` locally - it needs production domains
```

## Deployment Steps Summary

1. **Create Project** in Dokploy
2. **Add Docker Compose Service**
   - Repository: Your Git repo
   - Compose file: `docker-compose-prod.yml`
3. **Set Environment Variables** (from `.env.production`)
4. **Configure Domains**
   - Frontend: `spark.preprabbit.in`
   - Backend: `api.spark.preprabbit.in`
5. **Deploy** and monitor logs

## Post-Deployment Checks

- [ ] Frontend accessible: `https://spark.preprabbit.in`
- [ ] Backend health check: `https://api.spark.preprabbit.in/health`
- [ ] API docs: `https://api.spark.preprabbit.in/docs`
- [ ] SSL certificates valid (green padlock in browser)
- [ ] No console errors in browser DevTools
- [ ] Test a few features (upload, playground, tutorials)

## Optional: Enable Auto-Deploy

- [ ] Enable auto-deploy in Dokploy
- [ ] Copy webhook URL
- [ ] Add webhook to GitHub repository
- [ ] Test: Push a small change and verify auto-deploy works

## Need Help?

See [DOKPLOY_DEPLOYMENT.md](./DOKPLOY_DEPLOYMENT.md) for detailed instructions.
