const Canvas = require("Canvas.js");
class Sprite {
  constructor(t) {
    this.template = t;
    this.x = t.x;
    this.y = t.y;
    this.w = t.w;
    this.h = t.h;
    this.spritesheet = require(t.spritesheet);
    this._canvas = Canvas.cacheSprite(this);

  }

  get canvas() {
    return this._canvas.canvas;
  }
}

module.exports = Sprite;
