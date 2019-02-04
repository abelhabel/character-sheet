const Rand = require('Rand.js');
const TeamSelect = require('TeamSelect.js');
const TeamViewer = require('TeamViewer.js');
const Monster = require('Monster.js');
const Battle = require('Battle.js');
const Arena = require('Arena.js');
const UnitPlacement = require('UnitPlacement.js');
const Team = require('Team.js');
const Match = require('Match.js');
const Gauntlet = require('Gauntlet.js');
const arenas = require('arenas.js');
const monsters = require('monsters.js');
const matches = require('matches.js');
const tw = 42;
const th = 42;
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

function placeUnits(arenaTpl, team, side, viewer) {
  return new Promise((resolve, reject) => {
    let arena = new Arena(arenaTpl, tw, th);
    let canvas = arena.render();
    viewer.append(canvas);
    let up = new UnitPlacement(arena, team, side);
    up.initPos();

    up.onDone = () => {
      viewer.remove(canvas);
      resolve(team);
    };
    up.render(document.body);
    canvas.addEventListener('click', e => {
      let x = Math.floor(e.offsetX / arena.tw);
      let y = Math.floor(e.offsetY / arena.th);
      up.click(x, y);
    })
    arena.drawObstacles();
  })
}

gameModes.gauntlet = function(lobby, viewer) {
  lobby.on('gauntlet', gauntlet => {
    viewer.show('gauntlet');
    let completed = [];
    gauntlet = new Gauntlet([
      Match.create(matches.find(m => m.id == "3abc70b3-8069-2f04-6eb6-b9a815ecefd7")),
      Match.create(matches.find(m => m.id == "f5b950dc-f752-aa87-ed6b-447b64639e00")),
      Match.create(matches.find(m => m.id == "81ec0747-ea40-94d5-ebd7-17183a6d486c")),
      Match.create(matches.find(m => m.id == "e6a4deb7-25f6-4010-8449-3a05c229d396")),
      Match.create(matches.find(m => m.id == "e2999f4a-d5e3-cdc2-0e0f-4fd3a860d80d")),
      Match.create(matches.find(m => m.id == "664d6ae7-cabd-78c2-d3eb-4de3684758bc")),
      Match.create(matches.find(m => m.id == "fdba3714-ead7-1cb8-cb84-230ff621e203")),
      Match.create(matches.find(m => m.id == "34b8fa41-651a-f67b-d458-86127c79f6e0")),
      Match.create(matches.find(m => m.id == "b9f48a76-8c0e-087f-4598-50103e931bba")),
    ]);
    viewer.append(gauntlet.render());
    gauntlet.on('done', match => {
      console.log(match)
      match.gameui = viewer;
      viewer.show('unit placement');
      createRNG();
      let {mode, cash, time, maxMonster} = match.settings.settings;
      let prep = Promise.resolve();
      if(mode == 'standard') {
        if(match.team1.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team1.team, 'left', viewer)
          });
        }
        if(match.team2.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team2.team, 'right', viewer)
          });
        }
      }
      prep.then(() => {
        viewer.clear('unit placement');
        viewer.show('battle');
        let battle = Battle.fromMatch(match);
        battle.onGameEnd = (o) => {
          console.log('match over', match, o)
          o.results.winningTeam(o.winningTeam == 'team1' ? 'You' : 'AI');
          if(o.team == match.team1.team) {
            if(match.team1.actor == 'human') gauntlet.completeStage(match.id);

          } else {
            if(match.team2.actor == 'human') gauntlet.completeStage(match.id);
          }
          let report = o.results.report(() => {
            battle.destroy();
            gauntlet.clear();
            viewer.clear('gauntlet');
            viewer.show('gauntlet');
            viewer.append(gauntlet.render());
          });
          viewer.append(report);
        };
        battle.start();
        window.battle = battle;
      });
    }, () => {
      viewer.clear('match');
      viewer.showLobby();
    });
  })
};

