'use strict';
// @depends on vk.js
// Saves options to localStorage.
function save_options () {
    var showBitrate = document.querySelectorAll('.showBitrate');
    for (var i = 0 ; i < showBitrate.length ; i++) {
        if (showBitrate[i].checked) {
            localStorage["showBitrate"] = showBitrate[i].value;
            break;
        }
    }

    /*var replacePlayButton = document.querySelector("#downloadButtonStyle").checked;
    localStorage.downloadButtonStyle = replacePlayButton ? "replacePlayButton" : "addNewButton";*/
    localStorage.audioDownloadFolder = document.querySelector('#audioDownloadFolder').value;
    localStorage.videoDownloadFolder = document.querySelector('#videoDownloadFolder').value;
    // Update status to let user know options were saved.
    var status = document.getElementById("status");
    status.innerHTML = "Сохранено!";
    setTimeout(function () {
        status.innerHTML = "";
    }, 750);
}

// Restores select box state to saved value from localStorage.
function restore_options () {
    var showBitrate = document.querySelectorAll('.showBitrate');
    for (var i = 0 ; i < showBitrate.length ; i++) {
        if (showBitrate[i].value == localStorage["showBitrate"]) {
            showBitrate[i].checked = true;
            break;
        }
    }

    document.querySelector('#audioDownloadFolder').value = localStorage.audioDownloadFolder?localStorage.audioDownloadFolder:"VK audio";
    document.querySelector('#videoDownloadFolder').value = localStorage.videoDownloadFolder?localStorage.videoDownloadFolder:"VK audio/video";
}
document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);

