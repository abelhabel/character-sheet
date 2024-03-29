const Rand = require('Rand.js');
const TeamSelect = require('TeamSelect.js');
const TeamViewer = require('TeamViewer.js');
const Monster = require('Monster.js');
const Battle = require('Battle.js');
const Arena = require('Arena.js');
const UnitPlacement = require('UnitPlacement.js');
const Team = require('Team.js');
const Match = require('Match.js');
const Menu = require('Menu.js');
const Gauntlet = require('Gauntlet.js');
const CardList = require('CardList.js');
const Adventure = require('Adventure.js');
const GridBox = require('GridBox.js');
const Crafting = require('Crafting.js');
const QuestLog = require('QuestLog.js');
const Component = require('Component.js');
const Equipment = require('Equipment.js');
const Armory = require('Armory.js');
const Inventory = require('Inventory.js');
const Ability = require('Ability.js');
const AbilityCard = require('AbilityCard.js');
const Player = require('Player.js');
const guid = require('guid.js');
const abilities = require('abilities.js');
const equipment = require('equipments.js');
const storage = require('storage.js');
const adventures = require('adventures.js');
const arenas = require('arenas.js');
const monsters = require('monsters.js').filter(m => !m.bio.leader);
const leaders = require('monsters.js').filter(m => m.bio.leader);
const OOI = monsters.filter(m => m.bio.family == 'Order of Idun');
const matches = require('matches.js');
const gauntlets = require('gauntlets.js');
const tw = 48;
const th = 48;
const cash = 600;
const gameModes = {};
function assembleTeam(team) {
  return team.map(t => {
    let template = monsters.find(m => m.id == t.templateId);
    let monster = new Monster(template, t.stacks, false, t.suuid);
    return monster;
  })
}

function createRNG(seed) {
  var generator = new Rand(seed || Date.now()).generator;
  window._random = (t) => generator.random();
  window._roll = (a, b) => Math.round(a + _random() * (b-a));
  return generator;
}

function placeUnits(arenaTpl, team, side, ui) {
  return new Promise((resolve, reject) => {
    let arena = new Arena(arenaTpl, tw, th);
    let canvas = arena.render();
    ui.append(canvas);
    let up = new UnitPlacement(arena, team, side);
    up.initPos();

    up.on('done', () => {
      ui.remove(canvas);
      resolve(team);
    });
    ui.append(up.render());
    canvas.addEventListener('click', e => {
      let x = Math.floor(e.offsetX / arena.tw);
      let y = Math.floor(e.offsetY / arena.th);
      up.click(x, y);
    })
    arena.drawObstacles();
  })
}

gameModes.loadAdventure = function(lobby, ui) {
  lobby.on('load adventure', () => {
    ui.show('adventure');
    let saves = storage.loadFolder('adventure');
    saves.forEach(s => {
      console.log(s)
      let a = adventures.find(a => a.id == s.name);
      if(!a) {
        ui.clear('adventure');
        ui.show('lobby');
        return;
      }
      let c = new Component(false, 'load-list');
      let t = html`<div class='save-file'>
        <div>${a.name}</div>
        <div>${new Date(s.date).toUTCString()}</div>
      </div>`;
      let menu = new Menu([
        {
          text: 'Back',
          fn: () => {
            ui.clear('adventure');
            ui.show('lobby');
          }
        }
      ])
      c.append(menu.render());
      t.addEventListener('click', e => {
        ui.clear('adventure');
        lobby.trigger('adventure', s);
      })
      c.append(t);
      ui.append(c.tags.outer);
    })
  });
}

gameModes.adventureAITest = function(lobby, ui) {
  lobby.on('adventure ai test', (saveFile) => {
    let aid = "6141dde5-5bf8-7c57-1975-1374df392ef6";
    let tpl = adventures.find(a => a.id == aid);
    let sp = tpl.startPositions[0];
    let a = Adventure.create(tpl, saveFile, true, sp);
    a.layers.fog.show = false;
    window.adventure = a;
    let players = tpl.startPositions.map((p, i) => {
      let leadertpl = leaders[i % leaders.length];
      let leader = new Monster(leadertpl);
      let team = Team.fromMonsters('team' + i, [leader]);
      let player = new Player(team, 'clan' + i, true);
      a.addPlayer(player, p);
      a.playerLayers.fog.show = false;
      return p;
    })
    ui.show('adventure');
    a.startTurn();
    ui.append(a.render());
    a.start();
  })
};

