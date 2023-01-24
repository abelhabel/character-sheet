const Inventory = require('Inventory.js');
const QuestLog = require('QuestLog.js');
const Crafting = require('Crafting.js');
const PL = require('PositionList2d.js');
class AdventureAI {
  constructor(jobs) {
    this.jobs = jobs;
    this.actionsTaken = 0;
    this.maxActions = 4;
  }

  canAct(adventure) {
    return adventure.player.movesLeft && this.actionsTaken < this.maxActions;
  }

  plan(adventure) {
    return this.act(adventure)
    .then(result => {
      this.actionsTaken += 1;
      if(result == 'done' || !this.canAct(adventure)) {
        this.actionsTaken = 0;
        console.log('Done Planning')
        return Promise.resolve(adventure.endThenStartTurn());
      }

      return this.plan(adventure);
    })
  }

  act(adventure) {

    // get highest priority job
    let job = this.jobs[0];
    logger.log(`AI looking for job: ${job}`);
    let {obstacles, monsters} = adventure.layers;
    let {x, y} = adventure.pp;
    let player = adventure.player;
    let grid = PL.combine([obstacles.items, monsters.items]);
    if(job == 'aquire resources') {
      // find any adjacent resources that can be picked up
      let r = obstacles.items.around(x, y, 1).find(r => r.item && r.item.stats.resource);
      if(r) {
        console.log('picking up resource');
        adventure.interact(r);
        return Promise.resolve();
      }
      // find any resources that are reachable
      let resources = obstacles.items.inRadius(x, y, player.vision+20)
      .filter(t => t.item && t.item.stats.resource);
      console.log('found resources', resources)
      if(resources.length) {
        // find closest tile to move to next to the resource
        let paths = resources.map(r => {
          let p = grid.path(x, y, r.x, r.y);
          p.pop();
          return p;
        })
        paths.sort((a, b) => {
          if(a.length < b.length) return -1;
          if(b.length < a.length) return 1;
          return 0;
        })
        return adventure.walk(player.team, paths[0])

      }
    }
    return Promise.resolve("done");
  }
}

class Player {
  constructor(team, clan, AIControlled) {
    this.team = team;
    this.clan = clan;
    this.AIControlled = AIControlled;
    this.AI = this.AIControlled && new AdventureAI(['aquire resources']);
    this.position = {x: 0, y: 0};
    this.gold = 0;
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
        name: 'mythology',
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

  resetMovement() {
    this.pools.movement = 0;
  }

  addXP(xp) {
    this.stats.xp += xp;
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
      skillPoints: level * 3
    };
  }

}

module.exports = Player;
