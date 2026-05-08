// =============================================
// MUSIC PLAYER — script.js
// =============================================


// =============================================
// 1. DATA
// =============================================
var songs = [];


// =============================================
// 2. DOM REFERENCES
// =============================================
var audio          = document.getElementById('audio');
var titleEl        = document.getElementById('title');
var artistEl       = document.getElementById('artist');
var cover          = document.getElementById('cover');
var playlistDiv    = document.getElementById('playlist');
var fileUpload     = document.getElementById('file-upload');
var searchInput    = document.getElementById('search-input');
var toastContainer = document.getElementById('toast-container');
var progressBar    = document.getElementById('progress-bar');
var currentTimeEl  = document.getElementById('current-time');
var durationTimeEl = document.getElementById('duration-time');
var volumeControl  = document.getElementById('volume-control');
var canvas         = document.getElementById('visualizer');
var canvasCtx      = canvas ? canvas.getContext('2d') : null;
var lyricsText     = document.getElementById('lyrics-text');
var pauseOverlay   = document.getElementById('pause-overlay');

var shuffleBtn   = document.getElementById('shuffle-btn');
var repeatBtn    = document.getElementById('repeat-btn');
var nextBtn      = document.getElementById('next-btn');
var prevBtn      = document.getElementById('prev-btn');
var playPauseBtn = document.getElementById('play-pause-btn');


// =============================================
// 3. STATE
// =============================================
var currentIndex   = 0;
var isShuffle      = false;
var isRepeat       = false;
var isPlaying      = false;

var audioContext   = null;
var analyser       = null;
var audioSource    = null;
var animationId    = null;

var currentUser = null;
var usersData   = {};

try {
    usersData = JSON.parse(localStorage.getItem('music_app_users')) || {};
} catch (e) {
    usersData = {};
}


// =============================================
// 4. CANVAS RESIZE
// =============================================
function resizeCanvas() {
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  || 300;
    canvas.height = canvas.offsetHeight || 80;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);


// =============================================
// 5. PAUSE OVERLAY
// =============================================
function showPauseOverlay() {
    if (!cover || !pauseOverlay) return;
    cover.classList.add('paused');
    pauseOverlay.classList.add('visible');
    pauseOverlay.removeAttribute('aria-hidden');
}

function hidePauseOverlay() {
    if (!cover || !pauseOverlay) return;
    cover.classList.remove('paused');
    pauseOverlay.classList.remove('visible');
    pauseOverlay.setAttribute('aria-hidden', 'true');
}

function updatePlayPauseBtn() {
    if (!playPauseBtn) return;
    if (isPlaying) {
        playPauseBtn.textContent = '⏸️';
        playPauseBtn.setAttribute('aria-label', 'Pause');
        playPauseBtn.classList.add('playing');
    } else {
        playPauseBtn.textContent = '▶️';
        playPauseBtn.setAttribute('aria-label', 'Play');
        playPauseBtn.classList.remove('playing');
    }
}


// =============================================
// 6. VOLUME ICON UPDATE
// =============================================
function updateVolumeIcon(vol) {
    var icon = document.getElementById('volume-icon');
    if (!icon) return;
    icon.className = 'fas ' + (vol === 0 ? 'fa-volume-mute' : vol < 0.5 ? 'fa-volume-down' : 'fa-volume-up');
}


// =============================================
// 7. PLAY / PAUSE
// =============================================
if (playPauseBtn) {
    playPauseBtn.addEventListener('click', function () {
        if (songs.length === 0) {
            showToast('Tidak ada lagu di playlist! Tambah lagu dulu.');
            return;
        }
        if (audio.paused) {
            audio.play().catch(function (err) {
                showToast('Gagal memutar: ' + err.message);
            });
        } else {
            audio.pause();
        }
    });
}

audio.addEventListener('play', function () {
    isPlaying = true;
    updatePlayPauseBtn();
    hidePauseOverlay();
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    initVisualizer();
});

