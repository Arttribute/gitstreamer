#!/usr/bin/env node
import { spawnSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const NETWORKS = {
  baseSepolia: {
    chainId: 84532,
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  base: {
    chainId: 8453,
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
};

async function main() {
  const args = process.argv.slice(2);
  const networkName = args[0] || "baseSepolia";

  if (!NETWORKS[networkName as keyof typeof NETWORKS]) {
    console.error(`❌ Unknown network: ${networkName}`);
    console.log("Available networks: baseSepolia, base");
    process.exit(1);
  }

  const network = NETWORKS[networkName as keyof typeof NETWORKS];

  console.log(`\n🚀 Deploying GitStreamReceiver to ${networkName}...\n`);

  try {
    // Run Hardhat Ignition deployment with auto-confirmation
    const deployCommand = `echo "y" | pnpm hardhat ignition deploy ignition/modules/GitStreamReceiver.ts --network ${networkName}`;
    console.log(`Running: ${deployCommand}\n`);

    const result = spawnSync("sh", ["-c", deployCommand], {
      cwd: join(__dirname, ".."),
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "inherit"],
    });

    if (result.status !== 0) {
      throw new Error(`Deployment command exited with code ${result.status}`);
    }

    const output = result.stdout || "";
    console.log(output);

    // Parse the deployment output to find the deployed address
    // Look for the deployed_addresses.json file in the ignition/deployments folder
    const deploymentDir = join(
      __dirname,
      "..",
      "ignition",
      "deployments",
      `chain-${network.chainId}`
    );

    const deployedAddressesPath = join(deploymentDir, "deployed_addresses.json");

    if (!existsSync(deployedAddressesPath)) {
      console.error(`❌ Could not find deployed addresses at ${deployedAddressesPath}`);
      process.exit(1);
    }

    const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf-8"));
    const contractAddress =
      deployedAddresses["GitStreamReceiver#GitStreamReceiver"];

    if (!contractAddress) {
      console.error("❌ Could not find GitStreamReceiver address in deployment output");
      process.exit(1);
    }

    console.log(`\n✅ GitStreamReceiver deployed at: ${contractAddress}\n`);

    // Update contracts/.env
    updateEnvFile(
      join(__dirname, "..", ".env"),
      join(__dirname, "..", ".env.example"),
      {
        GITSTREAM_RECEIVER_ADDRESS: contractAddress,
      }
    );

    // Update apps/api/.env
    updateEnvFile(
      join(__dirname, "..", "..", "apps", "api", ".env"),
      join(__dirname, "..", "..", "apps", "api", ".env.example"),
      {
        GITSTREAM_RECEIVER_ADDRESS: contractAddress,
        USDC_ADDRESS: network.usdcAddress,
        CHAIN_ID: network.chainId.toString(),
      }
    );

    console.log("\n✅ Environment files updated successfully!");
    console.log(`\nContract deployed to ${networkName}:`);
    console.log(`  GitStreamReceiver: ${contractAddress}`);
    console.log(`  USDC: ${network.usdcAddress}`);
    console.log(`  Chain ID: ${network.chainId}`);
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

function updateEnvFile(
  envPath: string,
  examplePath: string,
  updates: Record<string, string>
) {
  let envContent: string;

  // If .env doesn't exist, use .env.example as template
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, "utf-8");
    console.log(`📝 Updating ${envPath}`);
  } else if (existsSync(examplePath)) {
    envContent = readFileSync(examplePath, "utf-8");
    console.log(`📝 Creating ${envPath} from ${examplePath}`);
  } else {
    console.warn(`⚠️  Could not find ${envPath} or ${examplePath}, skipping`);
    return;
  }

  // Update each key-value pair
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // If key doesn't exist, append it
      envContent = envContent.trimEnd() + `\n${key}=${value}\n`;
    }
  }

  writeFileSync(envPath, envContent);
  console.log(`  ✅ Updated ${Object.keys(updates).join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
