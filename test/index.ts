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
    bscBridge = await BridgeBSC.deploy(owner.address, erc20.address);
    await bscBridge.deployed();

    await erc20.grantRole(erc20.DEFAULT_ADMIN_ROLE(), ethBridge.address);
    await bsc20.grantRole(bsc20.DEFAULT_ADMIN_ROLE(), bscBridge.address);
  });

  it("addChain: Should add chain", async function () {
    await expect(ethBridge.connect(owner).addChain(bscChainId)).to.emit(ethBridge, "ChainAdded").withArgs(bscChainId, owner.address);
  });
});
