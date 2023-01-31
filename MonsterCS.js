const Component = require('Component.js');
const Sprite = require('Sprite.js');
const icons = require('icons.js');
let names = {
  health: 'Health', mana: 'Mana',
  attack: 'Attack', defence: 'Defence',
  spellPower: 'Spell Power', spellResistance: 'Spell Resistance',
  initiative: 'Initiative', movement: 'Movement',
  tpr: 'Triggers Per Turn', apr: 'Actions Per Turn',
  damage: 'Bonus Damage'
};

class AbilityStats extends Component {
  constructor(ability, monster) {
    super(true, 'ability-stats');
    this.ability = ability;
    this.monster = monster;
  }

  render() {
    this.clear();
    let f = new Component.Fragment();
    let a = this.ability;
    let m = this.monster;
    let {source, attribute, element, minPower, shape, radius,
      maxPower, multiplier, resourceCost, resourceType,
      range, effect, duration, target, targetFamily, stacks,
      ailment, vigor
    } = a.stats;

    if(resourceType == 'mana' && m && m.hasAilment('scorched')) {
      resourceCost += 1;
    }
    let {activation, type, name, description, condition} = a.bio;
    let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
    let act = type == 'trigger' ? `\n<span class='bold'>Trigger</span>: ${activation}` : '';
    let con = condition ? '\nCondition: ' + condition : '';
    var text = html`<div>
      <div><span class='bold'>Name</span>: ${name}</div>
      <div><span class='bold'>Target</span>: ${target}/${targetFamily}</div>
      <div><span class='bold'>Type</span>: ${type}${act}${con}</div>
      <div><span class='bold'>Shape</span>: ${shape}</div>
      <div><span class='bold'>Radius</span>: ${radius}</div>
      <div><span class='bold'>Source</span>: ${source}</div>
      <div><span class='bold'>Element</span>: ${element}</div>
      <div><span class='bold'>Cost</span>: ${resourceCost} ${resourceType}</div>
      <div><span class='bold'>Ailment</span>: ${ailment}</div>
      <div><span class='bold'>Vigor</span>: ${vigor}</div>
      <div><span class='bold'>Condition</span>: ${condition}</div>
      <div><span class='bold'>Power</span>: ${range}</div>
    </div>`;

    f.append(text);

    if(ailment) {
      f.appendIn(text, html`<div><span class='bold'>Ailment</span>: ${ailment}</div>`);
    }
    if(vigor) {
      f.appendIn(text, html`<div><span class='bold'>Vigor</span>: ${vigor}</div>`);
    }
    if(condition) {
      f.appendIn(text, html`<div><span class='bold'>Condition</span>: ${condition}</div>`);
    }
    let time = duration ? ` for ${duration} rounds` : '';
    if(multiplier) {
      let power = `(${minPower}-${maxPower}) * ${multiplier}% to ${stat}${time} (max stacks: ${stacks})`;
      if(effect) {
        let {source, attribute, minPower, maxPower, multiplier, duration, stacks} = effect.stats;
        let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
        let time = duration ? ` for ${duration} rounds` : '';
        power += `, (${minPower}-${maxPower}) * ${multiplier}% to ${stat}${time} (max stacks: ${stacks})`;
      }
      f.appendIn(text, html`<div><span class='bold'>Power</span>: ${power}</div>`);

    }
    f.appendIn(text, html`<p>${description}</p>`);

    this.append(f);
    return this.tags.outer;
  }
}

class MonsterCS extends Component {
  constructor(monster) {
    super(true, 'monster-cs');
    this.monster = monster;
  }

