class UnitPlacement {
  constructor(arena, units, team) {
    this.arena = arena;
    this.units = units || [];
    this.team = team;
    this.side = team == 'team1' ? 'left' : 'right';
    this.current = null;
    this.w = 2;
    this.h = arena.h;
    this.x = this.side == 'left' ? 0 : arena.w - 2;
    this.y = 0;
    this.ymax = arena.h;
    this.positions = [];
    this.placed = [];
  }

  initPos() {
    this.units.forEach((u, i) => {
      u.x = this.x;
      u.y = i;
      this.arena.obstacles.set(u.x, u.y, u);
    })
  }

  click(x, y) {
    if(x >= this.x + this.w || x < this.x) return;
    let unit = this.arena.obstacles.get(x, y);
    if(!unit && this.current) {
      this.arena.obstacles.remove(this.current.x, this.current.y);
      this.current.x = x;
      this.current.y = y;
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
    } else {
      this.arena.delight(x, y);
    }
    this.arena.drawObstacles();
    console.log(this.current && this.current.bio.name)
  }

  render(container) {
    let outer = html`<div style='
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
    '>
      ${this.team}:
      <p>Click on one of your units to select/deselect it. Then click on an empty tile to place it there.</p>
      <p>You can only place units on the 2 first columns of tiles on your side.</p>
      <p>Click done when you have placed all your units.</p>
      <button style='
        padding: 10px;
        border: none;
        font-size: 20px;
        font-weight: bold;
        margin: 4px;
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        border-radius: 4px;
        background-color: rgba(0,0,0,0);
        cursor: inherit;
      '>
        Done
      </button>
    </div>`;
    outer.querySelector('button').addEventListener('click', e => {
      if(!this.onDone) return;
      container.removeChild(outer);
      this.onDone();
    });
    container.appendChild(outer);
  }

}

module.exports = UnitPlacement;
