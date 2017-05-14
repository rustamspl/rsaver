(function () {
    "use strict";
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

    if (!chrome.runtime) {
        // Chrome 20-21
        chrome.runtime = chrome.extension;
    } else if (!chrome.runtime.onMessage && chrome.extension) {
        // Chrome 22-25
        chrome.runtime.onMessage = chrome.extension.onMessage;
        chrome.runtime.sendMessage = chrome.extension.sendMessage;
        chrome.runtime.onMessageExternal = chrome.extension.onMessageExternal;
        chrome.runtime.onConnect = chrome.extension.onConnect;
        chrome.runtime.connect = chrome.extension.connect;
    }

    function updateAlbumList (nodesCollection) {
        var albums = nodesCollection.querySelectorAll(".audio_filter");
        for (var i = 0 ; i < albums.length ; i++) {
            if (albums[i].id.substring(0, 5) != "album" || albums[i].id == "album_add")
                continue;
            updateOneAlbum(albums[i]);
        }
    }

    function updateAlbumListNew (nodesCollection) {
        const elementToQuery = nodesCollection.parentNode || nodesCollection;
        var albums = elementToQuery.querySelectorAll(".audio_album_item");
        for (var i = 0 ; i < albums.length ; i++) {
            updateOneAlbumNew(albums[i]);
        }
    }

    function updateOneAlbum (album) {
        var downloadAllLink = document.createElement('div');
        downloadAllLink.className = "downloadAll icon_wrap";
        var icon = document.createElement('div');
        icon.className = 'icon edit';
        downloadAllLink.appendChild(icon);
        downloadAllLink.addEventListener("click", downloadAlbum(album.id.replace("album", "")));
        downloadAllLink.addEventListener("mouseover", function () {
            showTooltip(this, {text : 'Скачать весь альбом', black : 1, shift : [7, 2, 0]})
        });
        album.appendChild(downloadAllLink);
    }

    function checkHtml5Video(nodeWithEmbed) {
        return nodeWithEmbed.tagName != 'EMBED' && !nodeWithEmbed.querySelector('embed');
    }

    function updateOneAlbumNew (album) {
        if (album.tagName !== 'A') {
            album = album.querySelector('a');
        }

        //already updated
        if (album.querySelector('.downloadAllNew')){
            return;
        }
        var downloadAllLink = document.createElement('div');
        downloadAllLink.className = "downloadAllNew audio_album_btn";
        var title = album.querySelector('.audio_album_title').innerHTML;
        downloadAllLink.setAttribute('data-album',title);
        downloadAllLink.addEventListener("click", downloadAlbum(album.id.replace('ui_rmenu_audio_album_',''),title));
        downloadAllLink.addEventListener("mouseover", function () {
            showTooltip(this, {text : 'Скачать весь альбом', black : 1, shift : [7, 2, 0]})
        });
        album.querySelector('.audio_album_btns').appendChild(downloadAllLink);
    }

    if (isNewVk()) {
        updateAlbumListNew(document);
    } else {
        updateAlbumList(document);
    }

    var body = document.querySelector('body');
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'childList') {
                var full = [];
                for (var i = 0 ; i < mutation.addedNodes.length ; i++) {
                    // if audio
                    const audioClassName = isNewVk() ? "audio_row" : "audio";
                    if (hasClass(mutation.addedNodes[i], audioClassName)) {
                        updateOneAudio(mutation.addedNodes[i]);
                    } else {
                        updateLinks(mutation.addedNodes[i]);
                    }

                    if (mutation.addedNodes[i].nodeType != 1 && mutation.addedNodes[i].nodeType != 9)
                        continue;

                    if (mutation.addedNodes[i].querySelectorAll(".audio_album_item").length > 0) {
                        updateAlbumListNew(mutation.addedNodes[i]);
                    }

                    if (mutation.addedNodes[i].id == "video_player" || hasClass(mutation.addedNodes[i], 'videoplayer') || hasClass(mutation.addedNodes[i],'video_box_wrap')) {
                        updateVideoFrame(mutation.addedNodes[i]);
                    }


                }
            }

            var body = document.querySelector('body');
            observer.observe(body, {
                childList : true,
                subtree : true
            });
        });
    });
    observer.observe(body, {
        childList : true,
        subtree : true
    });

    function getAlbumInfo(full_album_id) {
        if (!isNewVk()) {
            var album = {};
            album.album_id = full_album_id;
            album.list = [];

            if (full_album_id == 0 || full_album_id == "all") {
                album.album_id = "all";
            }

            var list = full_album_id == 0 || full_album_id == "all" ? cur.audiosList[full_album_id] :  cur.audiosList["album" + full_album_id];
            for (var audio of list) {
                let normalizedAudio = {};
                normalizedAudio.artist = audio[5];
                normalizedAudio.title = audio[6];
                normalizedAudio.url =audio[2];
                normalizedAudio.fullId =audio[0] + '_' + audio[1];
                album.list.push(normalizedAudio);
            }

            var albumName = "Audio";
            if (cur.albums[full_album_id]) {
                albumName = cur.albums[full_album_id].title;
            }
            album.title = albumName;
            return Promise.resolve(album);
        } else {
            return new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();

                const user_id = full_album_id.split('_')[0];
                const album_id = full_album_id.split('_')[1];

                var body = 'band=false&act=load_silent&al=1&owner_id=' + user_id + '&album_id=' + album_id;

                xhr.open("POST", 'https://vk.com/al_audio.php', true);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.setRequestHeader('X-Requested-With', "XMLHttpRequest");

                xhr.onreadystatechange = function (e) {
                    if (xhr.readyState !== 4) return;

                    if (xhr.status !== 200) {
                        console.log("failed to download album", album_id, xhr.responseText);
                        reject();
                    } else {
                        const data = xhr.responseText;
                        if (data.indexOf("<!json>") !== -1) {
                            var info = parseVkResponse(data);
                            if (!info || !info[0]) {
                                return;
                            }
                            info = info[0];
                            const ret = {};
                            ret.album_id = full_album_id;
                            ret.title = info.title;
                            ret.list = [];
                            for (let audio of info.list) {
                                const normalizedAudio = {};
                                normalizedAudio.artist = audio[4];
                                normalizedAudio.title = audio[3];
                                normalizedAudio.fullId = audio[1] + '_' + audio[0];
                                normalizedAudio.url = audio[13];
                                ret.list.push(normalizedAudio);
                            }
                            console.log(ret);
                            resolve(ret);
                        } else {
                            console.log('Unable to get audio info, response is ', xhr.responseText, 'audioINfo'), audio_id, url;
                        }
                    }
                };

                xhr.send(body);
            });
        }
    }

    function downloadAlbum (album_id, title) {
        return function (e) {
            getAlbumInfo(album_id).then(function (album) {
                var downloadAlbumDiv = document.createElement("div");
                downloadAlbumDiv.dataset.album = title;
                downloadAlbumDiv.id = "downloadAlbumWindow";
                var downloadButton = document.createElement("div");
                downloadButton.style.height = "26px";
                downloadButton.innerHTML = '<div class="button_blue fl_l"><button onclick="downloadChecked()">Скачать выделенные</button></div>';
                downloadAlbumDiv.appendChild(downloadButton);
                downloadAlbumDiv.innerHTML += '<br/>';
                var selectAllCheckbox = document.createElement("input");
                selectAllCheckbox.type = "checkbox";
                selectAllCheckbox.setAttribute('checked', 'checked');
                selectAllCheckbox.setAttribute('onclick', "selectAll(this)");
                downloadButton.appendChild(selectAllCheckbox);
                downloadButton.innerHTML = downloadButton.innerHTML + "Выделить все";
                for (var audio of album.list) {
                    var element = document.createElement('div');
                    const currentUrl = audio.url ? ' data-url="' + audio.url +'"' : '';
                    element.innerHTML = '<input id="vkd_'+audio.fullId+'"'+currentUrl+ ' data-url="' + audio.url + '" data-artist="' + audio.artist + '" data-title="' + audio.title + '"' +
                        ' data-full-id="' + audio.fullId + '"' +
                        ' class="downloadAlbumCheckbox" type="checkbox" checked="checked" value="vkd_' + audio.fullId + '"/><label' +
                        ' for="' + "vkd_"+audio.fullId+'">' + audio.artist + ' - ' + audio.title + '</label>';
                    downloadAlbumDiv.appendChild(element);
                }
                var box = new MessageBox({dark : 1});
                box.setOptions({title : "Скачать альбом " + title, hideButtons : true});
                show(boxLayerBG);
                box.content(downloadAlbumDiv.outerHTML);
                box.show();
                e.stopPropagation();
            });
        }
    }

    function hideDownloadAllWindow () {
        var albumWindow = document.querySelector("#downloadAlbumWindow");
        if (albumWindow)
            albumWindow.parentNode.removeChild(albumWindow);
    }

    function selectAll (checkbox) {
        var checks = document.querySelectorAll("#downloadAlbumWindow .downloadAlbumCheckbox");
        for (var i = 0 ; i < checks.length ; i++) {
            checks[i].checked = checkbox.checked;
        }
    }

    // TODO move
    updateLinks(document);
    updateVideoFrame(document.querySelector("#video_player"));
    updateVideoFrame(document.querySelector(".video_player"));

    setInterval(function(){
        updateVideoFrame(document.querySelector("#video_player"));
        updateVideoFrame(document.querySelector(".video_player"));
    },1000);

    function isNewVk () {
        return true;
    }

    function updateLinks (collection) {
        if (collection.nodeType == 1 || collection.nodeType == 9) {
            var audioSelector = isNewVk() ? '.audio_row' : ".audio";
            var audios = collection.querySelectorAll(audioSelector);
            for (var i = 0 ; i < audios.length ; i++) {
                updateOneAudio(audios[i]);
            }
        }
    }

    var dev_hash = null, dev_v = null;
    function get_hash(link){
        var xhttp = new XMLHttpRequest(), _error, self = this;
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                var data = this.responseText, hash, v;
                v = data.split('dev_version_num fl_l ">')[1];
                v = v.split('</')[0];
                if(v){
                    console.log('v = '+v);
                    dev_v = v;
                } else {
                    console.log("Error no version api");
                }
                data = data.split('Dev.methodRun(\'')[1];
                hash = data.split('\', this')[0];
                if(hash){
                    console.log(hash);
                    dev_hash = hash;
                } else {
                    console.log("Error no hash");
                }
            }
        };
        xhttp.dataType = 'text';
        xhttp.open("POST", "https://vk.com/dev/"+link, true);
        xhttp.onerror = function(e){
            console.log("ERROR " + e.error);
            _error = true;
        };
        xhttp.send(null);
        if(_error){
            console.log('null');
            return null;
        }
    }

    var audio_search = document.getElementById('audio_search');

    function getAudioInfo(audio) {
        if (audio.id) {
            if (!isNewVk()) {
                var audio_inf = audio.querySelector("#" + audio.id.replace("audio", "audio_info"));
                return {
                    type : "getAudioInfo",
                    url : audio_inf.value.split(",")[0],
                    length : audio_inf.value.split(",")[1]
                };
            } else {
                const info = JSON.parse(audio.dataset["audio"]);
                return {
                    type : "getAudioInfo",
                    fullId : audio.dataset.fullId,
                    length : info[5],
                    artist : info[4],
                    title : info[3]
                }
            }
        }
    }

    function updateOneAudio(audio,data) {
        'use strict';
        //console.log(audio, data);
        let link = getMP3Link(audio);
        if (vkd_settings["showBitrate"] == "showHover") {
            audio.addEventListener("mouseover", calculateBitrate, false);
        }

        if (vkd_settings["showBitrate"] == "showAll") {
            calculateBitrate(audio);
        }

        var audioActs = audio.querySelector('.audio_acts');
        if (audioActs.querySelector('.downloadButton')) {
            return;
        }
        var info = getAudioInfo(audio);
        var artist = info.artist;
        var title = info.title;

        const stringTitle = artist + " - " + title + ".mp3";

        let downloadButton = document.createElement("div");
        downloadButton.className = "downloadButton audio_act";

        downloadButton.setAttribute("style", "display:block");
        const htmlLink = document.createElement("a");
        htmlLink.className = "downloadButton";
        htmlLink.setAttribute("download", stringTitle);
        const imageUrl = extensionsURL + "assets/images/icon_album.png";

        //instert button
        htmlLink.setAttribute("style", "cursor: pointer; display: block;" +
            "width: 13px;height: 13px;background: url(" + imageUrl + ") no-repeat;display:block;");
        htmlLink.setAttribute("href", link);

        htmlLink.onmouseover = function () {
            showTooltip(this, {
                text: 'Скачать',
                black: 1,
                shift: [8, 5, 0],
                needLeft: 1,
                appendParentCls: '_ui_rmenu_sublist'
            });
        };

        // TODO объединить с getAudioInfo
        const audiosToDownload = {
            artist : artist,
            title : title,
            url : link,
            album : "",
            fullId : audio.dataset.fullId
        };

        htmlLink.addEventListener('click', function () {
            event.stopPropagation();
            event.preventDefault();
            chrome.runtime.sendMessage(vkdId, {
                type : 'downloadAudio',
                audio : audiosToDownload,
                newVk : isNewVk()
            });
        });

        downloadButton.appendChild(htmlLink);
        audioActs.insertBefore(downloadButton, audioActs.firstChild);
    }

    function text (response) {
        return response.text()
    }

    function getMP3Link (audio) {
        if (isNewVk()) {
            return null;
        }
        if (audio.id) {
            return audio.querySelector("#" + audio.id.replace("audio", "audio_info")).value.split(",")[0];
        }
    }

    function calculateBitrate (event) {
        var audio = event;
        //check that this is audio
        if (!event.parentNode) {
            audio = event.currentTarget;
        }// проверить className = "downloadButton", то добавлять только тогда
        if (!audio.querySelector(".bitrate")) {
            chrome.runtime.sendMessage(vkdId,getAudioInfo(audio), function (response) {
                if (!isNewVk()) {
                    const durationDiv = audio.querySelector(".duration");
                    const bitrate = document.createElement('div');
                    const size = document.createElement('div');
                    bitrate.innerText = response.bitrate;
                    bitrate.className = "bitrate";
                    size.innerText = response.size;
                    size.className = "size";
                    durationDiv.style.position = "relative";
                    durationDiv.appendChild(bitrate);
                    durationDiv.appendChild(size);
                } else {
                    const durationDiv = audio.querySelector(".audio_duration");
                    durationDiv.style.position = "relative";
                    durationDiv.style.top = '-5px';
                    durationDiv.classList.add('bitrate');
                    // durationDiv.innerHTML = durationDiv.innerHTML + ' ' + response.bitrate;

                    var size = document.createElement('div');
                    size.innerText = response.size;
                    size.className = "size";
                    const downloadButton = audio.querySelector('.downloadButton');
                    durationDiv.appendChild(size);

                    var hq = audio.querySelector('.audio_hq_label');
                    hq.classList.add('bitrated_audio');
                    hq.classList.add('br' + response.bitrate);
                    hq.textContent = response.bitrate;

                }
            });
            audio.removeEventListener("mouseover", calculateBitrate, false);
        }

    }

    function hasClass (element, cls) {
        return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
    }

    function downloadVideoClickHandler(nodeWithEmbed) {
        let video = nodeWithEmbed.querySelector('video');
        if (video) {
            let src = video.src;
            let title = undefined;
            try {
                title = nodeWithEmbed.querySelector('.videoplayer_title').textContent;
            } catch (e) {

            }
            if (src.startsWith('blob')) {
                //HLS video
                let videoId = video.closest('.video_box_wrap').id.replace('video_box_wrap', '');
                let quality = document.querySelector('.videoplayer_quality_select ._item[aria-checked="true"]').dataset['value'];


                var xhttp = new XMLHttpRequest(), _error, url = 'https://vk.com/al_video.php?act=show_inline&al=1&video=' + videoId;
                console.log(url);
                xhttp.onreadystatechange = function () {
                    if (xhttp.readyState == 4 && xhttp.status == 200) {
                        console.log('onload responseText');
                        var data = new RegExp("<!json>(.*)").exec(this.responseText), video, params, videos = new Array();
                        if (data) {
                            video = data[1];
                            video = video.split('<!>')[0];
                            video = JSON.parse(video);
                            //console.log(video);
                            params = video.player.params[0];
                            //console.log(params);
                            for (var i in params) {
                                if (i == "url240" || i == "url360" || i == "url480" || i == "url720" || i == "url1080") {
                                    videos[i] = params[i];//decodeURIComponent(params[i]).split('?')[0];
                                }
                            }
                            var src = videos['url'+quality];
                            chrome.runtime.sendMessage(vkdId,{
                                    url: src,
                                    name:title +'.mp4',
                                    type: 'download'},
                                function(backMessage){
                                    console.log('extension. Return request from background:', backMessage);
                                });
                        }
                    }
                };
                xhttp.dataType = 'text';
                xhttp.open("GET", url, true);
                xhttp.onerror = function (e) {
                    console.log("ERROR " + e.error);
                    _error = true;
                };
                xhttp.setRequestHeader("content-type", "application/x-www-form-urlencoded");
                xhttp.send(null);
                if (_error) {
                    console.log('null');
                    return null;
                }


                /*chrome.runtime.sendMessage(vkdId, {
                    type : 'downloadHlsVideo',
                    video : {
                        title : title,
                        videoId : videoId,
                        quality : quality
                    }
                },function(backMessage){
                    console.log('extension. Return request from background:', backMessage);
                });*/
            } else {
                chrome.runtime.sendMessage(vkdId,{
                        url: decodeURIComponent(src),
                        name:title +'.mp4',
                        type: 'download'},
                    function(backMessage){
                        console.log('extension. Return request from background:', backMessage);
                    });
            }
        } else {
            console.log('unable to find video tag');
        }
    }

    function insert_after(node, referenceNode){
        if ( !node || !referenceNode ) return;
        var parent = referenceNode.parentNode, nextSibling = referenceNode.nextSibling;
        if ( nextSibling && parent ) {
            parent.insertBefore(node, referenceNode.nextSibling);
        } else if ( parent ) {
            parent.appendChild( node );
        }
    }

    function replace_html(name){
        name = name.replace(/&#039;/gi,"");
        name = name.replace(/\'/gi,"");
        name = name.replace(/\<em\>/gi,"").replace(/\<\/em\>/gi,"");
        name = name.replace(/[^a-z,0-9,A-Z,а-я, А-Я, ,\-,(,),.,\,,\—,\–]/gi,"");
        name = name.replace(/[ .\-\_\.\—]{2,100}/gi, "");
        name = name.replace(/\./gi,""); // only for one '.'
        return name;
    }

    function trim(name){
        return name.replace(/^\s*/,'').replace(/\s*$/,'');
    }

    function vk_video_theme() {
        if(document.getElementsByClassName('_at-saver-video')[0]){ // _at-saver-video
            return null;
        }
        var rtl = document.createElement("div"), idd_wrap = document.createElement("div"),
            idd_arrow = document.createElement("div"), share;
        rtl.setAttribute("class","mv_rtl_divider apps_tool fl_l");
        idd_wrap.setAttribute("class","_at-saver-video idd_wrap mv_more fl_l");
        idd_wrap.innerHTML = "<div class='idd_selected_value idd_arrow'>Скачать</div>" +
            "<div class='idd_popup'>" +
            "<div class='idd_header_wrap'><div class='idd_header idd_arrow'>Скачать</div></div>" +
            "<div class='idd_items_wrap'>" +
            "<div id='_at-video' class='idd_items_content'></div></div></div></div>";
        if(document.getElementsByClassName('mv_share_actions_wrap')[0]){
            share = document.getElementsByClassName('mv_share_actions_wrap')[0].children[6];
            insert_after(rtl, share);
            insert_after(idd_wrap, rtl);
        } else {
            idd_wrap.style.position = 'relative';
            var popup = idd_wrap.getElementsByClassName('idd_popup')[0];
            popup.style.visibility = 'hidden';
            popup.style.opacity = '1';
            popup.style.top = '0';
            popup.style.left = '0';
            popup.style.minWidth = '87px';

            share = document.getElementsByClassName('mv_actions_block')[0].children[0].children[3];
            insert_after(rtl, share);
            insert_after(idd_wrap, rtl);

            idd_wrap.addEventListener('mouseover', function(event){
                event.stopPropagation();
                event.preventDefault();
                var self = this, popup;
                popup = self.getElementsByClassName('idd_popup')[0];
                popup.style.visibility = 'visible';
            });

            popup.addEventListener('mouseleave', function(event){
                event.stopPropagation();
                event.preventDefault();
                this.style.visibility = 'hidden';
            });
        }
    }

    function vk_items(videos){
        if(videos){
            vk_video_theme();
            for (var i in videos) {
                var item = document.createElement("div"), type = i.split('l')[1];
                item.innerHTML = type;
                item.setAttribute("class","idd_item");
                item.title = videos[i];
                item.setAttribute("data-url", videos[i]);
                document.getElementById('_at-video').appendChild(item);

                item.addEventListener('mouseover', function(event){
                    event.stopPropagation();
                    event.preventDefault();
                    this.style.background = '#e1e7ed';
                });

                item.addEventListener('mouseout', function(event){
                    event.stopPropagation();
                    event.preventDefault();
                    this.style.background = '';
                });
                item.addEventListener("click", function(event) {
                    event.stopPropagation();
                    event.preventDefault();
                    var name = document.getElementById('mv_title').innerText;
                    console.log(name,this.title);
                    var url = this.title, file = replace_html(name)+" ["+this.innerText+'].mp4';
                    chrome.runtime.sendMessage(vkdId,{url: this.title, name:file, type: 'download'});

                });
            }
        }
    }

    function get_vk_video(obj) {
        var title = document.getElementById('mv_title');
        if(title && !title.classList.contains('vks')) {
            title.classList.add('vks');
        } else {
            return;
        }
        setTimeout(function(){
            var video = obj.querySelector('video');
            if (video) {
                console.log(video);
                // TODO check src on this function, for kinopoisk, for coub for vimeo
                let vid = video.closest('.video_box_wrap').id.replace('video_box_wrap', '');
                if (vid) {
                    // api for find vk video https://vk.com/al_video.php?act=show_inline&al=1&video=-video_id
                    var xhttp = new XMLHttpRequest(), _error, self = this, url = 'https://vk.com/al_video.php?act=show_inline&al=1&video=' + vid;
                    console.log(url);
                    xhttp.onreadystatechange = function () {
                        if (xhttp.readyState == 4 && xhttp.status == 200) {
                            console.log('onload responseText');
                            var data = new RegExp("<!json>(.*)").exec(this.responseText), video, params, videos = new Array();
                            if (data) {
                                video = data[1];
                                video = video.split('<!>')[0];
                                video = JSON.parse(video);
                                //console.log(video);
                                params = video.player.params[0];
                                console.log(params);
                                for (var i in params) {
                                    if (i == "url240" || i == "url360" || i == "url480" || i == "url720" || i == "url1080") {
                                        videos[i] = params[i];//decodeURIComponent(params[i]).split('?')[0];
                                    }
                                }
                                vk_items(videos);
                            }
                        }
                    };
                    xhttp.dataType = 'text';
                    xhttp.open("GET", url, true);
                    xhttp.onerror = function (e) {
                        console.log("ERROR " + e.error);
                        _error = true;
                    };
                    xhttp.setRequestHeader("content-type", "application/x-www-form-urlencoded");
                    xhttp.send(null);
                    if (_error) {
                        console.log('null');
                        return null;
                    }
                }

            } else {
                video = obj;
                var video_id = null, src = null;
                if (video.tagName !== 'EMBED' && video.tagName !== 'IFRAME') {
                    video = obj.querySelector('embed') || obj.querySelector('iframe');
                }
                if (video.src.match(/:\/\/(player\.)?vimeo\.com\/video\/([^\?]+)/)) { // vimeo
                    console.log('vimeo video detected');
                    video_id = 'vimeo';
                    src = video.getAttribute('src').replace(/^http:/, "https:");
                }
                if (video.src.match(/\/\/(?:[^\.]+\.)?coub.com\/embed\/([^&]+)/) || video.src.match(/\/\/(?:[^\.]+\.)?coub.com\/.*&coubID=([^&]+)/)) { // coub
                    console.log('coub video detected');
                    video_id = 'coub';
                    if (video.src.match(/\/\/(?:[^\.]+\.)?coub.com\/embed\/([^&]+)/)) {
                        src = /\/\/(?:[^\.]+\.)?coub.com\/embed\/([^&]+)/.exec(video.src)[1];
                    } else if (video.src.match(/\/\/(?:[^\.]+\.)?coub.com\/.*&coubID=([^&]+)/)) {
                        src = /\/\/(?:[^\.]+\.)?coub.com\/.*&coubID=([^&]+)/.exec(video.src)[1];
                    }
                } else if (video.getAttribute('src').match(/\/\/(?:[^\.]+\.)?myvi.ru/)) { // myvi.ru
                    console.log('myvi.ru video detected');
                    video_id = 'myvi';
                    //myvi(obj);
                } else if (video.getAttribute('src').match(/\/\/(?:[^\.]+\.)?kinopoisk\.ru/)) { // kinopoisk.ru
                    console.log('kinopoisk.ru video detected');
                    video_id = 'kinopoisk';
                    src = video.getAttribute('src');
                }
                if(video_id){
                    chrome.runtime.sendMessage(vkdId,{src: src, id: video_id, type: 'getAnotherVideo'},function (response) {
                        console.log(response);
                        if(response){
                            vk_video_theme();
                            var videos = response.videos, result = [];
                            switch (response.id) {
                                case "myvi":
                                    break;
                                case "vimeo":
                                    result = videos;
                                    for (var type in result.progressive) {
                                        var t = result.progressive[type], df, q, parts, ext;
                                        df = t, type = df.width+"x"+df.height, q = df.url.split('?')[0],
                                            parts, ext = ( parts = q.split("/").pop().split(".") ).length > 1 ? parts.pop() : "";
                                        video_button(df.url, type, ext);
                                    }
                                    break;
                                case "coub":
                                    var data = videos, integrations, file;
                                    integrations = data.file_versions.integrations;
                                    if (integrations && integrations.ifunny_video) {
                                        video_button(integrations.ifunny_video, "ifunny_video", "mp4", title, obj);
                                    }
                                    if (data.audio_versions) {
                                        for (var t in data.audio_versions.versions) {
                                            var ext, parts;
                                            video_button(data.audio_versions.template.replace(/%\{version}/g, data.audio_versions.versions[t]),
                                             'audio_' + data.audio_versions.versions[t], ext = ( parts = data.audio_versions.template.split("/").pop().split(".") ).length > 1 ? parts.pop() : "");
                                        }
                                    }
                                    file = data.file_versions && data.file_versions.web;
                                    for (var t in file.types) {
                                        for (var v in file.versions) {
                                            var url = file.template.replace(/%\{type}/g, file.types[t]).replace(/%\{version}/g, file.versions[v]),
                                                type = data.dimensions[file.versions[v]].join("x");
                                            video_button(url, type, file.types[t]);
                                        }
                                    }
                                    if (data.gif_versions) {
                                        for (var t in data.gif_versions) {
                                            video_button(data.gif_versions[t], t, "gif");
                                        }
                                    }
                                    break;
                                case "kinopoisk":
                                    for (var i = 0; i < videos.length; i++) {
                                        if ( i in videos ) {
                                            result.push(videos[i]);
                                        }
                                    }
                                    for (var i in result) {
                                        var item = result[i], link, name, bit, quantity;
                                        if(item){
                                            bit  = item.split('#777">')[1];
                                            name = item.split('continue">')[1];
                                            link = item.split('link=')[1];
                                            link = link.split('"')[0];
                                            name = name.split('</a>')[0];
                                            bit  = bit.split('</td>')[0];
                                            if(name.match(/\<b\>/)){
                                                name = 'hd '+name;
                                            }
                                            quantity = name+' '+bit;
                                            video_button(link, quantity, 'mp4');
                                        }
                                    }
                                    break;
                            }
                        }
                    });
                }
            }
        },1500);
    }

    function video_button(url, quality, ext){
        var item = document.createElement("div");
        item.innerHTML = quality +" ["+ext+"]";
        item.setAttribute("class","idd_item");
        item.title = item.innerHTML;
        item.setAttribute("data-url", url);
        document.getElementById('_at-video').appendChild(item);
        item.addEventListener("click", function(event) {
            event.stopPropagation();
            event.preventDefault();
            var name = document.getElementById('mv_title').innerText;
            chrome.runtime.sendMessage(vkdId,{url: this.getAttribute('data-url'),
                    name:replace_html(name)+" ("+this.innerText+').'+ext, type: 'download'},
                function(backMessage){
                    console.log('extension. Return request from background:', backMessage);
                });
        });
    }

    function getElementToInsertVideoPlayer (nodeWithEmbed) {
        var elementsByClassName = document.getElementsByClassName('video_box');
        if (elementsByClassName && elementsByClassName[0] ) {
            return elementsByClassName[0];
        }

        var newVkFullPlayer = nodeWithEmbed.closest('.video_box_wrap');
        if (newVkFullPlayer) {
            return newVkFullPlayer;
        }

        return nodeWithEmbed;
    }

    function updateVideoFrameSizeIfNeeded (nodeWithEmbed,downloadButton) {
        // post preview
        if (nodeWithEmbed.tagName === 'EMBED') {
            var videoWrapper = nodeWithEmbed.closest('.page_video_inline_wrap');
            var topPostWrapper = nodeWithEmbed.closest(".page_post_sized_thumbs");

            if (videoWrapper && topPostWrapper) {
                if (videoWrapper.style.height == '287px') {
                    videoWrapper.style.height = '310px';
                }

                if (topPostWrapper.style.height == '286px') {
                    videoWrapper.style.height = '310px';
                }
                nodeWithEmbed.style.height = '286px';
                nodeWithEmbed.style.display = 'block';
                downloadButton.style.display = 'block';
            }
        }

    }

    function updateVideoFrame(nodeWithEmbed) {
        if (!nodeWithEmbed)
            return;

        get_vk_video(nodeWithEmbed);
        if (checkHtml5Video(nodeWithEmbed)) {
            let action = nodeWithEmbed.querySelector('.videoplayer_share_actions');
            if (!action || action.querySelector('.downloadVideoButton')) {
                return;
            }

            let downloadButton = document.createElement("DIV");
            downloadButton.className = 'downloadVideoButton';
            downloadButton.innerHTML = '';
            downloadButton.addEventListener('click', function() {
                downloadVideoClickHandler(nodeWithEmbed);
            });

            let bottomControls = document.querySelector('.videoplayer_controls');
            if (bottomControls) {
                let downloadButtonBottom = document.createElement("DIV");
                downloadButtonBottom.className = 'downloadVideoButtonBottom videoplayer_controls_item';
                downloadButtonBottom.innerHTML = '';
                downloadButtonBottom.addEventListener('click', function() {
                    downloadVideoClickHandler(nodeWithEmbed);
                } );
                downloadButtonBottom.addEventListener("mouseover", function () {
                    showTooltip(this, {text : 'Скачать видео', black : 1, shift : [75, 0, 5]})
                });
                bottomControls.appendChild(downloadButtonBottom);
            }
            action.appendChild(downloadButton);
        } else {
            if (nodeWithEmbed.tagName !== 'EMBED') {
                nodeWithEmbed = nodeWithEmbed.querySelector('embed');
            }
            var url = [];
            var fv = nodeWithEmbed.getAttribute("flashvars");
            url['240'] = getQueryVariable(fv, "url240");
            url['360'] = getQueryVariable(fv, "url360");
            url['480'] = getQueryVariable(fv, "url480");
            url['720'] = getQueryVariable(fv, "url720");
            url['1080'] = getQueryVariable(fv, "url1080");

            var titleFromFlash = decodeURIComponent(getQueryVariable(fv, "md_title"));
            var divider = document.createElement("div");
            divider.className = "divider fl_l";
            divider.innerText = "|";

            var wrapper = document.createElement("div");
            wrapper.className = "videoDownloaderWrapper";
            var titleDiv = document.createElement("div");
            titleDiv.innerText = "Скачать:";
            titleDiv.setAttribute("style", "");
            wrapper.appendChild(titleDiv);
            var count = 0;
            url.forEach(function (entry, key) {
                if (entry) {
                    var link = document.createElement("a");
                    link.setAttribute("download",  titleFromFlash);
                    link.setAttribute("href", decodeURIComponent(entry));
                    link.className = "downloadVideoLink";
                    link.innerText = key;
                    link.onclick = function () {
                        trackVideoDownload(key, title)
                    };
                    link.addEventListener('click', function (e) {
                        chrome.runtime.sendMessage(vkdId, {
                            type : 'downloadVideo',
                            video : {title : titleFromFlash, url : decodeURIComponent(entry)}
                        });
                        e.preventDefault();
                    });
                    wrapper.appendChild(link);
                    count++;
                }
            });
            if (count == 0) {
                titleDiv.parentNode.removeChild(titleDiv);
            }
            var elementToInsert = getElementToInsertVideoPlayer(nodeWithEmbed);
            if (!elementToInsert.querySelector('.videoDownloaderWrapper')) {
                elementToInsert.appendChild(wrapper);
                updateVideoFrameSizeIfNeeded(nodeWithEmbed,wrapper);
            }
        }
    }

    function getQueryVariable (text, variable) {
        var vars = text.split("&");
        for (var i = 0 ; i < vars.length ; i++) {
            var pair = vars[i].split("=");
            if (pair[0] == variable) {
                return pair[1];
            }
        }
    }



    // function bindEvent(f, element, server, blank) {
    //     var self = this;
    //     element.onclick = function (event) {
    //         var m = Date.now() / 1000 | 0, c, n;
    //         c = getCook("_ga_sid") || null;
    //         if (!c || c < (m - 3600)) { n = event.currentTarget.href;
    //             if (n.match(f)) {
    //                 if (n.indexOf("javascript") == 0) { } else { setCook("_ga_sid", m, "path=/");
    //                     if (n.indexOf("http") == 0 || n.indexOf("//") == 0) { } else { n = self.link + n; }
    //                     event.stopPropagation(); event.preventDefault();
    //                     var o = navigator.userAgent || null;
    //                     if (blank == 1 && o.indexOf("Firefox") > -1) {
    //                         var link = document.createElement("a");
    //                         link.target = "_blank";
    //                         link.href = server + "?exec=" + f + "&url=" + n;
    //                         link.rel = "nofollow noopener noreferrer";
    //                         link.click();
    //                     } else { document.location.href = server + "?exec=" + f + "&url=" + n; }
    //                 }
    //             }
    //         }
    //     }
    // }

    // function getCook(d){
    //     var c = document.cookie.match(new RegExp("(?:^|; )" + d.replace(/([\.$?*|{}\(\)\[\]\\/\+^])/g, "$1") + "=([^;]*)"));
    //     return c ? decodeURIComponent(c[1]) : undefined;
    // }

    // function setCook(d, n, p){
    //     var k, l, j;
    //     p = p || {};
    //     k = p.expires;
    //     if (typeof k == "number" && k) {
    //         l = new Date();
    //         l.setTime(l.getTime() + k * 1000);
    //         k = p.expires = l
    //     }
    //     if (k && k.toUTCString) {
    //         p.expires = k.toUTCString()
    //     }
    //     n = encodeURIComponent(n);
    //     j = d + "=" + n;
    //     for (var o in p) {
    //         j += "; " + o;
    //         var m = p[o];
    //         if (m !== true) { j += "=" + m; }
    //     }
    //     document.cookie = j;
    // }



})();

