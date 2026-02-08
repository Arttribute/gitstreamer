import type { TierConfig } from "../../db/models/project.js";

export interface TierMember {
  walletAddress: string;
  weight?: number;
}

export interface TierAllocation {
  tier: string;
  amount: bigint;
  members: Array<{
    walletAddress: string;
    share: bigint;
  }>;
}

/**
 * Calculate allocations based on tier configuration
 * This is the core tier-based revenue distribution logic
 */
export function calculateTierAllocations(
  totalAmount: bigint,
  tierConfig: TierConfig,
  tierMembers: Map<string, TierMember[]>
): TierAllocation[] {
  const allocations: TierAllocation[] = [];

  for (const tier of tierConfig.tiers) {
    const tierAmount = (totalAmount * BigInt(tier.revenueShare)) / 100n;
    const members = tierMembers.get(tier.name) || [];

    if (members.length === 0) {
      // No members in this tier, skip (amount could go to treasury)
      console.log(`Tier "${tier.name}" has no members, skipping allocation`);
      continue;
    }

    const memberAllocations: Array<{ walletAddress: string; share: bigint }> = [];

    if (tier.splitMethod === "equal") {
      // Equal split among all members
      const perMember = tierAmount / BigInt(members.length);
      const remainder = tierAmount % BigInt(members.length);

      members.forEach((member, index) => {
        // Give any remainder to the first member to avoid dust
        const share = index === 0 ? perMember + remainder : perMember;
        memberAllocations.push({
          walletAddress: member.walletAddress,
          share,
        });
      });
    } else {
      // Weighted split based on contribution metrics (for Community tier)
      const totalWeight = members.reduce((sum, m) => sum + (m.weight || 1), 0);

      for (const member of members) {
        const weight = member.weight || 1;
        const share = (tierAmount * BigInt(weight)) / BigInt(totalWeight);
        memberAllocations.push({
          walletAddress: member.walletAddress,
          share,
        });
      }
    }

    allocations.push({
      tier: tier.name,
      amount: tierAmount,
      members: memberAllocations,
    });
  }

  return allocations;
}

/**
 * Validate that tier configuration percentages add up to 100%
 */
export function validateTierConfig(tierConfig: TierConfig): boolean {
  const totalTierShare = tierConfig.tiers.reduce((sum, t) => sum + t.revenueShare, 0);
  return totalTierShare + tierConfig.treasuryShare === 100;
}

/**
 * Get total allocated amount from tier allocations
 */
export function getTotalAllocatedAmount(allocations: TierAllocation[]): bigint {
  return allocations.reduce((total, tier) => {
    const tierTotal = tier.members.reduce((sum, m) => sum + m.share, 0n);
    return total + tierTotal;
  }, 0n);
}

/**
 * Format allocation for display (convert bigint to string)
 */
export function formatAllocationForDisplay(allocation: TierAllocation) {
  return {
    tier: allocation.tier,
    amount: allocation.amount.toString(),
    members: allocation.members.map((m) => ({
      walletAddress: m.walletAddress,
      share: m.share.toString(),
    })),
  };
}
