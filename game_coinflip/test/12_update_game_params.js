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



contract("Update game params", (accounts) => {
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

  describe("update min bet", () => {
    it("should fail if not owner", async () => {
      await expectRevert(game.updateMinBet(10, {
        from: OTHER
      }), "Ownable: caller is not the owner");
    });

    it("should fail if 0", async () => {
      await expectRevert(game.updateMinBet(0), "Wrong bet");
    });

    it("should update correctly", async () => {
      await game.updateMinBet(ether("0.005"));

      assert.equal(0, (await game.minBet.call()).cmp(ether("0.005")), "wrong min bet value after update");
    });
  });

  describe("updateSuspendedTimeDuration", async () => {
    it("should fail if not owner ", async () => {
      await expectRevert(game.updateSuspendedTimeDuration(time.duration.hours(2), {
        from: CREATOR
      }), "Ownable: caller is not the owner");
    });

    it("should update time", async () => {
      assert.equal(0, (await game.suspendedTimeDuration.call()).cmp(time.duration.hours(1)), "wrong time before");
      await game.updateSuspendedTimeDuration(time.duration.hours(2));
      assert.equal(0, (await game.suspendedTimeDuration.call()).cmp(time.duration.hours(2)), "wrong time after");
    });
  });

  describe("increaseBetForGameBy", () => {
    beforeEach("create game", async () => {
      await game.createGame(1, CREATOR_REFERRAL, {
        from: CREATOR,
        value: ether("0.1", ether)
      });
    });

    it("should fail if paused", async () => {
        await game.pause();

        await expectRevert(game.increaseBetForGameBy(1, {
            from: CREATOR,
            value: ether("0.1")
        }), "paused");
    });

    it("should fail if not game creator", async () => {
        await expectRevert(game.increaseBetForGameBy(1, {
            from: OTHER,
            value: ether("0.1")
        }), "Not creator");
    });

    it("should fail if game bet is 0", async () => {
        await expectRevert(game.increaseBetForGameBy(1, {
            from: CREATOR,
        }), "increase must be > 0");
    });

    it("should increase addressBetTotal[msg.sender]", async() => {
      let prev = await game.addressBetTotal.call(CREATOR);

      await game.increaseBetForGameBy(1, {
        from: CREATOR,
        value: ether("0.1")
      });

      assert.equal(0, (await game.addressBetTotal.call(CREATOR)).sub(prev).cmp(ether("0.1")), "wrong addressBetTotal");
    });

    it("should increase bet for game", async () => {
        //  1
        await game.increaseBetForGameBy(1, {
            from: CREATOR,
            value: ether("0.1")
        });
        assert.equal(0, (await game.games.call(1)).bet.cmp(ether("0.2")), "wrong bet after update 1");

        //  2
        await game.increaseBetForGameBy(1, {
            from: CREATOR,
            value: ether("0.2")
        });
        assert.equal(0, (await game.games.call(1)).bet.cmp(ether("0.4")), "wrong bet after update 2");

        //  3
        await game.increaseBetForGameBy(1, {
            from: CREATOR,
            value: ether("0.002")
        });
        assert.equal(0, (await game.games.call(1)).bet.cmp(ether("0.402")), "wrong bet after update 3");
    });

    it("should update totalUsedInGame", async() => {
      let totalUsedInGameBefore = await game.totalUsedInGame.call();

      await game.increaseBetForGameBy(1, {
        from: CREATOR,
        value: ether("0.15")
      });

      let totalUsedInGameAfter = await game.totalUsedInGame.call();

      assert.equal(0, totalUsedInGameAfter.sub(totalUsedInGameBefore).cmp(ether("0.15")), "wrong difference");
    });

    it("should emit CF_GameUpdated with correct args", async () => {
        let tx = await game.increaseBetForGameBy(1, {
            from: CREATOR,
            value: ether("0.2")
        });
        assert.equal(1, tx.logs.length, "should be 1 log");
        let event = tx.logs[0];
        assert.equal(event.event, "CF_GameUpdated", "should be CF_GameUpdated");
        assert.equal(0, event.args.id.cmp(new BN("1")), "should be 1");
        assert.equal(event.args.creator, CREATOR, "should be CREATOR");
    });
  });
});