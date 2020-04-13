require('./date-extension');
const http = require("http");
const backup = require("./backup");
const URL = require('url').URL;
const fs = require('fs');
const PORT = process.env.PORT || 5000;
const Folder = require('./Folder.js');
const soundNames = new Folder('sounds');
const wrap = {
  pre: () => '(function (module) {\n module.pre = function() {',
  post: (name) => `\n}})(Module.modules["${name}"])`
}
const blog = require('./blog');
const guid = require('./guid');
const files = {
  'monsters.js': () => wrap.pre() + require('./monsters.js')() + wrap.post('monsters.js'),
  'abilities.js': () => wrap.pre() + require('./abilities.js')() + wrap.post('abilities.js'),
  'terrains.js': () => wrap.pre() + require('./terrains.js')() + wrap.post('terrains.js'),
  'arenas.js': () => wrap.pre() + require('./arenas.js')() + wrap.post('arenas.js'),
  'icons.js': () => wrap.pre() + require('./icons.js')() + wrap.post('icons.js'),
  'teams.js': () => wrap.pre() + require('./teams.js')() + wrap.post('teams.js'),
  'equipments.js': () => wrap.pre() + require('./equipments.js')() + wrap.post('equipments.js'),
  'matches.js': () => wrap.pre() + require('./matches.js')() + wrap.post('matches.js'),
  'gauntlets.js': () => wrap.pre() + require('./gauntlets.js')() + wrap.post('gauntlets.js'),
  'adventures.js': () => wrap.pre() + require('./adventures.js')() + wrap.post('adventures.js'),
  'recipes.js': () => wrap.pre() + require('./recipes.js')() + wrap.post('recipes.js'),
  'animations.js': () => wrap.pre() + require('./animations.js')() + wrap.post('animations.js'),
  'leaders.js': () => wrap.pre() + require('./leaders.js')() + wrap.post('leaders.js'),
  'socket-worker.js': fs.readFileSync(__dirname + '/socket-worker.js'),
  'init-battle.js': fs.readFileSync(__dirname + '/init-battle.js'),
  'init-arena.js': fs.readFileSync(__dirname + '/init-arena.js'),
  'init-animation.js': fs.readFileSync(__dirname + '/init-animation.js'),
  'init-ability-compendium.js': fs.readFileSync(__dirname + '/init-ability-compendium.js'),
  'init-bestiary.js': fs.readFileSync(__dirname + '/init-bestiary.js'),
  'init-team.js': fs.readFileSync(__dirname + '/init-team.js'),
  'init-adventure.js': fs.readFileSync(__dirname + '/init-adventure.js'),
  'init-skilltree.js': fs.readFileSync(__dirname + '/init-skilltree.js'),
}
// console.log(files['abilities.js'])
var ruleLinks = [
  [[' (ability)', ' (abilities)'], 'abilities'],
  [[' (turns)', ' (turn)'], 'turn'],
  [[' (rounds)', ' (round)'], 'round'],
  [[' (passives)', ' (passive)'], 'passive'],
  [[' (triggers)', ' (trigger)'], 'trigger'],
  [[' (shapes)', ' (shape)'], 'shape'],
  [[' (attack roll)'], 'attack-roll'],
  [[' (spell roll)'], 'spell-roll'],
  [[' (flanking)', ' (flanked)', ' (flanks)', ' (flank)'], 'flanking'],
  [[' (ailments)', ' (ailment)'], 'ailment'],
  [[' (vigors)', ' (vigor)'], 'vigor'],
  [[' (Initiative)', ' (initiative)'], 'initiative'],
];

function addRuleLinks(html) {
  let out = html.toString();
  ruleLinks.forEach(rl => {
    rl[0].forEach(word => {
      let test = new RegExp(word, 'g');
      out = out.replace(test, ` <a href='#${rl[1]}'>$1</a>`);
    })
  })
  return out;
}
function loadFile(name, transform) {
  if(name.match('.js')) {
    files[name] = wrap.pre() + fs.readFileSync(__dirname + '/' + name) + wrap.post(name);
  } else {
    files[name] = fs.readFileSync(__dirname + '/' + name);
    if(transform) {
      files[name] = transform(files[name]);
    }
  }
}

