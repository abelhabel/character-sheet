const PL = require('PositionList2d.js');
function filterPassThrough() {
  return true;
}
function filterOnMeleeRange(a) {
  return a.potentialRange < 2;
}
function filterOnNonMeleeRange(a) {
  return a.potentialRange > 1;
}
function filterOnReactive(a) {
  return a.reactive;
}
function sortOnActorRange(a, b) {
  let g = a.potentialRange;
  let h = b.potentialRange;
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnActorRangeReversed(a, b) {
  let g = a.potentialRange;
  let h = b.potentialRange;
  if(g == h) return 0;
  return g < h ? -1 : 1;
}
function sortOnAbilityRange(a, b) {
  let g = a.stats.range;
  let h = b.stats.range;
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnMostExcited(a, b) {
  let g = a.activeEffects.length;
  let h = b.activeEffects.length;
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnMostEnergetic(a, b) {
  let g = a.totalMana;
  let h = b.totalMana;
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnMight(a, b) {
  let g = a.might;
  let h = b.might;
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnStrength(a, b) {
  let g = a.totalStat('attack');
  let h = b.totalStat('attack');
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnToughness(a, b) {
  let g = a.totalStat('defence');
  let h = b.totalStat('defence');
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnWeakness(a, b) {
  let g = a.totalStat('defence');
  let h = b.totalStat('defence');
  if(g == h) return 0;
  return g < h ? -1 : 1;
}
function sortOnAbilityMight(a, b) {
  let g = a.owner.abilityMight(a);
  let h = b.owner.abilityMight(b);
  if(g == h) return 0;
  return g >= h ? -1 : 1;
}
function sortOnFurthestSquareRadius(a, b, c) {
  let g = PL.prototype.squareRadius(a.x, a.y, b.x, b.y);
  let h = PL.prototype.squareRadius(a.x, a.y, c.x, c.y);
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnNearestSquareRadius(a, b, c) {
  let g = PL.prototype.squareRadius(a.x, a.y, b.x, b.y);
  let h = PL.prototype.squareRadius(a.x, a.y, c.x, c.y);
  if(g == h) return 0;
  return g < h ? -1 : 1;
}
function sortOnMostTargets(battle, a, ab, b, c) {
  let g = battle.abilityTargets(a, ab, b.x, b.y).actors.length;
  let h = battle.abilityTargets(a, ab, c.x, c.y).actors.length;
  if(g == h) return 0;
  return g > h ? -1 : 1;
}
function sortOnLeastTargets(battle, a, ab, b, c) {
  let g = battle.abilityTargets(a, ab, b.x, b.y).actors.length;
  let h = battle.abilityTargets(a, ab, c.x, c.y).actors.length;
  if(g == h) return 0;
  return g < h ? -1 : 1;
}
class AI {
  constructor(battle, actor, level) {
    this.battle = battle;
    this.actor = actor;
    this.level = level || 1;
  }

  act(Action) {
    if(this.actor.AI.behavior) {
      return this.script(Action);
    }
    return this['routine' + this.level](Action);
  }

  highMight(t, ability) {
    let {actor, battle} = this;
    let a = ability || actor.damaging.sort((a, b) => {
      return a.might > b.might ? -1 : 1;
    })
    return a.find(a => {
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
    return battle.grid.items.filter(m => m && m.constructor == actor.constructor)
    .filter(m => m.alive && m.team != actor.team)
    .sort(sortOn || sortOnActorRange);

  }

  allies(sortOn) {
    let {actor, battle} = this;
    return battle.grid.items.filter(m => m && m.constructor == actor.constructor)
    .filter(m => m.alive && m != actor && m.team == actor.team)
    .sort(sortOn || sortOnActorRange);

  }

  aliveActors(sortOn) {
    let {actor, battle} = this;
    return battle.grid.items.filter(m => m && m.constructor == actor.constructor)
    .filter(m => m.alive)
    .sort(sortOn || sortOnActorRange);
  }

  closestEmpty(tile) {
    let {actor, battle} = this;
    return battle.grid.around(tile.x, tile.y).filter( t => {
      return !t.item && battle.canWalkTo(actor, {x:t.x, y:t.y});
    })
    .sort((a, b) => {
      let d1 = battle.grid.steps(a.x, a.y, actor.x, actor.y);
      let d2 = battle.grid.steps(b.x, b.y, actor.x, actor.y);
      if(d1 == d2) return 0;
      return d1 < d2 ? -1 : 1;
    })[0];
  }

  findBestMoveForAbility(ability, select, target) {
    let {actor, battle} = this;
    let at = this.findBestAbilityTarget(ability, select, target);
    let ox = actor.x;
    let oy = actor.y;
    let moveToX = -1;
    let moveToY = -1;
    battle.grid.inRadius(actor.x, actor.y, actor.totalStat('movement'))
    .forEach(({item, x, y}) => {
      if(item) return;
      if(!battle.canWalkTo(actor, {x, y})) return;
      battle.grid.remove(actor.x, actor.y);
      actor.x = x;
      actor.y = y;
      battle.grid.setItem(actor);
      let t = this.findBestAbilityTarget(ability, select, target);
      if(t.targets.length > at.targets.length) {
        at = t;
        moveToX = x;
        moveToY = y;
        console.log(at, moveToX, moveToY, ability.stats.range)
      }
      battle.grid.remove(actor.x, actor.y);
      actor.x = ox;
      actor.y = oy;
      battle.grid.setItem(actor);
    });
    return {x: moveToX, y: moveToY, at};
  }

  findBestAbilityTarget(ability, select, target) {
    let {actor, battle} = this;
    if(!target) target = ability.stats.targetFamily;
    let t = [];
    let out = {
      p: {x: 0, y: 0},
      at: null,
      targets: [],
      select,
      target
    };
    switch(select) {
      case 'self':
        t = [battle.abilityTargets(actor, ability, actor.x, actor.y)];
        console.log('select self', t)
        break;
      case 'allies':
        t = this.allies().map(m => {
          return battle.abilityTargets(actor, ability, m.x, m.y);
        });
        break;
      case 'enemies':
        t = this.enemies().map(m => {
          return battle.abilityTargets(actor, ability, m.x, m.y);
        });
        break;
      case 'actor':
        t = this.aliveActors().map(m => {
          return battle.abilityTargets(actor, ability, m.x, m.y);
        });
        break;
      case 'ground':
        t = battle.grid.around(actor.x, actor.y, ability.stats.range)
        .map(({item, x, y}) => {
          return battle.abilityTargets(actor, ability, x, y);
        });
        break;
      default:
        break;
    }
    let best;
    switch(target) {
      case 'self':
        out.p.x = actor.x;
        out.p.y = actor.y;
        out.at = t[0];
        out.targets = [actor];
        break;
      case 'allies':
        best = null;
        t.forEach(at => {
          if(!best || at.allies.length > best.at.allies.length) {
            out.p.x = at.x;
            out.p.y = at.y;
            out.at = at;
            out.targets = at.allies;
            best = out;
          }
        });
        break;
      case 'enemies':
        best = null;
        t.forEach(at => {
          if(!best || at.enemies.length > best.at.enemies.length) {
            out.p.x = at.x;
            out.p.y = at.y;
            out.at = at;
            out.targets = at.enemies;
            best = out;
          }
        });
        break;
      default:
        best = null;
        t.forEach(at => {
          if(!best || at.actors.length > best.at.actors.length) {
            out.p.x = at.x;
            out.p.y = at.y;
            out.at = at;
            out.targets = at.actors;
            best = out;
          }
        });
    }

    return out;

  }

  getSortForTargetType(type, ability) {
    let {actor, battle} = this;
    let sorting = sortOnMight;
    switch(type) {
      case 'weakest':
        sorting = sortOnWeakness;
        break;
      case 'strongest':
        sorting = sortOnStrength;
        break;
      case 'mightiest':
        sorting = sortOnMight;
        break;
      case 'toughest':
        sorting = sortOnToughness;
        break;
      case 'furthest':
        sorting = (a, b) => sortOnFurthestSquareRadius(actor, a, b);
        break;
      case 'nearest':
        sorting = (a, b) => sortOnNearestSquareRadius(actor, a, b);
        break;
      case 'most':
        sorting = (a, b) => sortOnMostTargets(battle, actor, ability, a, b);
        break;
      case 'least':
        sorting = (a, b) => sortOnLeastTargets(battle, actor, ability, a, b);
        break;
      case 'excited':
        sorting = sortOnMostExcited;
        break;
      case 'energetic':
        sorting = sortOnMostEnergetic;
        break;
      default:
        sorting = sortOnMight;
    }
    return sorting;
  }

  getScriptActors(target, conditionTiles = []) {
    let actors = [];
    switch(target) {
      case 'it':
        actors = conditionTiles;
        break;
      case 'self':
        actors = [this.actor];
        break;
      case 'target':
        actors = this.aliveActors();
        break;
      case 'ally':
        actors = this.allies();
        break;
      case 'enemy':
        actors = this.enemies();
        break;
      default:
        actors = this.aliveActors();
    }
    return actors;
  }

  getFilterForRange(range) {
    let rangeFilter;
    switch(range) {
      case 'melee':
        rangeFilter = filterOnMeleeRange;
        break;
      case 'ranged':
        rangeFilter = filterOnNonMeleeRange;
        break;
      default:
        rangeFilter = filterPassThrough;
    }
    return rangeFilter;
  }

  checkScriptConditions(s, ability) {
    let {actor, battle} = this;
    let targeting = {
      ally: 'allies',
      enemy: 'enemies',
    };
    let conditionTiles = [];
    let met = s.cond.filter(c => {
      let filtered = [];
      let d = c.distance || 1000;
      // console.log('distance', d)
      // Condition is based on the Ability
      if(c.abilityTargeting) {
        if(!ability) return;
        let select = s.act.select || ability.stats.target;
        let target = targeting[c.target] || ability.stats.targetFamily;
        let t = this.findBestAbilityTarget(ability, select, target);
        filtered = t.targets;
      } else {
        // Condition is based on the state of the game
        if(c.target == 'self') {
          filtered = [this.actor];
        } else
        if(c.target == 'enemy') {
          filtered = this.enemies().filter(e => {
            return battle.grid.squareRadius(e.x, e.y, actor.x, actor.y) <= d;
          })
        } else
        if(c.target == 'ally') {
          filtered = this.allies().filter(e => {
            return battle.grid.squareRadius(e.x, e.y, actor.x, actor.y) <= d;
          });
        } else
        if(c.target == 'it') {
          filtered = conditionTiles;
        } else {
          filtered = this.aliveActors().filter(e => {
            return battle.grid.squareRadius(e.x, e.y, actor.x, actor.y) <= d;
          })
        }

        if(c.negDistance && !!filtered.length) {
          return;
        }
      }
      console.log("BEGIN FILTER", filtered)
      if(c.range) {
        if(c.range == 'melee') {
          filtered = filtered.filter(e => e.attacks.length && e.potentialRange < 2);

        } else
        if(c.range == 'ranged') {
          filtered = filtered.filter(e => e.potentialRange > 1);
        }
      }

      if(c.faction) {
        filtered = filtered.filter(e => c.neg ? e.bio.family != c.faction : e.bio.family == c.faction);
      }

      if(c.role) {
        switch(c.role) {
          case 'reactive':
            filtered = filtered.filter(filterOnReactive);
            break;
          default:
            filtered = filtered.filter(filterPassThrough);
        }
      }
      if(c.class) {
        filtered = filtered.filter(t => t.class == c.class);
      }
      if(c.state) {
        if(c.state == 'healthy') {
          filtered = filtered.filter(t => t.healthy);
        } else
        if(c.state == 'hurt') {
          filtered = filtered.filter(t => t.hurt);
        } else
        if(c.state == 'wounded') {
          filtered = filtered.filter(t => t.wounded);
        } else
        if(c.state == 'sick') {
          filtered = filtered.filter(t => t.sick);
        } else
        if(c.state == 'near death') {
          filtered = filtered.filter(t => t.nearDeath);
        } else
        if(c.state == 'outnumbered') {
          filtered = filtered.filter(t => t.outnumbered);
        } else
        if(c.state == 'flanked') {
          filtered = filtered.filter(t => t.flanked);
        } else
        if(c.state == 'occupied') {
          filtered = filtered.filter(t => t.occupied && !t.isOccupiedBy(actor));
          console.log('occupied', filtered)
        }
      }
      if(c.effect) {
        filtered = filtered.filter(f => {
          return !f.hasAilment('blinded') && (c.neg ? !f.hasEffect(c.effect) : f.hasEffect(c.effect));
        });
      }

      if(c.aura) {
        filtered = filtered.filter(f => {
          return c.neg ? !f.affectedByAura(c.aura) : f.affectedByAura(c.aura);
        });
      }

      if(c.ailment) {
        filtered = filtered.filter(f => {
          if(c.permanentAilment) {
            return c.neg ? !f.hasPermanentAilment(c.ailment) : f.hasPermanentAilment(c.ailment);
          } else {
            return c.neg ? !f.hasAilment(c.ailment) : f.hasAilment(c.ailment);
          }
        });
      }

      if(c.vigor) {
        filtered = filtered.filter(f => {
          return c.neg ? !f.hasVigor(c.vigor) : f.hasVigor(c.vigor);
        });
      }

      if(c.minion) {
        filtered = filtered.filter(f => {
          return c.neg ? !f.hasMinion(c.minion) : f.hasMinion(c.minion);
        });
      }

      if(c.stat && c.statAmount) {
        filtered = filtered.filter(f => {
          let s = f.totalStat(c.stat);
          if(c.stat == 'apr') {
            s -= battle.turn.apts;
          }
          console.log('filter stat', c.statAmount, s)
          return s >= c.statAmount;
        })
      }

      if(c.numTargets == 0 && filtered.length) {
        return;
      }
      let num = c.numTargets || 1;
      console.log('FILTERED:', c.part, num, filtered.length)
      if(c.noTarget) {
        if(filtered.length) {
          console.log('should be no target', filtered)
          return;
        }
      } else {
        if(filtered.length < num) return;
      }
      conditionTiles = filtered;
      return true;

    })
    // if(s.act.target == 'it' && ability) {
    //   console.log('it & ability', conditionTiles)
    //   conditionTiles = conditionTiles.filter(tile => {
    //     return battle.abilityTargets(actor, ability, tile.x, tile.y).validTargets;
    //   });
    //   console.log('it & ability', conditionTiles)
    //   if(!conditionTiles.length) {
    //     return {pass: false, conditionTiles};
    //   }
    // }
    return {pass: met.length == s.cond.length, conditionTiles};
  }

  script(Action) {
    // console.log('scripted actions')
    let {actor, battle} = this;
    let target = null;
    // console.log('SCRIPTS', actor.aiScript)
    let conditionTiles = [];
    let targeting = {
      ally: 'allies',
      enemy: 'enemies',
    };
    let action;
    let script = actor.aiScript.find(s => {
      // console.log(s)
      // find if ability is usable
      console.log(s.act.part)
      let ability = actor.getAbility(s.act.ability);
      console.log('CHECK CONDITIONS')
      let check = this.checkScriptConditions(s, ability);
      if(!check.pass) return;
      conditionTiles = check.conditionTiles
      console.log('conditionTiles', conditionTiles)
      let targetTypeSort = this.getSortForTargetType(s.act.targetType, ability);
      let rangeFilter = this.getFilterForRange(s.act.range);
      let actors = this.getScriptActors(s.act.target, conditionTiles);
      actors = actors.filter(rangeFilter).sort(targetTypeSort);
      let inRange = actors;
      // ACT
      if(s.act.select == 'self') {
        inRange = [actor];
      }
      console.log('inRange', inRange, s)
      if(s.act.move) {
        if(!actor.canMove) {
          console.log('cannot move')
          return;
        }
        if(ability && actor.canUseAbility(ability)) {
          let select = s.act.select || ability.stats.target;
          let target = targeting[s.act.target] || ability.stats.targetFamily;
          let p = this.findBestMoveForAbility(ability, select, target);
          if(p.x < 0 || p.y < 0) {
            console.log('no tile found', p)
            return;
          }
          if(p.x == actor.x && p.y == actor.y) {
            console.log('same position');
            return;
          }
          if(s.act.numTargets && s.act.numTargets > p.at.targets.length) {
            console.log('not enough ability targets to move');
            return;
          }
          let t = battle.grid.path(actor.x, actor.y, p.x, p.y);
          console.log('found best position to move', p, t[1][0], t[1][1]);
          if(s.act.moveFully) {
            return action = new Action('move', [p]);
          } else {
            return action = new Action('move', [{x: t[1][0], y: t[1][1]}]);
          }
        } else
        if(s.act.moveToMost) {
          let best = 0;
          let p = {x: -1, y: -1};
          inRange.forEach(m => {
            battle.grid.around(m.x, m.y, 1)
            .forEach(t => {
              let same = false;
              if(t.item)  {
                if(t.x == actor.x && t.y == actor.y) {
                  same = true;
                  console.log('checking current position')
                } else {
                  return;
                }
              }
              if(s.act.moveFully && !battle.canWalkTo(actor, t) && !same) {
                console.log('cannot fully move to', t)
                return;
              }
              let count = battle.grid.around(t.x, t.y, 1)
              .filter(k => {
                if(s.act.target == 'enemy') {
                  return battle.areEnemies(actor, k.item);
                }
                if(s.act.target == 'ally') {
                  return battle.areAllies(actor, k.item);
                }
                return true;
              }).length;
              if(count > best) {
                console.log(best)
                best = count;
                p = t;
              }
            });
          });
          if(p.x < 0 || p.y < 0) {
            console.log('no tile found')
            return;
          }
          if(p.x == actor.x && p.y == actor.y) {
            console.log('same position')
            return;
          }
          console.log('move to most', actor.x, actor.y, p.x, p.y, best)
          let t = battle.grid.path(actor.x, actor.y, p.x, p.y);
          if(!t.length) return;
          if(s.act.moveFully) {
            return action = new Action('move', [p]);
          } else {
            return action = new Action('move', [{x: t[1][0], y: t[1][1]}]);
          }
          return action = new Action('move', [{x: t[1][0], y: t[1][1]}]);
        } else
        if(s.act.moveAway) {
          if(!inRange.length) return;
          console.log('move away')
          let l = this.moveFurtherAway(inRange[0]);
          if(!l) {
            return;
          }
          return action = new Action('move', [{x: l[0], y: l[1]}]);
        } else {
          if(!inRange.length) return;
          console.log('moveTowards', inRange[0].bio.name, inRange[0].team);
          let inPosition = battle.grid.around(inRange[0].x, inRange[0].y, 1).find(t => t.item == actor);
          if(inPosition) {
            console.log('already there');
            return;
          }
          // let tile = battle.grid.closestEmpty(inRange[0].x, inRange[0].y, (x, y) => {
          //   return battle.canWalkTo(actor, {x, y});
          // }, 10);
          let tile;
          let tiles = inRange.map(m => {
            return battle.grid.around(m.x, m.y, 1)
            .find(item => {
              return !item.item && battle.canWalkTo(actor, item);
            });
          })
          .filter(tile => tile);
          if(!tiles.length) {
            tile = battle.grid.around(inRange[0].x, inRange[0].y, 1)
            .find(item => {
              let path = battle.grid.path(actor.x, actor.y, item.x, item.y);
              return !item.item && path.length;
            });

          } else {
            tile = tiles[0];
          }

          console.log('TILE', tile);
          let t = battle.grid.path(actor.x, actor.y, tile.x, tile.y);
          return action = new Action('move', [{x: t[1][0], y: t[1][1]}]);
        }
      } else
      if(s.act.ability) {
        if(!actor.canUseAbility(ability)) return;
        // if acbility has no targets condition is not met
        let {radius, range} = ability.stats;
        if(ability.stats.summon) {
          if(s.act.withinRadius) {
            let m = 'around';
            if(s.act.radiusType == 'steps') {
              m = 'inRadius';
            }
            let tile;
            let n = 0;
            battle.grid.around(actor.x, actor.y, range)
            .forEach(item => {
              if(item.item) return;
              let t = battle.grid[m](item.x, item.y, s.act.withinRadius)
              .filter(item => {
                if(s.act.target == 'enemy') {
                  return battle.areEnemies(actor, item.item);
                }
                if(s.act.target == 'ally') {
                  return battle.areAllies(actor, item.item);
                }
              });
              if(t.length > n) {
                n = t.length;
                tile = item;
              }
            })
            if(!tile) {
              console.log('no tile to summon to', tile, n, m);
              return;
            }
            console.log('summon within', tile)
            inRange = [tile];
          } else {
            if(ability.stats.shape == 'point') {
              let tile = battle.grid.closestEmpty(actor.x, actor.y, null, radius+1);
              console.log('summon to', tile)
              if(!tile) return;
              inRange = [tile];
            } else {
              let x = (battle.w / 2) - actor.x > 1 ? 1 : -1;
              let y = (battle.h / 2) - actor.y > 1 ? 1 : -1;
              let at = battle.abilityTargets(actor, ability, actor.x + x, actor.y + y);
              inRange = at.tiles;
            }
          }
        } else
        if(s.act.select == 'self' || ability.stats.target == 'self') {
          let t = battle.abilityTargets(actor, ability, actor.x, actor.y);
          if(!t.validTargets) {
            console.log('no valid targets on self');
            return;
          }
        } else {
          if(ability.stats.shape == 'point')  {
            inRange = inRange.filter(m => {
              return battle.abilityTargets(actor, ability, m.x, m.y).validTargets;
            })
          } else {
            let select = s.act.select || ability.stats.target;
            let target = targeting[s.act.target] || ability.stats.targetFamily;
            let t = this.findBestAbilityTarget(ability, select, target);
            if(!t.targets.length) {
              console.log('cannot use ability', ability.bio.name, select, target, t)
              return;
            }
            console.log('BEST ABILITY TARGET', t)
            inRange = [t.p];
          }
        }

        if(ability.stats.source == 'blessing') {
          inRange = inRange.filter(m => !m.hasAilment('blinded'));
        }

        if(!inRange.length) return;

        if(ability.stats.selections > 1) {
          let targets = [];
          let index = 0;
          for(var i = 0; i < ability.stats.selections; i++) {
            targets.push(inRange[index]);
            index++;
            if(!inRange[index]) {
              index = 0;
            }
          }
          console.log('multiple selections', targets)
          return action = new Action('use ability', targets, ability.template.id);
        } else {
          return action = new Action('use ability', [inRange[0]], ability.template.id);
        }
      } else
      if(s.act.wait && battle.canWait(actor)) {
        return action = new Action('wait');
      } else
      if(s.act.defend) {
        return action = new Action('defend');
      } else {
        return false;
      }
    })
    console.log("SCRIPT", script && script.act.part, action)
    if(!action) {
      console.log('default AI')
      return this['routine' + this.level](Action);
    } else {
      return battle.addAction(action);
    }
  }

  moveTowards(b, Action) {
    let {actor, battle} = this;
    if(actor.canMove) {
      var l = this.moveCloser(b);
      if(!l) {
        return battle.addAction(new Action('defend'));
      }
      return battle.addAction(new Action('move', [{x: l[0], y: l[1]}]))
    } else {
      return battle.addAction(new Action('defend'));
    }
  }


  moveCloser(potentialTarget) {
    let {actor, battle} = this;
    let p = {x: -1, y: -1};
    if(potentialTarget) {
      p = battle.grid.closestEmpty(potentialTarget.x, potentialTarget.y, (x, y) => {
        return battle.canWalkTo(actor, {x, y});
      })
    }
    if(!p) {
      let tile = battle.grid.closest(actor.x, actor.y, t => {
        if(!(t instanceof actor.constructor)) return;
        // if(t.team == actor.team) return;
        return true;
      });
      p = battle.grid.around(tile.x, tile.y).filter( t => {
        return !t.item && battle.isWalkPathFree(actor, {x:t.x, y:t.y});
      })
      .sort((a, b) => {
        let d1 = battle.grid.steps(a.x, a.y, actor.x, actor.y);
        let d2 = battle.grid.steps(b.x, b.y, actor.x, actor.y);
        if(d1 == d2) return 0;
        return d1 < d2 ? -1 : 1;
      })[0];
    }
    if(p.x < 0 || p.y < 0) {
      return
    }
    var path = battle.grid.path(actor.x, actor.y, p.x, p.y);
    return path[1];
  }

  moveAway(b, Action) {
    let {actor, battle} = this;
    if(actor.canMove) {
      var l = this.moveFurtherAway(b);
      if(!l) {
        return battle.addAction(new Action('defend'));
      }
      return battle.addAction(new Action('move', [{x: l[0], y: l[1]}]))
    } else {
      return battle.addAction(new Action('defend'));
    }
  }

  moveFurtherAway(potentialTarget) {
    let t = potentialTarget;
    let {actor, battle} = this;
    let tiles = battle.grid.around(actor.x, actor.y);
    let tile = null;
    let r = 0;
    tiles.forEach(a => {
      let d = battle.grid.steps(a.x, a.y, t.x, t.y);
      if(!a.item && battle.canWalkTo(actor, {x:a.x, y:a.y}) && d > r) {
        r = d;
        tile = a;
      }
    })
    if(!tile) return;
    var path = battle.grid.path(actor.x, actor.y, tile.x, tile.y);
    return path[1];
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
