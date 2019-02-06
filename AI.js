function sortOnActorRange(a, b) {
  let g = a.potentialRange;
  let h = b.potentialRange;
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnAbilityRange(a, b) {
  let g = a.stats.range;
  let h = b.stats.range;
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnMight(a, b) {
  let g = a.might;
  let h = b.might;
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnAbilityMight(a, b) {
  let g = a.owner.abilityMight(a);
  let h = b.owner.abilityMight(b);
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
class AI {
  constructor(battle, actor, level) {
    this.battle = battle;
    this.actor = actor;
    this.level = level || 1;
  }

  act(Action) {
    return this['routine' + this.level](Action);
  }

  highMight(t) {
    let {actor, battle} = this;
    return actor.damaging.sort((a, b) => {
      return a.might > b.might ? -1 : 1;
    })
    .find(a => {
      if(!actor.canUseAbility(a)) return;
      if(a.stats.element == 'vitality' && t.bio.family != 'Undead') return;
      if(a.stats.element == 'rot' && t.bio.family == 'Undead') return;
      if(battle.grid.squareRadius(actor.x, actor.y, t.x, t.y) <= a.stats.range) {
        return true;
      }
    })
  }

  pickAbilityAndTarget() {
    let {actor, battle} = this;
    let out = {ability: null, target: null, potentialTarget: null};
    battle.grid.closest(actor.x, actor.y, t => {
      if(!(t instanceof actor.constructor)) return;
      if(t.team == actor.team) return;
      out.potentialTarget = t;
      out.ability = this.highMight(t);
      if(out.ability) {
        out.target = t;
        return true;
      }
    })
    return out;
  }

  enemies(sortOn) {
    let {actor, battle} = this;
    return battle.getEnemyTeam(actor.team)
    .filter(m => m.alive)
    .sort(sortOn || sortOnActorRange);

  }

  closestEmpty(tile) {
    let {actor, battle} = this;
    return battle.grid.around(tile.x, tile.y).filter( t => {
      return !t.item && battle.grid.canWalkTo(actor.x, actor.y, t.x, t.y);
    })
    .sort((a, b) => {
      let d1 = battle.grid.steps(a.x, a.y, actor.x, actor.y);
      let d2 = battle.grid.steps(b.x, b.y, actor.x, actor.y);
      if(d1 == d2) return 0;
      return d1 < d2 ? -1 : 1;
    })[0];
  }

  moveCloser(potentialTarget) {
    let {actor, battle} = this;
    let tile = battle.grid.closest(actor.x, actor.y, t => {
      if(!(t instanceof actor.constructor)) return;
      if(t.team == actor.team) return;
      return true;
    });
    var p = battle.grid.around(tile.x, tile.y).filter( t => {
      return !t.item && battle.grid.canWalkTo(actor.x, actor.y, t.x, t.y);
    })
    .sort((a, b) => {
      let d1 = battle.grid.steps(a.x, a.y, actor.x, actor.y);
      let d2 = battle.grid.steps(b.x, b.y, actor.x, actor.y);
      if(d1 == d2) return 0;
      return d1 < d2 ? -1 : 1;
    })[0];
    if(!p) {
      if(potentialTarget) {
        p = battle.grid.closestEmpty(potentialTarget.x, potentialTarget.y, (x, y) => {
          return battle.grid.canWalkTo(actor.x, actor.y, x, y);
        })
      }
      if(!p) {
        return;
      }
    }
    var path = battle.grid.path(actor.x, actor.y, p.x, p.y);
    path.shift();
    return path.shift();
  }

  routine1(Action) {
    let {actor, battle} = this;
    // For each enemy, starting with closest,
    // find a Spell or Attack that can be used.
    // If no Ability is found, Move then Defend
    let {target, potentialTarget, ability} = this.pickAbilityAndTarget();
    if(ability && target) {
      actor.selectAbility(ability);
      return battle.addAction(new Action('use ability', [target], ability.template.id));
    } else
    if(actor.canMove) {
      var l = this.moveCloser(potentialTarget);
      if(!l) {
        return battle.addAction(new Action('defend'));
      }
      return battle.addAction(new Action('move', [{x: l[0], y: l[1]}]))
    } else {
      return battle.addAction(new Action('defend'));
    }
  }

  routine2(Action) {
    let {actor, battle} = this;
    // 1. Find enemy with longest range
    // 2. Attack if possible
    // 3. Move towards longest range enemy if can't attak.
    let enemies = this.enemies(sortOnActorRange);
    let abilities = actor.damaging.sort(sortOnAbilityMight).filter(a => actor.canUseAbility(a));
    // check if any of the enemies can be attacked by any of the abilities
    let enemy;
    let ability;
    abilities.find(a => {
      return enemies.find(e => {
        let inRange = battle.inRange(actor, e, a);
        if(inRange) {
          enemy = e;
          ability = a;
        }
        return inRange;
      })
    })
    let t = enemies[0];
    actor.selectAbility(ability);
    let shouldMoveBeforeRangedAttack = ability && actor.potentialRange > 1 && abilities.length > 1 && abilities[0].stats.range < ability.stats.range;
    if(ability && enemy && !shouldMoveBeforeRangedAttack) {
      return battle.addAction(new Action('use ability', [enemy], ability.template.id));
    } else
    if(t && actor.canMove) {
      let tile = this.closestEmpty(t);
      let path = tile ? battle.grid.path(actor.x, actor.y, tile.x, tile.y) : [];
      let l = path[1];
      if(!l) {
        return this.routine1(Action);
      }
      return battle.addAction(new Action('move', [{x: l[0], y: l[1]}]));
    } else {
      return this.routine1(Action);
    }
  }

  routine3(Action) {
    console.log('routine3')
    let {actor, battle} = this;
    if(!battle.tr.currentRound && battle.canWait(actor)) {
      console.log('wait')
      return battle.addAction(battle.createAction({type: 'wait'}));
    }
    return this.routine2(Action);
  }
}

module.exports = AI;
