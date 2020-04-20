function sortAlphabetically(a, b) {
  if(a == b) return 0;
  return a < b ? -1 : 1;
}
function sortOnName(a, b) {
  if(a.bio.name == b.bio.name) return 0;
  return a.bio.name < b.bio.name ? -1 : 1;
}
const abilities = require('abilities.js');
var tpl = {
  name: "Skilltree Mod",
  folder: "skilltree-mods",
  library: 'skilltree-mods.js',
  queryCommand: 'saveSkilltreeMod',
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
          type: 'spritesheet-palette',
          exportAs: 'sprite',
          src: 'DungeonCrawl_ProjectUtumnoTileset.png',
          w: 32,
          h: 32
        }
      ]
    },
    {
      name: 'Stats',
      exportAs: 'stats',
      items: [
        {
          name: 'Animation',
          exportAs: 'animation',
          type: 'binary',
          initial: false
        },
        {
          name: 'Composite',
          exportAs: 'composite',
          type: 'binary',
          initial: false
        },
        {
          name: 'Tier',
          exportAs: 'tier',
          type: 'increment',
          initial: 0,
          range: [0, 3]
        },
        {
          name: 'Value',
          exportAs: 'value',
          type: 'increment',
          initial: 0,
          range: [0, 3]
        },
        {
          name: 'Radius',
          exportAs: 'r',
          type: 'increment',
          initial: 0,
          range: [0, 3]
        },
        {
          name: 'Shape',
          exportAs: 'shape',
          type: 'select',
          initial: '',
          values: ['point', 'circle', 'square']
        },
        {
          name: 'Ailment',
          type: 'select',
          values: [
            '',
            'stunned', //unable to take any action
            'held', //unable to move,
            'overwhelmed', //25% increased damage taken from adjacent enemies
            'meekened', //25% reduced damage dealt to adjacent enemies
            'exposed', //25% increased damage taken from enemies far away
            'rushed', //25% reduced damage dealt to enemies far away,
            'bruised',
            'bleeding',
            'singed',
            'scorched',
            'wet',
            'soaked',
            'winded',
            'shocked',
            'contagious',
            'brittle',
            'dazzled',
            'blinded',
            'wilted',
            'blighted',
          ],
          initial: '',
          exportAs: 'ailment'
        },
        {
          name: 'Vigor',
          type: 'select',
          values: [
            '',
            'intimidating', 'prepared', 'precise', 'hidden', 'illuminated',
            'engorged', 'grounded', 'charged'
          ],
          initial: '',
          exportAs: 'vigor'
        },

      ]
    },
  ]
};

module.exports = tpl;
