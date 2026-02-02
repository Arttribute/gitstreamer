# GitStream - Sidequest Implementation Plan

## Overview

**GitStreamer** is a tier-based revenue streaming platform that distributes app revenue to code contributors. When an app makes money, the people whose code powers it get paid—continuously and proportionally to their role and commitment.

---

## Problem Statement

**Code contributors don't share in the revenue their work generates.**

- Open source maintainers build critical infrastructure, earn nothing
- Team contributors get flat salaries regardless of project success
- Revenue from software doesn't flow back to the people who built it
- No transparent system connects "project success" to "contributor earnings"

**Why pay-per-contribution fails:**

```
Pay-per-line → Game the metrics → Bloated code → Misaligned incentives
```

The fundamental problem: **code quantity ≠ value**. A one-line security fix can be worth more than 1,000 lines of boilerplate. Metrics-based payment creates perverse incentives.

**GitStream's approach:**

```
Tier-based revenue sharing → Aligned incentives → Quality over quantity
```

Contributors are assigned to tiers (Core Maintainers, Active Contributors, Community). Each tier receives a percentage of revenue. As the project earns more, everyone earns more.

---

## Solution

GitStream connects git repositories to continuous revenue streams using a **tier-based model**:

1. **Define contribution tiers** - Create role-based tiers with revenue percentages
2. **Use git data as advisory input** - Git blame/diff provides visibility, not automatic payment calculation
3. **Human governance assigns tiers** - Project owners decide who belongs where, informed by data
4. **Register contributors** - Map git authors to wallet addresses
5. **Connect revenue source** - Link an on-chain app that generates revenue
6. **Stream payments** - Continuously distribute revenue to tier members via Yellow Network

### The Key Insight

> **"Git data tells you WHO contributed. Humans decide WHAT that contribution is worth."**

We reject the naive approach of "more lines = more money." Instead:

- Git data provides **visibility** and **transparency**
- Humans provide **judgment** and **governance**
- Tiers provide **stability** and **aligned incentives**

