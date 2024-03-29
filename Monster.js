const nextId = (function() {
  var id = 0;
  return function() {
    return Math.random().toString().substr(2);
  }
})();
const abilities = require('abilities.js');
const equipments = require('equipments.js');
const icons = require('icons.js');
const specialEffects = require('special-effects.js');
const Ability = require('Ability.js');
const AbilityEffect = require('AbilityEffect.js');
const Equipment = require('Equipment.js');
const Sprite = require('Sprite.js');
const Scroll = require('Scroll.js');
const AI = require('AI.js');
const FixedList = require('FixedList.js');
const MonsterCard = require('MonsterCard.js');
const MonsterCS = require('MonsterCS.js');
const Component = require('Component.js');
const Events = Component.Events;
class StatBonus {
  constructor(owner) {
    this.owner = owner;
    this.blessing = {
      ability: '',
      value: 0
    },
    this.curse = {
      ability: '',
      value: 0
    };
  }

  static combine() {
    var out = new StatBonus(arguments[0]);
    for(let i = 1; i < arguments.length; i++) {
      if(arguments[i].blessing.ability) {
        out.add(arguments[i].blessing.ability, arguments[i].blessing.value);
      }
      if(arguments[i].curse.ability) {
        out.add(arguments[i].curse.ability, arguments[i].curse.value);
      }
    }
    return out;
  }

  get curseName() {
    return this.curse.ability ? this.curse.ability.bio.name : '';
  }

  get blessingName() {
    return this.blessing.ability ? this.blessing.ability.bio.name : '';
  }

  get cursedBy() {
    if(!this.curse.ability) return '';
    return this.curse.ability.bio.name;
  }

  get blessedBy() {
    if(!this.blessing.ability) return '';
    return this.blessing.ability.bio.name;
  }

  get total() {
    return this.blessing.value - this.curse.value;
  }

  add(ability, power) {
    if(ability.stats.source == 'blessing') {
      let roll = power || ability.power || ability.roll();
      if(roll < this.blessing.value) return;
      this.blessing.value = roll;
      this.blessing.ability = ability;
    } else
    if(ability.stats.source == 'curse') {
      let roll = power || ability.power || ability.roll();
      if(roll < this.curse.value) return;
      this.curse.value = roll;
      this.curse.ability = ability;
    }
  }
}


class Monster extends Events {
  constructor(t, stacks, summoned, suuid) {
    super();
    this.template = t;
    this.summoned = summoned;
    this.suuid = suuid || nextId();
    this.orientation = 0; // 0 = left, 1 = right
    this.initiativeEntropy = 11;
    this.initiativeEntropyCounter = 0;
    this.initialInitiativeEntropy = this.initiativeEntropy;
    this.battle = null;
    this.id = nextId();
    this.ai = false;
    this.routine = this.ai ? new AI(this, 1) : null;
    this.x = null;
    this.y = null;
    this.defending = false;
    this.selections = [];
    this.triggerCount = 0;
    this.abilitySnapshot = null;
    this.bio = {
      tier: t.bio.tier || 1,
      sprite: t.bio.sprite,
      orientation: t.bio.orientation || 'left',
      name: t.bio.name,
      family: t.bio.family,
      summonOnly: t.bio.summonOnly || false,
      leader: t.bio.leader || false,
      cost: t.bio.cost,
      maxStacks: t.bio.maxStacks || 1
    };
    this._abilities = {
      abilities: t.abilities.abilities,
    };
    this.AI = {
      behavior: t.ai ? t.ai.behavior : ''
    };
    this.sounds = {
      start_turn: t.sounds && t.sounds.turnStart,
    };
    this.stats = {
      health: t.stats.health,
      mana: t.stats.mana || 1,
      attack: t.stats.attack,
      defence: t.stats.defence,
      spellPower: t.stats.spellPower,
      spellResistance: t.stats.spellResistance,
      damage: t.stats.damage || 0,
      movement: t.stats.movement,
      initiative: t.stats.initiative,
      range: t.stats.range,
      apr: t.stats.apr || 1,
      tpr: t.stats.tpr || 1
    };
    this.equipment = {
      hand: new FixedList(2),
      wrists: new FixedList(1),
      feet: new FixedList(1),
      waist: new FixedList(1),
      head: new FixedList(1),
      body: new FixedList(1),
      neck: new FixedList(1),
      finger: new FixedList(2)
    };
    this.sprites = [];
    this.cacheCanvases();
    this.initialStacks = stacks || 1;
    this.damageTaken = 0;
    this.manaUsed = 0;
    this.tilesMoved = 0;
    this.effects = [];
    this.abilities = this.createAbilities();
    this._selections = new FixedList(1);
    this._team = '';
    this.permanentAilments = [];
    this.permanentVigors = [];
    this.minions = [];
    this.xp = 0;
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
  }

  get card() {
    return new MonsterCard(this);
  }

  get upgradePoints() {
    return this.upgradePointsLeft - this.upgradePointsSpent;
  }

  addAI(level = 1) {
    if(this.AI.behavior) {
      this.parseAI();
    }
    this.ai = true;
    this.routine = new AI(this.battle, this, level);
  }

