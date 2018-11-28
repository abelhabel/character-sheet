class Canvas {
  constructor(w, h) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.w = w;
    this.h = h;
  }

  get context() {
    return this.canvas.getContext('2d');
  }

  drawLine(sx, sy, ex, ey, color = '#000') {
    let c = this.context;
    c.strokeStyle = color;
    c.moveTo(sx, sy);
    c.lineTo(ex, ey);
    c.stroke();
  }

  drawGrid(tw, th, color) {
    console.time('drawGrid')
    let c = this.context;
    for(let y = 0; y <= this.h; y += tw) {
      this.drawLine(0, y, this.w, y, color);
    }
    for(let x = 0; x <= this.w; x += tw) {
      this.drawLine(x, 0, x, this.h, color);
    }
    console.timeEnd('drawGrid')
  }

  static cacheSprite(sprite) {
    let c = new Canvas(sprite.w, sprite.h);
    c.context.drawImage(sprite.spritesheet, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, c.w, c.h);
    return c;
  }

  drawSprite(sprite, x, y, tw, th) {
    this.context.drawImage(sprite.canvas, x, y, tw, th);
  }

  clear() {
    this.context.clearRect(0, 0, this.w, this.h);
  }

  mount(container) {
    container.appendChild(this.canvas);
  }
}

module.exports = Canvas;
