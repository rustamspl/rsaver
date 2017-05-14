function getAudiosOnOptionsPage () {
    var ids = [];
    try {
        ids = JSON.parse(localStorage.pendingAudios);
    } catch (e) {
        localStorage.pendingAudios = JSON.stringify(ids);
    }
    return ids;
}

function _setAudiosOnOptionsPage (audios) {
    localStorage.pendingAudios = JSON.stringify(audios);
}
function addAudioToOptionsPage (audio) {
    var a = getAudiosOnOptionsPage();
    a.push(audio);
    _setAudiosOnOptionsPage(a);
    if (processQueue) {
        //from background page
        processQueue()
    } else {
        // from options page
        chrome.runtime.sendMessage({type : 'processQueue'});
    }
    var badge = a.length > 0 ? a.length.toString() : "";
    chrome.browserAction.setBadgeText({text : badge});

}

function removeAudioFromQueue (audio) {
    _setAudiosOnOptionsPage(getAudiosOnOptionsPage().filter(function (a) {
        return a.url != audio.url;
    }));
    var badge = getAudiosOnOptionsPage().length > 0 ? getAudiosOnOptionsPage().length.toString() : "";
    chrome.browserAction.setBadgeText({text : badge});
}

function clearQueue () {
    _setAudiosOnOptionsPage([]);
    chrome.browserAction.setBadgeText({text : ''});

}