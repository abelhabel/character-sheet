const Component = require('Component.js');
const Sprite = require('Sprite.js');
const equipments = require('equipments.js');
class Equipment {
  constructor(t) {
    this.template = t;
    this.bio = {
      sprite: t.bio.sprite,
      name: t.bio.name,
      family: t.bio.family,
      cost: t.bio.cost,
      slot: t.bio.slot,
      slots: t.bio.slots || 1
    };
    this.abilities = {
      abilities: t.abilities.abilities
    };
    this.sounds = {
      start_turn: t.sounds && t.sounds.turnStart,
    };
    this.stats = {
      health: t.stats.health,
      mana: t.stats.mana || 0,
      attack: t.stats.attack,
      defence: t.stats.defence,
      spellPower: t.stats.spellPower,
      spellResistance: t.stats.spellResistance,
      damage: t.stats.damage || 0,
      movement: t.stats.movement,
      initiative: t.stats.initiative,
      range: t.stats.range,
      apr: t.stats.apr || 0,
      tpr: t.stats.tpr || 0
    };
    this.adventure = {
      event: 'click',
      action: 'give item',
      charges: 1,
      actionAmount: 1,
      consumable: true

    };
    this.sprite = new Sprite(this.bio.sprite);
  }

  get adventureItem() {
    return this;
  }

  static create(templateId) {
    let tpl = equipments.find(t => t.id == templateId);
    return new Equipment(tpl);
  }

  static get style() {
    return html`<style>
    .open-cs {
      position: absolute;
      bottom: -10px;
      display: none;
    }
    .card-outer {
      box-sizing: border-box;
      user-select: none;
      position: relative;
      top: 0px;
      left: 0px;
      display: inline-block;
      width: 160px;
      height: 200px;
      border-radius: 12px;
      background-color: darkkhaki;
      padding: 8px;
      font-family: Tahoma, monospace;
      font-size: 14px;
      vertical-align: top;
      margin: 8px;
      border: none;
      background: linear-gradient(to bottom, #bdb76b 0%,#713c14 100%);
    }
    .card-outer.team1 {
      border: 1px solid blue;
    }
    .card-outer.team2 {
      border: 1px solid red;
    }
    .card-outer.selected {
      border: 3px solid cornflowerblue;
    }
    canvas.selected {
      background-color: cornflowerblue;
    }
    .card-inner.dead {
      background-color: brown;
    }
    .card-inner {
      box-sizing: border-box;
      border-radius: 10px;
      border: 1px solid thistle;
      width: 100%;
      height: 100%;
      background-color: rgba(245, 245, 220,0.3);
      border: 1px solid gray;
    }

    .card-inner.turn {
      background-color: cornflowerblue;
    }

    .card-name {
      padding: 2px 4px;
      background-color: rgba(218, 217, 190, 0.5);
      position: relative;
      top: -1px;
      left: 0px;
      border-bottom: 2px solid #3f4035;
      border-right: 1px solid #3f4035;
      font-weight: bold;
      font-size: 12px;
      text-align: left;
      border-top-left-radius: 7px;
      border-top-right-radius: 7px
    }

    .card-image {
      text-align: center;
      padding: 10px 20px;
    }

    .card-upper, .card-lower {
      height: 50%;
      position: relative;
      background-color: rgba(0,0,255,0.1);
    }

    .card-lower {
      background-color: rgba(255,255,255,0.3);
    }

    .card-lower:hover {
      background-color: rgba(255,255,255,0.8);
    }

    .stats-left {
      position: absolute;
      left: -10px;
      width: 24px;
      bottom: -6px;
      display: none;
    }
    .stats-right {
      position: absolute;
      right: -10px;
      width: 24px;
      bottom: -6px;
      display: none;
    }

    .card-outer:hover .stats {
      display: block;
    }

    .card-stat {
      position: relative;
      min-width: 24px;
      height: 24px;
      border-radius: 8px;
      text-align: center;
      line-height: 20px;
      color: white;
      margin-bottom: -4px;
      border: none;
      cursor: default;
      display: inline-block;
      padding: 2px;
    }
    .card-stat span {
      display: none;
    }
    .card-stat:hover {
      outline: 1px solid black;
    }
    .stats-left .card-stat:hover span {
      display: inline-block;
      position: absolute;
      top: 0px;
      left: 24px;
      background-color: black;
      font-size: 13px;
      padding: 0px 4px;
      border-radius: 4px;
      width: 106px;
      text-align: left;

    }
    .stats-right .card-stat:hover span {
      display: inline-block;
      position: absolute;
      top: 0px;
      right: 24px;
      background-color: black;
      font-size: 13px;
      padding: 0px 4px;
      border-radius: 4px;
      width: 106px;
      text-align: right;

    }
    .health, .apr {
      background-color: red;
    }
    .mana, .spell-power {
      background-color: blue;
    }
    .defence, .spell-resistance {
      background-color: green;
    }
    .tpr, .movement, .initiative {
      background-color: cadetblue;
    }
    .attack, .damage {
      background-color: purple;
    }

    .cost, .tier {
      background-color: #b19500;
    }

    .card-abilities {
      font-family: Tahoma;
      font-size: 10px;
      padding-left: 16px;
      text-align: left;
    }
    .card-triggers {

    }
    .card-effects {

    }

    .stat-card {
      display: inline-block;
    }

    .store-item {
      width: 100%;
      padding: 10px;
      background-image: url(sheet_of_old_paper.png);
      border-radius: 4px;
      text-align: left;
    }
    .store-item .item {
      display: flex;
      text-align: left;
    }
    .store-item .item:hover {
      background-color: rgba(0,0,0,0.1);
    }
    .store-item .image {
      margin-right: 5px;
    }
    </style>`;
  }

