"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { api } from "@/lib/api";

export function useStreamStatus(projectId: string) {
  const { getAccessToken, authenticated } = usePrivy();

  return useQuery({
    queryKey: ["streamStatus", projectId],
    queryFn: async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");
      return api.streams.status(projectId, accessToken);
    },
    enabled: !!projectId && authenticated,
  });
}

export function useRevenueHistory(projectId: string) {
  return useQuery({
    queryKey: ["revenueHistory", projectId],
    queryFn: () => api.streams.revenue(projectId),
    enabled: !!projectId,
  });
}

export function useCreateStream(projectId: string) {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");
      return api.streams.create(projectId, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["streamStatus", projectId] });
    },
  });
}

export function useConnectionStatus() {
  return useQuery({
    queryKey: ["yellowConnectionStatus"],
    queryFn: () => api.streams.connectionStatus(),
  });
}