See [Addressing the Hard Problems](#addressing-the-hard-problems) for detailed analysis.

---

## Core Concepts

### Tier-Based Revenue Model

Instead of calculating payment from git metrics, GitStream uses **role-based tiers**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER-BASED REVENUE SHARING                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tier 1: Core Maintainers (40% of revenue)                      │
│  └── Long-term stewards, major architectural decisions          │
│  └── Example: 2 maintainers = 20% each                          │
│                                                                  │
│  Tier 2: Active Contributors (35% of revenue)                   │
│  └── Regular contributors with significant merged work          │
│  └── Example: 5 contributors = 7% each                          │
│                                                                  │
│  Tier 3: Community Contributors (15% of revenue)                │
│  └── Occasional contributors, bug fixes, small features         │
│  └── Split proportionally by recent contribution activity       │
│                                                                  │
│  Reserved: Project Treasury (10% of revenue)                    │
│  └── Infrastructure, bounties, future development               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key properties:**

- **Percentage-based**: Contributors earn a % of revenue, not fixed amounts
- **Scales with success**: If project earns $10K/month vs $100K/month, everyone benefits
- **Human-assigned tiers**: Project owner decides tier placement, informed by git data
- **Stable incentives**: No gaming metrics—focus on project success instead

### Git Data as Advisory Input

Git blame/diff is used for **visibility**, not automatic payment:

```typescript
interface ContributorVisibility {
  githubUsername: string;
  metrics: {
    linesOfCode: number;
    commits: number;
    filesModified: number;
    recency: Date;
  };
  // Advisory only—humans decide tier placement
  suggestedTier: "core" | "active" | "community" | "new";
}
```

**What git data helps with:**

- Identifying all contributors to a project
- Providing objective visibility into activity
- Suggesting tier placements (owner can accept/reject)
- Tracking contribution history over time

**What git data does NOT do:**

- Automatically calculate payment amounts
- Determine contribution "value"
- Override human governance decisions

### Tier Configuration

Each project configures its own tier structure:

```typescript
interface TierConfig {
  tiers: Array<{
    name: string; // e.g., "Core Maintainers"
    revenueShare: number; // Percentage (e.g., 40)
    splitMethod: "equal" | "weighted"; // How to split within tier
  }>;
  treasuryShare: number; // Percentage reserved for treasury
}

// Default configuration
const DEFAULT_TIERS: TierConfig = {
  tiers: [
    { name: "Core Maintainers", revenueShare: 40, splitMethod: "equal" },
    { name: "Active Contributors", revenueShare: 35, splitMethod: "equal" },
    { name: "Community", revenueShare: 15, splitMethod: "weighted" },
  ],
  treasuryShare: 10,
};
```

### Revenue Connection

An on-chain smart contract that:

1. Receives revenue (USDC) from some source
2. Is linked to a GitHub repository
3. Forwards revenue to GitStream for distribution by tier

### Payment Streaming

Using Yellow Network's state channels:

- Revenue flows continuously from the connected app
- GitStream calculates tier allocations in real-time
- Payments stream to tier members off-chain (gasless)
- Settlement happens on-chain periodically or on-demand

**Why streaming?** The money flows in constantly from the created software. Streaming distributes revenue as it arrives rather than batching into periodic payouts.

### Unclaimed Contributions

When a contributor hasn't linked their wallet:

- Their tier share accumulates in escrow
- They can claim anytime by linking wallet to their git identity
- After configurable period (default: 6 months), unclaimed funds go to project treasury
- Treasury can fund bounties, infrastructure, or future distributions

---

## Demo App Concept

To demonstrate GitStream, we need an on-chain app that earns USDC.

**Proposal: "TipJar" - A simple smart contract that accepts tips/donations**

```solidity
// Simplified concept
contract TipJar {
    address public gitStreamReceiver;
    string public repoUrl;

    function tip() external payable {
        // Convert to USDC and forward to GitStream
        // GitStream distributes to contributors
    }

    function setRepo(string calldata _repoUrl) external onlyOwner {
        repoUrl = _repoUrl;
    }
}
```

**Alternative demo apps:**

- Simple NFT mint where proceeds go to contributors
- API paywall where usage fees stream to contributors
- "Sponsor this repo" button that streams to contributors

For hackathon, TipJar is simplest to demo.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GITSTREAM SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐     │
│  │   Demo App      │      │   GitStream     │      │   GitStream     │     │
│  │   (TipJar)      │─────►│   Receiver      │─────►│   Backend       │     │
│  │   [Contract]    │      │   [Contract]    │      │   [Hono]        │     │
│  │ SEPARATE REPO   │      │                 │      │                 │     │
│  └─────────────────┘      └─────────────────┘      └────────┬────────┘     │
│                                                              │               │
│          Revenue flows in                                    │               │
│                                                              ▼               │
│                                    ┌─────────────────────────────────────┐  │
│                                    │         GitHub API                  │  │
│                                    │  • OAuth authentication             │  │
│                                    │  • Repository access                │  │
│                                    │  • Git blame analysis               │  │
│                                    └─────────────────────────────────────┘  │
│                                                              │               │
│                                                              ▼               │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐     │
│  │   GitStream     │◄─────│   Yellow        │◄─────│   Contributor   │     │
│  │   Frontend      │      │   Network       │      │   Registry      │     │
│  │   [Next.js]     │      │   [SDK]         │      │   [MongoDB]     │     │
│  └─────────────────┘      └─────────────────┘      └─────────────────┘     │
│                                                                              │
│         Dashboard                Payment streams          Git → Wallet      │
│                                                           mapping           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Repository Strategy

**Two separate repositories:**

1. **`gitstream`** - Main GitStream platform (monorepo)
2. **`tipjar-demo`** - Demo app showcasing GitStream integration (separate repo)

Why separate repos for demo app:

- Demonstrates real-world usage (external project integrating GitStream)
- The demo app's contributors will receive payments via GitStream
- More authentic demo: "Here's a real repo, watch its contributors get paid"
- Avoids circular dependency confusion

---

## Component Breakdown

### 1. Smart Contracts

#### GitStreamReceiver.sol

Receives USDC from connected apps and triggers distribution.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GitStreamReceiver {
    IERC20 public immutable usdc;

    struct Project {
        string repoUrl;
        address owner;
        bool active;
    }

    mapping(bytes32 => Project) public projects;

    event RevenueReceived(bytes32 indexed projectId, uint256 amount);
    event ProjectRegistered(bytes32 indexed projectId, string repoUrl);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    function registerProject(string calldata repoUrl) external returns (bytes32) {
        bytes32 projectId = keccak256(abi.encodePacked(repoUrl, msg.sender));
        projects[projectId] = Project({
            repoUrl: repoUrl,
            owner: msg.sender,
            active: true
        });
        emit ProjectRegistered(projectId, repoUrl);
        return projectId;
    }

    function receiveRevenue(bytes32 projectId, uint256 amount) external {
        require(projects[projectId].active, "Project not active");
        usdc.transferFrom(msg.sender, address(this), amount);
        emit RevenueReceived(projectId, amount);
        // Backend listens to this event and triggers Yellow distribution
    }

    // Called by backend after Yellow session is created
    function forwardToYellow(bytes32 projectId, address yellowSession, uint256 amount) external {
        // Only callable by authorized backend
        usdc.transfer(yellowSession, amount);
    }
}
```

#### TipJar.sol (Demo App - SEPARATE REPO)

> **Note:** This contract lives in the `tipjar-demo` repository, not in the GitStream monorepo.
> This demonstrates how external projects integrate with GitStream.

Simple contract that forwards tips to GitStreamReceiver.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGitStreamReceiver {
    function receiveRevenue(bytes32 projectId, uint256 amount) external;
}

contract TipJar {
    IERC20 public immutable usdc;
    address public immutable gitStreamReceiver;
    bytes32 public immutable projectId;
    string public repoUrl;

    event TipReceived(address indexed tipper, uint256 amount);

    constructor(
        address _usdc,
        address _gitStreamReceiver,
        bytes32 _projectId,
        string memory _repoUrl
    ) {
        usdc = IERC20(_usdc);
        gitStreamReceiver = _gitStreamReceiver;
        projectId = _projectId;
        repoUrl = _repoUrl;
    }

    function tip(uint256 amount) external {
        usdc.transferFrom(msg.sender, address(this), amount);
        usdc.approve(gitStreamReceiver, amount);
        IGitStreamReceiver(gitStreamReceiver).receiveRevenue(projectId, amount);
        emit TipReceived(msg.sender, amount);
    }

    // Allow tipping with native ETH (swaps to USDC internally - simplified for demo)
    receive() external payable {
        // In production: swap ETH → USDC via DEX, then call tip()
        // For demo: just emit event
        emit TipReceived(msg.sender, msg.value);
    }
}
```

### 2. Backend Service (Hono)

#### Core Modules

```
packages/api/
├── src/
│   ├── index.ts                 # Hono app entry point
│   ├── config.ts                # Environment config
│   │
│   ├── routes/
│   │   ├── index.ts             # Route aggregator
│   │   ├── projects.ts          # Project CRUD endpoints
│   │   ├── tiers.ts             # Tier configuration & assignment endpoints
│   │   ├── contributors.ts      # Contributor visibility endpoints
│   │   ├── claims.ts            # Wallet claim endpoints
│   │   ├── github.ts            # GitHub OAuth endpoints
│   │   ├── streams.ts           # Payment stream endpoints
│   │   └── webhooks.ts          # Contract event webhooks
│   │
│   ├── middleware/
│   │   ├── auth.ts              # Wallet/session authentication
│   │   ├── github-auth.ts       # GitHub OAuth middleware
│   │   ├── project-owner.ts     # Verify project ownership for tier changes
│   │   └── error-handler.ts     # Global error handling
│   │
│   ├── services/
│   │   ├── github/
│   │   │   ├── client.ts        # GitHub API client (Octokit)
│   │   │   ├── metrics.ts       # Git metrics analysis (advisory data)
│   │   │   ├── oauth.ts         # OAuth flow handlers
│   │   │   └── types.ts         # GitHub-specific types
│   │   │
│   │   ├── tiers/
│   │   │   ├── manager.ts       # Tier assignment and management
│   │   │   ├── allocation.ts    # Calculate tier-based allocations
│   │   │   ├── config.ts        # Default tier configurations
│   │   │   └── types.ts         # Tier types
│   │   │
│   │   ├── yellow/
│   │   │   ├── client.ts        # Yellow SDK wrapper
│   │   │   ├── sessions.ts      # Session management
│   │   │   └── streaming.ts     # Payment streaming by tier
│   │   │
│   │   └── contracts/
│   │       ├── listener.ts      # Event listener for RevenueReceived
│   │       └── interactions.ts  # Contract interactions (viem)
│   │
│   ├── db/
│   │   ├── client.ts            # MongoDB client
│   │   ├── models/
│   │   │   ├── project.ts       # Project model (with tierConfig)
│   │   │   ├── contributor.ts   # Contributor model (with tier assignment)
│   │   │   ├── metrics.ts       # Contributor metrics model (advisory)
│   │   │   ├── revenue.ts       # Revenue event model
│   │   │   └── escrow.ts        # Escrow model
│   │   └── indexes.ts           # MongoDB indexes
│   │
│   └── lib/
│       ├── errors.ts            # Custom error types
│       └── validation.ts        # Zod schemas for validation
│
├── package.json
└── tsconfig.json
```

#### Hono App Structure

```typescript
// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { projectRoutes } from "./routes/projects";
import { contributorRoutes } from "./routes/contributors";
import { githubRoutes } from "./routes/github";
import { streamRoutes } from "./routes/streams";
import { webhookRoutes } from "./routes/webhooks";
import { errorHandler } from "./middleware/error-handler";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());
app.use("*", prettyJSON());

// Routes
app.route("/api/projects", projectRoutes);
app.route("/api/contributors", contributorRoutes);
app.route("/api/github", githubRoutes);
app.route("/api/streams", streamRoutes);
app.route("/api/webhooks", webhookRoutes);

// Error handling
app.onError(errorHandler);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
```

#### Key Functions

```typescript
// github/blame.ts - For contributor visibility (advisory data)
interface ContributorMetrics {
  githubUsername: string;
  email: string;
  metrics: {
    linesOfCode: number;
    commits: number;
    filesModified: number;
    firstContribution: Date;
    lastContribution: Date;
  };
  suggestedTier: "core" | "active" | "community" | "new";
}

async function analyzeContributors(
  owner: string,
  repo: string,
  branch: string = "main"
): Promise<ContributorMetrics[]>;

// tiers/manager.ts - Tier assignment and management
interface TierConfig {
  tiers: Array<{
    name: string;
    revenueShare: number; // Percentage (0-100)
    splitMethod: "equal" | "weighted";
  }>;
  treasuryShare: number;
}

interface TierAssignment {
  githubUsername: string;
  tier: string;
  assignedAt: Date;
  assignedBy: string; // Wallet address of assigner
}

async function assignTier(
  projectId: string,
  githubUsername: string,
  tierName: string,
  assignedBy: string
): Promise<TierAssignment>;

async function getTierMembers(
  projectId: string,
  tierName: string
): Promise<Contributor[]>;

// tiers/allocation.ts - Calculate tier-based payment allocations
interface TierAllocation {
  tier: string;
  amount: bigint;
  members: Array<{
    walletAddress: Address;
    amount: bigint;
  }>;
}

function calculateTierAllocations(
  revenueAmount: bigint,
  tierConfig: TierConfig,
  tierMembers: Map<string, Contributor[]>
): TierAllocation[];

// yellow/streaming.ts
interface StreamConfig {
  projectId: string;
  totalAmount: bigint;
  token: Address;
  tierAllocations: TierAllocation[];
}

async function createStream(config: StreamConfig): Promise<SessionId>;
async function updateStreamAllocations(
  sessionId: string,
  tierAllocations: TierAllocation[]
): Promise<void>;
async function settleStream(sessionId: string): Promise<TxHash>;
```

### 3. Frontend Application (Next.js)

```
apps/web/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout (providers, etc.)
│   │   ├── globals.css
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # User dashboard (their projects)
│   │   │   └── loading.tsx
│   │   │
│   │   ├── project/
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Create new project (connect repo)
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Project overview
│   │   │       ├── contributors/
│   │   │       │   └── page.tsx        # Contributor list & management
│   │   │       └── streams/
│   │   │           └── page.tsx        # Active payment streams
│   │   │
│   │   ├── claim/
│   │   │   └── page.tsx                # Contributor claims their wallet
│   │   │
│   │   └── api/
│   │       └── auth/
│   │           └── github/
│   │               └── callback/
│   │                   └── route.ts    # GitHub OAuth callback
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── project/
│   │   │   ├── ContributionChart.tsx   # Pie/bar chart of contributions
│   │   │   ├── ContributorList.tsx     # List with claim status
│   │   │   └── RepoSelector.tsx        # GitHub repo picker
│   │   ├── streams/
│   │   │   ├── StreamStatus.tsx        # Real-time stream visualization
│   │   │   ├── StreamCard.tsx          # Individual stream display
│   │   │   └── RevenueChart.tsx        # Revenue over time
│   │   └── web3/
│   │       ├── WalletConnect.tsx       # Wallet connection (wagmi)
│   │       └── NetworkSwitcher.tsx     # Chain switcher
│   │
│   ├── hooks/
│   │   ├── useProject.ts               # Project data fetching
│   │   ├── useContributions.ts         # Contribution data
│   │   ├── useYellowStream.ts          # Yellow stream status
│   │   ├── useGitHub.ts                # GitHub auth state
│   │   └── useGitStreamContracts.ts    # Contract interactions
│   │
│   ├── lib/
│   │   ├── api.ts                      # Hono backend API client
│   │   ├── github.ts                   # GitHub OAuth helpers
│   │   ├── yellow.ts                   # Yellow SDK wrapper
│   │   └── utils.ts                    # Utility functions
│   │
│   └── providers/
│       ├── Web3Provider.tsx            # wagmi + RainbowKit setup
│       ├── GitHubProvider.tsx          # GitHub auth context
│       └── QueryProvider.tsx           # TanStack Query
│
├── public/
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

#### Key Pages

| Page                                            | Purpose                                         |
| ----------------------------------------------- | ----------------------------------------------- |
| **Landing** (`/`)                               | Explain GitStream, CTA to connect wallet & repo |
| **Dashboard** (`/dashboard`)                    | List user's projects with stream status         |
| **New Project** (`/project/new`)                | Connect GitHub, select repo/branch              |
| **Project Overview** (`/project/[id]`)          | Contribution breakdown, revenue stats           |
| **Contributors** (`/project/[id]/contributors`) | Manage contributors, see claim status           |
| **Streams** (`/project/[id]/streams`)           | Active payment streams, settlement              |
| **Claim** (`/claim`)                            | Contributors link GitHub to wallet              |

### 4. Database Schema (MongoDB)

```typescript
// db/models/project.ts
interface Project {
  _id: ObjectId;
  repoUrl: string; // e.g., "github.com/org/repo"
  repoOwner: string; // e.g., "org"
  repoName: string; // e.g., "repo"
  branch: string; // default: "main"
  ownerAddress: string; // Wallet address of project owner
  receiverContract?: string; // GitStreamReceiver deployment address
  projectIdBytes32?: string; // On-chain project ID
  yellowSessionId?: string; // Active Yellow session
  tierConfig: {
    tiers: Array<{
      name: string;
      revenueShare: number; // Percentage (0-100)
      splitMethod: "equal" | "weighted";
    }>;
    treasuryShare: number; // Percentage reserved for treasury
  };
  settings: {
    minDistributionAmount: string; // Minimum USDC to trigger distribution
    escrowExpiryDays: number; // Days until unclaimed funds go to treasury
  };
  createdAt: Date;
  updatedAt: Date;
}

// db/models/contributor.ts
interface Contributor {
  _id: ObjectId;
  projectId: ObjectId;
  githubUsername: string;
  githubId?: number; // GitHub user ID (more stable than username)
  githubEmail?: string;
  walletAddress?: string; // NULL if unclaimed
  tier?: string; // Assigned tier name (e.g., "Core Maintainers")
  tierAssignedAt?: Date; // When tier was last assigned
  tierAssignedBy?: string; // Who assigned the tier (owner wallet)
  claimedAt?: Date;
  createdAt: Date;
}

// db/models/contribution.ts (Advisory data - not used for payment calculation)
interface ContributorMetrics {
  _id: ObjectId;
  projectId: ObjectId;
  githubUsername: string;
  calculatedAt: Date;
  commitHash: string; // Git commit this was calculated at
  metrics: {
    linesOfCode: number;
    commits: number;
    filesModified: number;
    firstContribution: Date;
    lastContribution: Date;
  };
  suggestedTier: string; // Advisory suggestion based on activity
}

// db/models/revenue.ts
interface RevenueEvent {
  _id: ObjectId;
  projectId: ObjectId;
  amount: string; // Store as string to preserve precision
  tokenAddress: string;
  txHash: string;
  blockNumber: number;
  chainId: number;
  distributed: boolean; // Whether this has been distributed
  distributedAt?: Date;
  createdAt: Date;
}

// db/models/escrow.ts
interface Escrow {
  _id: ObjectId;
  projectId: ObjectId;
  githubUsername: string;
  amount: string; // Accumulated unclaimed amount
  tokenAddress: string;
  expiresAt: Date; // When funds go to treasury
  claimedAt?: Date;
  claimedTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

// db/indexes.ts
// Create indexes for common queries
async function createIndexes(db: Db) {
  // Projects
  await db.collection("projects").createIndex({ repoUrl: 1 }, { unique: true });
  await db.collection("projects").createIndex({ ownerAddress: 1 });

  // Contributors
  await db.collection("contributors").createIndex({ projectId: 1 });
  await db.collection("contributors").createIndex({ githubUsername: 1 });
  await db
    .collection("contributors")
    .createIndex({ projectId: 1, githubUsername: 1 }, { unique: true });
  await db
    .collection("contributors")
    .createIndex({ walletAddress: 1 }, { sparse: true });

  // Contributions
  await db.collection("contributions").createIndex({ projectId: 1 });
  await db.collection("contributions").createIndex({ calculatedAt: -1 });

  // Revenue
  await db.collection("revenue").createIndex({ projectId: 1 });
  await db.collection("revenue").createIndex({ txHash: 1 }, { unique: true });
  await db.collection("revenue").createIndex({ distributed: 1 });

  // Escrow
  await db.collection("escrow").createIndex({ projectId: 1 });
  await db.collection("escrow").createIndex({ githubUsername: 1 });
  await db.collection("escrow").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 } // TTL index for auto-cleanup (optional)
  );
}
```

---

## API Endpoints

### Projects

```
POST   /api/projects              # Create new project (connect repo)
GET    /api/projects              # List user's projects
GET    /api/projects/:id          # Get project details
PUT    /api/projects/:id          # Update project settings
PUT    /api/projects/:id/tiers    # Update tier configuration
DELETE /api/projects/:id          # Deactivate project
```

### Tiers

```
GET    /api/projects/:id/tiers                   # Get tier configuration
GET    /api/projects/:id/tiers/:tierName/members # Get tier members
POST   /api/projects/:id/tiers/assign            # Assign contributor to tier
DELETE /api/projects/:id/tiers/assign/:username  # Remove contributor from tier
```

### Contributors (Visibility Data)

```
GET    /api/projects/:id/contributors            # List contributors with metrics
POST   /api/projects/:id/contributors/refresh    # Refresh git metrics
GET    /api/projects/:id/contributors/:username  # Get contributor details
```

### Claims

```
POST   /api/contributors/claim                   # Claim contribution (link wallet)
GET    /api/contributors/me                      # Get current user's tier assignments
```

### Streams

```
GET    /api/projects/:id/streams                 # Get stream status by tier
POST   /api/projects/:id/streams/settle          # Trigger settlement
GET    /api/projects/:id/revenue                 # Revenue history
```

### GitHub

```
GET    /api/github/auth                          # Initiate OAuth
GET    /api/github/callback                      # OAuth callback
GET    /api/github/repos                         # List user's repos
GET    /api/github/repos/:owner/:repo/branches   # List branches
```

---

## Yellow Network Integration

### Session Lifecycle

```typescript
// 1. Create session when project receives first revenue
const session = await yellow.createSession({
  participants: tierMembers.map((m) => m.walletAddress),
  token: USDC_ADDRESS,
  chainId: 8453, // Base
});

