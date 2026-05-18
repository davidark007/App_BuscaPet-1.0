/* global clients */

self.addEventListener("install", () => {
    console.log("Service Worker instalado");
});

self.addEventListener("notificationclick", function(event) {

    event.notification.close();

    event.waitUntil(
        clients.openWindow("/")
    );

});
