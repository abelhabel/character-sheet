module.exports = {};
const monsters = require('monsters.js');
class Special {
  constructor(onEffectEnd = null, preventUse) {
    this.onEffectEnd = onEffectEnd;
    this.preventUse = preventUse;

  }
}

module.exports.addMonster = {
  when: 'per use',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    let team = battle.currentTeam;
    let m = team.pickRandomMonster();
    if(!m) {
      console.log('no more monsters to portal in');
      return new Special();
    }
    m.team = battle.currentActor.team;
    battle.addMonster(m, target);
    return new Special();
  }
};

module.exports.suicide = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
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
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    console.log('charge')
    let tiles = battle.abilityTargets(caster, ability, selections[0].x, selections[0].y).tiles;
    let tile = tiles[tiles.length -1];
    if(battle.grid.get(tile.x, tile.y)) {
      tile = battle.grid.closestEmpty(tile.x, tile.y);
    }
    battle.grid.remove(caster.x, caster.y);
    caster.move(tile.x, tile.y);
    battle.grid.setItem(caster);
    battle.render();
    return new Special();
  }
};

module.exports.hypnotize = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    var originalTeam = target.team;
    target.team = caster.team;

    return new Special(function() {
      target.team = originalTeam;
    });
  }
};

module.exports.berzerk = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
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
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    var template = ability.stats.effect.template;
    var a = new ability.constructor(template, target);
    target.abilities.push(a);
    battle.addAura(a);
    return new Special(function() {
      let index = target.abilities.findIndex(b => b.id == a.id);
      console.log('removing ability', index)
      target.abilities.splice(index, 1);
      battle.removeAura(a);
    });
  }
};


module.exports.reflectDamage = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    battle.dealDamage(caster, target, triggeredPower, ability, true);
    return new Special();
  }
};

module.exports.phantomImage = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    let template = target.template;
    let tile = battle.grid.closestEmpty(caster.x, caster.y);
    battle.summon(caster, ability, template, tile)
    return new Special();
  }
};

module.exports.stealBlessing = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
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

module.exports.transferCurse = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    console.log('transferCurse')
    let effects = caster.activeEffects.filter(e => !e.expired && e.ability.stats.source == 'curse');

    let effect = effects[0];
    if(!effect) return;
    let index = caster.effects.indexOf(effect);
    caster.effects.splice(index, 1);
    effect.rounds = effect.ability.stats.duration;
    target.addEffect(caster, effect.ability, effect.power, true, power);
    return new Special();
  }
};

module.exports.dispel = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {

    let effects = target.activeEffects.filter(e => e.ability.stats.source == 'blessing');

    let effect = effects[0];
    if(!effect) return;
    let index = target.effects.indexOf(effect);
    target.effects.splice(index, 1);
    effect.rounds = effect.ability.stats.duration;
    return new Special();
  }
};

module.exports.cleanse = {
  when: 'per target',
  description: 'Removes all permanent ailments',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    console.log('cleanse', target.bio.name)
    target.removePermanentAilments();

    return new Special();
  }
};

module.exports.teleport = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
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
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
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
  when: 'per use',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    let tile = selections[0];
    console.log('blink', tile.x, tile.y, caster.x, caster.y)
    battle.grid.remove(caster.x, caster.y);
    caster.x = tile.x;
    caster.y = tile.y;
    battle.grid.setItem(caster);
    battle.render();
  }
};

module.exports.lifeLeech = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    // if(!triggeredPower) return;
    if(triggeredPower) {
      caster.heal(Math.ceil(triggeredPower/2))
    } else {
      caster.heal(Math.ceil(power/2))
    }
  }
};

module.exports.manaLeech = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    // if(!triggeredPower) return;
    if(triggeredPower) {
      caster.replenishMana(Math.ceil(triggeredPower/2));
    } else {
      caster.replenishMana(Math.ceil(power/2));
    }
  }
};

module.exports.polymorph = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    let rand = battle.roll(0, monsters.length-1);
    let monster = monsters[rand];
    let stacks = Math.floor(target.totalHealth / monster.stats.health);
    Object.assign(target.bio, monster.bio);
    Object.assign(target.stats, monster.stats);
    Object.assign(target.abilities, monster.abilities);
    target.damageTaken = 0;
    target.initialStacks = 1;
    target.addStack(stacks);
    target.abilities = target.createAbilities();
    target.template = monster;
  }
};


module.exports.chain = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    ability.chains.push(target);
    let cost = ability.stats.resourceCost;
    let nextTarget = battle.grid.inRadius(target.x, target.y, ability.stats.range)
    .find(p => p.item && !~ability.chains.indexOf(p.item) && p.item.team == target.team);
    console.log('chain', nextTarget)
    if(!nextTarget || ability.chains.length > 4) {
      ability.chains = [];
      ability.stats.resourceCost = cost;
      return;
    }
    ability.stats.resourceCost = 0;
    battle.useAbility(caster, [nextTarget], ability);
  }
};


module.exports.reflectArrows = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    if(triggeredBy.bio.type != 'attack' || triggeredBy.stats.range < 2) {
      target.triggerCount -= 1;
      return;
    }
    logger.log(target.bio.name, 'deflected arrow from', triggeredBy.bio.name);
    battle.useAbility(target, [triggeredBy.owner], triggeredBy, true, ability);
  }
}
