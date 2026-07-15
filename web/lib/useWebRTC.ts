import {
  Room,
  RoomEvent,
  LocalAudioTrack,
  LocalVideoTrack,
} from "livekit-client";

class CallManager {
  room: Room | null = null;
  localTracks: any[] = [];

  async connect(url: string, token: string) {
    this.room = new Room();

    await this.room.connect(url, token);

    this.room.on(RoomEvent.ParticipantConnected, (p) => {
      console.log("User joined:", p.identity);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track) => {
      console.log("Remote track:", track);
    });
  }

  async startCall(url: string, token: string, video = true) {
    this.room = new Room();

    await this.room.connect(url, token);

    const tracks = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video,
    });

    for (const mediaTrack of tracks.getTracks()) {
      if (mediaTrack.kind === "audio") {
        await this.room.localParticipant.publishTrack(
          new LocalAudioTrack(mediaTrack)
        );
      } else {
        await this.room.localParticipant.publishTrack(
          new LocalVideoTrack(mediaTrack)
        );
      }
    }
  }

  async endCall() {
    await this.room?.disconnect();
    this.room = null;
  }
}

export default CallManager;