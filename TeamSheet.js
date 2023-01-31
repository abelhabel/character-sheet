const Component = require('Component.js');
const Monster = require('Monster.js');
class TeamSheet extends Component {
  constructor(team) {
    super(true);
    this.team = team;
    this.selected = team.monsters[0];
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
    let f = new Component.Fragment();
    f.append(Monster.csStyle);
    f.append(TeamSheet.style);
    this.tags.outer.classList.add('team-sheet');
    let units = html`<div class='team-units'>
      <div class='close'>Close</div>
    </div>`;
    f.append(units);
    f.listen('.close', 'click', e => {
      this.trigger('close');
    })
    this.team.monsters.forEach((m, i) => {
      m.sprite.drawStack(m.stacks);
      m.canvas.addEventListener('click', () => this.selectMonster(m));
      f.appendIn('.team-units', m.canvas);
    });
    if(this.selected) {
      let sheet = new Component(false, 'team-unit-cs');
      let monster = this.selected;
      let unit = this.team.units.find(u => monster.suuid == u.suuid);
      let onClose = () => this.selectMonster(null);
      let levelUp = (stat, spent) => unit.upgradeStats(stat, spent);
      let cs = monster.drawMonsterCS();
      cs.on('close', onClose);
      sheet.append(cs);
      sheet.append(unit.drawLevelUp((commits, spent) => {
        levelUp(commits, spent);
        this.render();
      }));
      f.append(sheet);
    }
    this.append(f);
    return this.tags.outer;
  }
}

module.exports = TeamSheet;
