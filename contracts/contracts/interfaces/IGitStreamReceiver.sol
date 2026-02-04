// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IGitStreamReceiver {
    struct Project {
        string repoUrl;
        address owner;
        bool active;
    }

    event ProjectRegistered(bytes32 indexed projectId, string repoUrl, address indexed owner);
    event ProjectDeactivated(bytes32 indexed projectId);
    event RevenueReceived(bytes32 indexed projectId, address indexed token, uint256 amount, address indexed sender);
    event FundsForwarded(bytes32 indexed projectId, address indexed recipient, uint256 amount);

    function registerProject(string calldata repoUrl) external returns (bytes32);
    function receiveRevenue(bytes32 projectId, uint256 amount) external;
    function getProject(bytes32 projectId) external view returns (Project memory);
    function getProjectId(string calldata repoUrl, address owner) external pure returns (bytes32);
}
