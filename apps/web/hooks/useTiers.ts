"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { api } from "@/lib/api";

export function useTierConfig(projectId: string) {
  return useQuery({
    queryKey: ["tierConfig", projectId],
    queryFn: () => api.tiers.get(projectId),
    enabled: !!projectId,
  });
}

export function useTierMembers(projectId: string, tierName: string) {
  return useQuery({
    queryKey: ["tierMembers", projectId, tierName],
    queryFn: () => api.tiers.getMembers(projectId, tierName),
    enabled: !!projectId && !!tierName,
  });
}

export function useTierSummary(projectId: string) {
  return useQuery({
    queryKey: ["tierSummary", projectId],
    queryFn: () => api.tiers.summary(projectId),
    enabled: !!projectId,
  });
}

export function useAssignTier(projectId: string) {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ githubUsername, tier }: { githubUsername: string; tier: string }) => {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");
      return api.tiers.assign(projectId, githubUsername, tier, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributors", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tierSummary", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tierMembers", projectId] });
    },
  });
}

export function useRemoveFromTier(projectId: string) {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");
      return api.tiers.remove(projectId, username, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributors", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tierSummary", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tierMembers", projectId] });
    },
  });
}
