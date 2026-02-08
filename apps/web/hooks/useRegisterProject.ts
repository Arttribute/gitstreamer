import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import {
  GITSTREAM_RECEIVER_ADDRESS,
  GITSTREAM_RECEIVER_ABI,
} from "@/lib/contracts/gitstream-receiver";
import { api } from "@/lib/api";

export function useRegisterProject() {
  const { getAccessToken } = usePrivy();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const registerProject = async (projectId: string, repoUrl: string) => {
    setIsRegistering(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      // Call the contract to register the project
      const hash = await writeContractAsync({
        address: GITSTREAM_RECEIVER_ADDRESS,
        abi: GITSTREAM_RECEIVER_ABI,
        functionName: "registerProject",
        args: [repoUrl],
        chain: baseSepolia,
      });

      // Update the backend with the transaction hash
      const result = await api.projects.markRegistered(projectId, hash, accessToken);

      return { success: true, txHash: hash, project: result.project };
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to register project";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  return {
    registerProject,
    isRegistering,
    error,
  };
}