// 2. When revenue comes in, allocate by tier
await yellow.allocate({
  sessionId: session.id,
  amount: revenueAmount,
  allocations: calculateTierAllocations(
    revenueAmount,
    project.tierConfig,
    tierMembers
  ),
});

// 3. Tier allocation calculation
function calculateTierAllocations(
  amount: bigint,
  config: TierConfig,
  members: TierMember[]
): Allocation[] {
  const allocations: Allocation[] = [];

  for (const tier of config.tiers) {
    const tierAmount = (amount * BigInt(tier.revenueShare)) / 100n;
    const tierMembers = members.filter((m) => m.tier === tier.name);

    if (tierMembers.length === 0) continue;

    if (tier.splitMethod === "equal") {
      const perMember = tierAmount / BigInt(tierMembers.length);
      tierMembers.forEach((m) =>
        allocations.push({
          participant: m.walletAddress,
          amount: perMember,
        })
      );
    } else {
      // Weighted by recent activity (for Community tier)
      // Uses git metrics as input for weighting within tier
    }
  }

  return allocations;
}

// 4. Contributors can withdraw anytime (off-chain)
// Yellow handles the streaming internally

// 5. Settle on-chain when needed
await yellow.settle({ sessionId: session.id });
```

### Event Flow

```
Revenue Received (on-chain event)
    │
    ▼
