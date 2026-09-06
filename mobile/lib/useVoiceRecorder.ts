import {
useEffect,
useRef,
useState,
} from 'react';

import {
Alert,
} from 'react-native';

import {
useAudioRecorder,
useAudioRecorderState,
RecordingPresets,
requestRecordingPermissionsAsync,
setAudioModeAsync,
} from 'expo-audio';

import {
updateMessage,
} from '@/lib/messageDB';

import {
updateCommunityMessage,
} from '@/lib/communityMessageDB';

import {
sendCommunityMessage,
} from '@/utils/communityChatPage/sendCommunityMessage';

import {
sendChatMessage,
} from '@/utils/chat/sendChatMessage';

import type {
Message,
} from '@/utils/chat/messageContract';

import {
createReplySnapshot,
} from '@/utils/chat/replySnapshot';

import {
useNetwork,
} from '@/components/networkConnection/NetworkContext';

type NativeAudioFile = {
uri: string;
name: string;
type: string;
size?: number;
};

export function useVoiceRecorder(
socketRef: any,
chatId: number | null,
currentUser: any,
setMessages: any,
replyingTo: any,
setReplyingTo: (v: any) => void,
chatType:
| 'private'
| 'community' = 'private',
) {

const {
canCommunicate,
networkStatus,
connectionType,
} = useNetwork();

/*

* Native Expo audio recorder.
* 
* RecordingPresets.HIGH_QUALITY gives us
* a native AAC/M4A recording rather than
* browser WebM/MediaRecorder output.
  */
  const recorder =
  useAudioRecorder(
  RecordingPresets.HIGH_QUALITY
  );

const recorderState =
useAudioRecorderState(
recorder,
100
);

const [isRecording, setIsRecording] =
useState(false);

const [isPaused, setIsPaused] =
useState(false);

const [waveform, setWaveform] =
useState<number[]>([]);

/*

* Native recordings are files on the
* device, so previewBlob becomes a URI.
* 
* The property name is kept as previewBlob
* to minimize changes to existing callers.
  */
  const [previewBlob, setPreviewBlob] =
  useState<string | null>(null);

const [duration, setDuration] =
useState(0);

const waveformRef =
useRef<number[]>([]);

const isRecordingRef =
useRef(false);

const isPausedRef =
useRef(false);

const cancellingRef =
useRef(false);

const sendAfterStopRef =
useRef(false);

const stoppedBySendRef =
useRef(false);

const durationRef =
useRef(0);

const previewUriRef =
useRef<string | null>(null);

const sendingRef =
useRef(false);

/*

* expo-audio exposes recorder metering
* through useAudioRecorderState().
* 
* Metering is in dBFS, approximately
* -160 to 0. Convert it to 0..1.
  */
  useEffect(() => {

if (
  !isRecordingRef.current ||
  isPausedRef.current
) {
  return;
}

const metering =
  recorderState.metering;

if (
  typeof metering !== 'number' ||
  !Number.isFinite(metering)
) {
  return;
}

const normalized =
  Math.max(
    0,
    Math.min(
      1,
      (metering + 60) / 60
    )
  );

const amplified =
  Math.min(
    1,
    normalized * 1.5
  );

waveformRef.current.push(
  amplified
);

if (
  waveformRef.current.length > 60
) {
  waveformRef.current.shift();
}

setWaveform([
  ...waveformRef.current,
]);

}, [
recorderState.metering,
]);

/*

* Keep duration synchronized with
* the native recorder.
  */
  useEffect(() => {

if (
  !recorderState.isRecording &&
  !isRecordingRef.current
) {
  return;
}

const seconds =
  Math.floor(
    recorderState.durationMillis /
    1000
  );

durationRef.current =
  seconds;

setDuration(
  seconds
);

}, [
recorderState.durationMillis,
recorderState.isRecording,
]);

/*

* Configure microphone/audio mode once.
  */
  useEffect(() => {

const configureAudio =
  async () => {

    try {

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

    } catch (error) {

      console.error(
        'Failed to configure audio:',
        error
      );

    }
  };

configureAudio();

}, []);

const sendMessageByChatType =
async (
message: Partial<Message>
) => {

  const params = {
    message,
    currentUser,
    socketRef,
    setMessages,
    canCommunicate,
    networkStatus,
    connectionType,
  };

  if (
    chatType === 'community'
  ) {
    return sendCommunityMessage(
      params
    );
  }

  return sendChatMessage(
    params
  );
};

const createNativeAudioFile =
(
uri: string
): NativeAudioFile => ({
uri,
name: 'voice.m4a',
type: 'audio/mp4',
});

const sendAudioOptimistic =
async (
file: NativeAudioFile,
existingClientId?: string,
finalDuration?: number,
replySnapshotOverride?: any,
) => {

  if (!chatId) {
    return;
  }

  const client_id =
    existingClientId ??
    `voice-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

  const replySnapshot =
    replySnapshotOverride ??
    createReplySnapshot(
      replyingTo
    );

  const clientCreatedAt =
    new Date().toISOString();

  const audioDuration =
    finalDuration ??
    durationRef.current;

  await sendMessageByChatType({
    client_id,

    chat:
      chatId,

    ...(chatType === 'community'
      ? {
          communityId:
            chatId,

          community:
            chatId,
        }
      : {}),

    sender:
      currentUser.id,

    media_type:
      'audio',

    media_source:
      'upload',

    encrypted_text:
      '',

    caption:
      '',

    client_created_at:
      clientCreatedAt,

    created_at:
      clientCreatedAt,

    media_url:
      [],

    thumbnail:
      [],

    duration:
      [audioDuration],

    waveform:
      [
        ...waveformRef.current,
      ],

    reply_to:
      replySnapshot,

    reply_to_id:
      replySnapshot?.id ??
      null,

    reply_to_client_id:
      replySnapshot?.client_id ??
      null,

    /*
     * Native file object.
     *
     * No browser File/Blob is used.
     */
    files:
      [file],

    status:
      'pending',

    upload_progress:
      0,
  });
};

const resetRecordingState =
() => {

  waveformRef.current =
    [];

  setWaveform([]);

  durationRef.current =
    0;

  setDuration(0);

  previewUriRef.current =
    null;

  setPreviewBlob(null);

  setIsRecording(false);

  setIsPaused(false);

  isRecordingRef.current =
    false;

  isPausedRef.current =
    false;

  sendAfterStopRef.current =
    false;

  stoppedBySendRef.current =
    false;
};

const startRecording =
async () => {

  if (
    recorder.isRecording
  ) {
    return;
  }

  try {

    const permission =
      await requestRecordingPermissionsAsync();

    if (!permission.granted) {

      Alert.alert(
        'Microphone permission required',
        'Allow Tribe to access your microphone to record voice messages.'
      );

      return;
    }

    setPreviewBlob(null);

    previewUriRef.current =
      null;

    setDuration(0);

    durationRef.current =
      0;

    setIsPaused(false);

    isPausedRef.current =
      false;

    waveformRef.current =
      [];

    setWaveform([]);

    cancellingRef.current =
      false;

    sendAfterStopRef.current =
      false;

    stoppedBySendRef.current =
      false;

    await recorder.prepareToRecordAsync();

    recorder.record();

    isRecordingRef.current =
      true;

    setIsRecording(true);

  } catch (error) {

    console.error(
      '❌ Failed to start recording:',
      error
    );

    isRecordingRef.current =
      false;

    setIsRecording(false);

    Alert.alert(
      'Recording failed',
      'Unable to start voice recording.'
    );
  }
};

const stopRecording =
async () => {

  if (
    !recorder.isRecording
  ) {
    return;
  }

  try {

    isRecordingRef.current =
      false;

    isPausedRef.current =
      false;

    setIsRecording(false);

    setIsPaused(false);

    await recorder.stop();

    const uri =
      recorder.uri;

    if (!uri) {
      console.error(
        'Recording stopped without a URI.'
      );

      return;
    }

    previewUriRef.current =
      uri;

    /*
     * The native file URI is used instead
     * of a browser Blob.
     */
    setPreviewBlob(uri);

    const finalDuration =
      Math.max(
        1,
        Math.floor(
          recorder.currentTime
        )
      );

    durationRef.current =
      finalDuration;

    setDuration(
      finalDuration
    );

    if (
      cancellingRef.current
    ) {

      cancellingRef.current =
        false;

      resetRecordingState();

      return;
    }

    if (
      sendAfterStopRef.current
    ) {

      sendAfterStopRef.current =
        false;

      stoppedBySendRef.current =
        true;

      const file =
        createNativeAudioFile(
          uri
        );

      await sendAudioOptimistic(
        file,
        undefined,
        finalDuration
      );

      waveformRef.current =
        [];

      setWaveform([]);

      resetRecordingState();

      return;
    }

  } catch (error) {

    console.error(
      '❌ Failed to stop recording:',
      error
    );

    resetRecordingState();
  }
};

const sendRecording =
async () => {

  if (
    sendingRef.current
  ) {
    return;
  }

  sendingRef.current =
    true;

  sendAfterStopRef.current =
    true;

  try {

    await stopRecording();

  } finally {

    sendingRef.current =
      false;
  }
};

const resendMessage =
async (
msg: Message
) => {

  if (
    msg.media_type !==
    'audio'
  ) {
    return;
  }

  try {

    let file:
      NativeAudioFile | null =
      null;

    /*
     * Native cached file.
     */
    const existingFile =
      msg.files?.[0] as any;

    if (
      existingFile?.uri
    ) {

      file = {
        uri:
          existingFile.uri,

        name:
          existingFile.name ??
          'voice.m4a',

        type:
          existingFile.type ??
          'audio/mp4',

        size:
          existingFile.size,
      };

    /*
     * Existing remote media.
     *
     * Do NOT fetch it into a Blob.
     * React Native can upload/use the URI
     * directly through the native upload layer.
     */
    } else if (
      msg.media_url?.length
    ) {

      file = {
        uri:
          msg.media_url[0],

        name:
          'voice.m4a',

        type:
          'audio/mp4',
      };

    } else {

      throw new Error(
        'Audio source unavailable.'
      );
    }

    setMessages(
      (prev: Message[]) =>
        prev.map(
          (m: Message) =>
            m.client_id ===
            msg.client_id
              ? {
                  ...m,
                  status:
                    'sending',

                  upload_progress:
                    0,
                }
              : m
        )
    );

    if (
      chatType ===
      'community'
    ) {

      await updateCommunityMessage(
        msg.client_id,
        currentUser.id,
        {
          status:
            'sending',

          upload_progress:
            0,
        }
      );

    } else {

      await updateMessage(
        msg.client_id,
        currentUser.id,
        {
          status:
            'sending',

          upload_progress:
            0,
        }
      );
    }

    await sendAudioOptimistic(
      file,
      msg.client_id,
      Array.isArray(
        msg.duration
      )
        ? msg.duration[0]
        : msg.duration,
      msg.reply_to
    );

  } catch (error) {

    console.error(
      '❌ Failed to resend audio:',
      error
    );

    setMessages(
      (prev: Message[]) =>
        prev.map(
          (m: Message) =>
            m.client_id ===
            msg.client_id
              ? {
                  ...m,
                  status:
                    'failed',
                }
              : m
        )
    );
  }
};

const cancelRecording =
async () => {

  cancellingRef.current =
    true;

  sendAfterStopRef.current =
    false;

  try {

    if (
      recorder.isRecording
    ) {

      await recorder.stop();
    }

  } catch (error) {

    console.error(
      'Failed to cancel recording:',
      error
    );

  } finally {

    resetRecordingState();
  }
};

const pauseRecording =
() => {

  if (
    recorder.isRecording
  ) {

    recorder.pause();

    isPausedRef.current =
      true;

    isRecordingRef.current =
      false;

    setIsPaused(true);

    /*
     * Keep isRecording true at the UI
     * level because the recorder session
     * still exists and can resume.
     */
    setIsRecording(true);
  }
};

const resumeRecording =
() => {

  if (
    !recorder.isRecording &&
    !isPausedRef.current
  ) {
    return;
  }

  try {

    recorder.record();

    isPausedRef.current =
      false;

    isRecordingRef.current =
      true;

    setIsPaused(false);

    setIsRecording(true);

  } catch (error) {

    console.error(
      'Failed to resume recording:',
      error
    );
  }
};

const togglePause =
() => {

  if (isPaused) {
    resumeRecording();
  } else {
    pauseRecording();
  }
};

/*

* Cleanup if the component
* containing this hook unmounts.
  */
  useEffect(() => {

return () => {

  isRecordingRef.current =
    false;

  isPausedRef.current =
    false;

  if (
    recorder.isRecording
  ) {

    recorder.stop().catch(
      () => {}
    );
  }

};

}, [recorder]);

return {
isRecording,

duration,

startRecording,

stopRecording,

resendMessage,

cancelRecording,

waveform,

previewBlob,

sendRecording,

pauseRecording,

resumeRecording,

isPaused,

togglePause,

};
}