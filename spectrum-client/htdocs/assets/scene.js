class Scene {
  constructor(elem, options={}) {
    this.elem = elem;
    this.options = Object.assign({}, options);
  }
  enter() {
    this.elem.addEventListener("click", this);
    this.elem.classList.remove("hidden");
    console.log("Entering scene: ", this.options.id, this);
  }
  exit() {
    this.elem.removeEventListener("click", this);
    this.elem.classList.add("hidden");
  }
}
