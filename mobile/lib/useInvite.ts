import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export function useInvite() {
async function inviteFriends() {
const url = 'https://tribe-app.app';

const text = `🚀 Tribe Is Finally Here!

Find your tribe, join communities, chat, watch reels and make new friends.

Download now:
${url}`;

let imageUri: string | null = null;

try {
  const imageUrl =
    'https://tribe-app.app/advert_PWAFacebook.png';

  const fileUri =
    `${FileSystem.cacheDirectory}advert_PWAFacebook.png`;

  const downloadResult =
    await FileSystem.downloadAsync(
      imageUrl,
      fileUri
    );

  if (downloadResult.status === 200) {
    imageUri = downloadResult.uri;
  }
} catch {
  console.log(
    "Couldn't load image. Sharing without it."
  );
}

try {
  const canShare =
    await Sharing.isAvailableAsync();

  if (!canShare) {
    console.log(
      'Native sharing is not available on this device.'
    );
    return false;
  }

  if (imageUri) {
    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share Tribe',
      UTI: 'public.png',
    });

    return true;
  }

  const textFileUri =
    `${FileSystem.cacheDirectory}tribe-invite.txt`;

  await FileSystem.writeAsStringAsync(
    textFileUri,
    `${text}\n`,
  );

  await Sharing.shareAsync(textFileUri, {
    mimeType: 'text/plain',
    dialogTitle: 'Share Tribe',
    UTI: 'public.plain-text',
  });

  return true;

} catch (err) {
  console.log(err);
  return false;
}

}

return {
inviteFriends,
};
}