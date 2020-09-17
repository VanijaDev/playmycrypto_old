const Game = artifacts.require("./RockPaperScissorsGame.sol");
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


contract("IExpiryMoveDuration", (accounts) => {
    const OWNER = accounts[0];
    const CREATOR = accounts[1];
    const OPPONENT = accounts[2];
    const CREATOR_REFERRAL = accounts[3];
    const OPPONENT_REFERRAL = accounts[4];
    const PARTNER = accounts[5];
    const CREATOR_2 = accounts[6];
    const CREATOR_2_REFERRAL = accounts[7];
    const OTHER = accounts[9];
    const OPPONENT_2 = accounts[10];

    let game;

    const CREATOR_COIN_SIDE = 1;
    const CREATOR_SEED = "Hello World";
    let hash = web3.utils.soliditySha3(CREATOR_COIN_SIDE, web3.utils.soliditySha3(CREATOR_SEED));

    beforeEach("setup", async () => {
        await time.advanceBlock();
        game = await Game.new(PARTNER);

        // FIRST GAME SHOULD BE CREATED BY OWNER
        await game.createGame(OTHER, hash, {
            from: OWNER,
            value: ether("1")
        });

        //  1
        await game.createGame(CREATOR_REFERRAL, hash, {
            from: CREATOR,
            value: ether("1")
        });

        //  2
        await game.joinGame(1, OPPONENT_REFERRAL, 1, {
            from: OPPONENT,
            value: ether("1")
        });
    });

    describe("updateGameMoveDuration", () => {
        it("should fail if not owner", async () => {
            await expectRevert(game.updateGameMoveDuration(333, {
                from: OTHER
            }), "Ownable: caller is not the owner");
        });

        it("should fail if new duration == 0", async () => {
            await expectRevert(game.updateGameMoveDuration(0), "Should be > 0");
        });

        it("should update gameMoveDuration variable", async () => {
            assert.equal(0, (await game.gameMoveDuration.call()).cmp(time.duration.hours(12)), "gameMoveDuration should be 12 hours before");

            await game.updateGameMoveDuration(time.duration.minutes(6));

            assert.equal(0, (await game.gameMoveDuration.call()).cmp(time.duration.minutes(6)), "gameMoveDuration should be 6 minutes after");
        });
    });

    describe("gameMoveExpired", () => {
        it("should return false if no prevMoveTimestamp", async () => {
            assert.isFalse(await game.gameMoveExpired.call(1), "should be false");
        });

        it("should return false if not yet expired", async () => {
            await time.increase(time.duration.minutes(1));
            assert.isFalse(await game.gameMoveExpired.call(1), "should be false");
        });

        it("should return true if move is already expired", async () => {
            await time.increase(time.duration.hours(16));
            assert.isTrue(await game.gameMoveExpired.call(1), "should be true");
        });
    });

    describe("finishExpiredGame", () => {
        it("should fail if Wrong state", async () => {
            await game.quitGame(1, {
                from: CREATOR
            });

            await time.increase(time.duration.hours(14));

            await expectRevert(game.finishExpiredGame(1, {
                from: OPPONENT
            }), "Wrong state");

            await expectRevert(game.finishExpiredGame(1, {
                from: CREATOR
            }), "Wrong state");
        });

        it("should fail if not yet expired", async () => {
            await time.increase(time.duration.minutes(2));

            await expectRevert(game.finishExpiredGame(1, {
                from: CREATOR
            }), "Not yet expired");
        });

        it("should fail if wrong claimer", async () => {
            await time.increase(time.duration.hours(14));

            await expectRevert(game.finishExpiredGame(1, {
                from: OTHER
            }), "Wrong claimer");
            
            await expectRevert(game.finishExpiredGame(1, {
                from: CREATOR
            }), "Wrong claimer");

            await game.finishExpiredGame(1, {
                from: OPPONENT
            });
        });

        it("should set winner to claimer", async () => {
            assert.equal((await game.games.call(1)).winner, "0x0000000000000000000000000000000000000000", "should be no winner before");

            await time.increase(time.duration.hours(14));
            await game.finishExpiredGame(1, {
                from: OPPONENT
            });

            assert.equal((await game.games.call(1)).winner, OPPONENT, "wrong winner after claim, should be OPPONENT");
        });

        it("should set game state to GameState.Expired", async () => {
            await time.increase(time.duration.hours(14));
            await game.finishExpiredGame(1, {
                from: OPPONENT
            });

            assert.equal(0, (await game.games.call(1)).state.cmp(new BN("5")), "state should be Expired");
        });

        it("should call finishGame - emit GameFinished event", async () => {
            // event GameFinished(uint256 indexed id, address indexed winner, uint256 bet);
            await time.increase(time.duration.hours(14));

            let tx = await game.finishExpiredGame(1, {
                from: OPPONENT
            });
            assert.equal(1, tx.logs.length, "should be 1 log");
            let event = tx.logs[0];
            assert.equal(event.event, "RPS_GameFinished", "should be RPS_GameFinished");
        });
    });
});