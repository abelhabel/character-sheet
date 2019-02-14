class Canvas {
  constructor(w, h) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.w = w;
    this.h = h;
  }

  clone() {
    return this.canvas.clone();
  }

  resize(w, h) {
    this.canvas.width = this.w = w;
    this.canvas.height = this.h = h;
  }

  on(e, fn) {
    this.canvas.addEventListener(e, fn);
  }

  get context() {
    return this.canvas.getContext('2d');
  }

  setAlpha(a = 1) {
    this.context.globalAlpha = a;
  }

  drawLine(sx, sy, ex, ey, color = '#000') {
    let c = this.context;
    c.strokeStyle = color;
    c.moveTo(sx, sy);
    c.lineTo(ex, ey);
    c.stroke();
  }

  drawText(x, y, text, color, font = '12px Tahoma') {
    let c = this.context;
    c.font = font;
    if(color) c.fillStyle = color;
    c.fillText(text, x, y);
  }

  drawCircle(x, y, r, fill = '#000', stroke = false) {
    let c = this.context;
    c.arc(x, y, r, 0, Math.PI * 2);
    if(fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if(stroke) {
      c.strokeStyle = stroke;
      c.stroke();
    }
  }

  drawRect(x, y, w, h, fill = '#000', stroke = false) {
    let c = this.context;
    if(fill) {
      c.fillStyle = fill;
      c.fillRect(x, y, w, h);
    }

    if(stroke) {
      c.strokeStyle = stroke;
      c.strokeRect(x, y, w, h);
    }
  }

  clearRect(x, y, w, h) {
    let c = this.context;
    c.clearRect(x, y, w, h);
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

  drawSprite(sprite, x = 0, y = 0, tw = this.w, th =  this.h) {
    this.context.drawImage(sprite.canvas, x, y, tw, th);
  }

  drawImage(img, x = 0, y = 0, tw = this.w, th =  this.h) {
    this.context.drawImage(img, x, y, tw, th);
  }

  clear() {
    this.context.clearRect(0, 0, this.w, this.h);
  }

  mount(container) {
    container.appendChild(this.canvas);
  }
}

module.exports = Canvas;
