module.exports = {};
const monsters = require('monsters.js');
class Special {
  constructor(onEffectEnd = null, preventUse, afterUse) {
    this.onEffectEnd = onEffectEnd;
    this.preventUse = preventUse;
    this.afterUse = afterUse;
  }
}

module.exports.addMonster = {
  when: 'per use',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    let team = battle.currentTeam;
    let m = team.pickRandomMonster();
    if(!m) {
      logger.log('no more monsters to portal in');
      return new Special();
    }
    m.team = battle.currentActor.team;
    battle.addMonster(m, target);
    return new Special();
  }
};

module.exports.knockback = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    tiles = battle.grid.inLine(caster.x, caster.y, target.x, target.y, 10).filter(t => !t.item);
    if(tiles.length) {
      battle.grid.remove(target.x, target.y);
      target.move(tiles[0].x, tiles[0].y);
      battle.grid.setItem(target);
    }
    return new Special();
  }
}

module.exports.pullIn = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    tiles = battle.grid.inLOS(caster.x, caster.y, target.x, target.y);
    // tiles = battle.grid.inLOS(target.x, target.y, caster.x, caster.y);
    tiles = tiles.filter(t => !t.item);
    if(tiles.length) {
      battle.grid.remove(target.x, target.y);
      target.move(tiles[0].x, tiles[0].y);
      battle.grid.setItem(target);
    }
    return new Special();
  }
}

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

module.exports.banish = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    if(!target.summoned) {
      logger.log(target.bio.name, 'is not a summoned creature.');
      return;
    };
    battle.dealDamage(caster, target, target.totalHealth, ability);
    return new Special();
  }
};

module.exports.mark = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {

    return new Special();
  }
};

module.exports.consumeMark = {
  when: 'before use',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    let t = battle.grid.get(selections[0].x, selections[0].y);
    if(!t) return new Special();
    let mark = t.effects.find(e => e.ability.stats.special == 'mark');
    if(!mark) return new Special();
    let {minPower, attribute} = mark.ability.stats;
    if(attribute == 'damage') {
      let d = mark.rounds * minPower;
      if(!caster.bonusdamage) caster.bonusdamage = 0;
      caster.bonusdamage += d;
      console.log('added damage bonus', d, caster)
      return new Special(null, null, () => {
        caster.bonusdamage -= d;
        console.log('removed damage bonus', d);
      })
    }
    return new Special();
  }
};

module.exports.charge = {
  when: 'per use',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
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

module.exports.charm = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    let allyTeam = battle.getAllyTeam(target.team);
    let enemyTeam = battle.getEnemyTeam(target.team);
    allyTeam.splice(allyTeam.indexOf(target), 1);
    target.team = caster.team;
    enemyTeam.push(target);
    logger.log(`${target.bio.name} was charmed and switched teams.`);
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
  when: 'per target, after effect',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    var originalTeam = target.team;
    target.team = caster.team;
    var t = battle.grid.closest(target.x, target.y, (b) => {
      return b instanceof target.constructor && b.team != caster.team;
    });
    if(!t) {
      target.team = originalTeam;
      return;
    }
    var a = target.actives.find(a => a.stats.targetFamily == 'enemies' && battle.grid.squareRadius(target.x, target.y, t.x, t.y) <= a.stats.range);
    if(!a)  {
      target.team = originalTeam;
      return;
    }
    battle.useAbility(target, [t], a);
    target.team = originalTeam;
    return new Special();
  }
};

module.exports.berzerkAlly = {
  when: 'per target, after effect',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    var t = battle.grid.closest(target.x, target.y, (b) => {
      return b instanceof target.constructor && b.team != caster.team;
    });
    if(!t) return;
    var a = target.selectBestAbility(t);
    if(!a) return;
    battle.useAbility(target, [t], a);
    return new Special();
  }
};

module.exports.sharedPain = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    if(!triggeredBy) return;
    let d = Math.ceil(triggeredPower/2);
    battle.dealDamage(triggeredBy.owner, caster, d, triggeredBy, true);
    return new Special();
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
    let effects = caster.activeEffects.filter(e => !e.expired && e.ability.stats.source == 'curse');

    let effect = effects[0];
    if(!effect) return;
    caster.removeEffect(effect);
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
    let benefactor = caster;
    if(!victim || !benefactor) return;
    let roll = ability.roll();
    let mana = victim.totalMana;
    victim.useMana(roll);
    let manaTaken = mana - victim.totalMana;
    logger.log(`${benefactor.bio.name} steals ${manaTaken} from ${victim.bio.name}`);
    benefactor.replenishMana(manaTaken);
  }
};

module.exports.blink = {
  when: 'per use',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    let tile = selections[0];
    if(battle.grid.get(tile.x, tile.y)) tile = battle.grid.closestEmpty(tile.x, tile.y);
    if(!tile) {
      return console.log('no empty tiles')
    }
    battle.grid.remove(caster.x, caster.y);
    caster.x = tile.x;
    caster.y = tile.y;
    battle.grid.setItem(caster);
    battle.render();
  }
};

module.exports.lifeLeech = {
  when: 'per target',
  recurring: true,
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    if(triggeredPower) {
      let d = Math.ceil(triggeredPower/2);
      logger.log(caster.bio.name, 'leeched', d, 'life');
      caster.heal(d)
    } else {
      let d = Math.ceil(power/2);
      logger.log(caster.bio.name, 'leeched', d, 'life');
      caster.heal(d)
    }

  }
};

module.exports.manaLeech = {
  when: 'per target',
  recurring: true,
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
    let name = target.bio.name;
    let rand = battle.roll(0, monsters.length-1);
    let monster = new target.constructor(monsters[rand]);
    let stacks = Math.floor(target.totalHealth / monster.stats.health);
    Object.assign(target.bio, monster.bio);
    Object.assign(target.stats, monster.stats);
    Object.assign(target.AI, monster.AI);
    Object.assign(target._abilities, monster._abilities);
    // target.damageTaken = 0;
    // target.initialStacks = 1;
    // target.addStack(stacks);
    target.parseAI();
    target.abilities = target.createAbilities();
    target.template = monsters[rand];
    target.cacheCanvases();
    battle.render();
    logger.log(`${caster.bio.name} polymorphed ${name} to ${target.bio.name}`);
  }
};


module.exports.chain = {
  when: 'per target',
  fn: function (battle, caster, target, ability, power, triggeredPower, selections, triggeredBy) {
    ability.chains.push(target);
    let cost = ability.stats.resourceCost;
    let nextTarget = battle.grid.inRadius(target.x, target.y, ability.stats.range)
    .find(p => p.item && !~ability.chains.indexOf(p.item) && p.item.team == target.team);
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
    if(triggeredBy.stats.source != 'attack' || triggeredBy.stats.range < 2) {
      target.triggerCount -= 1;
      return;
    }
    logger.log(target.bio.name, 'deflected arrow from', triggeredBy.bio.name);
    battle.useAbility(target, [triggeredBy.owner], triggeredBy, true, ability);
  }
}