Backend detects event
    │
    ▼
Fetch tier configuration and member assignments
    │
    ▼
Calculate tier-based allocation amounts
    │
    ▼
Allocate to Yellow session
    │
    ▼
Yellow streams to tier members (off-chain)
    │
    ▼
Periodic or on-demand settlement (on-chain)
```

---

## MVP Scope (Hackathon)

### Must Have ✅

**GitStream Platform (main repo):**

- [ ] GitHub OAuth + repo connection
- [ ] Git blame analysis for **contributor visibility** (advisory data)
- [ ] **Tier-based revenue model:**
  - [ ] Default tier configuration (Core/Active/Community)
  - [ ] Project owner can assign contributors to tiers
  - [ ] Revenue split by tier percentages
- [ ] Contributor wallet linking (claim flow)
- [ ] Smart contract: GitStreamReceiver
- [ ] Yellow session creation + streaming by tier
- [ ] Basic dashboard: project overview, tiers, stream status

**TipJar Demo (separate repo):**

- [ ] TipJar smart contract deployed
- [ ] Simple tip UI
- [ ] Integration with GitStreamReceiver

**End-to-end demo:**

- [ ] Demo flow: tip → tier-based distribution → see streams

### Nice to Have 🎯

- [ ] Real-time stream visualization (WebSocket/polling)
- [ ] Multiple projects per user
- [ ] Suggested tier placement based on git metrics
- [ ] Escrow management UI
- [ ] Historical revenue charts

### Show as "Coming Soon" 🔮

**Tier improvements:**

- [ ] Custom tier configurations
- [ ] Time-based tier graduation
- [ ] Non-code contribution tracking (docs, reviews, issues)
- [ ] Contributor self-nomination for tier changes

**Platform expansion:**

- [ ] GitLab / Bitbucket support
- [ ] ProvenanceKit integration
- [ ] Cross-project attribution (shared dependencies)

**Governance features:**

- [ ] Contributor councils for tier decisions
- [ ] Dispute resolution for tier assignments
- [ ] Voting on tier configuration changes

---

## Demo Script (Hackathon)

### Pre-Demo Setup (done before recording)

- GitStream deployed (contracts + web app)
- TipJar demo repo created with 3+ contributors
- Contributors assigned to tiers (1 Core, 2 Active, 1 Community)
- TipJar contract deployed, linked to GitStreamReceiver
- Testnet USDC in demo wallets

### Demo Flow (2-3 minutes)

**1. The Problem (20 sec)**

- "Developers write code, apps make money, contributors get... nothing"
- Show a GitHub repo with multiple contributors
- "These 4 people built this. When it makes money, how do they get paid fairly?"

**2. Connect to GitStream (30 sec)**

- Open GitStream dashboard
- "Connect Wallet" → "Add Project"
- GitHub OAuth → Select `tipjar-demo` repo
- Show contributor visibility from git analysis
- "GitStream identifies contributors—but humans decide the tiers"

**3. Set Up Tiers (30 sec)**

- Show tier configuration: Core (40%), Active (35%), Community (15%), Treasury (10%)
- Assign contributors: "Alice is Core, Bob and Carol are Active, Dave is Community"
- "Tiers align incentives—everyone benefits when the project succeeds"

**4. Contributors Claim (20 sec)**

- "Contributors link their GitHub to their wallet"
- Demo one contributor claiming
- Show tier assignment visible to contributor

**5. Revenue Flows In (45 sec)**

- Switch to TipJar demo app
- "Someone wants to support this project..."
- Send 100 USDC tip
- Switch back to GitStream dashboard
- Show revenue event detected in real-time
- Show tier-based allocation: Core: $40, Active: $35, Community: $15, Treasury: $10
- Show streams beginning to flow to tier members

**6. Watch the Streams (20 sec)**

- Real-time visualization of payments streaming
- "Alice (Core) earns 40%, Bob and Carol (Active) split 35%..."
- "This continues as long as revenue flows in"

**7. Settlement (20 sec)**

- "When contributors want their money on-chain..."
- Click "Settle Session"
- Show transaction confirming
- Show USDC balance in contributor wallet

**8. Closing (15 sec)**

- "Your code shipped. You got paid. Based on your role, not your line count."
- Quick flash of ProvenanceKit integration roadmap
- "GitStream - Tier-based revenue streaming for code contributors"

---

## ProvenanceKit Integration (Post-Hackathon)

### Phase 1: Use @provenancekit/git

Replace custom GitHub blame analysis with ProvenanceKit's git package:

```typescript
// Before (custom)
import { analyzeBlame } from "./github/blame";
const weights = await analyzeBlame(owner, repo, branch);