gameModes.adventure = function(lobby, ui) {
  lobby.on('adventure', (saveFile) => {
    console.log('adventure', saveFile);
    let id = saveFile ? saveFile.name : '1a1f19de-3da3-e850-3815-0a3bcb0c218f';
    let tpl = adventures.find(a => a.id == id);
    console.log('create adventure')
    // has to choose a startposition
    let sp = tpl.startPositions[0];
    let a = Adventure.create(tpl, saveFile, true, sp);

    a.on('open ability trainer', () => {
      let cards = [];
      abilities.forEach(t => {
        let ab = new Ability(t);
        cards.push(ab.card.render());
      })
      let list = new CardList(cards);
      list.addStyle(AbilityCard.style);
      ui.show('team select');
      ui.append(list.render());
    })

    a.on('open tavern', () => {
      ui.show('team select');
      let undead = monsters.filter(m => m.bio.family == 'Order of Idun');
      let onDone = (team) => {
        a.player.team.merge(team);
        a.addGold(-ts.spent);
        a.updateResources();
        ui.clear('team select');
        ui.show('adventure');
      };
      let onExit = () => {
        ui.clear('team select');
        ui.show('adventure');
      };
      let ts = new TeamSelect(undead, ui.container, 42, 42, a.player.gold, 8, ['Andreas'], onDone, onExit);
    });
    a.on('open armory', () => {
      ui.show('team select');
      let eqt = a.player.inventory.equipment;
      let armory = new Armory(equipment.map(e => new Equipment(e)), eqt, a.player.gold);
      armory.on('close', () => {
        ui.clear('team select');
        ui.show('adventure');
      });
      armory.on('done', () => {
        a.addGold(-armory.spent);
        a.updateResources();
        eqt.forEach(item => a.player.inventory.remove(item));
        armory.picked.forEach(item => a.player.inventory.add(item));
        ui.clear('team select');
        ui.show('adventure');
      })
      ui.append(armory.render());
    });
    a.on('level up', () => {
      ui.show('team select');
    })
    var onDone = (team) => {
      ui.clear('team select');
      ui.show('adventure');
      window.adventure = a;
      let player = new Player(team, 'player', false);

      player.inventory.on('crafted ability', (tpl, items) => {
        console.log('items used', items);
        tpl.id = guid();
        abilities.push(tpl);
        team.leaders.forEach(l => {
          logger.log(`Player learned a Custom Ability.`);
          l.addAbility(tpl.id);
        });
        items.forEach(item => player.inventory.remove(item));
        player.inventory.render();
        storage.save('customAbilities', tpl.id, tpl);
      });

      player.crafting.on('crafting success', recipe => {
        recipe.takeResult(a);
        player.crafting.render();
        a.updateResources();
      });

      player.inventory.on('equipment changed', items => {
        let leader = team.leaders[0];
        if(!leader) return;
        leader.equipment = items.map(i => i.item.template.id);
      })

      player.inventory.on('use inventory item', item => {
        if(item.item instanceof Equipment) return;
        if(item.item.inventory.action == 'give ability') {
          let t = html`<div style='position:fixed;z-index: 4000; top:50%;left:50%;transform:translate(-50%,-50%);background-image: url(sheet_of_old_paper.png);padding:20px;'></div>`;
          player.team.units.forEach(u => {
            let m = u.monster.canvas.clone()
            m.addEventListener('click', () => {
              u.addAbility(item.item.inventory.ability);
              player.inventory.remove(item);
              document.body.removeChild(t);
            })
            t.appendChild(m);

          });
          player.inventory.unmount();
          document.body.appendChild(t);
        }
        if(item.item.inventory.action == 'give scroll') {
          let t = html`<div style='position:fixed;z-index: 4000; top:50%;left:50%;transform:translate(-50%,-50%);background-image: url(sheet_of_old_paper.png);padding:20px;'></div>`;
          player.team.units.forEach(u => {
            let m = u.monster.canvas.clone()
            m.addEventListener('click', () => {
              u.addAbility(item.item.inventory.ability);
              player.inventory.remove(item);
              document.body.removeChild(t);
            })
            t.appendChild(m);

          });
          player.inventory.unmount();
          document.body.appendChild(t);
        }
      });
      player.inventory.on('drop inventory item', item => {
        a.addObstacle(a.pp.x, a.pp.y, item.item);
        player.inventory.remove(item);
      })
      a.on('complete quest', quest => {
        if(quest.reward.type == 'win game') {
          console.log('game won');
          let t = html`<div class='finish-adventure'>
            <p>
              Congratulations! You have completed this adventure.
            </p>
            <p>
              Click to continue.
            </p>
          </div>`;
          t.addEventListener('click', e => {
            ui.clear('adventure');
            ui.show('lobby');
          });
          a.shadow.appendChild(t);
        }
      });
      console.log('addplayer', sp)
      a.addPlayer(player, sp);
      saveFile && a.loadPlayer();
      ui.append(a.render());
      a.start();
      a.centerOnPlayer();
      a.on('battle', (enemyTeam, tile, autoResolve) => {
        let aiteam = Team.create(enemyTeam.template);
        let aiLevel = 1;
        let p;
        if(autoResolve) {
          p = Promise.resolve(team);
        } else {
          ui.show('unit placement');
          p = placeUnits(arenas[1], team, 'left', ui)
        }
        p.then(team => {
          ui.clear('unit placement');
          ui.show('battle');
          createRNG();
          var battle = new Battle(team, aiteam, tw, th, ui.container);
          if(autoResolve) {
            battle.autoResolve();
            battle.team1.forEach(m => m.addAI(aiLevel));
          }
          battle.team2.forEach(m => m.addAI(aiLevel));
          battle.onGameEnd = (o) => {
            player.addXP(aiteam.xp);
            battle.team1.forEach(m => {
              let u = team.units.find(u => u.suuid == m.suuid);
              if(!m.alive) {
                team.removeUnit(u.suuid);
              }
              u.stacks = m.stacks;

            })
            o.results.winningTeam(o.winningTeam == 'team1' ? 'You' : 'AI');
            let report = o.results.report(() => {
              battle.destroy();
              ui.clear('battle');
              if(!team.units.length) {
                ui.show('adventure defeat');
                return ui.component.on('done', () => {
                  ui.show('lobby');
                })
              }
              a.killTeam(tile);
              ui.show('adventure');
            });
            ui.append(report);
          };
          battle.start();
          window.battle = battle;
        });
      })
    };

    var onExit = () => {
      ui.clear('team select');
      ui.show('lobby');
    }
    if(saveFile) {
      let player = storage.load('player', saveFile.name);
      console.log('player',player)
      onDone(Team.create(player.data.team))
    } else {
      ui.show('team select');
      let ts = new TeamSelect(OOI, ui.container, 42, 42, 600, 8, ['Andreas'], (team) => {
        ui.clear('team select');
        new TeamSelect(leaders, ui.container, 42, 42, 600, 1, ['Andreas'], (leaderTeam) => {
          team.merge(leaderTeam);
          onDone(team);
        }, onExit);
      }, onExit);
    }
  });
}

