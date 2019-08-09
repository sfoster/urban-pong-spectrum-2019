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

class ColorPickerScene extends Scene {
  constructor(elem, options) {
    super(elem, options);
    this.pickedColors = new Array(options.colorCount);
    this.strings = {
      colorsNeededButtonText: "Pick some colors next",
      colorsPickedButtonText: "Send!",
    }
  }
  enter() {
    super.enter();
    console.log("Enter ColorPickerScene");

    this.buttonNode = this.elem.querySelector("button.primary");
    this.buttonNode.disabled = true;

    let containerNode = this.elem.querySelector(".body");
    let dims = containerNode.getBoundingClientRect();
    this.colorPicker = new ColorPicker(null, {
      containerNode,
      incrementDegrees: 3,
      radius: dims.width / 2 - 20,
    });
    this.colorPicker.render();

    this.elem.addEventListener("click", this);
    this.elem.addEventListener("colorpicked", this);

    for(let tileIndex = 0; tileIndex < this.options.colorCount; tileIndex++) {
      if (this.pickedColors[tileIndex]) {
        this.applyColorToTileAtIndex(tileIndex, this.pickedColors[tileIndex]);
      }
    }
  }
  exit() {
    this.colorSent = null;
    // this.pickedColors = new Array(options.colorCount);
    super.exit();
    this.elem.removeEventListener("click", this);
    this.elem.removeEventListener("colorpicked", this);
  }
  onClick(event) {
    if (event.target.classList.contains("tile")) {
      this.colorPicker.attachTo(event.target);
    }
    if (event.target.classList.contains("tile")) {
      this.colorPicker.attachTo(event.target);
    }
  }
  onColorpicked(event) {
    console.log("colorpicked event from target", event.target);
    console.log("colorpicked to hue: %s, rgb: %o", event.detail.hue, event.detail.rgb);
    let tile = event.target;
    let tileIndex = Array.from(this.elem.querySelectorAll(".tile")).indexOf(tile);
    if (tileIndex < 0 || tileIndex >= this.options.colorCount) {
      console.warn("Unexpected tile index: " + tileIndex);
      return;
    }
    this.applyColorToTileAtIndex(tileIndex, event.detail.rgb);
  }
  updateButton(ready) {
    if (ready) {
      console.log("Colors picked", this.pickedColors);
      this.buttonNode.textContent = this.strings.colorsPickedButtonText;
      this.buttonNode.disabled = false;
    } else {
      console.log("Colors still needed in", this.pickedColors);
      this.buttonNode.textContent = this.strings.colorsNeededButtonText;
      this.buttonNode.disabled = true;
    }
  }
  applyColorToTileAtIndex(tileIndex, rgbColor="") {
    let cssColor = `rgb(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]})`;
    let tile = this.elem.querySelectorAll(".tile")[tileIndex];
    tile.style.backgroundColor = cssColor;
    tile.classList.remove("needscolor");

    this.pickedColors[tileIndex] = rgbColor;

    let missingColor = false;
    for (let i = 0; i < this.pickedColors.length; i++) {
      if (!this.pickedColors[i]) {
        missingColor = true;
        break;
      }
    }
    this.updateButton(!missingColor);
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
  play() {
    let game = this.game;
    let client = this.client;

    client.joinQueue().then(resp => {
      console.log("Got join response: ", resp);
      game.switchScene("colorpicker");
    }).catch(ex => {
      console.warn("joinQueue failed: ", ex);
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
