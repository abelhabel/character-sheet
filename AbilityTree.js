const Tree = require('Tree.js');
const abilities = require('abilities.js');



class AbilityTree extends Tree {
  constructor(skill) {
    super(21, 21);
    this.skill = skill;
  }

  init() {
    Tree.prototype.init.call(this);
  }

  inSetting(x, y) {
    return false;
  }
}

class Editor extends AbilityTree {
  constructor() {
    super();
  }
}

AbilityTree.folder = 'abilitytree';
Editor.folder = 'abilitytree';
AbilityTree.Editor = Editor;
AbilityTree.folder = 'abilitytree';
module.exports = AbilityTree;
