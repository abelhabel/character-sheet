class PositionList2d {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.items = [];
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        this.items.push(null);
      }
    }
  }

  purge() {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        this.items[this.w * y + x] = null;
      }
    }
  }

  addCopy(o) {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        this.items[this.w * y + x] = Object.assign({x,y}, o);
      }
    }
  }

  fill(list) {
    list.forEach(item => {
      this.setItem(item);
    })
  }

  distance(x1, y1, x2, y2) {
    var dx = Math.abs(x1 - x2);
    var dy = Math.abs(y1 - y2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  from(cx, cy, r, fn) {
    for(var y = cy - r; y <= cy + r; y++) {
      if(y < 0 || y > this.h-1) continue;
      for(var x = cx - r; x <= cx + r; x++) {
        let dx = Math.abs(cx - x);
        let dy = Math.abs(cy - y);
        let d = Math.sqrt(dx*dx + dy*dy);
        if(x < 0 || x > this.w-1) continue;
        fn(this.get(x, y), x, y, d);
      }
    }
  }

  around(cx, cy, r = 1) {
    var out = [];
    for(var y = cy - r; y <= cy + r; y++) {
      if(y < 0 || y > this.h-1) continue;
      for(var x = cx - r; x <= cx + r; x++) {
        if(x < 0 || x > this.w-1) continue;
        out.push({item: this.get(x, y), x:x, y: y});
      }
    }
    return out;
  }

  get(x, y) {
    return this.items[this.w * y + x];
  }

  set(x, y, item) {
    return this.items[this.w * y + x] = item;
  }

  setItem(item) {
    if(!item) return;
    return this.items[this.w * item.y + item.x] = item;
  }

  remove(x, y) {
    this.items[this.w * y + x] = null;
  }

  forEach(fn) {
    this.items.forEach((item, i) => {
      fn(item, i, i % this.w, i % this.h)
    });
  }

  loop(fn) {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        fn(x, y);
      }
    }
  }

  get matrix() {
    var grid = new PF.Grid(this.w, this.h);
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        let item = this.get(x, y);
        grid.setWalkableAt(x, y, !item)
      }
    }
    return grid;
  }

  path(sx, sy, ex, ey) {
    let m = this.matrix;
    return new PF.AStarFinder().findPath(sx, sy, ex, ey, m);
  }

  _list() {
    return this.items.filter(item => item);
  }
}

module.exports = PositionList2d;
