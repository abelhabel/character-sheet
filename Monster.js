const nextId = (function() {
  var id = 0;
  return function() {
    return Math.random().toString().substr(2);
  }
})();
const abilities = require('abilities.js');
const icons = require('icons.js');
const specialEffects = require('special-effects.js');
const AbilityEffect = require('AbilityEffect.js');
const Sprite = require('Sprite.js');
const AI = require('AI.js');
const FixedList = require('FixedList.js');
class StatBonus {
  constructor() {
    this.blessing = {
      ability: '',
      value: 0
    },
    this.curse = {
      ability: '',
      value: 0
    };
  }

  static combine() {
    var out = new StatBonus();
    for(let i = 0; i < arguments.length; i++) {
      if(arguments[i].blessing.ability) {
        out.add(arguments[i].blessing.ability, arguments[i].blessing.value);
      }
      if(arguments[i].curse.ability) {
        out.add(arguments[i].curse.ability, arguments[i].curse.value);
      }
    }
    return out;
  }

  get curseName() {
    return this.curse.ability ? this.curse.ability.bio.name : '';
  }

  get blessingName() {
    return this.blessing.ability ? this.blessing.ability.bio.name : '';
  }

  get cursedBy() {
    if(!this.curse.ability) return '';
    return this.curse.ability.bio.name;
  }

  get blessedBy() {
    if(!this.blessing.ability) return '';
    return this.blessing.ability.bio.name;
  }

  get total() {
    return this.blessing.value - this.curse.value;
  }

  add(ability, power) {
    if(ability.stats.source == 'blessing') {
      let roll = power || ability.power || ability.roll();
      if(roll < this.blessing.value) return;
      this.blessing.value = roll;
      this.blessing.ability = ability;
    } else
    if(ability.stats.source == 'curse') {
      let roll = power || ability.power || ability.roll();
      if(roll < this.curse.value) return;
      this.curse.value = roll;
      this.curse.ability = ability;
    }
  }
}

const Ability = require('Ability.js');
class Monster {
  constructor(t, stacks, summoned) {
    this.template = t;
    this.summoned = summoned;
    this.orientation = 0; // 0 = left, 1 = right
    this.initiativeEntropy = 11;
    this.initiativeEntropyCounter = 0;
    this.initialInitiativeEntropy = this.initiativeEntropy;
    this.battle = null;
    this.id = nextId();
    this.ai = false;
    this.routine = this.ai ? new AI(this, 1) : null;
    this.x = 0;
    this.y = 0;
    this.selections = [];
    this.triggerCount = 0;
    this.bio = {
      sprite: t.bio.sprite,
      orientation: t.bio.orientation || 'left',
      name: t.bio.name,
      family: t.bio.family,
      summonOnly: t.bio.summonOnly || false,
      cost: t.bio.cost,
      maxStacks: t.bio.maxStacks || 1
    };
    this.abilities = {
      abilities: t.abilities.abilities
    };
    this.stats = {
      health: t.stats.health,
      mana: t.stats.mana,
      attack: t.stats.attack,
      defence: t.stats.defence,
      spellPower: t.stats.spellPower,
      spellResistance: t.stats.spellResistance,
      damage: t.stats.damage || 0,
      movement: t.stats.movement,
      initiative: t.stats.initiative,
      range: t.stats.range,
      apr: t.stats.apr || 1,
      tpr: t.stats.tpr || 1
    };
    this.initialStacks = stacks || 1;
    this.damageTaken = 0;
    this.manaUsed = 0;
    this.tilesMoved = 0;
    this.effects = [];
    this.abilities = this.createAbilities();
    this._selections = new FixedList(1);
    this._team = '';
  }

  addAI(level = 1) {
    this.ai = true;
    console.log('adding AI', level)
    this.routine = new AI(this.battle, this, level);
  }

  get prefers() {
    let attacks = this.attacks;
    let spells = this.spells;
    if(attacks.length >= spells.length) return 'attack';
    return 'spell';
  }

