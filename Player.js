const Inventory = require('Inventory.js');
const QuestLog = require('QuestLog.js');
const Crafting = require('Crafting.js');
const PL = require('PositionList2d.js');
const guid = require('guid.js');
function filterResource(r) {
  return r.item && r.item.stats.resource
}

class AdventureAI {
  constructor(jobs) {
    this.jobs = jobs;
    this.jobIndex = 0;
    this.actionsTaken = 0;
    this.maxActions = 10;
  }

  get job() {
    return this.jobs[this.jobIndex];
  }

  nextJob() {
    this.jobIndex += 1;
    if(this.jobIndex >= this.jobs.length) {
      this.jobIndex = 0;
    }
    console.log('nextJob', this.job)
  }

  canAct(adventure) {
    return adventure.player.movesLeft && this.actionsTaken < this.maxActions;
  }

  plan(adventure) {
    return this.act(adventure)
    .then(result => {
      this.actionsTaken += 1;
      if(result == 'done') {
        if(this.canAct(adventure)) {
          this.nextJob();
          return this.plan(adventure);
        } else {
          return;
        }
      }
      if(result == 'done' || !this.canAct(adventure)) {
        this.actionsTaken = 0;
        this.jobIndex = 0;
        console.log('Done Planning', result)
        return Promise.resolve();
      }

      return this.plan(adventure);
    })
  }

  pickupResource(adventure, r) {
    if(r.item.adventure.action == 'give one') {
      name = adventure.rand.pick(r.item.adventure.resources);
      adventure.takeResource(r.x, r.y, name);
    } else
    if(r.item.adventure.action == 'give all') {
      adventure.takeAll(r.x, r.y);
    }
    return Promise.resolve(adventure.consumeTile(r.x, r.y));
  }

  pickupIngredient(adventure, r) {
    if(r.item.adventure.action == 'give one') {
      name = adventure.rand.pick(r.item.adventure.ingredients);
      adventure.takeIngredient(r.x, r.y, name);
    } else
    if(r.item.adventure.action == 'give all') {
      adventure.takeAll(r.x, r.y);
    }
    return Promise.resolve(adventure.consumeTile(r.x, r.y));
  }

  pickupPower(adventure, r) {
    if(r.item.adventure.action == 'give one') {
      if(r.item.adventure.xp) {
        adventure.takeXP(r.x, r.y);
      } else
      if(r.item.adventure.leaderStats.length) {
        let stat = adventure.rand.pick(r.item.adventure.leaderStats);
        adventure.takeLeaderStat(r.x, r.y, stat.toLowerCase());
      }
    } else
    if(r.item.adventure.action == 'give all') {
      adventure.takeAll(r.x, r.y);
    }
    return Promise.resolve(adventure.consumeTile(r.x, r.y));
  }

  walk(adventure, grid, items) {
    let {x, y} = adventure.pp;
    let paths = [];
    items.forEach(r => {
      grid.remove(r.x, r.y);
      let p = grid.path(x, y, r.x, r.y);
      grid.set(r.x, r.y, r.item);
      p.pop();
      if(p.length) {
        paths.push(p);
      }
    })

    if(!paths.length) return Promise.resolve("done");

    paths.sort((a, b) => {
      if(a.length < b.length) return -1;
      if(b.length < a.length) return 1;
      return 0;
    })
    return adventure.walk(adventure.player.team, paths[0])
  }