  static get style() {
    return html`<style>
      * {
        box-sizing: border-box;
      }
      .right {
        float: right;
      }
      .monster-cs-outer {
        font-weight: bold;
        font-size: 11px;
        position: relative;
        height: 100%;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 10px;
        padding: 10px;
      }
      .stat-column {
        width: 120px;
        display: inline-block;
        vertical-align: top;
      }
      .stat {
        box-shadow: 0px 2px 5px -1px rgba(0,0,0,0.75);
        padding: 6px;
        border-radius: 6px;
        width: 116px;
        height: 55px;
      }
      .stat:hover {
        background-color: rgba(0,0,0,0.1);
      }
      .stat, .stat div {
        display: inline-block;
        margin: 4px;
        white-space: nowrap;
        vertical-align: middle;

      }
      .stat-img {
        background-size: cover;
        pointer-events: none;
        border-radius: 5px;
        background-color: rgba(0,0,0,0);
      }
      .stat-value {
        text-align: center;
        pointer-events: none;
      }
      section {
        padding: 4px;
        margin: 2px;
        box-shadow: 0px 0px 5px -1px rgba(0,0,0,0.25);
      }
      #details {
        width: 100%;
      }
      .bio {
        display: inline-block;
        vertical-align: top;
      }
      #close {
        position: absolute;
        right: 0px;
        top: -18px;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
      }
      .monster-stat-upgrades {
        padding: 20px;
        background-image: url(sheet_of_old_paper.png);
        position: absolute;
        top: 0px;
        left: -240px;
        width: 230px;
        user-select: none;
        cursor: inherit;
      }
      .increase-stat, .decrease-stat {
        box-shadow: 0px 2px 5px -1px rgba(0,0,0,0.75);
        border-radius: 3px;
        padding: 5px;
        display: inline-block;
        width: 20px;
        height: 20px;
        text-align: center;
        line-height: 9px;
      }
      .increase-stat:hover, .decrease-stat:hover {
        background-color: #38a;
      }
      .controls {
        float: right;
      }
      .upgrade-stat {
        height: 22px;
      }
      .upgrade-stat.unavailable {
        color: grey;
      }
      .upgrade-stat-value {

      }
      .upgrade-points {
        margin-bottom: 6px;
        font-size: 1.2em;
      }
      .monster-upgrades-commit {
        padding: 10px;
        border-radius: 4px;
        position: relative;
        margin-top: 10px;
        user-select: none;
        cursor: inherit;
        box-shadow: 0px 2px 5px -1px rgba(0,0,0,0.75);
        letter-spacing: 2px;
        font-weight: bold;
        text-align: center;
      }
      .monster-upgrades-commit:hover {
        background-color: rgba(0,0,0,0.1);
      }
    </style>`;
  }

