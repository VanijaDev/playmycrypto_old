import Web3 from 'web3';
import {
  ProfileManager
} from "../profileManager";
import {
  CoinFlipData,
  RockPaperScissorsData
} from "../../contract/contract";
import Types from "../../types";
import {
  PromiseManager
} from '../promiseManager';
import BigNumber from 'bignumber.js';

const $t = $('#translations').data();

const BlockchainManager_ethereum = {

  MetaMaskCodes: {
    userDenied: 4001
  },

  currentAccount: null,
  initted: false,
  contract_inst_cf: null,
  contract_inst_rps: null,

  connectToMetaMask: async function () {
    console.log('%c BlockchainManager_ethereum - connectToMetaMask', 'color: #00aa00');

    // Modern dapp browsers...
    if (window.ethereum) {
      console.log("Modern dapp browsers...");

      window.web3 = new Web3(ethereum);

      try {
        await ethereum.enable();

        if (!this.isValidNetwork(ethereum.networkVersion)) {
          showTopBannerMessage($t.err_wrong_network, null, false);
          $("#app-disabled")[0].classList.add("app-disabled");
          $("#app-disabled")[0].classList.remove("hidden");
          alert($t.err_wrong_network)
          return false;
        }
      } catch (error) {
        this.initted = false;
        showTopBannerMessage(error.message, null, true);
        return false;
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      console.log("Legacy dapp browsers...");
      // window.web3 = new Web3(web3.currentProvider);
      showTopBannerMessage($t.err_legacy_browsers, null, false);
      this.initted = false;
      return false;
    }
    // Non-dapp browsers...
    else {
      showTopBannerMessage($t.err_non_eth_browser, null, false);
      this.initted = false;
      return false;
    }

    ethereum.autoRefreshOnNetworkChange = false;
    this.initted = true;
    return true;
  },

  setup: async function () {
    console.log('%c BlockchainManager_ethereum - setup', 'color: #00aa00');

    if (!await this.connectToMetaMask()) {
      return false;
    }

    this.currentAccount = (await ethereum.enable())[0];
    this.contract_inst_cf = CoinFlipData.build();
    this.contract_inst_rps = RockPaperScissorsData.build();

    ProfileManager.update();

    return true;
  },

  accountChanged: async function (_account) {
    console.log('%c BlockchainManager_ethereum - accountChanged', 'color: #00aa00');

    if (!this.initted) {
      console.error("BlockchainManager_ethereum - accountChanged, !initted");
      return;
    }

    this.currentAccount = _account;
    ProfileManager.update();
  },

  networkChanged: async function (_networkVersion) {
    console.log('%c BlockchainManager_ethereum - networkChanged: %s', 'color: #00aa00', _networkVersion);

    if (!this.initted) {
      console.error("BlockchainManager_ethereum - networkChanged, !initted");
      return;
    }

    if (this.isValidNetwork(_networkVersion)) {
      hideTopBannerMessage();
      return true;
    }

    showTopBannerMessage($t.err_wrong_network, null, false);
    return false;
  },

  isValidNetwork: function (_networkVersion) {
    /**
     * Ganache = 5777
     * Main Net = 1
     * Ropsten = 3
     * Kovan = 42
     */
    return (_networkVersion == "1");
  },

  gameInst: function (_gameType) {
    // console.log("gameInst e: ", _gameType);

    let gameInst;

    switch (_gameType) {
      case Types.Game.cf:
        gameInst = this.contract_inst_cf;
        break;

      case Types.Game.rps:
        gameInst = this.contract_inst_rps;
        break;

      default:
        console.error("bm_e gameInst", _gameType);
        break;
    }
    return gameInst;
  },


  //  API
  totalUsedReferralFees: async function () {
    let referralFees_cf = await PromiseManager.totalUsedReferralFeesPromise(Types.Game.cf);
    // console.log("referralFees_cf: ", referralFees_cf.toString());
    let referralFees_rps = await PromiseManager.totalUsedReferralFeesPromise(Types.Game.rps);
    // console.log("referralFees_rps: ", referralFees_rps.toString());

    return new BigNumber(referralFees_cf).plus(referralFees_rps);
  },

  ongoinRafflePrize: async function () {
    let ongoinRafflePrize_cf = await PromiseManager.ongoinRafflePrizePromise(Types.Game.cf);
    // console.log("ongoinRafflePrize_cf: ", ongoinRafflePrize_cf.toString());
    let ongoinRafflePrize_rps = await PromiseManager.ongoinRafflePrizePromise(Types.Game.rps);
    // console.log("ongoinRafflePrize_rps: ", ongoinRafflePrize_rps.toString());

    return new BigNumber(ongoinRafflePrize_cf).plus(ongoinRafflePrize_rps);
  },

  partnerFeeUsedTotal: async function (_gameType) {
    let partnerFeeTotalUsed = await PromiseManager.partnerFeeUsedTotalPromise(_gameType);
    // console.log("partnerFeeTotalUsed: ", _gameType, partnerFeeTotalUsed.toString());

    return partnerFeeTotalUsed;
  },

  rafflePrizesWonTotal: async function (_gameType) {
    let rafflePrizesWonTotal = await PromiseManager.rafflePrizesWonTotalPromise(_gameType);
    // console.log("rafflePrizesWonTotal: ", _gameType, rafflePrizesWonTotal.toString());

    return rafflePrizesWonTotal;
  },

  totalUsedInGame: async function (_gameType) {
    let totalUsedInGame = await PromiseManager.totalUsedInGamePromise(_gameType);
    // console.log("totalUsedInGame: ",_gameType,  totalUsedInGame.toString());

    return totalUsedInGame;
  },

  gamesCreatedAmount: async function (_gameType) {
    let gamesCreatedAmount = await PromiseManager.gamesCreatedAmountPromise(_gameType);
    // console.log("gamesCreatedAmount: ", _gameType,  gamesCreatedAmount.toString());

    return gamesCreatedAmount;
  },

  gamesCompletedAmount: async function (_gameType) {
    let gamesCompletedAmount = await PromiseManager.gamesCompletedAmountPromise(_gameType);
    // console.log("gamesCompletedAmount: ", _gameType,  gamesCompletedAmount.toString());

    return gamesCompletedAmount;
  },


  /**
   * HELPERS
   */

  getBalance: async function () {
    return await web3.eth.getBalance(this.currentAccount);
  },
}

export {
  BlockchainManager_ethereum
};