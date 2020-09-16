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


contract("IGamePausable", (accounts) => {
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
  });

  describe("makeFeeBeneficiar", () => {
    it("should fail if sent 0 on the very first time", async() => {
      await expectRevert(game.makeFeeBeneficiar({
        from: OTHER
      }), "Wrong amount");
    });

    it("should fail if amount sent is less, than latestPrice", async() => {
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("1")
      });

      await expectRevert(game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("0.1")
      }), "Wrong amount");
    });

    it("should increase totalUsedInGame", async () => {
      //  1
      assert.equal(0, (await game.totalUsedInGame.call()).cmp(ether("2")), "totalUsedInGame should be 2 ether");
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("0.11")
      });
      assert.equal(0, (await game.totalUsedInGame.call()).cmp(ether("2.11")), "totalUsedInGame should be 2.11 ether");

      //  2
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("0.21")
      });
      assert.equal(0, (await game.totalUsedInGame.call()).cmp(ether("2.32")), "totalUsedInGame should be 2.32 ether");
    });
    
    it("should set latestBeneficiarPrice = msg.value", async() => {
      assert.equal(0, (await game.latestBeneficiarPrice.call()).cmp(ether("0")), "should be 0 before");
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("1")
      });
      assert.equal(0, (await game.latestBeneficiarPrice.call()).cmp(ether("1")), "should be 1 after");

      //  2
      await game.makeFeeBeneficiar({
        from: OPPONENT,
        value: ether("1.1")
      });
      assert.equal(0, (await game.latestBeneficiarPrice.call()).cmp(ether("1.1")), "should be 1.1 after");
    });
    
    it("should set feeBeneficiar = msg.sender", async() => {
      assert.equal(await game.feeBeneficiar.call(), OWNER, "should be OWNER before");
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("1")
      });
      assert.equal(await game.feeBeneficiar.call(), OTHER, "should be OTHER after");

      //  2
      await game.makeFeeBeneficiar({
        from: OPPONENT,
        value: ether("1.2")
      });
      assert.equal(await game.feeBeneficiar.call(), OPPONENT, "should be OPPONENT after");
    });
    
    it("should set feeBeneficiarPurchasedAt to now", async() => {
      assert.equal(0, (await game.latestBeneficiarPrice.call()).cmp(new BN("0")), "should be 0 before");
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("1")
      });
      assert.equal(0, (await game.feeBeneficiarPurchasedAt.call()).cmp(await time.latest()), "should be 1 after");

      //  2
      await time.increase(3);
      await game.makeFeeBeneficiar({
        from: OPPONENT,
        value: ether("1.1")
      });
      assert.equal(0, (await game.feeBeneficiarPurchasedAt.call()).cmp(await time.latest()), "should be 1.1 after");
    });
  });

  describe("addBeneficiarFee", () => {
    it("should add fee to feeBeneficiar", async() => {
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("0.2")
      });

      assert.equal(0, (await game.feeBeneficiarBalances.call(OTHER)).cmp(ether("0")), "should be 0 before");

      await game.joinGame(1, OPPONENT_REFERRAL, 2, {
        from: OPPONENT,
        value: ether("1")
      });
      await game.quitGame(1, {
        from: CREATOR
      });

      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      assert.equal(0, (await game.feeBeneficiarBalances.call(OTHER)).cmp(ether("0.01")), "should be 0.01 after");
    });
  });
    
  describe("addBeneficiarFee - resetFeeBeneficiarIfExceeded()", () => {
    it("should set feeBeneficiar to owner() if duration exceeded", async() => {
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("0.2")
      });

      //  1
      assert.equal(0, (await game.feeBeneficiarBalances.call(OTHER)).cmp(ether("0")), "should be 0 before - OTHER");

      await game.joinGame(1, OPPONENT_REFERRAL, 2, {
        from: OPPONENT,
        value: ether("1")
      });
      await game.quitGame(1, {
        from: CREATOR
      });
      
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });
      assert.equal(0, (await game.feeBeneficiarBalances.call(OTHER)).cmp(ether("0.01")), "should be 0.01 after - OTHER");

      //  2
      assert.equal(0, (await game.feeBeneficiarBalances.call(OWNER)).cmp(ether("0")), "should be 0 before - OWNER");
      
      await time.increase(time.duration.days(16));
      await game.createGame(CREATOR_REFERRAL, hash, {
        from: CREATOR,
        value: ether("1.2")
      });
      await game.joinGame(2, OPPONENT_REFERRAL, 2, {
        from: OPPONENT,
        value: ether("1.2")
      });
      await game.playMove(2, CREATOR_COIN_SIDE, web3.utils.soliditySha3(CREATOR_SEED), web3.utils.soliditySha3(2, web3.utils.soliditySha3(CREATOR_SEED)), {
        from: CREATOR
      });
      await game.quitGame(2, {
        from: CREATOR
      });
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(2)).winner
      });

      assert.equal(0, (await game.feeBeneficiarBalances.call(OTHER)).cmp(ether("0.01")), "should be 0.01 after 2 - OTHER");
      assert.equal(0, (await game.feeBeneficiarBalances.call(OWNER)).cmp(ether("0.012")), "should be 0.012 after 2 - OWNER");
    });
    
    it("should delete feeBeneficiarPurchasedAt if duration exceeded", async() => {
      //  1
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("0.2")
      });
      assert.equal(0, (await game.feeBeneficiarPurchasedAt.call()).cmp(await time.latest()), "should be as now before");

      //  2
      await time.increase(time.duration.days(16));
      await game.quitGame(1, {
        from: CREATOR
      });
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });
      assert.equal(0, (await game.feeBeneficiarPurchasedAt.call()).cmp(new BN("0")), "should be 0 after");
    });
    
    it("should delete latestBeneficiarPrice if duration exceeded", async() => {
      //  1
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("0.2")
      });
      assert.equal(0, (await game.latestBeneficiarPrice.call()).cmp(ether("0.2")), "should be 0.2 before");

      //  2
      await time.increase(time.duration.days(16));
      await game.quitGame(1, {
        from: CREATOR
      });
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });
      assert.equal(0, (await game.feeBeneficiarPurchasedAt.call()).cmp(ether("0")), "should be 0 after");
    });
  });

  describe("withdrawBeneficiaryFee", () => {
    it("should fail if No fee", async() => {
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("0.2")
      });

      await expectRevert(game.withdrawBeneficiaryFee({
        from: OTHER
      }), "No fee");
  
      await expectRevert(game.withdrawBeneficiaryFee({
        from: OWNER
      }), "No fee");
    });
    
    it("should delete feeBeneficiarBalances[msg.sender]", async() => {
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("0.2")
      });
  
      assert.equal(0, (await game.feeBeneficiarBalances.call(OTHER)).cmp(ether("0")), "should be 0 before");
      await game.joinGame(1, OPPONENT_REFERRAL, 2, {
        from: OPPONENT,
        value: ether("1")
      });
      await game.quitGame(1, {
        from: CREATOR
      });
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });
      assert.equal(0, (await game.feeBeneficiarBalances.call(OTHER)).cmp(ether("0.01")), "should be 0.01 after");

      await game.withdrawBeneficiaryFee({
        from: OTHER
      });
      assert.equal(0, (await game.feeBeneficiarBalances.call(OTHER)).cmp(ether("0")), "should be 0 after withdrawal");
    });
    
    it("should transfer correct amount", async() => {
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("0.2")
      });
  
      await game.joinGame(1, OPPONENT_REFERRAL, 2, {
        from: OPPONENT,
        value: ether("1")
      });
      await game.quitGame(1, {
        from: CREATOR
      });
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(2);
      let OTHERBalanceBefore = new BN(await web3.eth.getBalance(OTHER));

      let tx = await game.withdrawBeneficiaryFee({
        from: OTHER
      });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);
      let OTHERBalanceAfter = new BN(await web3.eth.getBalance(OTHER));
      assert.equal(0, OTHERBalanceBefore.sub(gasSpent).add(ether("0.01")).cmp(OTHERBalanceAfter), "wrong fee transferred");
    });
    
    it("should resetFeeBeneficiarIfExceeded", async() => {
      await game.makeFeeBeneficiar({
        from: OTHER,
        value: ether("0.2")
      });
      
      await game.joinGame(1, OPPONENT_REFERRAL, 2, {
        from: OPPONENT,
        value: ether("1")
      });
      await game.quitGame(1, {
        from: CREATOR
      });
      await game.withdrawGamePrizes(1, {
        from: (await game.games.call(1)).winner
      });

      await time.increase(time.duration.days(16));

      assert.equal(await game.feeBeneficiar.call(), OTHER, "should be OTHER before");
      await game.withdrawBeneficiaryFee({
        from: OTHER
      });
      assert.equal(await game.feeBeneficiar.call(), OWNER, "should be OWNER after");
    });
  });
});