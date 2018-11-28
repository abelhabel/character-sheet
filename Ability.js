const abilities = require('abilities.js');
const animations = require('animations.js');
const Animation = require('Animation.js');
const nextId = (function() {
  var id = 0;
  return function() {
    return Math.random().toString().substr(2);
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
      condition: t.bio.condition,
      description: t.bio.description || "No description has been added to this ability."
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
    this.animation = {
      sprite: t.animation && t.animation.sprite,
      template: t.animation && t.animation.template
    }
    this._animation = null;
    if(this.animation.template) {
      this.animation.template = animations.find(a => a.bio.name == this.animation.template);

    }
    this.power = 0;
    if(this.bio.type == 'passive') {
      this.power = this.stats.minPower;
    }
    this.chains = [];
    if(this.stats.effect) {
      this.stats.effect = new Ability(abilities.find(a => a.bio.name == this.stats.effect), this);
    }
  }

  get isAura() {
    return this.bio.type == 'passive' && (this.stats.shape == 'circle' || this.stats.shape == 'square') && this.stats.radius;
  }

  roll(d) {
    let am = this.stats.multiplier / 100;
    let min = this.stats.minPower + (d || 0);
    let max = this.stats.maxPower + (d || 0);
    return Math.ceil(am * (min + _random() * (max-min)));
  }

  get canvas() {
    return abilities.find(a => a.bio.name == this.bio.name).canvas;
  }
}

module.exports = Ability;