audio.addEventListener('pause', function () {
    isPlaying = false;
    updatePlayPauseBtn();
    showPauseOverlay();
});

audio.addEventListener('ended', function () {
    isPlaying = false;
    updatePlayPauseBtn();
    if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(function () {});
    } else {
        nextSong();
    }
});

audio.addEventListener('error', function () {
    showToast('Gagal memuat audio. Format tidak didukung atau file rusak.');
    isPlaying = false;
    updatePlayPauseBtn();
    showPauseOverlay();
});

audio.addEventListener('loadedmetadata', function () {
    if (durationTimeEl) {
        durationTimeEl.textContent = formatTime(audio.duration);
    }
});


// =============================================
// 8. AUTH
// =============================================
function toggleAuth(mode) {
    var loginForm    = document.getElementById('login-form');
    var registerForm = document.getElementById('register-form');
    var forgotForm   = document.getElementById('forgot-form');

    if (loginForm)    loginForm.style.display    = (mode === 'login')  ? 'block' : 'none';
    if (registerForm) registerForm.style.display = (mode === 'reg')    ? 'block' : 'none';
    if (forgotForm)   forgotForm.style.display   = (mode === 'forgot') ? 'block' : 'none';
}

function handleRegister() {
    var userEl = document.getElementById('reg-user');
    var passEl = document.getElementById('reg-pass');
    if (!userEl || !passEl) return;

    var user = userEl.value.trim();
    var pass = passEl.value.trim();

    if (!user || !pass) {
        showToast('Isi semua kolom terlebih dahulu!');
        return;
    }
    if (user.length < 3) {
        showToast('Username minimal 3 karakter!');
        return;
    }
    if (pass.length < 4) {
        showToast('Password minimal 4 karakter!');
        return;
    }
    if (usersData[user]) {
        showToast('Username sudah terdaftar!');
        return;
    }

    usersData[user] = { password: pass, playlist: [] };
    saveToLocalStorage();

    showToast('Registrasi berhasil! Silakan Login.');
    userEl.value = '';
    passEl.value = '';
    toggleAuth('login');
}

function handleLogin() {
    var userEl = document.getElementById('login-user');
    var passEl = document.getElementById('login-pass');
    if (!userEl || !passEl) return;

    var user = userEl.value.trim();
    var pass = passEl.value.trim();

    if (!user || !pass) {
        showToast('Isi semua kolom terlebih dahulu!');
        return;
    }

    if (usersData[user] && usersData[user].password === pass) {
        currentUser = user;

        var authModal = document.getElementById('auth-modal');
        if (authModal) authModal.style.display = 'none';

        var displayUsername = document.getElementById('display-username');
        if (displayUsername) displayUsername.textContent = user;

        // Load user playlist
        if (usersData[user].playlist && usersData[user].playlist.length > 0) {
            songs = usersData[user].playlist;
        }

        createPlaylist();
        if (songs.length > 0) {
            loadSong(0);
        }

        showToast('Selamat datang, ' + user + '! 🎵');
        passEl.value = '';
    } else {
        showToast('Username atau Password salah!');
    }
}

function handleForgot() {
    var userEl = document.getElementById('forgot-user');
    if (!userEl) return;

    var user = userEl.value.trim();
    if (!user) {
        showToast('Masukkan username terlebih dahulu!');
        return;
    }

    if (usersData[user]) {
        // Tampilkan sebagai toast (lebih aman dari alert)
        showToast('Password untuk "' + user + '": ' + usersData[user].password, 6000);
        userEl.value = '';
    } else {
        showToast('Username tidak ditemukan!');
    }
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('music_app_users', JSON.stringify(usersData));
    } catch (e) {
        showToast('Gagal menyimpan data. Storage mungkin penuh.');
    }
}

