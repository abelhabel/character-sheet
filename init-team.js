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


Module.onLoad(['DungeonCrawl_ProjectUtumnoTileset.png', 'Hell2.jpg',
'mythical_card.jpg', 'outlaws_card.jpg', 'undead_card.jpg', 'beasts_card.jpg', 'order_of_idun_card.jpg', 'aloysias_chosen_card.jpg', 'demons_card.jpg',
'guid.js',
  'monsters.js','teams.js', 'abilities.js', 'icons.js', 'arenas.js', 'matches.js', 'gauntlets.js',
  'FixedList.js', 'Component.js', 'View.js', 'Canvas.js', 'Sprite.js', 'CompositeSprite.js', 'CardList.js', 'Menu.js', 'Arena.js',
'AbilityEffect.js', 'Ability.js', 'Monster.js', 'MonsterCard.js', 'TeamViewer.js', 'Team.js', 'TeamSelect.js', 'Match.js', 'Gauntlet.js'], () => {
  const TeamSelect = require('TeamSelect.js');
  const Component = require('Component.js');
  const View = require('View.js');
  const MonsterCard = require('MonsterCard.js');
  const Menu = require('Menu.js');
  const Match = require('Match.js');
  const Gauntlet = require('Gauntlet.js');
  const Sprite = require('Sprite.js');
  const CardList = require('CardList.js');
  const monsters = require('monsters.js');
  const teams = require('teams.js');
  const matches = require('matches.js');
  const gauntlets = require('gauntlets.js');
  const icons = require('icons.js');
  function exportTeam(team) {
    let id = '';
    let url = 'saveTeam';
    if(id) {
      url += '?id=' + id;
    }
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(team)
    })
    .then(res => res.text())
    .then(id => {
      team.id = id;
      teams.push(team);
      console.log('saved team', id)
    })
  }
  function exportGauntlet(gauntlet) {
    let id = gauntlet.id || '';
    let url = 'saveGauntlet';
    if(id) {
      url += '?id=' + id;
    }
    let body = {
      name: gauntlet.name,
      matchIds: gauntlet.matches.map(m => m.id)
    };
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    .then(res => res.text())
    .then(id => {
      body.id = id;
      gauntlets.push(body);
      console.log('saved team', id)
    })
  }
  function exportMatch(match) {
    let body = {
      settings: match.settings.settings,
      arena: match.arena.arena.id,
      teams: [
        {
          actor: match.team1.actor,
          team: match.team1.team
        },
        {
          actor: match.team2.actor,
          team: match.team2.team
        }
      ]
    };
    console.log('match to save', body)
    let id = match.id || '';
    let url = 'saveMatch';
    if(id) {
      url += '?id=' + id;
    }
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    .then(res => res.text())
    .then(id => {
      body.id = id;
      matches.push(body)
      console.log('saved match', id)
    })
  }
  var ID = 0;
  class UI extends Component {
    style() {
      return html`<style>
        * {
          cursor: url(${this.cursor.canvas.toDataURL('image/png')}), auto;
        }
        .gameui {
          position: fixed;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          top: 0px;
          left: 0px;
        }
        .gameui-inner {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .component.team-select {
          background: url(Hell2.jpg);
          background-size: cover;
          background-repeat: no-repeat;
          width: 100%;
          height: 100%;
        }

        ${MonsterCard.style}
      </style>`;
    }

    constructor() {
      super(true);
      this.addStyle(Match.style);
      this.addStyle(Gauntlet.style);
      this.id = ++ID;
      this.views = [
        new View('menu', new Component(false, 'menu')),
        new View('team select', new Component(false, 'team-select')),
        new View('match', new Component(false, 'match')),
        new View('gauntlet', new Component(false, 'gauntlet')),
        new View('match select', new Component(false, 'match select')),
      ];
      this.inView = null;
      this.cursor = new Sprite(icons.find(i => i.bio.name == 'Ability Cursor').bio.sprite);
    }

    get inner() {
      return this.inView.item.inner || this.container;
    }

    get selectContainer() {
      return this.views[0].tag;
    }

    get container() {
      return this.inView.tag;
    }

    append(tag) {
      this.container.appendChild(tag);
    }

    remove(tag) {
      try {
        this.container.removeChild(tag)
      } catch (e) {
        console.log('tag not child of parent')
      }
    }

    show(name) {
      this.inView = this.views.find(v => v.name == name);
      this.update();
    }

    clear(name) {
      let view = this.views.find(v => v.name == name);
      if(!view) return;
      view.clear();
    }

    update() {
      if(!this.inView) {
        this.inView = this.views[0];
      }
      this.tags.inner.innerHTML = '';
      this.tags.inner.appendChild(this.inView.tag);
    }

    render() {
      this.tags.outer.className = 'gameui';
      let shadow = this.shadow;
      let style = this.style();
      let inner = html`<div class='gameui-inner'></div>`;
      this.tags.inner = inner;
      shadow.appendChild(style);
      shadow.appendChild(inner);
      document.body.appendChild(this.tags.outer);
      this.update();
    }
  }

  let ui = new UI();
  ui.render();

  function openTeamSelect(cash = 600, max = 8) {
    ui.show('team select');
    return new Promise((resolve, reject) => {
      new TeamSelect(monsters, ui.container, 42, 42, cash, max, [''], resolve, reject);
    })
    .then(team => {
      console.log('team', team);
      return exportTeam(team)
    })
    .catch(err => {
      console.log('err', err)
    })
    .then(() => {
      ui.clear('team select');
      ui.show('menu');
    });
  }

  function openMatch() {
    ui.show('match');
    return new Promise((resolve, reject) => {
      let m = new MatchEditor(ui);
      m.on('done', resolve);
      m.on('close', reject);
      m.render();
    })
    .then(match => {
      console.log(match)
      return exportMatch(match);
    })
    .catch(err => {
      console.log(err)
    })
    .then(() => {
      ui.clear('match');
      ui.show('menu');
    });
  }

  class ImportSection extends Match.MatchSection {
    constructor(match) {
      super('Import', match);
    }

    render() {
      let outer = this.outer();
      let inner = outer.querySelector('.section-content');
      let select = html`<select>
        <option></option>
      </select>`;
      let next = html`<button id='next'>Next</button>`;
      inner.appendChild(select);
      inner.appendChild(next);
      matches.forEach(m => {
        let selected = this.id == m.id ? 'selected="selected"' : '';
        select.appendChild(html`<option value='${m.id}' ${selected}>${m.id}</option>`);
      });
      next.addEventListener('click', e => this.match.importNext());
      select.addEventListener('change', e => {
        this.match.import(matches.find(m => m.id == select.value));
      })
      return outer;
    }
  }

  class MatchEditor extends Match {
    constructor(ui) {
      super(ui);
      this.id = '';
      this.imports = new ImportSection(this);
    }

    importNext() {
      let current = matches.findIndex(m => m.id == this.id);
      let next = current == matches.length - 1 ? 0 : current + 1;
      this.import(matches[next]);
    }

    import(match) {
      this.id = match.id;
      this.team1.import(match.teams[0]);
      this.team2.import(match.teams[1]);
      this.arena.import(match.arena);
      this.settings.import(match.settings);
      this.clear();
      this.render();
    }

    render() {
      Match.prototype.render.call(this);
      this.tags.outer.appendChild(this.imports.render())
    }
  }

  class GauntletEditor extends Gauntlet {
    constructor(matches, menuItems) {
      super('', matches, menuItems);
      this.id = '';
    }

    import(g) {
      this.id = g.id;
      this.name = g.name;
      this.matches = g.matchIds.map(id => Match.create(matches.find(m => m.id == id)));
      this.clear();
      this.render();
    }

    move(matchId, dir) {
      let index = this.matches.findIndex(m => m.id == matchId);
      if(!~index) return;
      let m = this.matches[index];
      if(dir < 0) {
        if(!index) return;
        let t = this.matches[index-1];
        this.matches[index-1] = m;
        this.matches[index] = t;
      } else if(dir > 0) {
        if(index == this.matches.length -1) return;
        let t = this.matches[index + 1];
        this.matches[index + 1] = m;
        this.matches[index] = t;
      }
      this.clear();
      this.render();
    }

    render() {
      let c = this.shadow;
      c.appendChild(html`<div>
        <input id='gauntlet-name' type='text' value='${this.name}'>
        <select id='library'>
          <option></option>
        </select>
        <span id='current'>${this.id}</span>
      </div>`);
      let select = c.querySelector('#library');
      let input = c.querySelector('#gauntlet-name');
      let current = c.querySelector('#gauntlet-name');
      gauntlets.forEach(g => {
        console.log(this.id, g.id)
        let selected = this.id == g.id ? 'selected="selected"' : '';
        if(selected) current.textContent
        select.appendChild(html`<option value='${g.id}' ${selected}>${g.name}</option>`);
      })
      select.addEventListener('change', e => {
        this.import(gauntlets.find(g => g.id == select.value));
      })
      input.addEventListener('keyup', e => {
        this.name = c.querySelector('#gauntlet-name').value;
      })
      this.matches.forEach((m, i) => {
        let t = m.renderStage('available', i);
        let move = false;
        let sx = 0, sy = 0;
        t.addEventListener('contextmenu', e => {
          e.preventDefault();
          this.removeMatch(m.id);
          this.clear();
          this.render();
        })
        t.addEventListener('mousedown', e => {
          move = true;
          sx = e.offsetX; sy = e.offsetY;
        });
        t.addEventListener('mouseup', e => {
          move = false;
        });
        t.addEventListener('mousemove', e => {
          if(!move) return;
          let d = e.offsetX - sx;
          if(d < -10 || d > 10) {
            this.move(m.id, d);
          }
        })
        c.appendChild(t);
      })
      if(this.menuItems) {
        let menu = new Menu(this.menuItems);
        this.append(menu.render());
      }
      return this.tags.outer;
    }
  }

  function openGauntlet() {
    ui.show('gauntlet');
    return new Promise((resolve, reject) => {
      let menu = [
        {
          text: 'Add Match',
          fn: () => {
            ui.show('match select');
            let selected = []
            let cards = matches.map((m, i) => {
              let match = Match.create(m, ui);
              let stage = match.renderStage('available', i);
              stage.addEventListener('click', (e) => {
                selected.push(match);
                if(e.shiftKey) {
                  return;
                }
                list.clear();
                ui.show('gauntlet');
                selected.forEach(s => g.addMatch(s));
                g.clear();
                g.render();
              })
              return stage;
            });
            let list = new CardList(cards);
            ui.append(list.render());
            console.log(ui)
            // m.addMatch()
          }
        },
        {
          text: 'Save',
          fn: () => {
            exportGauntlet(g)
            .then(() => {
              ui.clear('gauntlet');
              ui.show('menu');
            });
          }
        },
        {
          text: 'Back',
          fn: reject
        },

      ];
      let g = new GauntletEditor([], menu);
      ui.append(g.render());
    })
    .then(match => {
      console.log(match)
      return exportGauntlet(match);
    })
    .catch(err => {
      console.log(err)
    })
    .then(() => {
      ui.clear('gauntlet');
      ui.show('menu');
    });
  }

  let menu = new Menu([
    {
      text: 'New Team',
      fn: () => openTeamSelect()
    },
    {
      text: 'New Match',
      fn: () => openMatch()
    },
    {
      text: 'New Gauntlet',
      fn: () => openGauntlet()
    }
  ]);
  let menuTag = menu.render();
  ui.inView.tag.appendChild(menuTag);

})