// After (ProvenanceKit)
import { analyzeBlame } from "@provenancekit/git";
const blame = await analyzeBlame(repoPath, { branch });
const distribution = blame.toDistribution();
```

**Benefits:**

- AI co-author detection built in
- Multiple git providers (not just GitHub)
- Standardized contribution tracking
- Provenance records for each contribution

### Phase 2: Use @provenancekit/extensions

Store contribution data using ProvenanceKit's extension system:

```typescript
import { withContrib, withPayment } from "@provenancekit/extensions";

// Each contributor attribution gets extensions
const attribution = withContrib(baseAttribution, {
  weight: contributorWeight,
  basis: "points",
  source: "git-blame",
  category: "code",
});

const withPaymentInfo = withPayment(attribution, {
  recipient: contributorWallet,
  method: "yellow-stream",
  chainId: 8453,
});
```

### Phase 3: Use @provenancekit/payments

Swap Yellow-specific code for ProvenanceKit's payment adapters:

```typescript
import { calculateDistribution } from "@provenancekit/extensions";
import { YellowStreamAdapter } from "@provenancekit/payments/adapters/yellow";

const distribution = calculateDistribution(resourceRef, attributions);
const adapter = new YellowStreamAdapter();

await adapter.distribute({
  distribution,
  amount: revenueAmount,
  token: USDC_ADDRESS,
  chainId: 8453,
  // ... wallet clients
});
```

**This means GitStream becomes a reference implementation for ProvenanceKit + Yellow payments.**

### Phase 4: On-Chain Provenance

Use ProvenanceKit contracts to record contribution provenance on-chain:

```typescript
import { ProvenanceRegistry } from "@provenancekit/contracts";

// Record each revenue distribution as a provenance action
await registry.recordAction({
  type: "revenue-distribution",
  resource: projectCid,
  attributions: contributorAttributions,
  extensions: {
    "ext:payment@1.0.0": paymentDetails,
    "ext:onchain@1.0.0": { chainId, txHash },
  },
});
```

### Phase 5: Self-Hosted Git (ProvenanceKit Native)

The ultimate vision: a git server that natively tracks provenance.

```
┌─────────────────────────────────────────────────────────────────┐
│              PROVENANCEKIT-NATIVE GIT SERVER                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  git push origin main                                            │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Pre-receive hook:                                        │    │
│  │   • Analyze commit contributions                         │    │
│  │   • Detect AI assistance                                 │    │
│  │   • Create provenance records                            │    │
│  │   • Update contribution weights                          │    │
│  │   • Trigger payment stream adjustments                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  Contribution automatically tracked, payments automatically      │
│  adjusted—no external integration needed                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Beyond GitHub: Git Provider Abstraction

### Architecture

```typescript
// Core interface that all git providers implement
interface IGitProvider {
  // Authentication
  authenticate(credentials: AuthCredentials): Promise<void>;

  // Repository operations
  listRepos(): Promise<Repository[]>;
  getRepo(owner: string, name: string): Promise<Repository>;

  // Contribution analysis
  getBlame(repo: Repository, path: string, ref?: string): Promise<BlameData>;
  getDiff(repo: Repository, base: string, head: string): Promise<DiffData>;
  getCommits(repo: Repository, options?: CommitOptions): Promise<Commit[]>;

  // Author information
  getAuthor(identifier: string): Promise<Author>;

  // Webhooks (optional)
  registerWebhook?(repo: Repository, events: string[]): Promise<WebhookId>;
}

// Implementations
class GitHubProvider implements IGitProvider { ... }
class GitLabProvider implements IGitProvider { ... }
class BitbucketProvider implements IGitProvider { ... }
class LocalGitProvider implements IGitProvider { ... }  // For self-hosted
class ProvenanceKitGitProvider implements IGitProvider { ... }  // Native
```

### Migration Path

```
Hackathon:     GitHub only (GitHubProvider)
                    │
Post-hackathon:     Add GitLab (GitLabProvider)
                    │
Later:              Add abstraction layer
                    │
ProvenanceKit:      Native git with built-in provenance
```

---

## Addressing the Hard Problems

### Why Most Projects Don't Do This (And How We Address It)

The idea of streaming payments to code contributors sounds fair and elegant — but in practice it's technically hard, socially tricky, and economically risky. Here's how GitStream's **tier-based model** addresses each challenge:

---

### Problem 1: Code Quantity ≠ Value

**The Issue:**

- Lines of code, commits, and PRs are bad proxies for real value
- Deleting 1,000 lines of buggy code might be more valuable than writing 1,000 new ones
- A small security fix could save millions
- Architecture design often happens in discussions, not commits

**The Fatal Flaw of Pay-Per-Metric:**
Any automated metric can and will be gamed. If you pay per line, people write verbose code. If you pay per commit, people make tiny commits. The metric becomes the goal, not the actual value delivered.

**GitStream's Tier-Based Solution:**

| Approach          | Problem                   | Our Solution                                  |
| ----------------- | ------------------------- | --------------------------------------------- |
| Pay per line      | Incentivizes bloat        | Tier-based: no line counting for payment      |
| Pay per commit    | Incentivizes tiny commits | Tier-based: role matters, not activity volume |
| Automated metrics | Can be gamed              | Human governance assigns tiers                |
| No attribution    | Contributors get nothing  | Visible, fair tier percentages                |