soundNames.readFileNames().then(fileNames => {
  files['sounds.js'] = wrap.pre() + 'module.exports=' + JSON.stringify(fileNames) + wrap.post('sounds.js');
})
.catch(err => console.log(err))

loadFile('AbilityCard.js');
loadFile('AdventureOptions.js');
loadFile('Keyboard.js');
loadFile('AdventureHelp.js');
loadFile('PrimeVessel.js');
loadFile('Equipment.js');
loadFile('Armory.js');
loadFile('AdventureMessage.js');
loadFile('storage.js');
loadFile('CS.js');
loadFile('PositionList2d.js');
loadFile('Battle.js');
loadFile('Rand.js');
loadFile('Ability.js');
loadFile('Monster.js');
loadFile('MonsterCard.js');
loadFile('Terrain.js');
loadFile('Logger.js');
loadFile('Lobby.js');
loadFile('lobby-channels-client.js');
loadFile('Arena.js');
loadFile('Canvas.js');
loadFile('Sprite.js');
loadFile('CompositeSprite.js');
loadFile('AbilityEffect.js');
loadFile('Slider.js');
loadFile('Animation.js');
loadFile('AI.js');
loadFile('TeamSelect.js');
loadFile('BattleResult.js');
loadFile('BattleMenu.js');
loadFile('SoundPlayer.js');
loadFile('Menu.js');
loadFile('Match.js');
loadFile('DynamicSound.js');
loadFile('TeamViewer.js');
loadFile('Quest.js');
loadFile('QuestLog.js');
loadFile('Check.js');
loadFile('upgrade-rules.js');
loadFile('Team.js');
loadFile('UnitPlacement.js');
loadFile('ToolTip.js');
loadFile('Scroll.js');
loadFile('FixedList.js');
loadFile('View.js');
loadFile('GameUI.js');
loadFile('Gauntlet.js');
loadFile('CardList.js');
loadFile('Component.js');
loadFile('TeamSheet.js');
loadFile('Maze.js');
loadFile('Adventure.js');
loadFile('AdventureEditor.js');
loadFile('AdventureMenu.js');
loadFile('AdventureTime.js');
loadFile('SkillTree.js');
loadFile('Camera.js');
loadFile('GridBox.js');
loadFile('Inventory.js');
loadFile('Crafting.js');
loadFile('init-sound.js');
loadFile('game-modes.js');
loadFile('guid.js');
loadFile('seven.js');
loadFile('special-effects.js');
loadFile('elements.js');
loadFile('ability-tpl.js');
loadFile('terrain-tpl.js');
loadFile('animation-tpl.js');
loadFile('heroes-like.js');
loadFile('icon-tpl.js');
loadFile('team-tpl.js');
loadFile('leader-tpl.js');
loadFile('quest-tpl.js');
loadFile('recipe-tpl.js');
loadFile('equipment-tpl.js');
loadFile('pathfinding.js');
loadFile('index.html');
loadFile('rules.html', addRuleLinks);
loadFile('battle.html');
loadFile('animation.html');
loadFile('skilltree.html');
loadFile('arena.html');
loadFile('team.html');
loadFile('lobby.html');
loadFile('bestiary.html');
loadFile('ability-compendium.html');
loadFile('adventure.html');
loadFile('Aclonica.ttf');
loadFile('DungeonCrawl_ProjectUtumnoTileset.png');
loadFile('sheet_of_old_paper.png');
loadFile('sheet_of_old_paper_horizontal.png');
loadFile('spellbookForFlare.png');
loadFile('Hell2.jpg');
loadFile('mythical_card.jpg');
loadFile('demons_card.jpg');
loadFile('beasts_card.jpg');
loadFile('outlaws_card.jpg');
loadFile('undead_card.jpg');
loadFile('order_of_idun_card.jpg');
loadFile('aloysias_chosen_card.jpg');
loadFile('defeat.jpg');

const Spartan = {
  regular: fs.readFileSync(__dirname + '/Spartan-Regular.ttf'),
  semibold: fs.readFileSync(__dirname + '/Spartan-SemiBold.ttf')
};

