import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";

task("swap", "Mints tokens")
  .addParam("contract", "Address of the contract")
  .addParam("amount", "Amount of tokens to swap")
  .addParam("to", "Address to swap to on another network")
  .addParam("v", "v")
  .addParam("r", "r")
  .addParam("s", "s")
  .addParam("chainFrom", "Id of another network")
  .addParam("nonce", "Current nonce")
  .setAction(async (taskArgs, { ethers }) => {
    const Bridge = await ethers.getContractFactory("BridgeBSC");
    const bridge = Bridge.attach(taskArgs.contract);
    const transaction = await bridge.redeem(
      taskArgs.to, 
      taskArgs.amount, 
      taskArgs.v, 
      taskArgs.r,
      taskArgs.s,
      taskArgs.chainFrom,
      taskArgs.nonce
    );

    await transaction.wait();
    console.log(transaction);
  });

module.exports = {};