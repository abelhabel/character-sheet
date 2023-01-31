const guid = require('guid.js');
const monsters = require('monsters.js');
const abilities = require('abilities.js');
const equipments = require('equipments.js');
const tpl = require('team-tpl.js');
const CS = require('CS.js');
const Monster = require('Monster.js');
const TeamSheet = require('TeamSheet.js');
const Component = require('Component.js');
const MonsterCard = require('MonsterCard.js');
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

    this.xp = 0;
    this.statPointsSpent = 0;
    this.skillPointsSpent = 0;
    this.trickPointsSpent = 0;
    this.abilityPointsSpent = 0;
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
      changes: {
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
      rules: {
        health: {
          cost: 1,
          return: 2,
          min: 1,
          max: 1000
        },
        mana: {
          cost: 2,
          return: 1,
          min: 0,
          max: 1000
        },
        attack: {
          cost: 1,
          return: 1,
          min: 1,
          max: 1000
        },
        defence: {
          cost: 1,
          return: 1,
          min: 1,
          max: 1000
        },
        spellPower: {
          cost: 3,
          return: 1,
          min: 1,
          max: 10
        },
        spellResistance: {
          cost: 1,
          return: 2,
          min: 0,
          max: 10
        },
        damage: {
          cost: 4,
          return: 1,
          min: 1,
          max: 10
        },
        movement: {
          cost: 3,
          return: 1,
          min: 1,
          max: 10
        },
        initiative: {
          cost: 2,
          return: 1,
          min: 1,
          max: 20
        },
        apr: {
          cost: 10,
          return: 1,
          min: 1,
          max: 10
        },
        tpr: {
          cost: 5,
          return: 1,
          min: 1,
          max: 10
        }
      }
    };
    this.xpBase = 20;
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

  addXP(xp) {
    this.xp += xp;
  }

  get xpStats() {
    let base = this.xpBase;
    let level = Math.floor((base + Math.sqrt(base*base + 4*base*this.xp)) / (base*2));
    let totalXPForLevel = base*(level - 1)*(level -1) + base*(level-1);
    let totalXPForNextLevel = base*level*level + base*level;
    return {
      level: level,
      totalXPForLevel: totalXPForLevel,
      totalXPForNextLevel: totalXPForNextLevel,
      currentXPRange: totalXPForNextLevel - totalXPForLevel,
      skillPoints: level,
      statPoints: level * 3,
      trickPoints: Math.floor(level/2),
      abilityPoints: Math.floor(level/2),
    };
  }

  drawLevelUp(onCommit) {
    let m = this.monster;
    let names = {
      health: 'Health', mana: 'Mana',
      attack: 'Attack', defence: 'Defence',
      spellPower: 'Spell Power', spellResistance: 'Spell Resistance',
      initiative: 'Initiative', movement: 'Movement',
      tpr: 'Triggers Per Turn', apr: 'Actions Per Turn',
      damage: 'Bonus Damage'
    };
    let s = this.xpStats;
    let t = html`<div class='monster-stat-upgrades'>
      <div class='bold upgrade-points'>Points: ${s.statPoints - this.statPointsSpent}</div>
      <div class='bold upgrade-points'>Level: ${s.level}</div>
      <div class='bold upgrade-points'>XP: ${this.xp}</div>
      <div class='bold upgrade-points'>XP progress: ${this.xp - s.totalXPForLevel} / ${s.currentXPRange}</div>
    </div>`;
    Object.keys(this.upgrades.stats).forEach(stat => {
      let cost = this.upgrades.rules[stat].cost;
      let ret = this.upgrades.rules[stat].return;
      let status = cost <= s.statPoints - this.statPointsSpent ? 'available' : 'unavailable';
      let d = html`<div class='upgrade-stat ${status}'>
        <span class='bold'>${names[stat]}</span>
        <span class='controls'>
          <span class='upgrade-stat-value'>${m.baseStat(stat) + this.upgrades.changes[stat]}</span>
          <span class='decrease-stat'>-</span>
          <span class='increase-stat'>+</span>
        </span>
      </div>`;
      d.addEventListener('click', e => {
        if(cost <= s.statPoints - this.statPointsSpent && e.target.classList.contains('increase-stat')) {
          if(this.statPoints < 1) return;
          if(this.statPoints < cost) return;
          this.upgrades.changes[stat] += ret;
          this.statPointsSpent += cost;
          let p = t.parentNode;
          p.removeChild(t);
          p.appendChild(this.drawLevelUp(onCommit));
        }
        if(e.target.classList.contains('decrease-stat')) {
          if(this.upgrades.changes[stat] < 1) return;
          if(this.statPoints >= this.statPointsLeft) return;
          this.upgrades.changes[stat] -= ret;
          this.statPointsSpent -= cost;
          let p = t.parentNode;
          p.removeChild(t);
          p.appendChild(this.drawLevelUp(onCommit));
        }
      })
      t.appendChild(d);
    });
    return t;
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
      xp += m.bio.tier * m.bio.tier * m.initialStacks;
    })
    return xp;
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

  createTemplate() {

  }

  static create(team) {
    let t = new Team(team.name, team.units, team.max);
    t.id = team.id;
    t.template = team;
    return t;
  }

  static fromMonsters(name, monsters) {
    let t = new Team(name);
    t.template = {
      name: name,
      units: monsters.map(m => {
        return {
          stacks: m.stacks,
          templateId: m.template.id
        }
      }),
      max: 600,
    };
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
    let t = new Component(true, 'team-units quick-view');
    t.addStyle(html`<style>${MonsterCard.style}</style>`);
    this.monsters.forEach(m => m.card.render(t.shadow));
    return t.tags.outer;
  }
}


class TeamEditor extends Team {
  constructor(name, units, max = 600) {
    super(name, units, max = 600);
  }

  render() {
    let t = new Component(false, 'team');
    this.monsters.forEach(m => {
      t.append(m.canvas.clone());
    })
    let cs = new CS(tpl, t.tags.outer, null, (c, i, v) => {
      this[c.exportAs][i.exportAs] = v;
    }, true);
    cs.render();
    return t.tags.outer;
  }
}

Team.Editor = TeamEditor;
module.exports = Team;
