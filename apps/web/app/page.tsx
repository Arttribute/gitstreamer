"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { GitBranch, Users, DollarSign, Zap, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "Tier-Based Distribution",
    description:
      "Assign contributors to tiers (Core, Active, Community) with revenue percentages. Human governance, not metrics.",
  },
  {
    icon: GitBranch,
    title: "Git Data Visibility",
    description:
      "Git blame provides transparency and context for tier decisions, but humans decide who belongs where.",
  },
  {
    icon: DollarSign,
    title: "Continuous Streaming",
    description:
      "Revenue streams continuously to tier members via Yellow Network. As the project earns, everyone benefits.",
  },
  {
    icon: Zap,
    title: "Gasless Payments",
    description:
      "Off-chain streaming with on-demand settlement. Contributors receive payments without gas fees.",
  },
];

const tiers = [
  { name: "Core Maintainers", share: 40, description: "Long-term stewards, major decisions" },
  { name: "Active Contributors", share: 35, description: "Regular, significant contributions" },
  { name: "Community", share: 15, description: "Occasional contributors, bug fixes" },
  { name: "Treasury", share: 10, description: "Infrastructure, bounties, growth" },
];

export default function Home() {
  const { authenticated, login } = usePrivy();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-50 to-white py-20 dark:from-zinc-900 dark:to-zinc-950 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-800">
              <GitBranch className="h-4 w-4" />
              <span className="text-sm font-medium">Tier-Based Revenue Streaming</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your code shipped.
              <br />
              <span className="bg-gradient-to-r from-zinc-600 to-zinc-400 bg-clip-text text-transparent dark:from-zinc-300 dark:to-zinc-500">
                You get paid.
              </span>
            </h1>

            <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400 sm:text-xl">
              GitStream distributes app revenue to code contributors based on their role, not their
              line count. Connect your repo, assign tiers, stream payments.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {authenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button size="lg" onClick={login} className="gap-2">
                  Connect Wallet
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <Link href="/claim">
                <Button variant="outline" size="lg">
                  Claim Contributions
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="border-y border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">The Problem</h2>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                Code contributors don&apos;t share in the revenue their work generates. Open source
                maintainers build critical infrastructure and earn nothing. Pay-per-line creates
                perverse incentives.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="text-red-500">✗</span>
                  Pay per line = bloated code
                </div>
                <div className="flex items-start gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="text-red-500">✗</span>
                  Automated metrics = gaming
                </div>
                <div className="flex items-start gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="text-red-500">✗</span>
                  No system for fair attribution
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">The Solution</h2>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                GitStream uses tier-based revenue sharing. Contributors are assigned to tiers by
                project owners based on role and commitment. Everyone benefits when the project
                succeeds.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  Human governance, not algorithms
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  Aligned incentives with project success
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  Transparent, continuous payments
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tier Breakdown */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Tier-Based Revenue Model</h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              Contributors are assigned to tiers based on their role, not their output metrics.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => (
              <Card key={tier.name} className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-2xl font-bold dark:bg-zinc-800">
                    {tier.share}%
                  </div>
                  <h3 className="mt-4 font-semibold">{tier.name}</h3>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{tier.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-zinc-50 py-20 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              Git data provides visibility. Humans provide judgment. Tiers provide stability.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
                    <feature.icon className="h-6 w-6 text-white dark:text-zinc-900" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-zinc-900 px-8 py-16 text-center dark:bg-zinc-800">
            <h2 className="text-3xl font-bold text-white">Ready to stream revenue?</h2>
            <p className="mt-4 text-zinc-300">
              Connect your repository and start distributing revenue to your contributors today.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {authenticated ? (
                <Link href="/project/new">
                  <Button
                    size="lg"
                    className="bg-white text-zinc-900 hover:bg-zinc-100"
                  >
                    Create Project
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  onClick={login}
                  className="bg-white text-zinc-900 hover:bg-zinc-100"
                >
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
