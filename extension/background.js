var devtoolsRegEx = /^chrome-devtools:\/\//;
var connections = {};

var messageToContentScript = function (message) {
    console.log("DEBUG: backgroundScript", message);
    chrome.tabs.sendMessage(message.tabId, message);
};

chrome.runtime.onConnect.addListener(function (port) {
    var extensionListener = function (message, sender, sendResponse) {
        if (message.name == "init") {
            connections[message.tabId] = port;
            return;
        } else {
            messageToContentScript(message);
        }
    }

    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function (port) {
        port.onMessage.removeListener(extensionListener);

        var tabs = Object.keys(connections);
        for (var i = 0, len = tabs.length; i < len; i++) {
            if (connections[tabs[i]] == port) {
                delete connections[tabs[i]]
                break;
            }
        }
    });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (sender.tab) {
        if (devtoolsRegEx.test(sender.tab.url)) {
            if (message.event === "shown" || message.event === "hidden") {
                var tabId = sender.tab.id;
                if (tabId in connections) {
                    connections[tabId].postMessage(message);
                } else {
                }
            }
            messageToContentScript(message);
        } else {
            var tabId = sender.tab.id;
            if (tabId in connections) {
                connections[tabId].postMessage(message);
            } else {
            }
        }
    } else {
    }
    return true;
});


chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        id: "1",
        title: "Capture as a step in Flowdash",
        type: 'normal',
        contexts: ['all']
    });
});

chrome.contextMenus.onClicked.addListener(function (event) {
    if (event.menuItemId === "1") {
        console.log("DEBUG", "backgroundScript", "This works. Call api here.", event);
        // TODO - Generate Xpath here in contentScript context. 
        // Use that Xpath and save it in the database. 
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { name: "capture-step" }, function (response) {
                console.log("capture-step response", response);
                // Call API HERE.
            });
        });
    }
})