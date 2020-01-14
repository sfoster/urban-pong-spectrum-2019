class WeightedItems extends Array {
  // each item has a weight property, which is some ratio to 1

  get totalWeight() {
    return this.filter(item => !isNaN(item.weight))
               .reduce((total, item) => total + item.weight, 0);
  }

  pick(pcent) {
    let totalWeight = this.totalWeight;
    let pickWeight = pcent * totalWeight;
    let currWeight = 0;
    let pickedItem = this.find(item => {
      currWeight += item.weight;
      return currWeight >= pickWeight;
    }); 
    return pickedItem;
  }
}

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
  enter(params = {}) {
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
    this.sendButton = this.elem.querySelector("button");
    this.colorCount = options.colorCount;
    this.pickedColors = null;
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

  enter(params = {}) {
    super.enter(params);
    console.log("Enter ColorPickerScene");
    this.pickedColors = new Array(this.options.colorCount);
    this.elem.classList.remove("disabled");

    // initialize the tiles
    let containerNode = this.pickerContainer = this.elem.querySelector(".body > .body-upper");
    let dims = containerNode.getBoundingClientRect();
    if (!this.colorPicker) {
      this.colorPicker = new ColorPicker(null, {
        containerNode,
        incrementDegrees: 3,
        radius: dims.width / 2,
      });
    }
    this.elem.addEventListener("colorpickershow", this);
    this.elem.addEventListener("colorpickerhide", this);

    this.colorPicker.render();

    this.elem.addEventListener("click", this);
    this.elem.addEventListener("colorpicked", this);

    for(let tileIndex = 0; tileIndex < this.options.colorCount; tileIndex++) {
      this.applyColorToTileAtIndex(tileIndex, this.pickedColors[tileIndex]);
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
    this.pickedColors = null;
    super.exit();
    this.elem.removeEventListener("click", this);
    this.elem.removeEventListener("colorpicked", this);
    this.elem.removeEventListener("colorpickershow", this);
    this.elem.removeEventListener("colorpickerhide", this);
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
    let cssColor = rgbColor && `rgb(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]})`;
    let tile = this.elem.querySelectorAll(".tile")[tileIndex];
    if (cssColor) {
      tile.style.backgroundColor = cssColor;
      tile.classList.remove("needscolor");
      this.pickedColors[tileIndex] = rgbColor;
    } else {
      tile.style.backgroundColor = "";
      tile.classList.add("needscolor");
    }
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

class InitializeScene extends Scene {
  enter(params = {}) {
    super.enter(params);
    console.log("Enter InitializeScene");
    this.client.status().then(result => {
      if (result.ok) {
        this.statusOk(result);
      } else {
        this.statusNotOk(result);
      }
    }).catch(ex =>{
      this.statusNotOk(ex);
    })
  }
  statusOk(statusData) {
    this.game.switchScene("welcome", statusData);  
  }
  statusNotOk(statusResult){
    if (statusResult && statusResult instanceof Error) {
      game.switchScene("notavailable", { heading: "Status Error", message: statusResult.message, });
    } else if (statusResult && !statusResult.ok) {
      // TODO: we do have more fine-grained status data available for a more accurate message?
      game.switchScene("notavailable", { heading: "Offline", message: "ColorLaunch is Offline right now, please come back later", });
    }
  }
}

class WelcomeScene extends Scene {
  enter(params = {}) {
    super.enter(params);
    console.log("Enter WelcomeScene");
  }
  play() {
    let game = this.game;
    let client = this.client;
    let playButton = this.elem.querySelector("button");

    if (!("geolocation" in navigator)) {
      /* geolocation IS NOT available */
      playButton.disabled = true;
      this.elem.querySelector(".nolocation").classList.remove("hidden");
      this.elem.querySelector(".greeting").classList.add("hidden");
      return;
    }

    /* geolocation is available */
    const geoOptions = {
      // enableHighAccuracy: true,
      maximumAge        : 30000,
      // timeout           : 27000
    };

    this.elem.querySelector(".nolocation").classList.add("hidden");
    this.elem.querySelector(".greeting").classList.remove("hidden");

    function gotLocation(position) {
      client.joinQueue({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }).then(resp => {
        console.log("Got join response: ", resp);
        if (resp.error) {
          console.warn("joinQueue refused: ", resp);
          let errorCode = "error-"+resp.message;
          let params = Object.assign({
            errorCode
          }, game.strings.getContent(errorCode));
          game.switchScene("notavailable", params);
        } else {
          game.joined = true;
          game.switchScene("colorpicker");
        }
      }).catch(ex => {
        console.warn("joinQueue failed: ", ex);
        game.switchScene("notavailable", { heading: "Join Error", message: ex.message, });
      });
    }

    function locationError(err) {
      game.switchScene("notavailable", { heading: "Location Error", message: err.message, });
    }

    navigator.geolocation.getCurrentPosition(gotLocation, locationError, geoOptions);
    // TODO: add watch so we can send the current value in all requests during gameplay
    // locationWatchID = navigator.geolocation.watchPosition(handleLocation, handleLocationError, geoOptions);
  }
  showLocationError() {
    let explanation = 
    game.switchScene("notavailable", { heading: "Join Error", message: resp.message, });
  }
}

class GameOverScene extends Scene {
  enter(params = {}) {
    super.enter(params);
    console.log("Enter GameOverScene");

    this.client.toggleHeartbeat(false);
    if (this.game.joined) {
      this.client.leaveQueue();
      this.game.joined = false;
    }

    this.targetImage = this.elem.querySelector(".outputImage");
    this.loadInputImage("./assets/palette_1.svg").then(svgDocument => {
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
      let fillElements = doc.querySelectorAll(shapeSelector);
      console.log("matched fillElements", fillElements);
      Array.from(fillElements).forEach((elem, idx) => {
        let color = colors[idx % colors.length];
        elem.setAttribute("fill", color);
        console.log("setting fill to", color, elem);
      });
      return doc;
    }

    function renderImageOutput(outputDocument, outputImg) {
      let svgString = outputDocument.documentElement.outerHTML;
      let dataURI = "data:image/svg+xml;base64," +  btoa(svgString);
      outputImg.src = dataURI;
    }

    replaceColorsInDocument(this.svgImageDocument, cssColorValues, ".palette-filled-shape");
    renderImageOutput(this.svgImageDocument, this.targetImage);
  }
}

class NotAvailableScene extends Scene {
  constructor(elem, options) {
    super(elem, options);
    this.heading = this.elem.querySelector(".heading");
    this.message = this.elem.querySelector(".message");
  }
  enter(params = {}) {
    super.enter(params);
    console.log("Enter NotAvailableScene");

    this.client.toggleHeartbeat(false);
    if (this.game.joined) {
      this.client.leaveQueue();
      this.game.joined = false;
    }

    if (params.titleText) {
      this.heading.textContent = params.titleText;
    } else {
      this.heading.textContent = params.heading || "";
    }
    if (params.contentFragment) {
      this.message.textContent = "";
      this.message.appendChild(params.contentFragment);
    } else {
      this.message.textContent = params.message || "";
    }
    if (params.className) {
      if (this.message.firstElementChild.hasAttribute("class")) {
        let node = this.elem.querySelector(".body-upper"); 
        for (let cls of params.className.split(" ")) {
          node.classList.add(cls); 
        }
      }
    }
  }
  exit() {
    super.exit();
    this.elem.querySelector(".body-upper").className = "body-upper"; 
  }
}
