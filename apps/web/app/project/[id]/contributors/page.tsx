"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  RefreshCw,
  Users,
  GitCommit,
  FileCode,
  Calendar,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, Project, ContributorWithMetrics, TierConfig } from "@/lib/api";

export default function ContributorsPage() {
  const params = useParams();
  const { getAccessToken } = usePrivy();
  const { address } = useAccount();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [contributors, setContributors] = useState<ContributorWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigningTier, setAssigningTier] = useState<string | null>(null);

  const isOwner = project?.ownerAddress.toLowerCase() === address?.toLowerCase();

  // Get GitHub token from localStorage or URL params
  const getGithubToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("github_token") || "";
    }
    return "";
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const accessToken = await getAccessToken();
        const [projectRes, contributorsRes] = await Promise.all([
          api.projects.get(projectId, accessToken || undefined),
          api.contributors.list(projectId),
        ]);
        setProject(projectRes.project);
        setContributors(contributorsRes.contributors);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      fetchData();
    }
  }, [projectId, getAccessToken]);

  const handleRefresh = async () => {
    if (!isOwner) return;

    const githubToken = getGithubToken();
    if (!githubToken) {
      setError("Please connect your GitHub account first");
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const result = await api.contributors.refresh(projectId, accessToken, githubToken);
      setContributors(result.contributors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh contributors");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAssignTier = async (username: string, tier: string) => {
    if (!isOwner) return;

    setAssigningTier(username);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      if (tier === "") {
        await api.tiers.remove(projectId, username, accessToken);
      } else {
        await api.tiers.assign(projectId, username, tier, accessToken);
      }

      // Update local state
      setContributors((prev) =>
        prev.map((c) =>
          c.githubUsername === username
            ? { ...c, tier: tier || undefined }
            : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign tier");
    } finally {
      setAssigningTier(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-8 h-8 w-64" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500">{error || "Project not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierOptions = [
    { value: "", label: "Unassigned" },
    ...project.tierConfig.tiers.map((t) => ({
      value: t.name,
      label: `${t.name} (${t.revenueShare}%)`,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/project/${projectId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contributors</h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              {project.repoOwner}/{project.repoName}
            </p>
          </div>
          {isOwner && (
            <Button onClick={handleRefresh} disabled={refreshing} className="gap-2">
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh from GitHub
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tier summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {project.tierConfig.tiers.map((tier) => {
          const count = contributors.filter((c) => c.tier === tier.name).length;
          return (
            <Card key={tier.name}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tier.name}</span>
                  <Badge>{tier.revenueShare}%</Badge>
                </div>
                <p className="mt-2 text-2xl font-bold">{count}</p>
                <p className="text-sm text-zinc-500">contributors</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contributors list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Contributors ({contributors.length})
          </CardTitle>
          <CardDescription>
            Git metrics are advisory. Assign tiers based on role and commitment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contributors.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-zinc-300" />
              <p className="mt-4 text-zinc-500">No contributors found</p>
              {isOwner && (
                <Button onClick={handleRefresh} className="mt-4 gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Analyze Repository
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {contributors.map((contributor) => (
                <div
                  key={contributor._id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={`https://github.com/${contributor.githubUsername}.png`}
                        alt={contributor.githubUsername}
                        className="h-12 w-12 rounded-full"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{contributor.githubUsername}</p>
                          {contributor.walletAddress && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Claimed
                            </Badge>
                          )}
                        </div>
                        {contributor.latestMetrics && (
                          <div className="mt-1 flex flex-wrap gap-3 text-sm text-zinc-500">
                            <span className="flex items-center gap-1">
                              <GitCommit className="h-3 w-3" />
                              {contributor.latestMetrics.metrics.commits} commits
                            </span>
                            <span className="flex items-center gap-1">
                              <FileCode className="h-3 w-3" />
                              {contributor.latestMetrics.metrics.linesOfCode.toLocaleString()} lines
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Last:{" "}
                              {new Date(
                                contributor.latestMetrics.metrics.lastContribution
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {contributor.latestMetrics?.suggestedTier && (
                          <p className="mt-1 text-sm text-zinc-400">
                            Suggested: {contributor.latestMetrics.suggestedTier}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isOwner ? (
                        <div className="w-48">
                          <Select
                            options={tierOptions}
                            value={contributor.tier || ""}
                            onChange={(e) =>
                              handleAssignTier(contributor.githubUsername, e.target.value)
                            }
                            disabled={assigningTier === contributor.githubUsername}
                          />
                        </div>
                      ) : (
                        <Badge variant={contributor.tier ? "default" : "outline"}>
                          {contributor.tier || "Unassigned"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
