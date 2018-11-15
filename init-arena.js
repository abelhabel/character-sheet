HTMLCanvasElement.prototype.clone = function() {
  var c = document.createElement('canvas');
  c.width = this.width;
  c.height = this.height;
  c.getContext('2d').drawImage(this, 0, 0, c.width, c.height);
  Object.assign(c.style, this.style);
  return c;
}

CSSStyleDeclaration.prototype.copyTo = function(o) {
  for(p of this) {
    o[p] = this[p];
  }
}

class Module {
  constructor(name) {
    this.name = name;
    this.module = '';
    Module.modules[name] = this;
  }

  get exports() {
    return this.module;
  }

  set exports(n) {
    this.module = n;
    // Module.loaders.forEach(l => l());
  }

  static onLoad(files, fn) {
    var o = Promise.resolve();
    files.forEach(f => {
      o = o.then(() => {
        return new Promise((resolve, reject) => {
          var script = document.createElement('script');
          script.onload = function() {
            resolve();
          };
          script.src = f;
          document.body.appendChild(script);
        })
      })
    })
    o.then(function() {
      fn()
    }).catch(e => {
      console.log('loading error', e)
    });
  }
}

function require(name) {
  return Module.modules[name] && Module.modules[name].module || null;
}
Module.modules = {};
Module.loaders = [];


