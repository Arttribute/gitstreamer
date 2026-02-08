# GitStream Setup Guide

This guide will walk you through setting up and running the GitStream project locally and deploying to Base Sepolia testnet.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Git**
- **MongoDB** (local or MongoDB Atlas account)

## 🔑 Required Accounts & API Keys

You'll need to set up accounts and obtain API keys for:

1. **GitHub OAuth App** - For repository access
2. **MongoDB** - Database for storing project data
3. **Privy** - For wallet authentication (privy.io)
4. **Yellow Network** - For payment streaming (testnet access)
5. **Alchemy or Infura** - For Base Sepolia RPC access
6. **Base Sepolia Testnet Wallet** - With some ETH for gas

---

## 🚀 Step-by-Step Setup

### 1. Install Dependencies

```bash
# From the project root
cd /Users/bashybaranaba/gitstreamer
pnpm install
```

### 2. Set Up MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB Community Edition
brew install mongodb-community
brew services start mongodb-community

# MongoDB will be available at: mongodb://localhost:27017
```

**Option B: MongoDB Atlas (Recommended for production)**
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get your connection string
4. Replace in `.env` files

### 3. Create GitHub OAuth App

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: GitStream Local Dev
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID** and **Client Secret**

### 4. Set Up Privy (Wallet Auth)

1. Go to [privy.io](https://privy.io) and sign up
2. Create a new app
3. Configure:
   - Add **Base Sepolia** as supported chain
   - Enable **Wallet** login method
4. Copy your **App ID** from the dashboard

### 5. Get Yellow Network API Key

1. Contact Yellow Network for testnet access
2. Get your API key for the sandbox environment
3. Documentation: [Yellow Network Docs](https://docs.yellow.org)

### 6. Configure Environment Variables

**Backend API** (`apps/api/.env`):

```bash
# Server
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/gitstream
# Or for Atlas: mongodb+srv://username:password@cluster.mongodb.net/gitstream

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

# Yellow Network
YELLOW_API_KEY=your_yellow_api_key_here
YELLOW_NETWORK_URL=wss://clearnet-sandbox.yellow.com/ws

# Contracts (will be filled after deployment)
GITSTREAM_RECEIVER_ADDRESS=
USDC_ADDRESS=
DEPLOYER_PRIVATE_KEY=your_wallet_private_key_here

# Chain
CHAIN_ID=84532
RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Auth
JWT_SECRET=change-this-to-a-secure-random-string-in-production

# Frontend
FRONTEND_URL=http://localhost:3000

# Optional: Allow wallet header for testing
ALLOW_WALLET_HEADER=true
```

**Frontend Web** (`apps/web/.env.local`):

```bash
# API URL (Backend)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here

# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=84532

# Contract Addresses (will be filled after deployment)
NEXT_PUBLIC_GITSTREAM_RECEIVER_ADDRESS=
NEXT_PUBLIC_USDC_ADDRESS=
```

### 7. Deploy Smart Contracts

```bash
cd contracts

# Compile contracts
pnpm hardhat compile

# Deploy to Base Sepolia
pnpm hardhat run ignition/modules/GitStreamReceiver.ts --network base-sepolia

# The script will output contract addresses - copy them!
```

**Update your `.env` files with the deployed contract addresses:**
- Add `GITSTREAM_RECEIVER_ADDRESS` to both API and Web `.env` files
- Add `USDC_ADDRESS` (MockUSDC address for testnet)

### 8. Get Base Sepolia Testnet ETH

1. Go to [Alchemy Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
2. Connect your wallet
3. Request testnet ETH for gas fees

### 9. Initialize MongoDB Indexes

The indexes will be created automatically when you start the API server for the first time. The `createIndexes` function runs on startup.

### 10. Start the Development Servers

**Terminal 1 - Start Backend API:**
```bash
cd /Users/bashybaranaba/gitstreamer
pnpm --filter api dev
```

You should see:
```
GitStream API running on http://localhost:3001
Frontend URL: http://localhost:3000
```

**Terminal 2 - Start Frontend:**
```bash
cd /Users/bashybaranaba/gitstreamer
pnpm --filter web dev
```

You should see:
```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
```

**Terminal 3 - Start Event Listener (Optional):**
```bash
cd /Users/bashybaranaba/gitstreamer/apps/api
pnpm tsx src/services/contracts/listener.ts
```

---

## ✅ Verify Setup

### 1. Check API Health
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-08T..."
}
```

### 2. Check Database Connection
```bash
mongosh
use gitstream
show collections
```

You should see collections: `projects`, `contributors`, `contributorMetrics`, `revenue`

