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
    this._active = false;
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
    this._active = true;
    this.elem.addEventListener("click", this);
    this.elem.classList.remove("hidden");
    document.body.dataset.scene = this.id;
    console.log("Entering scene: ", this.id, this);
  }
  exit() {
    this._active = false;
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
    this.colorCount = options.colorCount;
    this.pickedColors = new Array(options.colorCount);
    this.strings = {
      colorsNeededButtonText: "Pick some colors next",
      colorNeededButtonText: "One more color",
      colorsPickedButtonText: "Send!",
    }
  }
  get colorsRemaining() {
    return this.pickedColors.reduce((result, item) => {
      return Array.isArray(item) ? result - 1 : result;
    }, this.colorCount);
  }

  enter() {
    super.enter();
    console.log("Enter ColorPickerScene");
    this.elem.classList.remove("disabled");

    // initialize the tiles
    let containerNode = this.pickerContainer = this.elem.querySelector(".body > .body-upper");
    let dims = containerNode.getBoundingClientRect();
    this.colorPicker = new ColorPicker(null, {
      containerNode,
      incrementDegrees: 3,
      radius: dims.width / 2,
    });
    this.sendButton = this.elem.querySelector("button");
    this.elem.addEventListener("colorpickershow", this);
    this.elem.addEventListener("colorpickerhide", this);

    this.colorPicker.render();

    this.elem.addEventListener("click", this);
    this.elem.addEventListener("colorpicked", this);

    for(let tileIndex = 0; tileIndex < this.options.colorCount; tileIndex++) {
      if (this.pickedColors[tileIndex]) {
        this.applyColorToTileAtIndex(tileIndex, this.pickedColors[tileIndex]);
      }
    }
    this.updateAndRender();
    // start the heartbeat requests
    this.client.toggleHeartbeat(true);
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
  updateAndRender() {
    let unpickedCount = this.colorsRemaining;
    this.sendButton.disabled = !!unpickedCount;
    switch (unpickedCount) {
      case 0:
        this.sendButton.textContent = this.strings.colorsPickedButtonText;
        break;
      case 1:
        this.sendButton.textContent = this.strings.colorNeededButtonText;
        break;
      default:
        this.sendButton.textContent = this.strings.colorsNeededButtonText;
        break;
    }
    let groupElem = this.elem.querySelector(".tilegroup")
    let uncoloredTile = groupElem.querySelector(".tile.needscolor");
    if (!uncoloredTile) {
      groupElem.classList.add("complete");
    }
  }
  onClick(event) {
    if (
      event.target.classList.contains("tile") &&
      !event.target.closest(".disabled")
    ) {
      this.colorPicker.attachTo(event.target);
    }
    if (event.target == this.sendButton) {
      this.sendColors(this.pickedColors);
    }
  }
  onClientHeartbeat(event) {
    if (!this._active) {
      return;
    }
    let colors = event.detail.colors;
    if (colors) {
      console.log("client heartbeat, colors:", colors);
      let tileGroup = this.elem.querySelector(".tilegroup:not(.disabled)");
      if (!tileGroup) {
        console.warn("onClientHeartbeat, got colors but there is not active tilegroup");
        return;
      }
      let tiles = tileGroup.querySelectorAll(".tile");
      let startIndex = parseInt(tiles[0].dataset.index);
      console.log("onClientHeartbeat, apply color to tiles: ", tiles);
      for (let i=1; i<colors.length; i++) {
        this.applyColorToTileAtIndex(startIndex + i, colors[i]);
      }
      this.updateAndRender();

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
    // we have {colorCount + 1} tiles
    if (tileIndex < 0 || tileIndex > this.options.colorCount) {
      console.warn("Unexpected tile index: " + tileIndex);
      return;
    }
    this.applyColorToTileAtIndex(tileIndex, event.detail.rgb);
    this.updateAndRender();
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
    for (colorIndex=0; colorIndex<this.options.colorCount; colorIndex++) {
      if (!Array.isArray(this.pickedColors[colorIndex])) {
        colorsComplete = false;
        break;
      }
    }
    colorsComplete &= (colorIndex == this.options.colorCount);
    if (colorsComplete) {
      console.info("Colors complete: ", this.pickedColors);
    }
  }
  sendColors() {
    this.elem.classList.add("disabled"); // switch after a second but disable everything meantime
    this.game.resultColors = this.pickedColors;

    this.game.client.sendColors(this.pickedColors).then(resp => {
      console.log("sendColors response: ", resp);
      this.game.resultColors = resp.colors;
      game.switchScene("gameover");
    }).catch(ex => {
      console.warn("sendColors failed: ", ex);
      game.switchScene("gameover");
    });
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

    this.client.toggleHeartbeat(false);
    this.client.leaveQueue();

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
