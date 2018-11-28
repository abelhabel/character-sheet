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
    files.forEach(f => {
      let tag = f.match('.js') ? 'script' : 'img';
      o = o.then(() => {
        return new Promise((resolve, reject) => {
          var script = document.createElement(tag);
          script.onload = function() {
            if(tag == 'img') {
              let m = new Module(f);
              m.exports = script;
            }
            resolve();
          };
          script.src = f;
          tag == 'script' && document.body.appendChild(script);
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


Module.onLoad(['DungeonCrawl_ProjectUtumnoTileset.png', 'abilities.js', ,
'Canvas.js', 'Sprite.js', 'Animation.js', 'Slider.js', 'PositionList2d.js'], () => {
  const Canvas = require('Canvas.js');
  const Sprite = require('Sprite.js');
  const Animation = require('Animation.js');
  const Slider = require('Slider.js');
  const PL = require('PositionList2d.js');
  const sh = require('DungeonCrawl_ProjectUtumnoTileset.png');
  const w = 12;
  const h = 11;
  const tw = 42;
  const th = 42;
  const pos = {x: 0, y: th*5};
  const abilities = require('abilities.js');
  var selectedSprite = abilities[0].bio.sprite;
  let spriteSelect = document.createElement('div');
  abilities.forEach(a => {
    let s = new Sprite(a.bio.sprite);
    selectedSprite = s;
    spriteSelect.appendChild(s.canvas);
    s.canvas.addEventListener('click', e => {
      selectedSprite = s;
      animation.sprite = s;
    })
  })
  document.body.appendChild(spriteSelect);

  const canvas = new Canvas(w * tw, h * th);
  var animation = new Animation(pos.x, th, canvas.w, 7*th, selectedSprite, {});
  window.animation = animation;
  const sliders = {
    sizeStart: new Slider('Size Start', 100, animation, 'sizeStart'),
    sizeEnd: new Slider('Size End', 100, animation, 'sizeEnd'),
    speedStart: new Slider('Speed Start', 50, animation, 'speedStart'),
    speedEnd: new Slider('Speed End', 50, animation, 'speedEnd'),
    speedEase: new Slider('Speed Ease', 50, animation, 'speedEase'),
    elevation: new Slider('Elevation', 50, animation, 'elevation'),
    elevationStart: new Slider('Elevation Start', 50, animation, 'elevationStart'),
  };
  let left  = document.createElement('div');
  left.style.paddingLeft = '30px';
  left.style.display = 'inline-block';
  left.style.userSelect = 'none';
  canvas.canvas.style.verticalAlign = 'top';
  canvas.canvas.style.backgroundColor = 'lightslategray';
  document.body.appendChild(left);
  canvas.mount(document.body);
  left.appendChild(sliders.sizeStart.render());
  left.appendChild(sliders.sizeEnd.render());
  left.appendChild(sliders.speedStart.render());
  left.appendChild(sliders.speedEnd.render());
  left.appendChild(sliders.speedEase.render());
  left.appendChild(sliders.elevation.render());
  left.appendChild(sliders.elevationStart.render());


  var velocity = 600;
  var fps = 60;
  var speed = velocity / fps;

  var size = 1;
  let height = th*5;
  var paused = false;
  var pause = document.createElement('button');
  pause.textContent = 'Pause';
  pause.addEventListener('click', e => {
    paused = !paused;
    if(paused) {
      pause.textContent = 'Play';
    } else {
      pause.textContent = 'Pause';
      move();
    }
  });
  document.body.appendChild(pause);
  function move() {
    animation.move();
    canvas.clear();
    animation.draw(canvas);
    // draw();
    !paused && window.requestAnimationFrame(move);
  }
  move();
  function save() {
    var id = this.importingId ? `?id=${this.importingId}` : '';
    var qc = this.queryCommand || 'saveMonster';
    var body = JSON.stringify(this.state);
    fetch(qc + id, {
      method: 'POST',
      body: body
    })
  }
});
