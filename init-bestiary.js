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
Module.onLoad(['DungeonCrawl_ProjectUtumnoTileset.png', 'sheet_of_old_paper.png', 'sheet_of_old_paper_horizontal.png',
  'abilities.js', 'monsters.js', 'icons.js',
  'FixedList.js', 'Canvas.js', 'Sprite.js', 'CompositeSprite.js',
  'AbilityEffect.js', 'Ability.js', 'Monster.js'], () => {
  const Monster = require('Monster.js');
  const Sprite = require('Sprite.js');
  const icons = require('icons.js');
  const abilities = require('abilities.js');
  const monsters = require('monsters.js').map(m => {
    let s = new Sprite(m.bio.sprite);
    m.canvas = s.canvas;
    return new Monster(m)
  });
  class Card {
    constructor(a) {
      this.a = a;
    }

    render() {
      let n = this.a.bio.name;
      let e = this.a.stats.effect ? `<br>Effect: ${this.a.stats.effect}` : '';
      let s = this.a.stats.special && this.a.stats.special != 'false'? `<br>Special: ${this.a.stats.special}` : '';
      let tag = html`<div
        style='
          display: inline-block;
          width: 200px;
          min-height:64px;
          margin: 4px;
          border: 1px solid gray;
          vertical-align: top;
          cursor: pointer;
        '
      >
        <span class='image'></span>
        <b>${n}</b>${e}${s}
      </div>`;
      tag.querySelector('.image').appendChild(this.a.canvas.clone());
      return tag;
    }

    table(rows) {
      let table = html`<table></table>`;
      rows.forEach(cells => {
        let row = html`<tr style='cursor: pointer;'></tr>`;
        cells.forEach(cell => {
          row.appendChild(html`<td>${cell}</td>`);
        })
        table.appendChild(row);
      })
      return table;
    }

    drawMonsterCS(m, popup) {
      popup.innerHTML = '';
      m.drawMonsterCS(popup)
    }

  }

  var cards = monsters.map(a => new Card(a));

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
        let item = card.a.template;
        let a = Object.assign({}, item.bio, item.stats, item.abilities);
        return Object.keys(a).find(key => {
          let k = key.toLowerCase();
          let l = JSON.stringify(a[key]).toLowerCase();
          let t = this.term.toLowerCase();
          return k.match(t) || l.match(t);
        })
      })
      .forEach(card => {
        let tag = card.render();
        tag.addEventListener('click', e => card.drawMonsterCS(card.a, (this.tags.popup.style.display = 'block', this.tags.popup)));
        this.tags.results.appendChild(tag);
      })
    }

    popup() {
      let tag = html`<div
        style='
          display: none;
          position: fixed;
          width: 800px;
          height: 600px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          padding: 20px;
          background-color: rgba(0,0,0,0.5);
          background: url(sheet_of_old_paper_horizontal.png);
          border-radius: 10px;
        '
      >
      </div>`;
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
