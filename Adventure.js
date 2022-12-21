const guid = require('guid.js');
const Rand = require('Rand.js');
const Component = require('Component.js');
const Canvas = require('Canvas.js');
const Sprite = require('Sprite.js');
const Terrain = require('Terrain.js');
const Team = require('Team.js');
const TeamViewer = require('TeamViewer.js');
const SoundPlayer = require('SoundPlayer.js');
const AdventureTime = require('AdventureTime.js');
const AdventureMenu = require('AdventureMenu.js');
const AdventureMessage = require('AdventureMessage.js');
const Scroll = require('Scroll.js');
const Ability = require('Ability.js');
const AbilityCard = require('AbilityCard.js');
const Quest = require('Quest.js');
const Check = require('Check.js');
const Equipment = require('Equipment.js');
const AdventureHelp = require('AdventureHelp.js');
const Keyboard = require('Keyboard.js');
const Maze = require('Maze.js');
const PL = require('PositionList2d.js');
const storage = require('storage.js');
const icons = require('icons.js');
const abilities = require('abilities.js');
const terrains = require('terrains.js');
const equipments = require('equipments.js');
const teams = require('teams.js');
const interactIcon = icons.find(i => i.bio.name == 'Interact');
const portingIcon = icons.find(i => i.bio.name == 'Porting');
const checkIcon = icons.find(i => i.bio.name == 'Check');
const selectedIcon = icons.find(i => i.bio.name == 'Hit Background');
const deselectIcon = icons.find(i => i.bio.name == 'Stop');
const removeIcon = icons.find(i => i.bio.name == 'Delete');
const invertIcon = icons.find(i => i.bio.name == 'Invert');
const goldIcon = icons.find(i => i.bio.name == 'Gold');
const azuriteIcon = icons.find(i => i.bio.name == 'Azurite');
const zirconIcon = icons.find(i => i.bio.name == 'Zircon');
const ironIcon = icons.find(i => i.bio.name == 'Iron');
const topazIcon = icons.find(i => i.bio.name == 'Topaz');
const adamiteIcon = icons.find(i => i.bio.name == 'Adamite');
const bruciteIcon = icons.find(i => i.bio.name == 'Brucite');
const mudIcon = icons.find(i => i.bio.name == 'Mud');
const tileTargetIcon = icons.find(i => i.bio.name == 'Tile Target');
const selectSprite = new Sprite(selectedIcon.bio.sprite);
const tileTargetSprite = new Sprite(tileTargetIcon.bio.sprite);
const goldSprite = new Sprite(goldIcon.bio.sprite);
const interactSprite = new Sprite(interactIcon.bio.sprite);
const portingSprite = new Sprite(portingIcon.bio.sprite);
const checkSprite = new Sprite(checkIcon.bio.sprite);
const sp = new SoundPlayer();



class Dialog extends Component {
  constructor(text) {
    super(true);
    this.text = text || '';
  }

  static get style() {
    return html`<style>
      .dialog {
        font-family: Tahoma, sans-serif;
        padding: 10px;
        background-color: beige;
      }
    </style>`;
  }

  setText(e) {
    this.text = e.target.value;
  }

  render() {
    this.clear();
    this.addStyle(Dialog.style);
    let t = html`<div class='dialog'>
      <textarea>${this.text}</textarea>
    </div>`;
    t.querySelector('textarea').addEventListener('keyup', this.setText.bind(this))
    this.append(t);
    return this.tags.outer;
  }
}

class Layer {
  constructor(name, canvas, w, h, tw, th) {
    this.name = name;
    this.items = new PL(w, h);
    this.canvas = canvas && new Canvas(tw * w, th * h);
    this.animations = new PL(w, h);
  }
}

class Record {
  constructor() {
    this.adventureItemCount = 0;
    this.questFinished = false;
    this.monsterKilled = false;
    this.obstacleRemoved = false;
    this.fog = true;
    this.seed = null;
    this.checkResult = 0;
  }

  compress() {
    return [this.adventureItemCount, this.questFinished, this.monsterKilled, this.obstacleRemoved, this.fog, this.seed, this.checkResult];
  }

  import(a) {
    if(a[7]) console.log('failed', a)
    this.adventureItemCount = a[0];
    this.questFinished = a[1];
    this.monsterKilled = a[2];
    this.obstacleRemoved = a[3];
    this.fog = a[4];
    this.seed = a[5];
    this.checkResult = a[6];
  }

  addSeed(seed) {

  }

  removeFog() {
    this.fog = false;
  }

  removeObstacle() {
    this.obstacleRemoved = true;
  }

  killMonster() {
    this.monsterKilled = true;
  }

  completeQuest(quest, adventure) {
    quest.takeCondition(adventure);
    quest.giveReward(adventure);
    this.questFinished = true;
    sp.play('quest_complete');
  }

  rollCheck(v) {
    this.checkResult = v;
  }

  shouldDraw(item) {
    if(item instanceof Terrain || item instanceof Equipment) {
      if(!item.adventure.consumable) return true;
      return !this.isConsumed(item);
    }
    return true;
  }

  isConsumed(terrain) {
    if(!terrain.adventure.charges) return false;
    return this.adventureItemCount >= terrain.adventure.charges * terrain.adventure.actionAmount;
  }

  consume(terrain) {
    this.adventureItemCount += terrain.adventure.actionAmount;
  }

  resetConsumption(terrain) {
    if(terrain && terrain.adventure && terrain.adventure.chargeActivation == 'per turn') {
      this.adventureItemCount = 0;
    }
  }

  takeAdventureItems(terrain) {
    if(this.adventureItemCount >= terrain.adventure.charges * terrain.adventure.actionAmount) return [];
    let out = [];
    let max = terrain.adventure.actionAmount;
    for(let i = 0; i < max; i++) {
      out.push(terrain.adventureItem);
    }
    return out;
  }
}

class Adventure extends Component {
  constructor(w, h, tw, th, seed) {
    super(true, 'adventure');
    this.id = Math.random();
    this.seed = seed || Date.now();
    this.rand = new Rand(this.seed);
    this.name = "Adventure";
    this.tw = tw || 42;
    this.th = th || 42;
    this.w = w;
    this.h = h;
    this.zoomed = true;
    this.startPosition = {x: 0, y: 0};
    this.planes = [
      this.createPlane('surface'),
      this.createPlane('underground')
    ];
    this.setPlane('surface');
    this.resources = [

    ];

    this.autoEndTurn = true;
    this.showHelpOnStart = true;

    this.tags.resources = new Component(false, 'resources');
    this.tags.time = new AdventureTime();
    this.menu = new AdventureMenu();
    this.menu.on('end turn', () => this.endTurn());
    this.menu.on('open inventory', () => this.openInventory());
    this.menu.on('open equipment', () => this.openEquipment());
    this.menu.on('open team', () => this.openTeamSheet());
    this.menu.on('open quests', () => this.openQuests());
    this.menu.on('open crafting', () => this.openCrafting());
    this.menu.on('open help', () => this.openHelp());
    this.panSpeed = 10;
    this.pans = {x: 0, y: 0};
    this.mouse = {
      up: null,
      down: null,
      move: null
    };
    this.player = null;
    this.pp = {x: 0, y: 0};
  }

