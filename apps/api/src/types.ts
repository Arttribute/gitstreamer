import type { Project } from "./db/models/project.js";

// Hono context variables
export interface ContextVariables {
  walletAddress: string;
  userId?: string;
  authMethod?: "privy" | "signature" | "api-key" | "wallet-header";
  githubToken: string;
  project: Project;
}
