settings = [];
if (!chrome.runtime) {
    // Chrome 20-3
    chrome.runtime = chrome.extension;
} else if (!chrome.runtime.onMessage && chrome.extension) {
    // Chrome 22-25
    chrome.runtime.sendMessage = chrome.extension.sendMessage;
    chrome.runtime.onConnect = chrome.extension.onConnect;
    chrome.runtime.connect = chrome.extension.connect;
}

(function () {
    chrome.runtime.sendMessage({type : "getVkdSettings"}, function (response) {
        injectScript("vkdId ='" + chrome.runtime.id + "';", 'body', true);
        injectScript("extensionsURL = '" +chrome.extension.getURL("")+ "';", 'body', true);
        injectScript("vkd_settings =JSON.parse('" + JSON.stringify(response.vkd_settings) + "')", 'body', true);
        injectScript(chrome.extension.getURL('assets/js/in_vk.js'), 'body');
    })
})();

function injectScript (file, node, inline) {
    var th = document.getElementsByTagName(node)[0];
    var s = document.createElement('script');
    s.charset = "UTF-8";
    s.setAttribute('type', 'text/javascript');
    if (!inline) {
        s.setAttribute('src', file);
    } else {
        s.innerText = file;
    }
    th.appendChild(s);
}