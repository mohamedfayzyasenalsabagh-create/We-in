// We-in push notification service worker.
// Handles incoming push messages (even while the site/app is closed) and
// shows a system notification, plus focuses/opens the app when tapped.

self.addEventListener("push", (event) => {
  let data = { title: "We-in", body: "" };
  try { if (event.data) data = event.data.json(); } catch (e) {}
  const title = data.title || "We-in";
  const options = {
    body: data.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    dir: "rtl",
    lang: "ar",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
