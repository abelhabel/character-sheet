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
  'monsters.js','teams.js', 'abilities.js', 'icons.js', 'arenas.js',
  'FixedList.js', 'Component.js', 'View.js', 'Canvas.js', 'Sprite.js', 'CompositeSprite.js', 'Menu.js', 'Arena.js',
'AbilityEffect.js', 'Ability.js', 'Monster.js', 'MonsterCard.js', 'TeamViewer.js', 'Team.js', 'TeamSelect.js', 'Match.js'], () => {
  const TeamSelect = require('TeamSelect.js');
  const Component = require('Component.js');
  const View = require('View.js');
  const MonsterCard = require('MonsterCard.js');
  const Menu = require('Menu.js');
  const Match = require('Match.js');
  const Sprite = require('Sprite.js');
  const monsters = require('monsters.js');
  const teams = require('teams.js');
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
    let id = '';
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
      this.id = ++ID;
      this.views = [
        new View('menu', new Component(false, 'menu')),
        new View('team select', new Component(false, 'team-select')),
        new View('match', new Component(false, 'match')),
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
      let m = new Match(ui, resolve, reject);
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

  let menu = new Menu([
    {
      text: 'New Team',
      fn: () => openTeamSelect()
    },
    {
      text: 'New Match',
      fn: () => openMatch()
    }
  ]);
  let menuTag = menu.render();
  ui.inView.tag.appendChild(menuTag);

})
