"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { GitBranch, Loader2, ChevronRight, Search, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, GitHubRepo } from "@/lib/api";
import { useRegisterProject } from "@/hooks";

type Step = "connect" | "select-repo" | "configure";

interface TierInput {
  name: string;
  revenueShare: number;
  splitMethod: "equal" | "weighted";
}

const DEFAULT_TIERS: TierInput[] = [
  { name: "Core Maintainers", revenueShare: 40, splitMethod: "equal" },
  { name: "Active Contributors", revenueShare: 35, splitMethod: "equal" },
  { name: "Community", revenueShare: 15, splitMethod: "weighted" },
];

export default function NewProjectPage() {
  const { authenticated, ready, login, getAccessToken } = usePrivy();
  const router = useRouter();
  const { registerProject, isRegistering } = useRegisterProject();

  const [step, setStep] = useState<Step>("connect");
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<{ name: string; protected: boolean }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [tiers, setTiers] = useState<TierInput[]>(DEFAULT_TIERS);
  const [treasuryShare, setTreasuryShare] = useState(10);
  const [registerOnchain, setRegisterOnchain] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for GitHub callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("github_token");
    if (token) {
      setGithubToken(token);
      // Save immediately to localStorage
      localStorage.setItem("github_token", token);
      setStep("select-repo");
      // Clean URL
      window.history.replaceState({}, "", "/project/new");
    } else {
      // Check if we already have a token in localStorage
      const storedToken = localStorage.getItem("github_token");
      if (storedToken) {
        setGithubToken(storedToken);
        setStep("select-repo");
      }
    }
  }, []);

  // Fetch repos when token is available
  useEffect(() => {
    if (!githubToken) return;

    async function fetchRepos() {
      setLoading(true);
      try {
        const data = await api.github.repos(githubToken!);
        setRepos(data.repos);
        setFilteredRepos(data.repos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch repositories");
      } finally {
        setLoading(false);
      }
    }

    fetchRepos();
  }, [githubToken]);

  // Filter repos by search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRepos(repos);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredRepos(
      repos.filter(
        (repo) =>
          repo.name.toLowerCase().includes(query) ||
          repo.full_name.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, repos]);

  // Fetch branches when repo is selected
  useEffect(() => {
    if (!selectedRepo || !githubToken) return;

    async function fetchBranches() {
      setLoading(true);
      try {
        const data = await api.github.branches(
          selectedRepo!.owner.login,
          selectedRepo!.name,
          githubToken!
        );
        setBranches(data.branches);
        setSelectedBranch(selectedRepo!.default_branch);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch branches");
      } finally {
        setLoading(false);
      }
    }

    fetchBranches();
  }, [selectedRepo, githubToken]);

  const handleGitHubConnect = () => {
    const authUrl = api.github.authUrl(`${window.location.origin}/project/new`);
    window.location.href = authUrl;
  };

  const handleRepoSelect = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setStep("configure");
  };

  const handleCreateProject = async () => {
    if (!authenticated || !selectedRepo || !selectedBranch) return;

    // Validate tier percentages
    const totalShare = tiers.reduce((sum, t) => sum + t.revenueShare, 0) + treasuryShare;
    if (totalShare !== 100) {
      setError(`Tier percentages must sum to 100%. Current: ${totalShare}%`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const repoUrl = `github.com/${selectedRepo.full_name}`;

      const result = await api.projects.create(
        {
          repoUrl,
          branch: selectedBranch,
          tierConfig: {
            tiers: tiers,
            treasuryShare: treasuryShare,
          },
        },
        accessToken
      );

      // Automatically fetch contributors if we have a GitHub token
      if (githubToken) {
        try {
          await api.contributors.refresh(result.project._id, accessToken, githubToken);
        } catch (refreshErr) {
          // Don't fail project creation if contributor refresh fails
          console.warn("Failed to fetch contributors:", refreshErr);
        }
      }

      // Register onchain if selected
      if (registerOnchain) {
        try {
          await registerProject(result.project._id, repoUrl);
        } catch (regErr) {
          // Don't fail project creation if onchain registration fails
          console.warn("Failed to register onchain:", regErr);
          // User can register later from the project page
        }
      }

      router.push(`/project/${result.project._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setLoading(false);
    }
  };

  const updateTier = (index: number, field: keyof TierInput, value: string | number) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  };

  if (!ready) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            <p className="mt-4 text-zinc-500">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <h2 className="text-xl font-semibold">Connect Wallet</h2>
            <p className="mt-2 text-zinc-500">
              Please connect your wallet to create a project.
            </p>
            <Button onClick={login} className="mt-4">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Steps indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[
          { id: "connect", label: "Connect GitHub" },
          { id: "select-repo", label: "Select Repository" },
          { id: "configure", label: "Configure Tiers" },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s.id || (step === "configure" && s.id !== "configure")
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`ml-2 text-sm ${
                step === s.id ? "font-medium" : "text-zinc-400"
              }`}
            >
              {s.label}
            </span>
            {i < 2 && <ChevronRight className="mx-4 h-4 w-4 text-zinc-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Connect GitHub */}
      {step === "connect" && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Connect GitHub</CardTitle>
            <CardDescription>
              Authorize GitStream to access your repositories
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <GitBranch className="h-8 w-8" />
            </div>
            <p className="mt-4 max-w-sm text-center text-sm text-zinc-500 dark:text-zinc-400">
              We&apos;ll use read-only access to analyze contributors and verify repository
              ownership.
            </p>
            <Button onClick={handleGitHubConnect} className="mt-6 gap-2">
              <GitBranch className="h-4 w-4" />
              Connect GitHub
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Repository */}
      {step === "select-repo" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Repository</CardTitle>
            <CardDescription>Choose a repository to connect to GitStream</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleRepoSelect(repo)}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      {repo.private ? (
                        <Lock className="h-4 w-4 text-zinc-400" />
                      ) : (
                        <Globe className="h-4 w-4 text-zinc-400" />
                      )}
                      <div>
                        <div className="font-medium">{repo.name}</div>
                        <div className="text-sm text-zinc-500">{repo.owner.login}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>
                ))}

                {filteredRepos.length === 0 && (
                  <div className="py-8 text-center text-zinc-500">No repositories found</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Configure Tiers */}
      {step === "configure" && selectedRepo && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Repository</CardTitle>
              <CardDescription>Selected repository and branch</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-zinc-400" />
                  <div>
                    <div className="font-medium">{selectedRepo.full_name}</div>
                    <div className="text-sm text-zinc-500">{selectedRepo.description}</div>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setStep("select-repo")}>
                  Change
                </Button>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium">Branch</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-800"
                >
                  {branches.map((branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name}
                      {branch.protected ? " (protected)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tier Configuration</CardTitle>
              <CardDescription>
                Define how revenue is distributed across contributor tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tiers.map((tier, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="flex-1">
                      <Input
                        value={tier.name}
                        onChange={(e) => updateTier(index, "name", e.target.value)}
                        placeholder="Tier name"
                      />
                    </div>
                    <div className="w-24">
                      <div className="flex items-center">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={tier.revenueShare}
                          onChange={(e) =>
                            updateTier(index, "revenueShare", parseInt(e.target.value) || 0)
                          }
                        />
                        <span className="ml-1 text-zinc-500">%</span>
                      </div>
                    </div>
                    <select
                      value={tier.splitMethod}
                      onChange={(e) =>
                        updateTier(index, "splitMethod", e.target.value as "equal" | "weighted")
                      }
                      className="h-10 rounded-lg border border-zinc-200 bg-transparent px-3 text-sm dark:border-zinc-800"
                    >
                      <option value="equal">Equal split</option>
                      <option value="weighted">Weighted</option>
                    </select>
                  </div>
                ))}

                <div className="flex items-center gap-4 rounded-lg border border-dashed border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="flex-1">
                    <span className="font-medium">Treasury</span>
                    <p className="text-sm text-zinc-500">
                      Reserved for infrastructure, bounties, and future development
                    </p>
                  </div>
                  <div className="w-24">
                    <div className="flex items-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={treasuryShare}
                        onChange={(e) => setTreasuryShare(parseInt(e.target.value) || 0)}
                      />
                      <span className="ml-1 text-zinc-500">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <span className="font-medium">Total</span>
                <Badge
                  variant={
                    tiers.reduce((s, t) => s + t.revenueShare, 0) + treasuryShare === 100
                      ? "success"
                      : "destructive"
                  }
                >
                  {tiers.reduce((s, t) => s + t.revenueShare, 0) + treasuryShare}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Onchain Registration</CardTitle>
              <CardDescription>
                Register your project onchain to enable revenue streaming
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="registerOnchain"
                  checked={registerOnchain}
                  onChange={(e) => setRegisterOnchain(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <div className="flex-1">
                  <label htmlFor="registerOnchain" className="cursor-pointer font-medium">
                    Register project onchain now
                  </label>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    This will create a transaction to register your project on Base Sepolia.
                    You can also register later from the project page if you skip this step.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setStep("select-repo")}>
              Back
            </Button>
            <Button onClick={handleCreateProject} disabled={loading || isRegistering}>
              {(loading || isRegistering) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRegistering ? "Registering Onchain..." : "Create Project"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
