import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";

describe("Bridge", function () {
  let ERC20Factory : ContractFactory;
	let erc20: Contract;
  let BSC20Factory : ContractFactory;
	let bsc20: Contract;
  let BridgeETH: ContractFactory;
  let ethBridge: Contract;
	let BridgeBSC: ContractFactory;
  let bscBridge: Contract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  
  const hardhatChainId = 31337;
  const bscChainId = 97;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
  });

  beforeEach(async function () {
    ERC20Factory = await ethers.getContractFactory("ERC20");
    erc20 = await ERC20Factory.deploy("TAR", "TAR", 18);
    await erc20.deployed();

    BridgeETH = await ethers.getContractFactory("BridgeETH");
    ethBridge = await BridgeETH.deploy(owner.address, erc20.address);
    await ethBridge.deployed();

    BSC20Factory = await ethers.getContractFactory("ERC20");
    bsc20 = await BSC20Factory.deploy("TAR", "TAR", 18);
    await bsc20.deployed();

    BridgeBSC = await ethers.getContractFactory("BridgeBSC");
    bscBridge = await BridgeBSC.deploy(owner.address, bsc20.address);
    await bscBridge.deployed();

    await erc20.grantRole(erc20.DEFAULT_ADMIN_ROLE(), ethBridge.address);
    await bsc20.grantRole(bsc20.DEFAULT_ADMIN_ROLE(), bscBridge.address);
  });

  describe("addChain", function () {
    it("Should add chain", async function () {
      await expect(ethBridge.connect(owner).addChain(bscChainId))
        .to.emit(ethBridge, "ChainAdded")
        .withArgs(bscChainId, owner.address);
    });
  
    it("Should fail to add chain (Missing role)", async function () {
      await expect(ethBridge.connect(addr1).addChain(bscChainId))
        .to.be.revertedWith(
          "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000"
        );
    });
  });

  describe("removeChain", function () {
    it("Should remove chain", async function () {
      await expect(ethBridge.connect(owner).removeChain(bscChainId))
        .to.emit(ethBridge, "ChainRemoved")
        .withArgs(bscChainId, owner.address);
    });
  
    it("Should fail to remove chain (Missing role)", async function () {
      await expect(ethBridge.connect(addr1).removeChain(bscChainId))
        .to.be.revertedWith(
          "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000"
        );
    });
  });

  describe("swap", function () {
    it("Should swap properly", async function () {
      const amount = 100;
      const nonce = 1;

      await erc20.connect(owner).mint(addr1.address, amount);
      await ethBridge.connect(owner).addChain(bscChainId);

      await expect(ethBridge.connect(addr1)
        .swap(amount, addr1.address, bscChainId, nonce))
        .to.emit(ethBridge, "SwapInitialized")
        .withArgs(
          amount, 
          addr1.address, 
          addr1.address, 
          bscChainId, 
          hardhatChainId, 
          nonce
        );
    });

    it("Should fail to swap (This chain is not supported)", async function () {
      const amount = 100;
      const nonce = 1;

      await erc20.connect(owner).mint(addr1.address, amount);

      await expect(ethBridge.connect(addr1)
        .swap(amount, addr1.address, bscChainId, nonce))
        .to.be.revertedWith("This chain is not supported");
    });
  });

  describe("redeem", function () {
    it("Should redeem properly", async function () {
      const amount = 100;
      const nonce = 1;

      await erc20.connect(owner).mint(addr1.address, amount);
      await ethBridge.connect(owner).addChain(bscChainId);
      await bscBridge.connect(owner).addChain(hardhatChainId);

      const balanceEthBefore = await erc20.connect(addr1).balanceOf(addr1.address);
      console.log(balanceEthBefore);

      await expect(ethBridge.connect(addr1)
      .swap(amount, addr1.address, bscChainId, nonce))
      .to.emit(ethBridge, "SwapInitialized")
      .withArgs(
        amount, 
        addr1.address, 
        addr1.address, 
        bscChainId, 
        hardhatChainId, 
        nonce
      );

      const balanceEthAfter = await erc20.connect(addr1).balanceOf(addr1.address);
      console.log(balanceEthAfter);
      
      const swapHash = ethers.utils.solidityKeccak256(
        ["uint256", "address", "uint256", "uint256"],
        [amount, addr1.address, hardhatChainId, nonce]
      );

      const hashArray = ethers.utils.arrayify(swapHash);
      const signedMessage = await owner.signMessage(hashArray);
      const signature = ethers.utils.splitSignature(signedMessage);

      await expect(bscBridge.connect(owner).redeem(
        addr1.address, 
        amount, 
        signature.v, 
        signature.r, 
        signature.s, 
        hardhatChainId, 
        nonce))
          .to.emit(bscBridge, "SwapRedeemed")
          .withArgs(amount, addr1.address, hardhatChainId, swapHash
      );

      const balanceBscAfter = await bsc20.connect(addr1).balanceOf(addr1.address);
      console.log(balanceBscAfter);
    });
  });
});