  act(adventure) {

    // get highest priority job
    let job = this.job;
    logger.log(`AI looking for job: ${job}`);
    let {obstacles, monsters, history} = adventure.layers;
    let {x, y} = adventure.pp;
    let player = adventure.player;
    let pp = adventure.pp;
    let grid = PL.combine([obstacles.items, monsters.items]);
    // set player position to walkable to make it easier to find path
    // grid.remove(x, y);
    if(job == 'aquire resources') {
      // find any adjacent resources that can be picked up
      let filter = (r) => {
        let record = history.items.get(r.x, r.y);
        return r.item && !record.isConsumed(r.item) && r.item.containsResource
      };
      let r = obstacles.items.around(x, y, 1).find(filter);
      if(r) {
        return this.pickupResource(adventure, r);
      }
      // find any resources that are reachable
      let resources = obstacles.items.inRadius(x, y, player.vision+20).filter(filter);
      if(resources.length) {
        return this.walk(adventure, grid, resources);
      }
    }
    if(job == 'aquire power') {
      let filter = (r) => {
        let record = history.items.get(r.x, r.y);
        return r.item && !record.isConsumed(r.item) && (r.item.adventure.xp || r.item.adventure.leaderStats.length);
      };
      // find any adjacent resources that can be picked up or used
      let r = obstacles.items.around(x, y, 1).find(filter);
      if(r) {
        this.pickupPower(adventure, r);
      }
      // find any xp that are reachable
      let powers = obstacles.items.inRadius(x, y, player.vision+20).filter(filter);
      if(powers.length) {
        return this.walk(adventure, grid, powers);
      }
    }
    if(job == 'aquire ingredients') {
      let filter = (r) => {
        let record = history.items.get(r.x, r.y);
        return r.item && !record.isConsumed(r.item) && r.item.containsIngredients;
      };
      // find any adjacent resources that can be picked up or used
      let r = obstacles.items.around(x, y, 1).find(filter);
      if(r) {
        this.pickupIngredient(adventure, r);
      }
      // find any xp that are reachable
      let powers = obstacles.items.inRadius(x, y, player.vision+20).filter(filter);
      if(powers.length) {
        return this.walk(adventure, grid, powers);
      }
    }
    return Promise.resolve("done");
  }
}

class Player {
  constructor(team, clan, AIControlled) {
    this.id = guid();
    this.team = team;
    this.clan = clan;
    this.AIControlled = AIControlled;
    this.AI = this.AIControlled && new AdventureAI(['aquire power', 'aquire resources', 'aquire ingredients']);
    this.position = {x: 0, y: 0};
    this.vision = 8;
    this.stats = {
      movement: 20,
      vision: 8,
      xp: 0
    };
    this.pools = {
      movement: 0
    }
    this.resources = {
      gold: 0,
      azurite: 0, //water
      zircon: 0, //fire
      iron: 0, //physical
      topaz: 0, //air
      adamite: 0, //earth
      brucite: 0, //vitality,
      mud: 0, //rot

    };
    this.inventory = new Inventory();
    this.quests = new QuestLog();
    this.crafting = new Crafting();
    this.skills = [
      {
        name: 'mechanics',
        value: 2
      },
      {
        name: 'exploration',
        value: 2
      },
      {
        name: 'mythology',
        value: 2
      },
      {
        name: 'divinity',
        value: 2
      },
      {
        name: 'necromancy',
        value: 2
      },
      {
        name: 'demonology',
        value: 2
      },
      {
        name: 'physiology',
        value: 2
      },
      {
        name: 'trickery',
        value: 2
      },
      {
        name: 'strategy',
        value: 2
      },
      {
        name: 'tactics',
        value: 2
      },
    ];
  }

  get leader() {
    return this.team.leaders[0];
  }

  resetMovement() {
    this.pools.movement = 0;
  }

  addXP(xp) {
    this.stats.xp += xp;
    let stats = this.xpStats;
    this.team.units.forEach(m => m.addXP(xp));
  }

  addResource(a, r) {
    this.resources[r] += a;
  }

  checkLevel(check) {
    if(check.type == 'skill') {
      let skill = this.skills.find(s => s.name == check.subtype);
      return skill ? skill.value : 0;
    }
  }

  addLeaderStat(name, amount) {
    this.leader.upgrades.stats[name] += amount;
  }

  get movesLeft() {
    return this.stats.movement - this.pools.movement;
  }

  get xpStats() {
    let level = 0;
    let axp = 0;
    for(var i = 1; axp <= this.stats.xp; i++) {
      level += 1;
      axp += level * 100;
    }
    return {
      level: level,
      xpNeededToLevelUp: axp - this.stats.xp,
      totalXPForNextLevel: level * 100,
      relativeXPNeededToLevelUp: (axp - this.stats.xp) / (level * 100),
      skillPoints: level,
      attributePoints: level * 3,
      trickPoints: Math.floor(level/2),
      abilityPoints: Math.floor(level/2),
    };
  }

}

module.exports = Player;
