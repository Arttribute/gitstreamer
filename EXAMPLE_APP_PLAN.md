# GitStreamer Example App: USDC Collector

## Overview

This document outlines the plan for building a simple demonstration application that showcases GitStreamer's capabilities. The app will be a **single-page USDC donation collector** that allows users to donate testnet USDC, which then gets distributed to the app's contributors through GitStreamer's tier-based revenue streaming system.

### Purpose
- Demonstrate GitStreamer integration in a real-world application
- Provide a working example for developers wanting to integrate GitStreamer
- Test the full GitStreamer flow: collection → distribution → contributor claims

### Key Features
- Simple donation interface with Web3 wallet connection
- Direct USDC transfers to GitStreamReceiver contract
- Real-time donation tracking
- Contributor leaderboard showing tier rankings
- Clear call-to-action to view contributor earnings on GitStreamer platform

---

## Architecture

### Tech Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **Styling**: Tailwind CSS
- **Web3**: Wagmi v2 + ConnectKit for wallet connection
- **Smart Contracts**:
  - GitStreamReceiver (deployed at `0xc12317F7734ef877A407Cb2a18f9434261F9e96C`)
  - USDC on Base Sepolia
- **Network**: Base Sepolia (Chain ID: 84532)

### Application Structure
```
usdc-collector/
├── app/
│   ├── layout.tsx          # Root layout with Web3Provider
│   ├── page.tsx            # Main donation page
│   └── api/
│       └── stats/
│           └── route.ts    # Optional: fetch project stats from GitStreamer API
├── components/
│   ├── DonationForm.tsx    # Main donation interface
│   ├── DonationStats.tsx   # Display total collected & project info
│   ├── ContributorBoard.tsx # Show top contributors by tier
│   └── GitStreamerBadge.tsx # "Powered by GitStreamer" branding
├── lib/
│   ├── contracts.ts        # Contract ABIs and addresses
│   ├── web3-provider.tsx   # Wagmi + ConnectKit configuration
│   └── gitstreamer-api.ts  # Client for GitStreamer API
├── public/
└── .env.local              # Environment variables
```

---

## Prerequisites

### 1. Development Environment
- Node.js 18+ and pnpm installed
- Git configured with your GitHub account
- MetaMask or another Web3 wallet with Base Sepolia network added
- Base Sepolia testnet ETH for gas fees ([Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))

### 2. Required Information
- **GitStreamReceiver Contract**: `0xc12317F7734ef877A407Cb2a18f9434261F9e96C`
- **Base Sepolia RPC**: `https://sepolia.base.org`
- **Chain ID**: 84532
- **USDC Contract Address**: You'll need the Base Sepolia USDC address (or use the MockUSDC from GitStreamer)

### 3. GitHub Setup
- Create a new GitHub repository for the app (e.g., `usdc-collector-app`)
- Invite at least 2-3 collaborators to make meaningful contributions
- Ensure the repository is public so GitStreamer can analyze contributions

---

## Implementation Steps

### Phase 1: Project Setup

#### 1.1 Initialize Next.js Project
```bash
# Create new Next.js app
npx create-next-app@latest usdc-collector-app --typescript --tailwind --app --no-src-dir

cd usdc-collector-app

# Install Web3 dependencies
pnpm add wagmi viem @tanstack/react-query connectkit

# Install additional utilities
pnpm add clsx lucide-react
```

#### 1.2 Configure Environment Variables
Create `.env.local`:
```env
# Network
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

# Contracts
NEXT_PUBLIC_GITSTREAM_RECEIVER=0xc12317F7734ef877A407Cb2a18f9434261F9e96C
NEXT_PUBLIC_USDC_ADDRESS=<USDC_OR_MOCK_USDC_ADDRESS>

# Project Identity (will be set after registering with GitStreamer)
NEXT_PUBLIC_PROJECT_ID=
NEXT_PUBLIC_REPO_URL=github.com/yourusername/usdc-collector-app

# GitStreamer API (optional for fetching stats)
NEXT_PUBLIC_GITSTREAMER_API=https://gitstreamer-api.example.com
```

