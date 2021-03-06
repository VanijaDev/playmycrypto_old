import {
  PromiseManager
} from "../managers/promiseManager";
import {
  Game
} from "../game";
import {
  Utils
} from "../utils";
import BigNumber from "bignumber.js";
import {
  ProfileManager
} from "../managers/profileManager";
import Types from "../types";

const $t = $('#translations').data();

const CoinFlip = {
  ownerAddress: "",
  coinSideChosen: 0,
  minBet: "",

  updateGameView: async function () {
    console.log('%c CoinFlip - updateGameView', 'color: #00aa00');

    window.CommonManager.showSpinner(Types.SpinnerView.gameView);
    this.ownerAddress = await PromiseManager.ownerPromise(Types.Game.cf);
    this.minBet = new BigNumber((await PromiseManager.minBetForGamePromise(Types.Game.cf)).toString());

    this.setPlaceholders();
    this.showGameViewForCurrentAccount();
  },

  setPlaceholders: function () {
    $('#cf_game_referral_start')[0].placeholder = this.ownerAddress;
    $('#cf_bet_input')[0].placeholder = Utils.weiToEtherFixed(this.minBet, 2);

    $('#cf_game_referral_join')[0].placeholder = this.ownerAddress;
    $('#cf_update_bet_input')[0].placeholder = Utils.weiToEtherFixed(this.minBet, 2);
  },

  //  game view
  showGameViewForCurrentAccount: async function () {
    window.CommonManager.showSpinner(Types.SpinnerView.gameView);

    let id = parseInt(await PromiseManager.createdGameIdForAccountPromise(Types.Game.cf, window.BlockchainManager.currentAccount()));
    // console.log("showGameViewForCurrentAccount id: ", id);

    if (id == 0) {
      this.showGameView(Types.GameView_CF.start, null);
    } else {
      let gameInfo = await PromiseManager.gameInfoPromise(Types.Game.cf, id);
      this.showGameView(Types.GameView_CF.waitingForOpponent, gameInfo);
    }

    window.CommonManager.hideSpinner(Types.SpinnerView.gameView);
  },

  showJoinGame: function (_gameInfo) {
    // console.log("showJoinGame: ", _gameInfo);
    this.showGameView(Types.GameView_CF.join, _gameInfo);
  },

  showGameView: function (_viewName, _gameInfo) {
    // console.log("showGameView: ", _viewName, _gameInfo);
    if (_viewName != Types.GameView_CF.won && _viewName != Types.GameView_CF.lost) {
      this.populateViewWithGameInfo(_viewName, _gameInfo);
    }

    this.clearGameView(_viewName);
    window.showGameBlock(_viewName)
  },

  clearGameView: function (_viewName) {
    // document.getElementById("cf_game_referral_start").value = "";
    // document.getElementById("cf_game_referral_join").value = "";
    // document.getElementById("cf_update_bet_input").value = "";

    switch (_viewName) {
      case Types.GameView_CF.start:
        $('#gameId_start')[0].value = "0";
        $('#gameCreator_start')[0].value = "0x0";
        $('#gameOpponent_start')[0].value = "0x0";
        $('#gameBetCurrent_start')[0].value = "0";
        $('#cf_game_referral_start')[0].value = "";
        $('#cf_bet_input')[0].value = "0.01";
        break;

      case Types.GameView_CF.waitingForOpponent:
      case Types.GameView_CF.join:
      case Types.GameView_CF.won:
      case Types.GameView_CF.lost:
        break;

      default:
        throw ("clearGameView - wrong _viewName:", _viewName)
        break;
    }
  },

  populateViewWithGameInfo: async function (_viewName, _gameInfo) {
    // console.log("populateWithGameInfo: ", _viewName, _gameInfo);

    switch (_viewName) {
      case "cfmaketop":
        document.getElementById("cf_update_bet_input").value = "";
        document.getElementById("cf_gameId_makeTop").innerHTML = (_gameInfo && _gameInfo.id) ? _gameInfo.id : "0";
        document.getElementById("gameCreator_makeTop").innerHTML = (_gameInfo && _gameInfo.creator) ? _gameInfo.creator : "0";
        document.getElementById("gameOpponent_makeTop").innerHTML = "0x0";
        document.getElementById("gameBet_makeTop").innerHTML = (_gameInfo && _gameInfo.bet) ? Utils.weiToEtherFixed(_gameInfo.bet) : "0";
        document.getElementById("fromt_coin_makeTop").src = (_gameInfo.creatorGuessCoinSide == 0) ? "/img/ethereum-orange.svg" : "/img/bitcoin-orange.svg";
        document.getElementById("make_top_block_makeTop").style.display = (await PromiseManager.isTopGamePromise(Types.Game.cf, _gameInfo.id)) ? "none" : "block";
        break;

      case "cfjoin":
        document.getElementById("cf_game_id_join").innerHTML = (_gameInfo && _gameInfo.id) ? _gameInfo.id : "0";
        document.getElementById("cf_game_creator_join").innerHTML = (_gameInfo && _gameInfo.creator) ? _gameInfo.creator : "0";
        document.getElementById("cf_game_bet_join").innerHTML = (_gameInfo && _gameInfo.bet) ? Utils.weiToEtherFixed(_gameInfo.bet) : "0";
        document.getElementById("cf_coin_join").src = (_gameInfo.creatorGuessCoinSide == 0) ? "/img/bitcoin-orange.svg" : "/img/ethereum-orange.svg";
        break;

      default:
        break;
    }
  },


  //  HANDLE UI ELEMENT ACTIONS
  startGame: async function () {
    let referral = document.getElementById("cf_game_referral_start").value;
    if (referral.length > 0) {
      if (!web3.utils.isAddress(referral) || !referral.toLowerCase().localeCompare(window.BlockchainManager.currentAccount().toLowerCase())) {
        showTopBannerMessage($t.wrong_referral, null, true);
        return;
      }
    } else {
      referral = this.ownerAddress;
    }

    let bet = document.getElementById("cf_bet_input").value;

    if ((bet.length == 0) || (new BigNumber(Utils.etherToWei(bet)).comparedTo(this.minBet) < 0)) {
      let str = $t.wrong_bet + Utils.weiToEtherFixed(this.minBet, 2) + " " + window.BlockchainManager.currentCryptoName();
      showTopBannerMessage(str, null, true);
      return;
    }

    window.CommonManager.showSpinner(Types.SpinnerView.gameView);
    window.BlockchainManager.gameInst(Types.Game.cf).methods.createGame(this.coinSideChosen, referral).send({
        from: window.BlockchainManager.currentAccount(),
        value: Utils.etherToWei(bet),
        gasPrice: await window.BlockchainManager.gasPriceNormalizedString()
      })
      .on('transactionHash', function (hash) {
        // console.log('%c CREATE GAME transactionHash: %s', 'color: #1d34ff', hash);
        showTopBannerMessage($t.tx_create_game, hash);
      })
      .once('receipt', function (receipt) {
        CoinFlip.showGameViewForCurrentAccount();
        ProfileManager.update();
        hideTopBannerMessage();
      })
      .once('error', function (error, receipt) {
        window.CommonManager.hideSpinner(Types.SpinnerView.gameView);

        if (error.code != window.BlockchainManager.MetaMaskCodes.userDenied) {
          showTopBannerMessage($t.err_create_game, null, true);
          throw new Error(error, receipt);
        }
      });
  },

  makeTopClicked: async function () {
    // console.log("makeTopClicked");

    if (parseInt(await window.BlockchainManager.getBalance()) < Game.minBet) {
      let str = $t.make_top_cost + Utils.weiToEtherFixed(Game.minBet) + '. ' + $t.not_enough_funds;
      showTopBannerMessage(str, null, true);
      return;
    }

    window.CommonManager.showSpinner(Types.SpinnerView.gameView);
    let gameId = document.getElementById("cf_gameId_makeTop").innerHTML;

    window.BlockchainManager.gameInst(Types.Game.cf).methods.addTopGame(gameId).send({
        from: window.BlockchainManager.currentAccount(),
        value: Game.minBet,
        gasPrice: await window.BlockchainManager.gasPriceNormalizedString()
      })
      .on('transactionHash', function (hash) {
        // console.log("MAKE TOP: transactionHash");
        showTopBannerMessage($t.tx_make_top, hash);
      })
      .once('receipt', function (receipt) {
        CoinFlip.showGameViewForCurrentAccount();
        ProfileManager.update();
        hideTopBannerMessage();
      })
      .once('error', function (error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
        // console.log("MAKE TOP: ERROR");
        window.CommonManager.hideSpinner(Types.SpinnerView.gameView);

        if (error.code != window.BlockchainManager.MetaMaskCodes.userDenied) {
          showTopBannerMessage($t.err_make_top, null, true);
          throw new Error(error, receipt);
        }
      });
  },

  increaseBetClicked: async function () {
    let bet = document.getElementById("cf_update_bet_input").value;

    if ((bet.length == 0) || (new BigNumber(Utils.etherToWei(bet)).comparedTo(this.minBet) < 0)) {
      let str = $t.err_bet_increase_min + Utils.weiToEtherFixed(this.minBet, 2) + " " + window.BlockchainManager.currentCryptoName();
      showTopBannerMessage(str, null, true);
      return;
    }

    let gameId = document.getElementById("cf_gameId_makeTop").innerHTML;

    window.CommonManager.showSpinner(Types.SpinnerView.gameView);
    window.BlockchainManager.gameInst(Types.Game.cf).methods.increaseBetForGameBy(gameId).send({
        from: window.BlockchainManager.currentAccount(),
        value: Utils.etherToWei(bet).toString(),
        gasPrice: await window.BlockchainManager.gasPriceNormalizedString()
      })
      .on('transactionHash', function (hash) {
        // console.log('%c INCREASE BET transactionHash: %s', 'color: #1d34ff', hash);
        showTopBannerMessage($t.tx_increase_bet, hash);
      })
      .once('receipt', function (receipt) {
        CoinFlip.showGameViewForCurrentAccount();
        ProfileManager.update();
        hideTopBannerMessage();
      })
      .once('error', function (error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
        window.CommonManager.hideSpinner(Types.SpinnerView.gameView);

        if (error.code != window.BlockchainManager.MetaMaskCodes.userDenied) {
          showTopBannerMessage($t.err_increase_bet, null, true);
          throw new Error(error, receipt);
        }
      });
  },

  coinflipJoinAndPlay: async function () {
    // console.log('%c coinflipJoinAndPlay', 'color: #e51dff');

    let referral = document.getElementById("cf_game_referral_join").value;
    if (referral.length > 0) {
      if (!web3.utils.isAddress(referral)) {
        showTopBannerMessage($t.wrong_referral, null, true);
        return;
      }
    } else {
      referral = this.ownerAddress;
    }

    let gameInfo = await PromiseManager.gameInfoPromise(Types.Game.cf, document.getElementById("cf_game_id_join").innerHTML);
    let bet = gameInfo.bet;

    if (parseInt(await window.BlockchainManager.getBalance()) < bet) {
      showTopBannerMessage($t.not_enough_funds, null, true);
      return;
    }
    window.CommonManager.showSpinner(Types.SpinnerView.gameView);
    window.BlockchainManager.gameInst(Types.Game.cf).methods.joinAndPlayGame(document.getElementById("cf_game_id_join").innerHTML, referral).send({
        from: window.BlockchainManager.currentAccount(),
        value: bet,
        gasPrice: await window.BlockchainManager.gasPriceNormalizedString()
      })
      .on('transactionHash', function (hash) {
        // console.log('%c JOIN GAME transactionHash: %s', 'color: #1d34ff', hash);
        showTopBannerMessage($t.tx_join_game, hash);
      })
      .once('receipt', function (receipt) {
        // console.log('%c JOIN GAME receipt: %s', 'color: #1d34ff', receipt);
        ProfileManager.update();
        hideTopBannerMessage();
        CoinFlip.showGamePlayed(receipt.events.CF_GamePlayed.returnValues);
      })
      .once('error', function (error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
        window.CommonManager.hideSpinner(Types.SpinnerView.gameView);

        if (error.code != window.BlockchainManager.MetaMaskCodes.userDenied) {
          showTopBannerMessage($t.err_join_game, null, true);
          throw new Error(error, receipt);
        }
      });
  },

  showGamePlayed: function (_gameInfo) {
    // console.log("showGamePlayed: ", _gameInfo);
    window.CommonManager.hideSpinner(Types.SpinnerView.gameView);
    if (Utils.addressesEqual(_gameInfo.creator, window.BlockchainManager.currentAccount()) && !$("#" + Types.GameView_CF.waitingForOpponent)[0].classList.contains('hidden')) {
      (Utils.addressesEqual(_gameInfo.winner, window.BlockchainManager.currentAccount())) ? this.showGameView(Types.GameView_CF.won, null): this.showGameView(Types.GameView_CF.lost, null);
    } else if (!$("#" + Types.GameView_CF.join)[0].classList.contains('hidden')) {
      (Utils.addressesEqual(_gameInfo.winner, window.BlockchainManager.currentAccount())) ? this.showGameView(Types.GameView_CF.won, null): this.showGameView(Types.GameView_CF.lost, null);
    }
  },

  closeResultView: function () {
    this.showGameViewForCurrentAccount();
  },

  coinSideChanged: function (_side) {
    this.coinSideChosen = _side;

    switch (_side) {
      case 0:
        $("#bitcoinFlip").html('<img src="/img/bitcoin-black.svg">');
        $("#ethereumFlip").html('<img src="/img/ethereum-orange.svg">');
        break;

      case 1:
        $("#bitcoinFlip").html('<img src="/img/bitcoin-orange.svg">');
        $("#ethereumFlip").html('<img src="/img/ethereum-black.svg">');
        break;

      default:
        break;
    }
  }
};

window.CoinFlip = CoinFlip;

export {
  CoinFlip
};