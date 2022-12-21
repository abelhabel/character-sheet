const Inventory = require('Inventory.js');
const QuestLog = require('QuestLog.js');
const Crafting = require('Crafting.js');
class Player {
  constructor(team) {
    this.team = team;
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
