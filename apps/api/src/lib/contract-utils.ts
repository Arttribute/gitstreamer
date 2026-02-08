import { ethers } from "ethers";

/**
 * Compute the project ID as it's computed in the GitStreamReceiver contract
 * @param repoUrl The GitHub repository URL
 * @param ownerAddress The wallet address of the project owner
 * @returns The bytes32 project ID that matches the contract's getProjectId function
 */
export function computeProjectId(repoUrl: string, ownerAddress: string): string {
  // Match Solidity: keccak256(abi.encodePacked(repoUrl, owner))
  const encoded = ethers.solidityPacked(
    ["string", "address"],
    [repoUrl, ownerAddress]
  );
  return ethers.keccak256(encoded);
}
