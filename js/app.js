const installButtons = Array.from(document.querySelectorAll('.install-trigger'));
let deferredPrompt = null;

function updateInstallButtons(visible) {
  installButtons.forEach(button => {
    button.classList.toggle('hidden', !visible);
  });
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event;
  updateInstallButtons(true);
});

window.addEventListener('appinstalled', () => {
  updateInstallButtons(false);
});

installButtons.forEach(button => {
  button.addEventListener('click', async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    deferredPrompt = null;
    updateInstallButtons(false);

    if (choiceResult.outcome === 'accepted') {
      button.textContent = 'Installed';
    }
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(error => {
        console.error('Service worker registration failed:', error);
      });
  });
}
