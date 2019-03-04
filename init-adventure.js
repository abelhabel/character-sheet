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
      console.log('loading error', e)
    });
  }
}

function require(name) {
  return Module.modules[name] && Module.modules[name].module || null;
}
Module.modules = {};
Module.loaders = [];
Module.loadOrder = [];

Module.onLoad(['DungeonCrawl_ProjectUtumnoTileset.png',
  'icons.js', 'terrains.js', 'equipments.js', 'adventures.js', 'teams.js', 'monsters.js', 'abilities.js', 'sounds.js', 'quest-tpl.js',
  'PositionList2d.js', 'FixedList.js', 'guid.js', 'SoundPlayer.js', 'Slider.js',
  'Component.js', 'Canvas.js', 'Sprite.js', 'CompositeSprite.js',  'Terrain.js',  'Scroll.js', 'Equipment.js', 'Quest.js', 'QuestLog.js',
  'AbilityEffect.js', 'Ability.js',  'Monster.js', 'TeamSheet.js', 'Team.js', 'TeamViewer.js', 'CS.js',
  'AdventureTime.js', 'AdventureMenu.js', 'Adventure.js', 'AdventureEditor.js',], () => {
  const AdventureEditor = require('AdventureEditor.js');
  const adventures = require('adventures.js');
  let a = AdventureEditor.create(adventures.find(a => a.id == '1a1f19de-3da3-e850-3815-0a3bcb0c218f'));
  // let a = new Adventure(50, 50);
  // a.drawGuides();
  a.render();
  window.adventure = a;
  document.body.appendChild(a.tags.outer);
})