gameModes.importMatch = function(lobby, viewer) {
  lobby.on('import match', (m) => {
    // let m = matches[1];
    console.log('importing match', m)
    let match = Match.create(m, viewer, () => {
      viewer.clear('match');
      console.log('created match', match);
      viewer.show('unit placement');
      createRNG();
      let {mode, cash, time, maxMonster} = match.settings.settings;
      let prep = Promise.resolve();
      if(mode == 'standard') {
        if(match.team1.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team1.team, 'left', viewer)
          });
        }
        if(match.team2.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team2.team, 'right', viewer)
          });
        }
      }
      prep.then(() => {
        viewer.clear('unit placement');
        viewer.show('battle');
        let battle = Battle.fromMatch(match);
        battle.onGameEnd = (o) => {
          o.results.winningTeam(o.winningTeam == 'team1' ? 'You' : 'AI');
          let report = o.results.report(() => {
            battle.destroy();
            viewer.clear('battle');
            viewer.show('lobby');
          });
          document.body.appendChild(report);
        };
        battle.start();
        window.battle = battle;
      });
    }, () => {
      viewer.clear('match');
      viewer.showLobby();
    });
    viewer.show('match');
    match.onDone(match);
  });
}

gameModes.startMatch = function(lobby, viewer) {
  lobby.on('start match', () => {
    let match = new Match(viewer, () => {
      viewer.clear('match');
      console.log('created match', match);
      viewer.show('unit placement');
      createRNG();
      let {mode, cash, time, maxMonster} = match.settings.settings;
      let prep = Promise.resolve();
      if(mode == 'standard') {
        if(match.team1.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team1.team, 'left', viewer)
          });
        }
        if(match.team2.actor == 'human') {
          prep = prep.then(() => {
            return placeUnits(match.arena.arena, match.team2.team, 'right', viewer)
          });
        }
      }
      prep.then(() => {
        viewer.clear('unit placement');
        viewer.show('battle');
        let battle = Battle.fromMatch(match);
        battle.onGameEnd = (o) => {
          o.results.winningTeam(o.winningTeam == 'team1' ? 'You' : 'AI');
          let report = o.results.report(() => {
            battle.destroy();
            viewer.clear('battle');
            viewer.show('lobby');
          });
          document.body.appendChild(report);
        };
        battle.start();
        window.battle = battle;
      });
    }, () => {
      viewer.clear('match');
      viewer.showLobby();
    });
    viewer.show('match');
    match.render(viewer.container);
  });
}

gameModes.humanVSAI = function(lobby, viewer) {
  lobby.on('human vs ai game', (aiteam, aiLevel = 1) => {
    viewer.show('team view');
    let v1 = new TeamViewer('Pick team to play against');
    v1.render(viewer.container);
    v1.on('close', () => {
      viewer.clear('team view');
      viewer.show('lobby');
    })
    v1.on('done', aiteam => {
      viewer.clear('team view');
      viewer.show('team select');
      aiteam = Team.create(aiteam);
      var generator = createRNG();
      var onDone = (team) => {
        viewer.clear('team select');
        viewer.show('unit placement');
        placeUnits(arenas[1], team, 'left', viewer)
        .then(team => {
          viewer.clear('unit placement');
          viewer.show('battle');
          var battle = new Battle(team, aiteam, tw, th, viewer.container);
          battle.team2.forEach(m => m.addAI(aiLevel));
          battle.onGameEnd = (o) => {
            o.results.winningTeam(o.winningTeam == 'team1' ? 'You' : 'AI');
            let report = o.results.report(() => {
              battle.destroy();
              viewer.clear('battle');
              viewer.show('lobby');
            });
            viewer.append(report);
          };
          battle.start();
          window.battle = battle;
        });
      }
      var onExit = () => {
        viewer.clear('team select');
        viewer.show('lobby');
      };
      var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, 8, ['team1'], onDone, onExit);
    });
  });
};

gameModes.AIVSAI = function(lobby, viewer) {
  lobby.on('ai vs ai game', (aiLevel = 1) => {
    viewer.show('team view');
    let v1 = new TeamViewer('Pick Team 1');
    let v2 = new TeamViewer();
    let onClose = () => {
      viewer.clear('team view');
      viewer.show('lobby');
    };
    v1.on('close', onClose);
    v2.on('close', onClose);
    v1.render(viewer.container);
    v1.on('done', team1 => {
      viewer.clear('team view');
      v2.title = `<div>${team1.name} Picked</div>Now, Pick Team 2`;
      v2.render(viewer.container);
      v2.on('done', team2 => {
        viewer.clear('team view');
        viewer.show('battle');
        team1 = Team.create(team1);
        team2 = Team.create(team2);
        var generator = createRNG();
        var battle = new Battle(team1, team2, tw, th, viewer.container);
        battle.team1.forEach(m => m.addAI(aiLevel));
        battle.team2.forEach(m => m.addAI(aiLevel));
        battle.onGameEnd = (o) => {
          o.results.winningTeam(o.winningTeam);
          let report = o.results.report(() => {
            battle.destroy();
            viewer.clear('battle');
            viewer.show('lobby');
          });
          viewer.append(report);
        };
        battle.start();
        window.battle = battle;
      });
    });
  });
};

