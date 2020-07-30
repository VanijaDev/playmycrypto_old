// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "./Partnership.sol";
import "./GameRaffle.sol";
import "./IGamePausable.sol";
import "./IExpiryMoveDuration.sol";
import "../node_modules/openzeppelin-solidity/contracts/utils/Pausable.sol";

/**
 * @notice IMPORTANT: owner should create first game.
 * @notice CoinFlipGame can be created by creator and run by joined playr. Creator is not required to be online or perform any actions for game to be played.
 *
 *  Prize distribution:
 *    95% - winner
 *     1% - winner referral
 *     1% - raffle
 *     1% - partner project
 *     1% - other prize beneficiar - create separate contract
 *     1% - dev
 */


/**
 * TODO:
 *    Prize distribution:
 *    playGame - check if side is 0 / 1 only
 *    Pausable games
 *    Expiration games
 *    Participate as creator & opponent
 */

contract CoinFlipGame is Pausable, Partnership, GameRaffle, IGamePausable, IExpiryMoveDuration {
  struct Game {
    bool paused;
    uint8 creatorCoinSide;
    uint8 randCoinSide;
    uint256 id;
    uint256 bet;
    uint256 prevMoveTimestamp;
    bytes32 creatorGuessHash;
    address payable creator;
    address payable opponent;
    address payable winner;
    address creatorReferral;
    address opponentReferral;
  }

  uint256 private constant FEE_PERCENT = 1; //  from single bet, prize is opponent's bet

  uint256 public minBet = 10 finney;

  uint256[5] public topGames;

  uint256 public gamesCreatedAmount;
  uint256 public gamesCompletedAmount; //  played, quitted, move expired

  mapping(uint256 => Game) public games;
  mapping(address => uint256) public ongoingGameAsCreator;
  mapping(address => uint256) public ongoingGameAsOpponent;
  mapping(address => uint256[]) private playedGames;
  mapping(address => uint256[]) public gamesWithPendingPrizeWithdrawal;

  mapping(address => uint256) public addressBetTotal;
  mapping(address => uint256) public addressPrizeTotal;

  mapping(address => uint256) public referralFeesPending;
  mapping(address => uint256) public referralFeesWithdrawn;

  uint256 public devFeePending;

  uint256 public totalUsedReferralFees;
  uint256 public totalUsedInGame;

  event CF_GameCreated(uint256 indexed id, address indexed creator, uint256 indexed bet);
  event CF_GameJoined(uint256 indexed id, address indexed creator, address indexed opponent);
  event CF_GamePlayed(uint256 indexed id, address indexed creator, address indexed opponent, address winner);
  event CF_GameExpiredFinished(uint256 indexed id, address indexed creator, address indexed opponent, address winner);
  event CF_GamePrizesWithdrawn(address indexed player);
  event CF_GameAddedToTop(uint256 indexed id, address indexed creator);
  event CF_GameReferralWithdrawn(address indexed referral);
  event CF_GameUpdated(uint256 indexed id, address indexed creator);

  modifier onlyCorrectBet() {
    require(msg.value >= minBet, "Wrong bet");
    _;
  }

  modifier onlyAvailableToCreate() {
    require(ongoingGameAsCreator[msg.sender] == 0, "No more creating");
    _;
  }

  modifier onlyAvailableToJoin() {
    require(ongoingGameAsOpponent[msg.sender] == 0, "No more opponenting");
    _;
  }

  modifier onlyCreator(uint256 _id) {
    require(games[_id].creator == msg.sender, "Not creator");
    _;
  }

  modifier onlyCorrectReferral(address _referral) {
    require(_referral != msg.sender, "Wrong referral");
    _;
  }

  modifier onlyGameCreator(uint256 _id) {
    require(games[_id].creator == msg.sender,  "Not creator");
    _;
  }

  modifier onlyWaitingForOpponent(uint256 _id) {
    require(games[_id].opponent == address(0),  "Has opponent");
    _;
  }

  modifier onlyGameNotPaused(uint256 _id) {
    require(!gameOnPause(_id),  "Game is paused");
    _;
  }

  modifier onlyGamePaused(uint256 _id) {
    require(gameOnPause(_id),  "Game is not paused");
    _;
  }

  /**
    * @dev Contract constructor.
    * @param _partner Address for partner.
    * 
    */
  constructor(address payable _partner) public Partnership(_partner, 1 ether) {
    updatePartner(_partner);
  }

  /**
    * @dev Destroy the contract.
    * 
    */
  function kill() external onlyOwner {
    address payable addr = msg.sender;
    selfdestruct(addr);
  }

  /**
   * Pausable.sol
   * 
   */
  /**
   * @dev Trigger stopped state.
   * 
   */
  function pause() external onlyOwner {
    Pausable._pause();
  }

  /**
   * IGamePausable
   * 
   */
  /**
   * @dev Check if game is paused.
   * @param _id Game index.
   * @return Is game paused.
   * 
   */
  function gameOnPause(uint256 _id) public view override returns(bool) { 
    return games[_id].paused;
  }

  /**
   * @dev Pauses game.
   * @param _id Game index.
   * 
   */
  function pauseGame(uint256 _id) onlyGameCreator(_id) onlyGameNotPaused(_id) external override onlyWaitingForOpponent(_id) {
    games[_id].paused = true;

    if (isTopGame(_id)) {
      removeTopGame(_id);
    }

    emit CF_GamePaused(_id);
  }
  /** 
   * @dev Unpause game.
   * @param _id Game index.
   * 
   */
  function unpauseGame(uint256 _id) onlyGameCreator(_id) onlyGamePaused(_id) external payable override {
    require(msg.value == minBet, "Wrong fee");

    games[_id].paused = false;
    
    devFeePending = devFeePending.add(msg.value);
    totalUsedInGame = totalUsedInGame.add(msg.value);

    emit CF_GameUnpaused(_id, games[_id].creator);
  }

  /**
   * IExpiryMoveDuration
   * 
   */

  /**
   * @dev Updates game move duration.
   * @param _duration Game duration.
   * 
   */
  function updateGameMoveDuration(uint16 _duration) external override onlyOwner {
    require(_duration > 0, "Should be > 0");
    gameMoveDuration = _duration;    
  }

  /**
   * @dev Check if game move expired.
   * @param _id Game id.
   * @return Whether game move is expired.
   * 
   */
  function gameMoveExpired(uint256 _id) public view override returns(bool) {
    if (games[_id].prevMoveTimestamp != 0) {
      return games[_id].prevMoveTimestamp.add(gameMoveDuration) < now; 
    }
  }

  /**
   * @dev Finish prize for expired game.
   * @param _id Game id.
   * 
   */
  function finishExpiredGame(uint256 _id) external override {
    Game storage game = games[_id];

    require(game.creator != address(0), "No game with such id");
    require(game.opponent ==  msg.sender, "Not opponent");
    require(gameMoveExpired(_id), "Not yet expired");

    game.winner = msg.sender;

    //  finish game
    game.winner = msg.sender;
    gamesWithPendingPrizeWithdrawal[msg.sender].push(_id);

    raffleParticipants.push(msg.sender);

    gamesCompletedAmount = gamesCompletedAmount.add(1);

    delete ongoingGameAsCreator[game.creator];
    delete ongoingGameAsOpponent[msg.sender];

    emit CF_GameExpiredFinished(_id, game.creator, game.opponent, game.winner);
  }


  /**
    * GAMEPLAY
    */

  /**
    * @dev Create new game.
    * @param _guessHash Hash of guess.
    * @param _referral Address for referral.
    * 
    */
  function createGame(bytes32 _guessHash, address _referral) external payable whenNotPaused onlyAvailableToCreate onlyCorrectBet onlyCorrectReferral(_referral) {
    require(_guessHash[0] != 0, "Empty hash");
    require(_referral != msg.sender, "Wrong referral");

    games[gamesCreatedAmount].id = gamesCreatedAmount;
    games[gamesCreatedAmount].creator = msg.sender;
    games[gamesCreatedAmount].bet = msg.value;
    games[gamesCreatedAmount].creatorGuessHash = _guessHash;
    (_referral == address(0)) ? games[gamesCreatedAmount].creatorReferral = owner() : games[gamesCreatedAmount].creatorReferral = _referral;

    addressBetTotal[msg.sender] = addressBetTotal[msg.sender].add(msg.value);
    totalUsedInGame = totalUsedInGame.add(msg.value);

    ongoingGameAsCreator[msg.sender] = gamesCreatedAmount;
    playedGames[msg.sender].push(gamesCreatedAmount);

    emit CF_GameCreated(gamesCreatedAmount, msg.sender, msg.value);

    gamesCreatedAmount = gamesCreatedAmount.add(1);
  }

  /**
    * @dev Join game.
    * @param _id Game id to join.
    * @param _referral Address for referral.
    * 
    */
  function joinGame(uint256 _id, address _referral) external payable whenNotPaused onlyAvailableToJoin onlyCorrectReferral(_referral) onlyGameNotPaused(_id) {
    Game storage game = games[_id];

    require(game.creator != address(0), "No game with such id");
    require(game.winner == address(0), "Game has winner");
    require(game.bet == msg.value, "Wrong bet");

    game.opponent = msg.sender;
    game.prevMoveTimestamp = now;
    (_referral == address(0)) ? games[_id].opponentReferral = owner() : games[_id].opponentReferral = _referral;

    totalUsedInGame = totalUsedInGame.add(msg.value);
    addressBetTotal[msg.sender] = addressBetTotal[msg.sender].add(msg.value);
    ongoingGameAsOpponent[msg.sender] = _id;
    playedGames[msg.sender].push(_id);

    if (isTopGame(_id)) {
      removeTopGame(_id);
    }

    emit CF_GameJoined(_id, game.creator, msg.sender);
  }

  /**
    * @dev Play game.
    * @param _id Game id.
    * @param _coinSide Coin side in _guessHash.
    * @param _seedHash Seed str hash in _guessHash.
    * 
    */
  function playGame(uint256 _id, uint8 _coinSide, bytes32 _seedHash) external whenNotPaused onlyGameCreator(_id) {
    Game storage game = games[_id];
    
    require(game.opponent != address(0), "No opponent");
    require(game.winner == address(0), "Game has winner");
    require(keccak256(abi.encodePacked(uint256(_coinSide), _seedHash)) == game.creatorGuessHash, "Wrong hash value");

    uint8 coinSide = uint8(uint256(keccak256(abi.encodePacked(now, totalUsedInGame, _coinSide))) % 2);
    game.winner = (coinSide == _coinSide) ? game.creator : game.opponent;
    gamesWithPendingPrizeWithdrawal[game.winner].push(_id);

    raffleParticipants.push(game.creator);
    raffleParticipants.push(game.opponent);

    gamesCompletedAmount = gamesCompletedAmount.add(1);

    delete ongoingGameAsCreator[msg.sender];
    delete ongoingGameAsOpponent[game.opponent];

    emit CF_GamePlayed(_id, game.creator, game.opponent, game.winner);
  }

  /**
    * WITHDRAW
    */

  /**
    * @dev Withdraw prize for won game.
    * @param _maxLoop max loop.
    * @notice 95% to transfer
    * 
    */
  function withdrawGamePrizes(uint256 _maxLoop) external {
    require(_maxLoop > 0, "_maxLoop == 0");

    uint256[] storage pendingGames = gamesWithPendingPrizeWithdrawal[msg.sender];
    require(pendingGames.length > 0, "no pending");
    require(_maxLoop <= pendingGames.length, "_maxLoop too big");

    uint256 betsTotal;
    for (uint256 i = 0; i < _maxLoop; i++) {
      uint256 gameId = pendingGames[pendingGames.length.sub(1)];
      Game storage game = games[gameId];

      //  referral
      address winnerReferral = (msg.sender == game.creator) ? game.creatorReferral : game.opponentReferral;
      uint256 referralFee = game.bet.mul(FEE_PERCENT).div(100);
      referralFeesPending[winnerReferral] = referralFeesPending[winnerReferral].add(referralFee);
      totalUsedReferralFees = totalUsedReferralFees.add(referralFee);

      betsTotal = betsTotal.add(game.bet);
      pendingGames.pop();
    }

    addressPrizeTotal[msg.sender] = addressPrizeTotal[msg.sender].add(betsTotal.mul(2));

    //  5% fees
    uint256 singleFee = betsTotal.mul(FEE_PERCENT).div(100);
    partnerFeePending = partnerFeePending.add(singleFee);
    ongoinRafflePrize = ongoinRafflePrize.add(singleFee);
    devFeePending = devFeePending.add(singleFee);
    //  TODO: add to other prize beneficiar

    uint256 transferAmount = betsTotal.mul(2).sub(singleFee.mul(5));
    msg.sender.transfer(transferAmount);

    //  partner transfer
    transferPartnerFee();

    emit CF_GamePrizesWithdrawn(msg.sender);
  }

  /**
    * @dev Withdraw referral fees.
    * @notice 96% to transfer
    * 
    */
  function withdrawReferralFees() external {
    uint256 fee = referralFeesPending[msg.sender];
    require(fee > 0, "No referral fee");

    delete referralFeesPending[msg.sender];
    referralFeesWithdrawn[msg.sender] = referralFeesWithdrawn[msg.sender].add(fee);

    //  4% fees
    uint256 singleFee = fee.mul(FEE_PERCENT).div(100);
    partnerFeePending = partnerFeePending.add(singleFee);
    ongoinRafflePrize = ongoinRafflePrize.add(singleFee);
    devFeePending = devFeePending.add(singleFee);
    //  TODO: add to other prize beneficiar

    uint256 transferAmount = fee.sub(singleFee.mul(4));
    msg.sender.transfer(transferAmount);

    emit CF_GameReferralWithdrawn(msg.sender);   
  }

  /**
    * GameRaffle
    * @dev Withdraw reffle prize.
    * @notice 96% to transfer
    * 
    */
  function withdrawRafflePrizes() external override {
    uint256 prize = rafflePrizePending[msg.sender];
    require(prize > 0, "No raffle prize");

    delete rafflePrizePending[msg.sender];

    addressPrizeTotal[msg.sender] = addressPrizeTotal[msg.sender].add(prize);

    //  4% fees
    uint256 singleFee = prize.mul(FEE_PERCENT).div(100);
    partnerFeePending = partnerFeePending.add(singleFee);
    ongoinRafflePrize = ongoinRafflePrize.add(singleFee);
    devFeePending = devFeePending.add(singleFee);
    //  TODO: add to other prize beneficiar

    uint256 transferAmount = prize.sub(singleFee.mul(4));
    msg.sender.transfer(transferAmount);

    //  partner transfer
    transferPartnerFee();

    emit CF_RafflePrizeWithdrawn(msg.sender);
  }

  /**
    * @dev Withdraw developer fees.
    * 
    */
  function withdrawDevFee() external onlyOwner {
    uint256 fee = devFeePending;
    require(devFeePending > 0, "No dev fee");

    delete devFeePending;

    msg.sender.transfer(fee);
  }

  /**
    * OTHER
    */

  /**
    * @dev Add game idx to the beginning of topGames.
    * @param _id Game idx to be added.
    * 
    */
  function addTopGame(uint256 _id) external payable onlyCreator(_id) onlyWaitingForOpponent(_id) {
    require(msg.value == minBet, "Wrong fee");
    require(topGames[0] != _id, "Top in TopGames");

    uint256[5] memory topGamesTmp = [_id, 0, 0, 0, 0];
    bool isIdPresent;
    for (uint8 i = 0; i < 4; i++) {
      if (topGames[i] == _id && !isIdPresent) {
          isIdPresent = true;
      }
      topGamesTmp[i + 1] = (isIdPresent) ? topGames[i + 1] : topGames[i];
    }
    topGames = topGamesTmp;
    devFeePending = devFeePending.add(msg.value);
    totalUsedInGame = totalUsedInGame.add(msg.value);

    emit CF_GameAddedToTop(_id, msg.sender);
  }

  /**
    * @dev Remove game idx from topGames.
    * @param _id Game idx to be removed.
    * 
    */
  function removeTopGame(uint256 _id) private {
    uint256[5] memory tmpArr;
    bool found;

    for (uint256 i = 0; i < 5; i++) {
      if (topGames[i] == _id) {
        found = true;
      } else {
        if (found) {
          tmpArr[i - 1] = topGames[i];
        } else {
          tmpArr[i] = topGames[i];
        }
      }
    }

    require(found, "Not TopGame");
    topGames = tmpArr;
  }

  /**
    * @dev Get top games.
    * @return Returns list of top games.
    * 
    */
  function getTopGames() external view returns (uint256[5] memory) {
    return topGames;
  }

  /**
    * @dev Check if game id is in top games.
    * @param _id Game id to check.
    * @return Whether game id is in top games.
    * 
    */
  function isTopGame(uint256 _id) public view returns (bool) {
    for (uint8 i = 0; i < 5; i++) {
      if (topGames[i] == _id) {
          return true;
      }
    }
    return false;
  }

  /**
    * @dev Return game ids with pending withdrawal for address.
    * @param _address Player address.
    * @return ids Game ids.
    * 
    */
  function getGamesWithPendingPrizeWithdrawalForAddress(address _address) external view returns (uint256[] memory ids) {
    ids = gamesWithPendingPrizeWithdrawal[_address];
  }

  /**
    * @dev Update bet for game.
    * @param _id Game index.
    * 
    */
  function increaseBetForGameBy(uint256 _id) external payable whenNotPaused onlyCreator(_id) onlyWaitingForOpponent(_id) {
    require(msg.value > 0, "increase must be > 0");

    addressBetTotal[msg.sender] = addressBetTotal[msg.sender].add(msg.value);

    games[_id].bet = games[_id].bet.add(msg.value);
    totalUsedInGame = totalUsedInGame.add(msg.value);
    emit CF_GameUpdated(_id, msg.sender);
  }

  /**
    * @dev Update minimum bet value. Can be 0 if no restrictions.
    * @param _minBet Min bet value.
    * 
    */
  function updateMinBet(uint256 _minBet) external onlyOwner {
    require(_minBet > 0, "Wrong bet");
    minBet = _minBet;
  }

  /**
    * @dev Get game indexes where player participated. Created and joined
    * @param _address Player address.
    * @return List of indexes.
    * 
    */
  function getParticipatedGameIdxsForPlayer(address _address) external view returns (uint256[] memory) {
    require(_address != address(0), "Cannt be 0x0");
    return playedGames[_address];
  }
}