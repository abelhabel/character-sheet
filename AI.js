class AI {
  constructor(battle, actor, level) {
    this.battle = battle;
    this.actor = actor;
    this.level = level || 1;
  }

  act(Action) {
    this['routine' + this.level](Action);
  }

  routine1(Action) {
    let {actor, battle} = this;
    // For each enemy, starting with closest,
    // find a Spell or Attack that can be used.
    // If no Ability is found, Move then Defend
    let target;
    let ability;
    let tile = battle.grid.closest(actor.x, actor.y, t => {
      if(!(t instanceof actor.constructor)) return;
      if(t.team == actor.team) return;
      return actor.damaging.sort((a, b) => {
        return a.might > b.might ? -1 : 1;
      })
      .find(a => {
        if(!actor.canUseAbility(a)) return;
        if(a.stats.element == 'vitality' && t.bio.family != 'Undead') return;
        if(a.stats.element == 'rot' && t.bio.family == 'Undead') return;
        if(battle.grid.squareRadius(actor.x, actor.y, t.x, t.y) <= a.stats.range) {
          ability = a;
          target = t;
          return true;
        }
      })
    })
    if(ability) {
      actor.selectAbility(ability);
      return battle.addAction(new Action('use ability', [target], ability.template.id));

    } else
    if(actor.canMove) {
      tile = battle.grid.closest(actor.x, actor.y, t => {
        if(!(t instanceof actor.constructor)) return;
        if(t.team == actor.team) return;
        return true;
      });
      var p = battle.grid.around(tile.x, tile.y).filter( t => {
        return !t.item;
      })
      .sort((a, b) => {
        let d1 = battle.grid.steps(a.x, a.y, actor.x, actor.y);
        let d2 = battle.grid.steps(b.x, b.y, actor.x, actor.y);
        return d1 < d2 ? -1 : 1;
      })[0];
      if(!p) {
        return battle.addAction(new Action('defend'));
      }
      var path = battle.grid.path(actor.x, actor.y, p.x, p.y);
      path.shift();
      var l = path.shift();
      if(!l) {
        return battle.addAction(new Action('defend'));
      }
      return battle.addAction(new Action('move', [{x: l[0], y: l[1]}]))
    } else {
      return battle.addAction(new Action('defend'));
    }
    console.log('tile', tile);
    console.log('ability', ability);
  }
}

module.exports = AI;
