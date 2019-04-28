class Game {
  constructor(elem, options) {
    this.turnCount = 0;
    this.maxTurns = 5;
    this.scenes = {};
    this.currentScene = null;
    this.player = {};
  }
  registerScene(name, scene) {
    this.scenes[name] = scene;
  }
  switchScene(name) {
    if (this.previousScene) {
      this.previousScene.elem.classList.remove("previous");
      this.previousScene = null;
    }
    if (this.currentScene) {
      if (this.currentScene.id.startsWith("waiting")) {
        this.previousScene = this.currentScene;
      }
      this.currentScene.elem.classList.remove("current");
      this.currentScene.exit();
    }
    if (this.previousScene) {
      this.previousScene.elem.classList.add("previous");
    }
    this.currentScene = this.scenes[name];
    this.currentScene.enter();
  }
  start() {
    // auto-mode to cycle through the states
    game.switchScene("welcome");
    // loading screen is the initial scene
    // send join request
    // switch to lobby on good response
    setTimeout(function() {
      this.player.position = "north";
      this.enterLobby();
    }.bind(this), 2000);
  }
  enterLobby() {
    console.log("enterLobby");
    this.switchScene("waitingforopponent");
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