**Key insight:** Tiers decouple payment from metrics. Git data provides **visibility** for tier decisions, but humans decide tier placement based on holistic judgment of role and commitment.

**Tier benefits:**

- Core maintainer who writes 10 lines of critical code = still Core tier
- Active contributor who refactors 1000 lines = still Active tier
- No incentive to game metrics—focus shifts to project success

---

### Problem 2: Non-Code Contributions Are Undervalued

**The Issue:**

- Documentation, bug reports, code reviews, community support, design, testing
- If money flows mainly to "code producers," you undervalue maintainers and discourage non-code work

**GitStream Approach:**

**MVP:** Acknowledge this limitation explicitly. Git blame is a starting point, not the end state.

**Future (with ProvenanceKit):**

```
Contribution Graph nodes include:
├── Code commits (git blame)
├── Documentation (doc file authorship)
├── Code reviews (PR review attribution)
├── Issue triage (issue management)
├── Design work (linked design files)
├── Community support (off-platform, manually attributed)
└── Testing (test authorship, coverage impact)
```

**ProvenanceKit's ext:contrib@1.0.0 supports categories:**

```typescript
withContrib(attribution, {
  weight: 1500,
  basis: "points",
  source: "manual", // or "git-blame", "review-count", etc.
  category: "documentation", // or "code", "design", "review", "community"
});
```

**UI Feature (V2):** Project owners can add "off-chain" contributions manually with categories and weights.

---

### Problem 3: Gaming and Perverse Incentives

**The Issue:**

- Automated metric-based systems reward quantity over quality
- Leads to bloated code, rushed contributions, metric chasing
- People compete instead of collaborate, hoard work instead of helping

**Specific gaming vectors in pay-per-metric systems:**

- Committing commented-out code
- Excessive whitespace/blank lines
- Verbose code style (splitting simple operations across many lines)
- Auto-generated boilerplate
- Unnecessary files (duplicate configs, etc.)
- Self-approving PRs

**Why Anti-Gaming Measures Are a Losing Battle:**

```
Gaming Problem → Add Filter → New Gaming Vector → Add Another Filter → ...
```

Every filter creates new gaming strategies. You can't out-engineer human creativity in gaming metrics.

**GitStream's Tier-Based Solution:**

> **"The best way to prevent metric gaming is to not pay based on metrics."**

Tiers solve the gaming problem at the root:

```
┌─────────────────────────────────────────────────────────────────┐
│                  WHY TIERS PREVENT GAMING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Old model: More lines → More money                              │
│  Gaming strategy: Write verbose code                             │
│                                                                  │
│  Tier model: Role determines earnings, not metrics               │
│  Gaming strategy: ??? (can't game your way to Core Maintainer)  │
│                                                                  │
│  The only way to "game" tiers is to actually become more         │
│  valuable to the project—which is exactly what we want!          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Tier-based incentive alignment:**

| Scenario           | Pay-Per-Line Incentive      | Tier Incentive                          |
| ------------------ | --------------------------- | --------------------------------------- |
| Small critical fix | Don't bother (low payout)   | Do it (tier status, project success)    |
| Code review        | Skip it (no lines added)    | Do it (reputation for tier advancement) |
| Refactoring        | Avoid (might reduce lines)  | Do it (project quality helps everyone)  |
| Helping others     | Never (helps their metrics) | Yes (collaboration valued for tiers)    |

**How tiers work in practice:**

1. **Core Maintainer tier** - Not based on line count, but on:

   - Long-term commitment to project
   - Architectural decisions
   - Community trust
   - Assigned by project owner or governance

2. **Active Contributor tier** - Not based on line count, but on:

   - Consistent merged contributions
   - Quality of work
   - Assigned by project owner

3. **Community tier** - May use git metrics for **within-tier weighting** only:
   - Recent activity helps split the Community tier pool
   - Still no incentive to game—just determines split within 15%

**Transparency as a feature, not a defense:**

Git data is still public and visible—but as **context for tier decisions**, not as payment calculation. Everyone can see contribution history when discussing tier assignments.

---

### Problem 4: Legal and Tax Complexity

**The Issue:**

- Contributors globally receiving continuous micro-payments
- Are they employees? Contractors? Donors? Income recipients?
- Tax reporting, labor laws, international compliance

**GitStream Approach:**

**1. Opt-in model:**

- Contributors must explicitly claim their wallet and agree to terms
- Terms clarify: "This is a grant/bounty, not employment"
- Contributors responsible for their own tax obligations

**2. Threshold-based payouts:**

- Don't stream micro-payments continuously
- Accumulate until minimum threshold (e.g., $50)
- Payout on-demand or at intervals (weekly/monthly)
- Reduces transaction complexity and reporting burden

**3. Fiscal host integration (V2):**

- Partner with Open Collective, Gitcoin, or similar
- They handle compliance, tax forms, international payments
- GitStream handles attribution, fiscal host handles money movement

**4. Clear documentation:**

- Every payout includes attribution breakdown
- Exportable records for tax purposes
- Clear audit trail via on-chain settlement

---

### Problem 5: Funding is Usually Irregular

**The Issue:**

- Open source money comes as grants, sponsorships, donations, company backing
- These are bursty and unpredictable
- Streaming assumes stable recurring revenue

**GitStream Approach:**

**Stream from a shared pool, not per action:**

```
Revenue Event (tip, grant, sponsorship)
    │
    ▼
Funding Pool (accumulates)
    │
    ▼
Distribution based on current contribution shares
    │
    ▼
