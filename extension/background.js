var devtoolsRegEx = /^chrome-devtools:\/\//;
var connections = {};
var steps = {};

var CORE_API_BASE_URL = "https://api.flowdash.ai/";
var WALKTHROUGH_URL_PREFIX = "walkthrough/";

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
  };

  port.onMessage.addListener(extensionListener);

  port.onDisconnect.addListener(function (port) {
    port.onMessage.removeListener(extensionListener);

    var tabs = Object.keys(connections);
    for (var i = 0, len = tabs.length; i < len; i++) {
      if (connections[tabs[i]] == port) {
        delete connections[tabs[i]];
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
    if (message.name === "replay-captures") {
      message.steps = steps;
      messageToContentScript(message);
    } else if (message.name === "publish") {
      publish();
    } else if (message.name === "login") {
      console.log("TEST login", message);
      login();
    }
  }
  return true;
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "1",
    title: "Capture as a step in Flowdash",
    type: "normal",
    contexts: ["all"],
  });
  chrome.storage.sync.remove(["mode", "apiKey", "guid"], function (Items) {});
});

chrome.contextMenus.onClicked.addListener(function (event) {
  if (event.menuItemId === "1") {
    console.log(
      "DEBUG",
      "backgroundScript",
      "This works. Call api here.",
      event
    );
    // TODO - Generate Xpath here in contentScript context.
    // Use that Xpath and save it in the database.
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { name: "capture-step" },
        function (response) {
          console.log("capture-step response", response);
          let step = {
            screenId: tabs[0].url,
            view: {
              tooltipStyle: {
                actionView: {
                  backgroundColor: "#3d72dc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  "max-width": 90,
                  height: 30,
                  borderRadius: 4,
                },
                wrapper: {
                  borderColor: "#ffffff",
                  borderWidth: 1,
                  borderRadius: 5,
                  zIndex: 4,
                },
                actionText: { color: "white" },
                skipActionText: {
                  fontSize: 16,
                  color: "rgb(217 217 217)",
                  fontWeight: "bold",
                },
                skipAction: {
                  bottom: 58,
                  left: 15,
                  zIndex: 2,
                  fontSize: 16,
                  fontWeight: "bold",
                  position: "absolute",
                },
                primaryText: {
                  top: 113.61904999999999,
                  left: 17.142857,
                  color: "#747474",
                  fontSize: 16,
                },
                secondaryText: {
                  top: "113.61904999999999px",
                  left: "17.142857px",
                  color: "#747474",
                  "font-size": "16px",
                },
                focussedView: {
                  top: 143.61905,
                  left: 17.142857,
                  width: 115.04762,
                  height: 115.04762,
                },
                indexView: { color: "#747474" },
                tooltip: { backgroundColor: "#1a237e" },
              },
              content: {
                skipAction: "Skip",
                actionText: "Next",
                primaryText: "Text describing this view",
                secondaryText: "Elaborate text",
              },
            },
            id: response,
          };
          let temp = steps[tabs[0].url] || [];
          steps[tabs[0].url] = temp.concat(step);
          console.log("Steps as of now:", steps);
        }
      );
    });
  }
});

// var login = function () {
//     chrome.identity.getAuthToken({
//         interactive: true
//     }, function (token) {
//         if (chrome.runtime.lastError) {
//             alert(chrome.runtime.lastError.message);
//             return;
//         }
//         var x = new XMLHttpRequest();
//         x.open('GET', 'https://www.googleapis.com/oauth2/v2/userinfo?alt=json&access_token=' + token);
//         x.onload = function () {
//             var userDetails = JSON.parse(x.response);
//             var postLogin = new XMLHttpRequest();
//             postLogin.open('POST', 'https://api.flowdash.ai/login?email=' + userDetails.email);
//             postLogin.onload = function () {
//                 let data = JSON.parse(postLogin.response);
//                 if (data.data && data.data.apiKey && data.data.guid) {
//                     chrome.storage.sync.set({ apiKey: data.data.apiKey, guid: data.data.guid }, function () {
//                         console.log("Credentials stored");
//                     });
//                     chrome.runtime.sendMessage({
//                         msg: "login-success",
//                     });
//                 }
//                 else {
//                     alert("Hmm. Seems like you do not have access yet. Please sign in to Chrome with an email that does or signup for access at https://flowdash.ai!")
//                 }
//             }
//             postLogin.send(JSON.stringify({ userDetails: userDetails }));
//         };
//         x.send();
//     });
// }

var publish = function () {
  chrome.storage.sync.get(["apiKey", "guid"], function (data) {
    console.log("Credentials found:", data);
    if (data.apiKey && data.guid) {
      let ownerId = data.guid;
      let apiKey = data.apiKey;

      var requestOptions = {
        mode: "cors",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_key: apiKey,
        },
      };
      let fetchURL = new URL(
        CORE_API_BASE_URL + WALKTHROUGH_URL_PREFIX + `${ownerId}`
      );
      var data = [];
      for (let [key, value] of Object.entries(steps)) {
        data = data.concat([{ screenId: key, steps: value }]);
      }
      console.log("Steps as of now:", data);
      console.log({ data: JSON.stringify(data) });
      fetchURL.search = new URLSearchParams({
        data: JSON.stringify(data),
      }).toString();

      fetch(fetchURL, requestOptions)
        .then((response) => response)
        .then((result) => {
          console.log("Saved successfully.", result);
        })
        .catch((error) => {
          console.log("error", error);
        });
    }
  });
};
