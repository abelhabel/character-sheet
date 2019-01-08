const Sprite = require('Sprite.js');
const icons = require('icons.js');
const _ability = icons.find(ic => ic.bio.name == 'Ability Book');
const _defend = icons.find(ic => ic.bio.name == 'Defend');
const _wait = icons.find(ic => ic.bio.name == 'Wait');
const _cursor = icons.find(ic => ic.bio.name == 'Ability Cursor');

class BattleMenu {
  constructor(battle) {
    this.battle = battle;
    this.tags = {
      outer: null,
      abilities: null,
      default: null
    };
    this.selected = null;
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
    this.tags.abilities.innerHTML = '';
    abilities.forEach((a, i) => {
      let canvas = a.canvas.clone();
      canvas.addEventListener('click', e => this.selectAbility(a, canvas));
      if(a == a.owner.selectedAbility) {
        canvas.style.border = '1px solid black';
      } else {
        canvas.style.border = 'none';
      }
      this.tags.abilities.appendChild(canvas);
    })
  }

  render() {
    let ability = new Sprite(_ability.bio.sprite);
    ability.canvas.addEventListener('click', () => {
      this.battle.toggleAbilityBook();
    });
    let defend = new Sprite(_defend.bio.sprite);
    defend.canvas.addEventListener('click', e => {
      let action = this.battle.createAction({type: 'defend'});
      this.battle.addAction(action);
    });
    let wait = new Sprite(_wait.bio.sprite);
    wait.canvas.addEventListener('click', e => {
      let action = this.battle.createAction({type: 'wait'});
      this.battle.addAction(action);
    });
    let cursor = new Sprite(_cursor.bio.sprite);
    let top = html`<div style='cursor: url(${cursor.canvas.clone(24, 24).toPNG()}), auto'></div>`;
    top.appendChild(ability.canvas);
    top.appendChild(defend.canvas);
    top.appendChild(wait.canvas);
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
