import {
  getDesiredCommunities,
} from "./communitySocketRegistry";

export function rejoinAllCommunities(
  socket: any
) {
  const communities =
    getDesiredCommunities();

  console.log(
    "🔄 REJOINING ALL COMMUNITIES:",
    communities
  );

  for (const communityId of communities) {
    joinCommunity(
      socket,
      communityId
    );
  }
}

export function joinCommunity(
  socket: any,
  communityId: number
): Promise<{
  ok: boolean;
  ack?: any;
}> {
  return new Promise((resolve) => {

    if (!socket) {
      console.error(
        "❌ JOIN COMMUNITY: socket missing"
      );

      resolve({
        ok: false,
      });

      return;
    }

    if (!socket.connected) {
      console.log(
        "⏳ JOIN COMMUNITY: socket not connected",
        communityId
      );

      resolve({
        ok: false,
      });

      return;
    }

    const id = Number(communityId);

    if (!id) {
      console.error(
        "❌ JOIN COMMUNITY: invalid communityId",
        communityId
      );

      resolve({
        ok: false,
      });

      return;
    }

    socket.__communityJoinInProgress =
      socket.__communityJoinInProgress ||
      new Map();

    socket.__joinedCommunities =
      socket.__joinedCommunities ||
      new Set();

    if (
      socket.__joinedCommunities.has(id)
    ) {
      console.log(
        "⏭️ ALREADY JOINED COMMUNITY:",
        {
          socketId: socket.id,
          communityId: id,
        }
      );

      resolve({
        ok: true,
        ack: {
          ok: true,
          communityId: id,
          alreadyJoined: true,
        },
      });

      return;
    }

    const existing =
      socket.__communityJoinInProgress.get(id);

    if (existing) {
      console.log(
        "⏳ JOIN ALREADY IN PROGRESS:",
        {
          socketId: socket.id,
          communityId: id,
        }
      );

      existing.then(resolve);

      return;
    }

    console.log(
      "🚪 [COMMUNITY JOIN SEND]",
      {
        socketId: socket.id,
        communityId: id,
        connected: socket.connected,
      }
    );

    const promise = new Promise<{
      ok: boolean;
      ack?: any;
    }>((finish) => {

      socket.timeout(10000).emit(
        "join_community",
        {
          communityId: id,
        },
        (err: any, ack: any) => {

          if (err) {
            console.error(
              "❌ COMMUNITY JOIN TIMEOUT",
              {
                socketId: socket.id,
                communityId: id,
                error: err,
              }
            );

            finish({
              ok: false,
            });

            return;
          }

          console.log(
            "🏘️ COMMUNITY JOIN ACK",
            {
              socketId: socket.id,
              communityId: id,
              ack,
            }
          );

          if (!ack?.ok) {

            console.error(
              "❌ COMMUNITY JOIN REJECTED",
              {
                communityId: id,
                error: ack?.error,
              }
            );

            finish({
              ok: false,
              ack,
            });

            return;
          }

          socket.__joinedCommunities.add(id);

          console.log(
            "✅ COMMUNITY JOINED",
            {
              socketId: socket.id,
              communityId: id,
              role: ack.role,
            }
          );

          finish({
            ok: true,
            ack,
          });
        }
      );
    });

    socket.__communityJoinInProgress.set(
      id,
      promise
    );

    promise.finally(() => {
      socket.__communityJoinInProgress.delete(id);
    });

    promise.then(resolve);
  });
}