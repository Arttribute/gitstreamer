# Privy Authentication Setup Guide

This guide walks you through setting up Privy authentication for GitStream.

## Prerequisites

- A Privy account (sign up at https://dashboard.privy.io)
- Access to your GitStream monorepo

## Step 1: Get Privy Credentials

1. Go to [Privy Dashboard](https://dashboard.privy.io)
2. Create a new app or select your existing app
3. Navigate to **Settings** → **Basics**
4. Copy your:
   - **App ID** (public, starts with `clp...`)
   - **App Secret** (private, keep secure!)

## Step 2: Configure Backend (API)

1. Navigate to the API directory:
   ```bash
   cd apps/api
   ```

2. Open your `.env` file and add the Privy configuration:
   ```env
   # Privy Authentication
   PRIVY_APP_ID=your_privy_app_id_here
   PRIVY_APP_SECRET=your_privy_app_secret_here
   ```

3. **Important**: Keep your `PRIVY_APP_SECRET` secure and never commit it to version control

## Step 3: Configure Frontend (Web)

1. Navigate to the web directory:
   ```bash
   cd apps/web
   ```

2. Open your `.env.local` file and add (or verify):
   ```env
   # Privy Authentication
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
   ```

3. Note: The frontend only needs the App ID (not the secret)

## Step 4: Configure Privy Dashboard Settings

In your Privy Dashboard, configure the following:

### Allowed Domains
Add your application domains:
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

### Login Methods
Enable the methods you want users to use:
- ✅ Wallet (recommended)
- ✅ Email
- ✅ Google
- ✅ GitHub

### Embedded Wallets
Configure embedded wallet settings:
- Enable "Create on login" for users without wallets
- Set default chain to **Base Sepolia** (Chain ID: 84532)

### Supported Chains
Add the chains your app will use:
- Base Sepolia (testnet)
- Base (mainnet, when ready)

## Step 5: Restart Your Services

After configuring the environment variables:

1. Stop all running services
2. Restart the API:
   ```bash
   cd apps/api
   pnpm dev
   ```
3. Restart the frontend:
   ```bash
   cd apps/web
   pnpm dev
   ```

## Verification

To verify Privy is working correctly:

1. Open your app at `http://localhost:3000`
2. Click the **Connect** button
3. You should see the Privy login modal
4. After authenticating, try creating a new project
5. Check the API logs - you should see successful authentication

## Troubleshooting

### "Authentication required" Error

**Cause**: Backend missing Privy credentials or credentials are incorrect

**Solution**:
1. Verify `PRIVY_APP_ID` and `PRIVY_APP_SECRET` are set in `apps/api/.env`
2. Restart the API server
3. Check API logs for detailed error messages

### "Invalid or expired authentication token"

**Cause**: Token verification failed

**Solutions**:
- Verify the App ID matches between frontend and backend
- Check that the App Secret is correct
- Ensure the token hasn't expired (auto-refresh should handle this)
- Verify your app domain is whitelisted in Privy Dashboard

### "No linked wallet account"

**Cause**: User authenticated without a wallet

**Solutions**:
- Enable embedded wallets in Privy Dashboard
- Configure "Create on login: users-without-wallets"
- Ask user to connect a wallet in Privy modal

## Architecture Overview

### Frontend Flow
1. User clicks "Connect" → Privy modal opens
2. User authenticates via wallet/email/social
3. Privy creates a session and returns an access token
4. Frontend stores token and includes it in API requests:
   ```tsx
   const token = await getAccessToken();
   fetch('/api/projects', {
     headers: { 'Authorization': `Bearer ${token}` }
   });
   ```

### Backend Flow
1. API receives request with `Authorization: Bearer {token}` header
2. Auth middleware extracts the token
3. Privy SDK verifies the token signature and expiration
4. Gets user data from Privy (including wallet address)
5. Stores wallet address in request context
6. Route handler uses `c.get('walletAddress')` to access authenticated user

## Security Best Practices

1. **Never commit secrets**: Add `.env` to `.gitignore`
2. **Use different keys**: Use separate Privy apps for dev/staging/production
3. **Rotate secrets**: Periodically rotate your App Secret
4. **Monitor usage**: Check Privy Dashboard for unusual activity
5. **Validate on backend**: Always verify tokens on the backend, never trust client

## Resources

- [Privy Documentation](https://docs.privy.io)
- [Privy React SDK](https://docs.privy.io/guide/react)
- [Server-side Verification](https://docs.privy.io/guide/server/authorization)
- [Access Tokens](https://docs.privy.io/authentication/user-authentication/access-tokens)
- [Authorization Guide](https://docs.privy.io/guide/react/authorization)

## Support

If you continue to experience issues:
1. Check the detailed error logs in your API console
2. Review the Privy Dashboard logs
3. Consult the [Privy Discord community](https://discord.gg/privy)
