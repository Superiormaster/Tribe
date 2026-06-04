// servers/auth.js

const axios = require('axios');

async function authenticate(socket) {

  try {

    const user =
      socket.handshake.auth?.user;
    console.log(socket.handshake.auth.user);

    if (!user || !user.token) {
      throw new Error('No auth');
    }

    const res = await axios.get(
      'http://127.0.0.1:8000/api/users/me/',
      {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      }
    );

    const verifiedUser = res.data;

    socket.user = {
      id: verifiedUser.id,
      username: verifiedUser.username,
      avatar: verifiedUser.avatar,
    };

    socket.api = axios.create({
      baseURL: 'http://127.0.0.1:8000/api/',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });

    console.log(
      `✅ Authenticated ${socket.user.username}`
    );

    return true;

  } catch (err) {
  
    console.log('====================');
    console.log('❌ SOCKET AUTH ERROR');
    console.log('====================');
  
    console.log(
      'Handshake auth:',
      socket.handshake.auth
    );
  
    console.log(
      'Error message:',
      err.message
    );
  
    console.log(
      'Axios response:',
      err.response?.data
    );
  
    console.log(
      'Status:',
      err.response?.status
    );
  
    console.log('====================');
  
    socket.disconnect();
  
    return false;
  }
}

module.exports = authenticate;