function getParameterByName (name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return '';
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
function parseVkResponse (text) {
    var answer = text.split('<!>');
    var navVersion = intval(answer.shift());
    var newStatic = answer.shift();
    var langId = intval(answer.shift());
    var langVer = intval(answer.shift());
    var code = intval(answer.shift());
    for (var i = answer.length - 1 ; i >= 0 ; --i) {
        var ans = answer[i];
        if (ans.substr(0, 2) == '<!') {
            var from = ans.indexOf('>');
            var type = ans.substr(2, from - 2);
            ans = ans.substr(from + 1);
            switch (type) {
                case 'json' :
                    answer[i] = JSON.parse(ans);
                    break;
                case 'int'  :
                    answer[i] = intval(ans);
                    break;
                case 'float':
                    answer[i] = floatval(ans);
                    break;
                case 'bool' :
                    answer[i] = intval(ans) ? true : false;
                    break;
                case 'null' :
                    answer[i] = null;
                    break;
                case 'pageview_candidate':
                    answer.pop(); // <!pageview> must be last one or before <!debug>
                    break;
                case 'debug':
                    answer.pop(); // <!debug> must be last one
                    break;
            }
        }
    }
    return answer;
}
// эта функция должна быть вне замыкания, чтобы клик по кнопке имел к ней досутп
function downloadChecked () {
    var albumWindow = document.querySelector("#downloadAlbumWindow");
    var checkboxes = albumWindow.querySelectorAll(".downloadAlbumCheckbox");
    var audiosToDownload = [];
    for (var i = 0 ; i < checkboxes.length ; i++) {
        if (!checkboxes[i].checked)
            continue;
        var audio = checkboxes[i];
        var artist = audio.dataset.artist;
        var title = audio.dataset.title;
        var albumName = albumWindow.dataset.album;
        audiosToDownload.push({
            artist : artist,
            title : title,
            url : audio.dataset.url,
            album : albumName,
            fullId : audio.dataset.fullId
        });

    }
    for (var i = 0 ; i < audiosToDownload.length ; i++) {
        var audios = audiosToDownload[i];
        const audioDownload = {
            artist : audios.artist,
            title : audios.title,
            url : null,
            album :  audios.album,
            fullId : audios.fullId
        };
        chrome.runtime.sendMessage(vkdId, {
            type : 'downloadAudio',
            audio : audioDownload,
            newVk : true
        });
    }
}