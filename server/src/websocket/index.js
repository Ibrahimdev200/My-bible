const { Server } = require('socket.io');

let io = null;

/**
 * Initializes Socket.IO server attached to HTTP server.
 * Handles rooms based on churchId for multi-tenant isolation.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow connections from frontend dev and production origins
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    let currentChurchId = null;
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Client joins church-specific room
    socket.on('join-church', (data) => {
      try {
        const churchId = typeof data === 'object' ? data.churchId : data;
        if (!churchId) {
          socket.emit('error', { message: 'churchId is required to join a church room.' });
          return;
        }

        // Leave previous room if any
        if (currentChurchId) {
          socket.leave(currentChurchId);
        }

        currentChurchId = String(churchId);
        socket.join(currentChurchId);

        console.log(`[Socket.IO] Socket ${socket.id} joined church room: ${currentChurchId}`);

        socket.emit('joined-church', {
          churchId: currentChurchId,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('[Socket.IO] Error joining church room:', err);
      }
    });

    // Scripture detected: broadcast to projection screen in church room
    socket.on('scripture-detected', (data) => {
      try {
        const churchId = data.churchId || currentChurchId;
        if (!churchId) {
          socket.emit('error', { message: 'No churchId specified for scripture-detected event.' });
          return;
        }

        const payload = {
          ...data,
          reference: data.reference,
          text: data.text || data.verseText,
          book: data.book || data.bookName || null,
          chapter: data.chapter || null,
          verse: data.verse || data.startVerse || null,
          translation: data.translation || 'KJV',
          logoUrl: data.logoUrl || data.churchLogo || null,
          churchLogo: data.churchLogo || data.logoUrl || null,
          churchName: data.churchName || null,
          branding: data.branding || null,
          confidence: data.confidence || 1.0,
          detectedAt: data.detectedAt || new Date().toISOString()
        };

        // Broadcast to all clients in the church room (including sender or projection screen)
        io.to(churchId).emit('scripture-detected', payload);
        // Also emit 'display-scripture' alias for projection display listener convenience
        io.to(churchId).emit('display-scripture', payload);

        console.log(`[Socket.IO] Broadcasted scripture "${payload.reference}" to church ${churchId}`);
      } catch (err) {
        console.error('[Socket.IO] Error handling scripture-detected:', err);
      }
    });

    // Manually push scripture to projection
    socket.on('manual-display', (data) => {
      try {
        const churchId = data.churchId || currentChurchId;
        if (!churchId) return;

        const payload = {
          reference: data.reference,
          text: data.text || data.verseText,
          translation: data.translation || 'KJV',
          churchLogo: data.churchLogo || null,
          churchName: data.churchName || null,
          branding: data.branding || null,
          manual: true,
          timestamp: new Date().toISOString()
        };

        io.to(churchId).emit('manual-display', payload);
        io.to(churchId).emit('display-scripture', payload);
        console.log(`[Socket.IO] Manual display pushed for church ${churchId}: ${payload.reference}`);
      } catch (err) {
        console.error('[Socket.IO] Error in manual-display:', err);
      }
    });

    // Clear projection screen
    socket.on('clear-projection', (data = {}) => {
      try {
        const churchId = data.churchId || currentChurchId;
        if (!churchId) return;

        io.to(churchId).emit('clear-projection', {
          timestamp: new Date().toISOString()
        });
        console.log(`[Socket.IO] Clear projection sent to church ${churchId}`);
      } catch (err) {
        console.error('[Socket.IO] Error in clear-projection:', err);
      }
    });

    // Scroll projection screen (up, down, top, bottom)
    socket.on('scroll-projection', (data = {}) => {
      try {
        const churchId = data.churchId || currentChurchId;
        if (!churchId) return;

        io.to(churchId).emit('scroll-projection', {
          direction: data.direction || 'down',
          amount: data.amount || 260,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('[Socket.IO] Error in scroll-projection:', err);
      }
    });

    // Update branding in real-time
    socket.on('update-branding', (data = {}) => {
      try {
        const churchId = data.churchId || currentChurchId;
        if (!churchId) return;

        io.to(churchId).emit('update-branding', {
          branding: data.branding,
          timestamp: new Date().toISOString()
        });
        console.log(`[Socket.IO] Branding update broadcasted for church ${churchId}`);
      } catch (err) {
        console.error('[Socket.IO] Error in update-branding:', err);
      }
    });

    // Pause scripture detection
    socket.on('pause-detection', (data = {}) => {
      try {
        const churchId = data.churchId || currentChurchId;
        if (!churchId) return;

        io.to(churchId).emit('pause-detection', {
          paused: true,
          timestamp: new Date().toISOString()
        });
        console.log(`[Socket.IO] Detection paused for church ${churchId}`);
      } catch (err) {
        console.error('[Socket.IO] Error in pause-detection:', err);
      }
    });

    // Resume scripture detection
    socket.on('resume-detection', (data = {}) => {
      try {
        const churchId = data.churchId || currentChurchId;
        if (!churchId) return;

        io.to(churchId).emit('resume-detection', {
          paused: false,
          timestamp: new Date().toISOString()
        });
        console.log(`[Socket.IO] Detection resumed for church ${churchId}`);
      } catch (err) {
        console.error('[Socket.IO] Error in resume-detection:', err);
      }
    });

    // Update active translation
    socket.on('update-translation', (data = {}) => {
      try {
        const churchId = data.churchId || currentChurchId;
        if (!churchId) return;

        io.to(churchId).emit('update-translation', {
          translation: data.translation,
          timestamp: new Date().toISOString()
        });
        console.log(`[Socket.IO] Translation update to ${data.translation} for church ${churchId}`);
      } catch (err) {
        console.error('[Socket.IO] Error in update-translation:', err);
      }
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
      if (currentChurchId) {
        socket.leave(currentChurchId);
      }
    });
  });

  return io;
}

/**
 * Access the initialized Socket.IO instance.
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet.');
  }
  return io;
}

/**
 * Broadcast an event directly to a specific church room from server-side code.
 */
function broadcastToChurch(churchId, event, data) {
  if (io && churchId) {
    io.to(String(churchId)).emit(event, data);
    return true;
  }
  return false;
}

module.exports = {
  initSocket,
  getIO,
  broadcastToChurch
};
