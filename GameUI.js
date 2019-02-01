var ID = 1;
const Lobby = require('Lobby.js');
const View = require('View.js');
const Component = require('Component.js');
const Sprite = require('Sprite.js');
const MonsterCard = require('MonsterCard.js');
const icons = require('icons.js');
const teamSelect = new Component();
const battle = new Component();
const unitPlacement = new Component();
teamSelect.addStyle(html`<style>${MonsterCard.style}</style>`);

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
    this.lobby = new Lobby();
    this.lobby.render();
    this.showing = 'lobby';
    this.views = [
      new View('lobby', this.lobby),
      new View('team select', teamSelect),
      new View('battle', battle),
      new View('unit placement', unitPlacement)
    ];
    this.inView = null;
    this.cursor = new Sprite(icons.find(i => i.bio.name == 'Ability Cursor').bio.sprite);
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

  hideTeamSelect() {

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
