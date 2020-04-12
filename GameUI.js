var ID = 1;
const Lobby = require('Lobby.js');
const View = require('View.js');
const Component = require('Component.js');
const Sprite = require('Sprite.js');
const MonsterCard = require('MonsterCard.js');
const Match = require('Match.js');
const Gauntlet = require('Gauntlet.js');
const UnitPlacement = require('UnitPlacement.js');
const SoundPlayer = require('SoundPlayer.js');
const sp = new SoundPlayer();
const icons = require('icons.js');
const teamSelect = new Component(false, 'team-select');
const match = new Component(false, 'match');
const battle = new Component(false, 'battle');
const unitPlacement = new Component(false, 'unit-placement');
const waitingRoom = new Component(false, 'waiting-room');
const teamView = new Component(false, 'team-view');
const gauntlet = new Component(false, 'gauntlet');
const adventure = new Component(false, 'adventure');
const defeat = new Component(false, 'adventure-defeat');
const levelUp = new Component(false, 'level-up');
defeat.tags.outer.addEventListener('click', e => defeat.trigger('done'));
defeat.append(html`<div class='message'>
  Your whole army has been wiped out by the enemy.
</div>`);
class GameUI extends Component {
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

      .component.team-select, .component.battle, .component.unit-placement {
        background: url(Hell2.jpg);
        background-size: cover;
        background-repeat: no-repeat;
        width: 100%;
        height: 100%;
      }

      .component.battle #battle-canvas {
        position: absolute;
        left: 50%;
        top: 50px;
        display: block;
        transform: translateX(-50%);
        width: 630px;
        height: 504px;
      }

      .component.adventure {
        background-color: black;
        position: relative;
        width: 100%;
        height: 100%;
      }

      .component.adventure .load-list {
        width: 800px;
        height: 800px;
        position: relative;
        top: 50%;
        left: 50%;
        transform: translate(-50%,-50%);
        background-image: url(sheet_of_old_paper.png);
        padding: 20px;
        border-radius: 20px;
      }

      .component.adventure .load-list .save-file {
        padding: 10px;
      }
      .component.adventure .load-list .save-file:hover {
        background-color: rgba(0,0,0,0.1);
      }

      .component.adventure-defeat {
        background-image: url(defeat.jpg);
        width: 100%;
        height: 100%;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        background-color: black;
        opacity: 1;
        transition: opacity 5s ease 2s;
      }

      .component.adventure-defeat .message {
        width: 100%;
        font-size: 48px;
        text-align: center;
        color: white;
        padding-top: 30%;
      }

      .component.battle #battle-canvas canvas {
        position: absolute;
        top: 0px;
        display: block;
      }

      .component.battle #battle-menu {
        position: absolute;
      }

      .component.battle #battle-menu .buttons {
        display: inline-block;
      }

      .component.battle #battle-menu canvas {
        position: static;
        display: inline-block;
      }

      #board-damage-preview {
        position: absolute;
        display: inline-block;
        padding: 4px;
        background-image: url(sheet_of_old_paper.png);
        background-repeat: no-repeat;
        overflow: visible;
        border-radius: 2px;
        z-index: 1000;
        box-shadow: 0px 0px 5px 1px rgba(0,0,0,0.75);
        font-weight: 600;
        white-space: nowrap;
      }
      #board-damage-preview span span {
        font-size: 0.8em;
        font-weight: 400;
      }
      .ability-card {
        display: inline-block;
      }
      ${MonsterCard.style}
    </style>`;
  }

  constructor() {
    super(true);
    this.addStyle(Match.style);
    this.addStyle(Gauntlet.style);
    this.addStyle(UnitPlacement.style);
    this.id = ++ID;
    this.lobby = new Lobby(this);
    this.lobby.render();
    this.views = [
      new View('lobby', this.lobby),
      new View('team select', teamSelect),
      new View('match', match),
      new View('battle', battle),
      new View('unit placement', unitPlacement),
      new View('waiting room', waitingRoom),
      new View('team view', teamView),
      new View('gauntlet', gauntlet),
      new View('adventure', adventure),
      new View('adventure defeat', defeat),
      new View('level up', levelUp)
    ];
    this.inView = null;
    this.cursor = new Sprite(icons.find(i => i.bio.name == 'Ability Cursor').bio.sprite);
  }

  get component() {
    return this.inView.item;
  }

  showWaitingRoom() {
    this.show('waiting room');
  }

  showLobby() {
    this.show('lobby');
  }

  showTeamSelect() {
    this.show('team select');
  }

  showUnitPlacement() {
    this.show('unit placement');
  }

  showBattle() {
    this.show('battle');
  }

  showMatch() {
    this.show('match');
  }

  hideTeamSelect() {

  }

  get inner() {
    return this.inView.item.inner || this.container;
  }

  get selectContainer() {
    return this.views[1].tag;
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
    if(name == 'lobby') {
      sp.play('lobby_theme');
      sp.fadeIn('lobby_theme');
    } else {
      sp.fadeOut('lobby_theme');
    }
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

module.exports = GameUI;