  get might() {
    if(this.prefers == 'attack') {
      return this.stacks * this.totalStat('apr') * this.totalStat('attack') * (1 + Math.min(this.totalStat('tpr'), this.triggers.length));
    }
    return this.stacks * this.totalStat('apr') * this.totalStat('spellPower');
  }

  get potentialRange() {
    let range = 0;
    this.actives.forEach(a => {
      if(a.stats.range > range) range = a.stats.range;
    })
    return range;
  }

  get team() {
    return this._team;
  }

  set team(t) {
    this._team = t;
  }

  _select(p) {
    let selectionsRequired = this.selectedAbility && this.selectedAbility.stats.selections || 1;
    if(this.selectedAbility) {
      if(selectionsRequired > 1) {
        this._selections.push(p);
      } else {
        this._selections[0] = p;
      }
    } else {
      this._selections[0] = p;
    }
    console.log(this._selections)
  }

  _deselect() {
    let selectionsRequired = this.selectedAbility && this.selectedAbility.stats.selections || 1;
    this._selections = new FixedList(selectionsRequired);
  }

  createAbilities() {
    return this.abilities.abilities.map(name => {
      let a = abilities.find(c => c.bio.name == name);
      return new Ability(a, this);
    });
  }

  get attacks() {
    return this.abilities.filter(a => a.bio.type == 'active' && a.stats.source == 'attack');
  }

  get spells() {
    return this.abilities.filter(a => a.bio.type == 'active' && a.stats.source == 'spell');
  }

  get attacks() {
    return this.abilities.filter(a => a.bio.type == 'active' && a.stats.source == 'attack');
  }

  get damaging() {
    return this.abilities.filter(a => a.bio.type == 'active' && (a.stats.source == 'spell' || a.stats.source == 'attack') && a.stats.multiplier);
  }

  get actives() {
    return this.abilities.filter(a => a.bio.type == 'active');
  }

  get triggers() {
    return this.abilities.filter(a => a.bio.type == 'trigger');
  }

  get passives() {
    return this.abilities.filter(a => a.bio.type == 'passive');
  }

  get canvas() {
    return this.template.canvases ? this.template.canvases[this.orientation] : this.template.canvas;
  }

  resetMovement() {
    this.tilesMoved = 0;
  }

  get movesLeft() {
    return this.totalStat('movement') - this.tilesMoved;
  }

  get hasAura() {
    return this.abilities.find(a => a.bio.type == 'passive' && (a.stats.shape == 'circle' || a.stats.shape == 'square') && a.stats.radius);
  }

  setOrientation(x) {
    this.orientation = x - this.x > 0 ? 1 : 0;
  }

  move(x, y) {
    this.setOrientation(x);
    this.x = x;
    this.y = y;
    this.tilesMoved += 1;
  }

  addStack(s) {
    this.initialStacks = Math.min(this.bio.maxStacks, this.initialStacks + s);
    return this.initialStacks;
  }

  harm(d) {
    if(isNaN(d)) return;
    this.damageTaken += d;
  }

  heal(d) {
    if(isNaN(d)) return;
    this.damageTaken = Math.max(0, this.damageTaken - d);
  }

  removeEffect(e) {
    var index = this.effects.indexOf(e);
    this.effects.splice(index, 1);
    if(typeof e.onEffectEnd == 'function') {
      e.onEffectEnd();
    }
    if(e.ability.stats.attribute == 'initiative') {
      this.battle.initiativeChanged();
    }
  }

  hasVigor(name) {
    return this.activeEffects.find(e => e.ability.stats.vigor == name);
  }

  hasAilment(name) {
    return this.activeEffects.find(e => e.ability.stats.ailment == name);
  }

