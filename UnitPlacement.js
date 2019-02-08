const Component = require('Component.js');
class UnitPlacement extends Component {
  constructor(arena, team, side) {
    super();
    this.arena = arena;
    this.team = team;
    this.units = this.team.monsters;
    this.side = side || 'left';
    this.current = null;
    this.w = 2;
    this.h = arena.h;
    this.x = this.side == 'left' ? 0 : arena.w - 2;
    this.y = 0;
    this.ymax = arena.h;
    this.positions = [];
    this.placed = [];

    let Battle = require('Battle.js');
    this.tags.popup = Battle.prototype.popup();
  }

  initPos() {
    this.units.forEach((u, i) => {
      u.x = this.x;
      u.y = i;
      let teamUnit = this.team.get(u.suuid);
      teamUnit.x = u.x;
      teamUnit.y = u.y;
      this.arena.obstacles.set(u.x, u.y, u);
    })
  }

  click(x, y) {
    if(x >= this.x + this.w || x < this.x) return;
    let unit = this.arena.obstacles.get(x, y);
    if(this.current) {
      this.arena.delight(this.current.x, this.current.y);
    }
    if(!unit && this.current) {
      this.arena.obstacles.remove(this.current.x, this.current.y);
      this.current.x = x;
      this.current.y = y;
      let teamUnit = this.team.get(this.current.suuid);
      teamUnit.x = this.current.x;
      teamUnit.y = this.current.y;
      this.arena.obstacles.set(x, y, this.current);
    } else
    if(unit == this.current) {
      this.current = null;
      this.arena.delight(x, y);
    } else {
      this.current = unit;
    }
    if(this.current) {
      this.arena.highlight(x, y);
    }
    if(this.tags.popup.style.display == 'block') {
      this.openCS();
    }
    this.arena.drawObstacles();
  }

  openCS() {
    if(!this.current) return;
    this.tags.popup.innerHTML = '';
    this.tags.popup.style.display = 'block';
    this.current.drawMonsterCS(this.tags.popup, () => this.tags.popup.style.display = 'none');
  }

  static get style() {
    return html`<style>
      #unit-placement-controls {
        width: 300px;
        position: absolute;
        left: 10px;
        bottom: 10px;
        background: url(sheet_of_old_paper_horizontal.png);
        z-index: 3002;
        user-select: none;
        color: black;
        padding: 10px;
        border-radius: 10px;
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
      }
      #unit-placement-controls button {
        padding: 10px;
        border: none;
        font-size: 20px;
        font-weight: bold;
        margin: 4px;
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        border-radius: 4px;
        background-color: rgba(0,0,0,0);
        cursor: inherit;
      }
    </style>`;
  }

  render() {
    this.tags.outer.id = 'unit-placement-controls';
    this.shadow.appendChild(html`<div>
      ${this.team.name}:
      <p>Click on one of your units to select/deselect it. Then click on an empty tile to place it there.</p>
      <p>You can only place units on the 2 first columns of tiles on your side.</p>
      <p>Click done when you have placed all your units.</p>
      <button id='done'>Done</button>
      <button id='open-cs'>Character Sheet</button>
    </div>`);
    this.shadow.querySelector('#done').addEventListener('click', e => {
      this.trigger('done');
    });
    this.shadow.querySelector('#open-cs').addEventListener('click', e => {
      this.openCS();
    });
    return this.tags.outer;
  }

}

module.exports = UnitPlacement;
