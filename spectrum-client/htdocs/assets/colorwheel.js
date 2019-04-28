class ColorWheel {
  constructor(elem, options) {
    this.elem = elem;
    this.options = Object.assign({}, options);
    this.elem.addEventListener("click", this);
  }
  handleEvent(event) {
    switch (event.type) {
      case "click":
        console.log("Got click on ColorWheel");
        break;
    }
  }
  uninit() {
    this.elem.removeEventListener("click", this);
  }
}
