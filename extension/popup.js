function popup() {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        var activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {
            name: "capture-on",
        });
    });
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", popup);
});