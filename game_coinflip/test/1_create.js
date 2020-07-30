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



contract("Create game", (accounts) => {
  const OWNER = accounts[0];
  const CREATOR = accounts[1];
  const OPPONENT = accounts[2];
  const CREATOR_REFERRAL = accounts[3];
  const OPPONENT_REFERRAL = accounts[4];
  const PARTNER = accounts[5];
  const CREATOR_2 = accounts[6];
  const OTHER = accounts[9];

  let game;

  beforeEach("setup", async () => {
    await time.advanceBlock();
    game = await Game.new(PARTNER);

    // FIRST GAME SHOULD BE CREATED BY OWNER
    await game.createGame(1, CREATOR_REFERRAL, {
      from: OWNER,
      value: ether("1", ether)
    });
  });

  describe("Create game", () => {
    it("should fail if paused", async () => {
      await game.pause();

      await expectRevert(game.createGame(1, CREATOR_REFERRAL, {
        from: CREATOR,
        value: ether("1", ether)
      }), "paused");
    });

    it("should fail if creator has already created game", async () => {
      //  1 - create
      await game.createGame(1, CREATOR_REFERRAL, {
        from: CREATOR,
        value: ether("1", ether)
      });

      //  2
      await expectRevert(game.createGame(1, CREATOR_REFERRAL, {
        from: CREATOR,
        value: ether("1", ether)
      }), "No more creating");
    });

    it("should fail if less, than min bet", async () => {
      await expectRevert(game.createGame(1, CREATOR_REFERRAL, {
        from: CREATOR,
        value: 0
      }), "Wrong bet");
    });

    it("should fail if guessCoinSide > 1", async () => {
      await expectRevert(game.createGame(2, CREATOR_REFERRAL, {
        from: CREATOR,
        value: ether("1", ether)
      }), "Wrong guess coin side");

      await expectRevert(game.createGame(3, CREATOR_REFERRAL, {
        from: CREATOR,
        value: ether("1", ether)
      }), "Wrong guess coin side");
    });

    it("should fail if creatorReferral == msg.sender", async () => {
      await expectRevert(game.createGame(1, CREATOR, {
        from: CREATOR,
        value: ether("1", ether)
      }), "Wrong referral");
    });

    it("should increase addressBetTotal for sender", async () => {
      //  1
      let prev = await game.addressBetTotal.call(CREATOR);

      await game.createGame(1, CREATOR_REFERRAL, {
        from: CREATOR,
        value: ether("1")
      });

      assert.equal(0, (await game.addressBetTotal.call(CREATOR)).sub(prev).cmp(ether("1")), "wrong addressBetTotal 1");

      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1", ether)
      });

      //  2
      await game.createGame(1, CREATOR_REFERRAL, {
        from: CREATOR,
        value: ether("0.1")
      });

      assert.equal(0, (await game.addressBetTotal.call(CREATOR)).sub(prev).cmp(ether("1.1")), "wrong addressBetTotal 2");
    });

    it("should create new game with correct params", async () => {
      await game.createGame(1, CREATOR_REFERRAL, {
        from: CREATOR,
        value: ether("1", ether)
      });

      let gameObj = await game.games.call(1);
      assert.equal(0, gameObj.id.cmp(new BN(1)), "wrong id");
      assert.equal(gameObj.creator, CREATOR, "wrong creator");
      assert.equal(0, gameObj.bet.cmp(ether("1", ether)), "wrong bet");
      assert.equal(gameObj.creatorGuessCoinSide, 1, "wrong creatorGuessCoinSide");
      assert.equal(gameObj.creatorReferral, CREATOR_REFERRAL, "wrong creatorReferral");
      assert.equal(gameObj.opponent, 0x0, "wrong opponent");
      assert.equal(gameObj.winner, 0x0, "wrong winner");
      assert.equal(gameObj.opponentReferral, 0x0, "wrong opponentReferral");
    });

    it("should keep creatorReferral as address(0) if no referral param provided", async () => {
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: CREATOR,
        value: ether("1", ether)
      });

      let gameObj = await game.games.call(1);
      assert.equal(gameObj.creatorReferral, "0x0000000000000000000000000000000000000000", "wrong creatorReferral, should be 0x0");
    });

    it("should update ongoingGameIdxForCreator for creator", async () => {
      //  1 - CREATOR_2      
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: CREATOR_2,
        value: ether("1", ether)
      });
      assert.equal(0, (await game.ongoingGameIdxForCreator.call(CREATOR_2)).cmp(new BN(1)), "should be 1");

      //  2 - CREATOR
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: CREATOR,
        value: ether("1", ether)
      });
      assert.equal(0, (await game.ongoingGameIdxForCreator.call(CREATOR)).cmp(new BN(2)), "should be 2");
    });

    it("should update participatedGameIdxsForPlayer for creator", async () => {
      //  1 - CREATOR      
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: CREATOR,
        value: ether("1", ether)
      });
      assert.equal((await game.getParticipatedGameIdxsForPlayer.call(CREATOR)).length, 1, "whong length after 1");
      assert.equal(0, ((await game.getParticipatedGameIdxsForPlayer.call(CREATOR))[0]).cmp(new BN(1)), "should be 1");

      //  2 - CREATOR_2
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: CREATOR_2,
        value: ether("1", ether)
      });
      assert.equal((await game.getParticipatedGameIdxsForPlayer.call(CREATOR_2)).length, 1, "whong length after 2");
      assert.equal(0, ((await game.getParticipatedGameIdxsForPlayer.call(CREATOR_2))[0]).cmp(new BN(2)), "should be 2");

      //  3 - CREATOR
      await game.joinAndPlayGame(1, OPPONENT_REFERRAL, {
        from: OPPONENT,
        value: ether("1", ether)
      });
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: CREATOR,
        value: ether("1", ether)
      });
      assert.equal((await game.getParticipatedGameIdxsForPlayer.call(CREATOR)).length, 2, "whong length after 3");
      assert.equal(0, ((await game.getParticipatedGameIdxsForPlayer.call(CREATOR))[0]).cmp(new BN(1)), "should be 1 after 3");
      assert.equal(0, ((await game.getParticipatedGameIdxsForPlayer.call(CREATOR))[1]).cmp(new BN(3)), "should be 3 after 3");
    });

    it("should increase totalUsedInGame", async () => {
      //  1 - CREATOR      
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: CREATOR,
        value: ether("1")
      });
      assert.equal(0, (await game.totalUsedInGame.call()).cmp(ether("2")), "totalUsedInGame should be 2 ether");

      //  2 - CREATOR_2
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: CREATOR_2,
        value: ether("1", ether)
      });
      assert.equal(0, (await game.totalUsedInGame.call()).cmp(ether("3")), "totalUsedInGame should be 3 ether");

      //  3 - OTHER
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: OTHER,
        value: ether("1", ether)
      });
      assert.equal(0, (await game.totalUsedInGame.call()).cmp(ether("4")), "totalUsedInGame should be 4 ether");
    });

    it("should emit GameCreated event", async () => {
      // event GameCreated(uint256 indexed _id, address indexed creator, uint256 bet);

      //  1
      let tx = await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: CREATOR,
        value: ether("1", ether)
      });
      // console.log(tx);

      assert.equal(1, tx.logs.length, "should be 1 log");
      let event = tx.logs[0];
      assert.equal(event.event, "CF_GameCreated", "should be CF_GameCreated");
      assert.equal(0, event.args.id.cmp(new BN(1)), "should be 1");
      assert.equal(event.args.creator, CREATOR, "should be CREATOR");
      assert.equal(0, event.args.bet.cmp(ether("1", ether)), "should be 1 ETH");

      //  2
      let tx_2 = await game.createGame(1, OTHER, {
        from: CREATOR_2,
        value: ether("0.5", ether)
      });
      // console.log(tx_2);

      assert.equal(1, tx_2.logs.length, "should be 1 log");
      let event_2 = tx_2.logs[0];
      assert.equal(event_2.event, "CF_GameCreated", "should be CF_GameCreated");
      assert.equal(0, event_2.args.id.cmp(new BN(2)), "should be 2");
      assert.equal(event_2.args.creator, CREATOR_2, "should be CREATOR_2");
      assert.equal(0, event_2.args.bet.cmp(ether("0.5", ether)), "should be 0.5 ETH");
    });

    it("should increase gamesCreatedAmount", async () => {
      //  1 - CREATOR      
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: CREATOR,
        value: ether("1", ether)
      });
      assert.equal(0, (await game.gamesCreatedAmount.call()).cmp(new BN(2)), "should be 2");

      //  2 - CREATOR_2
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: CREATOR_2,
        value: ether("1", ether)
      });
      assert.equal(0, (await game.gamesCreatedAmount.call()).cmp(new BN(3)), "should be 3");

      //  3 - OTHER
      await game.createGame(1, "0x0000000000000000000000000000000000000000", {
        from: OTHER,
        value: ether("1", ether)
      });
      assert.equal(0, (await game.gamesCreatedAmount.call()).cmp(new BN(4)), "should be 4");
    });
  });
});