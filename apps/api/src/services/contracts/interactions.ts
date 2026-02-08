import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  type Address,
  type WalletClient,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { config } from "../../config.js";

// GitStreamReceiver ABI (minimal interface for interactions)
const GITSTREAM_RECEIVER_ABI = parseAbi([
  "function registerProject(string calldata repoUrl) external returns (bytes32)",
  "function receiveRevenue(bytes32 projectId, uint256 amount) external",
  "function forwardFunds(bytes32 projectId, address recipient, uint256 amount) external",
  "function getProject(bytes32 projectId) external view returns (tuple(string repoUrl, address owner, bool active))",
  "function getProjectBalance(bytes32 projectId) external view returns (uint256)",
  "function getProjectId(string calldata repoUrl, address owner) external pure returns (bytes32)",
  "event ProjectRegistered(bytes32 indexed projectId, string repoUrl, address indexed owner)",
  "event RevenueReceived(bytes32 indexed projectId, address indexed token, uint256 amount, address indexed sender)",
  "event FundsForwarded(bytes32 indexed projectId, address indexed recipient, uint256 amount)",
]);

/**
 * Create a public client for reading contract data
 */
export function createPublicClientInstance(): PublicClient {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });
}

/**
 * Create a wallet client for writing to contracts
 */
export function createWalletClientInstance(): WalletClient {
  if (!config.contracts.deployerPrivateKey) {
    throw new Error("Deployer private key not configured");
  }

  const account = privateKeyToAccount(config.contracts.deployerPrivateKey as Address);

  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });
}

/**
 * Register a project on-chain
 * @param repoUrl - GitHub repository URL (e.g., "github.com/org/repo")
 * @returns The on-chain project ID (bytes32)
 */
export async function registerProjectOnChain(repoUrl: string): Promise<string> {
  const walletClient = createWalletClientInstance();
  const publicClient = createPublicClientInstance();

  if (!config.contracts.gitStreamReceiver) {
    throw new Error("GitStreamReceiver contract address not configured");
  }

  // Call registerProject
  const hash = await walletClient.writeContract({
    address: config.contracts.gitStreamReceiver as Address,
    abi: GITSTREAM_RECEIVER_ABI,
    functionName: "registerProject",
    args: [repoUrl],
  });

  // Wait for transaction
  await publicClient.waitForTransactionReceipt({ hash });

  // Calculate project ID
  const projectId = await getProjectId(repoUrl, walletClient.account.address);

  return projectId;
}

/**
 * Get the project ID for a repo URL and owner address
 */
export async function getProjectId(repoUrl: string, ownerAddress: Address): Promise<string> {
  const publicClient = createPublicClientInstance();

  if (!config.contracts.gitStreamReceiver) {
    throw new Error("GitStreamReceiver contract address not configured");
  }

  const projectId = await publicClient.readContract({
    address: config.contracts.gitStreamReceiver as Address,
    abi: GITSTREAM_RECEIVER_ABI,
    functionName: "getProjectId",
    args: [repoUrl, ownerAddress],
  });

  return projectId as string;
}

/**
 * Get project details from the contract
 */
export async function getProjectFromContract(projectId: string): Promise<{
  repoUrl: string;
  owner: Address;
  active: boolean;
}> {
  const publicClient = createPublicClientInstance();

  if (!config.contracts.gitStreamReceiver) {
    throw new Error("GitStreamReceiver contract address not configured");
  }

  const project = await publicClient.readContract({
    address: config.contracts.gitStreamReceiver as Address,
    abi: GITSTREAM_RECEIVER_ABI,
    functionName: "getProject",
    args: [projectId as `0x${string}`],
  });

  return project as { repoUrl: string; owner: Address; active: boolean };
}

/**
 * Get the accumulated balance for a project
 */
export async function getProjectBalance(projectId: string): Promise<bigint> {
  const publicClient = createPublicClientInstance();

  if (!config.contracts.gitStreamReceiver) {
    throw new Error("GitStreamReceiver contract address not configured");
  }

  const balance = await publicClient.readContract({
    address: config.contracts.gitStreamReceiver as Address,
    abi: GITSTREAM_RECEIVER_ABI,
    functionName: "getProjectBalance",
    args: [projectId as `0x${string}`],
  });

  return balance as bigint;
}

/**
 * Forward funds from the GitStreamReceiver to a recipient (e.g., Yellow session)
 * This requires the backend wallet to be authorized as a forwarder
 */
export async function forwardFunds(
  projectId: string,
  recipient: Address,
  amount: bigint
): Promise<string> {
  const walletClient = createWalletClientInstance();
  const publicClient = createPublicClientInstance();

  if (!config.contracts.gitStreamReceiver) {
    throw new Error("GitStreamReceiver contract address not configured");
  }

  const hash = await walletClient.writeContract({
    address: config.contracts.gitStreamReceiver as Address,
    abi: GITSTREAM_RECEIVER_ABI,
    functionName: "forwardFunds",
    args: [projectId as `0x${string}`, recipient, amount],
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}