gameModes.gauntlet = function(lobby, ui) {
  lobby.on('gauntlet', gauntlet => {
    ui.show('gauntlet');
    let menu = new Menu([
      {
        text: 'Back',
        fn: () => {
          ui.clear('gauntlet');
          ui.show('lobby');
        }
      }
    ]);
    var onDone = (match, gauntlet) => {
      match.gameui = ui;
      ui.show('unit placement');
      createRNG();
      let {mode, cash, time, maxMonster} = match.settings.settings;
      let prep = Promise.resolve();
      if(mode == 'standard') {
        if(match.team1.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team1.team, 'left', ui)
          });
        }
        if(match.team2.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team2.team, 'right', ui)
          });
        }
      }
      prep.then(() => {
        ui.clear('unit placement');
        ui.show('battle');
        let battle = Battle.fromMatch(match);
        battle.onGameEnd = (o) => {
          o.results.winningTeam(o.winningTeam);
          if(o.team == match.team1.team) {
            if(match.team1.actor == 'human') gauntlet.completeStage(match.id);
          } else {
            if(match.team2.actor == 'human') gauntlet.completeStage(match.id);
          }
          localStorage['gauntlet' + gauntlet.id] = JSON.stringify(gauntlet.completed);
          let report = o.results.report(() => {
            battle.destroy();
            gauntlet.clear();
            ui.clear('gauntlet');
            ui.clear('battle');
            lobby.trigger('gauntlet', gauntlet);
          });
          ui.append(report);
        };
        battle.start();
        window.battle = battle;
      });
    }
    var onClose = () => {
      ui.clear('match');
      ui.showLobby();
    }
    let list = new CardList();
    list.pageSize = 1;
    gauntlets.forEach(t => {
      let g = Gauntlet.create(t);
      let completed = JSON.parse(localStorage['gauntlet' + g.id] || "[]");
      completed.forEach(id => g.completeStage(id));
      list.add(g.render());
      g.on('done', (m) => onDone(m, g));
      g.on('close', onClose);
    })
    ui.append(list.render());
    ui.append(menu.render());
  })
};

