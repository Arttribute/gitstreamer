import { useReadContract } from "wagmi";
import {
  GITSTREAM_RECEIVER_ADDRESS,
  GITSTREAM_RECEIVER_ABI,
} from "@/lib/contracts/gitstream-receiver";
import { formatUnits } from "viem";

export function useProjectBalance(projectIdBytes32?: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: GITSTREAM_RECEIVER_ADDRESS,
    abi: GITSTREAM_RECEIVER_ABI,
    functionName: "getProjectBalance",
    args: projectIdBytes32 ? [projectIdBytes32 as `0x${string}`] : undefined,
    query: {
      enabled: !!projectIdBytes32,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Convert from wei (6 decimals for USDC) to human-readable format
  const balance = data ? formatUnits(data as bigint, 6) : "0";

  return {
    balance,
    balanceRaw: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}
