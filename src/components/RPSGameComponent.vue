<template>
  <div>
    <div class="row game-block" id="rpsstart">
      <div class="col-sm-4 f13 info-column inner-column opacity-text">
        <div class="mt-1 pt-2 text-left">
          <div>
            <label for="Referal" class="f10 opacity-text text-left opacity-text mt-2 mb-1">{{ $t('ENTER_REFERRAL') }}:</label>
            <input type="text" id="rpsstart_game_referral" class="game_view-value referral-addr"/>
          </div>
          <div>
            <label for="SeedPhrase" class="f10 opacity-text text-left opacity-text mt-3 mb-1">{{ $t('ENTER_SEED') }}:</label>
            <input type="text" id="rpsstart_seed" class="game_view-value referral-addr" v-model="currentSeedPhrase"/>
          </div>
          <div>
            <label for="Bet" class="f10 text-left opacity-text mt-3 mb-1">
              {{ $t('BET') }}
              <img src="/img/icon_amount-eth.svg" class="money-icon" v-show="currency === 'eth'">
              <img src="/img/icon_amount-trx.svg" class="money-icon" v-show="currency === 'trx'">
            </label>
            <input type="number" step="0.01" min="0.01" id="rpsstart_bet" class="bet-input" v-model="currentBet"/>
          </div>

          <button class="btn btn-start-game desktop-move" v-bind:class="{disabled: moveDisabled}" onclick="window.RPS.startGameClicked()">
            <img src="/img/icon-btn-start.svg" class="mr-2">
            {{ $t('START_GAME') }}
          </button>
        </div>
      </div>

      <div class="col-sm-8 border-left text-center inner-column second-inner-column">
        <h3 class="mt-sm-4 mb-sm-4 f18">{{ $t('START_NEW_GAME') }}</h3>
        <h2 class="f24">{{ $t('MAKE_FIRST_MOVE') }}</h2>

        <div class="no-value mt-4 mt-sm-5 mb-4 mb-sm-5">
          <img src="/img/game-icon-ask-big.svg" v-if="!gameValue">
          <img src="/img/game-icon-rock-big.svg" v-if="gameValue===1">
          <img src="/img/game-icon-paper-big.svg" v-if="gameValue===2">
          <img src="/img/game-icon-scissor-big.svg" v-if="gameValue===3">
        </div>

        <div class="mb-sm-0 mb-3">
          <button class="btn btn-link game-move-item mr-4 mr-sm-5 ml-sm-4" v-bind:class="{active: gameValue===1}" @click="selectMoveValue(1)">
            <img src="/img/game-icon-rock-big.svg" v-if="gameValue!==1">
            <img src="/img/game-icon-rock-white.svg" v-if="gameValue===1">
          </button>
          <button class="btn btn-link game-move-item mr-4 ml-2 mr-sm-5 ml-sm-5" v-bind:class="{active: gameValue===2}" @click="selectMoveValue(2)">
            <img src="/img/game-icon-paper-big.svg" v-if="gameValue!==2">
            <img src="/img/game-icon-paper-white.svg" v-if="gameValue===2">
          </button>
          <button class="btn btn-link game-move-item mr-1 ml-2 mr-sm-5 ml-sm-5" v-bind:class="{active: gameValue===3}" @click="selectMoveValue(3)">
            <img src="/img/game-icon-scissor-big.svg" v-if="gameValue!==3">
            <img src="/img/game-icon-scissor-white.svg" v-if="gameValue===3">
          </button>
        </div>

        <button class="btn btn-start-game mb-3 mobile-move" v-bind:class="{disabled: moveDisabled}" @click="startMove()">
          <img src="/img/icon-btn-start.svg" class="mr-2">
          {{ $t('MAKE_MOVE') }}
        </button>
      </div>
    </div>

    <div class="row game-block hidden" id="rpswfopponent">
      <div class="col-sm-4 f13 info-column inner-column opacity-text">
        <div class="mt-0 pt-2 text-left opacity-text">
          <p class="mb-0 f10">{{ $t('GAME_ID') }}:</p>
          <span id="rpswfopponent_game_id" class="f10">0</span>
          <p class="mb-0 mt-4 f10">{{ $t('GAME_CREATOR') }}:</p>
          <span id="rpswfopponent_game_creator" class="f10">0x0</span>
          <p class="mb-0 mt-4 f10">{{ $t('GAME_OPPONENT') }}:</p>
          <span id="rpswfopponent_game_opponent" class="f10">0x0</span>

          <div class="row">
            <div class="col-sm-4 pr-0">
              <p class="mb-2 mt-4 f10">{{ $t('GAME_BET') }}:</p>
              <b id="rpswfopponent_game_bet">{{ currentBet ? currentBet : 0 }}</b>
            </div>
            <div class="col-sm-8 pr-0">
              <label class="text-center pt-sm-4 f10">{{ $t('UPDATE_BET') }}
                <img src="/img/icon_amount-eth.svg" class="money-icon" v-show="currency === 'eth'">
                <img src="/img/icon_amount-trx.svg" class="money-icon" v-show="currency === 'trx'">
              </label>
              <input id="rpswfopponent_increase_bet" type="number" step="0.01" min="0.01" class="col-5 offset-3 mr-1 offset-sm-0 bet-input"
                     v-model="currentBet"/>
              <button class="btn btn-small-orange" onclick="window.RPS.increaseBetClicked()">{{ $t('UPDATE') }}</button>
            </div>
          </div>
        </div>

        <div class="bottom-buttons row">
          <div class="col-5 offset-1">
            <button id="rpswfopponent_quit_btn" class="btn btn-small-orange" onclick="window.RPS.quitGameClicked()">{{ $t('QUIT_GAME') }}</button>
          </div>
          <div class="col-5 pr-2 button-border-left">
            <button id="rpswfopponent_pause_btn" class="btn btn-small-orange" onclick="window.RPS.pauseGameClicked()">{{ $t('PAUSE_GAME') }}</button>
          </div>
        </div>
      </div>

      <div class="col-sm-8 border-left text-center inner-column">
        <h3 class="mt-4 mb-4 f18">{{ $t('WAITING_FOR_OPPONENT') }}</h3>
        <div class="row mt-5 pt-4"></div>

        <div id="rpswfopponent_makeTop_block" class="align-button-bottom hidden" data-group="rpswfopponent_make_top">
          <button id="make_top_btc_makeTop" class="btn btn-start-game btn-make-top" onclick="window.RPS.makeTopClicked()">
            <img src="/img/icon-btn-start.svg" class="mr-3">
            {{ $t('MAKE_TOP_GAME') }}
          </button>
        </div>

        <div id="rpswfopponent_paused_block" class="mt-5 pt-5 hidden" data-group="rpswfopponent_paused">
          <h2 class="paused-game mb-0">{{ $t('GAME_PAUSED') }}</h2>
          <p class="f18">{{ $t('UNPAUSE_COST') }}
            <img src="/img/icon_amount-eth.svg" class="money-icon" v-show="currency === 'eth'">
            <img src="/img/icon_amount-trx.svg" class="money-icon" v-show="currency === 'trx'">
          </p>
        </div>
      </div>
    </div>

    <div class="row game-block hidden" id="rpsjoingame">
      <div class="col-sm-4 f13 info-column inner-column opacity-text">

        <div class="mt-0 pt-2 text-left opacity-text">
          <p class="mb-0 f10">{{ $t('GAME_ID') }}:</p>
          <span id="rpsjoingame_game_id" class="f10">0</span>
          <p class="mb-0 mt-4 f10">{{ $t('GAME_CREATOR') }}:</p>
          <span id="rpsjoingame_game_creator" class="f10">0x0</span>
          <p class="mb-0 mt-4 f10">{{ $t('GAME_OPPONENT') }}:</p>
          <span id="rpsjoingame_game_opponent" class="f10">0x0</span>

          <div class="row">
            <div class="col-6 pr-0">
              <p class="mb-0 mt-4 f10">{{ $t('GAME_BET') }}
                <img src="/img/icon_amount-eth.svg" class="money-icon" v-show="currency === 'eth'">
                <img src="/img/icon_amount-trx.svg" class="money-icon" v-show="currency === 'trx'">
              </p>
              <b id="rpsjoingame_game_bet">{{ currentBet ? currentBet : 0 }}</b>
            </div>
          </div>

          <div>
            <label for="Referal" class="f10 opacity-text text-left opacity-text mt-2 mb-1">{{ $t('ENTER_REFERRAL') }}:</label>
            <input type="text" id="rpsjoingame_game_referral" class="game_view-value referral-addr"/>
          </div>

          <button class="btn btn-start-game desktop-move" v-bind:class="{disabled: moveJoinDisabled}" onclick="window.RPS.joinGameClicked()">
            <img src="/img/icon-btn-start.svg" class="mr-2">
            {{ $t('JOIN_GAME') }}
          </button>
        </div>
      </div>

      <div class="col-sm-8 border-left text-center inner-column second-inner-column">
        <h3 class="mt-sm-4 mb-sm-4 f18">{{ $t('JOIN_GAME') }}</h3>
        <h2 class="f24">{{ $t('MAKE_FIRST_MOVE') }}</h2>

        <div class="no-value mt-4 mt-sm-5 mb-4 mb-sm-5">
          <img src="/img/game-icon-ask-big.svg" v-if="!gameValue">
          <img src="/img/game-icon-rock-big.svg" v-if="gameValue===1">
          <img src="/img/game-icon-paper-big.svg" v-if="gameValue===2">
          <img src="/img/game-icon-scissor-big.svg" v-if="gameValue===3">
        </div>

        <div class="mb-sm-0 mb-3">
          <button class="btn btn-link game-move-item mr-4 mr-sm-5 ml-sm-4" v-bind:class="{active: gameValue===1}" @click="selectMoveValue(1)">
            <img src="/img/game-icon-rock-big.svg" v-if="gameValue!==1">
            <img src="/img/game-icon-rock-white.svg" v-if="gameValue===1">
          </button>
          <button class="btn btn-link game-move-item mr-4 ml-2 mr-sm-5 ml-sm-5" v-bind:class="{active: gameValue===2}" @click="selectMoveValue(2)">
            <img src="/img/game-icon-paper-big.svg" v-if="gameValue!==2">
            <img src="/img/game-icon-paper-white.svg" v-if="gameValue===2">
          </button>
          <button class="btn btn-link game-move-item mr-1 ml-2 mr-sm-5 ml-sm-5" v-bind:class="{active: gameValue===3}" @click="selectMoveValue(3)">
            <img src="/img/game-icon-scissor-big.svg" v-if="gameValue!==3">
            <img src="/img/game-icon-scissor-white.svg" v-if="gameValue===3">
          </button>
        </div>

        <button class="btn btn-start-game mb-3 mobile-move" v-bind:class="{disabled: moveDisabled}" @click="startMove()">
          <img src="/img/icon-btn-start.svg" class="mr-2">
          {{ $t('MAKE_MOVE') }}
        </button>

      </div>
    </div>

    <div class="row game-block hidden" id="rpswfopponentmove">
      <div class="col-sm-4 f13 info-column inner-column opacity-text">

        <div class="mt-1 pt-2 text-left opacity-text">
          <p class="mb-0 f10">{{ $t('GAME_ID') }}:</p>
          <span id="rpswfopponentmove_game_id" class="f10">0</span>
          <p class="mb-0 mt-4 f10">{{ $t('GAME_CREATOR') }}:</p>
          <span id="rpswfopponentmove_game_creator" class="f10">0x0</span>
          <p class="mb-0 mt-4 f10">{{ $t('GAME_OPPONENT') }}:</p>
          <span id="rpswfopponentmove_game_opponent" class="f10">0x0</span>

          <p class="mb-0 mt-4 f10">{{ $t('GAME_BET') }}
            <img src="/img/icon_amount-eth.svg" class="money-icon" v-show="currency === 'eth'">
            <img src="/img/icon_amount-trx.svg" class="money-icon" v-show="currency === 'trx'">
          </p>
          <b id="rpswfopponentmove_game_bet">{{ currentBet ? currentBet : 0 }}</b>

          <div class="row mt-4 f10">
            <div class="col-6 pr-0">
              <p class="mb-0">{{ $t('MOVE_EXPIRES_IN') }}:</p>
              <p class="mt-1">
                <img src="/img/clock.svg" class="mr-1 clock-icon">
                <span id="rpswfopponentmove_move_remain_min" class="f13">0</span>
                <span class="date mr-2 text-white-50"> {{ $t('MIN') }}</span>
                <span id="rpswfopponentmove_move_remain_sec" class="f13">0</span>
                <span class="date mr-2 text-white-50"> {{ $t('SEC') }}</span>
              </p>
            </div>
            <!-- <div class="col-6">
              <p class="mb-0">Can claim at:</p>
              <p class="mt-1">
                <img src="/img/clock.svg" class="mr-1 clock-icon">
                <span class="date mr-2 text-white-50">30.01.20</span>
                <span>12:31</span>
              </p>
            </div> -->
          </div>

          <div class="bottom-buttons row">
            <div class="col-5 offset-1">
              <button id="rpswfopponentmove_quit_btn" class="btn btn-small-orange disabled" onclick="window.RPS.quitGameClicked()">{{ $t('QUIT_GAME') }}</button>
            </div>
            <div class="col-5 pr-2 button-border-left">
              <button id="rpswfopponentmove_claim_expired_btn" class="btn btn-small-orange disabled" onclick="window.RPS.claimExpiredGameClicked()">{{ $t('CLAIM_EXPIRED') }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-sm-8 border-left text-center inner-column second-inner-column">
        <div class="scores-block mb-2">
          <span class="one-side">{{ $t('YOU') }}</span>
          <span class="scores">
            <span id="rpswfopponentmove_score_you">0</span>
            <span> : </span>
            <span id="rpswfopponentmove_score_opponent">0</span>
          </span>
          <span class="one-side">{{ $t('OPPONENT') }}</span>
        </div>
        <h2 class="f24">{{ $t('WAITING_OPPONENT_MOVE') }}</h2>

        <div id="rpswfopponentmove_move_expired" class="mt-5 pt-5 hidden" data-group="rpswfopponentmove">
          <h2 class="paused-game mb-0">{{ $t('MOVE_EXPIRED') }}</h2>
          <p class="f18">{{ $t('MOVE_EXPIRED_CLAIM') }}</p>
        </div>

      </div>
    </div>

    <div class="row game-block hidden" id="rpscreatormove">
      <div class="col-sm-4 f13 info-column inner-column opacity-text">

        <div class="mt-1 pt-2 text-left opacity-text">
          <p class="mb-0 f10">{{ $t('GAME_ID') }}:</p>
          <span id="rpscreatormove_game_id" class="f10">0</span>
          <p class="mb-0 mt-4 f10">{{ $t('GAME_CREATOR') }}:</p>
          <span id="rpscreatormove_game_creator" class="f10">0x0</span>
          <p class="mb-0 mt-4 f10">{{ $t('GAME_OPPONENT') }}:</p>
          <span id="rpscreatormove_game_opponent" class="f10">0x0</span>

          <p class="mb-0 mt-4 f10">{{ $t('GAME_BET') }}
            <img src="/img/icon_amount-eth.svg" class="money-icon" v-show="currency === 'eth'">
            <img src="/img/icon_amount-trx.svg" class="money-icon" v-show="currency === 'trx'">
          </p>
          <b id="rpscreatormove_game_bet">{{ currentBet ? currentBet : 0 }}</b>

          <div class="row mt-4 f10">
            <div class="col-6 pr-0">
              <p class="mb-0">{{ $t('MOVE_EXPIRES_IN') }}:</p>
              <p class="mt-1">
                <img src="/img/clock.svg" class="mr-1 clock-icon">
                <span id="rpscreatormove_move_remain_min" class="f13">0</span>
                <span class="date mr-2 text-white-50"> {{ $t('MIN') }}</span>
                <span id="rpscreatormove_move_remain_sec" class="f13">0</span>
                <span class="date mr-2 text-white-50"> {{ $t('SEC') }}</span>
              </p>
            </div>
          </div>

          <button id="rpscreatormove_play_move_btn" class="btn btn-start-game desktop-move mb-3" v-bind:class="{disabled: playMoveDisabled}" onclick="window.RPS.playMoveClicked()">
            <img src="/img/icon-btn-start.svg" class="mr-2">
            {{ $t('PLAY_MOVE') }}
          </button>

          <div class="bottom-buttons row">
            <div class="col-5 offset-1">
              <button id="rpscreatormove_quit_btn" class="btn btn-small-orange disabled" onclick="window.RPS.quitGameClicked()">{{ $t('QUIT_GAME') }}</button>
            </div>
            <div class="col-5 pr-2 button-border-left">
              <button id="rpscreatormove_claim_expired_btn" class="btn btn-small-orange disabled" onclick="window.RPS.claimExpiredGameClicked()">{{ $t('CLAIM_EXPIRED') }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-sm-8 border-left text-center inner-column second-inner-column">
        <div class="scores-block">
          <span class="one-side">{{ $t('YOU') }}</span>
          <span class="scores">
            <span id="rpscreatormove_score_you">0</span>
            <span> : </span>
            <span id="rpscreatormove_score_opponent">0</span>
          </span>
          <span class="one-side">{{ $t('OPPONENT') }}</span>
        </div>
        <!-- <div class="game-result">
          You Won Move :)
        </div> -->

        <div id="rpscreatormove_prev_next_move_creator_block" class="hidden" data-group="creatorMove">
          <div class="row mt-5">
            <div class="col-sm-4 text-sm-right">
              <h5>{{ $t('PREV_MOVE') }}:</h5>
            </div>
            <div class="col-sm-6">
              <div class="text-sm-left text-center">
                <button class="btn btn-link game-move-item game-move-small mr-4" v-bind:class="{active: prevGameValue===11}" @click="selectPreviousValue(11)">
                  <img src="/img/game-icon-rock-big.svg" v-if="prevGameValue!==11">
                  <img src="/img/game-icon-rock-white.svg" v-if="prevGameValue===11">
                </button>
                <button class="btn btn-link game-move-item game-move-small mr-4 ml-3" v-bind:class="{active: prevGameValue===12}"
                        @click="selectPreviousValue(12)">
                  <img src="/img/game-icon-paper-big.svg" v-if="prevGameValue!==12">
                  <img src="/img/game-icon-paper-white.svg" v-if="prevGameValue===12">
                </button>
                <button class="btn btn-link game-move-item game-move-small ml-3" v-bind:class="{active: prevGameValue===13}" @click="selectPreviousValue(13)">
                  <img src="/img/game-icon-scissor-big.svg" v-if="prevGameValue!==13">
                  <img src="/img/game-icon-scissor-white.svg" v-if="prevGameValue===13">
                </button>
              </div>

              <div class="opacity-text mt-3 pl-3 pr-3 pl-sm-0 pr-sm-0">
                <label for="Referal" class="f10 opacity-text text-left opacity-text mt-2 mb-2">{{ $t('ENTER_SEED2') }}:</label>
                <input type="text" id="rpscreatormove_previous_move_seed" class="game_view-value referral-addr"/>
              </div>
            </div>
          </div>
          <div id="rpscreatormove_next_move_action" class="row mt-5">
            <div class="col-sm-4 text-sm-right">
              <h5>{{ $t('NEXT_MOVE') }}:</h5>
            </div>
            <div class="col-sm-6">
              <div class="text-sm-left text-center">
                <button class="btn btn-link game-move-item game-move-middle mr-4" v-bind:class="{active: gameValue===1}" @click="selectMoveValue(1)">
                  <img src="/img/game-icon-rock-big.svg" v-if="gameValue!==1">
                  <img src="/img/game-icon-rock-white.svg" v-if="gameValue===1">
                </button>
                <button class="btn btn-link game-move-item game-move-middle mr-4 ml-3" v-bind:class="{active: gameValue===2}" @click="selectMoveValue(2)">
                  <img src="/img/game-icon-paper-big.svg" v-if="gameValue!==2">
                  <img src="/img/game-icon-paper-white.svg" v-if="gameValue===2">
                </button>
                <button class="btn btn-link game-move-item game-move-middle ml-3" v-bind:class="{active: gameValue===3}" @click="selectMoveValue(3)">
                  <img src="/img/game-icon-scissor-big.svg" v-if="gameValue!==3">
                  <img src="/img/game-icon-scissor-white.svg" v-if="gameValue===3">
                </button>
              </div>

              <div class="opacity-text mt-3 pl-3 pr-3 pl-sm-0 pr-sm-0">
                <label for="Referal" class="f10 opacity-text text-left opacity-text mt-2 mb-2">{{ $t('ENTER_SEED') }}:</label>
                <input type="text" id="rpscreatormove_next_move_seed" class="game_view-value referral-addr"/>
              </div>
            </div>
          </div>
        </div>

        <div id="rpscreatormove_move_expired" class="mt-5 pt-5 hidden" data-group="creatorMove">
          <h2 class="paused-game mb-0">{{ $t('MOVE_EXPIRED') }}</h2>
          <p class="f18">{{ $t('MOVE_EXPIRED_LOST') }}</p>
        </div>

      </div>
    </div>

    <div class="row game-block hidden" id="rpsopponentmove">
      <div class="col-sm-4 f13 info-column inner-column opacity-text">

        <div class="mt-1 pt-2 text-left opacity-text">
          <p class="mb-0 f10">{{ $t('GAME_ID') }}:</p>
          <span id="rpsopponentmove_game_id" class="f10">0</span>
          <p class="mb-0 mt-4 f10">{{ $t('GAME_CREATOR') }}:</p>
          <span id="rpsopponentmove_game_creator" class="f10">0x0</span>
          <p class="mb-0 mt-4 f10">{{ $t('GAME_OPPONENT') }}:</p>
          <span id="rpsopponentmove_game_opponent" class="f10">0x0</span>

          <p class="mb-0 mt-4 f10">{{ $t('GAME_BET') }}
            <img src="/img/icon_amount-eth.svg" class="money-icon" v-show="currency === 'eth'">
            <img src="/img/icon_amount-trx.svg" class="money-icon" v-show="currency === 'trx'">
          </p>
          <b id="rpsopponentmove_game_bet">{{ currentBet ? currentBet : 0 }}</b>

          <div class="row mt-4 f10">
            <div class="col-6 pr-0">
              <p class="mb-0">{{ $t('MOVE_EXPIRES_IN') }}:</p>
              <p class="mt-1">
                <img src="/img/clock.svg" class="mr-1 clock-icon">
                <span id="rpsopponentmove_move_remain_min" class="f13">0</span>
                <span class="date mr-2 text-white-50"> {{ $t('MIN') }}</span>
                <span id="rpsopponentmove_move_remain_sec" class="f13">0</span>
                <span class="date mr-2 text-white-50"> {{ $t('MIN') }}</span>
              </p>
            </div>
          </div>

          <button id="rpsopponentmove_make_move_btn" class="btn btn-start-game desktop-move mb-3" onclick="window.RPS.makeMoveClicked()">
            <img src="/img/icon-btn-start.svg" class="mr-2">
            {{ $t('MAKE_MOVE') }}
          </button>

          <div class="bottom-buttons row">
            <div class="col-5 offset-1">
              <button id="rpsopponentmove_quit_btn" class="btn btn-small-orange disabled" onclick="window.RPS.quitGameClicked()">{{ $t('QUIT_GAME') }}</button>
            </div>
            <div class="col-5 pr-2 button-border-left" id="claimExpiredButton">
              <button id="rpsopponentmove_claim_expired_btn" class="btn btn-small-orange disabled" onclick="window.RPS.claimExpiredGameClicked()">{{ $t('CLAIM_EXPIRED') }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-sm-8 border-left text-center inner-column second-inner-column">
        <div class="scores-block">
          <span class="one-side">{{ $t('YOU') }}</span>
          <span class="scores">
            <span id="rpsopponentmove_score_you">0</span>
            <span> : </span>
            <span id="rpsopponentmove_score_opponent">0</span>
          </span>
          <span class="one-side">{{ $t('OPPONENT') }}</span>
        </div>
        <!-- <div class="game-result">
          You Won Move :)
        </div> -->

        <div id="opponentMoveBlock" data-group="opponentMove">
          <div class="no-value mt-4 mt-sm-5 mb-4 mb-sm-5">
            <img src="/img/game-icon-ask-big.svg" v-if="!gameValue">
            <img src="/img/game-icon-rock-big.svg" v-if="gameValue===1">
            <img src="/img/game-icon-paper-big.svg" v-if="gameValue===2">
            <img src="/img/game-icon-scissor-big.svg" v-if="gameValue===3">
          </div>

          <div class="mb-sm-0 mb-3">
            <button class="btn btn-link game-move-item mr-4 mr-sm-5 ml-sm-4" v-bind:class="{active: gameValue===1}" @click="selectMoveValue(1)">
              <img src="/img/game-icon-rock-big.svg" v-if="gameValue!==1">
              <img src="/img/game-icon-rock-white.svg" v-if="gameValue===1">
            </button>
            <button class="btn btn-link game-move-item mr-4 ml-2 mr-sm-5 ml-sm-5" v-bind:class="{active: gameValue===2}" @click="selectMoveValue(2)">
              <img src="/img/game-icon-paper-big.svg" v-if="gameValue!==2">
              <img src="/img/game-icon-paper-white.svg" v-if="gameValue===2">
            </button>
            <button class="btn btn-link game-move-item mr-1 ml-2 mr-sm-5 ml-sm-5" v-bind:class="{active: gameValue===3}" @click="selectMoveValue(3)">
              <img src="/img/game-icon-scissor-big.svg" v-if="gameValue!==3">
              <img src="/img/game-icon-scissor-white.svg" v-if="gameValue===3">
            </button>
          </div>
        </div>

        <div id="rpsopponentmove_move_expired" class="mt-5 pt-5 hidden" data-group="opponentMove">
          <h2 class="paused-game mb-0">{{ $t('MOVE_EXPIRED') }}</h2>
          <p class="f18">{{ $t('MOVE_EXPIRED_LOST') }}</p>
        </div>

      </div>
    </div>
    <div class="row hidden game-block" id="youWon">
      <div class="inner-column game-image-padding text-center">
        <img src="/img/icon-big-won.svg" alt="">
        <h2 class="mt-4 mb-4">{{ $t('YOU_WON') }}!</h2>
        <button class="btn btn-medium-orange" onclick="window.RPS.closeResultView()">{{ $t('CLOSE') }}</button>
      </div>
    </div>

    <div class="row hidden game-block" id="youLost">
      <div class="inner-column game-image-padding text-center">
        <img src="/img/icon-big-lose.svg" alt="">
        <h2 class="mt-4 mb-4">{{ $t('YOU_LOST') }}...</h2>
        <button class="btn btn-medium-orange" onclick="window.RPS.closeResultView()">{{ $t('CLOSE') }}</button>
      </div>
    </div>

    <div class="row hidden game-block" id="itsDraw">
      <div class="inner-column game-image-padding text-center">
        <img src="/img/icon-big-draw.svg" alt="">
        <h2 class="mt-4 mb-4">{{ $t('YOU_DRAW') }}.</h2>
        <button class="btn btn-medium-orange" onclick="window.RPS.closeResultView()">{{ $t('CLOSE') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: "RPSGameComponent",
    data: function () {
      return {
        currentBet: 0.01,
        gameValue: null,
        prevGameValue: null,
        currentSeedPhrase: '',
        prevSeedPhrase: '',
      }
    },
    computed: {
      currency() {
        return this.$store.state.currency
      },
      moveDisabled() {
        return parseFloat(this.currentBet) <= 0 || !this.gameValue || this.currentSeedPhrase.length === 0;
      },
      moveJoinDisabled() {
        return this.gameValue === null;
      },
      playMoveDisabled() {
        return false;// !this.gameValue || !this.prevGameValue || this.currentSeedPhrase.length || this.prevSeedPhrase.length === 0;
      },
    },
    mounted() {
      window.selectMoveValue = this.selectMoveValue
      window.selectPreviousValue = this.selectPreviousValue
    },
    methods: {
      selectMoveValue(value) {
        // console.log(`Value selected: ${value}`);
        this.gameValue = value;
        window.RPS.moveClicked(value);
      },
      selectPreviousValue(value) {
        // console.log(`Previous value selected: ${value}`);
        this.prevGameValue = value;
        window.RPS.moveClicked(value);
      }
    }
  };
</script>

<style scoped lang="scss">
  .no-value {
    width: 162px;
    height: 162px;
    background: #FFF;
    border-radius: 50%;
    text-align: center;
    line-height: 162px;
    margin: auto;
  }

  .game-move-item {
    width: 66px;
    height: 66px;
    padding: 0;
    border-radius: 50%;
    background: #FFF;
    text-align: center;
    line-height: 66px;
    box-shadow: 0 0 0 9px rgba(255, 255, 255, 0.5);
    transition: all ease .3s;

    &.active {
      background: #F2994A;
      box-shadow: 0 0 0 9px rgba(242, 153, 74, 0.5);
    }

    &.game-move-small {
      width: 32px;
      height: 32px;
      line-height: 32px;
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.5);
    }

    &.game-move-middle {
      width: 47px;
      height: 47px;
      line-height: 47px;
      box-shadow: 0 0 0 7px rgba(255, 255, 255, 0.5);
    }

    &:hover {
      opacity: .75;
    }

    img {
      width: 65%;
      height: 65%;
      object-fit: contain;
      margin-right: 3px;
      margin-bottom: 3px;
    }
  }

  .bet-input {
    width: 70px !important;
  }

  .align-button-bottom {
    margin-top: 180px;
  }

  .game-area .info-column .btn-start-game {
    height: 54px;
    position: absolute;
    bottom: 50px;
    left: 35px;
    right: 35px;
    width: 220px;
    box-shadow: 0 0 1px 6px rgba(255, 255, 255, 0.25);
  }

  .game-area .inner-column {
    &.second-inner-column {
      padding: .8rem 1rem .8rem 1rem !important;
    }
  }

  .mobile-move {
    display: none;
  }

  @media all and (max-width: 480px) {
    .game-area {
      .inner-column {
        padding: .8rem 2rem .8rem 2rem !important;
      }

      .btn-start-game {
        position: relative;
        margin: auto;
        left: auto;
        right: auto;
        bottom: auto;
      }
    }

    .mobile-move {
      display: block;
    }
    .desktop-move {
      display: none;
    }

    .game-area .bottom-buttons {
      position: relative;
      bottom: auto;
      left: auto;
      margin-top: 10px;
    }
    .game-area .btn-small-orange {
      float: none;
    }
  }
</style>