  get class() {
    let attacks = this.attacks;
    let spells = this.spells.filter(s => s.stats.targetFamily != 'self');
    let blessings = this.blessings.filter(s => s.stats.targetFamily != 'self');
    let curses = this.curses;
    let total = attacks.length + spells.length + blessings.length + curses.length;
    let l = [
      {val: attacks.length, name: 'attack'},
      {val: spells.length, name: 'spell'},
      {val: blessings.length, name: 'blessing'},
      {val: curses.length, name: 'curse'},
    ];
    let max = Math.max.apply(null, l.map(a => a.val));
    l = l.filter(a => a.val >= (Math.ceil(max/2) || 1));
    l.sort((a, b) => {
      if(a.val > b.val) return -1;
      if(b.val > a.val) return 1;
      return 0;
    })
    if(l.length == 1) {
      if(l[0].name == 'attack') {
        let afars = attacks.filter(a => a.stats.range > 6).length;
        let closes = attacks.filter(a => a.stats.range > 3).length;
        let nearbys = attacks.filter(a => a.stats.range > 1).length;
        let melees = attacks.filter(a => a.stats.range == 1).length;
        let all = [afars, closes, nearbys, melees];
        if(Math.max.apply(null, all) == afars) {
          return 'sniper';
        }
        if(Math.max.apply(null, all) == closes) {
          return 'ranger';
        }

        return 'fighter';
      }
      if(l[0].name == 'spell') {
        let sum = spells.filter(s => s.stats.summon).length;
        if(sum > spells.length / 2) return 'conjurer';
        let vit = spells.filter(s => s.stats.element == 'vitality').length;
        if(vit > spells.length / 2) return 'saint';
        return 'sorcerer';
      }
      if(l[0].name == 'blessing') {
        return 'cleric';
      }
      if(l[0].name == 'curse') {
        return 'witch';
      }
    } else
    if(l.length > 1) {
      if(l[0].name == 'attack') {
        if(l[1].name == 'spell') {
          return 'spellblade';
        }
        if(l[1].name == 'blessing') {
          return 'paladin';
        }
        if(l[1].name == 'curse') {
          return 'blackguard';
        }
      }
      if(l[0].name == 'spell') {
        if(l[1].name == 'attack') {
          return 'spellblade';
        }
        if(l[1].name == 'blessing') {
          return 'sage';
        }
        if(l[1].name == 'curse') {
          return 'crone';
        }
      }
      if(l[0].name == 'blessing') {
        if(l[1].name == 'attack') {
          return 'paladin';
        }
        if(l[1].name == 'spell') {
          return 'sage';
        }
        if(l[1].name == 'curse') {
          return 'druid';
        }
      }
      if(l[0].name == 'curse') {
        if(l[1].name == 'attack') {
          return 'blackguard';
        }
        if(l[1].name == 'spell') {
          return 'crone';
        }
        if(l[1].name == 'blessing') {
          return 'druid';
        }
      }
    }

    return 'soldier';

  }

  parseAI() {
    let distances = {
      adjacent: 1,
      nearby: 3,
      afar: 10,
    };
    let actions = this.AI.behavior.split('\n');
    let distance = ['adjacent', 'nearby', 'afar'];
    let targets = ['enemy', 'ally', 'target', 'it', 'self', 'tile'];
    let types = ['weakest', 'mightiest', 'toughest', 'strongest', 'furthest', 'nearest', 'most', 'least', 'excited', 'energetic'];
    let states = ['hurt', 'wounded', 'near death', 'sick', 'healthy', 'flanked', 'outnumbered', 'occupied'];
    let factions = ['Undead', 'Order of Idun', 'Outlaws', 'Beasts', 'Demons', 'Mythical', "Aloysia's Chosen", 'Voidless'];
    let ranges = ['melee', 'ranged'];
    let roles = ['reactive'];
    let stats = ['attack', 'defence', 'spellPower', 'spellResistance', 'movement', 'initiative', 'apr', 'tpr', 'mana', 'damage'];
    let classes = [
      'fighter', 'sorcerer', 'cleric', 'witch',
      'spellblade', 'sage', 'druid',
      'paladin', 'crone',
      'blackguard',
      'sniper', 'ranger',
      'conjurer', 'saint'
    ];
    this.aiScript = actions.map(a => {
      let c = a.split('use');
      let d = c[1].trim();
      let ability = d.match(/-([a-zA-Z\s]+)-/);
      let abilityTPL = ability ? abilities.find(a => a.bio.name == ability[1]) : null;
      let select = d.match(/select:([a-z]+)/);
      let withinRadius = d.match(/within (\d) (steps|squareRadius)/);
      let act = {
        part: d,
        ability: abilityTPL ? abilityTPL.id : '',
        select: select && select[1],
        defend: !!~d.indexOf('Defend'),
        wait: !!~d.indexOf('Wait'),
        targetType: types.find(b => !!~d.indexOf(' '+b+' ')),
        target: targets.find(b => !!~d.indexOf(' '+b)),
        numTargets: null,
        range: ranges.find(b => !!~d.indexOf(' '+b)),
        move: !!~d.indexOf('Move'),
        moveAway: !!~d.indexOf('Move away'),
        moveToMost: !!~d.indexOf('Move to most'),
        moveFully: !!~d.indexOf('full Move'),
        withinRadius: withinRadius && withinRadius[1],
        radiusType: withinRadius && withinRadius[2],
      };
      if(act.withinRadius) {
        act.withinRadius = parseInt(act.withinRadius);
      }
      if(act.target) {
        let test = new RegExp(`(\\d) ${act.target}`);
        let n = d.match(test);
        act.numTargets = n ? parseInt(n[1]) : null;
      }
      let cond = c[0].split(/\sand!?\s/).map(m => {
        m = m.trim();
        let effect = m.match(/has effect -([a-zA-Z\s]+)-/);
        let aura = m.match(/has aura -([a-zA-Z\s]+)-/);
        let vigor = m.match(/has vigor ([a-zA-Z]+)/);
        let ailment = m.match(/has ailment ([a-zA-Z]+)/);
        let faction = m.match(/is faction -([a-zA-Z\s]+)-/);
        let minion = m.match(/has minion -([a-zA-Z\s]+)-/);
        let klass = m.match(/is class ([a-zA-Z\s]+)/);
        let cond = {
          part: m,
          distance: distance.find(b => !!~m.indexOf(' '+b) || !!~m.indexOf(b +' ')),
          negDistance: false,
          abilityTargeting: !!~m.indexOf(' ability '),
          target: targets.find(b => !!~m.indexOf(' '+b) || !!~m.indexOf(b +' ')),
          noTarget: false,
          range: ranges.find(b => !!~m.indexOf(' '+b)),
          numTargets: null,
          stat: stats.find(b => !!~m.indexOf(' '+b)),
          statAmount: null,
          neg: false,
          state: states.find(b => !!~m.indexOf('is ' + b) || !!~m.indexOf('has ' + b)),
          effect: effect && effect[1],
          aura: aura && aura[1],
          minion: minion && minion[1],
          faction: faction && faction[1],
          vigor: vigor && vigor[1],
          ailment: ailment && ailment[1],
          permanentAilment: !!~m.indexOf('permanent ailment'),
          role: roles.find(b => ~m.indexOf('is '+b)),
          class: klass && klass[1],
          isSummoned: !!~m.indexOf('is summoned'),
        };
        cond.negDistance = !!~m.indexOf('no ' + cond.distance),
        cond.neg = m.charAt(0) == '!';
        if(cond.target) {
          let test = new RegExp(`(\\d) (ability )?${cond.target}`);
          let n = m.match(test);
          cond.numTargets = n ? parseInt(n[1]) : null;
        }
        if(cond.target) {
          cond.noTarget = !!m.match(`no ${cond.target}`);
        }
        if(cond.stat) {
          let test = new RegExp(`(\\d) ${cond.stat}`);
          let n = m.match(test);
          cond.statAmount = n ? parseInt(n[1]) : null;
        }
        if(cond.distance) {
          cond.distance = distances[cond.distance];
        }
        // else
        // if(act.ability) {
        //   cond.distance = abilityTPL.stats.range;
        // }
        return cond;
      })



      return {cond, act};
    });
  }