  addEffect(source, ability, power, triggered, triggeredPower, positions, special) {
    let e = this.effects.filter(e => e.ability.bio.name == ability.bio.name);
    if(e && e.length >= ability.stats.stacks ) {
      e[0].rounds = 0;
      return;
    }

    if(ability.stats.duration) {
      this.effects.push(new AbilityEffect({
        triggered: !!triggered,
        power: power,
        rounds: 0,
        source: source,
        ability: new ability.constructor(ability.template, ability.owner),
        onEffectEnd: special && special.onEffectEnd
      }));

    }
  }

  abilityConditionMet(a) {
    if(!a.bio.condition) return true;
    if(a.stats.targetFamily == 'self' && a.bio.condition == 'flanked') {
      let flanks = this.battle ? this.battle.flanks(this) : 0;
      if(flanks < 2) return false;
      return true;
    }
    if(a.stats.targetFamily == 'self' && a.bio.condition == 'wounded') {
      return this.totalHealth < this.maxHealth/2;
    }
    if(a.stats.targetFamily == 'self' && a.bio.condition == 'near death') {
      return this.totalHealth < this.maxHealth/10;
    }
    if(a.stats.targetFamily == 'self' && a.bio.condition == 'full health') {
      return this.totalHealth >= this.maxHealth;
    }
    if(a.stats.targetFamily == 'enemies' && a.bio.condition == 'flanking') {
      let flanks = this.battle ? this.battle.flanks(this) : 0;
      if(flanks < 2) return false;
      return true;
    }
  }

  passiveAbilityBonus(name) {
    var out = new StatBonus();
    this.passives.forEach(a => {
      if(a.stats.attribute != name) return;
      if(a.stats.targetFamily == 'enemies') return;
      if(!this.abilityConditionMet(a)) return;
      out.add(a);
    })
    return out;
  }

  activeEffectBonus(name) {
    var out = new StatBonus();
    var stacks = {};
    this.activeEffects.forEach(e => {
      if(e.ability.stats.attribute != name) return;
      if(e.ability.stats.stacks > 1) {
        stacks[e.ability.bio.name] = stacks[e.ability.bio.name] || {power: 0, ability: e.ability};
        stacks[e.ability.bio.name].power += e.power;
      } else {
        out.add(e.ability, e.power);
      }
    });
    Object.keys(stacks).forEach(name => {
      out.add(stacks[name].ability, stacks[name].power);
    })
    return out;
  }

  auraBonus(name) {
    var out = new StatBonus();
    var stacks = {};
    this.battle && this.battle.auras.all.forEach(a => {
      if(!a.owner.alive) return
      if(a.stats.attribute != name) return;
      var {source, targetFamily, multiplier, radius} = a.stats;
      var d = this.battle.grid.distance(this.x, this.y, a.owner.x, a.owner.y);
      if(a.stats.shape == 'square') {
        d -= radius * 0.415;
      }
      if(d > radius) return;
      if(a.owner.team == this.team && targetFamily != 'enemies' && source == 'blessing') {
        out.add(a);
      }
      if(a.owner.team != this.team && targetFamily != 'allies' && source == 'curse') {
        if(!this.abilityConditionMet(a)) return;
        if(a.stats.stacks > 1) {
          stacks[a.bio.name] = stacks[a.bio.name] || {power: 0, ability: a};
          stacks[a.bio.name].power += a.power;
        } else {
          out.add(a, a.power);
        }
      }
    })
    Object.keys(stacks).forEach(name => {
      out.add(stacks[name].ability, stacks[name].power);
    })
    return out;
  }

  statBonus(name) {
    var base = this.stats[name] || 0;
    var circumstance = this['bonus' + name] || 0;
    var passive = this.passiveAbilityBonus(name);
    var activeEffects = this.activeEffectBonus(name);
    var auras = this.auraBonus(name);
    var combined = StatBonus.combine(passive, activeEffects, auras);
    var total = base + circumstance + combined.blessing.value - combined.curse.value;
    return {base, circumstance, passive, activeEffects, auras, combined: combined, total};
  }

  totalStat(name) {
    var total = this.statBonus(name).total;
    return Math.max(0, total);
  }

