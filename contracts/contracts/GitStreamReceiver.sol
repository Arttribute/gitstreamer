// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IGitStreamReceiver.sol";

/**
 * @title GitStreamReceiver
 * @notice Receives USDC revenue from connected apps and holds it for distribution
 * @dev Revenue distribution is managed off-chain via Yellow Network state channels
 */
contract GitStreamReceiver is IGitStreamReceiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The USDC token contract
    IERC20 public immutable usdc;

    /// @notice Mapping of project ID to project details
    mapping(bytes32 => Project) public projects;

    /// @notice Mapping of project ID to accumulated revenue
    mapping(bytes32 => uint256) public projectBalances;

    /// @notice Authorized backend addresses that can forward funds
    mapping(address => bool) public authorizedForwarders;

    /// @notice Minimum revenue amount to trigger distribution
    uint256 public minDistributionAmount;

    error ProjectNotActive();
    error ProjectAlreadyExists();
    error NotProjectOwner();
    error NotAuthorizedForwarder();
    error InsufficientBalance();
    error ZeroAddress();
    error ZeroAmount();

    modifier onlyProjectOwner(bytes32 projectId) {
        if (projects[projectId].owner != msg.sender) revert NotProjectOwner();
        _;
    }

    modifier onlyAuthorizedForwarder() {
        if (!authorizedForwarders[msg.sender]) revert NotAuthorizedForwarder();
        _;
    }

    constructor(address _usdc, uint256 _minDistributionAmount) Ownable(msg.sender) {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        minDistributionAmount = _minDistributionAmount;
    }

    /**
     * @notice Register a new project linked to a GitHub repository
     * @param repoUrl The GitHub repository URL (e.g., "github.com/org/repo")
     * @return projectId The unique identifier for the project
     */
    function registerProject(string calldata repoUrl) external returns (bytes32) {
        bytes32 projectId = getProjectId(repoUrl, msg.sender);

        if (projects[projectId].owner != address(0)) revert ProjectAlreadyExists();

        projects[projectId] = Project({
            repoUrl: repoUrl,
            owner: msg.sender,
            active: true
        });

        emit ProjectRegistered(projectId, repoUrl, msg.sender);

        return projectId;
    }

    /**
     * @notice Receive revenue for a project
     * @param projectId The project to receive revenue for
     * @param amount The amount of USDC to receive
     */
    function receiveRevenue(bytes32 projectId, uint256 amount) external nonReentrant {
        if (!projects[projectId].active) revert ProjectNotActive();
        if (amount == 0) revert ZeroAmount();

        // Transfer USDC from sender to this contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update project balance
        projectBalances[projectId] += amount;

        emit RevenueReceived(projectId, address(usdc), amount, msg.sender);
    }

    /**
     * @notice Forward accumulated funds to a recipient (e.g., Yellow session)
     * @dev Only callable by authorized forwarders (backend service)
     * @param projectId The project to forward funds for
     * @param recipient The address to receive the funds
     * @param amount The amount to forward
     */
    function forwardFunds(
        bytes32 projectId,
        address recipient,
        uint256 amount
    ) external onlyAuthorizedForwarder nonReentrant {
        if (!projects[projectId].active) revert ProjectNotActive();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (projectBalances[projectId] < amount) revert InsufficientBalance();

        projectBalances[projectId] -= amount;
        usdc.safeTransfer(recipient, amount);

        emit FundsForwarded(projectId, recipient, amount);
    }

    /**
     * @notice Deactivate a project
     * @param projectId The project to deactivate
     */
    function deactivateProject(bytes32 projectId) external onlyProjectOwner(projectId) {
        projects[projectId].active = false;
        emit ProjectDeactivated(projectId);
    }

    /**
     * @notice Reactivate a project
     * @param projectId The project to reactivate
     */
    function reactivateProject(bytes32 projectId) external onlyProjectOwner(projectId) {
        projects[projectId].active = true;
        emit ProjectRegistered(projectId, projects[projectId].repoUrl, msg.sender);
    }

    /**
     * @notice Get project details
     * @param projectId The project ID to query
     * @return The project details
     */
    function getProject(bytes32 projectId) external view returns (Project memory) {
        return projects[projectId];
    }

    /**
     * @notice Get project balance
     * @param projectId The project ID to query
     * @return The project's accumulated balance
     */
    function getProjectBalance(bytes32 projectId) external view returns (uint256) {
        return projectBalances[projectId];
    }

    /**
     * @notice Calculate project ID from repo URL and owner
     * @param repoUrl The repository URL
     * @param owner The project owner address
     * @return The project ID
     */
    function getProjectId(string calldata repoUrl, address owner) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(repoUrl, owner));
    }

    // Admin functions

    /**
     * @notice Set an address as an authorized forwarder
     * @param forwarder The address to authorize
     * @param authorized Whether to authorize or revoke
     */
    function setAuthorizedForwarder(address forwarder, bool authorized) external onlyOwner {
        if (forwarder == address(0)) revert ZeroAddress();
        authorizedForwarders[forwarder] = authorized;
    }

    /**
     * @notice Set the minimum distribution amount
     * @param _minDistributionAmount The new minimum amount
     */
    function setMinDistributionAmount(uint256 _minDistributionAmount) external onlyOwner {
        minDistributionAmount = _minDistributionAmount;
    }

    /**
     * @notice Emergency withdraw function
     * @dev Only callable by owner, for emergency recovery
     * @param token The token to withdraw
     * @param amount The amount to withdraw
     * @param recipient The recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(recipient, amount);
    }
}