  abilityMight(a) {
    let base = a;
    if(a.stats.effect) {
      base += a.stats.effect.might;
    }
    let triggers = this.triggersOnHit;
    let triggerMight = 0;
    triggers.forEach(t => triggerMight += t.might);
    return base + triggerMight;
  }

  get triggersOnHit() {
    let max =  this.totalStat('tpr') - this.triggerCount;
    return this.triggers.filter(t => t.bio.activation == 'when attack hits')
    .splice(0, max);
  }

  get prefers() {
    let attacks = this.attacks;
    let spells = this.spells;
    if(attacks.length >= spells.length) return 'attack';
    return 'spell';
  }

  get tier() {
    return this.bio.tier;
  }

  get might() {
    if(this.prefers == 'attack') {
      return this.stacks * this.maxHealth * this.totalStat('apr') * this.totalStat('attack') * (1 + Math.min(this.totalStat('tpr'), this.triggers.length));
    }
    return this.stacks * this.maxHealth * this.totalStat('apr') * this.totalStat('spellPower');
  }

  get potentialRange() {
    let range = 0;
    this.actives.forEach(a => {
      if(a.stats.range > range) range = a.stats.range;
    })
    return range;
  }

  get team() {
    return this._team;
  }

  set team(t) {
    this._team = t;
  }

  // roles

  get reactive() {
    return !!this.triggers.length;
  }

  _select(p) {
    let selectionsRequired = this.selectedAbility && this.selectedAbility.stats.selections || 1;
    if(this.selectedAbility) {
      if(selectionsRequired > 1) {
        this._selections.push(p);
      } else {
        this._selections[0] = p;
      }
    } else {
      this._selections[0] = p;
    }
  }

  _deselect() {
    let selectionsRequired = this.selectedAbility && this.selectedAbility.stats.selections || 1;
    this._selections = new FixedList(selectionsRequired);
  }

  createAbilities() {
    return this._abilities.abilities.map(name => {
      let a = abilities.find(c => c.bio.name == name);
      if(!a) return;
      return new Ability(a, this);
    });
  }

  equip(itemId) {
    let a = equipments.find(c => c.id == itemId);
    if(!a) return;
    let slot = a.bio.slot;
    let e = new Equipment(a);
    this.equipment[slot].push(e);
    if(e.abilities.abilities) {
      this.addAbility(e.abilities.abilities);
    }
  }

  addAbility(abilityId) {
    let a = abilities.find(c => c.id == abilityId);
    if(!a) return;
    this.abilities.push(new Ability(a, this));
  }

  addAbilityTpl(tpl) {
    this.abilities.push(new Ability(tpl, this));
  }

  addMinion(m) {
    this.minions.push(m);
    m.on('death', () => {
      let i = this.minions.indexOf(m);
      this.minions.splice(i, 1);
    })
  }

  hasMinion(name) {
    return !!this.minions.find(m => m.bio.name == name);
  }

  getMinion(name) {
    return this.minions.find(m => m.bio.name == name);
  }

  get attacks() {
    return this.abilities.filter(a => a.bio.type == 'active' && a.stats.source == 'attack');
  }

  get spells() {
    return this.abilities.filter(a => a.bio.type == 'active' && a.stats.source == 'spell');
  }

  get attacks() {
    return this.abilities.filter(a => a.bio.type == 'active' && a.stats.source == 'attack');
  }

  get blessings() {
    return this.abilities.filter(a => a.bio.type == 'active' && a.stats.source == 'blessing');
  }

  get curses() {
    return this.abilities.filter(a => a.bio.type == 'active' && a.stats.source == 'curse');
  }

  get damaging() {
    return this.abilities.filter(a => a.bio.type == 'active' && (a.stats.source == 'spell' || a.stats.source == 'attack') && a.stats.multiplier);
  }

  get actives() {
    return this.abilities.filter(a => a.bio.type == 'active');
  }

  get triggers() {
    return this.abilities.filter(a => a.bio.type == 'trigger');
  }

  get passives() {
    return this.abilities.filter(a => a.bio.type == 'passive');
  }

  get ailments() {
    let s = new Set();
    this.activeEffects.forEach(e => {
      if(e.ability.stats.ailment) {
        s.add(e.ability.stats.ailment);
      }
    });
    this.permanentAilments.forEach(a => {
      s.add(a);
    })
    this.passives.forEach(a => {
      if(!a.stats.ailment) return;
      if(a.stats.targetFamily != 'self') return;
      if(!a.owner.abilityConditionMet(a, this)) return;
      s.add(a.stats.ailment);
    })
    this.battle && this.battle.getEnemyAuras(this.team).forEach(a => {
      if(!a.stats.ailment) return;
      if(a.stats.targetFamily == 'ally') return;
      if(!a.owner.abilityConditionMet(a, this)) return;
      if(!this.battle.inAura(a, this)) return;
      if(a.stats.source == 'blessing' && this.hasAilment('blinded')) return;
      s.add(a.stats.ailment);
    })
    return Array.from(s);
  }

