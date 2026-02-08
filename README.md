# GitStream

**Revenue streaming for code contributors. Your code shipped. You get paid.**

GitStream is a tier-based revenue distribution platform that enables applications to fairly compensate their code contributors through continuous payment streams.GitStream uses human-governed tiers to align contributor incentives with project success.

🌐 **Live Deployment**: [https://www.gitstreamer.com/](https://www.gitstreamer.com/)
🔗 **API**: [https://gitstreamer-api.vercel.app/](https://gitstreamer-api.vercel.app/)

---

## The Idea

GitStream introduces **tier-based revenue sharing** where contributors are assigned to tiers (Core, Active, Community) by project owners based on role, commitment, and impact—not lines of code. When the project generates revenue, it's automatically distributed to contributors via continuous payment streams.

**Key Principles:**

- 🧑‍🤝‍🧑 **Human governance, not algorithms** - Project owners assign tiers based on judgment
- 🎯 **Aligned incentives** - Everyone benefits when the project succeeds
- ⚡ **Continuous streaming** - Revenue flows to contributors in real-time
- 💸 **Gasless payments** - Contributors receive funds without paying transaction fees

---

## How It Works

### Architecture Overview

GitStream is built as a **full-stack monorepo** with smart contracts, backend API, and web frontend:

```
gitstreamer/
├── apps/
│   ├── api/         # Hono API server (Node.js)
│   └── web/         # Next.js 16 frontend (App Router)
├── contracts/       # Solidity smart contracts
└── packages/        # Shared types and utilities (future)
```

### Tech Stack

**Frontend** ([apps/web/](apps/web/))

- **Next.js 16.1.6** with App Router - Modern React framework
- **Privy** - Wallet authentication and embedded wallets (email/social login)
- **wagmi** + **viem** - Ethereum interactions
- **ConnectKit** - Wallet connection UI
- **TanStack Query** - Data fetching and state management
- **Tailwind CSS** + **shadcn/ui** - Styling and components

**Backend** ([apps/api/](apps/api/))

- **Hono** - Lightweight web framework (runs on Node.js/Vercel)
- **MongoDB** - Database for projects, contributors, tiers
- **Privy Server SDK** - Auth verification
- **GitHub API** - Repository data and commit history
- **ethers.js** - Contract interactions

**Smart Contracts** ([contracts/](contracts/))

- **Solidity 0.8.28** - Contract language
- **Hardhat 3.1.5** - Development environment
- **OpenZeppelin** - Battle-tested contract libraries
- **Base Sepolia** - Deployment network (Ethereum L2)

### Yellow Network Integration

**GitStream leverages [Yellow Network's](https://yellow.org/) Nitrolite state channels for gasless, continuous payment streaming.**

Traditional blockchain payments require:

- Gas fees for every transaction (expensive for small amounts)
- On-chain settlement (slow, limited throughput)
- Users to pay transaction costs (barrier to adoption)

**Yellow Network solves this through state channels:**

1. **Off-chain streaming** - Payments flow continuously off-chain through state channels
2. **On-demand settlement** - Contributors can settle accumulated payments to Layer 1 when they choose
3. **Gasless for recipients** - GitStream's backend manages the channels, contributors receive funds without paying gas
4. **Real-time distribution** - Revenue is streamed to contributors as it's received, not in batches

**How it works in GitStream:**

```
App Revenue (USDC)
    ↓
GitStreamReceiver Contract (on-chain)
    ↓
Backend forwards to Yellow state channels (off-chain)
    ↓
Continuous streaming to contributor wallets (off-chain)
    ↓
Contributors settle to L1 when needed (on-demand)
```

The [`GitStreamReceiver`](contracts/contracts/GitStreamReceiver.sol) contract receives USDC revenue on-chain and holds it. The backend service (configured via `YELLOW_PRIVATE_KEY`) opens Yellow state channels and streams funds to contributors based on their tier percentages. Contributors accumulate payments off-chain and settle to Layer 1 at their convenience.

**Configuration:**

```env
# Yellow Network settings
YELLOW_PRIVATE_KEY=your_wallet_private_key
YELLOW_USE_SANDBOX=true  # Use testnet or production ClearNode
```

### Privy Authentication

**GitStream uses [Privy](https://privy.io/) for seamless wallet authentication and onboarding.**

Privy enables users to:

- Connect with any Web3 wallet (MetaMask, WalletConnect, etc.)
- Login with email, Google, or GitHub (no wallet required)
- Automatically create embedded wallets for users who don't have crypto wallets
- Authenticate on both frontend and backend (JWT verification)

**Why Privy?**

- Lowers the barrier to entry for non-crypto users
- Provides enterprise-grade security
- Handles wallet creation and recovery
- Unified authentication across web and mobile

**Configuration:**

```env
# Frontend
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Backend (for verification)
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
```

### Tier-Based Distribution

Projects define **revenue tiers** with customizable percentages:

| Tier                    | Default % | Description                         |
| ----------------------- | --------- | ----------------------------------- |
| **Core Maintainers**    | 40%       | Long-term stewards, major decisions |
| **Active Contributors** | 35%       | Regular, significant contributions  |
| **Community**           | 15%       | Occasional contributors, bug fixes  |
| **Treasury**            | 10%       | Infrastructure, bounties, growth    |

Project owners assign contributors to tiers manually through the dashboard. Git blame data provides transparency and context for decisions, but humans make the final call.

### Smart Contract Flow

1. **Register Project** - Owner calls `registerProject(repoUrl)` on [`GitStreamReceiver`](contracts/contracts/GitStreamReceiver.sol)
   - Creates unique project ID from `keccak256(repoUrl, owner)`
   - Stores project metadata on-chain

2. **Receive Revenue** - App sends USDC to contract via `receiveRevenue(projectId, amount)`
   - Transfers USDC from sender to contract
   - Updates project balance
   - Emits `RevenueReceived` event

3. **Stream to Contributors** - Backend service forwards funds to Yellow state channels
   - Calls `forwardFunds(projectId, yellowAddress, amount)`
   - Opens/updates state channels for each tier
   - Contributors receive continuous streams based on tier %

4. **Settlement** - Contributors settle their accumulated earnings
   - Close state channel on Yellow Network
   - Receive USDC on Base L2
   - Low-cost, on-demand settlement

**Contract Address (Base Sepolia):**

```
GITSTREAM_RECEIVER_ADDRESS=0x... (set in your .env)
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** and **pnpm 10+**
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **GitHub OAuth App** ([create here](https://github.com/settings/developers))
- **Privy Account** ([sign up](https://privy.io/))
- **Wallet with Base Sepolia testnet ETH** ([get testnet ETH](https://www.alchemy.com/faucets/base-sepolia))

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/gitstreamer.git
   cd gitstreamer
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   **For API** ([apps/api/.env](apps/api/.env.example)):

   ```env
   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/gitstream

   # Privy Auth
   PRIVY_APP_ID=your_privy_app_id
   PRIVY_APP_SECRET=your_privy_app_secret

   # GitHub OAuth
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

   # Yellow Network
   YELLOW_PRIVATE_KEY=your_wallet_private_key
   YELLOW_USE_SANDBOX=true

   # Contracts (deploy first or use existing)
   GITSTREAM_RECEIVER_ADDRESS=0x...
   USDC_ADDRESS=0x...  # Base Sepolia USDC

   # Chain
   CHAIN_ID=84532
   RPC_URL=https://sepolia.base.org

   # Auth
   JWT_SECRET=your-secure-random-secret

   # CORS
   FRONTEND_URL=http://localhost:3000
   ```

   **For Web App** ([apps/web/.env.local](apps/web/.env.local)):

   ```env
   # API URL
   NEXT_PUBLIC_API_URL=http://localhost:3001

   # Privy
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

   # Chain
   NEXT_PUBLIC_CHAIN_ID=84532

   # Contracts
   NEXT_PUBLIC_GITSTREAM_RECEIVER_ADDRESS=0x...
   NEXT_PUBLIC_USDC_ADDRESS=0x...
   ```

4. **Deploy smart contracts** (optional, or use existing deployment)

   ```bash
   cd contracts
   cp .env.example .env
   # Add your DEPLOYER_PRIVATE_KEY and BASE_SEPOLIA_RPC_URL
   pnpm hardhat ignition deploy ignition/modules/GitStreamReceiver.ts --network baseSepolia
   ```

5. **Start development servers**

   ```bash
   # From project root
   pnpm dev
   ```

   This starts:
   - API server at [http://localhost:3001](http://localhost:3001)
   - Web app at [http://localhost:3000](http://localhost:3000)

6. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## Creating and Connecting a Project

### Step 1: Connect Your Wallet

1. Visit [https://www.gitstreamer.com/](https://www.gitstreamer.com/) or your local instance
2. Click **"Connect Wallet"**
3. Choose your preferred method:
   - Wallet (MetaMask, WalletConnect, etc.)
   - Email (creates embedded wallet)
   - Social (Google, GitHub)
4. Authenticate with Privy

### Step 2: Create a Project

1. Navigate to **Dashboard** → **"Create Project"**
2. Enter your GitHub repository details:
   - **Repository URL**: `https://github.com/org/repo` or `org/repo`
   - **Project Name**: Display name for your project
   - **Description**: Brief description of what the project does
3. Click **"Create Project"**
4. The project is registered on-chain and stored in the database

### Step 3: Connect GitHub Repository

1. Go to **Project Settings** → **"Connect GitHub"**
2. Authorize GitStream to access your repository (read-only)
3. GitStream fetches:
   - Contributors list
   - Commit history
   - Git blame data (for transparency)
4. Contributors appear in your dashboard

### Step 4: Assign Contributors to Tiers

1. In **Project Settings** → **"Contributors"**:
   - View all detected contributors
   - See their commit counts and latest activity (for context)
   - Assign each contributor to a tier:
     - **Core Maintainers** (40%) - Long-term stewards
     - **Active Contributors** (35%) - Regular contributors
     - **Community** (15%) - Occasional contributors
   - Adjust tier percentages if needed
2. Click **"Save Changes"**

### Step 5: Integrate Revenue Streaming

To stream revenue from your application to contributors:

**Option A: Direct Contract Integration**

In your app's payment flow, send USDC to the `GitStreamReceiver` contract:

```typescript
import { ethers } from "ethers";

// Your app receives payment in USDC
const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
const receiver = new ethers.Contract(
  GITSTREAM_RECEIVER_ADDRESS,
  RECEIVER_ABI,
  signer,
);

// Approve GitStreamReceiver to spend USDC
await usdc.approve(GITSTREAM_RECEIVER_ADDRESS, amount);

// Send revenue to your project
await receiver.receiveRevenue(projectId, amount);
```

**Option B: API Integration**

Use GitStream's API to send revenue (backend handles on-chain transactions):

```typescript
const response = await fetch(
  "https://gitstreamer-api.vercel.app/api/projects/:id/revenue",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`, // Server-to-server auth
    },
    body: JSON.stringify({
      amount: "100.00", // USDC amount
      txHash: "0x...", // Your payment transaction hash (optional)
    }),
  },
);
```

**Option C: Manual Deposit**

For testing or manual revenue sharing:

1. Navigate to **Project Settings** → **"Add Revenue"**
2. Enter USDC amount
3. Approve transaction in your wallet
4. Confirm the deposit

### Step 6: Monitor Distribution

1. **Project Dashboard** shows:
   - Total revenue received
   - Current balance held in contract
   - Revenue streamed to contributors
   - Individual contributor earnings by tier

2. **Contributor View** (from `/claim`):
   - Contributors can see their accumulated earnings
   - Settle Yellow state channels to receive USDC on-chain
   - View payment history

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions to Vercel, including:

- Environment variables for production
- CORS configuration for separate API/web deployments
- MongoDB Atlas setup
- Contract deployment to Base Sepolia/Base Mainnet

**Quick Deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/gitstreamer)

---

## Project Structure

```
gitstreamer/
├── apps/
│   ├── api/                    # Backend API (Hono)
│   │   ├── src/
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── db/models/      # MongoDB models
│   │   │   ├── middleware/     # Auth, CORS, error handling
│   │   │   ├── lib/            # Utilities (contract-utils, github)
│   │   │   ├── config.ts       # Environment configuration
│   │   │   └── index.ts        # Server entry point
│   │   └── package.json
│   │
│   └── web/                    # Frontend (Next.js)
│       ├── app/                # App Router pages
│       │   ├── page.tsx        # Landing page
│       │   ├── dashboard/      # User dashboard
│       │   ├── project/        # Project pages
│       │   └── claim/          # Claim contributions
│       ├── components/         # React components
│       ├── hooks/              # Custom React hooks (TanStack Query)
│       ├── lib/                # Utilities (api client, wagmi config)
│       ├── providers/          # Context providers (Privy, wagmi)
│       └── package.json
│
├── contracts/                  # Smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── GitStreamReceiver.sol   # Main revenue receiver contract
│   │   └── interfaces/             # Contract interfaces
│   ├── test/                       # Contract tests
│   ├── scripts/                    # Deployment scripts
│   ├── hardhat.config.ts
│   └── package.json
│
├── packages/                   # Shared code (future)
│   └── types/                  # Shared TypeScript types
│
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # pnpm workspace configuration
└── package.json                # Root package.json
```

---

## API Routes

**Authentication**

- `POST /api/auth/privy` - Authenticate with Privy JWT
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/github/callback` - GitHub OAuth callback

**Projects**

- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `POST /api/projects/:id/revenue` - Add revenue to project
- `GET /api/projects/:id/contributors` - Get project contributors

**Contributors**

- `GET /api/contributors` - List contributors
- `POST /api/contributors` - Add contributor
- `PUT /api/contributors/:id` - Update contributor tier
- `GET /api/contributors/claim` - View claimable contributions

**Tiers**

- `GET /api/tiers/:projectId` - Get project tiers
- `PUT /api/tiers/:projectId` - Update tier configuration

**GitHub Integration**

- `GET /api/github/repos/:owner/:repo` - Fetch repo details
- `GET /api/github/repos/:owner/:repo/contributors` - Auto-detect contributors

---

## Testing

**Smart Contracts**

```bash
cd contracts
pnpm test
```

**API** (future)

```bash
cd apps/api
pnpm test
```

**Frontend** (future)

```bash
cd apps/web
pnpm test
```

---

## Technologies Deep Dive

### Why Yellow Network?

Traditional payment systems can't handle microtransactions efficiently:

- **Gas fees** often exceed the payment amount for small transactions
- **Batch settlements** create payment delays
- **On-chain limits** throttle payment throughput

Yellow Network's **Nitrolite state channels** enable:

- ⚡ **Real-time streaming** - Payments flow continuously, not in batches
- 💸 **Zero gas for recipients** - Contributors receive funds without paying fees
- 🔒 **Secured by Layer 1** - State channels are cryptographically secured
- 📈 **Unlimited throughput** - Off-chain scaling without congestion

This makes GitStream practical for distributing revenue from apps with many contributors receiving varied amounts.

### Why Privy?

Web3 onboarding is a major barrier:

- Most developers don't have crypto wallets
- Managing seed phrases is complex and risky
- Wallet connection UX is intimidating for newcomers

Privy solves this with:

- 🔐 **Embedded wallets** - Email/social login creates wallets automatically
- 🎯 **Unified auth** - Same authentication for Web3 and traditional users
- 🛡️ **Enterprise security** - MPC, key management, account recovery
- 🌐 **Multi-chain** - Works across Ethereum, Base, Optimism, etc.

Contributors can claim earnings without owning crypto or understanding wallets.

### Why Base?

[Base](https://base.org/) (Coinbase L2) provides:

- 💰 **Low fees** - ~$0.01 per transaction vs $10+ on Ethereum mainnet
- ⚡ **Fast finality** - 2-second block times
- 🔗 **EVM compatible** - Use existing Ethereum tools
- 🌍 **Mainstream reach** - Backed by Coinbase, bridging crypto and traditional finance

Perfect for frequent revenue distribution transactions.

---

## Contributing

GitStream is open source and welcomes contributions!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Want to contribute to GitStream itself?**
Connect this repository to GitStream and start earning from the project you're building! 🚀

---

## Security

- Smart contracts use OpenZeppelin's audited libraries
- ReentrancyGuard protects against reentrancy attacks
- Access controls restrict sensitive functions (onlyOwner, onlyProjectOwner)
- Privy provides enterprise-grade authentication
- MongoDB connection uses secure credentials
- CORS configured for production safety

**Found a security issue?** Please email security@gitstreamer.com (do not open a public issue).

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

- **Documentation**: [https://docs.gitstreamer.com](https://www.gitstreamer.com) (coming soon)
- **Discord**: [Join our community](https://discord.gg/gitstreamer) (coming soon)
- **Twitter**: [@GitStreamerHQ](https://twitter.com/gitstreamer) (coming soon)
- **Email**: support@gitstreamer.com

---

## Roadmap

- [ ] Yellow Network mainnet integration
- [ ] Multi-token support (ETH, USDT, DAI)
- [ ] Advanced analytics dashboard
- [ ] Automated tier suggestions based on git data
- [ ] Mobile app (iOS/Android)
- [ ] GitLab and Bitbucket support
- [ ] Governance tokens for project decisions
- [ ] Cross-chain revenue streaming

---

**Built with ❤️ by the open source community**

Your code shipped. You get paid. 🚀
