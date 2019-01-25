const arenas = require('arenas.js');
const monsters = require('monsters.js');
const TeamSelect = require('TeamSelect.js');
class MatchSection {
  constructor(name, match) {
    this.name = name;
    this.match = match;
  }

  set(name, val) {
    this[name] = val;
  }

  outer() {
    let outer = html`<div class='section ${this.name.toLowerCase()}-section'>
      <div class='inner'>
        <div class='section-name'>${this.name}</div>
        <div class='section-content'></div>
      </div>
    </div>`;
    return outer;
  }
}

class ArenaSelect {
  constructor(arena, onDone) {
    this.selected = arena || arenas[0];
    this.onDone = onDone;
    this.tag = null;
  }

  select(arena) {
    this.selected = arena;
    this.onDone(arena);
  }

  update() {
    arenas.forEach(a => {
      let tag = this.tag.querySelector(`#${this.selected.id}`);
      if(a.id == this.selected.id) {
        tag.classList.remove('selected');
      } else {
        tag.classList.add('selected');
      }
    });
  }

  render() {
    let outer = html`<div class='arena-select'></div>`;
    arenas.forEach(a => {
      let img = new Image();
      img.id = a.id;
      img.src = a.png;
      img.addEventListener('click', e => this.select(a));
      outer.appendChild(img);
    });
    this.tag = outer;
    return outer;
  }
}
class ArenaSection extends MatchSection {
  constructor(match) {
    super('Arena', match);
    this.arena = arenas[0];
    this.tag = null;
  }

  updateArena() {
    this.preview.src = this.arena.png;
  }

  selectArena(a) {
    this.arena = a;
    this.updateArena();
  }

  openArenaSelect() {
    let as = new ArenaSelect(this.arena, (a) => {
      this.tag.parentNode.removeChild(as.tag);
      this.selectArena(a);
    });
    this.tag.parentNode.appendChild(as.render());
  }

  get preview() {
    return this.tag.querySelector('img');
  }

  render() {
    let outer = this.outer();
    let inner = outer.querySelector('.section-content');
    let preview = new Image();
    preview.src = this.arena.png;
    inner.addEventListener('click', e => this.openArenaSelect())
    inner.appendChild(preview);
    this.tag = outer;
    return outer;
  }
}

class TeamSection extends MatchSection {
  constructor(match) {
    super('Team', match);
    this.team = null;
    this.actor = 'human';
    this.tag = null;
  }

  onDone(team) {
    this.team = team;
    this.onClose();
    this.updateTeam();
  }

  onClose() {
    let ts = document.body.querySelector('#team-select-container');
    document.body.removeChild(ts);
    this.match.show();
  }

  openTeamSelect() {
    this.match.hide();
    let container = html`<div id='team-select-container'
    style='position: absolute;
    left: 0px;
    top: 0px;
    z-index: 10;
    width: 100%;
    text-align: center;
    background-color: #2d5f75;'
    ></div>`;
    let cash = Number(this.match.settings.settings.cash);
    let max = Number(this.match.settings.settings.maxMonsters)
    let ts = new TeamSelect(monsters, container, 42, 42, cash, max, ['team1'], (t) => this.onDone(t), () => this.onClose());
    document.body.appendChild(container);
  }

  updateTeam() {
    if(!this.team) return;
    let content = this.tag.querySelector('.team-preview');
    content.innerHTML = '';
    this.team.monsters.forEach(m => {
      m.sprite.drawStack(m.stacks);

      content.appendChild(m.canvas.clone());
    })
  }

  render() {
    let outer = this.outer();
    let content = outer.querySelector('.section-content');
    let select = html`<div>
      <span>Actor: </span>
      <select>
        <option value='human'>Human</option>
        <option value='AI - level 1'>AI - level 1</option>
        <option value='AI - level 2'>AI - level 2</option>
      </select>
      <div class='team-preview'></div>
      <div class='button'>Select Team</div>
    </div>`;
    let actor = select.querySelector('select');
    actor.addEventListener('click', e => this.set('actor', actor.value));
    select.querySelector('.button')
    .addEventListener('click', e => this.openTeamSelect());
    content.appendChild(select);
    this.tag = outer;
    this.updateTeam();
    return outer;
  }
}

class ControlsSection extends MatchSection {
  constructor(match) {
    super('Controls', match);
    this.tag = null;
  }

  onDone() {
    let {team1, team2} = this.match;
    if(team1.team && team1.team.units.length && team2.team && team2.team.units.length) {
      return this.match.onDone();
    }
    this.tag.querySelector('.info').textContent = 'To start the game, you have to select monsters for both teams.';
  }

  onCancel() {
    this.match.onCancel();
  }

  render() {
    let outer = this.outer();
    let content = outer.querySelector('.section-content');
    let start = html`<div class='button'>Start Game</div>`;
    let cancel = html`<div class='button'>Cancel</div>`;
    let info = html`<div class='info'></div>`;
    start.addEventListener('click', e => this.onDone());
    cancel.addEventListener('click', e => this.onCancel());
    content.appendChild(start);
    content.appendChild(cancel);
    content.appendChild(info);
    this.tag = outer;
    return outer;
  }
}

