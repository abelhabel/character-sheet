const guid = require('guid.js');
const monsters = require('monsters.js');
const Monster = require('Monster.js');
const portalTemplate = monsters.find(m => m.bio.name == 'Portal');
class TeamUnit {
  constructor(suuid, templateId, stacks, x, y) {
    this.suuid = suuid || guid();
    this.templateId = templateId;
    this.stacks = stacks || 1;
    this.x = x;
    this.y = y;
  }

  get monster() {
    let tpl = monsters.find(m => m.id == this.templateId);
    let m = new Monster(tpl, this.stacks);
    m.suuid = this.suuid;
    m.x = this.x;
    m.y = this.y;
    return m;
  }
}

class Team {
  constructor(name, units, max = 600) {
    this.name = name || 'team1';
    this.max = max;
    this.picked = [];
    this.units = [];
    units && units.length && this.units.push.apply(this.units, units.map(t => new TeamUnit(t.suuid, t.templateId, t.stacks, t.x, t.y)));
  }

  static create(team) {
    return new Team(team.name, team.units, team.max);
  }

  static fromMonsters(name, monsters) {
    let t = new Team(name);
    t.units.push.apply(t.units, monsters.map(m => new TeamUnit(m.suuid, m.template.id, m.stacks, m.x, m.y)));
    return t;
  }

  get portal() {
    return this.units.find(u => u.templateId == portalTemplate.id);
  }

  addPortal(x, y) {
    let t = portalTemplate
    let unit = new TeamUnit(false, t.id, 1, x, y);
    this.units.push(unit);
    return unit;
  }

  get(suuid) {
    return this.units.find(u => u.suuid == suuid);
  }

  get unpicked() {
    return this.units.filter(u => {
      return u.templateId != portalTemplate.id && !~this.picked.indexOf(u.suuid);
    });
  }

  pickRandomMonster() {
    let list = this.unpicked;
    if(!list.length) {
      console.log(this)
      return null;
    }
    let n = window._roll(0, list.length -1);
    let unit = list[n];
    console.log(unit)
    this.picked.push(unit.suuid);
    return unit.monster;
  }

  get monsters() {
    return this.units.map(t => t.monster);
  }
}

module.exports = Team;
