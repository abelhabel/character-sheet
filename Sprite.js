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

  get png() {
    return this.canvas.toDataURL('image/png');
  }

  drawWithOpacity(opacity) {
    let c = this.canvas.clone();
    this._canvas.clear();
    let context = this._canvas.context;
    context.globalAlpha = opacity;
    context.drawImage(c, 0, 0, this.w, this.h);
  }

  drawStack(stack) {
    let fs = 12;
    this._canvas.drawRect(this.w -fs,this.h-fs, fs, fs);
    this._canvas.drawText(this.w -fs,this.h, stack, 'red', fs + 'px Tahoma');
  }
}

module.exports = Sprite;
