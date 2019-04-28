class Game {
  constructor(elem, options) {
    this.turnCount = 0;
    this.maxTurns = 2;
    this.scenes = {};
    this.currentScene = null;
    this.player = {

    }
  }
  registerScene(name, scene) {
    this.scenes[name] = scene;
  }
  switchScene(name) {
    if (this.currentScene) {
      this.currentScene.exit();
    }
    this.currentScene = this.scenes[name];
    this.currentScene.enter();
  }
  start() {
    game.switchScene("welcome");
    // loading screen is the initial scene
    // send join request
    // switch to lobby on good response
    setTimeout(this.enterLobby.bind(this), 2000);
  }
  handleEvent() {
  }
  enterLobby() {
    console.log("enterLobby");
    this.switchScene("waiting");
    setTimeout(this.turn.bind(this), 1000);
  }
  turn() {
    console.log("start turn");
    this.switchScene("colorpicker");
    setTimeout(function() {
      this.turnCount++;
      if (this.turnCount >= this.maxTurns) {
        this.endGame();
      } else {
        this.endTurn();
      }
    }.bind(this), 2000);
  }
  endTurn() {
    console.log("end turn");
    this.switchScene("waiting");
    setTimeout(this.turn.bind(this), 400);
  }
  endGame() {
    this.switchScene("gameover");
    console.log("GAME OVER");
  }
}
