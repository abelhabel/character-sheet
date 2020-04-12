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
    console.log('load modules')
    var o = Promise.resolve();
    let calls = files.map(f => {
      let m = new Module(f);
      let tag = f.match('.js') ? 'script' : 'img';

      return new Promise((resolve, reject) => {
        var script = document.createElement(tag);
        script.async = true;
        script.defer = true;
        console.log('loading...', f)
        script.onload = function() {
          if(tag == 'img') {
            m.exports = script;
          }
          resolve();
        };
        script.src = f;
        tag == 'script' && document.body.appendChild(script);
      })
    });

    Promise.all(calls).then(function() {
      Object.keys(Module.modules).forEach(k => {
        Module.modules[k].pre && Module.modules[k].pre()
      });
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


Module.onLoad(['DungeonCrawl_ProjectUtumnoTileset.png', 'Rand.js',
'terrains.js', 'arenas.js', 'icons.js',
'PositionList2d.js', 'Component.js',
'Canvas.js', 'Sprite.js', 'CompositeSprite.js',
'Terrain.js', 'Arena.js'], () => {
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
    return Promise.all(loads)
  }
  const Component = require('Component.js');
  const Arena = require('Arena.js');
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

  class Draw extends Component {
    constructor() {
      super(false, 'draw');
      this.arena = new Arena({id: '', ground: new PL(w, h), obstacles: new PL(w, h)}, tw, th);
      this.groundTerrain = tpl.ground[0];
      this.obstaclesTerrain = tpl.ground[0];
    }

    render() {
      this.clear()
      let c = this.arena.render();
      this.append(c);
      return this.tags.outer;
    }
  }

  var draw = new Draw();
  var pl = draw.arena;
  const tags = {
    ground: document.createElement('div'),
    obstacles: document.createElement('div'),
    arena: document.createElement('div'),
    groundCanvas: document.createElement('canvas'),
    obstaclesCanvas: document.createElement('canvas'),
    width: document.createElement('input'),
    height: document.createElement('input'),
    export: document.createElement('button'),
    editing: document.createElement('span')
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
  document.body.appendChild(tags.editing);
  document.body.appendChild(tags.ground);
  document.body.appendChild(tags.obstacles);
  // document.body.appendChild(tags.arena);
  document.body.appendChild(draw.render());
  // tags.arena.appendChild(tags.groundCanvas);
  // tags.arena.appendChild(tags.obstaclesCanvas);
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
    draw.arena.ground.fillAll(selected.ground);
    console.log(draw)
  }

  function renderTile(canvas, terrain) {
    let c = canvas.getContext('2d');
    c.clearRect(0, 0, tw, th);
    c.drawImage(terrain.canvas, 0, 0, tw, th);
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
      let canvas = t.canvas.clone();
      tags.ground.appendChild(canvas);

      canvas.addEventListener('click', () => {
        selected.ground = t;
        renderTile(chosen, t);
        setGround();
         draw.render();
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
      let canvas = t.canvas.clone();
      tags.ground.appendChild(canvas);

      canvas.addEventListener('click', () => {
        selected.obstacles = t;
        renderTile(chosen, t);
         draw.render();
      })
    })
  }

  function changeSize() {
    draw.arena.ground = new PL(w, h);
    setGround();
    let o = new PL(w, h);
    draw.arena.obstacles.loop((x, y) => o.set(x, y, draw.arena.obstacles.get(x, y)));

    draw.arena.obstacles = o;
    tags.arena.style.height = h * th + 'px';
     draw.render();
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

  draw.tags.outer.addEventListener('click', e => {
    let x = Math.floor(e.offsetX / tw);
    let y = Math.floor(e.offsetY / th);
    if(e.ctrlKey) {
      draw.arena.obstacles.remove(x, y);
    } else {
      draw.arena.obstacles.set(x, y, selected.obstacles);
    }
    //  draw.render();
    draw.arena.renderTile(x, y);
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
    let o = {
      ground: draw.arena.ground,
      obstacles: draw.arena.obstacles,
      png: preview.toDataURL('image/png')
    };

    let id = tags.editing.textContent;
    let url = 'saveArena';
    if(id) {
      url += '?id=' + id;
    }
    fetch(url, {
      method: 'POST',
      body: JSON.stringify(o)
    })
    .then(res => res.text())
    .then(id => {
      console.log('saved arena', id)
    })
  }

  function renderPreview(a) {
    let img = new Image();
    img.src = a.template.png;

    img.addEventListener('click', e => {
      tags.editing.textContent = a.id;
      tags.width.value = a.w;
      tags.height.value = a.h;
      draw.arena = a;
      draw.render();
    })
    document.body.appendChild(img);
  }

  function renderImportButton() {
    var arenas = require('arenas.js') || [];
    arenas.forEach(a => {
      renderPreview(new Arena(a, tw, th));
    })
  }

  loadSpriteSheets(terrains)
  .then(() => {
    console.log(images)
    renderGroundPalette();
    renderObstaclesPalette();
    changeSize();
    setGround();
     draw.render();
    renderImportButton();
  })
})