Yellow session (streams to contributors)
```

**Key insight:** We stream the _distribution_ of whatever revenue exists, not a constant rate.

- When $1,000 comes in → distribute according to weights
- When $10 comes in → same proportional distribution
- When nothing comes in → nothing to distribute

**This works with:**

- ✅ One-time tips
- ✅ Recurring sponsorships
- ✅ Bursty grants
- ✅ Revenue share from product sales

---

### Problem 6: Damaging Collaboration Culture

**The Issue:**

- If every commit has money attached, people compete instead of collaborate
- Hoard work instead of helping
- Rush instead of review
- Turns community into gig economy

**GitStream Approach:**

**1. Reward maintained value, not raw output:**

- Focus on "who is responsible for parts people actually use and depend on"
- Long-lived contributions earn more than throwaway features
- Encourages stewardship, not churn

**2. Team/collective attribution:**

- Allow attribution to teams, not just individuals
- "Core maintainers" can share a collective weight
- Encourages collaboration within teams

**3. Review rewards (V2):**

- Reviewers get attribution for code they review
- Incentivizes helping others, not just writing your own code
- Quality gates become valued, not bottlenecks

**4. Transparency:**

- All attribution is visible to all contributors
- Disputes happen in the open
- Community can self-correct bad incentives

**5. Gradual rollout:**

- Don't go from $0 to full streaming overnight
- Start with small % of revenue streamed
- Let culture adapt

---

### The Deeper Truth

> **The hard part is NOT sending money.** > **The hard part is answering: Who deserves how much — and why?**

That's a **governance problem**, not a metrics problem. And governance requires humans.

GitStream's tier-based approach acknowledges this by:

1. **Making humans central** — tiers are assigned by project owners, not calculated by algorithms
2. **Using data as input** — git metrics inform decisions but don't make them
3. **Aligning incentives** — everyone benefits from project success, not metric gaming
4. **Building toward ProvenanceKit** — more sophisticated provenance over time

The payment rails (Yellow) are indeed the easy part. The hard part is fair attribution—and the answer is human governance, not better algorithms.

---

### Why This is Becoming Possible Now

Historically we lacked:

- ❌ Cheap continuous payments
- ❌ Good governance frameworks
- ❌ Transparent contribution visibility

Now we have:

- ✅ Programmable finance (Yellow, Superfluid, etc.)
- ✅ DAO tooling and governance patterns
- ✅ Detailed version control histories for visibility
- ✅ Community acceptance of tier-based models (Patreon, Discord roles, etc.)

**The missing piece:** Combining transparent visibility with human governance for code contribution.

**That's what GitStream provides** — git data for visibility, tiers for fair distribution.

---

### GitStream's Maturity Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GITSTREAM MATURITY LEVELS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LEVEL 0: Manual                                                             │
│  └── Project owner manually decides who gets what                            │
│      (Status quo for most projects—opaque and inconsistent)                  │
│                                                                              │
│  LEVEL 1: Tier-Based with Visibility (GitStream MVP)                         │
│  └── Configurable tiers with revenue percentages                             │
│  └── Git data provides visibility into contribution activity                 │
│  └── Project owner assigns contributors to tiers                             │
│  └── "Fair tiers, transparent data, human decisions"                         │
│                                                                              │
│  LEVEL 2: Governed Tiers                                                     │
│  └── Contributor council helps decide tier placements                        │
│  └── Tier change proposals and voting                                        │
│  └── Dispute resolution process                                              │
│                                                                              │
│  LEVEL 3: Multi-Signal Visibility                                            │
│  └── Non-code contributions tracked (reviews, docs, issues)                  │
│  └── Richer data informs tier decisions                                      │
│  └── Still human-governed tier assignments                                   │
│                                                                              │
│  LEVEL 4: Full Provenance Graph (ProvenanceKit Native)                       │
│  └── Every contribution is a node in provenance graph                        │
│  └── Dependencies, derivatives, and impact tracked                           │
│  └── Cross-project attribution (shared libraries, dependencies)              │
│  └── AI-assisted tier recommendations with human approval                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Hackathon target:** Level 1 with basic tier assignment UI

---

## Security Considerations

### GitHub OAuth Scopes

- `read:user` - Get user profile
- `repo` - Access repository data (needed for private repos)
- Consider read-only scope for public repos

### Wallet Verification

- Contributors must prove wallet ownership (sign message)
- Consider ENS integration for easier identification

### Contract Security

- GitStreamReceiver should be non-custodial where possible
- Minimal attack surface (receive → forward pattern)
- Consider timelock for large distributions

### Revenue Manipulation

- Rate limiting on revenue events
- Minimum threshold for distributions
- Anomaly detection for suspicious patterns

---

## Open Questions

1. **Multi-chain support** - Start with Base only, or support multiple chains from day 1?

2. **Token support** - USDC only, or also ETH/other tokens?

3. **Minimum distribution** - What's the minimum revenue amount to trigger distribution? (Gas efficiency)

4. **Contribution refresh frequency** - On every commit? Daily? Manual only?

5. **Private repos** - Support private repos with contribution tracking? Privacy implications?

6. **Forked repos** - How to handle contributions that came from upstream forks?

---

## Timeline (Hackathon)

| Day | Focus                                      |
| --- | ------------------------------------------ |
| 1   | Smart contracts + basic backend structure  |
| 2   | GitHub integration + contribution analysis |
| 3   | Yellow SDK integration + streaming         |
| 4   | Frontend dashboard                         |
| 5   | Polish + demo prep + video                 |

---

## Tech Stack Summary

| Component | Technology                                    |
| --------- | --------------------------------------------- |
| Frontend  | Next.js 14, TypeScript, Tailwind, wagmi, viem |
| Backend   | Hono, Node.js, TypeScript                     |
| Database  | MongoDB                                       |
| Contracts | Solidity, Hardhat, OpenZeppelin               |
| GitHub    | Octokit (@octokit/rest)                       |
| Yellow    | Yellow SDK / Nitrolite                        |
| Chain     | Base (primary), other EVM chains later        |
| Monorepo  | Turborepo                                     |

---

## Success Metrics (Hackathon)

- [ ] Complete demo flow works end-to-end
- [ ] At least one real repo connected with real contributions
- [ ] Revenue flows and streams visible in real-time
- [ ] Clean 2-3 minute demo video
- [ ] Code is clean enough to continue post-hackathon

---

## Repository Structure

### Main Repository: `gitstream`

```
gitstream/
├── apps/
│   └── web/                          # Next.js frontend + API routes
│       ├── src/
│       │   ├── app/                  # Next.js App Router
│       │   │   ├── page.tsx          # Landing page
│       │   │   ├── layout.tsx
│       │   │   ├── dashboard/
│       │   │   ├── project/
│       │   │   ├── claim/
│       │   │   └── api/              # API routes (GitHub OAuth callbacks)
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/
│       ├── package.json
│       └── next.config.js
│
├── packages/
│   ├── api/                          # Hono backend service
│   │   ├── src/
│   │   │   ├── index.ts              # Hono app
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── db/
│   │   └── package.json
│   │
│   ├── contracts/                    # Solidity contracts (Hardhat)
│   │   ├── contracts/
│   │   │   ├── GitStreamReceiver.sol
│   │   │   └── interfaces/
│   │   ├── scripts/
│   │   │   └── deploy.ts
│   │   ├── test/
│   │   ├── hardhat.config.ts
│   │   └── package.json
│   │
│   ├── sdk/                          # GitStream SDK (for integrating apps)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── client.ts             # API client
│   │   │   ├── contracts.ts          # Contract ABIs + helpers
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   └── common/                       # Shared types and utilities
│       ├── src/
│       │   ├── types.ts              # Shared TypeScript types
│       │   ├── constants.ts          # Chain IDs, addresses, etc.
│       │   └── validation.ts         # Shared Zod schemas
│       └── package.json
│
├── turbo.json                        # Turborepo config
├── package.json                      # Root package.json
├── pnpm-workspace.yaml               # pnpm workspace config
└── README.md
```

### Demo Repository: `tipjar-demo`

A separate repository to showcase a real project using GitStream.

```
tipjar-demo/
├── contracts/                        # TipJar smart contract (Hardhat)
│   ├── contracts/
│   │   └── TipJar.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── test/
│   ├── hardhat.config.ts
│   └── package.json
│
├── app/                              # Simple frontend to tip the repo
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Tip interface
│   │   │   └── layout.tsx
│   │   └── components/
│   │       └── TipButton.tsx
│   ├── package.json
│   └── next.config.js
│
├── package.json
└── README.md
```

### Why Two Repos?

| Aspect                    | Benefit                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| **Authentic demo**        | "This is a real external project, watch its contributors get paid" |
| **Realistic integration** | Shows how any project can integrate GitStream                      |
| **Contributor diversity** | Demo repo can have different contributors than GitStream           |
| **Clear separation**      | GitStream is the platform, TipJar is a customer                    |
| **Hackathon narrative**   | "We built GitStream AND integrated it into TipJar"                 |

---

## Running the Demo

### Prerequisites

```bash
# Required tools
node >= 18.0.0
pnpm >= 8.0.0
git

