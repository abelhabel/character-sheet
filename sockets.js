const pidsOnSid = {};
const sidsOnPid = {};
var IO;
module.exports = function(io) {
  io = io || IO;
  IO = io;
  return {
    getPlayerId: function(socketId) {
      return pidsOnSid[socketId];
    },
    get: function(o) {
      if(typeof o != 'object') return;
      if(o.playerId) return IO.to(sidsOnPid[o.playerId]);
      if(o.socketId) return IO.to(o.socketId);
    },
    set: function(o) {
      if(typeof o != 'object') return;
      if(o.playerId && o.socketId) {
        pidsOnSid[o.socketId] = o.playerId;
        sidsOnPid[o.playerId] = o.socketId;
      }

      console.log('set user', pidsOnSid, sidsOnPid)
    },
    del: function(o) {
      if(typeof o != 'object') return;
      delete sidsOnPid[o.playerId];
      delete pidsOnSid[o.socketId];
    }
  }
};