#### 1.3 Setup Web3 Provider
Create `lib/web3-provider.tsx`:
```typescript
"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

const config = createConfig(
  getDefaultConfig({
    chains: [baseSepolia],
    transports: {
      [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    appName: "USDC Collector - Powered by GitStreamer",
    appDescription: "Donate USDC to support contributors",
    appUrl: "https://your-app-url.com",
  })
);

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

#### 1.4 Configure Contract ABIs
Create `lib/contracts.ts`:
```typescript
export const GITSTREAM_RECEIVER_ADDRESS = process.env.NEXT_PUBLIC_GITSTREAM_RECEIVER as `0x${string}`;
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

// GitStreamReceiver ABI (minimal - only what we need)
export const GITSTREAM_RECEIVER_ABI = [
  {
    inputs: [
      { name: "projectId", type: "bytes32" },
      { name: "amount", type: "uint256" }
    ],
    name: "receiveRevenue",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "repoUrl", type: "string" },
      { name: "owner", type: "address" }
    ],
    name: "getProjectId",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [{ name: "projectId", type: "bytes32" }],
    name: "getProjectBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// Standard ERC20 ABI (for USDC)
export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  }
] as const;
```

---

### Phase 2: Core Components

#### 2.1 Main Donation Form Component
Create `components/DonationForm.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { ConnectKitButton } from "connectkit";
import {
  GITSTREAM_RECEIVER_ADDRESS,
  USDC_ADDRESS,
  GITSTREAM_RECEIVER_ABI,
  ERC20_ABI,
} from "@/lib/contracts";