function saveUserData() {
    if (!currentUser) return;
    // Simpan src sebagai base64 tidak ideal untuk localStorage (batas 5MB)
    // Hanya simpan metadata, bukan data audio mentah
    var playlistMeta = songs.map(function (s) {
        return {
            title:  s.title,
            artist: s.artist,
            cover:  s.cover,
            src:    s.src.startsWith('blob:') ? '' : s.src,  // jangan simpan blob URL
            lyrics: s.lyrics || null
        };
    });
    usersData[currentUser].playlist = playlistMeta;
    saveToLocalStorage();
}


// =============================================
// 9. VOLUME & PROGRESS
// =============================================
if (volumeControl) {
    volumeControl.addEventListener('input', function (e) {
        var vol = parseFloat(e.target.value);
        audio.volume = vol;
        updateVolumeIcon(vol);
    });
}

audio.addEventListener('timeupdate', function () {
    if (!audio.duration || isNaN(audio.duration)) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    if (progressBar) progressBar.value = pct;
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
    syncLyrics();
});

if (progressBar) {
    progressBar.addEventListener('input', function (e) {
        if (audio.duration && !isNaN(audio.duration)) {
            audio.currentTime = (parseFloat(e.target.value) / 100) * audio.duration;
        }
    });
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    var min = Math.floor(seconds / 60);
    var sec = Math.floor(seconds % 60);
    return min + ':' + (sec < 10 ? '0' + sec : sec);
}


// =============================================
// 10. LIRIK
// =============================================
function syncLyrics() {
    if (!lyricsText) return;
    var song = songs[currentIndex];
    if (!song || !song.lyrics) {
        lyricsText.textContent = 'Lirik tidak tersedia';
        return;
    }

    var currentSeconds = Math.floor(audio.currentTime);
    var lyrics = song.lyrics;

    // Cari lirik yang tepat atau terakhir yang cocok
    var matchedText = null;
    var keys = Object.keys(lyrics).map(Number).sort(function (a, b) { return a - b; });
    for (var i = 0; i < keys.length; i++) {
        if (currentSeconds >= keys[i]) {
            matchedText = lyrics[keys[i]];
        }
    }

    if (matchedText && lyricsText.textContent !== matchedText) {
        lyricsText.textContent = matchedText;
        lyricsText.classList.remove('lyrics-fade');
        void lyricsText.offsetHeight; // force reflow
        lyricsText.classList.add('lyrics-fade');
    }
}


// =============================================
// 11. VISUALIZER
// =============================================
function initVisualizer() {
    if (!canvas || !canvasCtx) return;
    if (audioContext) return; // sudah diinisialisasi

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser     = audioContext.createAnalyser();
        audioSource  = audioContext.createMediaElementSource(audio);
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 64;
    } catch (e) {
        console.warn('Web Audio API tidak didukung:', e);
        return;
    }

    var bufferLength = analyser.frequencyBinCount;
    var dataArray    = new Uint8Array(bufferLength);

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        var barWidth = (canvas.width / bufferLength) * 2.5;
        var x = 0;

        for (var i = 0; i < bufferLength; i++) {
            var barHeight = (dataArray[i] / 255) * canvas.height;
            var alpha     = dataArray[i] / 255;
            canvasCtx.fillStyle = 'rgba(29, 185, 84, ' + (alpha * 0.8 + 0.1) + ')';
            canvasCtx.beginPath();
            canvasCtx.roundRect
                ? canvasCtx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, 2)
                : canvasCtx.rect(x, canvas.height - barHeight, barWidth, barHeight);
            canvasCtx.fill();
            x += barWidth + 1;
        }
    }
    draw();
}

function stopVisualizer() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (canvasCtx && canvas) {
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
}


