import {PromiseManager} from "./managers/promiseManager";
import {CoinFlip} from "./gameView/coinFlip";
import RPS from "./gameView/rps";
import {Utils} from "./utils";
import {NotificationManager} from "./managers/notificationManager";
import {BigNumber} from "bignumber.js";
import {ProfileManager} from "./managers/profileManager";
import Types from "./types";

const $t = $('#translations').data();

const Game = {

  CF_Notifications: {
    gameAddedToTop: 0,
    gameCreated: 1,
    gamePaused: 2,
    gameUnpaused: 3,
    gamePlayed: 4,
    gamePrizesWithdrawn: 5,
    RafflePlayed: 6
  },
  CF_latestNotificationHash: new Map(),

  minBet: 0,
  topGameIds: [],
  availableGameIds: [],
  availableGamesFetchStartIndex: -1,
  maxGamesToAddCount: 2, // max count of games to be added each "load more"
  raffleParticipants: 0,

  initialSetupDone: false,
  gameType: 0,


  setup: async function () {
    console.log('%c Game - setup', 'color: #00aa00');
   
    if (!window.BlockchainManager.initted) {
      await window.BlockchainManager.init();
    }

    this.setupOnce();

    if (this.gameType == Types.Game.cf) {
      document.getElementById("gameName").innerHTML = "CoinFlip";
      CoinFlip.updateGameView();
      await this.updateSuspendedViewForGame(this.gameType);
    } else if (this.gameType == Types.Game.rps) {
      document.getElementById("gameName").innerHTML = "Rock Paper Scissors";
      RPS.updateGameView();
    } else {
      document.getElementById("gameName").innerHTML = "TITLE - ERROR";
    }

    this.minBet = new BigNumber(await PromiseManager.minBetForGamePromise(this.gameType));
    await this.updateAllGamesForGame(this.gameType);
    await this.updateRaffleStateInfoForGame(this.gameType, true);
  },

  setupOnce: function () {
    if (!this.initialSetupDone) {
      this.initialSetupDone = true;
      this.gameType = window.CommonManager.currentGame;

      this.subscribeToEvents(this.gameType);
    }
  },

  getSelectedgameType: function (_gameType) {
    if (_gameType == Types.Game.cf) {
      return Types.Game.cf;
    } else if (_gameType == Types.Game.rps) {
      return Types.Game.rps;
    }
  },

  subscribeToEvents: function (_gameType) {
    NotificationManager.eventHandler = this;

    if (_gameType == Types.Game.cf) {
      NotificationManager.subscribe_CF();
    } else if (_gameType == Types.Game.rps) {
      NotificationManager.subscribe_RPS();
    }
  },

  onUnload: function () {
    this.initialSetupDone = false;
    NotificationManager.eventHandler = null;
    NotificationManager.clearAll();
    window.RPS.onUnload();
    hideTopBannerMessage();
  },

  updateSuspendedViewForGame: async function (_gameType) {
    if (await PromiseManager.allowedToPlayPromise(_gameType, window.BlockchainManager.currentAccount())) {
      window.CommonManager.hideBackTimer();
    } else {
      let suspendedTimeDuration = new BigNumber(await PromiseManager.suspendedTimeDurationPromise(_gameType));
      let lastPlayTimestamp = new BigNumber(await PromiseManager.lastPlayTimestampPromise(_gameType, window.BlockchainManager.currentAccount()));
      let availableTimestamp = lastPlayTimestamp.plus(suspendedTimeDuration).multipliedBy(new BigNumber(1000));
      let diff = availableTimestamp.minus(new BigNumber(Date.now())).dividedBy(new BigNumber(1000)).toNumber();
      // var availableTime = new Date(availableTimestamp).toLocaleTimeString("en-US");
      window.CommonManager.showBackTimer(diff);
    }
  },

  //  LOAD GAMES
  updateAllGamesForGame: function (_gameType) {
    // clear data
    this.availableGamesFetchStartIndex = -1;
    this.availableGameIds.splice(0, this.availableGameIds.length);
    this.topGameIds.splice(0, this.topGameIds.length);

    $('#TopGames').empty();
    $("#AvailableGames").empty();

    this.loadTopGamesForGame(_gameType);
    this.loadAvailableGamesPortionForGame(_gameType);
  },

  loadTopGamesForGame: async function (_gameType) {
    window.CommonManager.showSpinner(Types.SpinnerView.topGames);
    let ownGame;

    if (_gameType == Types.Game.cf) {
      // console.log("loadTopGamesForGame - CF");
      ownGame = await PromiseManager.ongoingGameIdxForCreatorPromise(_gameType, window.BlockchainManager.currentAccount());
    } else if (_gameType == Types.Game.rps) {
      // console.log("loadTopGamesForGame - RPS");
      ownGame = await PromiseManager.ongoingGameIdxForPlayerPromise(_gameType, window.BlockchainManager.currentAccount());
    } else {
      throw('loadTopGamesForGame - wrong _gameType');
    }

    let topGameIds_tmp = await PromiseManager.topGamesPromise(_gameType);
    this.topGameIds = this.topGameIds.concat(topGameIds_tmp);

    let ownGameTopGamesIdx = this.topGameIds.indexOf(ownGame);

    if (ownGameTopGamesIdx >= 0) {
      this.topGameIds.splice(ownGameTopGamesIdx, 1);
      this.topGameIds.push("0");
    }
    // console.log("topGameIds: ", this.topGameIds);

    for (let i = 0; i < this.topGameIds.length; i++) {
      let id = parseInt(this.topGameIds[i]);
      if (id > 0) {
        let gameInfo = await PromiseManager.gameInfoPromise(_gameType, id);
        // console.log("Top game: ", id, " ", gameInfo);
        this.addGameWithInfo(gameInfo, true, false);
      }
    }
    window.CommonManager.hideSpinner(Types.SpinnerView.topGames);
  },

  loadAvailableGamesPortionForGame: async function (_gameType) {
    if (_gameType == Types.Game.cf) {
      // console.log("loadAvailableGamesPortionForGame - CF");
    } else if (_gameType == window.BlockchainManager.rockPaperScissors) {
      // console.log("loadAvailableGamesPortionForGame - RPS");
    }

    if (this.availableGamesFetchStartIndex == 0) {
      // console.log('%c No games to load', 'color: #1d34ff');
      return;
    }

    window.CommonManager.showSpinner(Types.SpinnerView.availableGames);

    if (this.availableGamesFetchStartIndex == -1) {
      this.availableGamesFetchStartIndex = (await PromiseManager.gamesCreatedAmountPromise(_gameType)) - 1;
    }
    // console.log("this.availableGamesFetchStartIndex: ", this.availableGamesFetchStartIndex);
    let addedCount = 0;

    while (addedCount < this.maxGamesToAddCount && this.availableGamesFetchStartIndex > 0) {
      let gameInfo = await PromiseManager.gameInfoPromise(_gameType, this.availableGamesFetchStartIndex);
      // console.log(gameInfo);
      this.availableGamesFetchStartIndex -= 1;

      if (this.availableGameValidToAppend(gameInfo)) {
        this.addGameWithInfo(gameInfo, false, false);

        addedCount += 1;
        if ((addedCount == this.maxGamesToAddCount) || (this.availableGamesFetchStartIndex == 0)) {
          break;
        }
      }
    }

    window.CommonManager.hideSpinner(Types.SpinnerView.availableGames);
    // console.log("availableGameIds: ", this.availableGameIds);
  },

  availableGameValidToAppend: function (_gameInfo) {
    //  skip if paused && creator && winner present && top game
    return (!_gameInfo.paused &&
      !Utils.addressesEqual(_gameInfo.creator, window.BlockchainManager.currentAccount()) &&
      Utils.addressesEqual(_gameInfo.opponent, Utils.zeroAddress_eth) &&
      Utils.addressesEqual(_gameInfo.winner, Utils.zeroAddress_eth) &&
      !this.topGameIds.includes(_gameInfo.id)) ? true : false;
  },

  addGameWithInfo: function (_gameInfo, _isTopGame, _prepend) {
    // console.log("addGameWithInfo: ", _gameInfo, _isTopGame, _prepend);
    if (_isTopGame) {
      if (_prepend) {
        $('#TopGames').prepend(TopGamesTemplate.composetmp({
          'address': _gameInfo.creator,
          'bet': Utils.weiToEtherFixed(_gameInfo.bet.toString())
        }));
      } else {
        $('#TopGames').append(TopGamesTemplate.composetmp({
          'address': _gameInfo.creator,
          'bet': Utils.weiToEtherFixed(_gameInfo.bet.toString())
        }));
      }

    } else {
      if (_prepend) {
        this.availableGameIds.unshift(_gameInfo.id);
        $('#AvailableGames').prepend(TableAvailableGamesTemplate.composetmp({
          'address': _gameInfo.creator,
          'bet': Utils.weiToEtherFixed(_gameInfo.bet.toString())
        }));
      } else {
        this.availableGameIds.push(_gameInfo.id);
        $('#AvailableGames').append(TableAvailableGamesTemplate.composetmp({
          'address': _gameInfo.creator,
          'bet': Utils.weiToEtherFixed(_gameInfo.bet.toString())
        }));
      }
    }
  },

  removeGameWithId: function (_gameId) {
    // console.log("removeGameWithId: ", _gameId);

    if (this.topGameIds.includes(_gameId)) {
      // console.log("from TopGames");

      let idx = this.topGameIds.indexOf(_gameId);
      $('#TopGames')[0].removeChild($('#TopGames')[0].children[idx]);
      this.topGameIds.splice(idx, 1);
    } else if (this.availableGameIds.includes(_gameId)) {
      // console.log("from AvailableGames");

      let idx = this.availableGameIds.indexOf(_gameId);
      $('#AvailableGames')[0].removeChild($('#AvailableGames')[0].children[idx]);
      this.availableGameIds.splice(idx, 1);
    } else {
      throw("No game to remove");
    }
  },

  //  RAFFLE
  updateRaffleStateInfoForGame: async function (_gameType, _withHistory) {
    // console.log("updateRaffleStateInfoForGame");

    window.CommonManager.showSpinner(Types.SpinnerView.raffle);

    await this.updateRafflePlayersPresentForGame(_gameType);
    await this.updateRafflePlayersToActivateForGame(_gameType);
    await this.updateRaffleStartButtonForGame(_gameType);
    await this.updateRaffleOngoingPrizeForGame(_gameType);

    if (_withHistory) {
      this.updateRaffleHistoryForGame(_gameType);
    }

    window.CommonManager.hideSpinner(Types.SpinnerView.raffle);
  },

  updateRafflePlayersPresentForGame: async function (_gameType) {
    let participants = await PromiseManager.raffleParticipantsPromise(_gameType);

    this.updateProfileOnRaffle(participants.length);
    this.raffleParticipants = participants.length;

    $("#rafflePlayingAmount")[0].innerText = participants.length;
  },

  updateProfileOnRaffle: function (_currentParticipants) {
    if (_currentParticipants < this.raffleParticipants) {
      ProfileManager.update();
    }
  },

  updateRafflePlayersToActivateForGame: async function (_gameType) {
    let participants = await PromiseManager.raffleActivationParticipantsAmountPromise(_gameType);
    // console.log("raffleActivationParticipantsAmount: ", result.toString());
    $("#raffleActivationAmount")[0].innerText = participants.toString();
  },

  updateRaffleStartButtonForGame: async function (_gameType) {
    let isActivated = await PromiseManager.isRaffleActivatedPromise(_gameType);
    $("#raffleStartBtn")[0].disabled = !isActivated;
  },

  updateRaffleOngoingPrizeForGame: async function (_gameType) {
    let ongoingPrize = await PromiseManager.ongoinRafflePrizePromise(_gameType);
    // console.log("ongoinRafflePrize: ", result.toString());
    $("#cryptoForRaffle")[0].innerText = Utils.weiToEtherFixed(ongoingPrize.toString());
  },

  updateRaffleHistoryForGame: async function (_gameType) {
    $('#BlockRaffle').empty();

    let raffleResults = await PromiseManager.raffleResultCountPromise(_gameType);
    // console.log("raffleResults: ", raffleResults);
    if (raffleResults == 0) {
      return;
    }

    let result = await PromiseManager.raffleResultInfoPromise(_gameType, raffleResults - 1);
    $('#BlockRaffle').append(RaffleGamesTemplate.composetmp({
      'address': result.winner,
      'amount': Utils.weiToEtherFixed(result.prize.toString()),
      'timeago': new Date(result.time * 1000).toISOString().slice(0, 10)
    }));
  },


  //  NOTIFICATION HELPERS
  onGameUpdated: async function (_gameId) {
    // console.log('%c game - onGameUpdated %s', 'color: #1d34ff', _gameId);

    let gameInfo = await PromiseManager.gameInfoPromise(this.gameType, _gameId);
    if (gameInfo.paused) {
      // console.log('skip');
      return;
    }

    if (this.isGamePresentInAnyList(_gameId)) {
      const isTopGame = (this.topGameIds.includes(_gameId.toString()));
      this.removeGameWithId(_gameId.toString());
      this.addGameWithInfo(gameInfo, isTopGame, true);
    }
  },

  onGameAddedToTop: function (_gameType, _gameId, _creator) {
    if (_gameType == Types.Game.cf) {
      // console.log('%c game - onGameAddedToTop - CF: %s %s', 'color: #1d34ff', _gameId, _creator);
    } else if (_gameType == Types.Game.rps) {
      // console.log('%c game - onGameAddedToTop - RPS: %s %s', 'color: #1d34ff', _gameId, _creator);
    }

    if (this.isGamePresentInAnyList(_gameId)) {
      this.removeGameWithId(_gameId);
    }
    this.loadTopGamesForGame(this.gameType);
  },


  //  HELPERS
  isGamePresentInAnyList: function (_gameId) {
    return (this.topGameIds.includes(_gameId)) || (this.availableGameIds.includes(_gameId));
  },


  onGameCreated: async function (_gameType, _gameId, _creator) {
    if (_gameType == Types.Game.cf) {
      // console.log('%c game - onGameCreated_CF', 'color: #1d34ff');
    } else if (_gameType == Types.Game.rps) {
      // console.log('%c game - onGameCreated_RPS', 'color: #1d34ff');
    }

    if (!_creator.includes(window.BlockchainManager.currentAccount().replace("0x", ""))) {
      let gameInfo = await PromiseManager.gameInfoPromise(this.gameType, parseInt(_gameId));
      this.addGameWithInfo(gameInfo, false, true);
    }
  },

  onGameJoined: async function (_gameId, _creator, _opponent) {
    // console.log('%c game - onGameJoined_RPS', 'color: #1d34ff');

    if (this.isGamePresentInAnyList(_gameId)) {
      this.removeGameWithId(_gameId);
    }

    if (_creator.includes(window.BlockchainManager.currentAccount().replace("0x", ""))) {
      let gameInfo = await PromiseManager.gameInfoPromise(this.gameType, parseInt(_gameId));
      RPS.showGameView(RPS.GameView.playMove, gameInfo);
    } else if (_opponent.includes(window.BlockchainManager.currentAccount().replace("0x", ""))) {
      ProfileManager.update();
    }
  },

  onGamePlayed: async function (_gameType, _gameId, _creator, _opponent) {
    if (_gameType == Types.Game.cf) {
      // console.log('%c game - onGamePlayed_CF %s, %s, %s', 'color: #1d34ff', _gameId, _creator, _opponent);
    } else if (_gameType == Types.Game.rps) {
      // console.log('%c game - onGamePlayed_RPS %s, %s, %s', 'color: #1d34ff', _gameId, _creator, _opponent);
    }

    if (_creator.includes(window.BlockchainManager.currentAccount().replace("0x", ""))) {
      let gameInfo = await PromiseManager.gameInfoPromise(this.gameType, parseInt(_gameId));
      CoinFlip.showGamePlayed(gameInfo);
    } else if (_opponent.includes(window.BlockchainManager.currentAccount().replace("0x", ""))) {
      let gameInfo = await PromiseManager.gameInfoPromise(this.gameType, parseInt(_gameId));
      CoinFlip.showGamePlayed(gameInfo);
      this.updateSuspendedViewForGame(this.gameType);
    }

    if (this.isGamePresentInAnyList(_gameId)) {
      this.removeGameWithId(_gameId);
    }
    this.updateRaffleStateInfoForGame(this.gameType, false);
  },

  onGamePrizesWithdrawn: function (_gameType) {
    if (_gameType == Types.Game.cf) {
      // console.log('%c game - onGamePrizesWithdrawn_CF', 'color: #1d34ff');
    } else if (_gameType == Types.Game.rps) {
      // console.log('%c game - onGamePrizesWithdrawn_RPS', 'color: #1d34ff');
    }

    this.updateRaffleStateInfoForGame(this.gameType, false);
  },

  onGamePaused: function (_gameId) {
    // console.log('%c game - onGamePaused_RPS: %s', 'color: #1d34ff', _gameId);
    if (this.isGamePresentInAnyList(_gameId)) {
      this.removeGameWithId(_gameId);
    }
  },

  onGameUnpaused: async function (_gameId, _creator) {
    // console.log('%c game - onGameUnpaused_RPS: %s', 'color: #1d34ff', _gameId);

    if (!_creator.includes(window.BlockchainManager.currentAccount().replace("0x", ""))) {
      let gameInfo = await PromiseManager.gameInfoPromise(this.gameType, parseInt(_gameId));
      this.addGameWithInfo(gameInfo, false, true);
    }
  },

  onGameFinished: async function (_id) {
    // console.log('%c game - onGameFinished_RPS, _id: %s', 'color: #1d34ff', _id);

    if (this.isGamePresentInAnyList(_id)) {
      this.removeGameWithId(_id);
    }
    Game.updateRaffleStateInfoForGame(Game.gameType, false);

    if (ProfileManager.isGameParticipant(Types.Game.rps, _id)) {
      let gameInfo = await PromiseManager.gameInfoPromise(Types.Game.rps, _id);
      let resultView;

      if ((new BigNumber(gameInfo.state)).comparedTo(new BigNumber(Types.GameState.draw)) == 0) {
        resultView = RPS.GameView.draw;
      } else if ((new BigNumber(gameInfo.state)).comparedTo(new BigNumber(Types.GameState.winnerPresent)) == 0) {
        resultView = (Utils.addressesEqual(window.BlockchainManager.currentAccount(), gameInfo.winner)) ? RPS.GameView.won : RPS.GameView.lost;
      } else if ((new BigNumber(gameInfo.state)).comparedTo(new BigNumber(Types.GameState.quitted)) == 0 ||
        (new BigNumber(gameInfo.state)).comparedTo(new BigNumber(Types.GameState.expired)) == 0) {
        resultView = (Utils.addressesEqual(window.BlockchainManager.currentAccount(), gameInfo.winner)) ? RPS.GameView.won : RPS.GameView.lost;
      } else {
        throw("onGameFinished - ERROR");
      }

      RPS.showGameView(resultView, null);
      ProfileManager.update();
    }
  },

  onGameMovePlayed: function (_gameId, _nextMover) {
    // console.log('%c game - onGameMovePlayed: id: %s, _nextMover: %s', 'color: #1d34ff', _gameId, _nextMover);

    if (_nextMover.includes(window.BlockchainManager.currentAccount().replace("0x", ""))) {
      RPS.showGameViewForCurrentAccount();
    }
  },

  onGameOpponentMoved: function (_gameId, _nextMover) {
    // console.log('%c game - onGameOpponentMoved: id: %s, _nextMover: %s', 'color: #1d34ff', _gameId, _nextMover);

    if (_nextMover.includes(window.BlockchainManager.currentAccount().replace("0x", ""))) {
      RPS.showGameViewForCurrentAccount();
    }
  },

  onGameRafflePlayed: function (_gameType, _winner) {
    if (this.raffleStartedByMe) {
      this.raffleStartedByMe = false;
      return;
    }

    if (_gameType == Types.Game.cf) {
      // console.log('%c Game - onGameRafflePlayed_CF', 'color: #1d34ff');
    } else if (_gameType == Types.Game.rps) {
      // console.log('%c Game - onGameRafflePlayed_RPS', 'color: #1d34ff');
    }

    Game.updateRaffleStateInfoForGame(Game.gameType, true);

    if (_winner.includes(window.BlockchainManager.currentAccount().replace("0x", ""))) {
      ProfileManager.update();
    }
  },


  //  UI ACTIONS
  loadMoreAvailableGames: async function () {
    // console.log("loadMoreAvailableGames");
    document.getElementById("loadMoreAvailableGamesBtn").disabled = true;
    await this.loadAvailableGamesPortionForGame(this.gameType);
    document.getElementById("loadMoreAvailableGamesBtn").disabled = false;
  },

  gameClicked: function (_element) {
    let idx = $(_element.parentElement).index();
    // console.log("CLICK game gameId: ", Game.availableGameIds[idx]);
    this.joinGame(idx, false);
  },

  topGameClicked: function (_element) {
    let idx = $(_element.parentElement).index();
    // console.log("CLICK top game gameId: ", Game.topGameIds[idx]);
    this.joinGame(idx, true);
  },

  joinGame: async function (_gameIdx, _isTopGame) {
    // console.log("joinGame _gameIdx in list: ", _gameIdx, ", top: ", _isTopGame);
    let gameId = (_isTopGame) ? this.topGameIds[_gameIdx] : this.availableGameIds[_gameIdx];
    let gameInfo = await PromiseManager.gameInfoPromise(this.gameType, gameId);

    if (this.gameType == Types.Game.cf) {
      CoinFlip.showJoinGame(gameInfo);
    } else if (this.gameType == Types.Game.rps) {
      RPS.showGameView(RPS.GameView.join, gameInfo);
    }
  },

  startRaffle: function () {
    console.log('%c startRaffle', 'color: #e51dff');
    window.CommonManager.showSpinner(Types.SpinnerView.raffle);
    this.raffleStartedByMe = true;

    window.BlockchainManager.gameInst(window.CommonManager.currentGame).methods.runRaffle().send({
      from: window.BlockchainManager.currentAccount()
    })
      .on('transactionHash', function (hash) {
        // console.log('%c makeTopClicked transactionHash: %s', 'color: #1d34ff', hash);
        showTopBannerMessage($t.tx_raffle_run, hash);
      })
      .once('receipt', function (receipt) {
        ProfileManager.update();

        Game.updateRaffleStateInfoForGame(Game.gameType, true);
        hideTopBannerMessage();
      })
      .once('error', function (error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
        showTopBannerMessage($t.err_run_raffle, null, true)

        throw new Error(error, receipt);
      })
      .then(() => {
        window.CommonManager.hideSpinner(Types.SpinnerView.raffle);
      });
  },
}


