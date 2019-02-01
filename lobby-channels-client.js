module.exports = function(lobby) {
  socket.on('user entered', (user) => {
    console.log('user enters', user)
    lobby.didEnter(user);
  });

  socket.on('token', data => {
    lobby.setToken(data);
  })

  socket.on('user left', (user) => {
    console.log('user left', user)
    lobby.didLeave(user);
  })

  socket.on('user list', users => {
    lobby.addUsers(users);
  })

  socket.on('game created', game => {
    lobby.gameCreated(game);
  })

  socket.on('game joined', game => {
    lobby.didJoinGame(game);
  })

  socket.on('game stopped', game => {
    lobby.didStopGame(game);
  })

  socket.on('game started', game => {
    lobby.gameDidStart(game);
  })

  socket.on('spectate confirmed', game => {
    lobby.startSpectate(game);
  })

  socket.on('game ready', game => {
    // when all teams have been selected
    lobby.gameIsReady(game);
  })

  socket.on('game list', games => {
    lobby.addGames(games);
  })
  socket.on('game updated', game => {
    lobby.updateGame(game);
  })

  socket.on('team selected', game => {
    lobby.teamSelected(game);
  })

  socket.on('game continued', game => {
    lobby.gameContinued(game);
  })

  socket.on('battle action confirmed', data => {
    lobby.confirmBattleAction(data);
  })
}
