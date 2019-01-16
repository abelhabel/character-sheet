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

Module.onLoad(['DungeonCrawl_ProjectUtumnoTileset.png', 'sheet_of_old_paper.png', 'abilities.js', 'Canvas.js', 'Sprite.js', 'Ability.js'], () => {
  const abilities = require('abilities.js');
  const Sprite = require('Sprite.js');
  abilities.forEach(a => {
    let s = new Sprite(a.bio.sprite);
    a.canvas = s.canvas;
  })
  class Card {
    constructor(a) {
      this.a = a;
    }

    render() {
      let outer = html`<span></span>`;
      let n = this.a.bio.name;
      let e = this.a.stats.effect ? `<br>Effect: ${this.a.stats.effect}` : '';
      let s = this.a.stats.special && this.a.stats.special != 'false'? `<br>Special: ${this.a.stats.special}` : '';
      let tag = html`<div class='card'>
        <span class='image'></span>
        <b>${n}</b>${e}${s}
      </div>`;
      let style = html`<style>
        .card {
          display: inline-block;
          width: 200px;
          min-height:64px;
          margin: 4px;
          border: 1px solid gray;
          vertical-align: top;
          cursor: pointer;
        }
        span, b {
          vertical-align: top;
        }
      </style>`;
      let shadow = outer.attachShadow({mode: 'open'});
      shadow.appendChild(style);
      shadow.appendChild(tag);
      tag.querySelector('.image').appendChild(this.a.canvas.clone());
      return outer;
    }

    drawAbilityStats(a, tag) {
      let {source, attribute, element, minPower, shape, radius,
        maxPower, multiplier, resourceCost, resourceType,
        range, effect, duration, target, targetFamily, stacks
      } = a.stats;
      tag.style.whiteSpace = 'pre-line';
      let {activation, type, name, description} = a.bio;
      let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
      let act = type == 'trigger' ? `\n<span class='bold'>Trigger</span>: ${activation}` : '';
      var text = `<span class='bold'>Name</span>: ${name}
      <span class='bold'>Target</span>: ${target}/${targetFamily}
      <span class='bold'>Type</span>: ${type}${act}
      <span class='bold'>Shape</span>: ${shape}
      <span class='bold'>Radius</span>: ${radius}
      <span class='bold'>Source</span>: ${source}
      <span class='bold'>Element</span>: ${element}
      <span class='bold'>Cost</span>: ${resourceCost} ${resourceType}
      <span class='bold'>Range</span>: ${range}`;
      let time = duration ? ` for ${duration} rounds` : '';
      if(multiplier) {
        text += `\n<span class='bold'>Power</span>: (${minPower}-${maxPower}) * ${multiplier}% to ${stat}${time} (max stacks: ${stacks})`;
        if(effect && effect.stats) {
          let {source, attribute, minPower, maxPower, multiplier, duration, stacks} = effect.stats;
          let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
          let time = duration ? ` for ${duration} rounds` : '';
          text += `, (${minPower}-${maxPower}) * ${multiplier}% to ${stat}${time} (max stacks: ${stacks})`;
        }

      }
      text += `\n\n${description}`;
      tag.innerHTML = text;
    }
  }

  var cards = abilities.map(a => new Card(a));

  class Search {
    constructor(cards) {
      this.term = '';
      this.db = cards;
      this.results = [];
      this.tags = {
        input: null,
        results: null,
        popup: this.popup()
      }
    }

    update() {
      this.tags.results.innerHTML = '';
      this.db.filter(card => {
        let item = card.a;
        let a = Object.assign({}, item.bio, item.stats);
        return Object.keys(a).find(key => {
          let k = key.toLowerCase();
          let l = a[key].toString().toLowerCase();
          let t = this.term.toLowerCase();
          return k.match(t) || l.match(t);
        })
      })
      .forEach(card => {
        let tag = card.render();
        tag.addEventListener('click', e => card.drawAbilityStats(card.a, (this.tags.popup.style.display = 'block', this.tags.popup)));
        this.tags.results.appendChild(tag);
      })
    }

    popup() {
      let tag = html`<div
        style='
          display: none;
          position: fixed;
          width: 600px;
          height: 800px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          padding: 20px;
          background-color: rgba(0,0,0,0.5);
          background: url(sheet_of_old_paper.png);
        '
      >
      </div>`;
      // tag.addEventListener('click', e => {
      //   tag.style.display = 'none';
      // });
      window.addEventListener('keyup', e => {
        if(e.key != 'Escape') return;
        tag.style.display = 'none';
      });
      document.body.appendChild(tag);
      return tag;
    }

    render(c) {
      let tag = html`<div>
        <div>
          <input type='text'>
        </div>
        <div id='results'>
        </div>
      </div>`;

      this.tags.input = tag.querySelector('input');
      this.tags.results = tag.querySelector('#results');
      this.tags.input.addEventListener('keyup', e => {
        this.term = this.tags.input.value;
        this.update();
      })
      c.appendChild(tag);
    }
  }

  var search = new Search(cards);

  search.render(document.body);
  search.update();
});
