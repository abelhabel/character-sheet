const guid = require('guid.js');
const monsters = require('monsters.js');
const Monster = require('Monster.js');
const TeamSheet = require('TeamSheet.js');
const portalTemplate = monsters.find(m => m.bio.name == 'Portal');
class TeamUnit {
  constructor(suuid, templateId, stacks, x, y) {
    this.suuid = suuid || guid();
    this.templateId = templateId;
    this.stacks = stacks || 1;
    this.x = x;
    this.y = y;
    this.abilities = [];
  }

  get monster() {
    let tpl = monsters.find(m => m.id == this.templateId);
    let m = new Monster(tpl, this.stacks);
    if(this.abilities && this.abilities.length) {
      this.abilities.forEach(a => m.addAbility(a));
    }
    m.suuid = this.suuid;
    m.x = this.x;
    m.y = this.y;
    return m;
  }

  addAbility(abilityId) {
    this.abilities.push(abilityId);
  }

  addScroll(abilityId) {
    this.scrolls.push(abilityId);
  }
}

class Team {
  constructor(name, units, max = 600) {
    this.template = null;
    this.id = '';
    this.name = name || 'team1';
    this.max = max;
    this.picked = [];
    this.units = [];
    this.cs = new TeamSheet(this);
    units && units.length && this.units.push.apply(this.units, units.map(t => new TeamUnit(t.suuid, t.templateId, t.stacks, t.x, t.y)));
  }

  addAbility(abilityId, unitId) {
    if(!unitId) {
      this.units[0].addAbility(abilityId);
    }
  }

  static create(team) {
    let t = new Team(team.name, team.units, team.max);
    t.id = team.id;
    t.template = team;
    return t;
  }

  static fromMonsters(name, monsters) {
    let t = new Team(name);
    t.units.push.apply(t.units, monsters.map(m => new TeamUnit(m.suuid, m.template.id, m.stacks, m.x, m.y)));
    return t;
  }

  merge(team) {
    this.units.push.apply(this.units, team.units);
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
      return null;
    }
    let n = window._roll(0, list.length -1);
    let unit = list[n];
    this.picked.push(unit.suuid);
    return unit.monster;
  }

  get first() {
    return this.units[0].monster;
  }

  get highestTier() {
    return this.monsters.sort((a, b) => {
      if(a.tier == b.tier) return 0;
      return a.tier > b.tier ? -1 : 1;
    })[0];
  }

  get monsters() {
    return this.units.map(t => t.monster);
  }
}

module.exports = Team;
