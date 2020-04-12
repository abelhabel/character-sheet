HTMLCanvasElement.prototype.clone = function(w, h, style) {
  w = w || this.width;
  h = h || this.height;
  var c = document.createElement('canvas');
  c.width = this.width;
  c.height = this.height;
  c.getContext('2d').drawImage(this, 0, 0, w, h);
  this.style.copyTo(c.style);
  if(typeof style == 'object') {
    Object.assign(c.style, style);
  }
  return c;
}

HTMLCanvasElement.prototype.toPNG =  function() {
  return this.toDataURL('image/png');
}

CSSStyleDeclaration.prototype.copyTo = function(o) {
  for(p of this) {
    o[p] = this[p];
  }
}

function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s + (values[i] == undefined ? '' : values[i]);
  })

  let d = document.createElement('template');
  d.innerHTML = out;
  return d.content.firstElementChild;
}

window._random = Math.random;

class Module {
  constructor(name) {
    this.name = name;
    this.module = '';
    Module.modules[name] = this;
    Module.loadOrder.push(this);
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
    let calls = files.map(f => {
      let m = new Module(f);
      let tag = f.match('.js') ? 'script' : 'img';

      return new Promise((resolve, reject) => {
        var script = document.createElement(tag);
        script.async = true;
        script.defer = true;
        script.onload = function() {
          if(tag == 'img') {
            m.exports = script;
          }
          resolve();
        };
        script.src = f;
        tag == 'script' && document.head.appendChild(script);
      })
    });

    Promise.all(calls).then(function() {
      Object.keys(Module.modules).forEach(k => {
        Module.modules[k].pre && Module.modules[k].pre()
      });
      fn()
    }).catch(e => {
      console.log('loading error', e, e.stack)
    });
  }
}

function require(name) {
  return Module.modules[name] && Module.modules[name].module || null;
}
Module.modules = {};
Module.loaders = [];
Module.loadOrder = [];

Module.onLoad(['DungeonCrawl_ProjectUtumnoTileset.png', 'Rand.js',
  'icons.js', 'storage.js',
  'PositionList2d.js', 'FixedList.js', 'guid.js', 'Keyboard.js',
  'Component.js', 'Canvas.js', 'Sprite.js', 'CompositeSprite.js',
  'CS.js',
  'pathfinding.js', 'Camera.js', 'SkillTree.js'], () => {
  console.log('all loaded')
  const SkillTree = require('SkillTree.js');
  let st = SkillTree.load() || new SkillTree();
  window.skilltree = st;
  document.body.appendChild(st.render());
  document.body.style.overflow = 'hidden';
  document.body.style.margin = '0px';
})
