document.addEventListener('DOMContentLoaded', function() {
    const title = document.getElementById('title');
    const audio = document.getElementById('audio');
    const textContainer = document.getElementById('text-container');
    // const fileInput = document.getElementById('file-input');
    const fileSelectContainer = document.getElementById('file-select-container');
    const playbackRateSelect = document.getElementById('playback-rate-select');

    playbackRateSelect.addEventListener('change', function() {
        const selectedRate = parseFloat(playbackRateSelect.value);
        changePlaybackRate(selectedRate);
    });

    window.changePlaybackRate = function(rate) {
        audio.playbackRate = rate;
    };

    // 追加: プリセットファイルの配列
    const presetFiles = [
        '001', '001-w', '002', '002-w', '003', '003-w', '004', '004-w', '005', '005-w',
        '006', '006-w', '007', '007-w', '008', '008-w', '009', '009-w', '010', '010-w',
        '011', '011-w',  '012', '012-w','013', '013-w', '014', '014-w',  '015', '015-w'
    ];

    // プルダウンメニューの生成
    const select = document.createElement('select');
    select.id = 'file-select';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select File';
    select.appendChild(defaultOption);

    presetFiles.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        select.appendChild(option);
    });

    select.addEventListener('change', function() {
        openSelectedFile();
    });
    
    fileSelectContainer.appendChild(select);

    window.openSelectedFile = function() {
        const selectedValue = select.value;
        if (selectedValue) {
            const fileName = selectedValue;
            const jsonFilePath = `./json/${fileName}.json`;
            const audioFilePath = `./audio/${fileName}.mp3`;

            fetch(jsonFilePath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(jsonData => {
                    loadContent(jsonData, fileName);
                    audio.src = audioFilePath;
                })
                .catch(error => console.error('ファイルの読み込みに失敗しました:', error));
        } else {
            alert('ファイルを選択してください');
        }
    };

    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    const baseFileName = file.name.split('.').slice(0, -1).join('.');
                    loadContent(jsonData, baseFileName);
                } catch (error) {
                    console.error('JSONの解析に失敗しました:', error);
                }
            };
            reader.onerror = () => console.error('ファイルの読み込みに失敗しました');
            reader.readAsText(file);
        }
    });

    function createSpan(text, className, start = null, end = null) {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = text;
    
        if (start !== null && end !== null) {
            span.setAttribute('data-start', start);
            span.setAttribute('data-end', end);
        }
    
        return span;
    }

    function createWordContainer(content) {
        const wordContainer = document.createElement('div');
        wordContainer.className = 'word-container';
        wordContainer.appendChild(content);
        return wordContainer;
    }

    function loadContent(data, fileName) {
        // テキストコンテナとタイトルをクリア
        textContainer.innerHTML = '';
        title.innerHTML = '';
        // 音声ファイルの設定
        audio.src = `./audio/${fileName}.mp3`;
        // テキストの追加
        data.content.forEach(item => {
            if (!item.type || !item.text) return; // エラーチェック
        
            switch (item.type) {
                case 'title':
                    const titleH1 = document.createElement('h1');
                    titleH1.textContent = item.text;
                    title.appendChild(titleH1);
                    break;
        
                case 'text':
                    if (item.text.includes('\n')) {
                        const removeNewLineText = item.text.replace(/\n/g, '');
                        const span = createSpan(removeNewLineText, 'word');
                        textContainer.appendChild(span);
                        textContainer.appendChild(document.createElement('br'));
                    } else if (item.text !== '|') {
                        const span = createSpan(item.text, 'word', item.start, item.end);
                        const wordContainer = createWordContainer(span);
                        
                        // 注釈を追加
                        if (item.annotation) {
                            const annotationSpan = createSpan(item.annotation, 'annotation');
                            wordContainer.appendChild(annotationSpan);
                        }
                        
                        textContainer.appendChild(wordContainer);
                    }
                    break;
        
                case 'textja':
                    const jaSpan = createSpan(item.text, 'word ja', item.start, item.end);
                    const jaWordContainer = createWordContainer(jaSpan);
                    textContainer.appendChild(jaWordContainer);
                    break;
        
                case 'spacer':
                    const spacerSpan = createSpan(item.text, 'spacer');
                    const spacerContainer = createWordContainer(spacerSpan);
                    textContainer.appendChild(spacerContainer);
                    break;
        
                default:
                    // 未知のタイプの処理
                    break;
            }
        });
        // 単語にクリックイベントを追加
        addWordEvents();
    }

    function addWordEvents() {
        const words = document.querySelectorAll('.word');
        words.forEach((word, index) => {
            word.addEventListener('click', function() {
                const start = word.getAttribute('data-start');
                if (start !== null) {
                    const startTime = parseFloat(start);
                    audio.currentTime = startTime;
                    audio.play();
                } else {
                    // 次の音声と対応する単語の開始時間を探す
                    for (let i = index + 1; i < words.length; i++) {
                        const nextStart = words[i].getAttribute('data-start');
                        if (nextStart !== null) {
                            const nextStartTime = parseFloat(nextStart);
                            audio.currentTime = nextStartTime;
                            audio.play();
                            break;
                        }
                    }
                }
            });
        });

        audio.addEventListener('timeupdate', function() {
            words.forEach(word => {
                const start = parseFloat(word.getAttribute('data-start'));
                const end = parseFloat(word.getAttribute('data-end'));
                if (audio.currentTime >= start && audio.currentTime <= end) {
                    word.classList.add('playing');
                } else {
                    word.classList.remove('playing');
                }
            });
        });

        document.addEventListener('keydown', function(event) {
            if (event.code === 'Space') {
                event.preventDefault();
                if (audio.paused) {
                    audio.play();
                } else {
                    audio.pause();
                }
            }
        });
    }

});