Module.onLoad(['Rand.js', 'terrains.js', 'PositionList2d.js', 'Terrain.js'], () => {
  const images = {};
  function openSpriteSheet(sh) {
    if(images[sh]) {
      return Promise.reolve(images[sh]);
    }
    return new Promise((resolve, reject) => {
      var image = new Image();
      image.onload = (e) => {
        images[sh] = image;
        resolve(image);
      }
      image.src = sh;

    })
  }

  function loadSpriteSheets(list) {
    var sheets = [];
    var items = [];
    list.forEach(item => {
      item.bio.sprite.forEach(sprite => {
        let sh = sprite.spritesheet;
        if(!~sheets.indexOf(sh)) {
          sheets.push(sh);
          return items.push(sh);
        }
      });
    });
    var loads = [];
    items.forEach(item => {
      return loads.push(openSpriteSheet(item));
    });
    console.log(loads.length)
    return Promise.all(loads)
  }
  const Rand = require('Rand.js');
  var generator = new Rand(Date.now()).generator;
  window._random = () => generator.random();
  const terrains = require('terrains.js');
  const PL = require('PositionList2d.js');
  const Terrain = require('Terrain.js');
  const tpl = {
    terrains: terrains.map(t => new Terrain(t))
  };
  tpl.ground = tpl.terrains.filter(t => t.stats.walkable),
  tpl.obstacles = tpl.terrains.filter(t => !t.stats.walkable)

  var w = 12;
  var h = 12;
  var tw = 42;
  var th = 42;

  const pl = {
    ground: new PL(w, h),
    obstacles: new PL(w, h)
  };

  const tags = {
    ground: document.createElement('div'),
    obstacles: document.createElement('div'),
    arena: document.createElement('div'),
    groundCanvas: document.createElement('canvas'),
    obstaclesCanvas: document.createElement('canvas'),
    width: document.createElement('input'),
    height: document.createElement('input'),
    export: document.createElement('button')
  };
  tags.export.textContent = 'Export';
  tags.width.type = tags.height.type = 'number';
  tags.width.min = tags.height.min = 8;
  tags.width.max = tags.height.max = 16;
  tags.width.value = w;
  tags.height.value = h;
  tags.groundCanvas.width = tags.obstaclesCanvas.width = tw * w;
  tags.groundCanvas.height = tags.obstaclesCanvas.height = th * h;
  document.body.appendChild(tags.width);
  document.body.appendChild(tags.height);
  document.body.appendChild(tags.export);
  document.body.appendChild(tags.ground);
  document.body.appendChild(tags.obstacles);
  document.body.appendChild(tags.arena);
  tags.arena.appendChild(tags.groundCanvas);
  tags.arena.appendChild(tags.obstaclesCanvas);
  const style = {
    canvas: {
      position: 'absolute',
      top: '0px',
      left: '0px'
    },
    arena: {
      position: 'relative'
    }
  }

  Object.assign(tags.arena.style, style.arena);
  Object.assign(tags.groundCanvas.style, style.canvas);
  Object.assign(tags.obstaclesCanvas.style, style.canvas);

  var selected = {
    ground: tpl.ground[0],
    obstacles: tpl.obstacles[0]
  };

  function setGround() {
    console.log('set ground')
    pl.ground.loop((x, y) => {
      pl.ground.set(x, y, selected.ground.sprite);
    })
  }


  function renderArena() {
    let c = tags.groundCanvas.getContext('2d');
    c.clearRect(0, 0, w*tw, h*th);
    pl.ground.filled(({item, x, y}) => {
      let img = images[item.spritesheet];
      c.drawImage(img, item.x, item.y, item.w, item.h, x*tw, y*th, tw, th);
    });
    c = tags.obstaclesCanvas.getContext('2d');
    c.clearRect(0, 0, w*tw, h*th);
    pl.obstacles.filled(({item, x, y}) => {
      let img = images[item.spritesheet];
      c.drawImage(img, item.x, item.y, item.w, item.h, x*tw, y*th, tw, th);
    });
  }

  function renderTile(canvas, terrain) {
    let c = canvas.getContext('2d');
    let sprite = terrain.bio.sprite[0];
    let spritesheet = sprite.spritesheet;
    let img = images[spritesheet];
    c.clearRect(0, 0, tw, th);
    c.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, tw, th);
  }

  function renderGroundPalette() {
    let title = document.createElement('p');
    title.innerHTML = '<span style="margin-right: 5px;vertical-align: top;">Ground</span>';
    tags.ground.appendChild(title);
    let chosen = document.createElement('canvas');
    chosen.width = tw;
    chosen.height = th;
    title.appendChild(chosen);
    tpl.ground.forEach(t => {
      let canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      renderTile(canvas, t);
      tags.ground.appendChild(canvas);

      canvas.addEventListener('click', () => {
        selected.ground = t;
        renderTile(chosen, t);
        setGround();
        renderArena();
      })
    })
  }

  function renderObstaclesPalette() {
    let title = document.createElement('p');
    title.innerHTML = '<span style="margin-right: 5px;vertical-align: top;">Obstacles</span>';
    tags.ground.appendChild(title);
    let chosen = document.createElement('canvas');
    chosen.width = tw;
    chosen.height = th;
    title.appendChild(chosen);
    tpl.obstacles.forEach(t => {
      let canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      renderTile(canvas, t);
      tags.ground.appendChild(canvas);

      canvas.addEventListener('click', () => {
        selected.obstacles = t;
        renderTile(chosen, t);
        renderArena();
      })
    })
  }

  function changeSize() {
    pl.ground = new PL(w, h);
    setGround();
    let o = new PL(w, h);
    pl.obstacles.loop((x, y) => o.set(x, y, pl.obstacles.get(x, y)));

    pl.obstacles = o;
    tags.arena.style.height = h * th + 'px';
    renderArena();
  }

  tags.width.addEventListener('mouseup', e => {
    w = parseInt(tags.width.value);
    tags.groundCanvas.width = tags.obstaclesCanvas.width = w * tw;
    changeSize();
  })

  tags.height.addEventListener('mouseup', e => {
    h = parseInt(tags.height.value);
    tags.groundCanvas.height = tags.obstaclesCanvas.height = h * th;
    changeSize();
  })

  tags.obstaclesCanvas.addEventListener('click', e => {
    let x = Math.floor(e.offsetX / tw);
    let y = Math.floor(e.offsetY / th);
    if(e.ctrlKey) {
      pl.obstacles.remove(x, y);
    } else {
      pl.obstacles.set(x, y, selected.obstacles.sprite);
    }
    renderArena();
  })

  tags.export.addEventListener('click', e => {
    exportArena();
  })

  function exportArena() {
    let preview = document.createElement('canvas');
    let s = 16;
    preview.width = w * s;
    preview.height = h * s;
    let c = preview.getContext('2d');
    c.drawImage(tags.groundCanvas, 0, 0, w * s, h * s);
    c.drawImage(tags.obstaclesCanvas, 0, 0, w * s, h * s);
    document.body.appendChild(preview);
    let o = {
      ground: pl.ground,
      obstacles: pl.obstacles,
      png: preview.toDataURL('image/png')
    };
    console.log(o, JSON.stringify(o).length)


    fetch('/saveArena', {
      method: 'POST',
      body: JSON.stringify(o)
    })
    .then(res => res.text())
    .then(id => {
      console.log('saved arena', id)
    })
  }

  loadSpriteSheets(terrains)
  .then(() => {
    renderGroundPalette();
    renderObstaclesPalette();
    changeSize();
    setGround();
    renderArena();
  })
})
