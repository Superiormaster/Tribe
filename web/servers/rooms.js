// servers/rooms.js

const CHAT_ROOM = (id) =>
  `chat_${id}`;

const COMMUNITY_ROOM = (id) =>
  `community_${id}`;

const USER_ROOM = (id) =>
  `user_${id}`;

module.exports = {
  CHAT_ROOM,
  COMMUNITY_ROOM,
  USER_ROOM,
};