  nextPlane() {
    let i = this.planes.findIndex(p => p.name == this.currentPlane.name);
    ++i;
    if(i > this.planes.length -1) i = 0;
    this.setPlane(this.planes[i].name);
    this.render();
  }

  setPlane(name) {
    console.log('set plane', name)
    this.currentPlane = this.planes.find(p => p.name == name);
  }

  getPlane(name) {
    return this.planes.find(p => p.name == name);
  }

  get layers() {
    return this.currentPlane.layers;
  }

  createPlane(name, los) {
    let p = {
      name: name,
      los: los,
      layers: {
        ground: new Layer('ground', true, this.w, this.h, this.tw, this.th),
        obstacles: new Layer('obstacles', true, this.w, this.h, this.tw, this.th),
        decorations: new Layer('decorations', true, this.w, this.h, this.tw, this.th),
        select: new Layer('select', true, this.w, this.h, this.tw, this.th),
        grid: new Layer('grid', true, this.w, this.h, this.tw, this.th),
        preselect: new Layer('preselect', true, this.w, this.h, this.tw, this.th),
        dialog: new Layer('dialog', false, this.w, this.h, this.tw, this.th),
        monsters: new Layer('monsters', true, this.w, this.h, this.tw, this.th),
        transport: new Layer('transport', false, this.w, this.h, this.tw, this.th),
        planeport: new Layer('planeport', false, this.w, this.h, this.tw, this.th),
        dungeons: new Layer('dungeons', false, this.w, this.h, this.tw, this.th),
        fog: new Layer('fog', true, this.w, this.h, this.tw, this.th),
        quests: new Layer('quests', false, this.w, this.h, this.tw, this.th),
        history: new Layer('history', false, this.w, this.h, this.tw, this.th),
        checks: new Layer('checks', false, this.w, this.h, this.tw, this.th),
      }
    };
    p.layers.fog.items.each(i => p.layers.fog.items.set(i.x, i.y, true));
    p.layers.history.items.each(i => p.layers.history.items.set(i.x, i.y, new Record()));
    return p;
  }

  static style(a) {
    return html`<style>
      .big-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 600px;
        height: 600px;
        overflow-y: auto;
        background-image: url(sheet_of_old_paper.png);
        padding: 20px;
        border-radius: 10px;
      }
      .quick-view {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 600px;
        max-height: 600px;
        overflow-y: auto;
        background-image: url(sheet_of_old_paper.png);
        padding: 20px;
        border-radius: 10px;
        pointer-events: none;
      }
      .finish-adventure {
        width: 600px;
        height: 600px;
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 10px;
        position: fixed;
        z-index: 2;
        top: 50%;
        left: 50%;
        transform: translate(-50%,-50%);
      }
      .adventure {
        position: relative;
        width: ${a.tw * a.w}px;
        height: ${a.th * a.h}px;
        border: 1px solid black;
        margin-bottom: 160px;
      }
      .adventure.interactive {
        cursor: url(${interactSprite.canvas.toDataURL('image/png')}), auto;
      }
      .adventure.porting {
        cursor: url(${portingSprite.canvas.toDataURL('image/png')}), auto;
      }
      .adventure.check {
        cursor: url(${checkSprite.canvas.toDataURL('image/png')}), auto;
      }
      .adventure canvas {
        position: absolute;
        top: 0px;
        left: 0px;
      }

      .quest-log {
        width: 600px;
        height: 600px;
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 10px;
        position: fixed;
        z-index: 2;
        top: 50%;
        left: 50%;
        transform: translate(-50%,-50%);
      }

      .tools.selections {
        user-select: all;
      }

      #adventure-menu {
        position: fixed;
        bottom: 0px;
        left: 0px;
        width: 250px;
        height: 250px;
      }

      #adventure-menu.hidden {
        height: 20px;
      }

      #adventure-menu #show-hide {
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        position: absolute;
        bottom: 0px;
      }

      #adventure-menu .menu-item {
        position: absolute;
        border: 4px solid #13667d;
        width: 40px;
        height: 40px;
        padding: 4px;
        border-radius: 50%;
      }

      * {
        box-sizing: border-box;
      }

      #adventure-menu .menu-item canvas {
        width: 32px;
        height: 32px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        position: absolute;
      }

      #adventure-menu .menu-item:hover {
        background-image: url(sheet_of_old_paper.png);
      }

      #adventure-menu .center {
        width: 40%;
        height: 40%;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        position: absolute;
        border: 4px solid #13667d;
      }

      #adventure-menu .texture {
        background-image: url(sheet_of_old_paper.png);
        background-blend-mode: overlay;
      }

      #adventure-menu .center.menu-item {
        width: 40px;
        height: 40px;
      }

      .inventory .inventory-item-info, #prime-vessel {
        position: absolute;
        top: 70px;
        left: -287px;
        width: 268px;
        height: 145px;
        background-image: url(sheet_of_old_paper.png);
        padding: 20px;
      }

      #prime-vessel {
        left: 296px;
        height: 260px;
        top: 10px;
        border-radius: 50%;
      }

      #prime-vessel .menu-item {
        position: absolute;
        border: 2px solid white;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        padding: 6px;
      }

      #prime-vessel .glyphs {
        z-index: 23;
        position: relative;
        text-align: center;
        top: 44%;
      }

      .inventory .inventory-dolly {
        position: absolute;
        top: -180px;
        left: 3px;
        width: 268px;
        height: 145px;
        background-image: url(sheet_of_old_paper.png);
        padding: 20px;
      }

      .inventory .inventory-dolly .dolly-slot {
        width: 42px;
        height: 46px;
        display: inline-block;
        vertical-align: top;
        text-align: center;
        margin-bottom: 10px;
      }

      .inventory .inventory-dolly .dolly-slot .slot-name {
        height: 18px;
      }

      .inventory .inventory-dolly .dolly-slot .slot-item {
        display: inline-block;
        width: 32px;
        height: 32px;
        vertical-align: top;
        box-shadow: inset 0px 0px 10px 1px rgba(121, 93, 39, 0.91);
        outline: 1px solid brown;
      }

      .inventory {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-image: url(sheet_of_old_paper.png);
        padding: 10px;
        border: 4px solid #13667d;
        box-sizing: content-box;
      }

      .inventory .inventory-instructions {
        margin-top: 30px;
        padding: 20px;
        background-image: url(sheet_of_old_paper.png);
      }

      .inventory .item {
        display: inline-block;
        vertical-align: top;
        box-shadow: inset 0px 0px 10px 1px rgba(121, 93, 39, 0.91);
        outline: 1px solid brown;
      }

      .inventory .item:hover {
        background-color: rgba(0,0,0,0.1);
      }

      .inventory .item.selected {
        background-color: rgba(0,255,0,0.3);
        outline: 1px solid white;
        box-shadow: none;
      }

      .inventory .name {
        position: absolute;
        top: -16px;
        left: 0px;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 2px 2px 0px 0px;
      }
      .inventory .actions {
        position: absolute;
        bottom: -16px;
        right: 0px;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 0px 0px 2px 2px;
      }
      .inventory .actions .action {
        display: inline-block;
        user-select: none;
        padding: 2px 4px;
      }
      .inventory .actions .action:hover, .inventory .inventory-dolly .dolly-slot .slot-item:hover {
        background-color: rgba(0,0,0,0.1);
      }

      .quest {
        border: 1px solid black;
        border-radius: 4px;
        padding: 2px;
      }

      .quest-name {
        font-weight: bold;
      }

      .quest-condition, .quest-reward {
        margin-right: 4px;
      }

      .close {
        position: absolute;
        top: 2px;
        right: 2px;
        color: white;
        background-color: black;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        text-align: center;
        line-height: 18px;
      }

      .foot {
        position: fixed;
        bottom: 0px;
        background-color: lightgray;
        z-index: 3;
        width: 100%;
      }

      .tools {
        user-select: none;
        display: inline-block;
        vertical-align: top;
      }

      .resources {
        position: fixed;
        top: 0px;
        left: 0px;
        display: inline-block;
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        z-index: 10;
      }

      .time {
        position: fixed;
        top: 0px;
        right: 60px;
        display: inline-block;
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        z-index: 10;
      }


      .resources .component .resource {
        display: inline-block;
      }

      .resources .component .resource span {
        vertical-align: middle;
      }

      .message-box {
        position: fixed;
        z-index: 100;
        width: 400px;
        max-height: 500px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        background-image: url(sheet_of_old_paper.png);
        border-radius: 10px;
        box-shadow: 1px 5px 7px 0px rgba(0,0,0,0.5);
        font-size: 20px;
        border: 2px solid rgba(72, 61, 10, 0.6);
        padding: 20px;
        white-space: pre-line;
        text-align: right;
      }
      .message-box .title {
        text-align: left;
      }
      .message-box .content {
        text-align: center;
      }
      .message-box p {
        margin-top: 0px;
        text-align: justify;
        max-height: 320px;
        overflow-y: auto;
      }

      .message-box button {
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        background-color: transparent;
        border: none;
        outline: none;
        padding: 10px;
        cursor: inherit;
        border-radius: 4px;
      }

      .message-box button:hover {
        background-color: rgba(0,0,0,0.1);
      }

      .team-sheet {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%,-50%);
        width: 800px;
        height: 600px;
      }
    </style>`;
  }

