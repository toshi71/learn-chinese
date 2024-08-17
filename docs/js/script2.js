document.addEventListener('DOMContentLoaded', () => {
    // 各種HTML要素の取得
    const audioFileInput = document.getElementById('audio-file');
    const textInput = document.getElementById('text-input');
    const processButton = document.getElementById('process-button');
    const downloadButton = document.getElementById('download-json');
    const uploadJsonButton = document.getElementById('upload-json');
    const jsonFileInput = document.getElementById('json-file');
    const waveformContainer = document.getElementById('waveform');
    const currentTimeDisplay = document.getElementById('current-time');
    const playbackRateDisplay = document.getElementById('playbackRateDisplay');
    const textContainer = document.getElementById('text-container');

    let wordsData = [];

    // WaveSurferの初期化
    const wavesurfer = WaveSurfer.create({
        container: waveformContainer,
        waveColor: 'violet',
        progressColor: 'purple',
        backend: 'MediaElement'
    });

    let zoomLevel = 0;  // 初期ズームレベル
    let playbackRate = 1.0; // 初期再生速度
    const maxZoomLevel = 500;  // 最大ズームレベル
    const minZoomLevel = 0;  // 最小ズームレベル

    // オーディオファイルの読み込み
    audioFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            wavesurfer.load(url);
        }
    });

    // テキストの処理
    processButton.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (text) {
            // 空白文字や半角記号で分割して、分割記号も含める
            const words = text.split(/([ \t\n\r,.!?|-]+)/).filter(Boolean);
            textContainer.innerHTML = '';
            wordsData = words.map(word => ({ text: word, start: null, end: null, annotation: '', checked: false }));

            displayWordsAsTable();
            hideEvenRows();
        }
    });

    // 偶数行を隠す
    function hideEvenRows() {
        const rows = document.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (index % 2 === 0 && index > 0) { // ヘッダ行を除く偶数行を非表示
                row.style.display = 'none';
            }
        });
    }

    // 単語の表示
    function displayWordsAsTable() {
        const tableElement = document.querySelector('div.table-container');
        if (tableElement) {
            tableElement.remove();
        }
        
        const table = document.createElement('table');
        table.style.width = '100%';
        table.border = '1';

        // ヘッダー行を作成
        const headerRow = document.createElement('tr');
        ['Words', 'start', 'end', 'annotation', 'Spacer', 'Actions'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // 各単語行を作成
        wordsData.forEach((wordData, index) => {
            const row = document.createElement('tr');

            ['text', 'start', 'end', 'annotation'].forEach(key => {
                const td = document.createElement('td');
                if (key === 'text') {
                    td.textContent = wordData[key];
                    td.className = 'word';
                    td.addEventListener('click', () => markWord(index));
                } else if (key === 'annotation') {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'input-annotation';
                    input.value = wordData[key];
                    input.addEventListener('input', (event) => {
                        replacePinyin(input);  // ピンイン置換関数を呼び出し
                        wordsData[index].annotation = event.target.value;
                    });
                    td.appendChild(input);
                } else {
                    td.textContent = wordData[key] !== null ? wordData[key].toFixed(2) : '';
                }
                row.appendChild(td);
            });

            // Spacer列のセルを追加
            const spacerTd = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = wordData.checked;
            checkbox.addEventListener('change', (event) => {
                wordsData[index].checked = event.target.checked;
            });
            spacerTd.appendChild(checkbox);
            row.appendChild(spacerTd);

            // Actions列のセルを追加
            const actionTd = document.createElement('td');
            const endButton = document.createElement('button');
            endButton.textContent = 'End';
            endButton.addEventListener('click', () => markEnd(index));
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => clearTime(index));
            actionTd.appendChild(endButton);
            actionTd.appendChild(deleteButton);
            row.appendChild(actionTd);

            table.appendChild(row);
        });

        const outerDiv = document.createElement('div')
        outerDiv.className = 'table-container'
        outerDiv.appendChild(table)

        textContainer.appendChild(outerDiv);
    }

    // タイムスタンプのマーク
    function markWord(index) {
        const startTime = wavesurfer.getCurrentTime();
        wordsData[index].start = startTime;
        if (index > 1) {
            wordsData[index - 2].end = startTime;
        }
        updateTable();
    }

    function markEnd(index) {
        const endTime = wavesurfer.getCurrentTime();
        wordsData[index].end = endTime;
        updateTable();
    }

    function clearTime(index) {
        wordsData[index].start = null;
        wordsData[index].end = null;
        updateTable();
    }

    // テーブルの更新
    function updateTable() {
        const rows = textContainer.querySelectorAll('tr');
        wordsData.forEach((wordData, index) => {
            const startCell = rows[index + 1].cells[1];
            const endCell = rows[index + 1].cells[2];
            const annotationInput = rows[index + 1].cells[3].querySelector('input');

            startCell.textContent = wordData.start !== null ? wordData.start.toFixed(2) : '';
            endCell.textContent = wordData.end !== null ? wordData.end.toFixed(2) : '';
            if (annotationInput) {
                annotationInput.value = wordData.annotation;
            }
        });
        hideEvenRows();
    }

    // JSONファイルのダウンロード処理
    downloadButton.addEventListener('click', () => {
        const content = wordsData.map(data => {
            return {
                type: data.checked ? 'spacer' : 'text',
                text: data.text,
                start: data.start,
                end: data.end,
                annotation: data.annotation
            };
        });
        const json = JSON.stringify({ content }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    // JSONファイルのアップロード処理
    uploadJsonButton.addEventListener('click', () => {
        jsonFileInput.click();
    });

    jsonFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = JSON.parse(e.target.result);
                if (content && content.content) {
                    wordsData = content.content.map(data => ({
                        text: data.text,
                        start: data.start,
                        end: data.end,
                        annotation: data.annotation || '',
                        checked: data.type === 'spacer' // 'spacer'ならばcheckedをtrueにする
                    }));
                    displayWordsAsTable();
                    hideEvenRows();
                }
            };
            reader.readAsText(file);
        }
    });

    // キーボード操作
    // スペースキーで再生・停止、矢印キーで時間移動、ズーム操作
    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;

        // テキストボックスにフォーカスがある場合は処理をスキップ
        if (activeElement === textInput) {
            return;
        }

        updatePlaybackRateDisplay(playbackRate); // 再生速度表示を更新

        switch (event.code) {
            case 'Enter':
            case 'Tab':
                event.preventDefault();
                if (activeElement.className === 'input-annotation') {
                    const inputAnnotation = document.querySelectorAll('.input-annotation');
                    for (let i = 0; i < inputAnnotation.length; i++) {
                        if (activeElement === inputAnnotation[i]) {
                            inputAnnotation[(i + 2) % inputAnnotation.length].focus();
                        }
                    }
                }
                break;
            case 'Space':
                if (activeElement.className === 'input-annotation') {
                    return;
                }
                event.preventDefault();
                wavesurfer.playPause();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                if (wavesurfer.isPlaying()) return;
                const newTimeLeft = Math.max(0, wavesurfer.getCurrentTime() - 3);
                wavesurfer.setCurrentTime(newTimeLeft);
                updateCurrentTimeDisplay(newTimeLeft);
                break;
            case 'ArrowRight':
                event.preventDefault();
                if (wavesurfer.isPlaying()) return;
                const newTimeRight = Math.min(wavesurfer.getDuration(), wavesurfer.getCurrentTime() + 3);
                wavesurfer.setCurrentTime(newTimeRight);
                updateCurrentTimeDisplay(newTimeRight);
                break;
            case 'ArrowUp':
                event.preventDefault();
                wavesurfer.setCurrentTime(0);
                updateCurrentTimeDisplay(0);
                break;
            case 'NumpadAdd':  // テンキーの "+"キー
            case 'Semicolon':  // ";"キー
                event.preventDefault();
                zoomLevel = Math.min(maxZoomLevel, zoomLevel + 50);
                wavesurfer.zoom(zoomLevel);
                break;
            case 'Minus':  // "-"キー
            case 'NumpadSubtract':  // テンキーの "-"キー
                event.preventDefault();
                zoomLevel = Math.max(minZoomLevel, zoomLevel - 50);
                wavesurfer.zoom(zoomLevel);
                break;
            case 'Digit0':  // "0"キー
            case 'Numpad0':  // テンキーの "0"キー
                event.preventDefault();
                zoomLevel = 0;
                wavesurfer.zoom(zoomLevel);
                break;
            case 'Numpad1':  // テンキーの "1"キー
                event.preventDefault();
                playbackRate = Math.max(0.3, playbackRate - 0.1); // 再生速度を下げる
                wavesurfer.setPlaybackRate(playbackRate);
                updatePlaybackRateDisplay(playbackRate); // 再生速度表示を更新
                break;
            case 'Numpad2':  // テンキーの "2"キー
                event.preventDefault();
                playbackRate = Math.min(1.5, playbackRate + 0.1); // 再生速度を上げる
                wavesurfer.setPlaybackRate(playbackRate);
                updatePlaybackRateDisplay(playbackRate); // 再生速度表示を更新
                break;
        }
    });

    wavesurfer.on('ready', () => {
        wavesurfer.setVolume(0.5); // ボリュームの初期値を設定
    });

    wavesurfer.on('audioprocess', () => {
        updateCurrentTimeDisplay(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('seek', () => {
        updateCurrentTimeDisplay(wavesurfer.getCurrentTime());
    });

    function updateCurrentTimeDisplay(time) {
        currentTimeDisplay.textContent = `Current Time: ${time.toFixed(2)}s`;
    }

    // 再生速度表示を更新する関数
    function updatePlaybackRateDisplay(rate) {
        playbackRateDisplay.textContent = `Playback Rate: ${rate.toFixed(1)}x`;
    }

    // ピンイン置換機能
    function replacePinyin(inputElement) {
        const replacements = {
            'a1': 'ā', 'a2': 'á', 'a3': 'ǎ', 'a4': 'à',
            'e1': 'ē', 'e2': 'é', 'e3': 'ě', 'e4': 'è',
            'i1': 'ī', 'i2': 'í', 'i3': 'ǐ', 'i4': 'ì',
            'o1': 'ō', 'o2': 'ó', 'o3': 'ǒ', 'o4': 'ò',
            'u1': 'ū', 'u2': 'ú', 'u3': 'ǔ', 'u4': 'ù',
            'ü1': 'ǖ', 'ü2': 'ǘ', 'ü3': 'ǚ', 'ü4': 'ǜ',
            'A1': 'Ā', 'A2': 'Á', 'A3': 'Ǎ', 'A4': 'À',
            'E1': 'Ē', 'E2': 'É', 'E3': 'Ě', 'E4': 'È',
            'I1': 'Ī', 'I2': 'Í', 'I3': 'Ǐ', 'I4': 'Ì',
            'O1': 'Ō', 'O2': 'Ó', 'O3': 'Ǒ', 'O4': 'Ò',
            'U1': 'Ū', 'U2': 'Ú', 'U3': 'Ǔ', 'U4': 'Ù',
            'Ü1': 'Ǖ', 'Ü2': 'Ǘ', 'Ü3': 'Ǚ', 'Ü4': 'Ǜ',
            'v': 'ü', 'V': 'Ü'
        };
    
        let value = inputElement.value;
        let newValue = value;
    
        for (let key in replacements) {
            if (value.includes(key)) {
                newValue = newValue.replace(key, replacements[key]);
            }
        }
    
        if (newValue !== value) {
            inputElement.value = newValue;
        }
    }    
});