### 3. Test Frontend
1. Open [http://localhost:3000](http://localhost:3000)
2. You should see the GitStream landing page
3. Click "Connect Wallet" - Privy modal should appear

### 4. Test GitHub OAuth
1. Navigate to dashboard (after connecting wallet)
2. Try to create a new project
3. GitHub OAuth should redirect correctly

---

## 🎯 Using GitStream

### Create Your First Project

1. **Connect Wallet**
   - Click "Connect Wallet" on homepage
   - Connect via Privy (MetaMask, Coinbase Wallet, etc.)

2. **Link GitHub**
   - Go to Dashboard
   - Click "Create Project"
   - Authorize GitHub access
   - Select a repository

3. **Configure Tiers**
   - GitStream will analyze contributors
   - You'll see suggested tier assignments
   - Assign contributors to tiers:
     - Core Maintainers (40% revenue)
     - Active Contributors (35% revenue)
     - Community (15% revenue)
     - Treasury (10% reserved)

4. **Contributors Claim Wallets**
   - Contributors visit `/claim`
   - Sign in with GitHub
   - Connect their wallet
   - Now they can receive payments!

5. **Receive Revenue**
   - When your app generates revenue and sends it to GitStreamReceiver
   - The event listener detects it
   - Revenue is stored in database

6. **Create Streaming Session**
   - Go to project streams page
   - Click "Create Stream"
   - Yellow session is created
   - Payments stream to tier members!

---

## 🧪 Testing with the TipJar Demo

To demonstrate revenue flow:

1. **Deploy TipJar Contract** (separate demo repo)
   ```bash
   # In tipjar-demo repo
   pnpm hardhat run scripts/deploy.ts --network base-sepolia
   ```

2. **Connect TipJar to GitStream**
   - TipJar should be configured with GitStreamReceiver address
   - Register the tipjar-demo repo in GitStream

3. **Send a Tip**
   - Use the TipJar UI to send USDC
   - Watch GitStream detect the revenue
   - See tier-based allocations
   - Create stream and watch payments flow!

---

## 🔧 Troubleshooting

### API won't start
- Check MongoDB is running: `brew services list | grep mongodb`
- Verify `.env` file exists in `apps/api/`
- Check MongoDB connection string is correct

### Frontend can't connect to API
- Verify API is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `apps/web/.env.local`
- Check CORS settings in `apps/api/src/index.ts`

### GitHub OAuth fails
- Verify callback URL matches exactly in GitHub OAuth App settings
- Check `GITHUB_CALLBACK_URL` in backend `.env`
- Make sure you're using the correct Client ID and Secret

### Yellow Network connection fails
- Verify API key is correct
- Check Yellow Network status
- Ensure you're using sandbox URL for testnet

### Contract deployment fails
- Ensure wallet has Base Sepolia ETH
- Check RPC URL is correct
- Verify network in `hardhat.config.ts`

---

## 📊 Project Structure

```
gitstreamer/
├── apps/
│   ├── api/                    # Hono backend (port 3001)
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # Business logic
│   │   │   ├── db/             # MongoDB models
│   │   │   └── middleware/     # Auth, validation, etc.
│   │   └── .env
│   │
│   └── web/                    # Next.js frontend (port 3000)
│       ├── app/                # App Router pages
│       ├── components/         # React components
│       ├── hooks/              # Custom hooks
│       └── .env.local
│
├── contracts/                  # Solidity contracts
│   ├── contracts/              # Smart contract source
│   ├── test/                   # Contract tests
│   └── ignition/               # Deployment scripts
│
└── packages/                   # Shared packages (future)
```

---

## 🚀 What's Next?

### Remaining Frontend Pages to Implement

1. **`/project/[id]/page.tsx`** - Project overview dashboard
2. **`/project/[id]/contributors/page.tsx`** - Contributor management
3. **`/project/[id]/streams/page.tsx`** - Stream visualization
4. **`/project/new/page.tsx`** - Project creation form

### Future Enhancements

- ProvenanceKit integration for on-chain provenance
- Multi-chain support (Ethereum, Arbitrum, Optimism)
- Advanced tier governance (voting, councils)
- Non-code contribution tracking
- Real-time WebSocket updates for stream visualization

---

## 📚 Additional Resources

- [Plan Document](./sidequest-plan.md) - Full implementation plan
- [GitStream Contracts](./contracts/contracts/GitStreamReceiver.sol)
- [Yellow Network Docs](https://docs.yellow.org)
- [Base Sepolia Explorer](https://sepolia.basescan.org/)

---

## 🤝 Contributing

This is a hackathon project. Contributions are welcome!

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---

## 📝 License

ISC

---

**Need Help?** Check the troubleshooting section or review the plan document for detailed architecture information.
