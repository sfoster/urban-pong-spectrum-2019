class Scene {
  constructor(elem, options={}) {
    this.elem = elem;
    this.id = this.elem.dataset.id = options.id;
    this.client = options.client;
    delete options.client;
    this.game = options.game;
    delete options.game;
    this.player = options.player;
    delete options.player;
    this.options = options;
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
    document.body.dataset.scene = this.id;
    console.log("Entering scene: ", this.id, this);
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
    this.listen("playerstatus");
    this.client.pollForStatus(this.player);
    console.log("Enter WaitingForOpponentScene");
  }
  onPlayerstatus(event) {
    let data = event.detail;
    if (data.State == "PLAY") {
      this.game.turnCount = data.CurrentRound;
      console.log("onPlayerstatus, switching to play state: ", data);
      this.client.stopPollingForStatus();
      this.game.switchScene("colorpicker");
    }
  }
}

class ColorPickerScene extends Scene {
  constructor(elem, options) {
    super(elem, options);
  }
  enter() {
    super.enter();
    console.log("Enter ColorPickerScene");

    let containerNode = this.elem.querySelector(".body");
    let dims = containerNode.getBoundingClientRect();
    this.colorPicker = new ColorPicker(null, {
      containerNode,
      incrementDegrees: 3,
      radius: dims.width / 2 - 20,
    });
    this.colorPicker.render();

    this.elem.addEventListener("click", this);
    this.elem.addEventListener("colorchange", this);
  }
  exit() {
    this.colorSent = null;
    super.exit();
    this.elem.removeEventListener("click", this);
    this.elem.removeEventListener("colorchange", this);
  }
  onClick(event) {
    if (event.target.classList.contains("tile")) {
      this.colorPicker.attachTo(event.target);
    }
  }
  onColorchange(event) {
    let hue = event.detail.hue;
    console.log("colorchange to hue: %s", hue, event.detail);
    let tile = this.colorPicker.clickTarget;
    tile.style.backgroundColor = event.detail.cssColor;
    tile.classList.remove("needscolor");
    this.colorPicker.detach();
  }
  sendColor(rgb) {
    if (!this.colorSent) {
      this.colorSent = rgb;
      // this.client.sendPulseMessage(this.player, [rgb, rgb, rgb, rgb, rgb, rgb]);
      // wait for the status message that says the round is incremented
      // this.waitForTurnEnd();
    }
  }
  waitForTurnEnd() {
    for (let btn of this.elem.querySelectorAll("button")) {
      btn.disabled = true;
    }
    this.elem.classList.add("waiting");
  }
}

class WelcomeScene extends Scene {
  enter() {
    super.enter();
    console.log("Enter WelcomeScene");
  }
  playAs(position) {
    let game = this.game;
    let client = this.client;
    game.player.position = position;

    client.sendJoinMessage(game.player).then(resp => {
      console.log("Got join response: ", resp);
      game.switchScene("waitingforopponent");
    });
  }
}

class GameOverScene extends Scene {
  enter() {
    super.enter();
    console.log("Enter GameOverScene");
  }
  renderResult(colors) {
    let container = document.getElementById("tiles");
    container.innerHTML = "";
    let frag = document.createDocumentFragment();
    for (let rgb of colors) {
      let tile = document.createElement("div");
      tile.classList.add("colortile");
      tile.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      frag.appendChild(tile);
    }
    container.appendChild(frag);
  }
}
