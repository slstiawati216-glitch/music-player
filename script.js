// =============================================
// MUSIC PLAYER — script.js
// =============================================


// =============================================
// 1. DATA
// =============================================
let songs = [];

// Contoh lirik untuk lagu pertama (jika ada)
songs[0] && (songs[0].lyrics = {
    5:  "Memulai pagi dengan melodi...",
    10: "Hanyut dalam ritme yang tenang...",
    20: "Sunset vibes di cakrawala..."
});


// =============================================
// 2. DOM REFERENCES
// =============================================
const audio          = document.getElementById('audio');
const titleEl        = document.getElementById('title');
const artistEl       = document.getElementById('artist');
const cover          = document.getElementById('cover');
const playlistDiv    = document.getElementById('playlist');
const fileUpload     = document.getElementById('file-upload');
const searchInput    = document.getElementById('search-input');
const toastContainer = document.getElementById('toast-container');
const progressBar    = document.getElementById('progress-bar');
const currentTimeEl  = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');
const volumeControl  = document.getElementById('volume-control');
const canvas         = document.getElementById('visualizer');
const ctx            = canvas.getContext('2d');
const lyricsText     = document.getElementById('lyrics-text');
const pauseOverlay   = document.getElementById('pause-overlay');

// Tombol kontrol
const shuffleBtn   = document.getElementById('shuffle-btn');
const repeatBtn    = document.getElementById('repeat-btn');
const nextBtn      = document.getElementById('next-btn');
const prevBtn      = document.getElementById('prev-btn');
const playPauseBtn = document.getElementById('play-pause-btn');


// =============================================
// 3. STATE
// =============================================
let currentIndex = 0;
let isShuffle    = false;
let isRepeat     = false;
let isPlaying    = false;

let audioContext, analyser, source, animationId;

let currentUser = null;
let usersData   = JSON.parse(localStorage.getItem('music_app_users')) || {};


// =============================================
// 4. PAUSE OVERLAY
// =============================================
function showPauseOverlay() {
    cover.classList.add('paused');
    pauseOverlay.classList.add('visible');
}

function hidePauseOverlay() {
    cover.classList.remove('paused');
    pauseOverlay.classList.remove('visible');
}

function updatePlayPauseBtn() {
    playPauseBtn.textContent = isPlaying ? '⏸️' : '▶️';
    playPauseBtn.classList.toggle('playing', isPlaying);
}


// =============================================
// 5. PLAY / PAUSE
// =============================================
playPauseBtn?.addEventListener('click', () => {
    if (songs.length === 0) { showToast("Tidak ada lagu di playlist!"); return; }
    audio.paused ? audio.play() : audio.pause();
});

audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayPauseBtn();
    hidePauseOverlay();
    if (audioContext?.state === 'suspended') audioContext.resume();
    initVisualizer();
});

audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayPauseBtn();
    showPauseOverlay();
});

audio.addEventListener('ended', () => {
    isPlaying = false;
    updatePlayPauseBtn();
});


// =============================================
// 6. AUTH
// =============================================
function toggleAuth(mode) {
    document.getElementById('login-form').style.display    = mode === 'login'  ? 'block' : 'none';
    document.getElementById('register-form').style.display = mode === 'reg'    ? 'block' : 'none';
    document.getElementById('forgot-form').style.display   = mode === 'forgot' ? 'block' : 'none';
}

function handleRegister() {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    if (!user || !pass) return showToast("Isi semua data!");
    if (usersData[user]) return showToast("Username sudah terdaftar!");
    usersData[user] = { password: pass, playlist: [] };
    localStorage.setItem('music_app_users', JSON.stringify(usersData));
    showToast("Registrasi berhasil! Silakan Login.");
    toggleAuth('login');
}

