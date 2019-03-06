const guid = require('guid.js');
const monsters = require('monsters.js');
const abilities = require('abilities.js');
const equipments = require('equipments.js');
const Monster = require('Monster.js');
const TeamSheet = require('TeamSheet.js');
const Component = require('Component.js');
const portalTemplate = monsters.find(m => m.bio.name == 'Portal');
class TeamUnit {
  constructor(suuid, templateId, stacks, x, y, equipment, abilities) {
    this.suuid = suuid || guid();
    this.templateId = templateId;
    this.stacks = stacks || 1;
    this.x = x;
    this.y = y;
    this.equipment = equipment || [];
    this.abilities = abilities || [];
    this.customAbilities = [];
    this.upgradePointsLeft = 0;
    this.upgradePointsSpent = 0;
    this.upgrades = {
      stats: {
        health: 0,
        mana: 0,
        attack: 0,
        defence: 0,
        spellPower: 0,
        spellResistance: 0,
        damage: 0,
        movement: 0,
        initiative: 0,
        apr: 0,
        tpr: 0
      },
    }
  }

  get tpl() {
    return monsters.find(m => m.id == this.templateId);
  }

  get monster() {
    let tpl = this.tpl;
    let m = new Monster(tpl, this.stacks);
    if(this.abilities && this.abilities.length) {
      this.abilities.forEach(a => m.addAbility(a));
    }
    if(this.equipment && this.equipment.length) {
      this.equipment.forEach(a => m.equip(a));
    }
    if(this.customAbilities && this.customAbilities.length) {
      this.customAbilities.forEach(a => m.addAbilityTpl(a));
    }
    m.suuid = this.suuid;
    m.x = this.x;
    m.y = this.y;
    m.upgradePointsLeft = this.upgradePoints;
    Object.assign(m.upgrades.stats, this.upgrades.stats);
    return m;
  }

  get upgradePoints() {
    return this.upgradePointsLeft - this.upgradePointsSpent;
  }

  upgradeStats(stats, spent) {
    Object.keys(stats).forEach(stat => {
      this.upgrades.stats[stat] += stats[stat];
    });
    this.upgradePointsSpent += spent;
  }

  addEquipment(itemId) {
    let a = equipments.find(a => a.id == itemId);
    logger.log(`Player equipped item: ${a.bio.name}`);
    this.equipment.push(itemId);
  }

  addAbility(abilityId) {
    let a = abilities.find(a => a.id == abilityId);
    logger.log(`Player learned new Ability: ${a.bio.name}`);
    this.abilities.push(abilityId);
  }

  addCustomAbility(tpl) {
    this.customAbilities.push(tpl);
  }

  addScroll(abilityId) {
    let a = abilities.find(a => a.id == abilityId);
    logger.log(`Player learned new Ability: ${a.bio.name}`);
    this.scrolls.push(abilityId);
  }
}

class Team {
  constructor(name, units, max = 600) {
    this.template = null;
    this.id = Math.random();
    this.name = name || 'team1';
    this.max = max;
    this.picked = [];
    this.units = [];
    units && units.length && this.units.push.apply(this.units, units.map(t => {
      let u = new TeamUnit(t.suuid, t.templateId, t.stacks, t.x, t.y, t.equipment, t.abilities);
      u.upgradePointsLeft = t.upgradePointsLeft;
      u.upgradePointsSpent = t.upgradePointsSpent;
      Object.assign(u.upgrades, t.upgrades);
      return u;
    }));
  }

  get cs() {
    return new TeamSheet(this);
  }

  get leaders() {
    return this.units.filter(u => u.tpl.bio.leader);
  }

  get xp() {
    let xp = 0;
    this.monsters.forEach(m => {
      xp += m.might;
    })
    return Math.ceil(xp / 100);
  }

  removeUnit(suuid) {
    let index = this.units.findIndex(u => u.suuid == suuid);
    if(!~index) return;
    this.units.splice(index, 1);
  }

  addAbility(abilityId, unitId) {
    if(!unitId) {
      this.units[0].addAbility(abilityId);
    }
  }

  upgradeStats(monster, stats, spent) {
    let unit = this.units.find(u => u.suuid == monster.suuid);
    unit.upgradeStats(stats, spent);
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

  renderUnits() {
    let t = new Component(false, 'team-units quick-view');
    this.monsters.forEach(m => {
      m.sprite.drawStack(m.stacks);
      t.append(m.canvas);
    })
    return t.tags.outer;
  }
}

module.exports = Team;
