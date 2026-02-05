"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { api } from "@/lib/api";

export function useContributors(projectId: string) {
  return useQuery({
    queryKey: ["contributors", projectId],
    queryFn: () => api.contributors.list(projectId),
    enabled: !!projectId,
  });
}

export function useContributor(projectId: string, username: string) {
  return useQuery({
    queryKey: ["contributor", projectId, username],
    queryFn: () => api.contributors.get(projectId, username),
    enabled: !!projectId && !!username,
  });
}

export function useRefreshContributors(projectId: string) {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (githubToken: string) => {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");
      return api.contributors.refresh(projectId, accessToken, githubToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributors", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tierSummary", projectId] });
    },
  });
}
