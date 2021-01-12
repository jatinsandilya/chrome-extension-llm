function popup(event) {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        var activeTab = tabs[0];
        if (event.target.checked) {
            chrome.storage.sync.set({ mode: true }, function () {
                console.log("Capturing is on.");
            });
            chrome.tabs.sendMessage(activeTab.id, {
                name: "capture-on",
            });
        } else {
            chrome.storage.sync.set({ mode: false }, function () {
                console.log("Capturing is off.");
            });
            chrome.tabs.sendMessage(activeTab.id, {
                name: "capture-off",
            });
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", popup);
});

window.onload = function () {
    chrome.storage.sync.get('mode', function (data) {
        console.log("Capturing mode: ", data);
        document.getElementById("mode").checked = data.mode;
    });
}