  createRNG(seed) {
    this.seed = seed || Date.now();
    var generator = new Rand(this.seed).generator;
    this._random = (t) => generator.random();
    this._roll = (a, b) => Math.round(a + _random() * (b-a));
    return generator;
  }

  stopKeyboard() {
    this.keyboard.stop();
  }

  startKeyboard() {
    this.keyboard = this.keyboard || new Keyboard(this.id, {
      e: this.endTurn.bind(this),
      c: this.openTeamSheet.bind(this),
      i: this.openInventory.bind(this),
      q: this.openQuests.bind(this)
    });
    this.keyboard.start();
  }

  static create(t, saveFile, generate) {
    let a = new this(t.w, t.h, t.tw, t.th, saveFile && saveFile.data.seed);
    a.id = t.id;
    a.name = t.name;
    a.startPosition = t.startPosition;
    a.planes = [];
    t.planes.forEach(p => {
      let plane = a.createPlane(p.name);
      a.planes.push(plane);
      let layers = p.layers;
      let ter = layers.ground.lookup.map(id => {
        let tpl = terrains.find(t => t.id == id);
        let item = new Terrain(tpl);
        return item;
      })
      layers.ground.items.forEach((n, i) => {
        let xy = plane.layers.ground.items.xy(i);
        if(n === null) return;
        let item = ter[n];
        plane.layers.ground.items.set(xy.x, xy.y, item);
      });
      ter = layers.obstacles.lookup.map(id => {
        let tpl, item;
        if(tpl = terrains.find(t => t.id == id)) {
          item = new Terrain(tpl);
        } else
        if(tpl = abilities.find(t => t.id == id)) {
          item = new Scroll(new Ability(tpl));
        } else
        if(tpl = equipments.find(t => t.id == id)) {
          item = new Equipment(tpl);
        } else {
          console.log('no constructor', id)
        }
        return item;
      })
      layers.obstacles.items.forEach((n, i) => {
        let xy = plane.layers.obstacles.items.xy(i);
        if(n === null) return;
        let item = ter[n];
        plane.layers.obstacles.items.set(xy.x, xy.y, item);
      });
      ter = layers.decorations.lookup.map(id => {
        let tpl = terrains.find(t => t.id == id);
        let item = new Terrain(tpl);
        return item;
      })
      layers.decorations.items.forEach((n, i) => {
        let xy = plane.layers.decorations.items.xy(i);
        if(n === null) return;
        let item = ter[n];
        plane.layers.decorations.items.set(xy.x, xy.y, item);
      });
      if(layers.monsters) {
        ter = layers.monsters.lookup.map(id => {
          let tpl = teams.find(t => t.id == id);
          let item = Team.create(tpl);
          item.aid = guid();
          return item;
        })
        layers.monsters.items.forEach((n, i) => {
          let xy = plane.layers.monsters.items.xy(i);
          if(n === null) return;
          let item = ter[n];
          plane.layers.monsters.items.set(xy.x, xy.y, item);
        });
      }
      if(layers.dialog) {
        layers.dialog.forEach(item => {
          plane.layers.dialog.items.set(item.x, item.y, new Dialog(item.item.text));
        });
      }

      if(layers.transport) {
        layers.transport.forEach(item => {
          plane.layers.transport.items.set(item.x, item.y, item.item);
        });
      }
      if(layers.planeport) {
        layers.planeport.forEach(item => {
          plane.layers.planeport.items.set(item.x, item.y, item.item);
        });
      }
      if(layers.quests) {
        layers.quests.forEach(item => {
          let q = Quest.create(item.item);
          plane.layers.quests.items.set(item.x, item.y, q);
        });
      }
      if(layers.checks) {
        layers.checks.forEach(item => {
          let q = Check.create(item.item);
          plane.layers.checks.items.set(item.x, item.y, q);
        });
      }
      if(layers.dungeons) {
        layers.dungeons.forEach(item => {
          console.log('maze', item)
          let m = Maze.Editor.create(item.item);
          plane.layers.dungeons.items.set(item.x, item.y, m);
        });
      }
    });
    a.setPlane(a.planes[0].name);
    generate && a.generateRandomDungeons();
    if(saveFile) {
      console.log('load saveFIle')
      a.load(saveFile);
    }
    return a;
  }

  endTurn() {
    this.tags.time.nextDay();
    this.planes.forEach(p => {
      p.layers.obstacles.items.each(item => {
        if(!item.item) return;
        let record = p.layers.history.items.get(item.x, item.y);
        record.resetConsumption(item.item);
      })

    })
    this.save();
    this.savePlayer();
  }

  save() {
    let saveFile = {
      seed: this.seed,
      currentPlane: this.currentPlane.name,
      days: this.tags.time.totalDays,
      movesLeft: this.player.movesLeft,
      planes: this.planes.map(p => p.layers.history.items.items.map(r => r.compress()))
    };
    storage.save('adventure', this.id, saveFile);
  }

