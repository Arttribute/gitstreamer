"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { api, Project } from "@/lib/api";

export function useProjects() {
  const { getAccessToken, authenticated } = usePrivy();

  return useQuery({
    queryKey: ["projects", authenticated],
    queryFn: async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return { projects: [] };
      return api.projects.list(accessToken);
    },
    enabled: authenticated,
  });
}

export function useProject(projectId: string) {
  const { getAccessToken } = usePrivy();

  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return api.projects.get(projectId, accessToken || undefined);
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      repoUrl: string;
      branch?: string;
      tierConfig?: Project["tierConfig"];
    }) => {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");
      return api.projects.create(data, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Pick<Project, "branch" | "settings">>) => {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");
      return api.projects.update(projectId, data, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateTiers(projectId: string) {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tierConfig: Project["tierConfig"]) => {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");
      return api.projects.updateTiers(projectId, tierConfig, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useDeleteProject(projectId: string) {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");
      return api.projects.delete(projectId, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
