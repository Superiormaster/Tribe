// lib/useInvite.ts

export function useInvite() {
  async function inviteFriends() {
    const url = "https://tribe-app.app";

    let file: File | undefined;

    try {
      const response = await fetch(
        "https://tribe-app.app/advert_PWAFacebook.png"
      );
    
      if (response.ok) {
        const blob = await response.blob();
    
        file = new File(
          [blob],
          "advert_PWAFacebook.png",
          {
            type: "image/png",
          }
        );
      }
    } catch {
      console.log("Couldn't load image. Sharing without it.");
    }
  
    const shareData: ShareData = {
      title: "Tribe",
      text: `🚀 Tribe Is Finally Here!

Find your tribe, join communities, chat, watch reels and make new friends.

Download now:
${url}`,
      url,
    };
  
    if (file) {
      shareData.files = [file];
    }

    try {
      if (
        file &&
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