  canUseAbility(a) {
    if(!a) return true;
    return this.totalMana >= a.stats.resourceCost;
  }

  selectBestAbility(t) {
    let a = this.abilities
    .sort((a, b) => {
      return a.might > b.might ? -1 : 1;
    }).find(a => {
      return a.bio.type == 'active' &&
      (a.stats.source == 'attack' || a.stats.source == 'spell') &&
      this.canUseAbility(a)
    });
    this.selectedAbility != a && this.selectAbility(a);
  }

  selectAbility(a) {
    if(!a) {
      this.selectedAbility = null;
      return;
    }
    if(this.selectedAbility == a) {
      this.selectedAbility = null;
      return;
    }
    if(a.stats.resourceType == 'mana' && this.totalMana < a.stats.resourceCost) return;
    if(a.stats.resourceType == 'health' && this.totalHealth < a.stats.resourceCost) return;
    this.selectedAbility = a;
    let selectionsRequired = this.selectedAbility && this.selectedAbility.stats.selections || 1;
    this._selections = new FixedList(selectionsRequired);
  }

  useAbility(a) {
    if(a.stats.resourceType == 'mana' && this.totalMana >= a.stats.resourceCost) {
      this.useMana(a.stats.resourceCost);
    }
    if(a.stats.resourceType == 'health' && this.totalHealth >= a.stats.resourceCost) {
      this.harm(this.stats.resourceCost);
    }
  }

  replenishMana(n) {
    this.manaUsed = Math.max(0, this.manaUsed - n);
  }

  useMana(n) {
    this.manaUsed += n;
  }

  get totalMana() {
    return Math.max(0, this.totalStat('mana') - this.manaUsed);
  }

  get maxMana() {
    return this.totalStat('mana');
  }

  get activeEffects() {
    return this.effects.filter(e => {
      return e.rounds < e.ability.stats.duration;
    })
  }

  get alive() {
    return this.totalHealth > 0;
  }

  get canTrigger() {
    return this.triggerCount < this.totalStat('tpr');
  }

  get canMove() {
    return this.movesLeft > 0 && !this.activeEffects.find(e => e.ability.stats.ailment == 'held');
  }

  get canAct() {
    return this.totalStat('apr') && !this.activeEffects.find(e => e.ability.stats.ailment == 'stunned');
  }

  get maxHealth() {
    return Math.round(this.initialStacks * this.stats.health);
  }

  get totalHealth() {
    return Math.round(this.maxHealth - this.damageTaken);
  }

  get healthRatio() {
    return this.totalHealth / this.maxHealth;
  }

  get healthLost() {
    return Math.min(this.damageTaken, this.maxHealth);
  }

  get health() {
    return this.totalHealth % this.stats.health;
  }

  get stacks() {
    return Math.ceil(this.totalHealth / this.stats.health);
  }

  renderCS() {
    let html = `<div class='monster-cs'>
      <div>
        <img src='${this.canvas.toPNG()}'>
        <p>${this.bio.name}</p>
      </div>
    </div>`;
    return html;
  }

