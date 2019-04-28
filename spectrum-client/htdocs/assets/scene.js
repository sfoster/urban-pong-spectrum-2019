class Scene {
  constructor(elem, options={}) {
    this.elem = elem;
    this.id = this.elem.dataset.id = options.id;
    this.options = Object.assign({}, options);
    this._topics = new Set();
  }
  listen(name) {
    if (this._topics.has(name)) {
      return;
    }
    this._topics.add(name);
    document.addEventListener(name, this);
  }
  removeListener(name) {
    this._topics.delete(name);
    document.removeEventListener(name, this);
  }
  enter() {
    this.elem.addEventListener("click", this);
    this.elem.classList.remove("hidden");
    document.body.dataset.scene = this.options.id;
    console.log("Entering scene: ", this.options.id, this);
  }
  exit() {
    for (let topic of this._topics){
      this.removeListener(topic);
    }
    this.elem.classList.add("hidden");
  }
  handleEvent(event) {
    let mname = 'on'+event.type[0].toUpperCase()+event.type.substring(1);
    if (typeof this[mname] == 'function') {
      this[mname].call(this, event);
    }
  }
}

class WaitingForOpponentScene extends Scene {
  enter() {
    super.enter();
    console.log("Enter WaitingForOpponentScene");
  }
}

class WelcomeScene extends Scene {
  enter() {
    super.enter();
    console.log("Enter WelcomeScene");
  }
  playAs(position) {
    let game = this.options.game;
    let client = this.options.client;
    game.player.position = position;

    client.sendJoinMessage(game.player).then(resp => {
      console.log("Got join response: ", resp);
      game.switchScene("waiting");
    });
  }
}
