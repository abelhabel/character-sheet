var ID = 1;
const Lobby = require('Lobby.js');
const View = require('View.js');
const Component = require('Component.js');
const Sprite = require('Sprite.js');
const MonsterCard = require('MonsterCard.js');
const icons = require('icons.js');
const teamSelect = new Component();
const match = new Component();
const battle = new Component();
const unitPlacement = new Component();
const waitingRoom = new Component();
waitingRoom.shadow.appendChild(html`<div>Waiting for other player to pick team...</div>`);
teamSelect.addStyle(html`<style>${MonsterCard.style}</style>`);
match.addStyle(html`<style>
  #match {
    background-image: url(sheet_of_old_paper_horizontal.png);
    padding: 10px;
    border-radius:10px;
    display: inline-block;
    left: 50%;
    top:50%;
    transform:translate(-50%,-50%);
    position: absolute;
    z-index: 4000;
  }
</style`);
// teamSelect.shadow.appendChild(html`<div>TEAM SELECT</div>`);
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
        height: 0px;
      }
      .gameui-inner {
        position: absolute;
        width: 100%;
        height: 100%;
      }
    </style>`;
  }

  constructor() {
    super();
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
    ];
    this.inView = null;
    this.cursor = new Sprite(icons.find(i => i.bio.name == 'Ability Cursor').bio.sprite);
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
    return this.views[1].tag.shadowRoot;
  }

  get container() {
    return this.inView.tag.shadowRoot;
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

  show(view) {
    this.inView = this.views.find(v => v.name == view);
    this.update();
  }

  update() {
    if(!this.inView) {
      this.inView = this.views[0];
    }
    console.log('update game ui', this.inView.name)
    this.tags.inner.innerHTML = '';
    console.log(this.inView)
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