function saveData(req, res, folder, url) {
  let id = url.searchParams.get('id') ||  guid();
  let name = id + '.json';
  console.log('saving', name, id)
  let local = fs.createWriteStream(__dirname + `/${folder}/${name}`);
  let remote = backup.stream(folder, name);
  req.on('data', chunk => {
    console.log('writing data to local and remote')
    local.write(chunk);
    remote.write(chunk);
  })
  local.on('finish', () => {
    console.log('write to local finished')

  });
  local.on('error', (e) => {
    console.log('error writing to local', e)
  });
  remote.on('error', (e) => {
    console.log('error writing to remote', e, e.stack)
  });
  req.on('end', () => {
    console.log('reading request data is done');
    local.end();
    remote.end()
  });
  res.end(id);
}

const server = http.createServer(function(req, res) {
  var url = new URL('http://home.com' + req.url);
  var name = url.pathname.replace('/', '');
  if(!name) name = 'index.html';
  if(name == 'rules') name = 'rules.html';
  if(files[name]) {
    let mime = name.split('.')[1];
    if(mime) {
      if(mime == 'js') {
        res.writeHead(200, {'Content-Type': 'text/javascript'});
      } else
      if(mime == 'ttf') {
        res.writeHead(200, {'Content-Type': 'text/css'});
      }
      else {
        res.writeHead(200, {'Content-Type': 'text/' + mime});
      }
    }
    if(typeof files[name] == 'function') {
      return res.end(files[name]());
    }
    return res.end(files[name], 'binary');
  }

  if(name == 'Spartan-Regular.ttf') {
    return res.end(Spartan.regular, 'binary');
  }

  if(name == 'Spartan-SemiBold.ttf') {
    return res.end(Spartan.semibold, 'binary');
  }

  if(name.match(/^blog/)) {
    let target = name.match(/^blog\/([0-9a-zA-Z-_,!']+)/);
    if(target) {
      if(target[1] == 'feed') {
        let feed = blog.jsonFeed();
        res.writeHead(200, {'Content-Type': 'application/json'})
        return res.end(feed);
      }
      let post = blog.get(target[1]);
      if(!post) {
        res.statusCode = 404;
        return res.end(`<html DOCTYPE='html'><head></head><body>Blog post not found. <a href="/blog">See all blog posts</a></body></html>`);
      }
      return res.end(post);
    }
    return res.end(blog.html())
  }
  if(name == 'saveMonster') {
    return saveData(req, res, 'monsters', url);
  }
  if(name == 'saveLeader') {
    return saveData(req, res, 'leaders', url);
  }
  if(name == 'saveAbility') {
    return saveData(req, res, 'abilities', url);
  }
  if(name == 'saveTerrain') {
    return saveData(req, res, 'terrain', url);
  }
  if(name == 'saveArena') {
    return saveData(req, res, 'arenas', url);
  }
  if(name == 'saveTeam') {
    return saveData(req, res, 'teams', url);
  }
  if(name == 'saveMatch') {
    return saveData(req, res, 'matches', url);
  }
  if(name == 'saveGauntlet') {
    return saveData(req, res, 'gauntlets', url);
  }
  if(name == 'saveAdventure') {
    return saveData(req, res, 'adventures', url);
  }
  if(name == 'saveIcon') {
    return saveData(req, res, 'icons', url);
  }
  if(name == 'saveAnimation') {
    return saveData(req, res, 'animations', url);
  }
  if(name == 'saveRecipe') {
    return saveData(req, res, 'recipes', url);
  }
  if(name == 'saveEquipment') {
    return saveData(req, res, 'equipment', url);
  }
  if(name.match('.wav')) {
    console.log('loading sound', name)
    res.writeHead(200, {'Content-Type': 'audio/wav'})
    return fs.createReadStream(name).pipe(res);
  }
  if(name.match('.mp3')) {
    console.log('loading sound', name)
    res.writeHead(200, {'Content-Type': 'audio/mp3'})
    return fs.createReadStream(name).pipe(res);
  }

  res.end();

});

require('./ws.js')(server);
// let ut = require('./update-teams');
// let Folder = require('./Folder');
// let f = new Folder('teams');
// f.readFileNames()
// .then(fileNames => {
//   fileNames.forEach(fn => {
//     ut(fn)
//   })
// })
server.listen(PORT);