# Accounts needed
- GitHub OAuth App (for repo access)
- MongoDB Atlas or local MongoDB
- Alchemy/Infura RPC (for Base Sepolia testnet)
- Yellow Network testnet access
```

### Step 1: Clone and Setup GitStream

```bash
# Clone the main repo
git clone https://github.com/your-org/gitstream.git
cd gitstream

# Install dependencies
pnpm install

# Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp packages/api/.env.example packages/api/.env

# Configure environment variables
# - GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
# - MONGODB_URI
# - YELLOW_API_KEY (from Yellow testnet)
# - NEXT_PUBLIC_ALCHEMY_API_KEY
# - DEPLOYER_PRIVATE_KEY (for contract deployment)
```

### Step 2: Deploy GitStream Contracts

```bash
# Navigate to contracts package
cd packages/contracts

# Compile contracts
pnpm hardhat compile

# Deploy to Base Sepolia testnet
pnpm hardhat run scripts/deploy.ts --network base-sepolia

# Note the deployed GitStreamReceiver address
# Add it to your .env files
```

### Step 3: Start GitStream Services

```bash
# From root directory, start all services
pnpm dev

# This starts:
# - Next.js frontend on http://localhost:3000
# - Hono API on http://localhost:3001
```

### Step 4: Clone and Setup TipJar Demo

```bash
# In a separate terminal/directory
git clone https://github.com/your-org/tipjar-demo.git
cd tipjar-demo

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Add GITSTREAM_RECEIVER_ADDRESS from Step 2
```

### Step 5: Deploy TipJar Contract

```bash
cd contracts

# Deploy TipJar pointing to GitStreamReceiver
pnpm hardhat run scripts/deploy.ts --network base-sepolia

# Note the TipJar contract address
```

### Step 6: Register TipJar with GitStream

```bash
# Option A: Via GitStream UI
# 1. Go to http://localhost:3000
# 2. Connect wallet
# 3. "Add Project" → Connect GitHub → Select tipjar-demo repo
# 4. GitStream analyzes contributors for visibility
# 5. Configure tier percentages (or use defaults: Core 40%, Active 35%, Community 15%, Treasury 10%)

# Option B: Via API
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "github.com/your-org/tipjar-demo",
    "branch": "main",
    "ownerAddress": "0xYourWallet...",
    "tierConfig": {
      "tiers": [
        { "name": "Core Maintainers", "revenueShare": 40, "splitMethod": "equal" },
        { "name": "Active Contributors", "revenueShare": 35, "splitMethod": "equal" },
        { "name": "Community", "revenueShare": 15, "splitMethod": "weighted" }
      ],
      "treasuryShare": 10
    }
  }'
```

### Step 7: Assign Contributors to Tiers

```bash
# Via GitStream UI:
# 1. Go to http://localhost:3000/project/{id}/tiers
# 2. See contributor list with git metrics (advisory data)
# 3. Assign each contributor to a tier
#    - Alice → Core Maintainers
#    - Bob → Active Contributors
#    - Carol → Active Contributors
#    - Dave → Community

# Via API:
curl -X POST http://localhost:3001/api/projects/{id}/tiers/assign \
  -H "Content-Type: application/json" \
  -d '{
    "githubUsername": "alice",
    "tier": "Core Maintainers"
  }'
```

### Step 8: Contributors Claim Wallets

```bash
# Each contributor visits:
# http://localhost:3000/claim

# Flow:
# 1. "Sign in with GitHub" (OAuth)
# 2. Connect wallet
# 3. Sign message to prove wallet ownership
# 4. Contributor sees their tier assignment
# 5. Ready to receive streaming payments
```

### Step 9: Demo the Revenue Flow

```bash
# 1. Start the TipJar demo app
cd tipjar-demo/app
pnpm dev
# Opens on http://localhost:3002

# 2. Go to TipJar UI, connect wallet with testnet USDC

# 3. Send a tip (e.g., 100 USDC)
#    - TipJar contract receives USDC
#    - Forwards to GitStreamReceiver
#    - GitStream backend detects RevenueReceived event
#    - Calculates tier allocations:
#      - Core (40%): $40 → Alice gets $40
#      - Active (35%): $35 → Bob gets $17.50, Carol gets $17.50
#      - Community (15%): $15 → Dave gets $15
#      - Treasury (10%): $10 → held for project
#    - Creates/updates Yellow session
#    - Streams begin to tier members

# 4. Watch the GitStream dashboard
#    - http://localhost:3000/project/{id}
#    - See tier-based allocations
#    - See real-time stream status
#    - See contributor earnings by tier

# 5. Settle the session
#    - Click "Settle" on dashboard
#    - Yellow settles on-chain
#    - Contributors receive USDC in wallets
```

### Demo Video Script

**Intro (30 sec)**

- "GitStream streams revenue to code contributors based on their role, not their line count"
- Show the problem: developers write code, apps profit, contributors get nothing

**Setup (30 sec)**

- Show TipJar repo on GitHub
- "This repo has 4 contributors with different roles"
- Show contributor visibility data (git metrics as context)

**Configure Tiers (30 sec)**

- Connect TipJar repo to GitStream
- Show tier configuration: Core (40%), Active (35%), Community (15%), Treasury (10%)
- Assign contributors: "Alice is Core, Bob and Carol are Active, Dave is Community"
- "Human decisions, informed by data"

**Revenue Flow (45 sec)**

- "Now watch what happens when someone tips this project"
- Send 100 USDC tip via TipJar UI
- Show GitStream detecting the revenue
- Show tier-based allocation: Core: $40, Active: $35, Community: $15, Treasury: $10
- Show Yellow session streaming to tier members in real-time

**Settlement (30 sec)**

- "When contributors want their money..."
- Trigger settlement
- Show on-chain transaction
- Show USDC arriving in contributor wallets

**Closing (15 sec)**

- "Your code shipped. You got paid. Based on your role, aligned with project success."
- Show ProvenanceKit integration roadmap

---

## Local Development Tips

### MongoDB Setup

```bash
# Option 1: Local MongoDB
brew install mongodb-community
brew services start mongodb-community

# Option 2: Docker
docker run -d -p 27017:27017 --name gitstream-mongo mongo:7

# Option 3: MongoDB Atlas (recommended for hackathon)
# Create free cluster at mongodb.com/atlas
```

### Testnet Tokens

```bash
# Get Base Sepolia ETH for gas
# https://www.alchemy.com/faucets/base-sepolia

# Get testnet USDC
# Deploy a mock USDC or use existing testnet USDC
# Mint tokens to test wallets
```

### Yellow Network Testnet

```bash
# 1. Sign up at Yellow Network developer portal
# 2. Get testnet API keys
# 3. Configure in packages/api/.env
#    YELLOW_API_KEY=your_key
#    YELLOW_NETWORK_URL=https://testnet.yellow.org
```

---

_This plan will evolve as we build. Last updated: 2026-01-31_
