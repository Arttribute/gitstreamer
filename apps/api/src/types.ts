import type { Project } from "./db/models/project.js";

// Hono context variables
export interface ContextVariables {
  walletAddress: string;
  githubToken: string;
  project: Project;
}
