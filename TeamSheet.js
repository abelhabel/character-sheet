const Component = require('Component.js');
const Monster = require('Monster.js');
class TeamSheet extends Component {
  constructor(team) {
    super(true);
    this.team = team;
    this.selected = null;
  }

  static get style() {
    return html`<style>
      .team-units {
        background-image: url(sheet_of_old_paper.png);
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 10px;
      }
      .close {
        position: absolute;
        right: 10px;
        top: 10px;
        font-weight: bold;
      }
      .close:hover {
        color: gray;
      }
    </style>`;
  }

  selectMonster(m) {
    this.selected = m;
    this.render();
  }

  render() {
    this.clear();
    this.addStyle(Monster.csStyle);
    this.addStyle(TeamSheet.style);
    this.tags.outer.classList.add('team-sheet');
    let units = html`<div class='team-units'>
      <div class='close'>Close</div>
    </div>`;
    units.querySelector('.close').addEventListener('click', e => {
      this.unmount();
    })
    this.team.monsters.forEach((m, i) => {
      m.sprite.drawStack(m.stacks);
      m.canvas.addEventListener('click', () => this.selectMonster(m));
      units.appendChild(m.canvas);
    });
    this.append(units);
    if(this.selected) {
      let sheet = html`<div class='team-unit-cs'></div>`;
      let monster = this.selected;
      monster.drawMonsterCS(sheet, () => this.selectMonster(null), (c, s) => this.team.upgradeStats(monster, c, s));
      this.append(sheet);
    }
    return this.tags.outer;
  }
}

module.exports = TeamSheet;