gameModes.importMatch = function(lobby, ui) {
  lobby.on('import match', (m) => {
    // let m = matches[1];
    console.log('importing match', m)
    let match = Match.create(m);
    match.on('done', () => {
      ui.clear('match');
      console.log('created match', match);
      ui.show('unit placement');
      createRNG();
      let {mode, cash, time, maxMonster} = match.settings.settings;
      let prep = Promise.resolve();
      if(mode == 'standard') {
        if(match.team1.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team1.team, 'left', ui)
          });
        }
        if(match.team2.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team2.team, 'right', ui)
          });
        }
      }
      prep.then(() => {
        ui.clear('unit placement');
        ui.show('battle');
        let battle = Battle.fromMatch(match);
        battle.onGameEnd = (o) => {
          o.results.winningTeam(o.winningTeam == 'team1' ? 'You' : 'AI');
          let report = o.results.report(() => {
            battle.destroy();
            ui.clear('battle');
            ui.show('lobby');
          });
          document.body.appendChild(report);
        };
        battle.start();
        window.battle = battle;
      });
    })
    match.on('close', () => {
      ui.clear('match');
      ui.showLobby();
    });
    ui.show('match');
    match.onDone(match);
  });
}

gameModes.startMatch = function(lobby, ui) {
  lobby.on('start match', () => {
    let match = new Match(ui);
    match.on('done', () => {
      ui.clear('match');
      console.log('created match', match);
      ui.show('unit placement');
      createRNG();
      let {mode, cash, time, maxMonster} = match.settings.settings;
      let prep = Promise.resolve();
      if(mode == 'standard') {
        if(match.team1.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team1.team, 'left', ui)
          });
        }
        if(match.team2.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team2.team, 'right', ui)
          });
        }
      }
      prep.then(() => {
        ui.clear('unit placement');
        ui.show('battle');
        let battle = Battle.fromMatch(match);
        battle.onGameEnd = (o) => {
          o.results.winningTeam(o.winningTeam);
          let report = o.results.report(() => {
            battle.destroy();
            ui.clear('battle');
            ui.show('lobby');
          });
          document.body.appendChild(report);
        };
        battle.start();
        window.battle = battle;
      });
    });
    match.on('close', () => {
      ui.clear('match');
      ui.showLobby();
    });
    ui.show('match');
    match.render(ui.container);
  });
}

gameModes.humanVSAI = function(lobby, ui) {
  lobby.on('human vs ai game', (aiteam, aiLevel = 1) => {
    ui.show('team view');
    let v1 = new TeamViewer('Pick team to play against');
    v1.render(ui.container);
    v1.on('close', () => {
      ui.clear('team view');
      ui.show('lobby');
    })
    v1.on('done', aiteam => {
      ui.clear('team view');
      ui.show('team select');
      aiteam = Team.create(aiteam);
      var generator = createRNG();
      var onDone = (team) => {
        ui.clear('team select');
        ui.show('unit placement');
        placeUnits(arenas[1], team, 'left', ui)
        .then(team => {
          ui.clear('unit placement');
          ui.show('battle');
          var battle = new Battle(team, aiteam, tw, th, ui.container);
          battle.team2.forEach(m => m.addAI(aiLevel));
          battle.onGameEnd = (o) => {
            o.results.winningTeam(o.winningTeam == 'team1' ? 'You' : 'AI');
            let report = o.results.report(() => {
              battle.destroy();
              ui.clear('battle');
              ui.show('lobby');
            });
            ui.append(report);
          };
          battle.start();
          window.battle = battle;
        });
      }
      var onExit = () => {
        ui.clear('team select');
        ui.show('lobby');
      };
      var teamSelect = new TeamSelect(monsters, ui.selectContainer, tw, th, cash, 8, ['team1'], onDone, onExit);
    });
  });
};

