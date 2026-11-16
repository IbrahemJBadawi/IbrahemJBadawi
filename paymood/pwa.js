(() => {
  "use strict";

  const panel = document.createElement("div");
  panel.className = "techmood-pwa";
  panel.setAttribute("aria-label", "خيارات التطبيق");
  panel.innerHTML = '<button type="button" id="tm-install">تثبيت التطبيق</button><button type="button" id="tm-notify">تجربة إشعار</button><span id="tm-connectivity" role="status" aria-live="polite" hidden></span>';
  document.body.appendChild(panel);

  const installButton = panel.querySelector("#tm-install");
  const notificationButton = panel.querySelector("#tm-notify");
  const connectivity = panel.querySelector("#tm-connectivity");
  let installEvent = null;

  const installed = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const updateConnectivity = () => {
    connectivity.hidden = navigator.onLine;
    connectivity.textContent = navigator.onLine ? "" : "تصفح دون إنترنت — ستعمل الصفحات المحفوظة فقط";
  };
  updateConnectivity();
  window.addEventListener("online", updateConnectivity);
  window.addEventListener("offline", updateConnectivity);

  if (installed()) installButton.hidden = true;
  window.addEventListener("appinstalled", () => { installEvent = null; installButton.hidden = true; });
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installEvent = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (installEvent) {
      const prompt = installEvent;
      installEvent = null;
      await prompt.prompt();
      await prompt.userChoice;
      return;
    }
    const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.alert(isApple
      ? "من Safari افتح زر المشاركة ثم اختر «إضافة إلى الشاشة الرئيسية»."
      : "من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» إن كان الخيار متاحاً.");
  });

  notificationButton.addEventListener("click", async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      window.alert("الإشعارات غير مدعومة في هذا المتصفح. جرّب تثبيت التطبيق عبر Chrome أو Safari الحديث.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      window.alert("لم يُسمح بالإشعارات. يمكن تغيير الإذن من إعدادات المتصفح.");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(document.title.split("|")[0].trim(), {
        body: "هذا إشعار تجريبي على جهازك، وليس إشعاراً من الخادم.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        dir: "rtl",
        lang: "ar",
        data: { url: "/" }
      });
    } catch {
      window.alert("سُمح بالإشعارات، لكن تعذّر عرض الإشعار التجريبي.");
    }
  });

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await registration.update();
      } catch {
        connectivity.hidden = false;
        connectivity.textContent = "تعذّر تفعيل التصفح دون إنترنت على هذا الجهاز";
      }
    });
  }
})();
