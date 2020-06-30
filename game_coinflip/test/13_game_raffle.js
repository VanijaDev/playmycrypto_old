const Game = artifacts.require("./CoinFlipGame.sol");
const {
  BN,
  time,
  ether,
  balance,
  constants,
  expectEvent,
  expectRevert
} = require('openzeppelin-test-helpers');
const {
  expect
} = require('chai');



contract("Game Raffle", (accounts) => {
  const OWNER = accounts[0];
  const CREATOR = accounts[1];
  const OPPONENT = accounts[2];
  const CREATOR_REFERRAL = accounts[3];
  const OPPONENT_REFERRAL = accounts[4];
  const PARTNER = accounts[5];
  const CREATOR_2 = accounts[6];
  const OTHER = accounts[9];
  const OPPONENT_2 = accounts[10];
  const CREATOR_2_REFERRAL = accounts[11];
  const OPPONENT_2_REFERRAL = accounts[12];

  const CREATOR_COIN_SIDE = 1;
  const CREATOR_SEED = "Hello World";

  let game;

  beforeEach("setup", async () => {
    await time.advanceBlock();
    game = await Game.new(PARTNER);

    // FIRST GAME SHOULD BE CREATED BY OWNER

    await game.createGame(1, CREATOR_REFERRAL, {
      from: OWNER,
      value: ether("1")
    });

    // 1 - create
    await game.createGame(1, CREATOR_REFERRAL, {
      from: CREATOR,
      value: ether("1")
    });

    await time.increase(10);
  });

  describe("GameRaffle", () => {
    it("should return correct amount for getRaffleParticipants", async () => {
      await game.updateRaffleActivationParticipantsCount(4);

      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      let participants = await game.getRaffleParticipants.call();
      assert.equal(participants.length, 2, "wrong participants amount, should be 2");
      assert.equal(participants[0], CREATOR, "shhould be CREATOR");
      assert.equal(participants[1], OPPONENT, "shhould be OPPONENT");

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      participants = await game.getRaffleParticipants.call();
      assert.equal(participants.length, 4, "wrong participants amount, should be 4");
      assert.equal(participants[0], CREATOR, "shhould be CREATOR");
      assert.equal(participants[1], OPPONENT, "shhould be OPPONENT");
      assert.equal(participants[2], CREATOR_2, "shhould be CREATOR_2");
      assert.equal(participants[3], OPPONENT_2, "shhould be OPPONENT_2");
    });

    it("should return correct amount for getRaffleResultCount", async() => {
      await game.updateRaffleActivationParticipantsCount(2, {
        from: OWNER
      });

      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      let winner = (await game.games.call(1)).winner;
      await game.withdrawGamePrizes(1, {
        from: winner
      });

      await time.increase(2);
      await game.runRaffle({
        from: OTHER
      });
      assert.equal(0, (await game.getRaffleResultCount.call()).cmp(new BN("1")), "should be 1");

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });
      
      winner = (await game.games.call(2)).winner;
      await game.withdrawGamePrizes(1, {
        from: winner
      });

      await time.increase(2);
      await game.runRaffle({
        from: OTHER
      });
      assert.equal(0, (await game.getRaffleResultCount.call()).cmp(new BN("2")), "should be 2");
    });

    it("should fail to updateRaffleActivationParticipantsCount if not OWNER", async () => {
      assert.equal(0, (await game.raffleActivationParticipantsAmount.call()).cmp(new BN("200")), "should be 200");
      await expectRevert(game.updateRaffleActivationParticipantsCount(10, {
        from: OTHER
      }), "Ownable: caller is not the owner");
    });
    
    it("should update updateRaffleActivationParticipantsCount", async () => {
      assert.equal(0, (await game.raffleActivationParticipantsAmount.call()).cmp(new BN("200")), "should be 200");
      await game.updateRaffleActivationParticipantsCount(10, {
        from: OWNER
      });
      assert.equal(0, (await game.raffleActivationParticipantsAmount.call()).cmp(new BN("10")), "should be 10");
    });

    it("should show raffle is activated - raffleActivated", async () => {
      await game.updateRaffleActivationParticipantsCount(4);

      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      let winner = (await game.games.call(1)).winner;
      await game.withdrawGamePrizes(1, {
        from: winner
      });

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);

      assert.isTrue(await game.raffleActivated.call(), "should be activated");
    });

    it("should show raffle is not activated - raffleActivated", async () => {
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      let winner = (await game.games.call(1)).winner;
      await game.withdrawGamePrizes(1, {
        from: winner
      });

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);

      assert.isFalse(await game.raffleActivated.call(), "should not be activated");
    });
  });

  describe("runRaffle", () => {
    it("should fail if raffleActivated == false", async () => {
      //  play
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      await expectRevert(game.runRaffle(), "Raffle != activated");
    });

    it("should update rafflePrizePendingForAddress", async() => {
      await game.updateRaffleActivationParticipantsCount(2);

      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      let raffleWinner_1 = (await game.getRaffleParticipants.call())[await game.rand.call()];
      assert.equal(0, (await game.rafflePrizePendingForAddress.call(raffleWinner_1)).cmp(ether("0")), "should be 0 before");

      await game.runRaffle({
        from: OTHER
      });

      assert.equal(0, (await game.rafflePrizePendingForAddress.call(raffleWinner_1)).cmp(ether("0.02")), "should be 0.02 after");
    });

    it("should update rafflePrizesWonTotal", async () => {
      await game.updateRaffleActivationParticipantsCount(4);
      
      let rafflePrizesWonTotalBefore = await game.rafflePrizesWonTotal.call();
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      // withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2 
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      let ongoinRafflePrize = await game.ongoinRafflePrize.call();

      //  3
      await game.runRaffle();

      let rafflePrizesWonTotalAfter = await game.rafflePrizesWonTotal.call();
      assert.equal(0, rafflePrizesWonTotalAfter.sub(rafflePrizesWonTotalBefore).cmp(ongoinRafflePrize), "wrong rafflePrizesWonTotalAfter");
    });

    it("should add new RaffleResult to raffleResults", async () => {
      await game.updateRaffleActivationParticipantsCount(2);
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      assert.equal((await game.getRaffleResultCount.call()).toNumber(), 0, "raffleResults amount should be == 0");

      await time.increase(time.duration.seconds(1));
      let randNum = await game.rand.call(); //  is the same as will be in raffle
      let randWinner = await game.raffleParticipants.call(randNum);

      // console.log(await game.getRaffleParticipants.call());
      await game.runRaffle();
      // console.log((await game.raffleResults.call(0)).winner);
      assert.equal((await game.getRaffleResultCount.call()).toNumber(), 1, "raffleResults amount should be == 1");
      assert.equal((await game.raffleResults.call(0)).winner, randWinner, "wrong raffle winner");


      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("0.1")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("0.1")
      });

      await time.increase(2);

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      await time.increase(2);

      assert.equal((await game.getRaffleResultCount.call()).toNumber(), 1, "raffleResults amount should still be == 1 before 1");

      await time.increase(time.duration.seconds(1));
      randNum = await game.rand.call(); //  is the same as will be in raffle
      randWinner = await game.raffleParticipants.call(randNum);

      // console.log(await game.getRaffleParticipants.call());
      await game.runRaffle();
      // console.log((await game.raffleResults.call(0)).winner);
      // console.log((await game.raffleResults.call(1)).winner);
      assert.equal((await game.getRaffleResultCount.call()).toNumber(), 2, "raffleResults amount should be == 2 after 1");
      assert.equal((await game.raffleResults.call(1)).winner, randWinner, "wrong raffle winner after 1");
    });

    it("should emit CF_RafflePlayed", async () => {
      await game.updateRaffleActivationParticipantsCount(4);
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);
      
      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      let randNum = await game.rand.call(); //  is the same as will be in raffle
      let randWinner = await game.raffleParticipants.call(randNum);
      let ongoinRafflePrize = await game.ongoinRafflePrize.call();

      // event RafflePlayed(address indexed winner, uint256 indexed prize);
      let tx = await game.runRaffle();
      await time.increase(2);

      assert.equal(0, new BN(tx.logs.length).cmp(new BN("1")), "should be 1 event");
      let event = tx.logs[0];
      assert.equal(event.event, "CF_RafflePlayed", "wrong name");
      assert.equal(event.args.winner, randWinner, "wrong winner");
      assert.equal(0, (event.args.prize).cmp(ongoinRafflePrize), "wrong ongoinRafflePrize");
    });

    it("should clear ongoinRafflePrize", async () => {
      await game.updateRaffleActivationParticipantsCount(4);
      
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      assert.equal(1, (await game.ongoinRafflePrize.call()).cmp(new BN("0")), "ongoinRafflePrize should be > 0");
      await game.runRaffle();
      assert.equal(0, (await game.ongoinRafflePrize.call()).cmp(new BN("0")), "ongoinRafflePrize should be == 0");
    });

    it("should clear raffleParticipants", async () => {
      await game.updateRaffleActivationParticipantsCount(4);
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      assert.equal(1, new BN((await game.getRaffleParticipants.call()).length).cmp(new BN("0")), "raffleParticipants should be > 0");
      await game.runRaffle();
      assert.equal(0, new BN((await game.getRaffleParticipants.call()).length).cmp(new BN("0")), "raffleParticipants should be == 0");
    });

    it("should fail is no participants - rand", async() => {
      await expectRevert(game.rand.call(), "No participants");
    });

    it("should return number in correct range - rand", async() => {
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      assert.equal(-1, (await game.rand.call()).cmp(new BN("2")), "should be < 1");
      await time.increase(2);
      assert.equal(-1, (await game.rand.call()).cmp(new BN("2")), "should be < 1");
      await time.increase(2);
      assert.equal(-1, (await game.rand.call()).cmp(new BN("2")), "should be < 1");
      await time.increase(2);
      assert.equal(-1, (await game.rand.call()).cmp(new BN("2")), "should be < 1");


      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      assert.equal(-1, (await game.rand.call()).cmp(new BN("4")), "should be < 1");
      await time.increase(2);
      assert.equal(-1, (await game.rand.call()).cmp(new BN("4")), "should be < 1");
      await time.increase(2);
      assert.equal(-1, (await game.rand.call()).cmp(new BN("4")), "should be < 1");
      await time.increase(2);
      assert.equal(-1, (await game.rand.call()).cmp(new BN("4")), "should be < 1");
    });
  });

  describe("withdrawRafflePrizes", () => {
    it("should fail if no raffle prize for sender", async() => {
      await expectRevert(game.withdrawRafflePrizes({
        from: OTHER
      }), "No raffle prize");
    });

    it("should delete rafflePrizePendingForAddress[msg.sender]", async () => {
      await game.updateRaffleActivationParticipantsCount(4);
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      //  3
      let randNum = await game.rand.call(); //  is the same as will be in raffle
      let randWinner = await game.raffleParticipants.call(randNum);
      await game.runRaffle();
      await time.increase(2);

      assert.equal(1, (await game.rafflePrizePendingForAddress.call(randWinner)).cmp(new BN("0")), "rafflePrizePendingForAddress[msg.sender] should be > 0");

      await time.increase(2);
      await game.withdrawRafflePrizes({
        from: randWinner
      });
      await time.increase(2);

      assert.equal(0, (await game.rafflePrizePendingForAddress.call(randWinner)).cmp(new BN("0")), "should delete rafflePrizePendingForAddress[msg.sender]");
    });

    it("should increse addressPrizeTotal for winner", async() => {
      await game.updateRaffleActivationParticipantsCount(4);
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      //  3
      await time.increase(1);
      let ongoinRafflePrize = await game.ongoinRafflePrize.call();
      let randNum = await game.rand.call(); //  is the same as will be in raffle
      let randWinner = await game.raffleParticipants.call(randNum);
      await game.runRaffle();

      let addressPrizeTotalBefore = await game.addressPrizeTotal.call(randWinner);
      
      await game.withdrawRafflePrizes({
        from: randWinner
      });

      let addressPrizeTotalAfter = await game.addressPrizeTotal.call(randWinner);
      assert.equal(0, addressPrizeTotalAfter.sub(addressPrizeTotalBefore).cmp(ongoinRafflePrize), "wrong addressPrizeTotal after raffle");
    });

    it("should update partnerFeePending if < 1 ether", async() => {
      await game.updateRaffleActivationParticipantsCount(4);
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);

      //  withdraw
      // console.log("update: ", (await game.ongoinRafflePrize.call()).toString());
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      //  3
      await time.increase(1);
      let randNum = await game.rand.call(); //  is the same as will be in raffletest
      let randWinner = await game.raffleParticipants.call(randNum);
      await game.runRaffle();
      await time.increase(2);

      let feeBefore = await game.partnerFeePending.call();

      await game.withdrawRafflePrizes({
        from: randWinner
      });

      assert.equal(0, (await game.partnerFeePending.call()).sub(feeBefore).cmp(ether("0.0006")), "partnerFeePending should be == 0.0006 eth");
    });

    it("should delete partnerFeePending, transfer to partner if > 1 ether", async() => {
      await game.updateRaffleActivationParticipantsCount(4);
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("48.9")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("48.9")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      //  3
      let randNum = await game.rand.call(); //  is the same as will be in raffle
      let randWinner = await game.raffleParticipants.call(randNum);
      await game.runRaffle();
      await time.increase(2);

      // console.log((await game.partnerFeePending.call()).toString());
      // console.log(randWinner);
      // console.log((await game.rafflePrizePendingForAddress.call(randWinner)).toString());

      assert.equal(0, (await game.partnerFeePending.call()).cmp(ether("0.998")), "partnerFeePending should be == 0.998");
      let partnerBalanceBefore = new BN(await web3.eth.getBalance(PARTNER));

      await game.withdrawRafflePrizes({
        from: randWinner
      });

      //  partnerFeePending
      assert.equal(0, (await game.partnerFeePending.call()).cmp(ether("0")), "partnerFeePending should be == 0");

      //  transfer to partner
      let partnerBalanceAfter = new BN(await web3.eth.getBalance(PARTNER));
      assert.equal(0, partnerBalanceBefore.add(ether("1.00798")).cmp(partnerBalanceAfter), "wrong PARTNER balance after multiple prize withdraw");
    });

    it("should update devFeePending", async() => {
      await game.updateRaffleActivationParticipantsCount(4);
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      //  3
      let randNum = await game.rand.call(); //  is the same as will be in raffle
      let randWinner = await game.raffleParticipants.call(randNum);
      await game.runRaffle();
      await time.increase(2);

      let devFeePendingBefore = await game.devFeePending.call();
      assert.equal(0, devFeePendingBefore.cmp(ether("0.12")), "wrong devFeePending before");

      await game.withdrawRafflePrizes({
        from: randWinner
      });
      await time.increase(2);

      let devFeePendingAfter = await game.devFeePending.call();
      assert.equal(0, devFeePendingAfter.cmp(ether("0.1212")), "wrong devFeePending after");
    });

    it("should transfer correct prize to raffle winner", async () => {
      await game.updateRaffleActivationParticipantsCount(4);

      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);

      //  withdraw
      // console.log("transfer: ", (await game.ongoinRafflePrize.call()).toString());
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      //  3
      await time.increase(2);

      let randNum = await game.rand.call(); //  is the same as will be in raffle
      let randWinner = await game.raffleParticipants.call(randNum);
      await game.runRaffle();

      await time.increase(2);
      let randWinnerBalanceBefore = new BN(await web3.eth.getBalance(randWinner));

      let tx = await game.withdrawRafflePrizes({
        from: randWinner
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);
      let randWinnerBalanceAfter = new BN(await web3.eth.getBalance(randWinner));

      //  0.06(prize) - 0.0018(fees) = 0.0582
      assert.equal(0, randWinnerBalanceBefore.sub(gasSpent).add(ether("0.0582")).cmp(randWinnerBalanceAfter), "wrong prize transferred");
    });

    it("should not transferPartnerFee if < than threshold", async() => {
      await game.updateRaffleActivationParticipantsCount(4);

      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);

      //  withdraw
      // console.log("transfer: ", (await game.ongoinRafflePrize.call()).toString());
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      //  3
      await time.increase(2);

      let randNum = await game.rand.call(); //  is the same as will be in raffle
      let randWinner = await game.raffleParticipants.call(randNum);
      await game.runRaffle();

      await time.increase(2);
      let PARTNER_total_before = new BN(await web3.eth.getBalance(PARTNER));

      await game.withdrawRafflePrizes({
        from: randWinner
      });

      let PARTNER_total_after = new BN(await web3.eth.getBalance(PARTNER));
      assert.equal(0, PARTNER_total_before.cmp(PARTNER_total_after), "wrong PARTNER_total_after");
    });

    it("should not transferPartnerFee if > than threshold", async() => {
      await game.updateRaffleActivationParticipantsCount(4);

      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("48.9")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("48.9")
      });

      await time.increase(2);

      //  withdraw
      // console.log("transfer: ", (await game.ongoinRafflePrize.call()).toString());
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      //  3
      await time.increase(2);

      let randNum = await game.rand.call(); //  is the same as will be in raffle
      let randWinner = await game.raffleParticipants.call(randNum);
      await game.runRaffle();

      await time.increase(2);
      let PARTNER_total_before = new BN(await web3.eth.getBalance(PARTNER));

      await game.withdrawRafflePrizes({
        from: randWinner
      });

      let PARTNER_total_after = new BN(await web3.eth.getBalance(PARTNER));
      assert.equal(1, PARTNER_total_after.cmp(PARTNER_total_before), "wrong PARTNER_total_after");
    });

    it("should emit CF_RafflePrizeWithdrawn event", async() => {
      await game.updateRaffleActivationParticipantsCount(4);
      //  1
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1")
      });

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);

      //  2
      await game.createGame(1, CREATOR_2_REFERRAL, {
        from: CREATOR_2,
        value: ether("2")
      });
      await game.joinAndPlayGame(2, OPPONENT_2_REFERRAL, {
        from: OPPONENT_2,
        value: ether("2")
      });

      await time.increase(2);

      //  withdraw
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      await time.increase(2);

      //  3

      let randNum = await game.rand.call(); //  is the same as will be in raffle
      let randWinner = await game.raffleParticipants.call(randNum);
      await game.runRaffle();

      await time.increase(2);

      const { logs } = await game.withdrawRafflePrizes({
        from: randWinner
      });
      assert.equal(1, logs.length, "should be 1 event");
      await expectEvent.inLogs(
        logs, 'CF_RafflePrizeWithdrawn', {
        winner: randWinner,
        prize: ether("0.0582"),
      });
    });
  });
});