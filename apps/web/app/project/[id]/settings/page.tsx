"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  GitBranch,
  DollarSign,
  Calendar,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, Project } from "@/lib/api";

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const { address } = useAccount();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [minDistributionAmount, setMinDistributionAmount] = useState("");
  const [escrowExpiryDays, setEscrowExpiryDays] = useState("");

  const isOwner = project?.ownerAddress.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    async function fetchProject() {
      try {
        const accessToken = await getAccessToken();
        const res = await api.projects.get(projectId, accessToken || undefined);
        setProject(res.project);
        setMinDistributionAmount(res.project.settings.minDistributionAmount);
        setEscrowExpiryDays(res.project.settings.escrowExpiryDays.toString());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      fetchProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleSaveSettings = async () => {
    if (!isOwner || !project) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const res = await api.projects.update(
        projectId,
        {
          settings: {
            minDistributionAmount,
            escrowExpiryDays: parseInt(escrowExpiryDays, 10),
          },
        },
        accessToken
      );

      setProject(res.project);
      setSuccessMessage("Settings saved successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!isOwner) return;

    setDeleting(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      await api.projects.delete(projectId, accessToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-8 h-8 w-64" />
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
            <p className="mt-4 text-lg font-medium">Access Denied</p>
            <p className="mt-2 text-zinc-500">
              Only the project owner can access settings
            </p>
            <Link href={`/project/${projectId}`} className="mt-4 inline-block">
              <Button variant="outline">Back to Project</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/project/${projectId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-zinc-400" />
          <h1 className="text-3xl font-bold">Project Settings</h1>
        </div>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {project.repoOwner}/{project.repoName}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-600 dark:bg-green-900/20 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {/* Repository Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Repository Information
          </CardTitle>
          <CardDescription>Read-only repository details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-zinc-500">Repository URL</Label>
            <p className="mt-1 font-mono text-sm">{project.repoUrl}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm text-zinc-500">Owner</Label>
              <p className="mt-1">{project.repoOwner}</p>
            </div>
            <div>
              <Label className="text-sm text-zinc-500">Repository</Label>
              <p className="mt-1">{project.repoName}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm text-zinc-500">Branch</Label>
              <p className="mt-1">{project.branch}</p>
            </div>
            <div>
              <Label className="text-sm text-zinc-500">Created</Label>
              <p className="mt-1">{new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          {project.receiverContract && (
            <div>
              <Label className="text-sm text-zinc-500">Receiver Contract</Label>
              <p className="mt-1 font-mono text-sm">{project.receiverContract}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribution Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Distribution Settings
          </CardTitle>
          <CardDescription>
            Configure how revenue is distributed to contributors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="minDistribution">
              Minimum Distribution Amount (USDC)
            </Label>
            <p className="mb-2 text-sm text-zinc-500">
              Minimum amount required before distributing to contributors
            </p>
            <Input
              id="minDistribution"
              type="number"
              value={minDistributionAmount}
              onChange={(e) => setMinDistributionAmount(e.target.value)}
              placeholder="10"
              min="0"
              step="1"
            />
          </div>

          <div>
            <Label htmlFor="escrowExpiry">
              Escrow Expiry Days
            </Label>
            <p className="mb-2 text-sm text-zinc-500">
              Days before unclaimed funds are returned to treasury
            </p>
            <Input
              id="escrowExpiry"
              type="number"
              value={escrowExpiryDays}
              onChange={(e) => setEscrowExpiryDays(e.target.value)}
              placeholder="90"
              min="1"
              step="1"
            />
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Tier Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Tier Configuration
          </CardTitle>
          <CardDescription>
            Current tier structure and revenue allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {project.tierConfig.tiers.map((tier, index) => (
              <div
                key={tier.name}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div>
                  <p className="font-medium">{tier.name}</p>
                  <p className="text-sm text-zinc-500">
                    {tier.splitMethod === "equal" ? "Equal split" : "Weighted split"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{tier.revenueShare}%</p>
                  <p className="text-sm text-zinc-500">revenue share</p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <p className="font-medium">Treasury</p>
                <p className="text-sm text-zinc-500">Reserved funds</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{project.tierConfig.treasuryShare}%</p>
                <p className="text-sm text-zinc-500">revenue share</p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            To modify tier configuration, please contact support or recreate the project
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that will permanently affect this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <div>
              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                Once you delete a project, there is no going back. This will remove all
                contributor data, tier assignments, and revenue history.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Project
              </Button>
            </div>
          ) : (
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <p className="mb-4 font-medium text-red-900 dark:text-red-100">
                Are you absolutely sure?
              </p>
              <p className="mb-4 text-sm text-red-700 dark:text-red-300">
                This action cannot be undone. This will permanently delete the{" "}
                <span className="font-mono font-semibold">
                  {project.repoOwner}/{project.repoName}
                </span>{" "}
                project and remove all associated data.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={handleDeleteProject}
                  disabled={deleting}
                  className="gap-2"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Yes, delete this project
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
