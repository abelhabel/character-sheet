const Sprite = require('Sprite.js');
const icons = require('icons.js');
const _ability = icons.find(ic => ic.bio.name == 'Ability Book');
const _defend = icons.find(ic => ic.bio.name == 'Defend');
const _wait = icons.find(ic => ic.bio.name == 'Wait');
const _surrender = icons.find(ic => ic.bio.name == 'Surrender');
const _cursor = icons.find(ic => ic.bio.name == 'Ability Cursor');

class BattleMenu {
  constructor(battle) {
    this.battle = battle;
    this.tags = {
      outer: null,
      abilities: null,
      default: null
    };
    this.tw = 32;
    this.th = 32;
    this.selected = null;
    this.toolTip = null;
  }

  setActor(actor) {
    this.drawAbilities(actor.actives);
  }

  selectAbility(a, canvas) {
    if(!a) return;
    this._selectAbility(a);
  }

  _selectAbility(a, canvas) {
    a.owner.selectAbility(a);
    this.drawAbilities(a.owner.actives);
  }

  drawAbilities(abilities) {
    this.removeToolTip();
    this.tags.abilities.innerHTML = '';
    abilities.forEach((a, i) => {
      let canvas = a.canvas.clone();
      canvas.addEventListener('click', e => this.selectAbility(a, canvas));
      if(a == a.owner.selectedAbility) {
        canvas.style.border = '1px solid black';
      } else {
        canvas.style.border = 'none';
      }
      this.addToolTip(canvas, a.bio.name);
      this.tags.abilities.appendChild(canvas);
    })
  }

  removeToolTip() {
    if(!this.toolTip) return;
    this.toolTip.parentNode.removeChild(this.toolTip);
    this.toolTip = null;
  }

  addToolTip(canvas, tip) {
    canvas.addEventListener('mouseenter', e => {
      let bb = canvas.getBoundingClientRect();
      this.toolTip = html`<div style='
        position: fixed;
        top: ${bb.y + 3}px;
        left: ${bb.x + this.tw + 2}px;
        color: black;
        z-index: 1010;
        pointer-events: none;
        padding: 4px;
        background-image: url(sheet_of_old_paper.png);
        background-repeat: no-repeat;
        overflow: hidden;
        border-radius: 2px;
        box-shadow: 0px 0px 5px 1px rgba(0,0,0,0.75);
        '
      >
        ${tip}
      </div>`;
      document.body.appendChild(this.toolTip);
    });
    canvas.addEventListener('mouseout', e => {
      this.removeToolTip();
    })
    canvas.addEventListener('mousedown', e => {
      this.removeToolTip();
    })
  }

  render() {
    let ability = new Sprite(_ability.bio.sprite);
    this.addToolTip(ability.canvas, 'Character Sheet');
    ability.canvas.addEventListener('click', () => {
      this.battle.toggleAbilityBook();
    });
    let defend = new Sprite(_defend.bio.sprite);
    this.addToolTip(defend.canvas, 'Defend');
    defend.canvas.addEventListener('click', e => {
      let action = this.battle.createAction({type: 'defend'});
      this.battle.addAction(action);
    });
    let wait = new Sprite(_wait.bio.sprite);
    this.addToolTip(wait.canvas, 'Wait');
    wait.canvas.addEventListener('click', e => {
      let action = this.battle.createAction({type: 'wait'});
      this.battle.addAction(action);
    });
    let surrender = new Sprite(_surrender.bio.sprite);
    this.addToolTip(surrender.canvas, 'Surrender');
    surrender.canvas.addEventListener('click', e => {
      let action = this.battle.createAction({type: 'surrender'});
      this.battle.addAction(action);
    });
    let cursor = new Sprite(_cursor.bio.sprite);
    let top = html`<div style='cursor: url(${cursor.canvas.clone(24, 24).toPNG()}), auto'></div>`;
    top.appendChild(ability.canvas);
    top.appendChild(defend.canvas);
    top.appendChild(wait.canvas);
    top.appendChild(surrender.canvas);
    let abilities = html`<div style='width: 32px;'></div>`;
    let outer = html`<div></div>`;
    outer.appendChild(top);
    outer.appendChild(abilities);
    this.tags.outer = outer;
    this.tags.top = top;
    this.tags.abilities = abilities;
    return outer;
  }
}

module.exports = BattleMenu;
