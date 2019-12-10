class GameStrings {
  constructor(templateNode) {
    this.templateNode = templateNode;
    this.contentNodesByName = null;
  }
  init() {
    let templateNodes = document.importNode(this.templateNode.content, true);
    this.contentNodesByName = {};
    for (let node of templateNodes.children) {
      if (node.id) {
        this.contentNodesByName[node.id] = node;
      }
    }
  }

  getContent(name) {
    let contentFragment = this.getContentFragment(name);
    let elem = contentFragment.firstElementChild;
    let content = {
      contentFragment,
      titleText: elem.getAttribute("title"),
      className: elem.hasAttribute("class") ? elem.getAttribute("class") : "",
    }
    return content;
  }

  getContentFragment(name) {
    if (!this.contentNodesByName[name]) {
      throw new Error("Missing content fragment: " + name);
    }
    let frag = document.createDocumentFragment();
    frag.appendChild(this.contentNodesByName[name].cloneNode(true));
    return frag;
  }
}