function handleLogin() {
    const userField = document.getElementById('login-user');
    const user      = userField.value.trim();
    const pass      = document.getElementById('login-pass').value.trim();

    if (usersData[user]?.password === pass) {
        currentUser = user;
        document.getElementById('auth-modal').style.display = 'none';

        const displayUsername = document.getElementById('display-username');
        if (displayUsername) displayUsername.innerText = user;

        if (usersData[user].playlist?.length > 0) songs = usersData[user].playlist;

        createPlaylist();
        if (songs.length > 0) loadSong(0);

        showToast(`Selamat datang, ${user}!`);
        userField.value = '';
        document.getElementById('login-pass').value = '';
    } else {
        showToast("Username atau Password salah!");
    }
}

function handleForgot() {
    const user = document.getElementById('forgot-user').value.trim();
    if (usersData[user]) {
        alert(`Password untuk "${user}" adalah: ${usersData[user].password}`);
    } else {
        showToast("Username tidak ditemukan!");
    }
}

function saveUserData() {
    if (!currentUser) return;
    usersData[currentUser].playlist = songs;
    localStorage.setItem('music_app_users', JSON.stringify(usersData));
}


// =============================================
// 7. VOLUME & PROGRESS
// =============================================
volumeControl.addEventListener('input', (e) => {
    audio.volume = e.target.value;
});

audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    progressBar.value        = (audio.currentTime / audio.duration) * 100 || 0;
    currentTimeEl.innerText  = formatTime(audio.currentTime);
    durationTimeEl.innerText = formatTime(audio.duration);
    syncLyrics();
});

progressBar.addEventListener('input', (e) => {
    if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
});

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
}


// =============================================
// 8. LIRIK
// =============================================
function syncLyrics() {
    if (!songs[currentIndex]?.lyrics) {
        lyricsText.innerText = "Lirik tidak tersedia";
        return;
    }
    const currentSeconds = Math.floor(audio.currentTime);
    const lyrics         = songs[currentIndex].lyrics;
    if (lyrics[currentSeconds]) {
        lyricsText.innerText        = lyrics[currentSeconds];
        lyricsText.style.animation  = 'none';
        lyricsText.offsetHeight;                        // force reflow
        lyricsText.style.animation  = 'slideUp 0.5s ease';
    }
}