  get removableAilments() {
    let s = new Set();
    this.activeEffects.forEach(e => {
      if(e.ability.stats.ailment) {
        s.add(e.ability.stats.ailment);
      }
    });
    this.permanentAilments.forEach(a => {
      s.add(a);
    })
    return Array.from(s);
  }

  get vigors() {
    let s = new Set();
    this.activeEffects.forEach(e => {
      if(e.ability.stats.vigor) {
        s.add(e.ability.stats.vigor);
      }
    });
    this.permanentVigors.forEach(a => {
      s.add(a);
    })
    this.passives.forEach(a => {
      if(!a.stats.vigor) return;
      if(a.stats.targetFamily != 'self') return;
      if(!a.owner.abilityConditionMet(a, this)) return;
      s.add(a.stats.vigor);
    })
    this.battle && this.battle.getAllyAuras(this.team).forEach(a => {
      if(!a.stats.vigor) return;
      if(a.stats.targetFamily == 'enemy') return;
      if(!a.owner.abilityConditionMet(a, this)) return;
      if(!this.battle.inAura(a, this)) return;
      if(a.stats.source == 'blessing' && this.hasAilment('blinded')) return;
      s.add(a.stats.vigor);
    })
    return Array.from(s);
  }

  removePermanentAilments() {
    this.permanentAilments = [];
  }

  get sprite() {
    return this.sprites[this.orientation];
  }

  get canvas() {
    return this.sprites[this.orientation].canvas;
  }

  cacheCanvases() {
    let leftSprite = new Sprite(this.bio.sprite);
    let rightSprite = new Sprite(this.bio.sprite);
    rightSprite.mirror();
    if(this.bio.orientation == 'right') {
      this.sprites = [rightSprite, leftSprite];
    } else {
      this.sprites = [leftSprite, rightSprite];
    }
  }

  resetMovement() {
    this.tilesMoved = 0;
  }

  get movesLeft() {
    if(this.hasAilment('stunned') || this.hasAilment('held')) return 0;
    return this.totalStat('movement') - this.tilesMoved;
  }

  hasAura(name, target) {
    return this.abilities.find(a => a.bio.type == 'passive' && (a.stats.shape == 'circle' || a.stats.shape == 'square') && a.stats.radius && this.abilityConditionMet(a, target) && (name ? a.bio.name == name : true));
  }

  setOrientation(x) {
    this.orientation = x - this.x > 0 ? 1 : 0;
  }

  move(x, y) {
    this.setOrientation(x);
    this.x = x;
    this.y = y;
    this.tilesMoved += 1;
  }

  addStack(s) {
    this.initialStacks = Math.min(this.bio.maxStacks, this.initialStacks + s);
    return this.initialStacks;
  }

  harm(d) {
    if(isNaN(d)) return;
    this.damageTaken += d;
    return d;
  }

  heal(d) {
    if(isNaN(d)) return;
    if(this.hasAilment('dazzled')) d = Math.round(d/2);
    this.damageTaken = Math.max(0, this.damageTaken - d);
    return d;
  }

  removeEffect(e) {
    var index = this.effects.indexOf(e);
    this.effects.splice(index, 1);
    if(typeof e.onEffectEnd == 'function') {
      e.onEffectEnd();
    }
    if(e.ability.stats.attribute == 'initiative') {
      this.battle.initiativeChanged();
    }
  }

  hasEffect(name) {
    return this.activeEffects.find(e => e.ability.bio.name == name) || this.affectedByAura(name);
  }

  hasVigor(name) {
    return this.activeEffects.find(e => e.ability.stats.vigor == name) || ~this.permanentVigors.indexOf(name);
  }

  hasAilment(name) {
    return !!this.activeEffects.find(e => e.ability.stats.ailment == name) ||
    this.hasPermanentAilment(name) ||
    !!this.passives.find(a => a.stats.targetFamily == 'self' && a.owner.abilityConditionMet(a, this) && (name ? a.stats.ailment == name : a.stats.ailment));
  }

  hasPermanentAilment(name) {
    return !!~this.permanentAilments.indexOf(name)
  }

  addAilment(ailment) {
    if(~this.permanentAilments.indexOf(ailment)) return;
    this.permanentAilments.push(ailment);
  }

  addEffect(source, ability, power, triggered, triggeredPower, positions, special) {
    if(power < 1 && !ability.stats.ailment && !ability.stats.vigor && !special) return;
    if(ability.stats.source == 'blessing' && this.hasAilment('blinded')) {
      logger.log(ability.bio.name, 'failed because', this.bio.name, 'is blinded and cannot receive new blessings.');
      return;
    }
    let e = this.effects.filter(e => e.ability.bio.name == ability.bio.name);
    if(e && e.length >= ability.stats.stacks ) {
      let longest = e[0];
      e.forEach(l => {
        if(l.rounds > longest.rounds) {
          longest = l;
        }
      })
      longest.rounds = 0;
      return;
    }

    if(ability.stats.duration) {
      let effect = new AbilityEffect({
        triggered: !!triggered,
        power: power,
        rounds: 0,
        source: source,
        ability: new ability.constructor(ability.template, ability.owner),
        onEffectEnd: special && special.onEffectEnd
      });
      this.effects.push(effect);
      return effect;
    }
  }

  get adjacentEnemies() {
    if(!this.battle) return [];
    return this.battle.grid.around(this.x, this.y, 1)
    .filter(t => {
      if(!t.item) return;
      return t.item.constructor == this.constructor && t.item.team != this.team;
    })
    .map(t => t.item);
  }

