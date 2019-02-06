const Component = require('Component.js');
class Gauntlet extends Component {
  constructor(matches) {
    super(false, 'gauntlet');
    this.matches = matches;
    this.completed = [];
  }

  completeStage(matchId) {
    this.completed.push(matchId);
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
      .gauntlet * {
        vertical-align: top;
      }
      .stage {
        position: relative;
        display: inline-block;
        width: 260px;
        height: 200px;
        border-radius: 14px;
        box-shadow: 0px 0px 5px 1px rgba(0,0,0,0.75);
        padding: 10px;
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
    console.log('render', this)
    let c = html`<div class='gauntlet'>
      <div>Completed ${this.completed.length} / ${this.matches.length} stages</div>
    </div>`;
    this.matches.forEach((m, i) => {
      let state = ~this.completed.indexOf(m.id) ? 'complete' : 'locked';
      if(i == this.completed.length) state = 'available';
      let t = html`<div class='stage ${state}'>
        <div class='stage-name'>Stage ${i}</div>
        <div class='team team1'></div>
        <div class='vs'>VS</div>
        <div class='team team2'></div>
        <div class='state'>${state}</div>
      </div>`;
      m.team1.team.units.forEach(unit => {
        let team = t.querySelector('.team1');
        team.appendChild(unit.monster.canvas.clone());
      });
      m.team2.team.units.forEach(unit => {
        let team = t.querySelector('.team2');
        team.appendChild(unit.monster.canvas.clone());
      })
      if(state != 'locked') {
        t.addEventListener('click', e => this.trigger('done', m));
      }
      c.appendChild(t);
    })
    this.shadow.appendChild(c);
    return this.tags.outer;
  }
}

module.exports = Gauntlet;
