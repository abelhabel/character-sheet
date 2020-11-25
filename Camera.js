class Camera {
  constructor(w, h) {
    this._x = 0;
    this._y = 0;
    this.zoom = 1;
    this.w = w;
    this.h = h;
    this.moving = false;
  }

  get bb() {
    return {
      xmin: this.x,
      xmax: this.x + this.w,
      ymin: this.y,
      ymax: this.y + this.h
    };
  }

  get x() {
    return this.zoom * this._x;
  }

  get y() {
    return this.zoom * this._y;
  }

  inView(x, y, a=0, b=0) {
    return !(x+a < this.x || x > this.x + this.w+a || y+b < this.y || y > this.y + this.h+b);
  }

  setZoom(v) {
    v = v/10;
    this.zoom += v;
    if(this.zoom < 0.25) {
      this.zoom = 0.25;
    } else
    if(this.zoom > 10) {
      this.zoom = 10;
    }
  }

  move(x, y) {
    this._x += x;
    this._y += y;
  }

  moveTo(x, y) {
    this._x = x;
    this._y = y;
  }

  centerAt(x, y) {
    this._x = Math.floor(x - this.w/2);
    this._y = Math.floor(y - this.h/2);
  }
}

module.exports = Camera;