gameModes.localMultiplayer = function(lobby, viewer) {
  lobby.on('local game', (game) => {
    var generator = createRNG();
    var onDone = (team1, team2) => {
      viewer.clear('team select');
      viewer.show('unit placement');
      placeUnits(arenas[1], team1, 'left', viewer)
      .then(team1 => {
        viewer.clear('unit placement');
        return placeUnits(arenas[1], team2, 'right', viewer)
        .then(team2 => {
          viewer.clear('unit placement');
          viewer.show('battle');
          var battle = new Battle(team1, team2, tw, th, viewer.container);
          battle.onGameEnd = (o) => {
            o.results.winningTeam(o.winningTeam);
            let report = o.results.report(() => {
              battle.destroy();
              viewer.clear('battle');
              viewer.showLobby();
            });
            viewer.append(report);
          };
          battle.start();
          window.battle = battle;

        })
      });
    }
    viewer.show('team select');
    var teamSelect = new TeamSelect(monsters, viewer.container, tw, th, cash, 8, ['team1', 'team2'], onDone, viewer.showLobby.bind(viewer))
  });
}

gameModes.spectate = function(lobby, viewer) {
  lobby.on('start spectate', game => {
    lobby.hide();
    var generator = createRNG(game.seed);
    let team1 = assembleTeam(game.teams[0].team);
    let team2 = assembleTeam(game.teams[1].team);
    var battle = new Battle(team1, team2, tw, th, viewer.container);
    battle.onAction = (action, team) => {

    };

    battle.onGameEnd = (o) => {
      battle.destroy();
      viewer.reset();
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
    viewer.hideTeamSelect();
  })
};

gameModes.liveMultiplayer = function(lobby, viewer) {
  lobby.on('remote game', (game) => {
    var generator = createRNG(game.seed);
    viewer.show('team select');
    var onDone = (team) => {
      viewer.clear('team select');
      viewer.show('unit placement');
      let side = game.owner.id == lobby.localUser.id ? 'left' : 'right';
      placeUnits(arenas[1], team, side, viewer)
      .then(selected => {
        viewer.clear('unit placement');
        viewer.show('waiting room');
        lobby.selectTeam(game, selected);
        lobby.on('game ready', (game) => {
          console.log('game is ready');
          viewer.show('battle');
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
          var battle = new Battle(firstTeam, secondTeam, tw, th, viewer.container);

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
              viewer.clear('battle');
              viewer.show('lobby');
            });
            viewer.append(report);

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

    var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, 8, [lobby.localUser.name], onDone, viewer.backToLobby);


  });
};

gameModes.playByPost = function(lobby, viewer) {
  lobby.on('play by post', game => {
    let hasPickedTeam = game.teams.find(t => t.user.id == lobby.localUser.id);
    let isFull = game.full;
    console.log(lobby.localUser, game)
    if(game.teams.length < 2 && hasPickedTeam) return;
    if(game.teams && game.teams.length == 2) {
      viewer.show('battle');
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
      var battle = new Battle(firstTeam, secondTeam, tw, th, viewer.container);
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
        viewer.clear('battle');
        viewer.show('lobby');
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
      viewer.show('team select');
      var onDone = (team) => {
        console.log('team', team)
        viewer.clear('team select');
        viewer.show('unit placement');
        let side = game.owner.id == lobby.localUser.id ? 'left' : 'right';
        placeUnits(arenas[1], team, side, viewer)
        .then(team => {
          lobby.selectTeam(game, team);
          viewer.clear('unit placement');
          viewer.show('lobby');
        });
      }
      viewer.show('team select');
      var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, 8, [lobby.localUser.name], onDone, viewer.backToLobby);
    }
  })
}
module.exports = gameModes;
