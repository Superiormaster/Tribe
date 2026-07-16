// servers/auth.js

const axios = require('axios');
const API_URL = process.env.API_URL;

console.log("API_URL =", API_URL);

async function authenticate(socket) {

  try {

    const user =
      socket.handshake.auth?.user;
    console.log(socket.handshake.auth.user);

    if (!user || !user.token) {
      throw new Error('No auth');
    }

    const url = `${API_URL}/users/me/`;

    console.log("Calling:", url);
    
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });

    const verifiedUser = res.data;

    socket.user = {
      id: verifiedUser.id,
      username: verifiedUser.username,
      avatar: verifiedUser.avatar,
    };

    socket.api = axios.create({
      baseURL: API_URL,
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