gameModes.AIVSAI = function(lobby, ui) {
  lobby.on('ai vs ai game', (aiLevel = 1) => {
    ui.show('team view');
    let v1 = new TeamViewer('Pick Team 1');
    let v2 = new TeamViewer();
    let onClose = () => {
      ui.clear('team view');
      ui.show('lobby');
    };
    v1.on('close', onClose);
    v2.on('close', onClose);
    v1.render(ui.container);
    v1.on('done', team1 => {
      ui.clear('team view');
      v2.title = `<div>${team1.name} Picked</div>Now, Pick Team 2`;
      v2.render(ui.container);
      v2.on('done', team2 => {
        ui.clear('team view');
        ui.show('battle');
        team1 = Team.create(team1);
        team2 = Team.create(team2);
        var generator = createRNG();
        var battle = new Battle(team1, team2, tw, th, ui.container);
        battle.team1.forEach(m => m.addAI(aiLevel));
        battle.team2.forEach(m => m.addAI(aiLevel));
        battle.onGameEnd = (o) => {
          o.results.winningTeam(o.winningTeam);
          let report = o.results.report(() => {
            battle.destroy();
            ui.clear('battle');
            ui.show('lobby');
          });
          ui.append(report);
        };
        battle.start();
        window.battle = battle;
      });
    });
  });
};

gameModes.localMultiplayer = function(lobby, ui) {
  lobby.on('local game', (game) => {
    var generator = createRNG();
    var onDone = (team1, team2) => {
      ui.clear('team select');
      ui.show('unit placement');
      placeUnits(arenas[1], team1, 'left', ui)
      .then(team1 => {
        ui.clear('unit placement');
        return placeUnits(arenas[1], team2, 'right', ui)
        .then(team2 => {
          ui.clear('unit placement');
          ui.show('battle');
          var battle = new Battle(team1, team2, tw, th, ui.container);
          battle.onGameEnd = (o) => {
            o.results.winningTeam(o.winningTeam);
            let report = o.results.report(() => {
              battle.destroy();
              ui.clear('battle');
              ui.showLobby();
            });
            ui.append(report);
          };
          battle.start();
          window.battle = battle;

        })
      });
    }
    var onClose = () => {
      ui.clear('team select');
      ui.show('lobby');
    }
    ui.show('team select');
    var teamSelect = new TeamSelect(monsters, ui.container, tw, th, cash, 8, ['team1', 'team2'], onDone, onClose)
  });
}

gameModes.spectate = function(lobby, ui) {
  lobby.on('start spectate', game => {
    lobby.hide();
    var generator = createRNG(game.seed);
    let team1 = assembleTeam(game.teams[0].team);
    let team2 = assembleTeam(game.teams[1].team);
    var battle = new Battle(team1, team2, tw, th, ui.container);
    battle.onAction = (action, team) => {

    };

    battle.onGameEnd = (o) => {
      battle.destroy();
      ui.reset();
      lobby.show();
    };


    lobby.on('battle action confirmed', (data) => {
      let a = battle.createAction(data.action);
      battle.addAction(a, true);
    })


    battle.start()
    .then(() => {
      battle.fastForward(game.actions);
    });
    window.battle = battle;
    ui.hideTeamSelect();
  })
};

