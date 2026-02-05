"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useGitHubToken() {
  // Get token from localStorage
  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("github_token");
  };

  const setToken = (token: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("github_token", token);
  };

  const clearToken = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("github_token");
  };

  return { getToken, setToken, clearToken };
}

export function useGitHubUser(token: string | null) {
  return useQuery({
    queryKey: ["githubUser", token],
    queryFn: () => (token ? api.github.user(token) : Promise.reject("No token")),
    enabled: !!token,
    retry: false,
  });
}

export function useGitHubRepos(token: string | null) {
  return useQuery({
    queryKey: ["githubRepos", token],
    queryFn: () => (token ? api.github.repos(token) : Promise.reject("No token")),
    enabled: !!token,
  });
}

export function useGitHubBranches(owner: string, repo: string, token: string | null) {
  return useQuery({
    queryKey: ["githubBranches", owner, repo, token],
    queryFn: () => (token ? api.github.branches(owner, repo, token) : Promise.reject("No token")),
    enabled: !!token && !!owner && !!repo,
  });
}
