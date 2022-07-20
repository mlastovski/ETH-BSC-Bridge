import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory, BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";

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
          "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 " +
          "is missing role 0x0000000000000000000000000000000000000000000000000000000000000000"
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
          "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 " +
          "is missing role 0x0000000000000000000000000000000000000000000000000000000000000000"
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

      expect(await bsc20.connect(addr1).balanceOf(addr1.address))
        .to.equal(BigNumber.from(100));
    });

    it("Should fail to redeem (Not a validator)", async function () {
      const amount = 100;
      const nonce = 1;

      await erc20.connect(owner).mint(addr1.address, amount);
      await ethBridge.connect(owner).addChain(bscChainId);
      await bscBridge.connect(owner).addChain(hardhatChainId);

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
      
      const swapHash = ethers.utils.solidityKeccak256(
        ["uint256", "address", "uint256", "uint256"],
        [amount, addr1.address, hardhatChainId, nonce]
      );

      const hashArray = ethers.utils.arrayify(swapHash);
      const signedMessage = await owner.signMessage(hashArray);
      const signature = ethers.utils.splitSignature(signedMessage);

      await expect(bscBridge.connect(addr1).redeem(
        addr1.address, 
        amount, 
        signature.v, 
        signature.r, 
        signature.s, 
        hardhatChainId, 
        nonce
      )).to.be.revertedWith("Not a validator");
    });

    it("Should fail to redeem (This chain is not supported)", async function () {
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
        nonce
      )).to.be.revertedWith("This chain is not supported");
    });

    it("Should fail to redeem (Cannot redeem twice)", async function () {
      const amount = 100;
      const nonce = 1;

      await erc20.connect(owner).mint(addr1.address, amount);
      await ethBridge.connect(owner).addChain(bscChainId);
      await bscBridge.connect(owner).addChain(hardhatChainId);

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

      expect(await bsc20.connect(addr1).balanceOf(addr1.address))
        .to.equal(BigNumber.from(100));

      await expect(bscBridge.connect(owner).redeem(
        addr1.address, 
        amount, 
        signature.v, 
        signature.r, 
        signature.s, 
        hardhatChainId, 
        nonce
      )).to.be.revertedWith("Cannot redeem twice");
    });

    it("Should fail to redeem (Invalid signature)", async function () {
      const amount = 100;
      const nonce = 1;

      await erc20.connect(owner).mint(addr1.address, amount);
      await ethBridge.connect(owner).addChain(bscChainId);
      await bscBridge.connect(owner).addChain(hardhatChainId);

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
      
      const swapHash = ethers.utils.solidityKeccak256(
        ["uint256", "address", "uint256", "uint256"],
        [amount, addr1.address, hardhatChainId, nonce]
      );

      const hashArray = ethers.utils.arrayify(swapHash);
      const wrongSignedMessage = await addr1.signMessage(hashArray);
      const wrongSignature = ethers.utils.splitSignature(wrongSignedMessage);

      await expect(bscBridge.connect(owner).redeem(
        addr1.address, 
        amount, 
        wrongSignature.v, 
        wrongSignature.r, 
        wrongSignature.s, 
        hardhatChainId, 
        nonce
      )).to.be.revertedWith("Invalid signature");
    });
  });
});

describe("ERC20", function () {
  let Token: ContractFactory;
  let tokenContract: Contract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  before(async function () {
    [owner, addr1] = await ethers.getSigners();
    Token = await ethers.getContractFactory("ERC20");
  });

  beforeEach(async function () {
    tokenContract = await Token.deploy("Crypton", "CRT", 18);
    await tokenContract.deployed();
  });

  describe("name", function () {
    it("Should call name function and return name of the token", async function () {
      expect(await tokenContract.name()).to.equal("Crypton");
    });
  });

  describe("symbol", function () {
    it("Should call symbol function and return symbol of the token", async function () {
      expect(await tokenContract.symbol()).to.equal("CRT");
    });
  });

  describe("decimals", function () {
    it("Should call decimals function and return decimals of the token", async function () {
      expect(await tokenContract.decimals()).to.equal(18);
    });
  });

  describe("totalSupply", function () {
    it("Should call totalSupply function and return totalSupply of the token", async function () {
      expect(await tokenContract.totalSupply()).to.equal(parseEther("0"));
    });
  });

  describe("balanceOf", function () {
    it("Should get balance", async function () {
      await tokenContract.connect(owner).mint(addr1.address, parseEther("1"));
      expect(await tokenContract.connect(addr1).balanceOf(addr1.address)).to.equal(parseEther("1"));
    });
  });

  describe("transfer", function () {
    it("Should transfer properly", async function () {
      await tokenContract.connect(owner).mint(addr1.address, parseEther("1"));
      await tokenContract.connect(addr1).transfer(owner.address, parseEther("0.4"));
      expect(await tokenContract.connect(owner).balanceOf(owner.address)).to.equal(parseEther("0.4"));
    });
  
    it("Should fail to transfer (Insufficient balance)", async function () {
      await tokenContract.connect(owner).mint(addr1.address, parseEther("1"));
      await expect(tokenContract.connect(addr1).transfer(owner.address, parseEther("2")))
        .to.be.revertedWith("Insufficient balance");
    });
  });

  describe("transferFrom", function () {
    it("Should transfer properly", async function () {
      await tokenContract.connect(owner).mint(addr1.address, parseEther("1"));
      await tokenContract.connect(addr1).approve(owner.address, parseEther("0.4"));
      await tokenContract.transferFrom(addr1.address, owner.address, parseEther("0.4"));
      expect(await tokenContract.connect(addr1)
        .balanceOf(addr1.address))
        .to.equal(parseEther("0.6"));
      expect(await tokenContract.connect(addr1)
        .allowance(addr1.address, owner.address))
        .to.equal(parseEther("0"));
    });
  
    it("Should fail to transfer (Insufficient balance)", async function () {
      await tokenContract.connect(owner).mint(addr1.address, parseEther("1"));
      await tokenContract.connect(addr1).approve(owner.address, parseEther("0.4"));
      await expect(tokenContract.transferFrom(addr1.address, owner.address, parseEther("5")))
        .to.be.revertedWith("Insufficient balance");
    });
  
    it("Should fail to transfer (Insufficient allowance)", async function () {
      await tokenContract.connect(owner).mint(addr1.address, parseEther("1"));
      await expect(tokenContract.transferFrom(addr1.address, owner.address, parseEther("1")))
        .to.be.revertedWith("Insufficient allowance");
    });
  });

  describe("AccessControl", function () {
    it("Should fail to mint 1 token (Missing role 0x0)", async function () {
      await expect(tokenContract.connect(addr1).mint(addr1.address, parseEther("2")))
        .to.be.revertedWith(
          "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 " +
          "is missing role 0x0000000000000000000000000000000000000000000000000000000000000000"
        );
    });
  });

  describe("burn", function () {
    it("Should burn properly", async function () {
      await tokenContract.connect(owner).mint(addr1.address, parseEther("2"));
      await tokenContract.connect(owner).burn(addr1.address, parseEther("1"));
      expect(await tokenContract.totalSupply()).to.equal(parseEther("1"));
    });
  
    it("Should fail to burn (Insufficient balance)", async function () {
      await expect(tokenContract.connect(owner).burn(addr1.address, parseEther("1")))
        .to.be.revertedWith("Insufficient balance");
    });
  });
});
