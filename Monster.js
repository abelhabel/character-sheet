const nextId = (function() {
  var id = 0;
  return function() {
    return Math.random().toString().substr(2);
  }
})();
const abilities = require('abilities.js');
const specialEffects = require('special-effects.js');
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
      let roll = power || ability.roll();
      if(roll < this.blessing.value) return;
      this.blessing.value = roll;
      this.blessing.ability = ability;
    } else
    if(ability.stats.source == 'curse') {
      let roll = power || ability.roll();
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
    this.battle = null;
    this.id = nextId();
    this.ai = false;
    this.x = 0;
    this.y = 0;
    this.selections = [];
    this.triggerCount = 0;
    this.bio = {
      sprite: t.bio.sprite,
      name: t.bio.name,
      family: t.bio.family,
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
    this.passiveAbilities = [];
    this.activeAbilities = [];
    this.spells = [];
    this.attacks = [];
    this.curses = [];
    this.blessings = [];
    this.sortAbilities();
  }

  createAbilities() {
    return this.abilities.abilities.map(name => {
      let a = abilities.find(c => c.bio.name == name);
      return new Ability(a, this);
    });
  }

  sortAbilities() {
    this.abilities.forEach(a => {
      if(a.bio.type == 'passive' && a.bio.activation == 'when selected') {
        this.passiveAbilities.push(a);
      } else
      if(a.bio.type == 'active' && a.bio.activation == 'when selected') {
        this.activeAbilities.push(a);
      }
      if(a.stats.source == 'attack') {
        this.attacks.push(a);
      }
      if(a.stats.source == 'spell') {
        this.spells.push(a);
      }
      if(a.stats.source == 'curse') {
        this.curses.push(a);
      }
      if(a.stats.source == 'blessing') {
        this.blessings.push(a);
      }
      // if(a.bio.activation != 'when selected') {
      //   this.triggers.push(a);
      // }
    })
  }

  get triggers() {
    return this.abilities.filter(a => a.bio.type == 'trigger');
  }

  get passives() {
    return this.abilities.filter(a => a.bio.type == 'passive');
  }

  get canvas() {
    return this.template.canvas;
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

  move(x, y) {
    this.x = x;
    this.y = y;
    this.tilesMoved += 1;
  }

  addStack(s) {
    this.initialStacks = Math.min(this.bio.maxStacks, this.initialStacks + s);
    return this.initialStacks;
  }

  harm(d) {
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
  }

  addEffect(source, ability, power, triggered, triggeredPower) {
    let e = this.effects.filter(e => e.ability.bio.name == ability.bio.name);
    if(e && e.length >= ability.stats.stacks ) {
      return;
    }
    if(ability.stats.special != 'giveEffectAsAbility' && ability.stats.effect) {
      this.addEffect(source, ability.stats.effect, ability.stats.effect.roll(), true, power);
    }
    let special;
    if(ability.stats.special && typeof specialEffects[ability.stats.special] == 'function') {
      special = specialEffects[ability.stats.special](this.battle, source, this, ability, power, triggeredPower);
    }

    if(ability.stats.duration) {
      this.effects.push({
        triggered: !!triggered,
        power: power,
        rounds: 0,
        source: source,
        ability: new ability.constructor(ability.template, ability.owner),
        onEffectEnd: special && special.onEffectEnd
      });
    }
  }

  passiveAbilityBonus(name) {
    var out = new StatBonus();
    this.passives.forEach(a => {
      if(a.stats.attribute != name) return;
      if(a.stats.targetFamily == 'enemies') return;
      let flanks = this.battle ? this.battle.flanks(this) : 0;
      if(a.bio.condition == 'flanked' && flanks < 2) {
        return;
      }
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
        out.add(a);
      }
    })
    return out;
  }

  totalStat(name) {
    var base = this.stats[name] || 0;
    var bonus = this['bonus' + name] || 0;
    var passive = this.passiveAbilityBonus(name);
    var activeEffects = this.activeEffectBonus(name);
    var auras = this.auraBonus(name);
    var combined = StatBonus.combine(passive, activeEffects, auras);
    var total = base + bonus + combined.blessing.value - combined.curse.value;
    // console.log(`Total stat of ${name}:
    //   base ${base} +
    //   bonus ${bonus} +
    //   blessing ${combined.blessing.value} (${combined.blessedBy}) -
    //   curse ${combined.curse.value} (${combined.cursedBy})
    //   = ${total}`);
    return Math.max(0, total);
  }

  canUseAbility(a) {
    if(!a) return true;
    return this.totalMana >= a.stats.resourceCost;
  }

  selectAbility(a) {
    if(this.selectedAbility == a) {
      this.selectedAbility = null;
      return;
    }
    if(a.stats.resourceType == 'mana' && this.totalMana < a.stats.resourceCost) return;
    if(a.stats.resourceType == 'health' && this.totalHealth < a.stats.resourceCost) return;
    this.selectedAbility = a;
  }

  useAbility(a) {
    if(a.stats.resourceType == 'mana' && this.totalMana >= a.stats.resourceCost) {
      this.useMana(a.stats.resourceCost);
    }
    if(a.stats.resourceType == 'health' && this.totalHealth >= a.stats.resourceCost) {
      this.harm(this.stats.resourceCost);
    }
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
    return this.movesLeft && !this.activeEffects.find(e => e.ability.stats.ailment == 'held');
  }

  get canAct() {
    return this.totalStat('apr') && !this.activeEffects.find(e => e.ability.stats.ailment == 'stunned');
  }

  get maxHealth() {
    return (this.initialStacks * this.stats.health);
  }

  get totalHealth() {
    return this.maxHealth - this.damageTaken;
  }

  get healthRatio() {
    return this.totalHealth / this.maxHealth;
  }

  get health() {
    return this.totalHealth % this.stats.health;
  }

  get stacks() {
    return Math.ceil(this.totalHealth / this.stats.health);
  }
}

module.exports = Monster;