  drawMonsterCS(popup) {
    let m = this;
    popup.innerHTML = '';
    let {name, family, cost, maxStacks} = m.bio;
    let names = {
      health: 'Health', mana: 'Mana',
      attack: 'Attack', defence: 'Defence',
      spellPower: 'Spell Power', spellResistance: 'Spell Resistance',
      initiative: 'Initiative', movement: 'Movement',
      tpr: 'Triggers Per Turn', apr: 'Actions Per Turn',
      damage: 'Bonus Damage'
    };
    let health = new Sprite(icons.find(i => i.bio.name == 'Health Stat').bio.sprite);
    let mana = new Sprite(icons.find(i => i.bio.name == 'Mana Stat').bio.sprite);
    let attack = new Sprite(icons.find(i => i.bio.name == 'Attack Stat').bio.sprite);
    let defence = new Sprite(icons.find(i => i.bio.name == 'Defence Stat').bio.sprite);
    let spellPower = new Sprite(icons.find(i => i.bio.name == 'Spell Power Stat').bio.sprite);
    let spellResistance = new Sprite(icons.find(i => i.bio.name == 'Spell Resistance Stat').bio.sprite);
    let initiative = new Sprite(icons.find(i => i.bio.name == 'Initiative Stat').bio.sprite);
    let movement = new Sprite(icons.find(i => i.bio.name == 'Movement Stat').bio.sprite);
    let apr = new Sprite(icons.find(i => i.bio.name == 'APR Stat').bio.sprite);
    let tpr = new Sprite(icons.find(i => i.bio.name == 'TPR Stat').bio.sprite);
    let damage = new Sprite(icons.find(i => i.bio.name == 'Damage Stat').bio.sprite);
    let style = html`<style id='monster-cs-style'>
      .outer {
        font-weight: bold;
        font-size: 11px;
        position: relative;
        height: 100%;
      }
      .stat-column {
        width: 116px;
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
        white-space: normal;
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
        position: absolute;
        bottom: 0px;
        width: 100%;
      }
      .bio {
        display: inline-block;
        vertical-align: top;
      }
    </style>`;
    if(!document.getElementById('monster-cs-style')) {
      document.head.appendChild(style);
    }
    let tag = html`<div class='outer'>
      <section>
        <div class='bio' id='monster-image'></div>
        <div class='bio'>
          <span id='monster-name'>${m.bio.name}</span><br>
          <span id='monster-description'>${m.bio.description || 'No description available for this monster'}</span>
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
    tag.querySelector('#monster-image').appendChild(m.canvas.clone());
    tag.querySelector('.stat-img.health').appendChild(health.canvas);
    tag.querySelector('.stat-img.mana').appendChild(mana.canvas);
    tag.querySelector('.stat-img.attack').appendChild(attack.canvas);
    tag.querySelector('.stat-img.defence').appendChild(defence.canvas);
    tag.querySelector('.stat-img.spell-power').appendChild(spellPower.canvas);
    tag.querySelector('.stat-img.spell-resistance').appendChild(spellResistance.canvas);
    tag.querySelector('.stat-img.initiative').appendChild(initiative.canvas);
    tag.querySelector('.stat-img.movement').appendChild(movement.canvas);
    tag.querySelector('.stat-img.apr').appendChild(apr.canvas);
    tag.querySelector('.stat-img.tpr').appendChild(tpr.canvas);
    tag.querySelector('.stat-img.damage').appendChild(damage.canvas);

    m.actives.forEach(a => {
      var c = a.sprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawAbilityStats(a, tag.querySelector('#details'))
      })
      tag.querySelector('#active-abilities').appendChild(c);
    })
    m.triggers.forEach(a => {
      var c = a.sprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawAbilityStats(a, tag.querySelector('#details'))
      })
      tag.querySelector('#trigger-abilities').appendChild(c);
    })
    m.passives.forEach(a => {
      var c = a.sprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawAbilityStats(a, tag.querySelector('#details'))
      })
      tag.querySelector('#passive-abilities').appendChild(c);
    })

    m.activeEffects.forEach(e => {
      var c = e.canvas.clone();
      c.addEventListener('click', () => {
        this.drawEffectStats(e, tag.querySelector('#details'));
      })

      tag.querySelector('#active-effects').appendChild(c);
    })
    m.passives.forEach(a => {
      if(a.stats.targetFamily != 'self') return;
      if(!a.owner.abilityConditionMet(a)) return;
      var c = a.effectSprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawEffectStats({ability: a, power: a.power}, tag.querySelector('#details'));
      })
      tag.querySelector('#active-effects').appendChild(c);
    })

    this.battle && this.battle.auras.all.forEach(a => {
      if(!a.owner.alive) return;
      var {source, targetFamily, multiplier, radius} = a.stats;
      if(a.owner.team == this.battle.currentActor.team) {
        if(targetFamily == 'enemies') return;
      } else {
        if(targetFamily == 'allies') return;
      }
      var d = this.battle.grid.distance(this.battle.currentActor.x, this.battle.currentActor.y, a.owner.x, a.owner.y);
      if(a.stats.shape == 'square') {
        d -= radius * 0.415;
      }
      if(d > radius) return;
      var c = a.effectSprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawEffectStats({ability: a, power: a.power}, tag.querySelector('#details'));
      })

      tag.querySelector('#active-effects').appendChild(c);
    })

    tag.addEventListener('click', e => {
      if(e.target.classList.contains('stat')) {
        let d = tag.querySelector('#stat-description');
        let stat = e.target.dataset.stat;
        let bd = m.statBonus(stat);
        d.innerHTML = `<div>${names[stat]}: base ${bd.base} + effects ${bd.combined.total} + circumstantial ${bd.circumstance}</div>
        Blessing: ${bd.combined.blessingName} ${bd.combined.blessing.value}, Curse: ${bd.combined.curseName} ${bd.combined.curse.value}`;
      }
    })

    popup.appendChild(tag)
  }

  drawEffectStats(e, tag) {
    let a = e.ability;
    let {source, attribute, element, minPower,
      maxPower, multiplier, resourceCost, resourceType,
      range, effect, duration, ailment, vigor
    } = a.stats;
    tag.style.whiteSpace = 'pre-line';
    let {activation, type, name} = a.bio;
    let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
    attribute = source == 'spell' || source == 'attack' ? 'health' : attribute;
    let time = type == 'passive' ? 'permanent' : `${e.rounds}/${duration} rounds`;
    var text = `<span class='bold'>Name</span>: ${name}
    <span class='bold'>Source</span>: ${source}
    <span class='bold'>Element</span>: ${element}
    <span class='bold'>Duration</span>: ${time}
    <span class='bold'>Effect</span>: ${e.power} to ${attribute}`;
    if(ailment) text += `\n<span class='bold'>Ailment</span>: ${ailment}`;
    if(vigor) text += `\n<span class='bold'>Vigor</span>: ${vigor}`;
    tag.innerHTML = text;
  }

  drawAbilityStats(a, tag) {
    let {source, attribute, element, minPower, shape, radius,
      maxPower, multiplier, resourceCost, resourceType,
      range, effect, duration, target, targetFamily, stacks
    } = a.stats;
    tag.style.whiteSpace = 'pre-line';
    let {activation, type, name, description, condition} = a.bio;
    let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
    let act = type == 'trigger' ? `\n<span class='bold'>Triggers</span>: ${activation}` : '';
    var text = `<span class='bold'>Name</span>: ${name}
    <span class='bold'>Targets</span>: ${target}/${targetFamily}
    <span class='bold'>Type</span>: ${type}${act}
    <span class='bold'>Shape</span>: ${shape}
    <span class='bold'>Radius</span>: ${radius}
    <span class='bold'>Source</span>: ${source}
    <span class='bold'>Element</span>: ${element}
    <span class='bold'>Cost</span>: ${resourceCost} ${resourceType}
    <span class='bold'>Range</span>: ${range}`;
    let time = duration ? ` for ${duration} rounds` : '';
    if(condition) {
      text += `\n<span class='bold'>Condition</span>: ${condition}`
    }
    if(multiplier) {
      text += `\n<span class='bold'>Effects</span>: (${minPower}-${maxPower}) * ${multiplier}% to ${stat}${time} (max stacks: ${stacks})`;
      if(effect) {
        let {source, attribute, minPower, maxPower, multiplier, duration, stacks} = effect.stats;
        let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
        let time = duration ? ` for ${duration} rounds` : '';
        text += `, (${minPower}-${maxPower}) * ${multiplier}% to ${stat}${time} (max stacks: ${stacks})`;
      }

    }
    text += `\n\n${description}`;
    tag.innerHTML = text;
  }
}

module.exports = Monster;
