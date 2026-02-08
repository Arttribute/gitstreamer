import { createPublicClient, http, parseAbiItem, type Log, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { config } from "../../config.js";
import { getDatabase } from "../../db/client.js";
import type { Project } from "../../db/models/project.js";
import type { RevenueEvent } from "../../db/models/revenue.js";

const GITSTREAM_RECEIVER_ABI = [
  parseAbiItem("event RevenueReceived(bytes32 indexed projectId, address indexed token, uint256 amount, address indexed sender)"),
];

export interface RevenueReceivedEvent {
  projectId: string;
  token: Address;
  amount: bigint;
  sender: Address;
  blockNumber: bigint;
  transactionHash: string;
}

/**
 * Create a public client for reading blockchain data
 */
function createClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });
}

/**
 * Listen for RevenueReceived events from the GitStreamReceiver contract
 * This should run continuously in the background
 */
export async function startEventListener(): Promise<void> {
  const client = createClient();

  if (!config.contracts.gitStreamReceiver) {
    console.warn("GitStreamReceiver contract address not configured, event listener disabled");
    return;
  }

  console.log(`Starting event listener for GitStreamReceiver at ${config.contracts.gitStreamReceiver}`);

  // Get the latest block
  let lastProcessedBlock = await client.getBlockNumber();

  // Poll for new events every 12 seconds (Base block time)
  setInterval(async () => {
    try {
      const currentBlock = await client.getBlockNumber();

      if (currentBlock > lastProcessedBlock) {
        await processBlockRange(client, lastProcessedBlock + 1n, currentBlock);
        lastProcessedBlock = currentBlock;
      }
    } catch (error) {
      console.error("Error processing blocks:", error);
    }
  }, 12000);
}

/**
 * Process a range of blocks for RevenueReceived events
 */
async function processBlockRange(
  client: ReturnType<typeof createClient>,
  fromBlock: bigint,
  toBlock: bigint
): Promise<void> {
  const logs = await client.getLogs({
    address: config.contracts.gitStreamReceiver as Address,
    event: parseAbiItem("event RevenueReceived(bytes32 indexed projectId, address indexed token, uint256 amount, address indexed sender)"),
    fromBlock,
    toBlock,
  });

  for (const log of logs) {
    await processRevenueEvent(log);
  }
}

/**
 * Process a single RevenueReceived event
 */
async function processRevenueEvent(log: Log): Promise<void> {
  try {
    // Decode event data
    const { projectId, token, amount, sender } = log.args as {
      projectId: string;
      token: Address;
      amount: bigint;
      sender: Address;
    };

    console.log(`Revenue received for project ${projectId}: ${amount.toString()} from ${sender}`);

    const db = await getDatabase();

    // Check if event already processed (idempotency)
    const existing = await db.collection<RevenueEvent>("revenue").findOne({
      txHash: log.transactionHash,
    });

    if (existing) {
      console.log(`Event ${log.transactionHash} already processed, skipping`);
      return;
    }

    // Find the project
    const project = await db.collection<Project>("projects").findOne({
      projectIdBytes32: projectId,
    });

    if (!project) {
      console.warn(`Project not found for projectId ${projectId}`);
      return;
    }

    // Store revenue event
    const revenueEvent: RevenueEvent = {
      projectId: project._id!,
      amount: amount.toString(),
      tokenAddress: token,
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      chainId: config.chainId,
      distributed: false,
      createdAt: new Date(),
    };

    await db.collection<RevenueEvent>("revenue").insertOne(revenueEvent);

    console.log(`Stored revenue event ${log.transactionHash} for project ${project.repoUrl}`);

    // TODO: Optionally auto-trigger distribution if threshold is met
    // await checkAndTriggerDistribution(project);

  } catch (error) {
    console.error("Error processing revenue event:", error);
  }
}

/**
 * Manually process historical events from a specific block
 * Useful for catching up after downtime or initial setup
 */
export async function processHistoricalEvents(fromBlock?: bigint): Promise<number> {
  const client = createClient();
  const currentBlock = await client.getBlockNumber();
  const startBlock = fromBlock || currentBlock - 1000n; // Default: last 1000 blocks

  console.log(`Processing historical events from block ${startBlock} to ${currentBlock}`);

  const logs = await client.getLogs({
    address: config.contracts.gitStreamReceiver as Address,
    event: parseAbiItem("event RevenueReceived(bytes32 indexed projectId, address indexed token, uint256 amount, address indexed sender)"),
    fromBlock: startBlock,
    toBlock: currentBlock,
  });

  for (const log of logs) {
    await processRevenueEvent(log);
  }

  console.log(`Processed ${logs.length} historical events`);
  return logs.length;
}

/**
 * Get the latest block number
 */
export async function getCurrentBlockNumber(): Promise<bigint> {
  const client = createClient();
  return await client.getBlockNumber();
}
