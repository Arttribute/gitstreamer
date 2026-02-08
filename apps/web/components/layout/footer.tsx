import { GitBranch } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 dark:bg-zinc-100">
              <GitBranch className="h-4 w-4 text-white dark:text-zinc-900" />
            </div>
            <span className="text-sm font-semibold">GitStreamer</span>
          </div>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Tier-based revenue streaming for code contributors.
          </p>

          <div className="flex items-center gap-6">
            <Link
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              GitHub
            </Link>
            <Link
              href="/docs"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Docs
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
