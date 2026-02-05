"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Plus, GitBranch, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, Project } from "@/lib/api";

export default function DashboardPage() {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      router.push("/");
      return;
    }

    async function fetchProjects() {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          router.push("/");
          return;
        }
        const data = await api.projects.list(accessToken);
        setProjects(data.projects);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch projects");
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [authenticated, ready, getAccessToken, router]);

  if (!ready || !authenticated) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Manage your projects and contributors
          </p>
        </div>
        <Link href="/project/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-8">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <GitBranch className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
              <p className="mt-2 text-center text-zinc-500 dark:text-zinc-400">
                Connect a GitHub repository to start streaming revenue to contributors.
              </p>
              <Link href="/project/new" className="mt-6">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project._id} href={`/project/${project._id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-zinc-400" />
                      <CardTitle className="text-lg">{project.repoName}</CardTitle>
                    </div>
                    <Badge variant="secondary">{project.branch}</Badge>
                  </div>
                  <CardDescription>
                    {project.repoOwner}/{project.repoName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <Users className="h-4 w-4" />
                        Tiers
                      </span>
                      <span>{project.tierConfig.tiers.length} configured</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <DollarSign className="h-4 w-4" />
                        Treasury
                      </span>
                      <span>{project.tierConfig.treasuryShare}%</span>
                    </div>
                    {project.yellowSessionId && (
                      <Badge variant="success" className="mt-2">
                        Streaming Active
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
