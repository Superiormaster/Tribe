// servers/rooms.js

const COMMUNITY_ROOM = (id) =>
  `community_${id}`;

const USER_ROOM = (userId) =>
  `user_${userId}`;

const CHAT_ROOM = (id) =>
  `chat_${id}`;

module.exports = {
  CHAT_ROOM,
  COMMUNITY_ROOM,
  USER_ROOM,
};