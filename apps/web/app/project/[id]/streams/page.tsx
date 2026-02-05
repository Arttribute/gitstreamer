"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  Play,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, Project, RevenueEvent, StreamStatus } from "@/lib/api";

export default function StreamsPage() {
  const params = useParams();
  const { getAccessToken } = usePrivy();
  const { address } = useAccount();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [revenueEvents, setRevenueEvents] = useState<RevenueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = project?.ownerAddress.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    async function fetchData() {
      try {
        const accessToken = await getAccessToken();
        const [projectRes, revenueRes] = await Promise.all([
          api.projects.get(projectId, accessToken || undefined),
          api.streams.revenue(projectId),
        ]);
        setProject(projectRes.project);
        setRevenueEvents(revenueRes.revenueEvents);

        // Fetch stream status if authenticated
        if (accessToken) {
          try {
            const statusRes = await api.streams.status(projectId, accessToken);
            setStreamStatus(statusRes);
          } catch {
            // Stream status might not be available
          }
        }
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

  const handleCreateStream = async () => {
    if (!isOwner) return;

    setCreating(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      await api.streams.create(projectId, accessToken);
      // Refresh project data
      const projectRes = await api.projects.get(projectId, accessToken);
      setProject(projectRes.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create stream");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-8 h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
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

  const totalRevenue = revenueEvents.reduce(
    (sum, e) => sum + parseFloat(e.amount) / 1e6,
    0
  );
  const distributedRevenue = revenueEvents
    .filter((e) => e.distributed)
    .reduce((sum, e) => sum + parseFloat(e.amount) / 1e6, 0);

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
            <h1 className="text-3xl font-bold">Revenue Streams</h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              {project.repoOwner}/{project.repoName}
            </p>
          </div>
          {isOwner && !project.yellowSessionId && (
            <Button onClick={handleCreateStream} disabled={creating} className="gap-2">
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Streaming
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stream Status */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stream Status</CardDescription>
          </CardHeader>
          <CardContent>
            {project.yellowSessionId ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">Not Started</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-zinc-400" />
              <span className="text-2xl font-bold">
                {totalRevenue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <p className="text-sm text-zinc-500">USDC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Distributed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {distributedRevenue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <p className="text-sm text-zinc-500">USDC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">
                {(totalRevenue - distributedRevenue).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <p className="text-sm text-zinc-500">USDC</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Allocations */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tier Allocations</CardTitle>
            <CardDescription>
              How revenue is distributed across tiers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.tierConfig.tiers.map((tier) => (
                <div key={tier.name} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{tier.name}</p>
                    <p className="text-sm text-zinc-500">
                      {tier.splitMethod === "equal" ? "Equal split" : "Weighted split"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{tier.revenueShare}%</p>
                    <p className="text-sm text-zinc-500">
                      ~$
                      {((totalRevenue * tier.revenueShare) / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <div>
                  <p className="font-medium">Treasury</p>
                  <p className="text-sm text-zinc-500">Reserved funds</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{project.tierConfig.treasuryShare}%</p>
                  <p className="text-sm text-zinc-500">
                    ~$
                    {((totalRevenue * project.tierConfig.treasuryShare) / 100).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stream Info */}
        <Card>
          <CardHeader>
            <CardTitle>Yellow Network Session</CardTitle>
            <CardDescription>
              Payment streaming via state channels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {project.yellowSessionId ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Session Active
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-green-600 dark:text-green-500">
                    Revenue is being streamed to contributors in real-time
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Session ID</p>
                  <p className="mt-1 font-mono text-sm">
                    {project.yellowSessionId.slice(0, 16)}...
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-zinc-50 p-6 text-center dark:bg-zinc-800">
                <Play className="mx-auto h-12 w-12 text-zinc-300" />
                <p className="mt-4 font-medium">No active session</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Start streaming to distribute revenue to contributors
                </p>
                {isOwner && (
                  <Button
                    onClick={handleCreateStream}
                    disabled={creating}
                    className="mt-4 gap-2"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start Streaming
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue History */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue History</CardTitle>
          <CardDescription>
            All revenue events received by this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {revenueEvents.length === 0 ? (
            <div className="py-8 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-zinc-300" />
              <p className="mt-4 text-zinc-500">No revenue received yet</p>
              <p className="mt-2 text-sm text-zinc-400">
                Revenue will appear here when the connected app sends payments
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {revenueEvents.map((event) => (
                <div
                  key={event._id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        ${(parseFloat(event.amount) / 1e6).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        USDC
                      </p>
                      {event.distributed ? (
                        <Badge variant="success">Distributed</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      Block #{event.blockNumber} •{" "}
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={`https://basescan.org/tx/${event.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    View tx →
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
