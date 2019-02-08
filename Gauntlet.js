const Component = require('Component.js');
const Menu = require('Menu.js');
const Match = require('Match.js');
const guid = require('guid.js');
const matches = require('matches.js');
class Gauntlet extends Component {
  constructor(name, matches, menuItems) {
    super(false, 'gauntlet');
    this.name = name || 'Skirmishes';
    this.matches = matches;
    this.menuItems = menuItems;
    this.completed = [];
  }

  static create(g, menuItems) {
    let ms = g.matchIds.map(id => Match.create(matches.find(m => m.id == id)));
    let gauntlet = new Gauntlet(g.name, ms, menuItems);
    gauntlet.id = g.id;
    return gauntlet;
  }

  completeStage(matchId) {
    if(!this.matches.find(m => m.id == matchId)) return;
    if(~this.completed.indexOf(matchId)) return;
    this.completed.push(matchId);
  }

  addMatch(match) {
    if(!this.matches.find(m => m.id == match.id)) {
      this.matches.push(match);

    }
  }

  removeMatch(matchId) {
    let index = this.matches.findIndex(m => m.id == matchId);
    if(!~index) return;
    this.matches.splice(index, 1);
  }

  static get style() {
    return html`<style>
      .gauntlet {
        width: 100%;
        height: 100%;
        background-image: url(sheet_of_old_paper.png);
        background-size: contain;
        padding: 10px;
      }
      .gauntlet-inner {
        width: 100%;
        height: 100%;
      }
      .gauntlet-inner * {
        vertical-align: top;
      }
      .stage {
        user-select: none;
        position: relative;
        display: inline-block;
        width: 260px;
        height: 200px;
        border-radius: 14px;
        box-shadow: 0px 0px 5px 1px rgba(0,0,0,0.75);
        padding: 10px;
        margin: 5px;
        vertical-align: top;
      }

      .stage.available:hover, .stage.complete:hover {
        box-shadow: 0px 0px 5px 2px rgba(0,0,0,0.75);
      }

      .stage.locked {
        filter: grayscale(100%);
      }

      .stage.complete {
        background-color: rgba(0, 255,0,0.2);
      }

      .stage-name {
        text-align: center;
        font-size: 24px;
        margin-bottom: 10px;
      }

       .vs {
        display: inline-block;
        width: 15%;
        text-align: center;
      }

      .team {
        display: inline-block;
        width: 40%;
      }

      .state {
        position: absolute;
        bottom: 10px;
        right: 10px;
      }
    </style>`;
  }

  render() {
    let c = html`<div class='gauntlet-inner'>
      <div>Completed ${this.completed.length} / ${this.matches.length} stages</div>
    </div>`;
    this.matches.forEach((m, i) => {
      let state = ~this.completed.indexOf(m.id) ? 'complete' : 'locked';
      if(i == this.completed.length) state = 'available';

      let t = m.renderStage(state, i);
      if(state != 'locked') {
        t.addEventListener('click', e => this.trigger('done', m));
      }
      c.appendChild(t);
    })
    this.shadow.appendChild(c);
    if(this.menuItems) {
      let menu = new Menu(this.menuItems);
      this.append(menu.render());
    }
    return this.tags.outer;
  }
}

module.exports = Gauntlet;
