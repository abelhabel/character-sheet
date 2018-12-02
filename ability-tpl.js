var abilities = require('abilities.js');
var monsters = require('monsters.js');
var animations = require('animations.js');
function isEffect(a) {
  return a.bio.type == 'active' && (a.stats.source == 'blessing' || a.stats.source == 'curse');
}
function sortAlphabetically(a, b) {
  return a < b ? -1 : 1;
}
var tpl = {
  name: "Ability",
  folder: "abilities",
  library: 'abilities.js',
  queryCommand: 'saveAbility',
  categories: [
    {
      name: 'Bio',
      exportAs: 'bio',
      items: [
        {
          name: 'Name',
          exportAs: 'name',
          type: 'input',
          minCharacters: 1,
          maxCharacters: 128,
        },
        {
          name: 'Sprite',
          type: 'spritesheet',
          exportAs: 'sprite',
          src: 'DungeonCrawl_ProjectUtumnoTileset.png',
          w: 32,
          h: 32
        },
        {
          name: 'Type',
          type: 'select',
          exportAs: 'type',
          values: ['passive', 'active', 'trigger'],
          initial: 'active'
        },
        {
          name: 'Activation',
          type: 'select',
          values: [
            'when selected',
            'when attack hits',
            'when self is hit',
            'when adjacent ally is hit',
            'when nearby ally is hit',
            'when ally is hit',
            'when adjacent enemy is hit',
            'when nearyby enemy is hit',
            'when enemy is hit',
            'when adjacent enemy is slain',
            'when enemy is slain by self'
          ],
          initial: 'when selected',
          exportAs: 'activation'
        },
        {
          name: 'Condition',
          type: 'select',
          values: [
            '',
            'flanked'
          ],
          initial: '',
          exportAs: 'condition'
        },
        {
          name: 'Description',
          exportAs: 'description',
          type: 'text',
          initial: 'No description added yet.'
        }
      ]
    },
    {
      name: 'Animation',
      exportAs: 'animation',
      items: [
        {
          name: 'Sprite',
          type: 'spritesheet',
          exportAs: 'sprite',
          src: 'DungeonCrawl_ProjectUtumnoTileset.png',
          w: 32,
          h: 32
        },
        {
          name: 'Template',
          type: 'select',
          exportAs: 'template',
          values: animations.map(a => a.bio.name),
          initial: ''
        }
      ]
    },
    {
      name: 'Stats',
      exportAs: 'stats',
      items: [
        {
          name: 'Shape',
          type: 'select',
          values: ['point', 'line', 'cone', 'circle', 'square'],
          initial: 'point',
          exportAs: 'shape'
        },
        {
          name: 'Radius',
          type: "increment",
          description: "Radius of area of effect",
          initial: 1,
          range: [1, 10],
          exportAs: 'radius',
        },
        {
          name: 'Target',
          type: 'select',
          values: ['actor', 'ground'],
          initial: 'actor',
          exportAs: 'target',
        },
        {
          name: 'Target Family',
          type: 'select',
          values: ['allies', 'enemies', 'all', 'self'],
          initial: 'all',
          exportAs: 'targetFamily'
        },
        {
          name: 'Range',
          type: 'increment',
          description: 'Range of ability',
          initial: 1,
          range: [0, 10],
          exportAs: 'range'
        },
        {
          name: 'Duration',
          type: 'increment',
          initial: 0,
          range: [0, 10],
          exportAs: 'duration'
        },
        {
          name: 'Resource Cost',
          type: 'increment',
          range: [0, 100],
          initial: 0,
          exportAs: 'resourceCost'
        },
        {
          name: 'Resource Type',
          type: 'select',
          values: ['mana', 'health'],
          initial: 'mana',
          exportAs: 'resourceType'

        },
        {
          name: 'Element',
          type: 'select',
          values: ['force', 'rot', 'vitality', 'water', 'fire', 'air', 'earth'],
          initial: 'force',
          exportAs: 'element'

        },
        {
          name: 'Effect',
          type: 'select',
          values: abilities.map(a => a.bio.name).sort(sortAlphabetically),
          initial: '',
          exportAs: 'effect'
        },
        {
          name: 'Multiplier',
          type: 'increment',
          range: [0, 1000],
          step: 10,
          initial: 100,
          exportAs: 'multiplier'
        },
        {
          name: 'Min Power',
          type: 'increment',
          range: [0, 100],
          initial: 1,
          exportAs: 'minPower'
        },
        {
          name: 'Max Power',
          type: 'increment',
          range: [0, 100],
          initial: 1,
          exportAs: 'maxPower'
        },
        {
          name: 'Stacks',
          type: 'increment',
          range: [1, 100],
          initial: 1,
          exportAs: 'stacks'
        },
        {
          name: 'Source',
          type: 'select',
          values: ['attack', 'spell', 'curse', 'blessing'],
          initial: 'attack',
          exportAs: 'source'
        },
        {
          name: 'Attribute',
          type: 'select',
          values: ['', 'attack', 'defence', 'spellPower', 'spellResistance',
          'movement', 'initiative', 'damage', 'mana', 'apr', 'tpr'],
          initial: '',
          exportAs: 'attribute'
        },
        {
          name: 'Summon',
          type: 'select',
          values: ['', ...monsters.map(m => m.bio.name).sort(sortAlphabetically)],
          initial: '',
          exportAs: 'summon'
        },
        {
          name: 'Ailment',
          type: 'select',
          values: ['stunned', 'held'],
          initial: '',
          exportAs: 'ailment'
        },
        {
          name: 'Special',
          type: 'select',
          values: ['', 'hypnotize', 'berzerk', 'reflectDamage',
            'giveEffectAsAbility', 'phantomImage', 'stealBlessing',
            'dispel', 'teleport', 'lifeLeech', 'polymorph', 'blink',
            'chain', 'manaThief', 'suicide', 'charge', 'reflectArrows'
          ],
          initial: 'false',
          exportAs: 'special'
        },
        {
          name: 'Selections',
          type: 'increment',
          range: [1, 2],
          initial: 1,
          exportAs: 'selections'
        },

      ]
    }
  ]
};

module.exports = tpl;
