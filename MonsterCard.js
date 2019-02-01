const Sprite = require('Sprite.js');
const bgSprite = new Sprite({
  x: 700,
  y: 1500,
  w: 144,
  h: 184,
  spritesheet: 'Hell2.jpg'
});
// bgSprite.drawWithOpacity(0.5);
const bg = bgSprite.png;
class MonsterCard {
  constructor(item) {
    this.item = item;
    this.cached = null;
    this.canvas = item.canvas.clone();
    this.small = null;
    this.state = 'big';
  }

  hightlightCanvas() {
    if(!this.small) return;
    this.small.classList.add('selected');
  }

  unhightlightCanvas() {
    if(!this.small) return;
    this.small.classList.remove('selected');
  }

  get bg() {
    if(this.item.bio.family == 'Mythical') {
      return 'url(mythical_card.jpg)';
    }
    if(this.item.bio.family == 'Undead') {
      return 'url(undead_card.jpg)';
    }
    if(this.item.bio.family == 'Order of Idun') {
      return 'url(order_of_idun_card.jpg)';
    }
    if(this.item.bio.family == 'Demons') {
      return 'url(demons_card.jpg)';
    }
    if(this.item.bio.family == 'Beasts') {
      return 'url(beasts_card.jpg)';
    }
    if(this.item.bio.family == "Aloysia's Chosen") {
      return 'url(mythical_card.jpg)';
    }
    if(this.item.bio.family == 'Outlaws') {
      return 'url(outlaws_card.jpg)';
    }
    return `url(${bg})`;
  }

  render(container, noEvents = false) {
    let card = document.createElement('div');
    card.innerHTML = this.html();
    card.querySelector('.card-outer').style.background = this.bg;
    let image = card.querySelector('.card-image');
    let canvas = this.canvas.clone();
    this.cached = card.firstElementChild;
      let open = card.querySelector('.open-cs');
      open.addEventListener('click', e => {
        if(!this.item.battle) {
          let Battle = require('Battle.js');
          let popup = Battle.prototype.popup();
          popup.style.display = 'block';
          this.item.drawMonsterCS(popup, () => document.body.removeChild(popup));
        } else {
          this.item.battle.toggleAbilityBook(this.item);
        }
        // this.item.battle.toggleAbilityBook(this.item);
        e.stopPropagation();
      });
      this.cached.addEventListener('mouseenter', e => {
        open.style.display = 'block';
      })
      this.cached.addEventListener('mouseleave', e => {
        open.style.display = 'none';
      })
    this.small = canvas;
    if(this.state == 'small') {
      container.appendChild(canvas);
    } else {
      container.appendChild(this.cached);
      image.appendChild(canvas);
      this.state = 'big';
    }

    if(noEvents) return;
    canvas.addEventListener('click', e => {
      if(this.state == 'big') return;
      container.insertBefore(this.cached, canvas);
      image.appendChild(canvas);
      this.state = 'big';

    });
    this.cached.addEventListener('click', e => {
      container.insertBefore(canvas, this.cached);
      container.removeChild(this.cached);
      this.state = 'small';
    })
  }

  html(turn) {
    var {item} = this;
    var currentActor = item.battle && item.battle.currentActor;
    var name = item.bio.name;

    var effects = item.activeEffects.map(e => e.ability.bio.name);
    var abilities = item.abilities.map(a => a.bio.name);
    return `<div
      class='card-outer ${item.team}'>
      <div class='card-inner ${turn ? 'turn' : ''} ${item.alive ? '' : 'dead'}'>
        <div class='card-upper'>
          <div class='card-name'>
            ${name} (${item.stacks}) ${item.alive ? '' : 'dead'}
          </div>
          <div class='card-image'>
          </div>
        </div>
        <div class='card-lower'>
          <div class='card-abilities'>
            ${abilities.join(', ')}
          </div>
          <div class='stats stats-left'>
            <div class='card-stat cost'>
              ${item.bio.cost}
              <span>Cost</span>
            </div>
            <div class='card-stat initiative'>
              ${item.totalStat('initiative')}
              <span>Initiative</span>
            </div>
            <div class='card-stat spell-resistance'>
              ${item.totalStat('spellResistance')}
              <span>Spell Resistance</span>
            </div>
            <div class='card-stat defence'>
              ${item.totalStat('defence')}
              <span>Defence</span>
            </div>
            <div class='card-stat mana'>
              ${item.totalMana}/${item.maxMana}
              <span>Mana</span>
            </div>
            <div class='card-stat health'>
              ${item.totalHealth}/${item.maxHealth}
              <span>Health</span>
            </div>
          </div>
          <div class='stats stats-right'>
            <div class='card-stat tier'>
              ${item.tier}
              <span>Ability Tier</span>
            </div>
            <div class='card-stat apr'>
              ${item.totalStat('apr')}
              <span>Actions/Round</span>
            </div>
            <div class='card-stat tpr'>
              ${item.totalStat('tpr')}
              <span>Triggers/Round</span>
            </div>
            <div class='card-stat spell-power'>
              ${item.totalStat('spellPower')}
              <span>Spell Power</span>
            </div>
            <div class='card-stat attack'>
              ${item.totalStat('attack')}
              <span>Attack</span>
            </div>
            <div class='card-stat movement'>
              ${item.totalStat('movement')}
              <span>Movement</span>
            </div>
            <div class='card-stat damage'>
              ${item.totalStat('damage')}
              <span>Damage</span>
            </div>
          </div>
        </div>
      </div>
      <button class='open-cs'>Open Character Sheet</button>
    </div>`;
  }

  static get style() {
    return `
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
      background: url(${bg});
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
    `;
  }
}

module.exports = MonsterCard;
