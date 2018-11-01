const abilities = require('abilities.js');

class Ability {
  constructor(t, owner) {
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
      source: t.stats.source,
      attribute: t.stats.attribute,
      mode: t.stats.mode,
    };
    if(this.stats.effect) {
      this.stats.effect = new Ability(abilities.find(a => a.bio.name == this.stats.effect), this);
    }
  }

  roll() {
    let am = this.stats.multiplier / 100;
    return Math.ceil(am * (this.stats.minPower + Math.random() * (this.stats.maxPower-this.stats.minPower)));
  }

  get canvas() {
    return abilities.find(a => a.bio.name == this.bio.name).canvas;
  }
}

module.exports = Ability;
