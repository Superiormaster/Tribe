self.addEventListener(
  "push",
  event => {
    console.log("📲 PUSH EVENT");
    const payload =
      event.data?.json() ||
      {};

    const notification =
      payload.notification ||
      {};

    const data =
      payload.data || {};

    const options = {
      body:
        notification.body ||
        "",

      icon:
        "/icon-192.png",

      badge:
        "/badge.png",

      image: data.thumbnail || data.communityCover || notification.image || "",

      data,
    };

    event.waitUntil(
      self.registration.showNotification(
        notification.title ||
          "Tribe",
        options
      )
    );
  }
);

self.addEventListener(
  "notificationclick",
  event => {
    console.log("📲 Notification clicked");
    console.log(event.notification.data);
    event.notification.close();

    const data =
      event.notification.data;

    let url =
      "/main";

    switch (
      data.type
    ) {
      case "chat":
        url =
          `/main/messages/chat/${data.chatId}`;
        break;

      case "like":
      case "comment":
      case "star":
      case "connection_request":
        url =
          "/main/notification";
        break;

      default:
        url =
          "/main/home";
    }

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
        })
        .then(
          clientList => {
            for (
              const client of clientList
            ) {
              if (
                client.url.includes(
                  url
                )
              ) {
                return client.focus();
              }
            }

            return clients.openWindow(
              url
            );
          }
        )
    );
  }
);