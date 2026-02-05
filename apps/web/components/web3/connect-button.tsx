"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ConnectButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function ConnectButton({
  className,
  variant = "default",
  size = "default",
}: ConnectButtonProps) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { address } = useAccount();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!ready) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        Loading...
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button variant={variant} size={size} onClick={login} className={className}>
        <Wallet className="mr-2 h-4 w-4" />
        Connect
      </Button>
    );
  }

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : user?.email?.address || "Connected";

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size={size}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={className}
      >
        <Wallet className="mr-2 h-4 w-4" />
        {displayAddress}
        <ChevronDown className="ml-2 h-4 w-4" />
      </Button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {address && (
            <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">Wallet</p>
              <p className="font-mono text-sm">{displayAddress}</p>
            </div>
          )}
          <button
            onClick={() => {
              logout();
              setDropdownOpen(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-zinc-50 dark:text-red-400 dark:hover:bg-zinc-800"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