  generateRandomDungeons() {
    this.planes.forEach(pl => {
      pl.layers.dungeons.items.filled(item => {
        let m = new Maze(item.item.name, item.item.maxTier, item.item.difficulty, this.rand);
        m.generate();
        m.addMonsters();
        m.connectRooms();
        m.connectRandomRooms();
        // m.centerOut();
        // m.renderCenter();
        // m.render();
        let upgrades = {
          max: Math.floor(this.rand.random() * 3),
          set: 0,
          get() {
            if(this.set >= this.max) return null;
            if(m.rand.random() < 0.7) return null
            this.set += 1;
            let t = [];
            terrains.forEach(tpl => {
              if(!tpl.adventure || tpl.adventure.action !== 'give ability') return;
              t.push(new Terrain(tpl));
            })
            return t[Math.floor(m.rand.random() * t.length)];
          }
        };
        let randomize = (a, b) => this.rand.random() > 0.5 ? -1 : 1;
        let decorations = terrains.filter(t => t.stats.decoration).map(t => new Terrain(t));
        let groundDecorations = decorations.filter(d => d.template.stats.walkable);
        let plateId = '1e65a8e0-3257-ba30-9c1e-f16036de877b';
        let torchId = 'b9c05718-dd74-38d6-e0b9-b41a19f8cb7a';
        let torchUnlitId = 'e62228e0-e012-1dcf-28a0-cbdf3f04c466';
        let stairsId = '26d4a36d-da69-661a-ed67-622908d17f18';
        let obstacleId = 'f7118631-ef6e-68b1-ef36-60dd3b7f2ca4';
        let groundId = '4d7c5f3e-7d2c-8994-48d4-9469f03e44b4';
        let doorId = '183e804b-0eb5-236c-9b98-b3920f418985';
        let platetpl = terrains.find(t => t.id == plateId);
        let torchtpl = terrains.find(t => t.id == torchId);
        let torchUnlittpl = terrains.find(t => t.id == torchUnlitId);
        let stairstpl = terrains.find(t => t.id == stairsId);
        let groundtpl = terrains.find(t => t.id == groundId);
        let obstacletpl = terrains.find(t => t.id == obstacleId);
        let doortpl = terrains.find(t => t.id == doorId);
        let plate = new Terrain(platetpl);
        let torch = new Terrain(torchtpl);
        let torchUnlit = new Terrain(torchUnlittpl);
        let ground = new Terrain(groundtpl);
        let obstacle = new Terrain(obstacletpl);
        let door = new Terrain(doortpl);
        let stairs = new Terrain(stairstpl);
        let plane = this.createPlane(m.name, true);
        plane.layers.obstacles.items.fillAll(obstacle);
        let sx = m.sx;//m.rooms[0].cells[0].x;
        let sy = m.sy;//m.rooms[0].cells[0].y;
        // add a planeport point to both planes
        let a = {plane: plane.name, x: sx, y: sy};
        let b = {plane: pl.name, x: item.x, y: item.y};
        pl.layers.planeport.items.set(item.x, item.y, a);
        plane.layers.planeport.items.set(sx, sy, b);
        plane.layers.obstacles.items.set(sx, sy, stairs);
        this.planes.push(plane);
        m.rooms.forEach((room, roomIndex) => {
          // place ground, obstacles and monsters
          room.encounters.forEach(e => {
            plane.layers.monsters.items.set(e.pos.x, e.pos.y, e.team);
          })
          room.cells.forEach(cell => {
            plane.layers.ground.items.set(cell.x, cell.y, ground);
            if(cell.x == sx && cell.y == sy) return;
            plane.layers.obstacles.items.remove(cell.x, cell.y);
          });
          room.connectsTo.forEach(c => {
            c.corridor.forEach(a => {
              plane.layers.obstacles.items.remove(a.x, a.y);
              plane.layers.ground.items.set(a.x, a.y, ground);
            })
          })
          // how to get access to other rooms
          room.exits.forEach(({exit, corridor}) => {
            if(plane.layers.ground.items.get(exit.x, exit.y)) return;
            plane.layers.ground.items.set(exit.x, exit.y, ground);
            let types = ['mechanics', 'exploration', 'pressure plate'];
            let type = types[Math.floor(this.rand.random() * types.length)];
            let v = 1;//this.rand.next().between(1, 10).floor().n;
            if(type == 'exploration') {
              plane.layers.obstacles.items.set(exit.x, exit.y, obstacle);
              let check = new Check('skill', 'exploration', v, 'remove obstacle', true);
              check.addTile(plane.name, exit.x, exit.y);
              plane.layers.checks.items.set(exit.x, exit.y, check);
            } else
            if(type == 'mechanics') {
              plane.layers.obstacles.items.set(exit.x, exit.y, door);
              let check = new Check('skill', 'mechanics', v, 'remove obstacle', false);
              check.addTile(plane.name, exit.x, exit.y);
              plane.layers.checks.items.set(exit.x, exit.y, check);
            } else
            if(type == 'pressure plate') {
              plane.layers.obstacles.items.set(exit.x, exit.y, door);
              let edges = room.edges();
              edges.sort(randomize);
              let c = edges.find(c => {
                let isExit = room.exits.find(e => e.exit.x == c.x && e.exit.y == c.y);
                let isDecoration = plane.layers.decorations.items.get(c.x, c.y);
                if(isExit || isDecoration) return;
                return true;
              })
              let isExit = room.exits.find(e => e.x == c.x && e.y == c.y);
              let isDecoration = plane.layers.decorations.items.get(c.x, c.y);
              if(isExit || isDecoration) return;
              plane.layers.decorations.items.set(c.x, c.y, torch);
              let check = new Check('skill', 'mechanics', 1, 'remove obstacle', false, torch.description);
              check.decorationChange = torchUnlitId;
              corridor.exits.forEach(e => {
                check.addTile(plane.name, e.x, e.y);
              })

              plane.layers.checks.items.set(c.x, c.y, check);
            }
          })
          // upgrades
          let upgrade = upgrades.get();
          if(upgrade) {
            console.log('get upgrade', roomIndex)
            room.cells.sort(randomize).find(c => {
              if(plane.layers.obstacles.items.get(c.x, c.y)) return;
              // if an exit is adjacent don't pick it.
              let isExit = room.exits.find(e => e.x == c.x && e.y == c.y);
              if(isExit) return;
              plane.layers.obstacles.items.set(c.x, c.y, upgrade);
              return true;
            })
          }

          // decorations
          let d = groundDecorations[Math.floor(this.rand.random() * groundDecorations.length)];
          room.cells.sort(randomize).forEach(c => {
            if(this.rand.random() > 0.2) return;
            plane.layers.decorations.items.set(c.x, c.y, d);
          })

          // gold
          let treasure = new Terrain(terrains.find(t => t.id == '5103eb6a-c784-d780-cd71-90f58a81ae53'));
          room.cells.sort(randomize).forEach(c => {
            if(plane.layers.obstacles.items.get(c.x, c.y)) return;
            if(this.rand.random() > 0.05) return;
            plane.layers.obstacles.items.set(c.x, c.y, treasure);
          })

          // loot
          let loot = new Terrain(terrains.find(t => t.id == '48fd8bb6-ba74-e1cb-d2c7-a8ddb62be2dc'));
          room.cells.sort(randomize).forEach(c => {
            if(plane.layers.obstacles.items.get(c.x, c.y)) return;
            if(this.rand.random() > 0.025) return;
            plane.layers.obstacles.items.set(c.x, c.y, loot);
          })
        });

      })
    })
  }

  load(file) {
    console.log('file', file)
    this.seed = file.data.seed || Date.now();
    this.tags.time.setDays(file.data.days);
    this.setPlane(file.data.currentPlane);
    let planes = file.data.planes;
    planes.forEach((p, i) => {
      let plane = this.planes[i];
      p.forEach((r, i) => {
        let {x, y} = plane.layers.history.items.xy(i);
        let record = plane.layers.history.items.get(x, y);
        record.import(r);
      })
    })
    this.applyHistory();
  }

