import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Default USDC addresses on various networks
const USDC_ADDRESSES: Record<number, string> = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum Mainnet
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
  11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia
};

// 10 USDC minimum distribution (with 6 decimals)
const DEFAULT_MIN_DISTRIBUTION = 10_000_000n;

export default buildModule("GitStreamReceiver", (m) => {
  // Get USDC address from parameter or use default for the network
  const usdcAddress = m.getParameter("usdcAddress", USDC_ADDRESSES[84532]); // Default to Base Sepolia
  const minDistributionAmount = m.getParameter("minDistributionAmount", DEFAULT_MIN_DISTRIBUTION);

  const gitStreamReceiver = m.contract("GitStreamReceiver", [usdcAddress, minDistributionAmount]);

  return { gitStreamReceiver };
});
