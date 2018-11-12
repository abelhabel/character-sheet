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

  steps(x1, y1, x2, y2) {
    var dx = Math.abs(x1 - x2);
    var dy = Math.abs(y1 - y2);
    return dx + dy;
  }

  squareRadius(x1, y1, x2, y2) {
    var dx = Math.abs(x1 - x2);
    var dy = Math.abs(y1 - y2);
    return Math.max(dx, dy);
  }

  distance(x1, y1, x2, y2) {
    var dx = Math.abs(x1 - x2);
    var dy = Math.abs(y1 - y2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  closest(x, y, test) {
    let radius = 1;
    let maxRadius = 5;
    let tile;
    let a = this.get(x, y);
    for(let i  = 1; i < maxRadius; i++) {
      let tiles = this.around(x, y, i);
      tile = tiles.find(t => t.item && (test ? test(t.item) : true));
      if(tile && tile.item != a) break;
    }
    return tile;
  }

  closestEmpty(x, y) {
    let radius = 1;
    let maxRadius = 5;
    let tile;
    for(let i  = 1; i < maxRadius; i++) {
      let tiles = this.around(x, y);
      tile = tiles.find(t => !t.item);
      if(tile) break;
    }
    return tile;
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

  inLine(x1, y1, x2, y2, l) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var a = Math.atan2(dy, dx);
    var targets = [];
    for(var step = 0; step < l; step++) {
      let x = Math.round(x2 + step * Math.cos(a));
      let y = Math.round(y2 + step * Math.sin(a));
      let t = this.get(x, y);
      targets.push({item: t, x:x, y: y});
    }
    return targets;
  }

  rotate(v, radians) {
    var cos = Math.cos(radians);
    var sin = Math.sin(radians);
    var nx = cos * v.x + sin * v.y;
    var ny = cos * v.y - sin * v.x;
    return {x: nx, y: ny};
  }

  inCone(x1, y1, x2, y2, l) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var a = Math.PI/2 - Math.atan2(dy, dx);
    var targets = [];
    for(var step = 0; step < l; step++) {
      let d = step + 1;
      for(var step2 = 0; step2 < d*2 -1; step2++) {
        let p = Math.floor((d*2 -1) / 2);
        let x = (step2 - p);
        let y = (step);
        targets.push({item: null, x: x, y: y});
      }
    }
    targets.forEach(t => {
      let p = this.rotate(t, a);
      t.x = x2 + Math.round(p.x);
      t.y = y2 + Math.round(p.y);
      t.item = this.get(t.x, t.y);
    })
    return targets;
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

  inRadius(cx, cy, r = 1) {
    var out = [];
    for(var y = cy - r; y <= cy + r; y++) {
      if(y < 0 || y > this.h-1) continue;
      for(var x = cx - r; x <= cx + r; x++) {
        if(x < 0 || x > this.w-1) continue;
        if(this.distance(cx, cy, x, y) > r) continue;
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
    return new PF.AStarFinder().findPath(sx, sy, ex, ey, this.matrix);
  }

  _list() {
    return this.items.filter(item => item);
  }
}

module.exports = PositionList2d;
