"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import {
  GitBranch,
  Users,
  DollarSign,
  Settings,
  ExternalLink,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, Project, ContributorWithMetrics } from "@/lib/api";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const { address } = useAccount();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [contributors, setContributors] = useState<ContributorWithMetrics[]>([]);
  const [tierSummary, setTierSummary] = useState<
    {
      name: string;
      revenueShare: number;
      splitMethod: string;
      memberCount: number;
      claimedCount: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoFetching, setAutoFetching] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = project?.ownerAddress.toLowerCase() === address?.toLowerCase();

  const copyProjectId = async () => {
    if (project?.projectIdBytes32) {
      await navigator.clipboard.writeText(project.projectIdBytes32);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const accessToken = await getAccessToken();
        const [projectRes, contributorsRes, summaryRes] = await Promise.all([
          api.projects.get(projectId, accessToken || undefined),
          api.contributors.list(projectId, accessToken || undefined),
          api.tiers.summary(projectId, accessToken || undefined),
        ]);
        setProject(projectRes.project);
        setContributors(contributorsRes.contributors);
        setTierSummary(summaryRes.tiers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Auto-fetch contributors if empty (only for project owners)
  useEffect(() => {
    async function autoFetchContributors() {
      if (!isOwner || !project || contributors.length > 0 || autoFetching) {
        return;
      }

      const githubToken = localStorage.getItem("github_token");
      if (!githubToken) {
        return;
      }

      setAutoFetching(true);
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return;

        const result = await api.contributors.refresh(projectId, accessToken, githubToken);
        setContributors(result.contributors);
      } catch (err) {
        console.warn("Auto-fetch contributors failed:", err);
        // Don't show error to user, let them manually refresh if needed
      } finally {
        setAutoFetching(false);
      }
    }

    autoFetchContributors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, project, contributors.length, autoFetching, projectId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500">{error || "Project not found"}</p>
            <Link href="/dashboard" className="mt-4 inline-block">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <GitBranch className="h-6 w-6 text-zinc-400" />
              <h1 className="text-3xl font-bold">{project.repoName}</h1>
              <Badge variant="secondary">{project.branch}</Badge>
            </div>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              {project.repoOwner}/{project.repoName}
            </p>
            {project.projectIdBytes32 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="rounded-md bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Contract Project ID</p>
                  <code className="mt-1 block text-xs font-mono text-zinc-700 dark:text-zinc-300">
                    {project.projectIdBytes32.slice(0, 10)}...{project.projectIdBytes32.slice(-8)}
                  </code>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyProjectId}
                  className="h-8 w-8 p-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <a
              href={`https://${project.repoUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                GitHub
              </Button>
            </a>
            {isOwner && (
              <Link href={`/project/${projectId}/settings`}>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contributors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-zinc-400" />
              <span className="text-2xl font-bold">{contributors.length}</span>
            </div>
            {contributors.filter((c) => !c.tier).length > 0 && (
              <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                {contributors.filter((c) => !c.tier).length} unassigned
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tiers Configured</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{project.tierConfig.tiers.length}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {project.tierConfig.treasuryShare}% treasury
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stream Status</CardDescription>
          </CardHeader>
          <CardContent>
            {project.yellowSessionId ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="secondary">Not Started</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Min Distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-zinc-400" />
              <span className="text-2xl font-bold">
                {project.settings.minDistributionAmount}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">USDC threshold</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Link href={`/project/${projectId}/contributors`}>
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Manage Contributors
              </CardTitle>
              <CardDescription>
                View contributor metrics and assign tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tierSummary.map((tier) => (
                  <div key={tier.name} className="flex items-center justify-between text-sm">
                    <span>{tier.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">{tier.memberCount} members</span>
                      <Badge variant="outline">{tier.revenueShare}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/project/${projectId}/streams`}>
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Revenue Streams
              </CardTitle>
              <CardDescription>
                View payment streams and revenue history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.yellowSessionId ? (
                <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Streaming session active
                  </p>
                  <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                    Revenue is being distributed to contributors
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                  <p className="font-medium">No active stream</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Start streaming to distribute revenue
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Contributors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Contributors</CardTitle>
            <CardDescription>
              Contributors with their tier assignments
            </CardDescription>
          </div>
          <Link href={`/project/${projectId}/contributors`}>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {contributors.length === 0 ? (
            <div className="py-8 text-center">
              {autoFetching ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100" />
                  <p className="text-sm text-zinc-500">
                    Analyzing repository contributors...
                  </p>
                </div>
              ) : (
                <p className="text-zinc-500">
                  No contributors found. {isOwner && "Click 'View All' to refresh from GitHub."}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {contributors.slice(0, 5).map((contributor) => (
                <div
                  key={contributor._id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://github.com/${contributor.githubUsername}.png`}
                      alt={contributor.githubUsername}
                      className="h-8 w-8 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{contributor.githubUsername}</p>
                      {contributor.latestMetrics && (
                        <p className="text-sm text-zinc-500">
                          {contributor.latestMetrics.metrics.commits} commits
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {contributor.tier ? (
                      <Badge>{contributor.tier}</Badge>
                    ) : (
                      <Badge variant="outline">Unassigned</Badge>
                    )}
                    {contributor.walletAddress && (
                      <Badge variant="success">Claimed</Badge>
                    )}
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
