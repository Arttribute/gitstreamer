import { parseAbi } from "viem";

export const GITSTREAM_RECEIVER_ADDRESS =
  (process.env.NEXT_PUBLIC_GITSTREAM_RECEIVER_ADDRESS as `0x${string}`) ||
  "0xc12317F7734ef877A407Cb2a18f9434261F9e96C";

export const GITSTREAM_RECEIVER_ABI = parseAbi([
  "function registerProject(string calldata repoUrl) external returns (bytes32)",
  "function receiveRevenue(bytes32 projectId, uint256 amount) external",
  "function forwardFunds(bytes32 projectId, address recipient, uint256 amount) external",
  "function getProjectBalance(bytes32 projectId) external view returns (uint256)",
  "function getProjectId(string calldata repoUrl, address owner) external pure returns (bytes32)",
  "function deactivateProject(bytes32 projectId) external",
  "function reactivateProject(bytes32 projectId) external",
  "event ProjectRegistered(bytes32 indexed projectId, string repoUrl, address indexed owner)",
  "event RevenueReceived(bytes32 indexed projectId, address indexed token, uint256 amount, address indexed sender)",
  "event FundsForwarded(bytes32 indexed projectId, address indexed recipient, uint256 amount)",
  "event ProjectDeactivated(bytes32 indexed projectId)",
]);
