const guid = require('guid.js');
const monsters = require('monsters.js');
const Monster = require('Monster.js');
class TeamUnit {
  constructor(suuid, templateId, stacks, x, y) {
    this.suuid = suuid || guid();
    this.templateId = templateId;
    this.stacks = stacks || 1;
    this.x = x;
    this.y = y;
  }
}

class Team {
  constructor(name, units) {
    this.name = name || 'team1';
    this.units = [];
    units && units.length && this.units.push.apply(this.units, units.map(t => new TeamUnit(t.suuid, t.templateId, t.stacks, t.x, t.y)));
  }

  static create(team) {
    return new Team(team.name, team.units);
  }

  static fromMonsters(name, monsters) {
    let t = new Team(name);
    t.units.push.apply(t.units, monsters.map(m => new TeamUnit(m.suuid, m.template.id, m.stacks, m.x, m.y)));
    return t;
  }

  get(suuid) {
    return this.units.find(u => u.suuid == suuid);
  }

  get monsters() {
    return this.units.map(t => {
      let m = new Monster(monsters.find(m => m.id == t.templateId), t.stacks);
      m.suuid = t.suuid;
      m.x = t.x;
      m.y = t.y;
      return m;
    })
  }
}

module.exports = Team;
