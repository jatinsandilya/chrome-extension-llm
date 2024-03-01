var addAttribute = function (element, attrName, attributeValue) {
  try {
    element.setAttribute(attrName, attributeValue);
  } catch (err) {
    return;
  }
};
var removeAttribute = function (element, attributeName, onChange) {
  if (onChange) {
    attributeName = attributeName.includes("XPath") ? "CSS" : "XPath";
  }
  try {
    element.removeAttribute(attributeName);
    element.style.outline = "";
  } catch (err) {
    return;
  }
};
var debounce = function (func, delay) {
  let inDebounce;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(function () {
      func.apply(context, args);
    }, delay);
  };
};

function generateXPath(element) {
  if (element.id !== "") {
    return 'id("' + element.id + '")';
  }
  if (element === document.body) {
    return element.tagName;
  }
  var ix = 0;
  var siblings = element.parentNode.childNodes;
  for (var i = 0; i < siblings.length; i++) {
    var sibling = siblings[i];
    if (sibling === element) {
      return (
        generateXPath(element.parentNode) +
        "/" +
        element.tagName +
        "[" +
        (ix + 1) +
        "]"
      );
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
}

function isLeafNode(node) {
  return (
    node.nodeType === 1 &&
    !Array.from(node.childNodes).some((child) => child.nodeType === 1)
  );
}

function traverseDOM(node, map) {
  if (isLeafNode(node)) {
    var textContent = node.textContent.trim();
    if (textContent !== "" && document.body.innerText.includes(textContent)) {
      var xpath = generateXPath(node);
      map[xpath] = textContent;
    }
  } else {
    node.childNodes.forEach(function (child) {
      traverseDOM(child, map);
    });
  }
}

function setElementTextByXPath(xpath, newText) {
  var evaluator = new XPathEvaluator();
  var result = evaluator.evaluate(
    xpath,
    document.documentElement,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );

  if (result.singleNodeValue) {
    result.singleNodeValue.textContent = newText;
  } else {
    console.warn("Element not found for XPath:", xpath);
  }
}

async function queryOpenAI(apiKey, model, messages) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      response_format: { type: "json_object" },
      messages: messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

var oldNodes = [];
var allNodes = [];
var prevCapture;
var currentStep = 0;

var highlightElements = function (xpathOrCss, xpath, onChange) {
  var elements;
  try {
    if (xpathOrCss === "XPath") {
      elements = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      ); //xpath
    } else {
      elements = document.querySelectorAll(xpath); //css
    }
  } catch (err) {
    if (xpath) {
      chrome.runtime.sendMessage({ count: "wrongXpath" });
    } else {
      chrome.runtime.sendMessage({ count: "blank" });
    }
    for (var i = 0; i < oldNodes.length; i++) {
      removeAttribute(oldNodes[i], xpathOrCss, onChange);
    }
    oldNodes = [];
    allNodes = [];
    return;
  }

  var totalMatchFound, node;
  if (xpathOrCss === "XPath") {
    totalMatchFound = elements.snapshotLength; //xpath
  } else {
    totalMatchFound = elements.length; //css
  }

  for (var i = 0; i < oldNodes.length; i++) {
    removeAttribute(oldNodes[i], xpathOrCss, onChange);
  }
  oldNodes = [];
  allNodes = [];

  chrome.runtime.sendMessage({ count: totalMatchFound });

  for (var i = 0; i < totalMatchFound; i++) {
    if (xpathOrCss === "XPath") {
      node = elements.snapshotItem(i); //xpath
    } else {
      node = elements[i]; //css
    }
    if (
      i === 0 &&
      !(
        xpath === "/" ||
        xpath === "." ||
        xpath === "/." ||
        xpath === "//." ||
        xpath === "//.."
      )
    ) {
      node.scrollIntoViewIfNeeded();
    }
    oldNodes.push(node);
    addAttribute(node, xpathOrCss, i + 1);
    allNodes.push(node.outerHTML);
  }
  chrome.runtime.sendMessage({ count: allNodes });
};

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log(
    "DEBUG: contentScript",
    message,
    message.name,
    message.name === "capture-on"
  );
  if (message.xpath || message.xpath === "") {
    highlightElements(message.xpath[0], message.xpath[1], message.xpath[2]);
  }
  if (message.name === "xpath") {
    var ele = document.querySelector('[xpath="' + message.index + '"]');
    if (ele) {
      ele.style.outline = "2px dotted orangered";
      ele.scrollIntoViewIfNeeded();
    }
  }
  if (message.name === "xpath-remove") {
    var ele = document.querySelector('[xpath="' + message.index + '"]');
    if (ele) {
      ele.style.outline = "";
    }
  }
  if (message.name === "css") {
    var ele = document.querySelector('[css="' + message.index + '"]');
    if (ele) {
      ele.style.outline = "2px dotted orangered";
      ele.scrollIntoViewIfNeeded();
    }
  }
  if (message.name === "css-remove") {
    var ele = document.querySelector('[css="' + message.index + '"]');
    if (ele) {
      ele.style.outline = "";
    }
  }
  if (message.name === "capture-on") {
    console.log("DEBUG: contentScript", "Executing this.");
    // Call the open ai api here.
    var domMap = {};
    traverseDOM(document.body, domMap);

    const domList = Object.entries(domMap)
      .map((entry, index) => [index, entry[1]])
      .slice(0);
    const domListWithKey = Object.entries(domMap)
      .map((entry, index) => [index, entry[0]])
      .slice(0);

    // Example usage:
    const OPENAI_API_KEY = ""; // Replace with your open ai key
    const model = "gpt-4-turbo-preview";
    const messages = [
      {
        role: "system",
        content: `These are the text elements extracted from the DOM, formatted as (index, text). 
      Make all content about clowns.
      You need to output a json of tuples in the format (index, updatedText) only for the text that you update. 
      Json key should always have the root element with name 'output' `,
      },
      {
        role: "user",
        content: JSON.stringify(domList.slice(2)),
      },
    ];

    queryOpenAI(OPENAI_API_KEY, model, messages)
      .then((data) => {
        console.log(data);
        console.log("result from open ai", data.choices[0].message.content);
        const updatedMap = JSON.parse(data.choices[0].message.content).output;
        findAndReplace(updatedMap, domListWithKey);
      })
      .catch((error) => console.error(error));
  }
  if (message.name === "capture-off") {
    document.body.onmouseover = null;
    if (prevCapture) {
      if (typeof prevCapture.className === "string") {
        prevCapture.className = prevCapture.className.replace(
          /\bflowdash-capture-highlight\b/,
          ""
        );
      }
    }
  }
  if (message.name === "capture-step") {
    let absoluteXPath = generateXpath(prevCapture);
    sendResponse(absoluteXPath);
  }
  if (message.name === "replay-captures") {
    highlightElements("XPath", message.steps[currentStep], false);
    currentStep++;
  }
});

