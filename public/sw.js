self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "J L CRM", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "J L CRM";
  const options = {
    body: data.body || "",
    icon: "/jl-icon-192.png",
    badge: "/jl-icon-192.png",
    data: { url: data.url || "/" },
  };
  const conteo = Number(data.badge) > 0 ? Number(data.badge) : 1;
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Globito rojo en el ícono de la app (iOS 16.4+ PWA instalada)
      "setAppBadge" in self.navigator
        ? self.navigator.setAppBadge(conteo).catch(() => {})
        : Promise.resolve(),
    ])
  );
});

// La app avisa cuando se abre para quitar el globito
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_BADGE" && "clearAppBadge" in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url.includes(self.location.origin) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});