  abilityConditionMet(a, target) {
    if(!a.bio.condition) return true;
    if(a.stats.targetFamily == 'self' && a.bio.condition == 'flanked') {
      let flanks = this.battle ? this.battle.flanks(this) : 0;
      if(flanks < 2) return false;
      return true;
    }
    if(a.bio.condition == 'self is defending') {
      return this.defending;
    }
    if(a.bio.condition == 'self is wounded') {
      return this.totalHealth < this.maxHealth/2;
    }
    if(a.bio.condition == 'self is near death') {
      return this.totalHealth < this.maxHealth/10;
    }
    if(a.bio.condition == 'self is full health') {
      return this.totalHealth >= this.maxHealth;
    }
    if(!this.battle) return;
    if(target && a.bio.condition == 'target is flanked') {
      return target.flanked;
    }
    if(a.bio.condition == 'self is flanking') {
      let adjacent = this.adjacentEnemies;
      let flanks = 0;
      adjacent.forEach(m => {
        let f = this.battle.flanks(m);
        flanks = Math.max(flanks, f);
      })
      return flanks > 1;
    }
    if(a.bio.condition == 'self is flanked') {
      let flanks = this.battle.flanks(this);
      return flanks > 1;
    }
  }

  passiveAbilityBonus(name, target) {
    var out = new StatBonus(this);
    this.passives.forEach(a => {
      if(a.stats.attribute != name) return;
      if(a.stats.targetFamily == 'enemies') return;
      if(!this.abilityConditionMet(a, target)) return;
      out.add(a);
    })
    return out;
  }

  activeEffectBonus(name) {
    var out = new StatBonus(this);
    var stacks = {};
    this.activeEffects.forEach(e => {
      if(e.ability.stats.attribute != name) return;
      if(e.ability.stats.stacks > 1) {
        stacks[e.ability.bio.name] = stacks[e.ability.bio.name] || {power: 0, ability: e.ability};
        stacks[e.ability.bio.name].power += e.power;
      } else {
        out.add(e.ability, e.power);
      }
    });
    Object.keys(stacks).forEach(name => {
      out.add(stacks[name].ability, stacks[name].power);
    })
    return out;
  }

  auraBonus(name) {
    var out = new StatBonus(this);
    var stacks = {};
    this.battle && this.battle.auras.all.forEach(a => {
      if(a.stats.attribute != name) return;
      var {source, targetFamily, multiplier, radius} = a.stats;
      var d = this.battle.grid.distance(this.x, this.y, a.owner.x, a.owner.y);
      if(a.stats.shape == 'square') {
        d -= radius * 0.415;
      }
      if(d > radius) return;
      if(a.owner.team == this.team && (targetFamily == 'allies' || targetFamily == 'all') && source == 'blessing') {
        if(!a.owner.abilityConditionMet(a, this)) return;
        if(a.stats.stacks > 1) {
          stacks[a.bio.name] = stacks[a.bio.name] || {power: 0, ability: a};
          stacks[a.bio.name].power += a.power;
        } else {
          out.add(a, a.power);
        }
      }
      if(a.owner.team != this.team && (targetFamily == 'enemies' || targetFamily == 'all') && source == 'curse') {
        if(!a.owner.abilityConditionMet(a, this)) return;
        if(a.stats.stacks > 1) {
          stacks[a.bio.name] = stacks[a.bio.name] || {power: 0, ability: a};
          stacks[a.bio.name].power += a.power;
        } else {
          out.add(a, a.power);
        }
      }
    })
    Object.keys(stacks).forEach(name => {
      out.add(stacks[name].ability, stacks[name].power);
    })
    return out;
  }

  equipmentBonus(name) {
    let out = 0;
    Object.keys(this.equipment).forEach(slot => {
      if(!this.equipment[slot] || !this.equipment[slot].length) return;
      this.equipment[slot].forEach(item => {
        let bonuses = item.activeStats;
        let bonus = bonuses.find(b => b.name == name);
        if(!bonus) return;
        out += bonus.val;
      })
    })
    return out;
  }

  statBonus(name, target) {
    var base = this.baseStat(name);
    var circumstance = this['bonus' + name] || 0;
    var passive = this.passiveAbilityBonus(name, target);
    var activeEffects = this.activeEffectBonus(name);
    var auras = this.auraBonus(name);
    var combined = StatBonus.combine(this, passive, activeEffects, auras);
    var equipment = this.equipmentBonus(name);
    if(name == 'movement' && this.hasAilment('wet')) {
      if(combined.blessing.value) {
        combined.blessing.value -= 1;
      }
      if(combined.curse.value) {
        combined.curse.value +=1;
      }
    }

    if(name == 'damage' && this.hasVigor('illuminated')) {
      circumstance += Math.floor(this.activeEffects.filter(e => e.ability.stats.source == 'blessing').length / 2);
    }

    var total = base + circumstance + equipment + combined.blessing.value - combined.curse.value;

    if(name == 'apr' && this.hasAilment('shocked') && total > 1) {
      total = 1;
    }

    return {base, equipment, circumstance, passive, activeEffects, auras, combined, total};
  }

  baseStat(name) {
    let base = this.stats[name] + this.upgrades.stats[name];
    if(name == 'defence' && this.hasAilment('brittle')) {
      base = Math.round(0.5 * base);
    }
    return base;
  }

  totalStat(name, target) {
    var total = this.statBonus(name, target).total;
    return Math.max(0, total);
  }

  getAbility(id) {
    return this.abilities.find(a => a.template.id == id);
  }

  canUseAbility(a) {
    if(!a) return true;
    let m = this.hasAilment('scorched') ? 1 : 0;
    let resource = a.stats.resourceType == 'mana' ? this.totalMana : this.totalHealth;
    return resource >= a.stats.resourceCost + m;
  }

  selectBestAbility(t) {
    let a = this.abilities
    .sort((a, b) => {
      return a.might > b.might ? -1 : 1;
    }).find(a => {
      return a.bio.type == 'active' &&
      (a.stats.source == 'attack' || a.stats.source == 'spell') &&
      this.canUseAbility(a) &&
      (t ? this.battle.inRange(this, t, a) : true)
    });
    this.selectedAbility != a && this.selectAbility(a);
    return this.selectedAbility;
  }

  selectAbility(a) {
    if(!a) {
      this.selectedAbility = null;
      return;
    }
    if(this.selectedAbility == a) {
      this.selectedAbility = null;
      return;
    }
    if(!this.canUseAbility(a)) return;
    this.selectedAbility = a;
    let selectionsRequired = this.selectedAbility && this.selectedAbility.stats.selections || 1;
    this._selections = new FixedList(selectionsRequired);
  }

