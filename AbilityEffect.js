const CompositeSprite = require('CompositeSprite.js');
const icons = require('icons.js');
class AbilityEffect {
  constructor(s) {
    this.triggered = s.triggered;
    this.power = s.power;
    this.rounds = s.rounds;
    this.source = s.source;
    this.ability = s.ability;
    this.onEffectEnd = s.onEffectEnd;
    this.sprite = this.createSprite();
  }

  createSprite() {
    let bg = icons.find(i => i.bio.name == 'Effect Background').bio.sprite;
    let fg = this.ability.template.bio.sprite;
    return new CompositeSprite([bg, fg]);
  }

  get canvas() {
    return this.sprite.canvas;
  }
}

module.exports = AbilityEffect;