  applyHistory() {
    this.planes.forEach(p => {
      let {obstacles, monsters, fog, checks} = p.layers;
      p.layers.history.items.each(item => {
        if(item.item.obstacleRemoved) {
          obstacles.items.remove(item.x, item.y);
        }
        if(item.item.monsterKilled) {
          monsters.items.remove(item.x, item.y);
        }
        if(!item.item.fog) {
          fog.items.set(item.x, item.y, false);
          fog.canvas.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
        }
        let check = checks.items.get(item.x, item.y);
        if(check && item.item.checkResult) {
          if(check.decorationChange) {
            let t = terrains.find(t => t.id == check.decorationChange);
            p.layers.decorations.items.set(item.x, item.y, new Terrain(t));
            this.draw(p.layers.decorations, item.x, item.y);
          }
        }
      })

    })
  }

  openInventory() {
    this.append(this.player.inventory.render());
  }

  openEquipment() {
    this.append(this.player.equipment.render());
  }

  openTeamSheet() {
    this.append(this.player.team.cs.render());
  }

  openQuests() {
    this.append(this.player.quests.render());
  }

  openCrafting() {
    this.append(this.player.crafting.render());
  }

  openHelp() {
    storage.remove('adventureOptions', '');
    let file = storage.load('config', 'adventure') || {};
    let help = new AdventureHelp(file.data);
    help.on('config changed', o => {
      if(o.key == 'soundVolume') {
        sp.updateVolume(o.val);
      }
      if(o.key == 'autoEnd') {
        this.autoEndTurn = o.val;
      }
      if(o.key == 'showHelpOnStart') {
        this.showHelpOnStart = o.val;
      }
      storage.save('config', 'adventure', help.options.config);
    })
    this.append(help.render());
  }

  addObstacle(x, y, item) {
    let {obstacles} = this.layers;
    let empty = !obstacles.items.get(x, y) ? {x,y} : obstacles.items.closestEmpty(x, y);
    obstacles.items.set(empty.x, empty.y, item);
    this.draw(obstacles);

  }

  addPlayer(p) {
    this.player = p;
    this.movePlayer(this.startPosition.x, this.startPosition.y);
    this.resources.push(new Resource('gold', this.player.resources.gold, goldIcon));
    this.resources.push(new Resource('azurite', this.player.resources.azurite, azuriteIcon));
    this.resources.push(new Resource('zircon', this.player.resources.zircon, zirconIcon));
    this.resources.push(new Resource('iron', this.player.resources.iron, ironIcon));
    this.resources.push(new Resource('topaz', this.player.resources.topaz, topazIcon));
    this.resources.push(new Resource('adamite', this.player.resources.adamite, adamiteIcon));
    this.resources.push(new Resource('brucite', this.player.resources.brucite, bruciteIcon));
    this.resources.push(new Resource('mud', this.player.resources.mud, mudIcon));
    this.tags.time.player = this.player;
    this.planes.forEach(plane => {
      plane.layers.quests.items.filled(item => {
        let q = item.item;
        if(!q.bio.global) return;
        p.quests.add(q);
      })

    })

    this.draw(this.layers.monsters);
  }

  savePlayer() {
    storage.save('player', this.id, {
      xp: this.player.stats.xp,
      gold: this.player.resources.gold,
      position: this.pp,
      vision: this.player.stats.vision,
      movement: this.player.stats.movement,
      movesMade: this.player.pools.movement,
      quests: this.player.quests.quests.map(q => q.bio.name),
      inventory: this.player.inventory.export(),
      crafting: this.player.crafting.export(),
      team: this.player.team
    });
  }

  loadPlayer() {
    let save = storage.load('player', this.id);
    if(!save) return;
    let player = save.data;
    this.player.addXP(player.xp);
    this.addGold(player.resources.gold);
    this.player.position = this.pp;
    this.player.stats.vision = player.vision || 10;
    this.player.stats.movement = player.movement || 20;
    this.player.pools.movement = player.movesMade || 20;

    player.quests.forEach(questName => {
      let q;
      this.planes.find(p => {
        return q = p.layers.quests.items.find(item => {
          return item.item.bio.name == questName;
        });
      });
      if(!q) return;
      this.player.quests.add(q.item);
    });
    this.player.inventory.import(player.inventory, {Terrain, Scroll, Equipment});
    this.player.crafting.import(player.crafting, {Terrain, Scroll});
    if(player.position) {
      this.movePlayer(player.position.x, player.position.y);
      this.player.pools.movement = player.movesMade || 20;
    }
  }

  drawGuides() {
    let c = this.layers.grid.canvas;
    this.layers.ground.items.eachRow((x, y) => {
      if(!y) return;
      c.drawLine(0, y * this.th, this.w * this.tw, y * this.th, '#ccc');
    })
    this.layers.ground.items.eachCol((x, y) => {
      if(!x) return;
      c.drawLine(x * this.tw, 0, x * this.tw, this.h * this.th, '#ccc');
    })
  }

  tpos(e) {
    let x = Math.floor(e.offsetX / this.tw);
    let y = Math.floor(e.offsetY / this.th);
    return {x, y};
  }

  drawOne(layer, x, y) {
    let item = layer.items.get(x, y);
    layer.canvas.clearRect(x, y, this.tw, this.th);
    if(!item) return;
    if(item instanceof Sprite) {
      layer.canvas.drawSprite(item, x * this.tw, y * this.th, this.tw, this.th);
    }
    if(item instanceof Terrain) {
      layer.canvas.drawSprite(item.sprite, x * this.tw, y * this.th, this.tw, this.th);
      if(item.stats.animation) {
        this.animateTerrain({item,x,y}, layer);
      }
    }
    if(item instanceof Team) {
      layer.canvas.drawSprite(item.highestTier.sprite, x * this.tw, y * this.th, this.tw, this.th);
    }
  }

  drawTile(layer, item) {
    layer.canvas.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th)
    if(!item.item) return;

