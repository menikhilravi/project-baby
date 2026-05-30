// Service worker for web push notifications.
// Cache-Control headers in next.config keep this file fresh on every load
// so updates roll out without manual unregister.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Baby 2026", body: event.data.text() };
  }
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/icon-192.png",
    tag: payload.tag || "baby2026",
    renotify: true,
    requireInteraction: false,
    data: { url: payload.url || "/kicks" },
  };
  event.waitUntil(
    self.registration.showNotification(payload.title || "Baby 2026", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus an existing tab on the target path if one is open.
      for (const client of allClients) {
        const url = new URL(client.url);
        if (url.pathname === target) {
          return client.focus();
        }
      }
      // Otherwise open a new one.
      return self.clients.openWindow(target);
    })(),
  );
});
