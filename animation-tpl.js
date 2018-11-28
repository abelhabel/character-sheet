function sortAlphabetically(a, b) {
  return a < b ? -1 : 1;
}
var tpl = {
  name: "Animation",
  folder: "animations",
  library: 'animations.js',
  queryCommand: 'saveAnimation',
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
        }
      ]
    },
    {
      name: 'Stats',
      exportAs: 'stats',
      items: [
        {
          name: 'Size Start',
          exportAs: 'sizeStart',
          type: 'slider',
          initial: 100
        },
        {
          name: 'Size End',
          exportAs: 'sizeEnd',
          type: 'slider',
          initial: 100
        },
        {
          name: 'Speed Start',
          exportAs: 'speedStart',
          type: 'slider',
          initial: 50
        },
        {
          name: 'Speed End',
          exportAs: 'speedEnd',
          type: 'slider',
          initial: 50
        },
        {
          name: 'Speed Ease',
          exportAs: 'speedEase',
          type: 'slider',
          initial: 50
        },
        {
          name: 'Elevation',
          exportAs: 'elevation',
          type: 'slider',
          initial: 50
        },
        {
          name: 'Elevation Start',
          exportAs: 'elevationStart',
          type: 'slider',
          initial: 50
        }
      ]
    }
  ]
};

module.exports = tpl;