class SettingsSection extends MatchSection {
  constructor(match) {
    super('Settings', match);
    this.settings = {
      mode: 'standard',
      cash: 600,
      time: '5 min',
      playByPost: false,
      maxMonsters: 8
    };
    this.tag = null;
  }

  update(name, val) {
    this.settings[name] = val;
  }

  render() {
    let outer = this.outer();
    let content = outer.querySelector('.section-content');
    let s = html`<div>
      <div class='setting'>
        <span>Mode</span>
        <select id='mode'>
          <option value='standard'>Standard</option>
          <option value='portal'>Portal</option>
        </select>
      </div>
      <div class='setting'>
        <span>Cash</span>
        <select id='cash'>
          <option value='600'>600</option>
          <option value='1200'>1200</option>
          <option value='2400'>2400</option>
          <option value='4800'>4800</option>
        </select>
      </div>
      <div class='setting'>
        <span>Time</span>
        <select id='time'>
          <option value='5min'>5min</option>
          <option value='10min'>10min</option>
          <option value='15min'>15min</option>
          <option value='20min'>20min</option>
        </select>
      </div>
      <div class='setting'>
        <label for='play-by-post'>Play by Post</label>
        <input id='play-by-post' type='checkbox'>
      </div>
      <div class='setting'>
        <label for='max-monsters'>Max Monsters</label>
        <input id='max-monsters' type='number' min='4' max='20' value='${this.settings.maxMonsters}'>
      </div>
    </div>`;
    let mode = s.querySelector('#mode');
    mode.addEventListener('change', e => this.update('mode', mode.value));
    let cash = s.querySelector('#cash');
    cash.addEventListener('change', e => this.update('cash', cash.value));
    let time = s.querySelector('#time');
    time.addEventListener('change', e => this.update('time', time.value));
    let maxMonsters = s.querySelector('#max-monsters');
    maxMonsters.addEventListener('change', e => this.update('maxMonsters', maxMonsters.value));
    content.appendChild(s);
    this.tag = outer;
    return outer;
  }
}

class Match {
  constructor(onDone, onCancel) {
    this.onDone = onDone;
    this.onCancel = onCancel;
    this.mode = 'standard'; //standard, portal mayhem
    this.team1 = new TeamSection(this);
    this.team2 = new TeamSection(this);
    this.arena = new ArenaSection(this);
    this.settings = new SettingsSection(this);
    this.controls = new ControlsSection(this);
  }

  static get style() {
    return html`<style>
      * {
        box-sizing: border-box;
      }
      .button {
        display: inline-block;
        padding: 12px 8px;
        text-transform: uppercase;
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        border-radius: 4px;
        cursor: pointer;
        margin: 4px;
      }
      .button:hover {
        background-color: #2d5f75;
      }
      .section {
        width: 240px;
        height: 240px;
        display: inline-block;
        vertical-align: top;
        margin: 3px;
        box-shadow: 1px 1px 1px 0px rgba(0,0,0,0.5);
      }
      .inner {
        height: 100%;
        padding: 6px;
        border: 3px solid #9c8417;
        outline: 1px solid #b99947;
        outline-offset: -2px;
      }
      .section-name {
        height: 16%;
      }
      .section-content {
        position: relative;
        height: 84%;
      }
      .arena-section .section-content {
        text-align: center;

      }
      .arena-select {
        position: fixed;
        width: 800px;
        height: 800px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        padding: 20px;
        background-color: black;
        border: 4px solid white;
        z-index: 5000;
      }
      .arena-section img {
        width: auto;
        max-height: 100%;
        max-width: 100%;
      }
      .arena-select img:hover {
        border: 2px solid white;
      }
      .section-name {
        font-size: 24px;
        text-align: center;
        font-weight: bold;
      }
      .setting {
        height: 30px;
        line-height: 30px;
      }

      select {
        background-color: transparent;
        outline: none;
        border: none;
        border-bottom: 1px solid black;
      }
    </style>`;
  }

  show() {
    this.tag.style.display = 'inline-block';
  }

  hide() {
    this.tag.style.display = 'none';
  }

  done() {
    this.onDone();
  }

  render(container) {
    let outer = html`<div id='match' style='background-image: url(sheet_of_old_paper_horizontal.png); padding: 10px;border-radius:10px;display: inline-block; left: 50%;top:50%;transform:translate(-50%,-50%);position: relative;z-index: 4000;'></div>`;
    let shadow = outer.attachShadow({mode: 'open'});
    let arena = this.arena.render();
    let team1 = this.team1.render();
    let team2 = this.team2.render();
    let settings = this.settings.render();
    let startGame = this.controls.render();
    shadow.appendChild(Match.style);
    shadow.appendChild(arena);
    shadow.appendChild(team1);
    shadow.appendChild(team2);
    shadow.appendChild(settings);
    shadow.appendChild(startGame);
    this.tag = outer;
    container.appendChild(outer);
  }

}

module.exports = Match;
