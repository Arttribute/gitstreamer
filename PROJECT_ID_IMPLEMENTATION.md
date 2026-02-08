# Project ID (projectIdBytes32) Implementation

## Overview
The GitStreamReceiver smart contract requires a `bytes32` project ID for all payment operations. This ID is computed using `keccak256(abi.encodePacked(repoUrl, ownerAddress))` to uniquely identify each project.

## Changes Made

### 1. Backend Changes

#### New Utility Function
- **File**: `apps/api/src/lib/contract-utils.ts`
- **Function**: `computeProjectId(repoUrl: string, ownerAddress: string): string`
- Computes the project ID using the same algorithm as the smart contract
- Uses ethers.js `solidityPacked` and `keccak256` functions

#### Updated Project Routes
- **File**: `apps/api/src/routes/projects.ts`
- Automatically computes and stores `projectIdBytes32` when creating new projects
- Includes `projectIdBytes32` in all API responses (GET, PUT endpoints)

#### Database Schema
- **File**: `apps/api/src/db/models/project.ts`
- Already had the `projectIdBytes32?: string` field defined
- Now properly populated for all new projects

### 2. Frontend Changes

#### Project Detail Page
- **File**: `apps/web/app/project/[id]/page.tsx`
- Displays the project ID below the repository name
- Shows truncated version: `0x1234...abcd5678`
- Includes a copy-to-clipboard button with visual feedback
- Only shown when `projectIdBytes32` is available

#### API Types
- **File**: `apps/web/lib/api.ts`
- Already had the `projectIdBytes32?: string` field in the Project type

### 3. Migration Script

#### Purpose
Existing projects in the database don't have the `projectIdBytes32` field populated.

#### Usage
Run this script to update all existing projects:

```bash
pnpm --filter=api tsx src/scripts/migrate-project-ids.ts
```

The script will:
- Find all projects without a `projectIdBytes32`
- Compute the correct value based on `repoUrl` and `ownerAddress`
- Update each project in the database
- Print progress and summary

## How to Use the Project ID

### For Payment Integration

When your app needs to send USDC to the GitStreamer contract, use the `projectIdBytes32`:

```typescript
// Example: Sending revenue to a project
const projectId = project.projectIdBytes32; // e.g., "0x1234...abcd"

// Call the contract's receiveRevenue function
await gitStreamReceiver.receiveRevenue(projectId, amount);
```

### Display to Users

The project detail page now shows the project ID prominently with a copy button, making it easy for users to:
1. Copy the ID for payment integrations
2. Verify it matches what's expected in the contract
3. Share it with third-party payment services

## Testing

### 1. Test New Project Creation
```bash
# Start the API
pnpm --filter=api dev

# Create a new project via the API
# The response should include projectIdBytes32
```

### 2. Test Migration
```bash
# Run the migration script
pnpm --filter=api tsx src/scripts/migrate-project-ids.ts

# Verify existing projects have the field
```

### 3. Test Frontend Display
```bash
# Start the web app
pnpm --filter=web dev

# Navigate to a project detail page
# Verify the project ID is displayed with copy functionality
```

## Contract Verification

The `projectIdBytes32` computed by the backend **must match** what the smart contract computes. Verify this by:

```solidity
// In the contract
function getProjectId(string calldata repoUrl, address owner) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(repoUrl, owner));
}
```

```typescript
// In the backend (computeProjectId function)
const encoded = ethers.solidityPacked(["string", "address"], [repoUrl, ownerAddress]);
return ethers.keccak256(encoded);
```

Both should produce identical results.

## Next Steps

1. **Run the migration script** to update existing projects
2. **Test the payment flow** end-to-end with the project ID
3. **Update any documentation** that references project identification
4. **Consider adding the project ID** to other relevant pages (dashboard, project list, etc.)