  useAbility(a) {
    if(a.stats.resourceType == 'mana' && this.totalMana >= a.stats.resourceCost) {
      this.useMana(a.stats.resourceCost);
    }
    if(a.stats.resourceType == 'health' && this.totalHealth >= a.stats.resourceCost) {
      this.harm(a.stats.resourceCost);
    }
  }

  get manaPerTurn() {
    let n = 1;
    if(this.bio.family == 'Demons') n = 2;
    if(this.hasVigor('energized')) n += 1;
    return n;
  }

  replenishMana(n) {
    this.manaUsed = Math.max(0, this.manaUsed - n);
  }

  useMana(n) {
    let m = this.hasAilment('scorched') ? 1 : 0;
    if(m) logger.log(this.bio.name, 'is scorched: mana cost increased by 1');
    let t = n + m;
    if(this.hasAilment('wilted')) {
      logger.log(this.bio.name, 'takes wilted damage', 5*t, 'from mana use.');
      this.harm(5 * t);
    }
    this.manaUsed += t;
  }

  get totalMana() {
    return Math.max(0, this.totalStat('mana') - this.manaUsed);
  }

  get maxMana() {
    return this.totalStat('mana');
  }

  get activeEffects() {
    return this.effects.filter(e => {
      return e.rounds < e.ability.stats.duration;
    })
  }

  get outnumbered() {
    return this.battle && this.battle.flanks(this) > 2;
  }

  get flanked() {
    return this.battle && this.battle.flanks(this) > 1;
  }

  get occupied() {
    return this.battle && this.battle.flanks(this) > 0;
  }

  isOccupiedBy(m) {
    return this.battle && !!this.battle.grid.around(this.x, this.y, 1)
    .find(({item, x, y}) => {
      if(item && item.team == this.team) return;
      return item == m;
    })
  }

  get sick() {
    return !!this.permanentAilments.length
  }

  get cursed() {
    return !!this.activeEffects.find(e => e.ability.stats.source == 'curse');
  }

  get blessed() {
    return !!this.activeEffects.find(e => e.ability.stats.source == 'blessing');
  }

  get healthy() {
    return this.totalHealth >= this.maxHealth;
  }

  get hurt() {
    return this.totalHealth < this.maxHealth;
  }

  get wounded() {
    return this.totalHealth < this.maxHealth/2;
  }

  get nearDeath() {
    return this.totalHealth < this.maxHealth/10;
  }

  get alive() {
    return this.totalHealth > 0;
  }

  get canTrigger() {
    return this.triggerCount < this.totalStat('tpr') && !this.hasAilment('winded');
  }

  get canMove() {
    return this.movesLeft > 0 && !~this.ailments.indexOf('held') && !~this.ailments.indexOf('stunned');
  }

  get canAct() {
    return this.totalStat('apr') && !~this.ailments.indexOf('stunned');
  }

  get maxHealth() {
    return Math.round(this.initialStacks * this.totalStat('health'));
  }

  get totalHealth() {
    return Math.round(this.maxHealth - this.damageTaken);
  }

  get healthRatio() {
    return this.totalHealth / this.maxHealth;
  }

  get healthLost() {
    return Math.min(this.damageTaken, this.maxHealth);
  }

  get health() {
    return this.totalHealth % this.totalStat('health') || this.totalStat('health');
  }

  get stacks() {
    return Math.ceil(this.totalHealth / this.totalStat('health'));
  }

  renderCS() {
    let html = `<div class='monster-cs'>
      <div>
        <img src='${this.canvas.toPNG()}'>
        <p>${this.bio.name}</p>
      </div>
    </div>`;
    return html;
  }

  static get csStyle() {
    return html`<style id='monster-cs-style'>
      * {
        box-sizing: border-box;
      }
      .right {
        float: right;
      }
      .monster-cs-outer {
        font-weight: bold;
        font-size: 11px;
        position: relative;
        height: 100%;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 10px;
        padding: 10px;
      }
      .stat-column {
        width: 120px;
        display: inline-block;
        vertical-align: top;
      }
      .stat {
        box-shadow: 0px 2px 5px -1px rgba(0,0,0,0.75);
        padding: 6px;
        border-radius: 6px;
        width: 116px;
        height: 55px;
      }
      .stat:hover {
        background-color: rgba(0,0,0,0.1);
      }
      .stat, .stat div {
        display: inline-block;
        margin: 4px;
        white-space: nowrap;
        vertical-align: middle;

      }
      .stat-img {
        background-size: cover;
        pointer-events: none;
        border-radius: 5px;
        background-color: rgba(0,0,0,0);
      }
      .stat-value {
        text-align: center;
        pointer-events: none;
      }
      section {
        padding: 4px;
        margin: 2px;
        box-shadow: 0px 0px 5px -1px rgba(0,0,0,0.25);
      }
      #details {
        width: 100%;
      }
      .bio {
        display: inline-block;
        vertical-align: top;
      }
      #close {
        position: absolute;
        right: 0px;
        top: -18px;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
      }
      .monster-stat-upgrades {
        padding: 20px;
        background-image: url(sheet_of_old_paper.png);
        position: absolute;
        top: 0px;
        left: -240px;
        width: 230px;
        user-select: none;
        cursor: inherit;
      }
      .increase-stat, .decrease-stat {
        box-shadow: 0px 2px 5px -1px rgba(0,0,0,0.75);
        border-radius: 3px;
        padding: 5px;
        display: inline-block;
        width: 20px;
        height: 20px;
        text-align: center;
        line-height: 9px;
      }
      .increase-stat:hover, .decrease-stat:hover {
        background-color: #38a;
      }
      .controls {
        float: right;
      }
      .upgrade-stat {
        height: 22px;
      }
      .upgrade-stat.unavailable {
        color: grey;
      }
      .upgrade-stat-value {

      }
      .upgrade-points {
        margin-bottom: 6px;
        font-size: 1.2em;
      }
      .monster-upgrades-commit {
        padding: 10px;
        border-radius: 4px;
        position: relative;
        margin-top: 10px;
        user-select: none;
        cursor: inherit;
        box-shadow: 0px 2px 5px -1px rgba(0,0,0,0.75);
        letter-spacing: 2px;
        font-weight: bold;
        text-align: center;
      }
      .monster-upgrades-commit:hover {
        background-color: rgba(0,0,0,0.1);
      }
    </style>`;
  }

