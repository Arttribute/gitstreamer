# GitStream Deployment Guide

## Deploying to Vercel (Separate Projects)

When deploying the API and web app as separate Vercel projects, you need to configure CORS properly to allow cross-origin requests.

### 1. Deploy the API

**Environment Variables for API (`apps/api`):**

```env
# MongoDB (use MongoDB Atlas for production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gitstream

# Privy Auth
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://your-frontend-url.vercel.app/api/auth/github/callback

# Yellow Network
YELLOW_PRIVATE_KEY=your_wallet_private_key
YELLOW_USE_SANDBOX=true

# Contracts
GITSTREAM_RECEIVER_ADDRESS=0x...
USDC_ADDRESS=0x...

# Chain
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org

# Auth
JWT_SECRET=your-secure-random-secret

# CORS - Frontend URLs (IMPORTANT!)
# Use comma-separated list for multiple origins
FRONTEND_URL=https://your-frontend-url.vercel.app,https://www.your-domain.com
# Note: Vercel preview deployments (*.vercel.app) are automatically allowed
```

**Vercel Settings:**
- Framework Preset: Other
- Root Directory: `apps/api`
- Build Command: `pnpm build`
- Output Directory: `dist`
- Install Command: `pnpm install --filter=api...`

### 2. Deploy the Web App

**Environment Variables for Web (`apps/web`):**

```env
# API URL - Use your deployed API URL
NEXT_PUBLIC_API_URL=https://your-api-url.vercel.app

# Privy (must match API configuration)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Chain
NEXT_PUBLIC_CHAIN_ID=84532

# Contracts (must match API configuration)
NEXT_PUBLIC_GITSTREAM_RECEIVER_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
```

**Vercel Settings:**
- Framework Preset: Next.js
- Root Directory: `apps/web`
- Build Command: `pnpm build`
- Output Directory: `.next`
- Install Command: `pnpm install --filter=web...`

### 3. CORS Configuration

The API now supports:

1. **Multiple origins**: Set `FRONTEND_URL` with comma-separated URLs
   ```
   FRONTEND_URL=https://app.example.com,https://www.example.com
   ```

2. **Vercel preview deployments**: All `*.vercel.app` domains are automatically allowed
   - This means preview branches will work without additional configuration

3. **Custom domains**: Add your production domain to the `FRONTEND_URL` list

### 4. Testing CORS

After deployment:

1. Open your frontend URL in a browser
2. Open DevTools Console
3. Try making an API call (e.g., login)
4. Check for CORS errors - they should be gone!

### Troubleshooting

**Still getting CORS errors?**

1. Verify `FRONTEND_URL` is set correctly in the API deployment
2. Check that the frontend is calling the correct API URL (`NEXT_PUBLIC_API_URL`)
3. Ensure credentials are included in fetch requests (should be handled by `apps/web/lib/api.ts`)
4. Check browser DevTools Network tab to see the actual Origin header being sent

**Preview deployments not working?**

The `*.vercel.app` pattern should catch all Vercel preview URLs. If it doesn't work:
- Add the specific preview URL to `FRONTEND_URL` (comma-separated)
- Check that the preview URL matches the pattern in [index.ts:38](apps/api/src/index.ts#L38)

## Monorepo Deployment (Alternative)

If you prefer deploying as a single project:

1. Deploy the entire monorepo to Vercel
2. Configure `vercel.json` to route API calls to the API app
3. Set the root directory to the monorepo root
4. CORS won't be needed as everything is on the same domain
