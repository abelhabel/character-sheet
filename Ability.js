const abilities = require('abilities.js');
const nextId = (function() {
  var id = 0;
  return function() {
    return ++id;
  }
})();
class Ability {
  constructor(t, owner) {
    this.template = t;
    this.id = nextId();
    this.owner = owner;
    this.bio = {
      name: t.bio.name,
      sprite: t.bio.sprite,
      type: t.bio.type,
      activation: t.bio.activation,
      condition: t.bio.condition
    };
    this.stats = {
      shape: t.stats.shape,
      radius: t.stats.radius,
      range: t.stats.range,
      target: t.stats.target,
      targetFamily: t.stats.targetFamily,
      duration: t.stats.duration,
      resourceCost: t.stats.resourceCost,
      resourceType: t.stats.resourceType,
      element: t.stats.element,
      effect: t.stats.effect,
      multiplier: t.stats.multiplier,
      minPower: t.stats.minPower,
      maxPower: t.stats.maxPower,
      stacks: t.stats.stacks || 1,
      source: t.stats.source,
      attribute: t.stats.attribute,
      ailment: t.stats.ailment,
      special: t.stats.special,
      selections: t.stats.selections,
      summon: t.stats.summon,

    };
    if(this.stats.effect) {
      this.stats.effect = new Ability(abilities.find(a => a.bio.name == this.stats.effect), this);
    }
  }

  roll(d) {
    let am = this.stats.multiplier / 100;
    let min = this.stats.minPower + (d || 0);
    let max = this.stats.maxPower + (d || 0);
    return Math.ceil(am * (min + Math.random() * (max-min)));
  }

  get canvas() {
    return abilities.find(a => a.bio.name == this.bio.name).canvas;
  }
}

module.exports = Ability;