export function DonationForm({ projectId }: { projectId: string }) {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "approve" | "donate" | "success">("input");

  // Read user's USDC balance
  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Approve USDC spending
  const { writeContract: approveUsdc, data: approveHash } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash });

  // Send donation
  const { writeContract: donate, data: donateHash } = useWriteContract();
  const { isLoading: isDonating, isSuccess } = useWaitForTransactionReceipt({ hash: donateHash });

  const handleApprove = async () => {
    if (!amount) return;
    const amountWei = parseUnits(amount, 6); // USDC has 6 decimals

    approveUsdc({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [GITSTREAM_RECEIVER_ADDRESS, amountWei],
    });

    setStep("approve");
  };

  const handleDonate = async () => {
    if (!amount || !projectId) return;
    const amountWei = parseUnits(amount, 6);

    donate({
      address: GITSTREAM_RECEIVER_ADDRESS,
      abi: GITSTREAM_RECEIVER_ABI,
      functionName: "receiveRevenue",
      args: [projectId as `0x${string}`, amountWei],
    });

    setStep("donate");
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <h3 className="text-2xl font-bold text-green-600 mb-4">🎉 Thank you!</h3>
        <p className="text-gray-600 mb-6">
          Your donation of {amount} USDC will be distributed to contributors based on their tier.
        </p>
        <button
          onClick={() => {
            setAmount("");
            setStep("input");
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Donate Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Support Contributors</h2>

      {!isConnected ? (
        <div className="text-center">
          <p className="mb-4 text-gray-600">Connect your wallet to donate</p>
          <ConnectKitButton />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Donation Amount (USDC)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={step !== "input"}
            />
            {balance && (
              <p className="text-sm text-gray-500 mt-1">
                Balance: {formatUnits(balance, 6)} USDC
              </p>
            )}
          </div>

          {step === "input" && (
            <button
              onClick={handleApprove}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          )}

          {step === "approve" && (
            <button
              onClick={handleDonate}
              disabled={isApproving}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {isApproving ? "Approving..." : "Confirm Donation"}
            </button>
          )}

          {step === "donate" && isDonating && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Processing donation...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### 2.2 Donation Stats Component
Create `components/DonationStats.tsx`:
```typescript
"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { GITSTREAM_RECEIVER_ADDRESS, GITSTREAM_RECEIVER_ABI } from "@/lib/contracts";

export function DonationStats({ projectId }: { projectId: string }) {
  const { data: balance } = useReadContract({
    address: GITSTREAM_RECEIVER_ADDRESS,
    abi: GITSTREAM_RECEIVER_ABI,
    functionName: "getProjectBalance",
    args: [projectId as `0x${string}`],
  });

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-xl">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Collected</h3>
        <p className="text-4xl font-bold text-blue-600">
          {balance ? formatUnits(balance, 6) : "0.00"} USDC
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Distributed to contributors via GitStreamer
        </p>
      </div>
    </div>
  );
}
```

#### 2.3 Contributor Board Component
Create `components/ContributorBoard.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";

interface Contributor {
  githubUsername: string;
  tier: number;
  commitCount: number;
  revenueShare: number;
}

export function ContributorBoard({ projectId }: { projectId: string }) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch contributors from GitStreamer API
    fetch(`${process.env.NEXT_PUBLIC_GITSTREAMER_API}/projects/${projectId}/contributors`)
      .then((res) => res.json())
      .then((data) => {
        setContributors(data.contributors || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [projectId]);

  if (loading) {
    return <div className="text-center py-4">Loading contributors...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">Top Contributors</h3>
      <div className="space-y-3">
        {contributors.slice(0, 10).map((contributor, index) => (
          <div
            key={contributor.githubUsername}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
              <img
                src={`https://github.com/${contributor.githubUsername}.png`}
                alt={contributor.githubUsername}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-semibold">{contributor.githubUsername}</p>
                <p className="text-sm text-gray-600">{contributor.commitCount} commits</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                Tier {contributor.tier}
              </span>
              <p className="text-xs text-gray-600 mt-1">{contributor.revenueShare}% share</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center">
        <a
          href={`${process.env.NEXT_PUBLIC_GITSTREAMER_API}/projects/${projectId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          View all contributors on GitStreamer →
        </a>
      </div>
    </div>
  );
}
```

#### 2.4 GitStreamer Badge
Create `components/GitStreamerBadge.tsx`:
```typescript
export function GitStreamerBadge() {
  return (
    <div className="text-center py-8">
      <p className="text-gray-600 mb-2">Powered by</p>
      <a
        href="https://gitstreamer.example.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-2xl font-bold text-blue-600 hover:text-blue-700"
      >
        GitStreamer
      </a>
      <p className="text-sm text-gray-500 mt-2">
        Tier-based revenue streaming for code contributors
      </p>
    </div>
  );
}
```

---

### Phase 3: Main Application Page

#### 3.1 Root Layout
Update `app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/lib/web3-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "USDC Collector - Powered by GitStreamer",
  description: "Donate testnet USDC to support open-source contributors",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
```

#### 3.2 Main Page
Update `app/page.tsx`:
```typescript
import { DonationForm } from "@/components/DonationForm";
import { DonationStats } from "@/components/DonationStats";
import { ContributorBoard } from "@/components/ContributorBoard";
import { GitStreamerBadge } from "@/components/GitStreamerBadge";

// This will be set after registering with GitStreamer
const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID || "";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            USDC Collector
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Support open-source contributors. Every donation is automatically distributed
            based on code contributions using GitStreamer's tier system.
          </p>
        </div>

        {/* Stats */}
        {PROJECT_ID && (
          <div className="mb-12">
            <DonationStats projectId={PROJECT_ID} />
          </div>
        )}

        {/* Donation Form */}
        <div className="mb-12">
          {PROJECT_ID ? (
            <DonationForm projectId={PROJECT_ID} />
          ) : (
            <div className="max-w-md mx-auto p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-yellow-800">
                ⚠️ Project not registered with GitStreamer yet. Complete setup first.
              </p>
            </div>
          )}
        </div>

        {/* How it Works */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="font-bold text-lg mb-2">1. Donate USDC</h3>
              <p className="text-gray-600">
                Connect your wallet and donate any amount of testnet USDC.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-bold text-lg mb-2">2. Automatic Distribution</h3>
              <p className="text-gray-600">
                Funds are distributed based on contributor tiers calculated from Git history.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-bold text-lg mb-2">3. Contributors Claim</h3>
              <p className="text-gray-600">
                Contributors claim their earnings through GitStreamer's platform.
              </p>
            </div>
          </div>
        </div>

        {/* Contributor Board */}
        {PROJECT_ID && (
          <div className="max-w-4xl mx-auto mb-12">
            <ContributorBoard projectId={PROJECT_ID} />
          </div>
        )}

        {/* GitStreamer Badge */}
        <GitStreamerBadge />
      </div>
    </main>
  );
}
```

---

## Phase 4: GitStreamer Integration

### 4.1 Register Project with GitStreamer

Once your app repository is created and has some initial commits:

1. **Deploy the app** (or have it in a public GitHub repo)
2. **Access GitStreamer Platform** at the deployed frontend URL
3. **Connect Wallet** using the wallet that will own the project
4. **Register New Project**:
   - Navigate to "New Project" page
   - Enter repository URL: `github.com/yourusername/usdc-collector-app`
   - Select branch: `main`
   - Configure tier settings:
     ```json
     {
       "tiers": [
         { "name": "Core", "minCommits": 50, "revenueShare": 40 },
         { "name": "Regular", "minCommits": 20, "revenueShare": 30 },
         { "name": "Contributor", "minCommits": 5, "revenueShare": 20 }
       ],
       "treasuryShare": 10
     }
     ```

5. **Get Project ID**: After registration, you'll receive a project ID. This is computed as:
   ```solidity
   keccak256(abi.encodePacked(repoUrl, ownerAddress))
   ```

6. **Register on Contract** (optional): The project should also be registered on-chain:
   ```typescript
   // Call from the owner address
   await gitStreamReceiver.registerProject("github.com/yourusername/usdc-collector-app");
   ```

7. **Update Environment Variables**:
   ```env
   NEXT_PUBLIC_PROJECT_ID=<project_id_from_step_5>
   ```

8. **Redeploy** the application with the new project ID

### 4.2 Add Contributors

Invite team members to contribute:
- Create issues for features
- Have contributors fork the repo and submit PRs
- Merge PRs to build up contribution history
- GitStreamer will automatically analyze the Git history and assign tiers

### 4.3 Test the Full Flow

1. **Get Testnet USDC**:
   - Use the MockUSDC faucet or deploy your own
   - Or request testnet USDC from Base Sepolia faucets

2. **Make a Donation**:
   - Connect wallet to the app
   - Enter donation amount
   - Approve USDC spending
   - Confirm donation transaction
   - Verify funds are received in GitStreamReceiver

3. **Verify Distribution Setup**:
   - Check project balance on GitStreamReceiver contract
   - Backend should detect the new revenue
   - Yellow Network session should be created/updated
   - Contributor balances should be updated based on tiers

4. **Claim Earnings**:
   - Contributors connect wallet to GitStreamer platform
   - Link GitHub account via OAuth
   - View their tier and earnings
   - Claim USDC to their wallet

---

## Phase 5: Testing & Validation

### 5.1 Smart Contract Testing
```bash
# In the GitStreamer monorepo
cd contracts

# Test revenue receiving
npx hardhat test --grep "receiveRevenue"

# Test on Base Sepolia
npx hardhat run scripts/test-donation.ts --network base-sepolia
```

### 5.2 End-to-End Testing Checklist

- [ ] Wallet connection works on Base Sepolia
- [ ] User can see their USDC balance
- [ ] Donation approval transaction succeeds
- [ ] Donation transaction succeeds
- [ ] Project balance increases on GitStreamReceiver
- [ ] Backend detects new revenue and updates contributor balances
- [ ] Contributors can view their updated earnings
- [ ] Contributors can successfully claim USDC
- [ ] Transaction history is accurate

### 5.3 Multi-Contributor Testing

Create a realistic scenario:
1. Have 3-5 developers make meaningful contributions
2. Create varied commit histories (different amounts)
3. Make multiple donations of different sizes
4. Verify tier assignments are correct
5. Verify revenue distribution percentages match tier config
6. Have each contributor test claiming their earnings

---

## Phase 6: Documentation & Deployment

### 6.1 Repository README

Create a comprehensive README.md:
```markdown
# USDC Collector - GitStreamer Example App

A demonstration application showing how to integrate GitStreamer's tier-based revenue
streaming for code contributors.

## What is GitStreamer?

GitStreamer automatically distributes revenue to your project's contributors based on
their Git commit history. Contributors are assigned to tiers, and each tier receives
a percentage of incoming revenue.

## How This App Works

1. Users donate testnet USDC through a simple web interface
2. Donations go directly to the GitStreamReceiver contract
3. GitStreamer's backend analyzes contributor tiers
4. Revenue is distributed proportionally via Yellow Network state channels
5. Contributors claim their earnings

## Try It

- **Live Demo**: [https://usdc-collector.example.com](...)
- **View on GitStreamer**: [Link to project page]

## For Contributors

Want to earn from this project?
1. Fork this repo
2. Make meaningful contributions (bug fixes, features, docs)
3. Submit PRs
4. Once merged, you'll automatically be assigned a tier
5. Claim your earnings on GitStreamer!

## Tech Stack

- Next.js + TypeScript
- Wagmi + ConnectKit for Web3
- GitStreamReceiver contract on Base Sepolia
- GitStreamer API for contributor data

## Local Development

\`\`\`bash
pnpm install
cp .env.example .env.local
# Fill in environment variables
pnpm dev
\`\`\`

## Integrating GitStreamer into Your App

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for step-by-step instructions
on adding GitStreamer to your own project.
```

### 6.2 Integration Guide

Create `INTEGRATION_GUIDE.md` with detailed steps for other developers to integrate
GitStreamer into their projects.

### 6.3 Deployment

Deploy to Vercel/Netlify:
```bash
# Using Vercel
vercel --prod

# Set environment variables in Vercel dashboard
# - NEXT_PUBLIC_CHAIN_ID
# - NEXT_PUBLIC_RPC_URL
# - NEXT_PUBLIC_GITSTREAM_RECEIVER
# - NEXT_PUBLIC_USDC_ADDRESS
# - NEXT_PUBLIC_PROJECT_ID
```

---

## Success Criteria

The example app is considered complete when:

- [ ] Application is deployed and publicly accessible
- [ ] Repository is registered on GitStreamer platform
- [ ] At least 3 contributors have made commits
- [ ] Donations can be made through the UI
- [ ] Funds successfully reach GitStreamReceiver contract
- [ ] Contributors are assigned to appropriate tiers
- [ ] Contributors can claim their earnings
- [ ] Documentation is complete and clear
- [ ] Integration guide is comprehensive

---

## Future Enhancements

Once MVP is complete, consider:

1. **Analytics Dashboard**: Show donation history, contributor trends over time
2. **Donation Goals**: Set funding goals with progress bars
3. **NFT Rewards**: Mint NFTs for top contributors or donors
4. **Social Features**: Share donations on social media, leaderboards
5. **Multi-Token Support**: Accept other tokens besides USDC
6. **Recurring Donations**: Set up subscription-style donations
7. **Mobile App**: React Native version with WalletConnect

---

## Resources

- **GitStreamer Contracts**: `/Users/bashybaranaba/gitstreamer/contracts`
- **GitStreamer API**: `/Users/bashybaranaba/gitstreamer/apps/api`
- **Base Sepolia Explorer**: https://sepolia.basescan.org/
- **Base Sepolia Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Yellow Network Docs**: https://yellow.org/docs

---

## Questions & Support

- Create issues in the GitStreamer repo
- Join the GitStreamer Discord/Telegram
- Check GitStreamer documentation

---

**Ready to build?** Start with Phase 1 and work through each step methodically. Test
thoroughly at each phase before moving forward. Good luck! 🚀
