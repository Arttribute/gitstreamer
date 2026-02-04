import hre from "hardhat";
import { expect } from "chai";
import { parseUnits, getAddress } from "viem";

describe("GitStreamReceiver", function () {
  async function deployFixture() {
    const [owner, projectOwner, tipper, forwarder] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // Deploy MockUSDC
    const mockUSDC = await hre.viem.deployContract("MockUSDC");

    // Deploy GitStreamReceiver with 10 USDC minimum distribution
    const minDistribution = parseUnits("10", 6);
    const gitStreamReceiver = await hre.viem.deployContract("GitStreamReceiver", [
      mockUSDC.address,
      minDistribution,
    ]);

    // Mint USDC to tipper for testing
    const mintAmount = parseUnits("1000", 6);
    await mockUSDC.write.mint([tipper.account.address, mintAmount]);

    return {
      mockUSDC,
      gitStreamReceiver,
      owner,
      projectOwner,
      tipper,
      forwarder,
      publicClient,
      minDistribution,
      mintAmount,
    };
  }

  describe("Project Registration", function () {
    it("should register a new project", async function () {
      const { gitStreamReceiver, projectOwner } = await deployFixture();

      const repoUrl = "github.com/test/repo";
      const hash = await gitStreamReceiver.write.registerProject([repoUrl], {
        account: projectOwner.account,
      });

      // Get the project ID
      const projectId = await gitStreamReceiver.read.getProjectId([
        repoUrl,
        projectOwner.account.address,
      ]);

      // Verify project was created
      const project = await gitStreamReceiver.read.getProject([projectId]);
      expect(project.repoUrl).to.equal(repoUrl);
      expect(getAddress(project.owner)).to.equal(getAddress(projectOwner.account.address));
      expect(project.active).to.be.true;
    });

    it("should not allow registering the same project twice", async function () {
      const { gitStreamReceiver, projectOwner } = await deployFixture();

      const repoUrl = "github.com/test/repo";
      await gitStreamReceiver.write.registerProject([repoUrl], {
        account: projectOwner.account,
      });

      // Try to register again
      await expect(
        gitStreamReceiver.write.registerProject([repoUrl], {
          account: projectOwner.account,
        })
      ).to.be.rejectedWith("ProjectAlreadyExists");
    });
  });

  describe("Revenue Reception", function () {
    it("should receive revenue for an active project", async function () {
      const { gitStreamReceiver, mockUSDC, projectOwner, tipper } = await deployFixture();

      const repoUrl = "github.com/test/repo";
      await gitStreamReceiver.write.registerProject([repoUrl], {
        account: projectOwner.account,
      });

      const projectId = await gitStreamReceiver.read.getProjectId([
        repoUrl,
        projectOwner.account.address,
      ]);

      // Approve USDC transfer
      const tipAmount = parseUnits("100", 6);
      await mockUSDC.write.approve([gitStreamReceiver.address, tipAmount], {
        account: tipper.account,
      });

      // Send revenue
      await gitStreamReceiver.write.receiveRevenue([projectId, tipAmount], {
        account: tipper.account,
      });

      // Verify balance
      const balance = await gitStreamReceiver.read.getProjectBalance([projectId]);
      expect(balance).to.equal(tipAmount);
    });

    it("should not receive revenue for inactive project", async function () {
      const { gitStreamReceiver, mockUSDC, projectOwner, tipper } = await deployFixture();

      const repoUrl = "github.com/test/repo";
      await gitStreamReceiver.write.registerProject([repoUrl], {
        account: projectOwner.account,
      });

      const projectId = await gitStreamReceiver.read.getProjectId([
        repoUrl,
        projectOwner.account.address,
      ]);

      // Deactivate project
      await gitStreamReceiver.write.deactivateProject([projectId], {
        account: projectOwner.account,
      });

      // Try to send revenue
      const tipAmount = parseUnits("100", 6);
      await mockUSDC.write.approve([gitStreamReceiver.address, tipAmount], {
        account: tipper.account,
      });

      await expect(
        gitStreamReceiver.write.receiveRevenue([projectId, tipAmount], {
          account: tipper.account,
        })
      ).to.be.rejectedWith("ProjectNotActive");
    });
  });

  describe("Fund Forwarding", function () {
    it("should forward funds when authorized", async function () {
      const { gitStreamReceiver, mockUSDC, owner, projectOwner, tipper, forwarder } =
        await deployFixture();

      const repoUrl = "github.com/test/repo";
      await gitStreamReceiver.write.registerProject([repoUrl], {
        account: projectOwner.account,
      });

      const projectId = await gitStreamReceiver.read.getProjectId([
        repoUrl,
        projectOwner.account.address,
      ]);

      // Authorize forwarder
      await gitStreamReceiver.write.setAuthorizedForwarder([forwarder.account.address, true], {
        account: owner.account,
      });

      // Send revenue
      const tipAmount = parseUnits("100", 6);
      await mockUSDC.write.approve([gitStreamReceiver.address, tipAmount], {
        account: tipper.account,
      });
      await gitStreamReceiver.write.receiveRevenue([projectId, tipAmount], {
        account: tipper.account,
      });

      // Forward funds
      const recipient = "0x1234567890123456789012345678901234567890";
      await gitStreamReceiver.write.forwardFunds([projectId, recipient, tipAmount], {
        account: forwarder.account,
      });

      // Verify balances
      const projectBalance = await gitStreamReceiver.read.getProjectBalance([projectId]);
      expect(projectBalance).to.equal(0n);

      const recipientBalance = await mockUSDC.read.balanceOf([recipient]);
      expect(recipientBalance).to.equal(tipAmount);
    });

    it("should not forward funds when not authorized", async function () {
      const { gitStreamReceiver, mockUSDC, projectOwner, tipper, forwarder } =
        await deployFixture();

      const repoUrl = "github.com/test/repo";
      await gitStreamReceiver.write.registerProject([repoUrl], {
        account: projectOwner.account,
      });

      const projectId = await gitStreamReceiver.read.getProjectId([
        repoUrl,
        projectOwner.account.address,
      ]);

      // Send revenue
      const tipAmount = parseUnits("100", 6);
      await mockUSDC.write.approve([gitStreamReceiver.address, tipAmount], {
        account: tipper.account,
      });
      await gitStreamReceiver.write.receiveRevenue([projectId, tipAmount], {
        account: tipper.account,
      });

      // Try to forward without authorization
      const recipient = "0x1234567890123456789012345678901234567890";
      await expect(
        gitStreamReceiver.write.forwardFunds([projectId, recipient, tipAmount], {
          account: forwarder.account,
        })
      ).to.be.rejectedWith("NotAuthorizedForwarder");
    });
  });
});
