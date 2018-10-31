const nextId = (function() {
  var id = 0;
  return function() {
    ++id;
  }
})();
const abilities = require('abilities.js');
const Ability = require('Ability.js');
class Monster {
  constructor(t, stacks) {
    this.id = nextId();
    this.ai = false;
    this.x = 0;
    this.y = 0;
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
      spellResitance: t.stats.spellResitance,
      minDamage: t.stats.minDamage,
      maxDamage: t.stats.maxDamage,
      movement: t.stats.movement,
      initiative: t.stats.initiative,
      range: t.stats.range,
    };
    this.initialStacks = stacks || 1;
    this.damageTaken = 0;
    this.manaUsed = 0;
    this.effects = [];
    this.abilities = this.abilities.abilities.map(name => {
      let a = abilities.find(c => c.bio.name == name);
      return new Ability(a);
    });
    this.passiveAbilities = [];
    this.activeAbilities = [];
    this.spells = [];
    this.attacks = [];
    this.curses = [];
    this.blessings = [];
    this.abilities.forEach(a => {
      if(a.bio.type == 'passive') {
        this.passiveAbilities.push(a);
      } else
      if(a.bio.type == 'active') {
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
    })
  }

  addStack(s) {
    this.initialStacks = Math.min(this.bio.maxStacks, this.initialStacks + s);
    return this.initialStacks;
  }

  harm(d) {
    this.damageTaken += d;
  }

  heal(d) {
    this.damageTaken -= d;
  }

  hasEffectTag(tag) {
    return this.effects.find(e => {
      return ~e.ability.stats.tags.indexOf(tag);
    })
  }


  addEffect(source, ability, power) {
    this.effects.push({
      power: power,
      rounds: 0,
      source: source,
      ability: ability
    });
  }

  totalStat(name) {
    var base = this.stats[name] || 1;
    var bonus = this['bonus' + name] || 0;
    var passive = 0;
    var curseEffect = 0;
    var blessingEffect = 0;
    this.passiveAbilities.forEach(a => {
      if(a.stats.attribute != name) return;
      passive = Math.max(a.stats.minPower, passive);
    })
    this.activeEffects.filter(e => e.ability.stats.attribute == name)
    .forEach(e => {
      console.log('counting effect bonus of', name, e)
      var {source} = e.ability.stats;
      if(source == 'blessing') {
        blessingEffect = Math.max(e.power, blessingEffect);
      } else
      if(source == 'curse') {
        curseEffect = Math.max(e.power, curseEffect);
      }
    });
    var total = base + bonus + passive + blessingEffect - curseEffect;
    console.log(`Total stat of ${name}: base ${base} + bonus ${bonus} + passive ${passive} + blessingEffect ${blessingEffect} - curseEffect ${curseEffect} = ${total}`)
    return Math.max(1, total);
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
    console.log('mana left:', this.totalMana);
  }

  useMana(n) {
    console.log('using mana', n)
    this.manaUsed += n;
  }

  get totalMana() {
    return Math.max(0, this.totalStat('mana') - this.manaUsed);
  }

  get activeEffects() {
    return this.effects.filter(e => {
      return e.ability.bio.type == 'passive' ||
      e.rounds < e.ability.stats.duration;
    })
  }

  get alive() {
    return this.totalHealth > 0;
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
