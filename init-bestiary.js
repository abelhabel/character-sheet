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
Module.loadOrder = [];
Module.onLoad(['DungeonCrawl_ProjectUtumnoTileset.png', 'sheet_of_old_paper.png', 'sheet_of_old_paper_horizontal.png',
  'abilities.js', 'monsters.js', 'icons.js',
  'Canvas.js', 'Sprite.js', 'CompositeSprite.js', 'Ability.js', 'Monster.js'], () => {
  const Monster = require('Monster.js');
  const Sprite = require('Sprite.js');
  const icons = require('icons.js');
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
      let names = {
        health: 'Health', mana: 'Mana',
        attack: 'Attack', defence: 'Defence',
        spellPower: 'Spell Power', spellResistance: 'Spell Resistance',
        initiative: 'Initiative', movement: 'Movement',
        tpr: 'Triggers Per Turn', apr: 'Actions Per Turn',
        damage: 'Bonus Damage'
      };
      let health = new Sprite(icons.find(i => i.bio.name == 'Health Stat').bio.sprite);
      let mana = new Sprite(icons.find(i => i.bio.name == 'Mana Stat').bio.sprite);
      let attack = new Sprite(icons.find(i => i.bio.name == 'Attack Stat').bio.sprite);
      let defence = new Sprite(icons.find(i => i.bio.name == 'Defence Stat').bio.sprite);
      let spellPower = new Sprite(icons.find(i => i.bio.name == 'Spell Power Stat').bio.sprite);
      let spellResistance = new Sprite(icons.find(i => i.bio.name == 'Spell Resistance Stat').bio.sprite);
      let initiative = new Sprite(icons.find(i => i.bio.name == 'Initiative Stat').bio.sprite);
      let movement = new Sprite(icons.find(i => i.bio.name == 'Movement Stat').bio.sprite);
      let apr = new Sprite(icons.find(i => i.bio.name == 'APR Stat').bio.sprite);
      let tpr = new Sprite(icons.find(i => i.bio.name == 'TPR Stat').bio.sprite);
      let damage = new Sprite(icons.find(i => i.bio.name == 'Damage Stat').bio.sprite);
      let style = html`<style id='monster-cs-style'>
        .outer {
          font-weight: bold;
          font-size: 11px;
          position: relative;
          height: 100%;
        }
        .stat-column {
          width: 116px;
          display: inline-block;
          vertical-align: top;
        }
        .stat {
          box-shadow: 0px 2px 5px -1px rgba(0,0,0,0.75);
          padding: 6px;
          border-radius: 6px;
          width: 116px;
          height: 55px;
        }
        .stat:hover {
          background-color: rgba(0,0,0,0.1);
        }
        .stat, .stat div {
          display: inline-block;
          margin: 4px;
          white-space: normal;
          vertical-align: middle;

        }
        .stat-img {
          background-size: cover;
          pointer-events: none;
        }
        .stat-value {
          text-align: center;
          pointer-events: none;
        }
        section {
          padding: 4px;
          margin: 2px;
          box-shadow: 0px 0px 5px -1px rgba(0,0,0,0.25);
        }
        #details {
          position: absolute;
          bottom: 0px;
          width: 100%;
        }
      </style>`;
      if(!document.getElementById('monster-cs-style')) {
        document.head.appendChild(style);
      }
      let tag = html`<div class='outer'>
        <div class = 'stat-column'>
          <div class='stat' data-stat='health'>
            <div class='stat-img health'></div>
            <div class='stat-value'>${m.totalHealth}/${m.maxHealth}</div>
          </div>
          <div class='stat' data-stat='mana'>
            <div class='stat-img mana'></div>
            <div class='stat-value'>${m.totalMana}/${m.maxMana}</div>
          </div>
        </div>
        <div class = 'stat-column'>
          <div class='stat' data-stat='attack'>
            <div class='stat-img attack'></div>
            <div class='stat-value'>${m.totalStat('attack')}</div>
          </div>
          <div class='stat' data-stat='defence'>
            <div class='stat-img defence'></div>
            <div class='stat-value'>${m.totalStat('defence')}</div>
          </div>
        </div>
        <div class = 'stat-column'>
          <div class='stat' data-stat='spellPower'>
            <div class='stat-img spell-power'></div>
            <div class='stat-value'>${m.totalStat('spellPower')}</div>
          </div>
          <div class='stat' data-stat='spellResistance'>
            <div class='stat-img spell-resistance'></div>
            <div class='stat-value'>${m.totalStat('spellResistance')}</div>
          </div>
        </div>
        <div class = 'stat-column'>
          <div class='stat' data-stat='initiative'>
            <div class='stat-img initiative'></div>
            <div class='stat-value'>${m.totalStat('initiative')}</div>
          </div>
          <div class='stat' data-stat='movement'>
            <div class='stat-img movement'></div>
            <div class='stat-value'>${m.totalStat('movement')}</div>
          </div>
        </div>
        <div class = 'stat-column'>
          <div class='stat' data-stat='apr'>
            <div class='stat-img apr'></div>
            <div class='stat-value'>${m.totalStat('apr')}</div>
          </div>
          <div class='stat' data-stat='tpr'>
            <div class='stat-img tpr'></div>
            <div class='stat-value'>${m.totalStat('tpr')}</div>
          </div>
        </div>
        <div class = 'stat-column'>
          <div class='stat' data-stat='damage'>
            <div class='stat-img damage'></div>
            <div class='stat-value'>${m.totalStat('damage')}</div>
          </div>
        </div>

        <section id='stat-description'></section>
        <section id='active-abilities'>Active Abilities <br></section>
        <section id='passive-abilities'>Passive Abilities <br></section>
        <section id='trigger-abilities'>Trigger Abilities <br></section>
        <section id='active-effects'>Active Effects <br></section>
        <section id='details'></section>
      </div>`;
      tag.querySelector('.stat-img.health').appendChild(health.canvas);
      tag.querySelector('.stat-img.mana').appendChild(mana.canvas);
      tag.querySelector('.stat-img.attack').appendChild(attack.canvas);
      tag.querySelector('.stat-img.defence').appendChild(defence.canvas);
      tag.querySelector('.stat-img.spell-power').appendChild(spellPower.canvas);
      tag.querySelector('.stat-img.spell-resistance').appendChild(spellResistance.canvas);
      tag.querySelector('.stat-img.initiative').appendChild(initiative.canvas);
      tag.querySelector('.stat-img.movement').appendChild(movement.canvas);
      tag.querySelector('.stat-img.apr').appendChild(apr.canvas);
      tag.querySelector('.stat-img.tpr').appendChild(tpr.canvas);
      tag.querySelector('.stat-img.damage').appendChild(damage.canvas);

      m.actives.forEach(a => {
        var c = a.sprite.canvas.clone();
        c.addEventListener('click', e => {
          this.drawAbilityStats(a, tag.querySelector('#details'))
        })
        tag.querySelector('#active-abilities').appendChild(c);
      })
      m.triggers.forEach(a => {
        var c = a.sprite.canvas.clone();
        c.addEventListener('click', e => {
          this.drawAbilityStats(a, tag.querySelector('#details'))
        })
        tag.querySelector('#trigger-abilities').appendChild(c);
      })
      m.passives.forEach(a => {
        var c = a.sprite.canvas.clone();
        c.addEventListener('click', e => {
          this.drawAbilityStats(a, tag.querySelector('#details'))
        })
        tag.querySelector('#passive-abilities').appendChild(c);
      })

      m.activeEffects.forEach(e => {
        console.log('active effect', e)
      })
      m.passives.forEach(a => {
        console.log(a)
        if(a.stats.targetFamily != 'self') return;
        // if(!a.owner.abilityConditionMet(a)) return;
        var c = a.sprite.canvas.clone();
        c.addEventListener('click', e => {
          this.drawEffectStats({ability: a, power: a.power}, tag.querySelector('#details'));
        })
        tag.querySelector('#active-effects').appendChild(c);
      })

      tag.addEventListener('click', e => {
        if(e.target.classList.contains('stat')) {
          let d = tag.querySelector('#stat-description');
          let stat = e.target.dataset.stat;
          let bd = m.statBonus(stat);
          d.innerHTML = `<div>${names[stat]}: base ${bd.base} + effects ${bd.combined.total} + circumstantial ${bd.circumstance}</div>
          Blessing: ${bd.combined.blessingName} ${bd.combined.blessing.value}, Curse: ${bd.combined.curseName} ${bd.combined.curse.value}`;
        }
      })

      popup.appendChild(tag)
    }

    drawEffectStats(e, tag) {
      let a = e.ability;
      let {source, attribute, element, minPower,
        maxPower, multiplier, resourceCost, resourceType,
        range, effect, duration
      } = a.stats;
      tag.style.whiteSpace = 'pre-line';
      let {activation, type, name} = a.bio;
      let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
      attribute = source == 'spell' || source == 'attack' ? 'health' : attribute;
      let time = type == 'passive' ? 'permanent' : `${e.rounds}/${duration} rounds`;
      var text = `<span class='bold'>Name</span>: ${name}
      <span class='bold'>Source</span>: ${source}
      <span class='bold'>Element</span>: ${element}
      <span class='bold'>Duration</span>: ${time}
      <span class='bold'>Effect</span>: ${e.power} to ${attribute}`;

      tag.innerHTML = text;
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
