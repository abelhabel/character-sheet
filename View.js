class View {
  constructor(name, item) {
    this.name = name;
    this.item = item;
  }

  get tag() {
    return this.item.tags.outer;
  }

}

module.exports = View;
