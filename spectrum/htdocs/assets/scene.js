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
    this.pickedColors = new Array(options.colorCount * 3);
    this.strings = {
      colorsNeededButtonText: "Pick some colors next",
      colorsPickedButtonText: "Send!",
    }
  }
  enter() {
    super.enter();
    console.log("Enter ColorPickerScene");
    this.elem.classList.remove("disabled");

    // initialize the tiles
    let containerNode = this.pickerContainer = this.elem.querySelector(".body");
    let dims = containerNode.getBoundingClientRect();
    this.colorPicker = new ColorPicker(null, {
      containerNode,
      incrementDegrees: 3,
      radius: dims.width / 2 - 20,
    });
    this.elem.addEventListener("colorpickershow", this);
    this.elem.addEventListener("colorpickerhide", this);

    this.colorPicker.render();

    this.elem.addEventListener("click", this);
    this.elem.addEventListener("colorpicked", this);

    // set userTile colors. NB stride of 3
    for(let tileIndex = 0; tileIndex < this.options.colorCount; tileIndex+=3) {
      if (this.pickedColors[tileIndex]) {
        this.applyColorToTileAtIndex(tileIndex, this.pickedColors[tileIndex]);
      }
    }
    this.updateTilegroups();
    // start the heartbeat requests
    this.client.toggleHeartbeat();
    let heartbeatResponseTopic = "clientHeartbeat";
    let heartbeatErrorTopic = "clientHeartbeatError";
    this.listen(heartbeatResponseTopic);
    this.listen(heartbeatErrorTopic);
  }
  exit() {
    this.colorSent = null;
    super.exit();
    this.elem.removeEventListener("click", this);
    this.elem.removeEventListener("colorpicked", this);
  }
  updateTilegroups() {
    let enabledGroup;
    let firstUncoloredTile;

    for (let groupElem of this.elem.querySelectorAll(".tilegroup")) {
      let uncoloredTile = groupElem.querySelector(".tile.needscolor");
      if (!firstUncoloredTile && uncoloredTile) {
        firstUncoloredTile = uncoloredTile;
        enabledGroup = firstUncoloredTile.parentNode;
      }
      if (!uncoloredTile) {
        groupElem.classList.add("complete");
      }
      if (groupElem == enabledGroup) {
        groupElem.classList.remove("disabled");
      } else {
        groupElem.classList.add("disabled");
      }
    }
  }
  onClick(event) {
    // TODO: maybe prevent re-selecting colors with .tile:not(.needscolor)
    if (
      event.target.classList.contains("tile") &&
      !event.target.closest(".disabled")
    ) {
      this.colorPicker.attachTo(event.target);
    }
  }
  onClientHeartbeat(event) {
    let colors = event.detail.colors;
    if (colors) {
      let stride = this.options.colorCount;
      console.log("client heartbeat, colors:", colors);
      let activeGroup = this.elem.querySelector(".tilegroup:not(.disabled)");
      if (!activeGroup) {
        console.warn("onClientHeartbeat, got colors but there is not active tilegroup");
        return;
      }
      let tiles = activeGroup.querySelectorAll(".tile");
      let startIndex = parseInt(tiles[0].dataset.index);
      console.log("onClientHeartbeat, apply color to tiles: ", tiles);
      for (let i=1; i<colors.length; i++) {
        this.applyColorToTileAtIndex(startIndex + i, colors[i]);
      }
      this.updateTilegroups();

    }
  }
  onClientHeartError(event) {
    console.warn("client heartbeat, ex:", event.detail);
  }
  onColorpickershow() {
    this.pickerContainer.classList.add("active");
  }
  onColorpickerhide() {
    this.pickerContainer.classList.remove("active");
  }
  onColorpicked(event) {
    console.log("colorpicked event from target", event.target);
    console.log("colorpicked to hue: %s, rgb: %o", event.detail.hue, event.detail.rgb);
    let tile = event.target;
    let tileIndex = Array.from(this.elem.querySelectorAll(".tile")).indexOf(tile);
    // we have 3 tiles for each of the colorCount;
    if (tileIndex < 0 || tileIndex >= this.options.colorCount * 3) {
      console.warn("Unexpected tile index: " + tileIndex);
      return;
    }
    this.applyColorToTileAtIndex(tileIndex, event.detail.rgb);
    this.game.client.sendColor(event.detail.rgb);
  }
  applyColorToTileAtIndex(tileIndex, rgbColor="") {
    let cssColor = `rgb(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]})`;
    let tile = this.elem.querySelectorAll(".tile")[tileIndex];
    console.log("apply color: ", tile, tileIndex, rgbColor);
    tile.style.backgroundColor = cssColor;
    tile.classList.remove("needscolor");

    this.pickedColors[tileIndex] = rgbColor;

    let colorIndex;
    let colorsComplete = true;
    for (colorIndex=0; colorIndex<this.options.colorCount * 3; colorIndex++) {
      if (!Array.isArray(this.pickedColors[colorIndex])) {
        colorsComplete = false;
        break;
      }
    }
    colorsComplete &= (colorIndex == this.options.colorCount * 3);
    if (colorsComplete) {
      console.info("Colors complete: ", this.pickedColors);
      this.game.resultColors = this.pickedColors;
      this.elem.classList.add("disabled"); // switch after a second but disable everything meantime
      this.game.switchScene("gameover");
    }
  }
  sendColor(rgb) {
    if (!this.colorSent) {
      this.colorSent = rgb;
      // this.client.sendPulseMessage(this.player, [rgb, rgb, rgb, rgb, rgb, rgb]);
      // wait for the status message that says the round is incremented
      // this.waitForTurnEnd();
    }
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
    this.targetImage = this.elem.querySelector(".outputImage");
    this.loadInputImage("./assets/circle-grid9.svg").then(svgDocument => {
      this.svgImageDocument = svgDocument;
      this.renderResult(this.game.resultColors);
    }).catch(ex => {
      console.warn("GameOverScene enter, failed to load result svg image");
    });
  }
  loadInputImage(src) {
    console.log("Using image: ", src);
    return fetch(src).then(resp => {
      return resp.text();
    }).then(content => {
      let parser = new DOMParser();
      return parser.parseFromString(content.toString(), "image/svg+xml");
    });
  }

  renderResult(colorsValues) {
    let cssColorValues = colorsValues.map(rgbArray => `rgb(${rgbArray[0]}, ${rgbArray[1]}, ${rgbArray[2]})`);
    console.log("got cssColorValues: ", cssColorValues);
    function replaceColorsInDocument(doc, colors = [], shapeSelector = "circle") {
      Array.from(doc.querySelectorAll(shapeSelector)).forEach((elem, idx) => {
        let color = colors[idx % colors.length];
        elem.setAttribute("fill", color);
      });
      return doc;
    }

    function renderImageOutput(outputDocument, outputImg) {
      let svgString = outputDocument.documentElement.outerHTML;
      let dataURI = "data:image/svg+xml;base64," +  btoa(svgString);
      outputImg.src = dataURI;
    }

    replaceColorsInDocument(this.svgImageDocument, cssColorValues);
    renderImageOutput(this.svgImageDocument, this.targetImage);

  }
}