  drawMonsterCS(popup, onClose) {
    return new MonsterCS(this);
    let m = this;
    popup.innerHTML = '';
    let {name, family, cost, maxStacks} = m.bio;
    let health = new Sprite(icons.find(i => i.bio.name == 'Health Stat').bio.sprite);
    let mana = new Sprite(icons.find(i => i.bio.name == 'Mana Stat').bio.sprite);
    let attack = new Sprite(icons.find(i => i.bio.name == 'Attack Stat').bio.sprite);
    let defence = new Sprite(icons.find(i => i.bio.name == 'Defense Stat').bio.sprite);
    let spellPower = new Sprite(icons.find(i => i.bio.name == 'Spell Power Stat').bio.sprite);
    let spellResistance = new Sprite(icons.find(i => i.bio.name == 'Spell Resistance Stat').bio.sprite);
    let initiative = new Sprite(icons.find(i => i.bio.name == 'Initiative Stat').bio.sprite);
    let movement = new Sprite(icons.find(i => i.bio.name == 'Movement Stat').bio.sprite);
    let apr = new Sprite(icons.find(i => i.bio.name == 'APR Stat').bio.sprite);
    let tpr = new Sprite(icons.find(i => i.bio.name == 'TPR Stat').bio.sprite);
    let damage = new Sprite(icons.find(i => i.bio.name == 'Damage Stat').bio.sprite);
    let style = Monster.csStyle;

    let tag = html`<div class='monster-cs-outer'>
      <section>
        <div id='close'>Close</div>
        <div class='bio' id='monster-image'></div>
        <div class='bio'>
          <div id='monster-name'>${m.bio.name}<span class='right'>${family}</span></div><br>
          <div id='monster-description'>${m.bio.description || 'No description available for this monster'}</div>
          <div id='monster-ailments'>Ailments: ${this.ailments.join()}</div>
          <div id='monster-vigors'>Vigors: ${this.vigors.join()}</div>
        </div>
      </section>
      <div class = 'stat-column'>
        <div class='stat' data-stat='health'>
          <div class='stat-img health'></div>
          <div class='stat-value'>${m.totalHealth}/${m.maxHealth}</div>
        </div>
        <div class='stat' data-stat='mana'>
          <div class='stat-img mana'></div>
          <div class='stat-value'>${m.totalMana}/${m.maxMana}</div>
        </div>
      </div>
      <div class = 'stat-column'>
        <div class='stat' data-stat='attack'>
          <div class='stat-img attack'></div>
          <div class='stat-value'>${m.totalStat('attack')}</div>
        </div>
        <div class='stat' data-stat='defence'>
          <div class='stat-img defence'></div>
          <div class='stat-value'>${m.totalStat('defence')}</div>
        </div>
      </div>
      <div class = 'stat-column'>
        <div class='stat' data-stat='spellPower'>
          <div class='stat-img spell-power'></div>
          <div class='stat-value'>${m.totalStat('spellPower')}</div>
        </div>
        <div class='stat' data-stat='spellResistance'>
          <div class='stat-img spell-resistance'></div>
          <div class='stat-value'>${m.totalStat('spellResistance')}</div>
        </div>
      </div>
      <div class = 'stat-column'>
        <div class='stat' data-stat='initiative'>
          <div class='stat-img initiative'></div>
          <div class='stat-value'>${m.totalStat('initiative')}</div>
        </div>
        <div class='stat' data-stat='movement'>
          <div class='stat-img movement'></div>
          <div class='stat-value'>${m.totalStat('movement')}</div>
        </div>
      </div>
      <div class = 'stat-column'>
        <div class='stat' data-stat='apr'>
          <div class='stat-img apr'></div>
          <div class='stat-value'>${m.totalStat('apr')}</div>
        </div>
        <div class='stat' data-stat='tpr'>
          <div class='stat-img tpr'></div>
          <div class='stat-value'>${m.totalStat('tpr')}</div>
        </div>
      </div>
      <div class = 'stat-column'>
        <div class='stat' data-stat='damage'>
          <div class='stat-img damage'></div>
          <div class='stat-value'>${m.totalStat('damage')}</div>
        </div>
      </div>

      <section id='stat-description'></section>
      <section id='active-abilities'>Active Abilities <br></section>
      <section id='passive-abilities'>Passive Abilities <br></section>
      <section id='trigger-abilities'>Trigger Abilities <br></section>
      <section id='active-effects'>Active Effects <br></section>
      <section id='details'></section>
    </div>`;
    if(!document.getElementById('monster-cs-style')) {
      document.head.appendChild(style);
    } else {
      // tag.appendChild(style);
    }

    tag.querySelector('#monster-image').appendChild(m.canvas.clone());
    tag.querySelector('.stat-img.health').appendChild(health.canvas);
    tag.querySelector('.stat-img.mana').appendChild(mana.canvas);
    tag.querySelector('.stat-img.attack').appendChild(attack.canvas);
    tag.querySelector('.stat-img.defence').appendChild(defence.canvas);
    tag.querySelector('.stat-img.spell-power').appendChild(spellPower.canvas);
    tag.querySelector('.stat-img.spell-resistance').appendChild(spellResistance.canvas);
    tag.querySelector('.stat-img.initiative').appendChild(initiative.canvas);
    tag.querySelector('.stat-img.movement').appendChild(movement.canvas);
    tag.querySelector('.stat-img.apr').appendChild(apr.canvas);
    tag.querySelector('.stat-img.tpr').appendChild(tpr.canvas);
    tag.querySelector('.stat-img.damage').appendChild(damage.canvas);
    tag.querySelector('#close').addEventListener('click', e => {
      this.battle && this.battle.toggleAbilityBook();
      onClose && onClose();
    })
    m.actives.forEach(a => {
      var c = a.sprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawAbilityStats(a, tag.querySelector('#details'))
      })
      tag.querySelector('#active-abilities').appendChild(c);
    })
    m.triggers.forEach(a => {
      var c = a.sprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawAbilityStats(a, tag.querySelector('#details'))
      })
      tag.querySelector('#trigger-abilities').appendChild(c);
    })
    m.passives.forEach(a => {
      var c = a.sprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawAbilityStats(a, tag.querySelector('#details'))
      })
      tag.querySelector('#passive-abilities').appendChild(c);
    })

    m.activeEffects.forEach(e => {
      var c = e.canvas.clone();
      c.addEventListener('click', () => {
        this.drawEffectStats(e, tag.querySelector('#details'));
      })

      tag.querySelector('#active-effects').appendChild(c);
    })
    m.passives.forEach(a => {
      if(a.stats.targetFamily != 'self') return;
      if(!a.owner.abilityConditionMet(a, this)) return;
      var c = a.effectSprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawEffectStats({ability: a, power: a.power}, tag.querySelector('#details'));
      })
      tag.querySelector('#active-effects').appendChild(c);
    })

    this.affectedByAuras().forEach(a => {
      var c = a.effectSprite.canvas.clone();
      c.addEventListener('click', e => {
        this.drawEffectStats({ability: a, power: a.power}, tag.querySelector('#details'));
      })

      tag.querySelector('#active-effects').appendChild(c);
    })

    tag.addEventListener('click', e => {
      if(e.target.classList.contains('stat')) {
        let d = tag.querySelector('#stat-description');
        let stat = e.target.dataset.stat;
        let bd = m.statBonus(stat);
        d.innerHTML = `<div>${names[stat]}: base ${bd.base} + effects ${bd.combined.total} + circumstantial ${bd.circumstance} + equipment ${bd.equipment}</div>
        Blessing: ${bd.combined.blessingName} ${bd.combined.blessing.value}, Curse: ${bd.combined.curseName} ${bd.combined.curse.value}`;
      }
    })

    popup.appendChild(tag)
  }

  affectedByAura(name) {
    return !!this.affectedByAuras().find(a => a.bio.name == name);
  }

  affectedByAuras() {
    return !this.battle ? [] : this.battle.auras.all.filter(a => {
      if(!a.owner.alive) return;
      var {source, targetFamily, multiplier, radius} = a.stats;
      if(a.owner.team == this.team) {
        if(targetFamily == 'enemies') return;
      } else {
        if(targetFamily == 'allies') return;
      }
      if(!a.owner.abilityConditionMet(a, this)) return;
      var d = this.battle.grid.distance(this.x, this.y, a.owner.x, a.owner.y);
      if(a.stats.shape == 'square') {
        d = this.battle.grid.squareRadius(this.x, this.y, a.owner.x, a.owner.y);
      }
      if(d > radius) return;
      return true;
    })
  }

  drawEffectStats(e, tag) {
    let a = e.ability;
    let {source, attribute, element, minPower,
      maxPower, multiplier, resourceCost, resourceType,
      range, effect, duration, ailment, vigor
    } = a.stats;
    tag.style.whiteSpace = 'pre-line';
    let {activation, type, name, condition} = a.bio;
    let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
    attribute = source == 'spell' || source == 'attack' ? 'health' : attribute;
    let time = type == 'passive' ? 'permanent' : `${e.rounds}/${duration} rounds`;
    var text = `<span class='bold'>Name</span>: ${name}
    <span class='bold'>Source</span>: ${source}
    <span class='bold'>Element</span>: ${element}
    <span class='bold'>Duration</span>: ${time}
    <span class='bold'>Effect</span>: ${e.power} to ${attribute}`;
    if(ailment) text += `\n<span class='bold'>Ailment</span>: ${ailment}`;
    if(vigor) text += `\n<span class='bold'>Vigor</span>: ${vigor}`;
    tag.innerHTML = text;
  }

  drawAbilityStats(a, tag) {
    let {source, attribute, element, minPower, shape, radius,
      maxPower, multiplier, resourceCost, resourceType,
      range, effect, duration, target, targetFamily, stacks,
      ailment, vigor
    } = a.stats;
    tag.style.whiteSpace = 'pre-line';
    if(resourceType == 'mana' && this.hasAilment('scorched')) {
      resourceCost += 1;
    }
    let {activation, type, name, description, condition} = a.bio;
    let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
    let act = type == 'trigger' ? `\n<span class='bold'>Trigger</span>: ${activation}` : '';
    let con = condition ? '\nCondition: ' + condition : '';
    var text = `<span class='bold'>Name</span>: ${name}
    <span class='bold'>Target</span>: ${target}/${targetFamily}
    <span class='bold'>Type</span>: ${type}${act}${con}
    <span class='bold'>Shape</span>: ${shape}
    <span class='bold'>Radius</span>: ${radius}
    <span class='bold'>Source</span>: ${source}
    <span class='bold'>Element</span>: ${element}
    <span class='bold'>Cost</span>: ${resourceCost} ${resourceType}
    <span class='bold'>Range</span>: ${range}`;
    if(ailment) {
      text += `\n<span class='bold'>Ailment</span>: ${ailment}`;
    }
    if(vigor) {
      text += `\n<span class='bold'>Vigor</span>: ${vigor}`;
    }
    let time = duration ? ` for ${duration} rounds` : '';
    if(condition) {
      text += `\n<span class='bold'>Condition</span>: ${condition}`
    }
    if(multiplier) {
      text += `\n<span class='bold'>Power</span>: (${minPower}-${maxPower}) * ${multiplier}% to ${stat}${time} (max stacks: ${stacks})`;
      if(effect) {
        let {source, attribute, minPower, maxPower, multiplier, duration, stacks} = effect.stats;
        let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
        let time = duration ? ` for ${duration} rounds` : '';
        text += `, (${minPower}-${maxPower}) * ${multiplier}% to ${stat}${time} (max stacks: ${stacks})`;
      }

    }
    text += `\n\n${description}`;
    tag.innerHTML = text;
  }
}

module.exports = Monster;
