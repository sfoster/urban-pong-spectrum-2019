class Game {
  constructor(elem, options = {}) {
    this.elem = elem || document.body;
    this.options = options;
    this.turnCount = 0;
    this.scenes = {};
    this.currentScene = null;
    this.messageElem = null;
  }
  registerScene(name, scene) {
    this.scenes[name] = scene;
  }
  switchScene(name, sceneParams = {}) {
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
    this.currentScene.enter(sceneParams);
  }
  showNotification(message) {
    let elem = this.elem.querySelector("#notification");
    elem.querySelector(".message-body").textContent = message;
    elem.classList.remove("hidden");
    if (!this.messageElem) {
      this.messageElem = elem;
      this.messageElem.addEventListener("click", this);
    }
  }
  handleEvent(event) {
    if (event.type == "click" && event.target == this.messageElem) {
      this.messageElem.classList.add("hidden");
    }
  }
}
