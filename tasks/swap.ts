import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";

task("swap", "Mints tokens")
  .addParam("contract", "Address of the contract")
  .addParam("amount", "Amount of tokens to swap")
  .addParam("to", "Address to swap to on another network")
  .addParam("chainTo", "Id of another network")
  .addParam("nonce", "Current nonce")
  .setAction(async (taskArgs, { ethers }) => {
    const Bridge = await ethers.getContractFactory("BridgeETH");
    const bridge = Bridge.attach(taskArgs.contract);
    const transaction = await bridge.swap(
      taskArgs.amount, 
      taskArgs.to, 
      taskArgs.chainTo, 
      taskArgs.nonce
    );

    await transaction.wait();
    console.log(transaction);
  });

module.exports = {};