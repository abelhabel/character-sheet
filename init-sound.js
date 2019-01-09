const DS = require('DynamicSound.js');
function initSound() {
  
  let a = new DS();
  let c = a.render();
  document.body.appendChild(c.canvas);
}

module.exports = initSound;
