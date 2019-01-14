const guid = require('guid.js');
const monsters = require('monsters.js');
const Monster = require('Monster.js');
class TeamUnit {
  constructor(templateId, stacks, x, y) {
    this.suuid = guid();
    this.templateId = templateId;
    this.stacks = stacks || 1;
    this.x = x;
    this.y = y;
  }
}

class Team extends Array {
  constructor(team = []) {
    super();
    team && team.length && this.push.apply(this, team.map(t => new TeamUnit(t.templateId, t.stacks, t.x, t.y)));
  }

  static fromMonsters(monsters) {
    console.log('fromMonsters', monsters)
    let t = new Team();
    t.push.apply(t, monsters.map(m=> new TeamUnit(m.template.id, m.stacks, t.x, t.y)));
    return t;
  }

  get monsters() {
    return this.map(t => {
      let m = new Monster(monsters.find(m => m.id == t.templateId), t.stacks);
      m.x = t.x;
      m.y = t.y;
      return m;
    })
  }
}

module.exports = Team;
