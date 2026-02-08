# GitStreamer Example App - Quick Start Guide

**Goal**: Build a simple USDC donation collector that distributes earnings to contributors via GitStreamer in under 2 hours.

## Prerequisites Checklist

- [ ] Node.js 18+ and pnpm installed
- [ ] MetaMask with Base Sepolia network configured
- [ ] Base Sepolia testnet ETH ([Get from faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))
- [ ] GitHub account

## 30-Minute Setup

### 1. Create New Repository (5 min)
```bash
# Create a new Next.js app
npx create-next-app@latest usdc-collector-app \
  --typescript --tailwind --app --no-src-dir

cd usdc-collector-app

# Install Web3 dependencies
pnpm add wagmi viem @tanstack/react-query connectkit
```

### 2. Configure Environment (2 min)
Create `.env.local`:
```env
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_GITSTREAM_RECEIVER=0xc12317F7734ef877A407Cb2a18f9434261F9e96C
NEXT_PUBLIC_USDC_ADDRESS=<GET_FROM_GITSTREAMER_TEAM>
NEXT_PUBLIC_PROJECT_ID=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<GET_FROM_WALLETCONNECT>
```

### 3. Setup Web3 Provider (5 min)
Copy the `Web3Provider` component from [EXAMPLE_APP_PLAN.md](./EXAMPLE_APP_PLAN.md#13-setup-web3-provider) (Phase 1, Step 1.3)

### 4. Add Contract Configuration (3 min)
Copy the `lib/contracts.ts` file from [EXAMPLE_APP_PLAN.md](./EXAMPLE_APP_PLAN.md#14-configure-contract-abis) (Phase 1, Step 1.4)

### 5. Build UI Components (10 min)
Copy these components from [EXAMPLE_APP_PLAN.md](./EXAMPLE_APP_PLAN.md#phase-2-core-components):
- `components/DonationForm.tsx`
- `components/DonationStats.tsx`
- `components/GitStreamerBadge.tsx`

Skip `ContributorBoard.tsx` for now (add later).

### 6. Create Main Page (5 min)
Update `app/layout.tsx` and `app/page.tsx` with code from [EXAMPLE_APP_PLAN.md](./EXAMPLE_APP_PLAN.md#phase-3-main-application-page)

---

## Register with GitStreamer (15 min)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: USDC collector app"
git branch -M main
git remote add origin https://github.com/yourusername/usdc-collector-app.git
git push -u origin main
```

### 2. Register on GitStreamer Platform

1. Visit GitStreamer frontend (get URL from team)
2. Connect your wallet
3. Click "New Project"
4. Enter: `github.com/yourusername/usdc-collector-app`
5. Choose branch: `main`
6. Set tier config:
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
7. Copy the generated PROJECT_ID

### 3. Update Environment
```env
NEXT_PUBLIC_PROJECT_ID=<paste_project_id_here>
```

### 4. Register on Contract (Optional but Recommended)
```bash
# In GitStreamer monorepo
cd contracts
npx hardhat console --network base-sepolia

# In console:
const receiver = await ethers.getContractAt(
  "GitStreamReceiver",
  "0xc12317F7734ef877A407Cb2a18f9434261F9e96C"
);
await receiver.registerProject("github.com/yourusername/usdc-collector-app");
```

---

## Test End-to-End (20 min)

### 1. Get Test USDC
Ask GitStreamer team for MockUSDC tokens or deploy your own:
```bash
# In GitStreamer monorepo
cd contracts
npx hardhat run scripts/mint-test-usdc.ts --network base-sepolia
```

### 2. Test Donation Flow
1. Run your app: `pnpm dev`
2. Open `http://localhost:3000`
3. Connect MetaMask (Base Sepolia)
4. Enter donation amount (e.g., 10 USDC)
5. Approve USDC spending
6. Confirm donation
7. Verify transaction on [Base Sepolia Explorer](https://sepolia.basescan.org/)

### 3. Verify Backend Processing
Check GitStreamer API logs to ensure:
- Revenue was detected
- Contributor balances updated
- Yellow Network session created

### 4. Test Contributor Claim
1. Go to GitStreamer platform
2. Connect wallet
3. Link GitHub account
4. View earnings
5. Claim USDC

---

## Add More Contributors (10 min)

### 1. Create Issues
```markdown
# Issue 1: Add dark mode toggle
# Issue 2: Add donation history
# Issue 3: Improve mobile responsiveness
```

### 2. Invite Collaborators
- Invite 2-3 friends to your repo
- Have them fork, make changes, submit PRs
- Merge their PRs
- GitStreamer will recalculate tiers on next sync

---

## Deploy to Production (10 min)

### Using Vercel
```bash
vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_CHAIN_ID=84532`
- `NEXT_PUBLIC_RPC_URL=https://sepolia.base.org`
- `NEXT_PUBLIC_GITSTREAM_RECEIVER=0xc12317F7734ef877A407Cb2a18f9434261F9e96C`
- `NEXT_PUBLIC_USDC_ADDRESS=<your_usdc_address>`
- `NEXT_PUBLIC_PROJECT_ID=<your_project_id>`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your_wc_id>`

---

## Minimal README

```markdown
# USDC Collector

A demo app showing GitStreamer integration. Donate testnet USDC → funds auto-distribute
to contributors based on their Git commits.

## Try It
- **Live**: https://your-app.vercel.app
- **GitStreamer**: [View project earnings]

## For Contributors
1. Fork this repo
2. Fix issues or add features
3. Submit PR
4. Get assigned a tier based on commits
5. Claim earnings on GitStreamer!

## Local Dev
\`\`\`bash
pnpm install
cp .env.example .env.local
# Add your env vars
pnpm dev
\`\`\`

**Powered by [GitStreamer](https://gitstreamer.example.com)**
```

---

## Troubleshooting

### "Transaction reverted"
- **Cause**: Insufficient USDC allowance or balance
- **Fix**: Ensure you have enough USDC and approved correct amount

### "Project not found"
- **Cause**: Project not registered or wrong PROJECT_ID
- **Fix**: Double-check PROJECT_ID matches what you got from registration

### "Contributors not showing"
- **Cause**: GitStreamer hasn't synced Git history yet
- **Fix**: Wait a few minutes, or manually trigger sync via API

### "Cannot claim earnings"
- **Cause**: GitHub not linked or no earnings yet
- **Fix**: Link GitHub via OAuth, and ensure project has received donations

---

## Next Steps

✅ Basic donation flow working? Great! Now:

1. **Add ContributorBoard component** - Show tier rankings
2. **Add donation history** - Display recent donations
3. **Improve UX** - Loading states, error messages, animations
4. **Write integration guide** - Help others integrate GitStreamer
5. **Create demo video** - Show the full flow for social media

---

## Support

- **Documentation**: [EXAMPLE_APP_PLAN.md](./EXAMPLE_APP_PLAN.md)
- **GitStreamer Issues**: File issues in main GitStreamer repo
- **Discord/Telegram**: [Get invite link from team]

---

**That's it!** You should now have a working example app demonstrating GitStreamer's
tier-based revenue streaming. Share it with the community and help others understand
how to integrate GitStreamer into their projects. 🚀
