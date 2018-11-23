module.exports = {};
const monsters = require('monsters.js');
class Special {
  constructor(onEffectEnd = null, requiresAdditionalTarget = null) {
    this.onEffectEnd = onEffectEnd;
    this.requiresAdditionalTarget = requiresAdditionalTarget;
  }
}

module.exports.suicide = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    let healthLost = Math.min(caster.maxHealth, power);
    let adjacent = battle.grid.around(caster.x, caster.y, 1);
    adjacent.filter(t => t.item instanceof caster.constructor)
    .forEach(t => {
      battle.dealDamage(caster, t.item, healthLost, ability, true);
    })
    return new Special();
  }
};

module.exports.charge = {
  when: 'per use',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    let tiles = battle.abilityTargets(caster, ability, selections[0].x, selections[0].y).tiles;
    let tile = tiles[tiles.length -1];
    if(battle.grid.get(tile.x, tile.y)) {
      tile = battle.grid.closestEmpty(tile.x, tile.y);
    }
    battle.grid.remove(caster.x, caster.y);
    caster.move(tile.x, tile.y);
    battle.grid.setItem(caster);
    return new Special();
  }
};

module.exports.hypnotize = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    var originalTeam = target.team;
    target.team = caster.team;

    return new Special(function() {
      target.team = originalTeam;
    });
  }
};

module.exports.berzerk = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    var originalTeam = target.team;
    target.team = caster.team;
    var t = battle.grid.closest(target.x, target.y, (b) => {
      return b instanceof target.constructor && b.team != caster.team;
    });
    if(!t) return;
    var a = target.actives.find(a => a.stats.targetFamily == 'enemies' && battle.grid.squareRadius(target.x, target.y, t.x, t.y) <= a.stats.range);
    if(!a) return;
    battle.useAbility(target, [t], a);
    target.team = originalTeam;
  }
};

module.exports.giveEffectAsAbility = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    var template = ability.stats.effect.template;
    var a = new ability.constructor(template, target);
    target.abilities.push(a);
    battle.addAura(a);
    return new Special(function() {
      let index = target.abilities.findIndex(b => b.id == a.id);
      target.abilities.splice(index, 1);
      battle.removeAura(a);
    });
  }
};


module.exports.reflectDamage = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    battle.dealDamage(caster, target, triggeredPower, ability, true);
    return new Special();
  }
};

module.exports.phantomImage = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    let template = target.template;
    let tile = battle.grid.closestEmpty(caster.x, caster.y);
    battle.summon(caster, ability, template, tile)
    return new Special();
  }
};

module.exports.stealBlessing = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    let effects = target.activeEffects.filter(e => e.ability.stats.source == 'blessing');

    let effect = effects[0];
    if(!effect) return;
    let index = target.effects.indexOf(effect);
    target.effects.splice(index, 1);
    effect.rounds = effect.ability.stats.duration;
    caster.addEffect(caster, effect.ability, effect.power, true, power);
    return new Special();
  }
};

module.exports.dispel = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {

    let effects = target.activeEffects.filter(e => e.ability.stats.source == 'blessing');

    let effect = effects[0];
    if(!effect) return;
    let index = target.effects.indexOf(effect);
    target.effects.splice(index, 1);
    effect.rounds = effect.ability.stats.duration;
    return new Special();
  }
};

module.exports.teleport = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    let actor = battle.grid.get(selections[0].x, selections[0].y);
    let tile = selections[1];
    if(battle.grid.get(tile.x, tile.y)) {
      logger.log("Teleport failed beacuse a monster occupied the destination")
      return;
    }
    battle.grid.remove(actor.x, actor.y);
    actor.x = tile.x;
    actor.y = tile.y;
    battle.grid.setItem(actor);
  }
};

module.exports.manaThief = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    let victim = battle.grid.get(selections[0].x, selections[0].y);
    let benefactor = battle.grid.get(selections[1].x, selections[1].y);
    if(!victim || !benefactor) return;
    let roll = ability.roll();
    let mana = victim.totalMana;
    victim.useMana(roll);
    let manaTaken = mana - victim.totalMana;
    benefactor.replenishMana(manaTaken);
  }
};

module.exports.blink = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    let tile = selections[0];
    battle.grid.remove(caster.x, caster.y);
    caster.x = tile.x;
    caster.y = tile.y;
    battle.grid.setItem(caster);
    battle.render();
  }
};

module.exports.lifeLeech = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    // if(!triggeredPower) return;
    if(triggeredPower) {
      caster.heal(Math.ceil(triggeredPower/2))
    } else {
      caster.heal(Math.ceil(power/2))
    }
  }
};

module.exports.polymorph = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    let rand = battle.roll(0, monsters.length-1);
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
  }
};


module.exports.chain = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections) {
    ability.chains.push(target);
    let nextTarget = battle.grid.inRadius(target.x, target.y, ability.stats.range)
    .find(p => p.item && !~ability.chains.indexOf(p.item) && p.item.team == target.team);
    if(!nextTarget || ability.chains.length > 4) {
      ability.chains = [];
      return;
    }
    battle.useAbility(caster, nextTarget, ability);
  }
};
