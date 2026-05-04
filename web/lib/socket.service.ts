const sendWithAck = (msg) => {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit("send_message", msg, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
};