// =============================================
// 12. TEMA WARNA OTOMATIS DARI COVER
// =============================================
function updateThemeColor(imageSrc) {
    if (!imageSrc || imageSrc.startsWith('blob:')) return; // blob tidak bisa dibaca crossorigin
    var img         = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
        try {
            var tempCanvas = document.createElement('canvas');
            var tempCtx    = tempCanvas.getContext('2d');
            tempCanvas.width  = 10;
            tempCanvas.height = 10;
            tempCtx.drawImage(img, 0, 0, 10, 10);

            // Ambil warna dominan dari titik tengah
            var p = tempCtx.getImageData(5, 5, 1, 1).data;
            var r = p[0], g = p[1], b = p[2];

            // Pastikan warna tidak terlalu gelap
            var brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness < 50) { r = 29; g = 185; b = 84; } // fallback ke hijau

            document.documentElement.style.setProperty('--primary',        'rgb(' + r + ', ' + g + ', ' + b + ')');
            document.documentElement.style.setProperty('--primary-glow',   'rgba(' + r + ', ' + g + ', ' + b + ', 0.25)');
            document.documentElement.style.setProperty('--primary-dim',    'rgba(' + r + ', ' + g + ', ' + b + ', 0.15)');
            document.documentElement.style.setProperty('--primary-border', 'rgba(' + r + ', ' + g + ', ' + b + ', 0.3)');
        } catch (e) {
            // CORS error — abaikan, tetap pakai warna default
        }
    };
    img.onerror = function () { /* silent fail */ };
    img.src = imageSrc;
}


// =============================================
// 13. LOAD SONG
// =============================================
function loadSong(index) {
    if (songs.length === 0) return;

    // Clamp index agar tidak out of bounds
    index = ((index % songs.length) + songs.length) % songs.length;
    currentIndex = index;

    var song = songs[index];
    if (!song) return;

    if (titleEl)  titleEl.textContent  = song.title  || 'Judul tidak diketahui';
    if (artistEl) artistEl.textContent = song.artist || 'Artis tidak diketahui';

    if (cover) {
        cover.src = song.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000';
        cover.alt = 'Cover Album: ' + (song.title || '');
    }

    audio.src = song.src || '';
    audio.load();

    // Reset UI
    hidePauseOverlay();
    isPlaying = false;
    updatePlayPauseBtn();
    if (progressBar) progressBar.value = 0;
    if (currentTimeEl)  currentTimeEl.textContent  = '0:00';
    if (durationTimeEl) durationTimeEl.textContent = '0:00';
    if (lyricsText) lyricsText.textContent = 'Memuat lirik...';

    updateThemeColor(song.cover);
    updatePlaylistUI(index);
    scrollPlaylistToActive();
}


// =============================================
// 14. PLAYLIST
// =============================================
function createPlaylist(filterText) {
    if (!playlistDiv) return;
    filterText = (filterText || '').toLowerCase().trim();
    playlistDiv.innerHTML = '';

    var filtered = [];
    for (var i = 0; i < songs.length; i++) {
        var s = songs[i];
        if (
            s.title.toLowerCase().includes(filterText) ||
            s.artist.toLowerCase().includes(filterText)
        ) {
            filtered.push({ song: s, originalIndex: i });
        }
    }

    if (filtered.length === 0) {
        var empty = document.createElement('p');
        empty.className   = 'playlist-empty';
        empty.textContent = filterText ? 'Tidak ada lagu ditemukan untuk "' + filterText + '"' : 'Belum ada lagu. Tambahkan lagu baru!';
        playlistDiv.appendChild(empty);
        return;
    }

    var fragment = document.createDocumentFragment();
    filtered.forEach(function (item, idx) {
        var song          = item.song;
        var originalIndex = item.originalIndex;

        var div = document.createElement('div');
        div.className  = 'playlist-item' + (originalIndex === currentIndex ? ' active' : '');
        div.setAttribute('role', 'listitem');
        div.setAttribute('tabindex', '0');
        div.setAttribute('aria-label', song.title + ' oleh ' + song.artist);

        var numEl = document.createElement('span');
        numEl.className   = 'playlist-item-number';
        numEl.textContent = (idx + 1);
        numEl.setAttribute('aria-hidden', 'true');

        var infoEl = document.createElement('div');
        infoEl.className = 'playlist-item-info';

        var titleSpan = document.createElement('strong');
        titleSpan.textContent = song.title;

        var artistSpan = document.createElement('span');
        artistSpan.textContent = song.artist;

        infoEl.appendChild(titleSpan);
        infoEl.appendChild(artistSpan);

        var delBtn = document.createElement('button');
        delBtn.className  = 'delete-btn';
        delBtn.title      = 'Hapus lagu';
        delBtn.setAttribute('aria-label', 'Hapus ' + song.title);
        delBtn.innerHTML  = '<i class="fas fa-trash" aria-hidden="true"></i>';

        // Event: klik info → putar lagu
        infoEl.addEventListener('click', (function (idx) {
            return function () { playSelected(idx); };
        })(originalIndex));

        // Event: Enter/Space pada playlist item
        div.addEventListener('keydown', (function (idx) {
            return function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playSelected(idx);
                }
            };
        })(originalIndex));

        // Event: hapus
        delBtn.addEventListener('click', (function (idx) {
            return function (e) {
                e.stopPropagation();
                deleteSong(idx);
            };
        })(originalIndex));

        div.appendChild(numEl);
        div.appendChild(infoEl);
        div.appendChild(delBtn);
        fragment.appendChild(div);
    });

    playlistDiv.appendChild(fragment);
}