  get activeStats() {
    let out = [];
    Object.keys(this.stats).forEach(stat => {
      if(!this.stats[stat]) return;
      out.push({name: stat, val: this.stats[stat]});
    })
    return out;
  }

  get activeStatsText() {
    return this.activeStats.map(s => `${s.name}: ${s.val}`).join(', ');
  }

  get description() {
    return this.activeStatsText;
  }

  get canvas() {
    return this.sprite.canvas;
  }

  renderStoreItem(sell) {
    let c = new Component(false, 'store-item');
    let stats = this.activeStatsText;
    let cost = sell ? Math.ceil(this.bio.cost / 10) : this.bio.cost;
    let t = html`<div class='item'>
      <div class='image'></div>
      <div>
        <div class='name'>${this.bio.name}</div>
        <div class='stats'>${stats}</div>
        <div class=''>${cost} gold</div>
      </div>
    </div>`;
    t.querySelector('.image').appendChild(this.sprite.canvas.clone());
    c.append(t);
    return c.tags.outer;
  }

  renderCard() {
    let c = new Component();
    c.tags.outer.classList.add('stat-card');
    let {item} = this;
    let {name, family, slot, cost} = this.bio;
    let {health, mana, attack, defence,
      spellPower, spellResistance, damage, apr, tpr,
      movement, initiative, range
    } = this.stats;
    let {abilities} = this.abilities;
    let t = html`<div class='card-outer'>
      <div class='card-inner'>
        <div class='card-upper'>
          <div class='card-name'>
            ${name}
          </div>
          <div class='card-image'>
          </div>
        </div>
        <div class='card-lower'>
          <div class='card-abilities'>
            ${abilities}
          </div>
          <div class='stats stats-left'>
            <div class='card-stat cost'>
              ${cost}
              <span>Cost</span>
            </div>
            <div class='card-stat initiative'>
              ${initiative}
              <span>Initiative</span>
            </div>
            <div class='card-stat spell-resistance'>
              ${spellResistance}
              <span>Spell Resistance</span>
            </div>
            <div class='card-stat defence'>
              ${defence}
              <span>Defence</span>
            </div>
            <div class='card-stat mana'>
              ${mana}
              <span>Mana</span>
            </div>
            <div class='card-stat health'>
              ${health}
              <span>Health</span>
            </div>
          </div>
          <div class='stats stats-right'>
            <div class='card-stat apr'>
              ${apr}
              <span>Actions/Turn</span>
            </div>
            <div class='card-stat tpr'>
              ${tpr}
              <span>Triggers/Turn</span>
            </div>
            <div class='card-stat spell-power'>
              ${spellPower}
              <span>Spell Power</span>
            </div>
            <div class='card-stat attack'>
              ${attack}
              <span>Attack</span>
            </div>
            <div class='card-stat movement'>
              ${movement}
              <span>Movement</span>
            </div>
            <div class='card-stat damage'>
              ${damage}
              <span>Damage</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    t.querySelector('.card-image').appendChild(this.sprite.canvas.clone());
    c.append(t);
    return c.tags.outer;
  }
}

module.exports = Equipment;
