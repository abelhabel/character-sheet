require('./date-extension');
const http = require("http");
const backup = require("./backup");
const URL = require('url').URL;
const fs = require('fs');
const PORT = process.env.PORT || 5000;
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
  'animations.js': () => wrap.pre() + require('./animations.js')() + wrap.post('animations.js'),
  'leaders.js': () => wrap.pre() + require('./leaders.js')() + wrap.post('leaders.js'),
  'socket-worker.js': fs.readFileSync(__dirname + '/socket-worker.js'),
  'init-battle.js': fs.readFileSync(__dirname + '/init-battle.js'),
  'init-arena.js': fs.readFileSync(__dirname + '/init-arena.js'),
  'init-animation.js': fs.readFileSync(__dirname + '/init-animation.js'),
  'init-ability-compendium.js': fs.readFileSync(__dirname + '/init-ability-compendium.js'),
  'init-bestiary.js': fs.readFileSync(__dirname + '/init-bestiary.js'),
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
loadFile('Menu.js');
loadFile('Match.js');
loadFile('DynamicSound.js');
loadFile('TeamViewer.js');
loadFile('Team.js');
loadFile('UnitPlacement.js');
loadFile('FixedList.js');
loadFile('View.js');
loadFile('GameUI.js');
loadFile('Component.js');
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
loadFile('pathfinding.js');
loadFile('index.html');
loadFile('rules.html', addRuleLinks);
loadFile('battle.html');
loadFile('animation.html');
loadFile('arena.html');
loadFile('lobby.html');
loadFile('bestiary.html');
loadFile('ability-compendium.html');
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
    if(typeof files[name] == 'function') {
      return res.end(files[name]());
    }
    return res.end(files[name], 'binary');
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
  if(name == 'saveIcon') {
    return saveData(req, res, 'icons', url);
  }
  if(name == 'saveAnimation') {
    return saveData(req, res, 'animations', url);
  }
  if(name.match('.wav')) {
    console.log('loading sound', name)
    res.writeHead(200, {'Content-Type': 'audio/wav'})
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