window.Game = Game;

export {
  Game
};

//  HELPERS

String.prototype.composetmp = (function () {
  var re = /\{{(.+?)\}}/g;
  return function (o) {
    return this.replace(re, function (_, k) {
      return typeof o[k] != 'undefined' ? o[k] : '';
    });
  }
}());

var TableAvailableGamesTemplate = '<li>' +
  '<div class="bordered mt-1 game-cell" onclick="Game.gameClicked(this)">' +
  '<p>' +
  '<img src="/img/game-icon-wallet.svg" class="creator">' +
  '<span class="pl-2 pr-2 text-black-50 creator-title">' + $t.creator + ':</span>' +
  '<span class="one-line">{{address}}</span>' +
  '</p>' +
  '<p>' +
  '<img src="/img/game-icon-bet.svg" class="creator">' +
  '<span class="pl-2 pr-2 text-black-50 creator-title">' + $t.bet + ':</span>' +
  '<span class="text-primary"><b>{{bet}}</b></span>' +
  '<img src="/img/icon_amount-' + ((window.BlockchainManager.currentBlockchainType == 0) ? 'eth' : 'trx') + '.svg" class="money-icon">' +
  '</p>' +
  '</div>' +
  '</li>';

var TopGamesTemplate = '<li>' +
  '<div class="bordered blue-border mt-1 game-cell" onclick="Game.topGameClicked(this)">' +
  '<p>' +
  '<img src="/img/game-icon-wallet.svg" class="creator">' +
  '<span class="pl-2 pr-2 text-black-50 creator-title">' + $t.creator + ':</span>' +
  '<span class="one-line">{{address}}</span>' +
  '</p>' +
  '<p>' +
  '<img src="/img/game-icon-bet.svg" class="creator">' +
  '<span class="pl-2 pr-2 text-black-50 creator-title">' + $t.bet + ':</span>' +
  '<span class="text-primary"><b>{{bet}}</b></span>' +

  '<img src="/img/icon_amount-' + ((window.BlockchainManager.currentBlockchainType == 0) ? 'eth' : 'trx') + '.svg" class="money-icon">' +
  '</p>' +
  '</div>' +
  '</li>';

var RaffleGamesTemplate = '<li>' +
  '<div class="bordered mt-1"">' +
  '<p>' +
  '<img src="/img/game-icon-wallet.svg" class="creator">' +
  '<span class="pl-2 pr-2 text-black-50 creator-title">' + $t.winner + ':</span>' +
  '<span class="one-line">{{address}}</span>' +
  '</p>' +
  '<p>' +
  '<img src="/img/game-icon-bet.svg" class="creator">' +
  '<span class="pl-2 pr-2 text-black-50 creator-title">' + $t.prize + ':</span>' +
  '<span class="text-primary"><b>{{amount}}</b></span>' +
  '<img src="/img/icon_amount-' + ((window.BlockchainManager.currentBlockchainType == 0) ? 'eth' : 'trx') + '.svg" class="money-icon">' +
  '<span class="float-right text-black-50">{{timeago}}</span>' +
  '</p>' +
  '</div>' +
  '</li>';
