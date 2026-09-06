import {
  Room,
  RoomEvent,
  createLocalAudioTrack,
  createLocalVideoTrack,
  LocalAudioTrack,
  LocalVideoTrack,
} from "livekit-client";

class CallManager {
  room: Room | null = null;
  localTracks: Array<LocalAudioTrack | LocalVideoTrack> = [];

  async connect(url: string, token: string) {
    // Disconnect an existing room first.
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
      this.localTracks = [];
    }

    this.room = new Room();

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log("User joined:", participant.identity);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track) => {
      console.log("Remote track:", track);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log("User left:", participant.identity);
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log("LiveKit room disconnected");
    });

    await this.room.connect(url, token);

    return this.room;
  }

  async startCall(
    url: string,
    token: string,
    video = true
  ) {
    // Disconnect any existing call.
    if (this.room) {
      await this.endCall();
    }

    this.room = new Room();

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log("User joined:", participant.identity);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track) => {
      console.log("Remote track:", track);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log("User left:", participant.identity);
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log("LiveKit room disconnected");
    });

    await this.room.connect(url, token);

    // Create microphone track.
    const audioTrack = await createLocalAudioTrack({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    });

    await this.room.localParticipant.publishTrack(audioTrack);

    this.localTracks.push(audioTrack);

    // Create camera track when video is enabled.
    if (video) {
      const videoTrack = await createLocalVideoTrack({
        resolution: {
          width: 1280,
          height: 720,
          frameRate: 30,
        },
      });

      await this.room.localParticipant.publishTrack(videoTrack);

      this.localTracks.push(videoTrack);
    }

    return {
      room: this.room,
      audioTrack,
      videoTrack:
        this.localTracks.find(
          (track) => track instanceof LocalVideoTrack
        ) ?? null,
    };
  }

  async endCall() {
    // Stop local microphone/camera tracks.
    for (const track of this.localTracks) {
      try {
        track.stop();
      } catch (error) {
        console.warn("Failed to stop local track:", error);
      }
    }

    this.localTracks = [];

    // Disconnect from LiveKit.
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
  }
}

export default CallManager;