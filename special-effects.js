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
  target.team = caster.team;
  var t = battle.grid.closest(target.x, target.y, (b) => {
    console.log('b.team != caster.team', b.team, caster.team, b.bio.name)
    return b.team != caster.team;
  });
  console.log('berserk target', t)
  if(!t) return;
  var a = target.actives.find(a => a.stats.targetFamily == 'enemies' && battle.grid.squareRadius(target.x, target.y, t.x, t.y) <= a.stats.range);
  if(!a) return;
  battle.useAbility(target, t.item, a);
  target.team = originalTeam;
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
  let tile = battle.grid.closestEmpty(caster.x, caster.y);
  battle.summon(caster, ability, template, tile)
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

module.exports.manaThief = function (battle, caster, target, ability, power, triggeredPower) {
  console.log('SPECIAL: teleport', caster.selections)
  let victim = caster.selections[0].actors[0];
  let benefactor = caster.selections[1].actors[0];
  let roll = ability.roll();
  let mana = victim.totalMana;
  victim.useMana(roll);
  let manaTaken = mana - victim.totalMana;
  benefactor.replenishMana(manaTaken);
};

module.exports.blink = function (battle, caster, target, ability, power, triggeredPower) {
  let tile = caster.selections[0].tiles[0];
  battle.grid.remove(caster.x, caster.y);
  caster.x = tile.x;
  caster.y = tile.y;
  battle.grid.setItem(caster);
  battle.render();
};

module.exports.lifeLeech = function (battle, caster, target, ability, power, triggeredPower) {
  // if(!triggeredPower) return;
  console.log('lifeleech', caster.bio.name, target.bio.name, ability.bio.name, power, triggeredPower)
  if(triggeredPower) {
    caster.heal(Math.ceil(triggeredPower/2))
  } else {
    caster.heal(Math.ceil(power/2))
  }
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


module.exports.chain = function (battle, caster, target, ability, power, triggeredPower) {
  ability.chains.push(target);
  let nextTarget = battle.grid.inRadius(target.x, target.y, ability.stats.range)
  .find(p => p.item && !~ability.chains.indexOf(p.item) && p.item.team == target.team);
  if(!nextTarget || ability.chains.length > 4) {
    ability.chains = [];
    return;
  }
  battle.useAbility(caster, nextTarget, ability);
};
