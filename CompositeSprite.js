const Canvas = require('Canvas.js');
const Sprite = require('Sprite.js');
class CompositeSprite {
  constructor(sprites) {
    this.sprites = sprites.map(s => new Sprite(s));
    this.w = sprites[0].w;
    this.h = sprites[0].h;
    this._canvas = new Canvas(this.w, this.h);
    this.draw();
  }

  get png() {
    return this.canvas.toDataURL('image/png');
  }

  get canvas() {
    return this._canvas.canvas;
  }

  draw() {
    this.sprites.forEach(sprite => {
      this._canvas.drawSprite(sprite, 0, 0, this.w, this.h);
    })
  }

}

module.exports = CompositeSprite;
