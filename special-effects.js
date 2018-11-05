module.exports = {};
const monsters = require('monsters.js');
console.log('special effects run')
class Special {
  constructor(onEffectEnd = null, requiresAdditionalTarget = null) {
    this.onEffectEnd = onEffectEnd;
    this.requiresAdditionalTarget = requiresAdditionalTarget;
  }
}

module.exports.hypnotize = function (battle, caster, target, ability, power) {
  var originalTeam = target.team;
  target.team = caster.team;

  return new Special(function() {
    target.team = originalTeam;
  });
};

module.exports.berzerk = function (battle, caster, target, ability, power) {
  var originalTeam = target.team;
  target.team = 'neutral';
  return new Special(function() {
    target.team = originalTeam;
  });
};

module.exports.giveEffectAsAbility = function (battle, caster, target, ability, power, triggeredPower) {
  var template = ability.stats.effect.template;
  var a = new ability.constructor(template, target);
  target.abilities.push(a);
  battle.addAura(a);
  return new Special(function() {
    let index = target.abilities.findIndex(b => b.id == a.id);
    target.abilities.splice(index, 1);
    battle.removeAura(a);
    console.log('removed ability', a.bio.name, a.id)
  });
};


module.exports.reflectDamage = function (battle, caster, target, ability, power, triggeredPower) {
  console.log(caster.bio.name,'reflect damage', triggeredPower, target.bio.name)
  battle.dealDamage(caster, target, triggeredPower, ability, true);
  return new Special();
};

module.exports.phantomImage = function (battle, caster, target, ability, power, triggeredPower) {
  console.log(`${caster.bio.name} casts ${ability.bio.name} on ${target.bio.name}`);
  let template = target.template;
  let Model = target.constructor;
  let stacks = target.stacks;
  var copy = new Model(template, stacks);
  copy.team = caster.team;
  copy.canvas = target.canvas;
  copy.battle = target.battle;
  copy.ai = caster.ai;
  copy.stats.mana = 0;
  copy.stats.defence = Math.ceil(copy.stats.defence * 0.8);
  let tile = battle.grid.closestEmpty(caster.x, caster.y);
  copy.x = tile.x;
  copy.y = tile.y;
  battle.grid.setItem(copy);
  battle.turnOrder.push(copy);
  console.log(target, copy);
  return new Special();
};

module.exports.stealBlessing = function (battle, caster, target, ability, power, triggeredPower) {

  let effects = target.activeEffects.filter(e => e.ability.stats.source == 'blessing');

  let effect = effects[0];
  if(!effect) return;
  let index = target.effects.indexOf(effect);
  target.effects.splice(index, 1);
  effect.rounds = effect.ability.stats.duration;
  caster.addEffect(caster, effect.ability, effect.power, true, power);
  return new Special();
};

module.exports.dispel = function (battle, caster, target, ability, power, triggeredPower) {

  let effects = target.activeEffects.filter(e => e.ability.stats.source == 'blessing');

  let effect = effects[0];
  if(!effect) return;
  let index = target.effects.indexOf(effect);
  target.effects.splice(index, 1);
  effect.rounds = effect.ability.stats.duration;
  return new Special();
};

module.exports.teleport = function (battle, caster, target, ability, power, triggeredPower) {
  console.log('SPECIAL: teleport', caster.selections)
  let actor = caster.selections[0].actors[0];
  let tile = caster.selections[1].tiles[0];
  battle.grid.remove(actor.x, actor.y);
  actor.x = tile.x;
  actor.y = tile.y;
  battle.grid.setItem(actor);
};

module.exports.blink = function (battle, caster, target, ability, power, triggeredPower) {
  console.log('blink', battle.turn);
  let tile = battle.turn.actions[0].targets.tiles[0];
  battle.grid.remove(caster.x, caster.y);
  caster.x = tile.x;
  caster.y = tile.y;
  battle.grid.setItem(caster);
};

module.exports.lifeLeech = function (battle, caster, target, ability, power, triggeredPower) {
  if(!triggeredPower) return;
  console.log('lifeleech', caster.bio.name, target.bio.name, ability.bio.name, power, triggeredPower)
  caster.heal(Math.ceil(triggeredPower/2))
};

module.exports.polymorph = function (battle, caster, target, ability, power, triggeredPower) {
  console.log('POLYMORPH', target)
  let rand = battle.roll(0, monsters.length);
  let monster = monsters[rand];
  Object.assign(target.bio, monster.bio);
  Object.assign(target.stats, monster.stats);
  Object.assign(target.abilities, monster.abilities);
  target.abilities = target.createAbilities();
  target.template = monster;
  target.passiveAbilities = [];
  target.activeAbilities = [];
  target.triggers = [];
  target.spells = [];
  target.attacks = [];
  target.curses = [];
  target.blessings = [];
  target.sortAbilities();
};
