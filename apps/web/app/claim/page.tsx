"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { GitBranch, CheckCircle, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface Assignment {
  project: {
    _id: string;
    repoOwner: string;
    repoName: string;
  };
  tier: string;
}

type Step = "connect-wallet" | "connect-github" | "claim" | "success";

export default function ClaimPage() {
  const { authenticated, login, getAccessToken } = usePrivy();
  const { address } = useAccount();

  const [step, setStep] = useState<Step>("connect-wallet");
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<{
    login: string;
    avatar_url: string;
    name?: string;
  } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<{
    success: boolean;
    contributorsUpdated: number;
  } | null>(null);

  // Update step based on connection state
  useEffect(() => {
    if (!authenticated) {
      setStep("connect-wallet");
    } else if (!githubToken) {
      setStep("connect-github");
    } else if (!claimResult) {
      setStep("claim");
    } else {
      setStep("success");
    }
  }, [authenticated, githubToken, claimResult]);

  // Check for GitHub callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("github_token");
    if (token) {
      setGithubToken(token);
      localStorage.setItem("github_token", token);
      // Clean URL
      window.history.replaceState({}, "", "/claim");
    } else {
      // Check localStorage
      const storedToken = localStorage.getItem("github_token");
      if (storedToken) {
        setGithubToken(storedToken);
      }
    }
  }, []);

  // Fetch GitHub user when token is available
  useEffect(() => {
    if (!githubToken) return;

    async function fetchUser() {
      try {
        const data = await api.github.user(githubToken!);
        setGithubUser(data.user);
      } catch {
        // Token might be expired
        localStorage.removeItem("github_token");
        setGithubToken(null);
      }
    }

    fetchUser();
  }, [githubToken]);

  // Fetch assignments when authenticated
  useEffect(() => {
    if (!authenticated) return;

    async function fetchAssignments() {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return;
        const data = await api.claims.me(accessToken);
        setAssignments(data.assignments);
      } catch {
        // Ignore errors
      }
    }

    fetchAssignments();
  }, [authenticated, getAccessToken]);

  const handleGitHubConnect = () => {
    const authUrl = api.github.authUrl(`${window.location.origin}/claim`);
    window.location.href = authUrl;
  };

  const handleClaim = async () => {
    if (!authenticated || !githubToken) return;

    setLoading(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const result = await api.claims.claim(accessToken, githubToken);
      setClaimResult(result);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim contributions");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGitHub = () => {
    localStorage.removeItem("github_token");
    setGithubToken(null);
    setGithubUser(null);
    setClaimResult(null);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Claim Your Contributions</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Link your GitHub account to your wallet to receive streaming payments
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-6">
        {/* Step 1: Connect Wallet */}
        <Card className={step === "connect-wallet" ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    authenticated
                      ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                      : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                >
                  {authenticated ? <CheckCircle className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                </div>
                <CardTitle className="text-base">Connect Wallet</CardTitle>
              </div>
              {authenticated && <Badge variant="success">Connected</Badge>}
            </div>
          </CardHeader>
          {step === "connect-wallet" && (
            <CardContent>
              <p className="mb-4 text-sm text-zinc-500">
                Connect your wallet to receive streaming payments for your contributions.
              </p>
              <Button onClick={login} className="gap-2">
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            </CardContent>
          )}
          {authenticated && address && (
            <CardContent className="pt-0">
              <p className="font-mono text-sm text-zinc-500">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </CardContent>
          )}
        </Card>

        {/* Step 2: Connect GitHub */}
        <Card
          className={
            step === "connect-github" ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""
          }
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    githubUser
                      ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                      : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                >
                  {githubUser ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <GitBranch className="h-4 w-4" />
                  )}
                </div>
                <CardTitle className="text-base">Connect GitHub</CardTitle>
              </div>
              {githubUser && <Badge variant="success">Connected</Badge>}
            </div>
          </CardHeader>
          {step === "connect-github" && (
            <CardContent>
              <p className="mb-4 text-sm text-zinc-500">
                Connect your GitHub account to verify your contributions.
              </p>
              <Button onClick={handleGitHubConnect} className="gap-2">
                <GitBranch className="h-4 w-4" />
                Connect GitHub
              </Button>
            </CardContent>
          )}
          {githubUser && (
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={githubUser.avatar_url}
                    alt={githubUser.login}
                    className="h-8 w-8 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{githubUser.name || githubUser.login}</p>
                    <p className="text-sm text-zinc-500">@{githubUser.login}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleDisconnectGitHub}>
                  Disconnect
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Step 3: Claim */}
        <Card
          className={step === "claim" ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    claimResult
                      ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                      : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                >
                  {claimResult ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">3</span>
                  )}
                </div>
                <CardTitle className="text-base">Claim Contributions</CardTitle>
              </div>
              {claimResult && <Badge variant="success">Claimed</Badge>}
            </div>
          </CardHeader>
          {step === "claim" && (
            <CardContent>
              <p className="mb-4 text-sm text-zinc-500">
                Link your GitHub account to your wallet to receive streaming payments.
              </p>
              <Button onClick={handleClaim} disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Claim Contributions
              </Button>
            </CardContent>
          )}
          {claimResult && (
            <CardContent className="pt-0">
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <p className="font-medium text-green-700 dark:text-green-400">
                  Successfully claimed!
                </p>
                <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                  {claimResult.contributorsUpdated} contribution
                  {claimResult.contributorsUpdated !== 1 ? "s" : ""} linked to your wallet.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Tier Assignments */}
      {assignments.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your Tier Assignments</CardTitle>
            <CardDescription>
              Projects where you have been assigned to a tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignments.map((assignment, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div>
                    <p className="font-medium">
                      {assignment.project.repoOwner}/{assignment.project.repoName}
                    </p>
                    <Badge className="mt-1">{assignment.tier}</Badge>
                  </div>
                  <a
                    href={`/project/${assignment.project._id}`}
                    className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    View project →
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <div className="mt-12 rounded-lg bg-zinc-50 p-6 dark:bg-zinc-900">
        <h3 className="font-semibold">How it works</h3>
        <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <span>
              Your GitHub username is linked to your wallet address across all GitStream
              projects.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <span>
              When project owners assign you to a tier, you&apos;ll automatically receive
              streaming payments.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <span>
              Payments are streamed via Yellow Network and can be settled on-chain anytime.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