function playSelected(index) {
    loadSong(index);
    audio.play().catch(function (err) {
        showToast('Gagal memutar: ' + err.message);
    });
}

function deleteSong(index) {
    if (songs.length <= 1) {
        showToast('Minimal harus ada satu lagu!');
        return;
    }

    var deletedTitle = songs[index].title;
    songs.splice(index, 1);
    saveUserData();

    if (index === currentIndex) {
        currentIndex = Math.min(currentIndex, songs.length - 1);
        loadSong(currentIndex);
        if (isPlaying) {
            audio.play().catch(function () {});
        }
    } else if (index < currentIndex) {
        currentIndex--;
    }

    createPlaylist(searchInput ? searchInput.value : '');
    showToast('"' + deletedTitle + '" berhasil dihapus');
}

function updatePlaylistUI(activeIndex) {
    if (!playlistDiv) return;
    var items = playlistDiv.querySelectorAll('.playlist-item');
    items.forEach(function (item, i) {
        // Perlu mapping ulang karena filtered list
        // Ambil dari data-index jika ada, atau lewati
        item.classList.remove('active');
    });
    // Re-render lebih aman
    createPlaylist(searchInput ? searchInput.value : '');
}

function scrollPlaylistToActive() {
    if (!playlistDiv) return;
    var activeItem = playlistDiv.querySelector('.playlist-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

if (searchInput) {
    searchInput.addEventListener('input', function (e) {
        createPlaylist(e.target.value);
    });
}


// =============================================
// 15. UPLOAD LAGU
// =============================================
if (fileUpload) {
    fileUpload.addEventListener('change', function (e) {
        var files = Array.prototype.slice.call(e.target.files);
        if (files.length === 0) return;

        var loaded = 0;
        files.forEach(function (file) {
            // Validasi tipe
            if (!file.type.startsWith('audio/')) {
                showToast('"' + file.name + '" bukan file audio!');
                return;
            }
            // Validasi ukuran (max 50MB)
            if (file.size > 50 * 1024 * 1024) {
                showToast('"' + file.name + '" terlalu besar (maks 50MB)!');
                return;
            }

            var reader  = new FileReader();
            var fileName = file.name.replace(/\.[^/.]+$/, '');

            reader.onload = function (event) {
                var newSong = {
                    title:  fileName,
                    artist: 'File Lokal',
                    src:    event.target.result,
                    cover:  'https://picsum.photos/seed/' + encodeURIComponent(fileName) + '/500/500',
                    lyrics: null
                };
                songs.push(newSong);
                loaded++;

                if (loaded === files.length) {
                    saveUserData();
                    createPlaylist(searchInput ? searchInput.value : '');
                    showToast(loaded + ' lagu berhasil ditambahkan!');
                    // Auto-play lagu pertama yang baru jika belum ada yang diputar
                    if (songs.length === loaded && !isPlaying) {
                        loadSong(0);
                    }
                }
            };

            reader.onerror = function () {
                showToast('Gagal membaca "' + file.name + '"');
            };

            reader.readAsDataURL(file);
        });

        // Reset input agar file yang sama bisa di-upload ulang
        fileUpload.value = '';
    });
}


// =============================================
// 16. NAVIGASI LAGU
// =============================================
function nextSong() {
    if (songs.length === 0) return;
    var next;
    if (isShuffle) {
        if (songs.length === 1) {
            next = 0;
        } else {
            do {
                next = Math.floor(Math.random() * songs.length);
            } while (next === currentIndex);
        }
    } else {
        next = (currentIndex + 1) % songs.length;
    }
    loadSong(next);
    audio.play().catch(function () {});
}

function prevSong() {
    if (songs.length === 0) return;
    // Jika sudah lebih dari 3 detik, restart; jika tidak, lagu sebelumnya
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    var prev;
    if (isShuffle) {
        if (songs.length === 1) {
            prev = 0;
        } else {
            do {
                prev = Math.floor(Math.random() * songs.length);
            } while (prev === currentIndex);
        }
    } else {
        prev = (currentIndex - 1 + songs.length) % songs.length;
    }
    loadSong(prev);
    audio.play().catch(function () {});
}

if (nextBtn) nextBtn.addEventListener('click', nextSong);
if (prevBtn) prevBtn.addEventListener('click', prevSong);

if (shuffleBtn) {
    shuffleBtn.addEventListener('click', function () {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
        shuffleBtn.setAttribute('aria-pressed', isShuffle ? 'true' : 'false');
        showToast(isShuffle ? 'Mode Acak Aktif 🔀' : 'Mode Berurutan Aktif');
    });
}

if (repeatBtn) {
    repeatBtn.addEventListener('click', function () {
        isRepeat = !isRepeat;
        repeatBtn.classList.toggle('active', isRepeat);
        repeatBtn.setAttribute('aria-pressed', isRepeat ? 'true' : 'false');
        showToast(isRepeat ? 'Ulangi Lagu Aktif 🔁' : 'Ulangi Dimatikan');
    });
}


// =============================================
// 17. KEYBOARD SHORTCUTS
// =============================================
document.addEventListener('keydown', function (e) {
    var authModal = document.getElementById('auth-modal');
    if (authModal && authModal.style.display !== 'none') return;

    // Jangan intercept jika fokus di input/textarea
    var tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    switch (e.key) {
        case ' ':
        case 'k':
            e.preventDefault();
            if (playPauseBtn) playPauseBtn.click();
            break;
        case 'ArrowRight':
        case 'l':
            e.preventDefault();
            nextSong();
            break;
        case 'ArrowLeft':
        case 'j':
            e.preventDefault();
            prevSong();
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (audio.volume < 1) {
                audio.volume = Math.min(1, audio.volume + 0.1);
                if (volumeControl) volumeControl.value = audio.volume;
                updateVolumeIcon(audio.volume);
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (audio.volume > 0) {
                audio.volume = Math.max(0, audio.volume - 0.1);
                if (volumeControl) volumeControl.value = audio.volume;
                updateVolumeIcon(audio.volume);
            }
            break;
        case 'm':
            e.preventDefault();
            audio.muted = !audio.muted;
            showToast(audio.muted ? 'Suara dimatikan 🔇' : 'Suara dinyalakan 🔊');
            break;
    }
});


// =============================================
// 18. TOAST
// =============================================
function showToast(message, duration) {
    if (!toastContainer) return;
    duration = duration || 3000;

    var toast = document.createElement('div');
    toast.className   = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, duration);
}


// =============================================
// 19. INIT
// =============================================
(function init() {
    createPlaylist();
    if (songs.length > 0) {
        loadSong(0);
    }
    // Set volume awal
    if (volumeControl) {
        audio.volume = parseFloat(volumeControl.value) || 1;
    }
    updateVolumeIcon(audio.volume);
    updatePlayPauseBtn();
})();