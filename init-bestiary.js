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

Module.onLoad(['DungeonCrawl_ProjectUtumnoTileset.png', 'sheet_of_old_paper.png',
  'abilities.js', 'monsters.js', 'Ability.js', 'Monster.js'], () => {
  const Monster = require('Monster.js');
  const abilities = require('abilities.js');
  const monsters = require('monsters.js').map(m => new Monster(m));
  class Card {
    constructor(a) {
      this.a = a;
    }

    render() {
      console.log(typeof this.a.stats.special)
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
        <b>${n}</b>${e}${s}
      </div>`;

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
      let {name, family, cost, maxStacks} = m.bio;
      let {attack, defence, spellPower, spellResistance,
        movement, initiative, mana, apr, tpr, damage} = m.stats;
      let bio = [
        ['Name', name],
        ['Family', family],
        ['Cost', cost],
        ['Stacks', `${m.stacks}/${maxStacks}`],
        ['Health', m.totalHealth, m.statBonus('health').combined],
        ['Mana', m.totalMana, m.statBonus('mana').combined]
      ];
      let stats = [
        ['Attack', m.totalStat('attack'), m.statBonus('attack').combined],
        ['Defence', m.totalStat('defence'), m.statBonus('defence').combined],
        ['Spell Power', m.totalStat('spellPower'), m.statBonus('spellPower').combined],
        ['Spell Resistance', m.totalStat('spellResistance') , m.statBonus('spellResistance').combined],
        ['Damage', m.totalStat('damage'), m.statBonus('damage').combined]
      ];
      let mobility = [
        ['Movement', m.totalStat('movement'), m.statBonus('movement').combined],
        ['Initiative', m.totalStat('initiative'), m.statBonus('initiative').combined],
        ['Attacks Per Turn', m.totalStat('apr'), m.statBonus('apr').combined],
        ['Triggers Per Turn', m.totalStat('tpr'), m.statBonus('tpr').combined]
      ];
      let bioTable = this.table(bio);
      popup.appendChild(bioTable);
      popup.appendChild(html`<br>`);
      let statsTable = this.table(stats);
      popup.appendChild(statsTable);
      popup.appendChild(html`<br>`);
      let mobilityTable = this.table(mobility);
      popup.appendChild(mobilityTable);
      popup.appendChild(html`<br>`);
    }

    drawAbilityStats(a, tag) {
      let {source, attribute, element, minPower, shape, radius,
        maxPower, multiplier, resourceCost, resourceType,
        range, effect, duration, target, targetFamily, stacks
      } = a.stats;
      tag.style.whiteSpace = 'pre-line';
      let {activation, type, name, description} = a.bio;
      let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
      let act = type == 'trigger' ? `\n<span class='bold'>Triggers</span>: ${activation}` : '';
      var text = `<span class='bold'>Name</span>: ${name}
      <span class='bold'>Targets</span>: ${target}/${targetFamily}
      <span class='bold'>Type</span>: ${type}${act}
      <span class='bold'>Shape</span>: ${shape}
      <span class='bold'>Radius</span>: ${radius}
      <span class='bold'>Source</span>: ${source}
      <span class='bold'>Element</span>: ${element}
      <span class='bold'>Cost</span>: ${resourceCost} ${resourceType}
      <span class='bold'>Range</span>: ${range}`;
      let time = duration ? ` for ${duration} rounds` : '';
      if(multiplier) {
        text += `\n<span class='bold'>Effects</span>: (${minPower}-${maxPower}) * ${multiplier}% to ${stat}${time} (max stacks: ${stacks})`;
        if(effect) {
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
      console.log('update', this.term)
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
          width: 600px;
          height: 800px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          padding: 20px;
          background-color: rgba(0,0,0,0.5);
          background: url(sheet_of_old_paper.png);
          white-space: pre-line;
        '
      >
      </div>`;
      window.addEventListener('keyup', e => {
        console.log(e)
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
