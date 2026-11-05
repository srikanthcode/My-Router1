# Production Deployment Guide

This guide outlines prerequisites, environment variables, build processes, and deployment strategies for launching Pro Router into production.

---

## 1. System Prerequisites

- **Node.js:** Node.js v20.x LTS or higher
- **Package Manager:** npm v10+ or pnpm v9+
- **Database:** PostgreSQL 15 or 16 with SSL enabled
- **Reverse Proxy:** Nginx, Caddy, or Cloudflare with HTTP/2 and Server-Sent Events (SSE) support enabled

---

## 2. Environment Variables Specification

Create `.env` (or configure via your secret manager):

```env
# ── Core Server Configuration ──
NODE_ENV=production
PORT=3000
API_PORT=4000
BASE_URL=https://your-domain.com
API_BASE_URL=https://api.your-domain.com

# ── Database Connection ──
DATABASE_URL=postgresql://user:password@db-host:5432/prorouter?sslmode=require

# ── Security & Authentication ──
JWT_SECRET=generate-a-secure-64-char-random-key
SESSION_SECRET=generate-another-secure-secret

# ── Upstream Provider API Keys ──
TOKENJUICE_API_KEY=your_tokenjuice_api_key
REQUESTY_API_KEY=your_requesty_api_key
NABH_API_KEY=your_nabh_cloud_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# ── Billing & Payments (Razorpay) ──
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# ── Promotional & Free Tier Settings ──
PROMO_ENABLED=true
PROMO_DURATION_HOURS=48
```

---

## 3. Database Migration & Seeding

Run the Drizzle migrations to ensure the PostgreSQL schema is fully prepared:

```bash
# Apply schema migrations
npm run db:migrate

# Seed baseline models, pricing tiers, and system admin
npm run db:seed
```

---

## 4. Building Applications

Build both the Fastify API and Next.js Web frontend:

```bash
# Install dependencies
npm install

# Build Fastify backend
npm --prefix apps/api run build

# Build Next.js Web frontend & edge router
npm --prefix apps/web run build
```

---

## 5. Deployment Options

### Option A: PM2 / Systemd (Dual Process on Virtual Machine)

Use PM2 for zero-downtime process management:

```json
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "prorouter-api",
      script: "apps/api/dist/index.js",
      instances: 2,
      exec_mode: "cluster",
      env: {
        PORT: 4000
      }
    },
    {
      name: "prorouter-web",
      script: "npm",
      args: "--prefix apps/web start",
      instances: 2,
      exec_mode: "cluster",
      env: {
        PORT: 3000
      }
    }
  ]
};
```

Run with: `pm2 start ecosystem.config.js`

### Option B: Containerized Docker Deployment

Use multi-stage Dockerfiles to build minimal images:

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY . .
RUN npm ci && npm --prefix apps/web run build
EXPOSE 3000
CMD ["npm", "--prefix", "apps/web", "start"]
```

---

## 6. Reverse Proxy Configuration (Nginx)

Crucial for AI streaming: **Server-Sent Events buffering must be disabled**.

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Disable buffering for real-time SSE streaming
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Keep alive and timeouts for long-running agent tasks
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

---

## 7. Health Checks and Verification

Verify running endpoints:

```bash
# Fastify API Health
curl https://api.your-domain.com/health

# Web Router Health & Catalog
curl https://your-domain.com/v1/models -H "Authorization: Bearer sk-pro-your-key"
```
