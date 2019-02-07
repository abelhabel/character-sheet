const Sprite = require('Sprite.js');
const Slider = require("Slider.js");
const icons = require('icons.js');
const _ability = icons.find(ic => ic.bio.name == 'Ability Book');
const _defend = icons.find(ic => ic.bio.name == 'Defend');
const _wait = icons.find(ic => ic.bio.name == 'Wait');
const _surrender = icons.find(ic => ic.bio.name == 'Surrender');
const _cursor = icons.find(ic => ic.bio.name == 'Ability Cursor');
const _volume = icons.find(ic => ic.bio.name == 'Sound');

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
      this.battle.addDOMEvent(canvas, 'click', e => this.selectAbility(a, canvas));
      if(a == a.owner.selectedAbility) {
        canvas.style.outline = '3px solid #45692b';
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
    this.battle.addDOMEvent(canvas, 'mouseenter', e => {
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
    this.battle.addDOMEvent(canvas, 'mouseout', e => {
      this.removeToolTip();
    })
    this.battle.addDOMEvent(canvas, 'mousedown', e => {
      this.removeToolTip();
    })
  }

  render() {
    let ability = new Sprite(_ability.bio.sprite);
    this.addToolTip(ability.canvas, 'Character Sheet');
    this.battle.addDOMEvent(ability.canvas, 'click', () => {
      this.battle.toggleAbilityBook();
    });
    let defend = new Sprite(_defend.bio.sprite);
    this.addToolTip(defend.canvas, 'Defend');
    this.battle.addDOMEvent(defend.canvas, 'click', e => {
      let action = this.battle.createAction({type: 'defend'});
      this.battle.addAction(action);
    });
    let wait = new Sprite(_wait.bio.sprite);
    this.addToolTip(wait.canvas, 'Wait');
    this.battle.addDOMEvent(wait.canvas, 'click', e => {
      let action = this.battle.createAction({type: 'wait'});
      this.battle.addAction(action);
    });
    let surrender = new Sprite(_surrender.bio.sprite);
    this.addToolTip(surrender.canvas, 'Surrender');
    this.battle.addDOMEvent(surrender.canvas, 'click', e => {
      let action = this.battle.createAction({type: 'surrender'});
      this.battle.addAction(action);
    });
    let volume = new Sprite(_volume.bio.sprite);
    this.addToolTip(volume.canvas, 'Volume');
    let slider;
    this.battle.addDOMEvent(volume.canvas, 'click', e => {
      if(slider) {
        outer.removeChild(slider.tags.container);
        slider = null;
        return;
      }
      slider = new Slider("Volume", Math.round(this.battle.sp.volume*100), this.battle.sp, 'volume', true);
      outer.appendChild(slider.render());
    });
    let cursor = new Sprite(_cursor.bio.sprite);
    let top = html`<div class='buttons'></div>`;
    top.appendChild(ability.canvas);
    top.appendChild(defend.canvas);
    top.appendChild(wait.canvas);
    top.appendChild(surrender.canvas);
    top.appendChild(volume.canvas);
    let abilities = html`<div class='buttons'></div>`;
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
