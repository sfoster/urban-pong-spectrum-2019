class Game {
  constructor(elem, options = {}) {
    this.elem = elem;
    this.options = options;
    this.turnCount = 0;
    this.scenes = {};
    this.currentScene = null;
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
}