  render() {
    this.clear();
    let f = new Component.Fragment();
    f.append(MonsterCS.style);

    let m = this.monster;
    let {name, family, cost, maxStacks} = m.bio;
    let health = new Sprite(icons.find(i => i.bio.name == 'Health Stat').bio.sprite);
    let mana = new Sprite(icons.find(i => i.bio.name == 'Mana Stat').bio.sprite);
    let attack = new Sprite(icons.find(i => i.bio.name == 'Attack Stat').bio.sprite);
    let defence = new Sprite(icons.find(i => i.bio.name == 'Defense Stat').bio.sprite);
    let spellPower = new Sprite(icons.find(i => i.bio.name == 'Spell Power Stat').bio.sprite);
    let spellResistance = new Sprite(icons.find(i => i.bio.name == 'Spell Resistance Stat').bio.sprite);
    let initiative = new Sprite(icons.find(i => i.bio.name == 'Initiative Stat').bio.sprite);
    let movement = new Sprite(icons.find(i => i.bio.name == 'Movement Stat').bio.sprite);
    let apr = new Sprite(icons.find(i => i.bio.name == 'APR Stat').bio.sprite);
    let tpr = new Sprite(icons.find(i => i.bio.name == 'TPR Stat').bio.sprite);
    let damage = new Sprite(icons.find(i => i.bio.name == 'Damage Stat').bio.sprite);

    let tag = html`<div class='monster-cs-outer'>
      <section>
        <div id='close'>Close</div>
        <div class='bio' id='monster-image'></div>
        <div class='bio'>
          <div id='monster-name'>${m.bio.name}<span class='right'>${family}</span></div><br>
          <div id='monster-description'>${m.bio.description || 'No description available for this monster'}</div>
          <div id='monster-ailments'>Ailments: ${m.ailments.join()}</div>
          <div id='monster-vigors'>Vigors: ${m.vigors.join()}</div>
        </div>
      </section>
      <div class = 'stat-column'>
        <div class='stat' data-stat='health'>
          <div class='stat-img health'></div>
          <div class='stat-value'>${m.totalHealth}/${m.maxHealth}</div>
        </div>
        <div class='stat' data-stat='mana'>
          <div class='stat-img mana'></div>
          <div class='stat-value'>${m.totalMana}/${m.maxMana}</div>
        </div>
      </div>
      <div class = 'stat-column'>
        <div class='stat' data-stat='attack'>
          <div class='stat-img attack'></div>
          <div class='stat-value'>${m.totalStat('attack')}</div>
        </div>
        <div class='stat' data-stat='defence'>
          <div class='stat-img defence'></div>
          <div class='stat-value'>${m.totalStat('defence')}</div>
        </div>
      </div>
      <div class = 'stat-column'>
        <div class='stat' data-stat='spellPower'>
          <div class='stat-img spell-power'></div>
          <div class='stat-value'>${m.totalStat('spellPower')}</div>
        </div>
        <div class='stat' data-stat='spellResistance'>
          <div class='stat-img spell-resistance'></div>
          <div class='stat-value'>${m.totalStat('spellResistance')}</div>
        </div>
      </div>
      <div class = 'stat-column'>
        <div class='stat' data-stat='initiative'>
          <div class='stat-img initiative'></div>
          <div class='stat-value'>${m.totalStat('initiative')}</div>
        </div>
        <div class='stat' data-stat='movement'>
          <div class='stat-img movement'></div>
          <div class='stat-value'>${m.totalStat('movement')}</div>
        </div>
      </div>
      <div class = 'stat-column'>
        <div class='stat' data-stat='apr'>
          <div class='stat-img apr'></div>
          <div class='stat-value'>${m.totalStat('apr')}</div>
        </div>
        <div class='stat' data-stat='tpr'>
          <div class='stat-img tpr'></div>
          <div class='stat-value'>${m.totalStat('tpr')}</div>
        </div>
      </div>
      <div class = 'stat-column'>
        <div class='stat' data-stat='damage'>
          <div class='stat-img damage'></div>
          <div class='stat-value'>${m.totalStat('damage')}</div>
        </div>
      </div>

      <section id='stat-description'></section>
      <section id='active-abilities'>Active Abilities <br></section>
      <section id='passive-abilities'>Passive Abilities <br></section>
      <section id='trigger-abilities'>Trigger Abilities <br></section>
      <section id='active-effects'>Active Effects <br></section>
      <section id='details'></section>
    </div>`;
    f.append(tag);
    f.appendIn('#monster-image', m.canvas.clone());
    f.appendIn('.stat-img.health', health.canvas);
    f.appendIn('.stat-img.mana', mana.canvas);
    f.appendIn('.stat-img.attack', attack.canvas);
    f.appendIn('.stat-img.defence', defence.canvas);
    f.appendIn('.stat-img.spell-power', spellPower.canvas);
    f.appendIn('.stat-img.spell-resistance', spellResistance.canvas);
    f.appendIn('.stat-img.initiative', initiative.canvas);
    f.appendIn('.stat-img.movement', movement.canvas);
    f.appendIn('.stat-img.apr', apr.canvas);
    f.appendIn('.stat-img.tpr', tpr.canvas);
    f.appendIn('.stat-img.damage', damage.canvas);
    f.listen('#close', 'click', e => {
      this.trigger('close');
    })
    m.actives.forEach(a => {
      var c = a.sprite.canvas.clone();
      f.appendIn('#active-abilities', c);
      f.listen(c, 'click', () => {
        this.clearIn('#details');
        let cs = new AbilityStats(a, m);
        this.appendIn('#details', cs);
      })
    })
    m.triggers.forEach(a => {
      var c = a.sprite.canvas.clone();
      f.appendIn('#trigger-abilities', c);
      f.listen(c, 'click', () => {
        this.clearIn('#details');
        let cs = new AbilityStats(a, m);
        this.appendIn('#details', cs);
      })
    })
    m.passives.forEach(a => {
      var c = a.sprite.canvas.clone();
      f.appendIn('#passive-abilities', c);
      f.listen(c, 'click', () => {
        this.clearIn('#details');
        let cs = new AbilityStats(a, m);
        this.appendIn('#details', cs);
      })
    })

    m.activeEffects.forEach(e => {
      var c = e.canvas.clone();
      c.addEventListener('click', () => {
        this.drawEffectStats(e, tag.querySelector('#details'));
      })
      f.appendIn('#active-effects', c);
    })
    m.passives.forEach(a => {
      if(a.stats.targetFamily != 'self') return;
      if(!a.owner.abilityConditionMet(a, this)) return;
      var c = a.effectSprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawEffectStats({ability: a, power: a.power}, tag.querySelector('#details'));
      })
      f.appendIn('#active-effects', c);
    })

    m.affectedByAuras().forEach(a => {
      var c = a.effectSprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawEffectStats({ability: a, power: a.power}, tag.querySelector('#details'));
      })
      f.appendIn('#active-effects', c);
    })

    f.listen(tag, 'click', e => {
      if(e.target.classList.contains('stat')) {
        this.clearIn('#stat-description');
        let d = this.q('#stat-description');
        let stat = e.target.dataset.stat;
        let bd = m.statBonus(stat);
        let t = html`<div>
          <div>${names[stat]}: base ${bd.base} + effects ${bd.combined.total} + circumstantial ${bd.circumstance} + equipment ${bd.equipment}</div>
          <div>Blessing: ${bd.combined.blessingName} ${bd.combined.blessing.value}, Curse: ${bd.combined.curseName} ${bd.combined.curse.value}</div>
        </div>`;
        this.appendIn('#stat-description', t);
      }
    })

    this.append(f);
    return this.tags.outer;
  }

}

module.exports = MonsterCS;