    if(item.item instanceof Sprite) {
      layer.canvas.drawSprite(item.item, item.x * this.tw, item.y * this.th, this.tw, this.th);
    }
    if(item.item instanceof Terrain) {
      layer.canvas.drawSprite(item.item.sprite, item.x * this.tw, item.y * this.th, this.tw, this.th);
      if(item.item.stats.animation) {
        this.animateTerrain(item, layer);
      }
    }
    if(item.item instanceof Equipment) {
      layer.canvas.drawSprite(item.item.sprite, item.x * this.tw, item.y * this.th, this.tw, this.th);
    }
    if(item.item instanceof Team) {
      layer.canvas.drawSprite(item.item.highestTier.sprite, item.x * this.tw, item.y * this.th, this.tw, this.th);
    }
    if(layer.name == 'fog') {
      layer.canvas.drawRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
    }
  }

  draw(layer, x, y) {
    if(!layer.canvas) return;
    if(!layer.items) return;
    this.clearAnimations(layer, x, y);
    if(x && y) {
      this.drawTile(layer, {x, y});
    } else {
      layer.items.each(item => {
        this.drawTile(layer, item);
      });
    }
  }

  clearAnimations(layer, x, y) {
    if(!layer.animations) return;
    if(x && y) {
      let int = layer.animations.get(x, y);
      clearInterval(int);
      layer.animations.remove(x, y);
    } else {
      layer.animations.each(a => {
        clearInterval(a.item);
        layer.animations.remove(a.x, a.y);
      });
    }

  }

  animateTerrain(item, layer) {
    let int = setInterval(() => {
      layer.canvas.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      layer.canvas.drawSprite(item.item.sprite, item.x * this.tw, item.y * this.th, this.tw, this.th);
    }, item.item.fps);
    layer.animations.set(item.x, item.y, int);
  }

  previewPath(e) {
    let p = this.tpos(e);
  }

  isInteractable(x, y) {
    let {obstacles, monsters, history, quests} = this.layers;
    let obstacle = obstacles.items.get(x, y);
    let record = history.items.get(x, y);
    let monster = monsters.items.get(x, y);
    let quest = quests.items.get(x, y);
    return (obstacle && obstacle.adventure.event) || monster || quest;
  }

  mouseMove(e) {
    this.mouse.move = e;
    if(this.mouse.down && this.mouse.down.button == 2) {
      let a = this.shadow.querySelector('.adventure');
      a.style.left = this.pans.x + e.clientX - this.mouse.down.clientX + 'px';
      a.style.top = this.pans.y + e.clientY - this.mouse.down.clientY + 'px';
    }
    let p = this.tpos(e);
    let check = this.layers.checks.items.get(p.x, p.y);
    let record = this.layers.history.items.get(p.x, p.y);
    if(check && !record.checkPassed && !check.passive) {
      this.shadow.querySelector('.adventure').classList.add('check');
    } else
    if(this.layers.planeport.items.get(p.x, p.y) || this.layers.transport.items.get(p.x, p.y)) {
      this.shadow.querySelector('.adventure').classList.add('porting');
    } else
    if(this.isInteractable(p.x, p.y)) {
      this.shadow.querySelector('.adventure').classList.add('interactive');
    } else {
      this.shadow.querySelector('.adventure').classList.remove('interactive', 'porting', 'check');
    }
    !this.moving && this.highlightMovementTile();
  }

  mouseDown(e) {
    this.mouse.down = e;
    if(this.mouse.up && this.mouse.up.button == 2) {
      let mp = this.tpos(e);
      let team = this.layers.monsters.items.get(mp.x, mp.y);
      if(team) {
        this.append(team.renderUnits());
      }
    }
  }

  mouseUp(e) {
    e.preventDefault();
    this.mouse.up = e;
    if(this.mouse.up && this.mouse.up.button == 2) {
      this.pans.x += e.clientX - this.mouse.down.clientX;
      this.pans.y += e.clientY - this.mouse.down.clientY;
      this.panTo(this.pans.x, this.pans.y);
      Array.from(this.shadow.querySelectorAll('.quick-view'))
      .forEach(tag => {
        tag.parentNode.removeChild(tag);
      });

    }
    this.mouse.down = null;
    let mp = this.tpos(e);
    if(e.which == 3) {
      return this.showInfo(mp);
    }
    let {ground, obstacles, transport, planeport, monsters, dialog, quests, dungeons, history, checks} = this.layers;
    let item = obstacles.items.get(mp.x, mp.y);
    let record = history.items.get(mp.x, mp.y);
    // Movement
    if(!this.moving && ground.items.get(mp.x, mp.y) && obstacles.items.canWalkTo(this.pp.x, this.pp.y, mp.x, mp.y)) {
      let path = obstacles.items.path(this.pp.x, this.pp.y, mp.x, mp.y);
      path.shift();
      return this.walk(this.player.team, path)
      .then(() => {
      })
      .catch(e => {
        console.log('walk error', e);
      });
    }
    // Quests
    let quest = quests.items.get(mp.x, mp.y);
    if(quest && quests.items.distance(this.pp.x, this.pp.y, mp.x, mp.y) <= 1) {
      return this.showQuest(quest, record);
    }

    // Checks
    let check = checks.items.get(mp.x, mp.y);
    if(check && !record.checkPassed && checks.items.distance(this.pp.x, this.pp.y, mp.x, mp.y) <= 1) {
      return this.showCheck(check, record);
    }

    // Transportation
    let trans = transport.items.get(mp.x, mp.y);
    if(trans && transport.items.distance(this.pp.x, this.pp.y, mp.x, mp.y) <= 1) {
      let empty = obstacles.items.closestEmpty(trans.x, trans.y);
      this.movePlayer(empty.x, empty.y);
      this.draw(monsters);
      this.centerOnPlayer();
    }

    // Planeportation
    let planep = planeport.items.get(mp.x, mp.y);
    if(planep && planeport.items.distance(this.pp.x, this.pp.y, mp.x, mp.y) <= 1) {
      let toPlane = this.planes.find(p => p.name == planep.plane);
      this.setPlane(toPlane.name);
      this.render();
      console.log(planep, toPlane.layers.obstacles.items.inx(planep.x, planep.y))
      let empty = toPlane.layers.obstacles.items.closestEmpty(planep.x, planep.y);
      monsters.items.remove(this.pp.x, this.pp.y);
      this.movePlayer(empty.x, empty.y);
      this.draw(monsters);
      this.centerOnPlayer();
      return;
    }

    // Interactables
    if(!item) return;
    if(item.adventure.event != 'click') return;
    if(obstacles.items.distance(this.pp.x, this.pp.y, mp.x, mp.y) > 1) return;
    let message;
    if(item.adventure.description) {
      message = this.showMessage(item, record);
    }
    if(record.isConsumed(item)) return;

    if(item.adventure.action == 'give gold') {
      this.rand.between(item.adventure.actionAmount - item.adventure.actionAmountVariation, item.adventure.actionAmount + item.adventure.actionAmountVariation).round();
      this.addGold(this.rand.n);
      sp.play('gold');
      obstacles.items.remove(mp.x, mp.y);
      record.removeObstacle();
    }
    if(item.adventure.action == 'give azurite') {
      this.rand.between(item.adventure.actionAmount - item.adventure.actionAmountVariation, item.adventure.actionAmount + item.adventure.actionAmountVariation).round();
      console.log('give azurite', this.rand.n)
      this.addResource(this.rand.n, 'azurite');
      sp.play('gold');
      obstacles.items.remove(mp.x, mp.y);
      record.removeObstacle();

    }
    if(item.adventure.action == 'give item') {
      let items = record.takeAdventureItems(item);
      items.forEach(i => {
        if(item.stats.ingredient) {
          this.player.crafting.add(i)
        } else {
          this.player.inventory.add(i)
        }
      });

      if(item.adventure.consumable && record.isConsumed(item)) {
        // obstacles.items.remove(mp.x, mp.y);
      }


    }

    if(item.adventure.action == 'give movement' && !record.isConsumed(item)) {
      this.player.pools.movement -= item.adventure.actionAmount;
    }
    if(item.adventure.action == 'open tavern') {
      sp.play('open_book');
      this.trigger('open tavern', item);
    }
    if(item.adventure.action == 'open armory') {
      sp.play('open_book');
      this.trigger('open armory', item);
    }
    if(item.adventure.action == 'open ability trainer') {
      sp.play('open_book');
      this.trigger('open ability trainer', item);
    }
    if(item.adventure.action == 'give ability') {
      let _abilities = abilities.filter(a => {
        let f = true;
        if(item.adventure.tags.type) {
          f = f && item.adventure.tags.type == a.bio.type;
        }
        if(item.adventure.tags.tier) {
          let t = item.adventure.tags.tier.split('-');
          f = f && a.bio.tier >= t[0] && a.bio.tier <= t[1];
        }
        if(item.adventure.tags.source) {
          f = f && item.adventure.tags.source == a.stats.source;
        }
        if(item.adventure.tags.element) {
          f = f && item.adventure.tags.element == a.stats.element;
        }
        return f;
      });
      let rand = __roll(0, _abilities.length-1);
      let ability = _abilities[rand];
      this.player.team.leaders[0].addAbility(ability.id);
      message.on('close', () => {
        let c = this.popupComponent('Learned new Ability', new AbilityCard(new Ability(ability)));
        c.addStyle(AbilityCard.style);
      })
    }
    if(item.adventure.action == 'give equipment') {
      let equipment = equipments.filter(a => {
        let f = true;
        if(item.adventure.tags.slot) {
          f = f && item.adventure.tags.slot == a.bio.slot;
        }
        if(item.adventure.tags.cost) {
          f = f && parseInt(item.adventure.tags.cost) >= parseInt(a.bio.cost);
        }
        return f;
      });
      let rand = __roll(0, equipment.length-1);
      let e = new Equipment(equipment[rand]);
      this.player.inventory.add(e);
      message.on('close', () => {
        let c = this.popupComponent(`Looking through the cache you find ${e.bio.name}. You tuck it away in your inventory.`);
        c.appendIn('.content', e.canvas.clone(48, 48));
      })
    }


    record.consume(item);
    if(!record.shouldDraw(item)) {
      obstacles.items.remove(mp.x, mp.y);
      record.removeObstacle();
    }
    this.mouse.down = null;
    this.updateResources();
    this.draw(obstacles, mp.x, mp.y);
  }

  showInfo(mp) {
    let {obstacles, transport, monsters, dialog} = this.layers;
    let item = obstacles.items.get(mp.x, mp.y);
    if(!item) return;
    if(item.adventure.description) {
      this.showDescription(item);
    }
  }

  showBattle(item, tile) {
    let m = new AdventureMessage({
      title: 'Battle',
      text: 'An adversary stands in your way. What do you want to do?',
      buttons: [
        {
          text: 'Fight',
          fn: () => {
            m.unmount();
            this.trigger('battle', item, tile);
          }
        },
        {
          text: 'Quick fight',
          fn: () => {
            m.unmount();
            this.trigger('battle', item, tile, true);
          }
        },
        {
          text: 'Close',
          fn: () => m.unmount()
        }
      ]
    });
    this.append(m.render());
  }

  showDescription(item) {
    let dtag = html`<div class='message-box'>
      <p>${item.adventure.description}</p>
      <button>Close</button>
    </div>`;
    dtag.querySelector('button').addEventListener('click', () => {
      dtag.parentNode.removeChild(dtag);
    });
    dtag.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    })
    this.append(dtag);
    sp.play('open_book');
  }

  popupComponent(t, comp) {
    let c = new Component(false, 'message-box');
    let dtag = html`<div>
      <div class='title'>${t}</div>
      <p class='content'></p>
      <button>Close</button>
    </div>`;
    comp && dtag.querySelector('p').appendChild(comp.render());
    dtag.querySelector('button').addEventListener('click', () => {
      c.trigger('close');
      c.unmount();
    })
    c.append(dtag);
    this.append(c.tags.outer);
    sp.play('open_book');
    return c;
  }

  showMessage(item, record) {
    let t, n;
    let c = new Component(false, 'message-box');
    if(record.isConsumed(item)) {
      t = `${item.bio.name} can't offer anything else at this point.`;
      n = '';
    } else {
      t = item.adventure.description;
      n = `+${item.adventure.actionAmount} ${item.adventureItem.bio.name}`;
    }
    let dtag = html`<div>
      <p>${t}</p>
      <span>${n}</span>
      <button>Close</button>
    </div>`;
    dtag.querySelector('button').addEventListener('click', () => {
      c.trigger('close');
      c.unmount();
    })
    c.append(dtag);
    this.append(c.tags.outer);
    sp.play('open_book');
    return c;
  }

  showQuest(quest, record) {
    if(record.questFinished) {
      this.showDescription({adventure: {description: "This quest is finished."}});
    } else
    if(this.player.quests.hasQuest(quest)) {
      let met = quest.conditionMet(this);
      let dtag = html`<div class='message-box'>
        <p>
          ${quest.bio.description}
        </p>
        <button class='accept-message'>${met ? 'Complete Quest' : 'Stop Quest'}</button>
        <button class='close-message'>Close</button>
      </div>`;
      dtag.querySelector('.close-message').addEventListener('click', () => {
        dtag.parentNode.removeChild(dtag);
      });
      dtag.querySelector('.accept-message').addEventListener('click', () => {
        if(met) {
          record.completeQuest(quest, this);
          this.trigger('complete quest', quest);
          this.updateResources();
        }
        this.player.quests.remove(quest);
        dtag.parentNode.removeChild(dtag);
      });
      dtag.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
      })
      this.append(dtag);
      sp.play('open_book');
    } else {
      let dtag = html`<div class='message-box'>
      <p>
        ${quest.bio.description}
      </p>
      <button class='accept-message'>Accept</button>
      <button class='close-message'>Close</button>
      </div>`;
      dtag.querySelector('.close-message').addEventListener('click', () => {
        dtag.parentNode.removeChild(dtag);
      });
      dtag.querySelector('.accept-message').addEventListener('click', () => {
        dtag.parentNode.removeChild(dtag);
        this.player.quests.add(quest);
      });
      dtag.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
      })
      this.append(dtag);
      sp.play('open_book');

    }
  }

  showCheck(check, record) {
    if(record.checkResult) {
      check.roll = record.checkResult;
    }
    let mp = this.tpos(this.mouse.up);
    let c = check.renderAdventureDialog(this);
    if(!record.checkResult) {
      let onRoll = (v) => {
        if(check.passed) {
          this.checkReward(check, mp.x, mp.y);
        }
        record.rollCheck(v);
        c.off('roll', onRoll);
        c.unmount();
        this.showCheck(check, record);
      };
      c.on('roll', onRoll);
    }
    this.append(c);
    sp.play('open_book');
  }

  addGold(n) {
    this.player.addResource(n, 'gold');
    let r = this.resources.find(r => r.name == 'gold');
    if(r) r.amount = this.player.resources.gold;
  }

  addResource(n, r) {
    this.player.addResource(n, r);
    let a = this.resources.find(b => b.name == r);
    if(a) a.amount = this.player.resources[r];
  }

  updateResources() {
    this.tags.resources.clear();
    this.resources.forEach(r => this.tags.resources.append(r.render()));
    this.tags.time.render();
  }

  mouseLeave(e) {
    this.mouse.leave = e;
    this.mouse.enter = null;
  }

  mouseEnter(e) {
    this.mouse.leave = null;
    this.mouse.enter = e;
  }

  highlightMovementTile(x, y, i) {
    let mp = this.tpos(this.mouse.move);
    let {ground, monsters, obstacles, select} = this.layers;
    if(!ground.items.get(mp.x, mp.y)) return;
    select.canvas.clear();
    let path = obstacles.items.path(this.pp.x, this.pp.y, mp.x, mp.y);
    path.shift();
    let c = select.canvas;
    path.forEach((p, i) => {
      // if(!this.player.movesLeft || i > this.player.movesLeft - 1) return;
      c.drawSprite(tileTargetSprite, p[0] * this.tw, p[1] * this.th, this.tw, this.th);
    });
  }

  killTeam(tile) {
    let {monsters, quests, history} = this.layers;
    let item = monsters.items.remove(tile[0], tile[1]);
    this.draw(monsters);
    let quest = quests.items.get(tile[0], tile[1]);
    let record = history.items.get(tile[0], tile[1]);
    record.killMonster();
    if(!quest) return;
    let met = quest.conditionMet(this);
    if(met) {
      record.completeQuest(quest, this);
      this.updateResources();
      this.trigger('complete quest', quest);
    }
  }

  walk(a, path) {
    let monsters = this.layers.monsters;
    this.moving = true;
    var int;
    var done = (resolve) => {
      this.moving = false;
      clearInterval(int);
      resolve();
    };
    return new Promise((resolve, reject) => {
      int = setInterval(() => {
        let p = path.shift();
        if(!p) {
          return done(resolve);
        }
        let item = monsters.items.get(p[0], p[1]);
        if(item && item != a) {
          this.showBattle(item, p);
          return done(resolve);
        }
        this.movePlayer(p[0], p[1]);
        sp.play('move');
        // this.draw(monsters);
        if(!path.length) {
          done(resolve);
        }
      }, 100);

    })
  }

  inLOS(x1, y1, x2, y2) {
    let cells = this.currentPlane.layers.obstacles.items.inLOS(x1, y1, x2, y2);
    let occupied = cells.find(c => {
      return c.item && c.item.stats.cover;
    });
    return !occupied;
  }

  revealFog(x = this.pp.x, y = this.pp.y, r = this.player.vision) {
    let {fog, obstacles} = this.layers;
    let reveal = fog.items.inRadius(x, y, r);
    reveal.forEach(item => {
      if(this.currentPlane.los && !this.inLOS(x, y, item.x, item.y)) return;
      fog.items.set(item.x, item.y, false);
      fog.canvas.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      let record = this.layers.history.items.get(item.x, item.y);
      record.removeFog();
    });
  }

  movePlayer(x, y) {
    if(this.player.movesLeft < 1) return;
    let {monsters, fog} = this.layers;
    monsters.canvas.clearRect(this.pp.x * this.tw, this.pp.y * this.th, this.tw, this.th);
    monsters.items.remove(this.pp.x, this.pp.y);
    this.pp = {x, y};
    monsters.items.set(x, y, this.player.team);
    monsters.canvas.drawSprite(this.player.team.highestTier.sprite, this.pp.x * this.tw, this.pp.y * this.th, this.tw, this.th);
    this.passivePlayerCheck(x, y);
    this.revealFog(x, y);
    this.player.pools.movement += 1;
    if(this.tags.time.player) {
      if(this.autoEndTurn && !this.player.movesLeft) {
        this.endTurn();
      }
      this.tags.time.render();
    }
  }

  checkReward(check, x, y) {
    let mp = this.tpos(this.mouse.up);
    let plane = this.currentPlane;
    let record = plane.layers.history.items.get(x, y);
    if(check.passed) {
      if(check.reward = 'remove obstacle') {
        check.tiles.forEach(({plane, x, y}) => {
          let p = this.getPlane(plane);
          p.layers.obstacles.items.remove(x, y);
          let record = p.layers.history.items.get(x, y);
          record.removeObstacle();
          this.draw(p.layers.obstacles, x, y);
        })
        this.revealFog();
      }
      if(check.decorationChange) {
        let t = terrains.find(t => t.id == check.decorationChange);
        plane.layers.decorations.items.set(x, y, new Terrain(t));
        this.draw(plane.layers.decorations, mp.x, mp.y);
      }
      plane.layers.checks.items.remove(x, y);
    }
  }

  passivePlayerCheck() {
    let checks = this.layers.checks.items.inRadius(this.pp.x, this.pp.y, 1)
    checks.forEach(item => {
      if(!item.item || !item.item.passive || item.item.roll) return;
      item.item._roll(this);
      this.checkReward(item.item, item.x, item.y);
    })
  }

  centerOnPlayer() {
    let left = this.pp.x * this.tw - window.innerWidth/2;
    left = Math.max(0, left);
    left = Math.min(this.w * this.tw - window.innerWidth, left);
    let top = this.pp.y * this.th - window.innerHeight/2;
    top = Math.max(0, top);
    top = Math.min(this.h * this.th - window.innerHeight, top);
    this.panTo(-left, -top);
  }

  panTo(x, y) {
    let a = this.shadow.querySelector('.adventure');
    a.style.left = x + 'px';
    a.style.top = y + 'px';
    this.pans.x = x;
    this.pans.y = y;
  }

  start() {
    let playTheme = () => {
      sp.play('grass_theme').addEventListener('ended', () => setTimeout(playTheme, 10000));
    };
    let playEnv = () => {
      sp.play('park').addEventListener('ended', playEnv);

    }
    playTheme();
    playEnv();
    this.startKeyboard();
    let file = storage.load('config', 'adventure');
    if(file && file.data) {
      sp.updateVolume(file.data.soundVolume);
      if(file.data.showHelpOnStart) this.openHelp();
    }
  }

  render() {
    this.clear();
    this.addStyle(Adventure.style(this));

    let a = html`<div class='adventure'></div>`;
    this.tags.resources.id = 'resources';
    this.append(this.tags.resources.tags.outer);
    this.append(this.tags.time.render());
    this.updateResources();
    Object.keys(this.layers).forEach(key => {
      this.layers[key]
      if(!this.layers[key].canvas) return;
      this.layers[key].canvas.canvas.id = 'canvas-' + key;
      this.layers[key].canvas.resize(this.w * this.tw, this.h * this.th);
      this.layers[key].items && this.draw(this.layers[key]);
      a.appendChild(this.layers[key].canvas.canvas);
    })
    a.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
    a.addEventListener('mousemove', this.mouseMove.bind(this));
    a.addEventListener('mouseup', this.mouseUp.bind(this));
    a.addEventListener('mousedown', this.mouseDown.bind(this));
    a.addEventListener('mouseenter', this.mouseEnter.bind(this));
    a.addEventListener('mouseleave', this.mouseLeave.bind(this));
    this.append(a);
    this.append(this.menu.render());
    this.draw(this.layers.fog);
    return this.tags.outer;
  }


}

class Resource extends Component {
  constructor(name, amount, icon) {
    super();
    this.name = name;
    this.amount = amount || 0;
    this.sprite = icon instanceof Sprite ? icon : new Sprite(icon.bio.sprite);
  }

  render() {
    this.clear();
    let t = html`<div class='resource'>
      <span class='icon'></span>
      <span class='amount'>${this.amount}</span>
    </div>`;
    t.querySelector('.icon').appendChild(this.sprite.canvas);
    addToolTip(this.sprite.canvas, this.name);
    this.append(t);
    return this.tags.outer;
  }
}
Adventure.Dialog = Dialog;
Adventure.Resource = Resource;
module.exports = Adventure;
