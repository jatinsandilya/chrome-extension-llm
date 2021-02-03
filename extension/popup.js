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
function replay() {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        var activeTab = tabs[0];
        chrome.runtime.sendMessage({
            name: "replay-captures",
            tabId: activeTab.id,
        });
    });
}
function publish() {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        var activeTab = tabs[0];
        chrome.runtime.sendMessage({
            name: "publish",
            tabId: activeTab.id,
        });
    });
}
function login() {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        var activeTab = tabs[0];
        chrome.runtime.sendMessage({
            name: "login",
            tabId: activeTab.id,
        });
    });
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("mode").addEventListener("click", popup);
    document.getElementById("replay").addEventListener("click", replay);
    document.getElementById("signin").addEventListener("click", login);
    document.getElementById("publish").addEventListener("click", publish);
});

function hideLogin(data) {
    document.getElementById("mode").style.display = 'block';
    document.getElementById("replay").style.display = 'block';
    document.getElementById("publish").style.display = 'block';
    document.getElementById("signin").style.display = 'none';
    document.getElementById("clear").style.display = 'block';
    document.getElementById("capture").style.display = 'flex'; 
    if (data) {
        document.getElementById("mode").checked = data.mode;
    }
}
function showLogin() {
    document.getElementById("signin").style.display = 'block';
    document.getElementById("mode").style.display = 'none';
    document.getElementById("replay").style.display = 'none';
    document.getElementById("publish").style.display = 'none';
    document.getElementById("clear").style.display = 'none';
    document.getElementById("capture").style.display = 'none'; 
}

window.onload = function () {
    chrome.storage.sync.get(['mode', 'apiKey', 'guid'], function (data) {
        console.log("Capturing mode: ", data);
        if (data.apiKey && data.guid) {
            hideLogin(data);
        }
        else {
            showLogin(data);
        }
    });
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.msg === "login-success") {
            hideLogin();
        }
    }
);