// =============================================
// 9. VISUALIZER
// =============================================
function initVisualizer() {
    if (audioContext) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser     = audioContext.createAnalyser();
    source       = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 64;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray    = new Uint8Array(bufferLength);

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            ctx.fillStyle   = `rgba(29, 185, 84, ${barHeight / 100})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}


// =============================================
// 10. TEMA WARNA OTOMATIS
//     Sesuai variabel CSS baru: --primary & --primary-glow
// =============================================
function updateThemeColor(imageSrc) {
    const img        = new Image();
    img.crossOrigin  = 'Anonymous';
    img.src          = imageSrc;
    img.onload = function () {
        const tempCanvas = document.createElement('canvas');
        const tempCtx    = tempCanvas.getContext('2d');
        tempCanvas.width  = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);

        const p = tempCtx.getImageData(img.width / 2, img.height / 2, 1, 1).data;
        document.documentElement.style.setProperty('--primary',      `rgb(${p[0]}, ${p[1]}, ${p[2]})`);
        document.documentElement.style.setProperty('--primary-glow', `rgba(${p[0]}, ${p[1]}, ${p[2]}, 0.25)`);
        document.documentElement.style.setProperty('--primary-dim',  `rgba(${p[0]}, ${p[1]}, ${p[2]}, 0.15)`);
    };
}


// =============================================
// 11. LOAD SONG
// =============================================
function loadSong(index) {
    if (songs.length === 0) return;
    currentIndex = index;

    const song         = songs[index];
    titleEl.innerText  = song.title;
    artistEl.innerText = song.artist;
    cover.src          = song.cover;
    audio.src          = song.src;
    audio.load();

    hidePauseOverlay();
    isPlaying = false;
    updatePlayPauseBtn();

    updateThemeColor(song.cover);
    lyricsText.innerText = "Memuat lirik...";
    updatePlaylistUI(index);
}


// =============================================
// 12. PLAYLIST
// =============================================
function createPlaylist(filterText = "") {
    playlistDiv.innerHTML = '';

    const filteredSongs = songs.filter(song =>
        song.title.toLowerCase().includes(filterText.toLowerCase()) ||
        song.artist.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filteredSongs.length === 0) {
        playlistDiv.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:0.8rem;padding:16px 0;">Tidak ada lagu ditemukan</p>';
        return;
    }

    filteredSongs.forEach((song) => {
        const originalIndex = songs.findIndex(s => s.src === song.src);
        const div           = document.createElement('div');
        div.classList.add('playlist-item');
        if (originalIndex === currentIndex) div.classList.add('active');

        div.innerHTML = `
            <div class="playlist-item-info" onclick="playSelected(${originalIndex})">
                <strong>${song.title}</strong>
                <span>${song.artist}</span>
            </div>
            <button class="delete-btn" onclick="deleteSong(event, ${originalIndex})" title="Hapus lagu">
                <i class="fas fa-trash" aria-hidden="true"></i>
            </button>
        `;
        playlistDiv.appendChild(div);
    });
}

function playSelected(index) {
    loadSong(index);
    audio.play();
}

function deleteSong(event, index) {
    event.stopPropagation();
    if (songs.length <= 1) { showToast("Minimal harus ada satu lagu!"); return; }

    songs.splice(index, 1);
    saveUserData();

    if (index === currentIndex) {
        currentIndex = 0;
        loadSong(currentIndex);
    } else if (index < currentIndex) {
        currentIndex--;
    }

    createPlaylist();
    showToast("Lagu berhasil dihapus");
}

function updatePlaylistUI(activeIndex) {
    document.querySelectorAll('.playlist-item').forEach((item, i) => {
        item.classList.toggle('active', i === activeIndex);
    });
}

searchInput.addEventListener('input', (e) => createPlaylist(e.target.value));


// =============================================
// 13. UPLOAD LAGU
// =============================================
fileUpload?.addEventListener('change', function (e) {
    const files = e.target.files;

    for (const file of files) {
        const reader    = new FileReader();
        reader.onload   = function (event) {
            const fileName = file.name.replace(/\.[^/.]+$/, "");
            songs.push({
                title:  fileName,
                artist: "File Lokal",
                src:    event.target.result,
                cover:  `https://picsum.photos/seed/${Math.random()}/500/500`
            });
            saveUserData();
            createPlaylist();
            showToast(`"${fileName}" berhasil ditambahkan!`);
        };
        reader.readAsDataURL(file);
    }

    // Reset agar file yang sama bisa di-upload ulang
    fileUpload.value = '';
});


// =============================================
// 14. NAVIGASI LAGU
// =============================================
audio.onended = () => {
    isRepeat ? audio.play() : nextSong();
};

function nextSong() {
    if (songs.length === 0) return;

    if (isShuffle) {
        let rand;
        do { rand = Math.floor(Math.random() * songs.length); }
        while (rand === currentIndex && songs.length > 1);
        currentIndex = rand;
    } else {
        currentIndex = (currentIndex + 1) % songs.length;
    }

    loadSong(currentIndex);
    audio.play();
}

function prevSong() {
    if (songs.length === 0) return;

    // Jika sudah > 3 detik, restart lagu; jika tidak, ke lagu sebelumnya
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    loadSong(currentIndex);
    audio.play();
}

nextBtn?.addEventListener('click', nextSong);
prevBtn?.addEventListener('click', prevSong);

shuffleBtn?.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
    showToast(isShuffle ? "Mode Acak Aktif 🔀" : "Mode Berurutan Aktif");
});

repeatBtn?.addEventListener('click', () => {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle('active', isRepeat);
    showToast(isRepeat ? "Ulangi Lagu Aktif 🔁" : "Ulangi Dimatikan");
});


// =============================================
// 15. TOAST
// =============================================
function showToast(message) {
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}


// =============================================
// 16. INIT
// =============================================
createPlaylist();
if (songs.length > 0) loadSong(0);