function findAndReplace(updatedMap, domListWithKey) {
  updatedMap.forEach(([index, updatedText]) => {
    const xpath = domListWithKey[index][1];
    setElementTextByXPath(xpath, updatedText);
  });
}

function generateXpath(element) {
  if (element.id !== "") return 'id("' + element.id + '")';
  if (element.tagName == "html") return "/html[1]";
  if (element === document.body) return "/html[1]/body[1]";

  var ix = 0;
  var siblings = element.parentNode.childNodes;
  for (var i = 0; i < siblings.length; i++) {
    var sibling = siblings[i];
    if (sibling === element)
      return (
        generateXpath(element.parentNode) +
        "/" +
        element.tagName.toLowerCase() +
        "[" +
        (ix + 1) +
        "]"
      );
    if (
      sibling.nodeType === 1 &&
      sibling.tagName.toLowerCase() === element.tagName.toLowerCase()
    )
      ix++;
  }
}

function generateCSS(el) {
  if (!(el instanceof Element)) return;
  var path = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    var selector = el.nodeName.toLowerCase();
    if (el.id) {
      path.unshift("#" + el.id);
      break;
    } else if (el.className) {
      path.unshift("." + el.className.trim().replace(/\s+/g, "."));
      break;
    } else {
      var sib = el,
        nth = 1;
      while ((sib = sib.previousElementSibling)) {
        if (sib.nodeName.toLowerCase() == selector) nth++;
      }
      if (nth != 1) selector += ":nth-of-type(" + nth + ")";
    }
    path.unshift(selector);
    el = el.parentNode;
  }
  return path.join(">");
}