gameModes.liveMultiplayer = function(lobby, ui) {
  lobby.on('remote game', (game) => {
    var generator = createRNG(game.seed);
    ui.show('team select');
    var onDone = (team) => {
      ui.clear('team select');
      ui.show('unit placement');
      let side = game.owner.id == lobby.localUser.id ? 'left' : 'right';
      placeUnits(arenas[1], team, side, ui)
      .then(selected => {
        ui.clear('unit placement');
        ui.show('waiting room');
        lobby.selectTeam(game, selected);
        lobby.on('game ready', (game) => {
          console.log('game is ready');
          ui.show('battle');
          let localTeam = game.teams.find(t => t.user.id == lobby.localUser.id);
          let remoteTeam = game.teams.find(t => t.user.id != lobby.localUser.id);
          let firstTeam = game.owner.id == lobby.localUser.id ? localTeam.team : remoteTeam.team;
          let secondTeam = game.owner.id != lobby.localUser.id ? localTeam.team : remoteTeam.team;
          let localName = localTeam.user.name;
          let remoteName = remoteTeam.user.name;
          if(game.owner.id == lobby.localUser.id) {
            firstTeam = localTeam.team;
            secondTeam = remoteTeam.team;
            localTeam = 'team1';
          } else {
            firstTeam = remoteTeam.team;
            secondTeam = localTeam.team;
            localTeam = 'team2';
          }
          var battle = new Battle(firstTeam, secondTeam, tw, th, ui.container);

          battle.onAction = (action, team) => {
            if(team != localTeam) return;
            lobby.battleAction(game, action);
          };
          battle.onGameEnd = (o) => {
            lobby.off('battle action confirmed', confirmAction);
            o.results.winningTeam(localTeam == o.winningTeam ? localName : remoteName);
            let report = o.results.report(() => {
              if(o.winningTeam == localTeam) {
                lobby.winGame(game);
              } else {
                lobby.loseGame(game);
              }
              battle.destroy();
              ui.clear('battle');
              ui.show('lobby');
            });
            ui.append(report);

          };
          let confirmAction = (data) => {
            let a = battle.createAction(data.action);
            battle.addAction(a, true);
          };
          lobby.on('battle action confirmed', confirmAction);
          battle.start();
          window.battle = battle;

        })
      })
    }

    var teamSelect = new TeamSelect(monsters, ui.selectContainer, tw, th, cash, 8, [lobby.localUser.name], onDone, ui.backToLobby);


  });
};

gameModes.playByPost = function(lobby, ui) {
  lobby.on('play by post', game => {
    let hasPickedTeam = game.teams.find(t => t.user.id == lobby.localUser.id);
    let isFull = game.full;
    console.log(lobby.localUser, game)
    if(game.teams.length < 2 && hasPickedTeam) return;
    if(game.teams && game.teams.length == 2) {
      ui.show('battle');
      var generator = createRNG(game.seed);
      let localTeam = game.teams.find(t => t.user.id == lobby.localUser.id);
      let remoteTeam = game.teams.find(t => t.user.id != lobby.localUser.id);
      let firstTeam = game.owner.id == lobby.localUser.id ? localTeam.team : remoteTeam.team;
      let secondTeam = game.owner.id != lobby.localUser.id ? localTeam.team : remoteTeam.team;
      if(game.owner.id == lobby.localUser.id) {
        firstTeam = localTeam.team;
        secondTeam = remoteTeam.team;
        localTeam = 'team1';
      } else {
        firstTeam = remoteTeam.team;
        secondTeam = localTeam.team;
        localTeam = 'team2';
      }
      var battle = new Battle(firstTeam, secondTeam, tw, th, ui.container);
      battle.onAction = (action, team) => {
        if(team != localTeam) return;
        lobby.battleAction(game, action);
      };
      battle.onGameEnd = (o) => {
        lobby.off('battle action confirmed', confirmAction);
        if(o.winningTeam == localTeam) {
          lobby.winGame(game);
        } else {
          lobby.loseGame(game);
        }
        battle.destroy();
        ui.clear('battle');
        ui.show('lobby');
      };
      let confirmAction = (data) => {
        let a = battle.createAction(data.action);
        battle.addAction(a, true);
      };
      lobby.on('battle action confirmed', confirmAction);
      battle.start()
      .then(() => {
        battle.fastForward(game.actions);
      });
      window.battle = battle;
    } else
    if(game.teams && game.teams.find(t => t.user.id == lobby.localUser.id)) {
      console.log('team has been selected. waiting for other player to select team');
    } else {
      ui.show('team select');
      var onDone = (team) => {
        console.log('team', team)
        ui.clear('team select');
        ui.show('unit placement');
        let side = game.owner.id == lobby.localUser.id ? 'left' : 'right';
        placeUnits(arenas[1], team, side, ui)
        .then(team => {
          lobby.selectTeam(game, team);
          ui.clear('unit placement');
          ui.show('lobby');
        });
      }
      ui.show('team select');
      var teamSelect = new TeamSelect(monsters, ui.selectContainer, tw, th, cash, 8, [lobby.localUser.name], onDone, ui.backToLobby);
    }
  })
}
module.exports = gameModes;
