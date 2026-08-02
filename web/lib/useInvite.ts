// lib/useInvite.ts

export function useInvite() {
  async function inviteFriends() {
    const url = "https://tribe-app.app";

    const response = await fetch("https://tribe-app.app/advert_PWAFacebook.png");
    const blob = await response.blob();

    const file = new File(
      [blob],
      "advert_PWAFacebook.png",
      {
        type: "image/png",
      }
    );

    const shareData = {
      title: "Tribe",
      text: `🚀 Tribe Is Finally Here!

Find your tribe, join communities, chat, watch reels and make new friends.

Download now:
${url}`,
      url,
      files: [file],
    };

    try {
      if (
        navigator.canShare &&
        navigator.canShare({
          files: [file],
        })
      ) {
        await navigator.share(shareData);
      } else {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url,
        });
      }

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