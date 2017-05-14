"use strict";

// show widget only when there is no audios to download
var oneAudioTemplate =
    "<div class='one-pending-audio'>  " +
    "   <span class='full_title'><span class='artist'>$artist</span>  –  <span class='title'>$title</span></span> <span class='audio_remove'></span>" +
    "</div>";
var pendingAudiosDiv = document.querySelector('#pending_audios');

// обновляем список на закачку

function removeAudioFromOptionsPage(oneAudio) {
    removeAudioFromQueue(oneAudio.myAudio);
    oneAudio.dataset.removed = true;
    oneAudio.title = 'Вернуть трек в очередь на закачку';
    oneAudio.classList.add('removed_audio');
}

function removeAudio (url) {
    removeAudioFromQueue({url : url});
}

function clearQueueLink() {
    var list = document.querySelectorAll('.one-pending-audio');
    for (let i=0;i<list.length;i++) {
        removeAudioFromOptionsPage(list[i].parentNode);
    }
    clearQueue();
}
var tabs = document.querySelectorAll('.tab');
for (let i = 0 ; i < tabs.length ; i++) {
    let tab = tabs[i];
    tab.addEventListener('click', function() {
        let divId = tab.id.replace('link_', '');
        let contents = document.querySelectorAll('.tab_content');
        document.querySelector('.selected').classList.remove('selected');
        tab.classList.add('selected');
        for (let j = 0; j < contents.length; j++ ) {
            let content = contents[j];
            if (content.id != divId) {
                content.style.display = 'none';
            } else {
                content.style.display = '';
            }
        }
    })
}