// 1. Daftar lagu (URL assets dihapus & diganti URL gambar keren)
let songs = [
];

// Tambahkan di bagian atas songs array (Contoh lagu dengan lirik)
// Format lirik: { waktu_detik: "teks_lirik" }
songs[0] && (songs[0].lyrics = {
    5: "Memulai pagi dengan melodi...",
    10: "Hanyut dalam ritme yang tenang...",
    20: "Sunset vibes di cakrawala..."
});

const audio = document.getElementById('audio');
const title = document.getElementById('title');
const artist = document.getElementById('artist');
const cover = document.getElementById('cover');
const playlistDiv = document.getElementById('playlist');
const fileUpload = document.getElementById('file-upload');
const searchInput = document.getElementById('search-input');
const toastContainer = document.getElementById('toast-container');
// --- KODE ASLI ANDA TETAP DI ATAS ---
// (Ambil semua variabel dari kode sebelumnya)

const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');
const volumeControl = document.getElementById('volume-control');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const lyricsText = document.getElementById('lyrics-text');

let audioContext, analyser, source, animationId;
let currentUser = null;
let usersData = JSON.parse(localStorage.getItem('music_app_users')) || {};

// --- 1. NAVIGASI FORM ---
function toggleAuth(mode) {
    document.getElementById('login-form').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = mode === 'reg' ? 'block' : 'none';
    document.getElementById('forgot-form').style.display = mode === 'forgot' ? 'block' : 'none';
}

// --- 2. LOGIKA REGISTRASI ---
function handleRegister() {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();

    if (!user || !pass) return showToast("Isi semua data!");
    if (usersData[user]) return showToast("Username sudah terdaftar!");

    usersData[user] = { password: pass, playlist: [] };
    localStorage.setItem('music_app_users', JSON.stringify(usersData));
    showToast("Registrasi Berhasil! Silakan Login.");
    toggleAuth('login');
}

// --- 3. LOGIKA LOGIN ---
function handleLogin() {
    const userField = document.getElementById('login-user');
    const user = userField.value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    if (usersData[user] && usersData[user].password === pass) {
        currentUser = user;
        
        // 1. Sembunyikan Modal
        document.getElementById('auth-modal').style.display = 'none';
        
        // 2. UPDATE NAMA DI HEADER (Sangat Penting untuk UI Baru)
        const displayUsername = document.getElementById('display-username');
        if (displayUsername) {
            displayUsername.innerText = user;
        }
        
        // 3. Load Playlist User
        // Pastikan playlist user diambil dengan benar
        if (usersData[user].playlist && usersData[user].playlist.length > 0) {
            songs = usersData[user].playlist;
        }
        
        createPlaylist();
        
        // 4. Putar lagu pertama jika ada
        if (songs.length > 0) {
            loadSong(0);
        }
        
        showToast(`Selamat datang, ${user}!`);
        
        // 5. Reset input form agar bersih saat logout nanti
        userField.value = "";
        document.getElementById('login-pass').value = "";

    } else {
        showToast("Username atau Password salah!");
    }
}

// --- 4. LOGIKA LUPA PASSWORD ---
function handleForgot() {
    const user = document.getElementById('forgot-user').value.trim();
    if (usersData[user]) {
        alert(`Password untuk user "${user}" adalah: ${usersData[user].password}`);
    } else {
        showToast("Username tidak ditemukan!");
    }
}

// --- 5. SIMPAN DATA OTOMATIS ---
function saveUserData() {
    if (currentUser) {
        usersData[currentUser].playlist = songs;
        localStorage.setItem('music_app_users', JSON.stringify(usersData));
    }
}

// --- UPDATE PADA FUNGSI EKSISTING ---

// Di dalam event listener fileUpload (setelah lagu ditambahkan ke array songs)
// reader.onload = function(event) { ... songs.push(...); saveUserData(); createPlaylist(); }

// Di dalam fungsi deleteSong
// function deleteSong(event, index) { ... songs.splice(...); saveUserData(); createPlaylist(); }

// --- FITUR VOLUME ---
volumeControl.addEventListener('input', (e) => {
    audio.volume = e.target.value;
});

// --- FITUR PROGRESS BAR ---
audio.addEventListener('timeupdate', () => {
    const progress = (audio.currentTime / audio.duration) * 100;
    progressBar.value = progress || 0;
    
    // Update label waktu
    currentTimeEl.innerText = formatTime(audio.currentTime);
    if (audio.duration) durationTimeEl.innerText = formatTime(audio.duration);
});

progressBar.addEventListener('input', (e) => {
    const seekTime = (e.target.value / 100) * audio.duration;
    audio.currentTime = seekTime;
});

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
}

// --- FITUR VISUALIZER (BATANG ANIMASI) ---
function initVisualizer() {
    if (audioContext) return; // Mencegah inisialisasi ganda

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 64; // Jumlah batang (makin besar makin rapat)
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            ctx.fillStyle = `rgba(29, 185, 84, ${barHeight / 100})`; // Warna hijau mengikuti dentuman
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}

// Jalankan visualizer saat pertama kali musik diputar
audio.addEventListener('play', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    initVisualizer();
});

// --- LANJUTKAN DENGAN KODE ASLI ANDA ---
// Pastikan fungsi loadSong, createPlaylist, deleteSong, nextSong, dll tetap ada di bawah sini.
let currentIndex = 0;

// --- TAMBAHAN VARIABEL UNTUK FITUR BARU ---
let isShuffle = false;
let isRepeat = false;
const shuffleBtn = document.getElementById('shuffle-btn');
const repeatBtn = document.getElementById('repeat-btn');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');

// Fungsi Toast (Ganti alert standar)
function showToast(message) {
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- FITUR 1: TEMA WARNA OTOMATIS ---
function updateThemeColor(imageSrc) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    img.onload = function() {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        
        // Ambil data pixel dari tengah gambar
        const pixelData = tempCtx.getImageData(img.width/2, img.height/2, 1, 1).data;
        const rgb = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
        const rgba = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, 0.2)`;
        
        // Terapkan ke CSS Variables
        document.documentElement.style.setProperty('--primary-color', rgb);
        document.documentElement.style.setProperty('--primary-glow', rgba);
    };
}

// --- FITUR 2: SINKRONISASI LIRIK ---
audio.addEventListener('timeupdate', () => {
    if (!songs[currentIndex].lyrics) {
        lyricsText.innerText = "Lirik tidak tersedia";
        return;
    }
    const currentSeconds = Math.floor(audio.currentTime);
    const lyrics = songs[currentIndex].lyrics;
    
    if (lyrics[currentSeconds]) {
        lyricsText.innerText = lyrics[currentSeconds];
        // Efek animasi lirik muncul
        lyricsText.style.animation = "none";
        lyricsText.offsetHeight; 
        lyricsText.style.animation = "slideUp 0.5s ease";
    }
});

// 2. Fungsi memuat lagu ke player
// --- UPDATE FUNGSI loadSong ---
// Pastikan panggil updateThemeColor di dalam loadSong
function loadSong(index) {
    if (songs.length === 0) return; // Proteksi jika playlist kosong
    
    const song = songs[index];
    title.innerText = song.title;
    artist.innerText = song.artist;
    cover.src = song.cover;
    audio.src = song.src;
    audio.load();

    // Panggil perubahan warna tema
    updateThemeColor(song.cover);
    
    // Reset lirik saat ganti lagu
    lyricsText.innerText = "Memuat lirik...";

    updatePlaylistUI(index);
    createPlaylist(); 
}

// 3. Fungsi membuat playlist
function createPlaylist(filterText = "") {
    playlistDiv.innerHTML = ''; 
    
    const filteredSongs = songs.filter(song => 
        song.title.toLowerCase().includes(filterText.toLowerCase()) ||
        song.artist.toLowerCase().includes(filterText.toLowerCase())
    );

    filteredSongs.forEach((song) => {
        const originalIndex = songs.findIndex(s => s.src === song.src);

        const div = document.createElement('div');
        div.classList.add('playlist-item');
        if (originalIndex === currentIndex) div.classList.add('active');

        div.innerHTML = `
            <div style="flex: 1; cursor: pointer;" onclick="playSelected(${originalIndex})">
                <strong>${song.title}</strong>
                <small>${song.artist}</small>
            </div>
            <button class="delete-btn" onclick="deleteSong(event, ${originalIndex})">
                <i class="fas fa-trash"></i> ✕
            </button>
        `;
        
        playlistDiv.appendChild(div);
    });
}

function playSelected(index) {
    currentIndex = index;
    loadSong(index);
    audio.play();
}

// 4. Fitur Hapus Lagu
function deleteSong(event, index) {
    event.stopPropagation(); 
    
    if (songs.length > 1) {
        songs.splice(index, 1); 
        
        if (index === currentIndex) {
            currentIndex = 0;
            loadSong(currentIndex);
        } else if (index < currentIndex) {
            currentIndex--;
        }
        
        createPlaylist();
        showToast("Lagu berhasil dihapus");
    } else {
        showToast("Minimal harus ada satu lagu!");
    }
}

// 5. Fitur Cari Musik
searchInput.addEventListener('input', (e) => {
    createPlaylist(e.target.value);
});

function updatePlaylistUI(index) {
    const items = document.querySelectorAll('.playlist-item');
    items.forEach((item, i) => {
        // Logika pencocokan index diperbaiki agar sesuai UI
        const isCurrent = songs[currentIndex] && items[i] && items[i].querySelector('strong').innerText === songs[currentIndex].title;
        item.classList.toggle('active', isCurrent);
    });
}

// 6. Fitur Tambah Lagu Baru (Cover Otomatis Estetik)
// Fitur Tambah Lagu Baru dengan Base64 agar Permanen
if (fileUpload) {
    fileUpload.addEventListener('change', function(e) {
        const files = e.target.files;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();

            // PROSES KONVERSI FILE KE TEKS (Base64)
            reader.onload = function(event) {
                const base64Audio = event.target.result;
                const fileName = file.name.replace(/\.[^/.]+$/, "");

                // Masukkan ke array songs
                songs.push({
                    title: fileName,
                    artist: "File Lokal",
                    src: base64Audio, // Sekarang ini adalah data permanen, bukan link sementara
                    cover: `https://picsum.photos/seed/${Math.random()}/500/500`
                });

                // SIMPAN KE DATABASE USER
                saveUserData(); 
                createPlaylist();
                showToast(`Lagu "${fileName}" berhasil disimpan permanen!`);
            };

            reader.readAsDataURL(file); // Membaca file sebagai Data URL/Base64
        }
    });
}

// 7. Otomatis lanjut lagu (Logika disesuaikan untuk Shuffle & Repeat)
audio.onended = () => {
    if (isRepeat) {
        audio.play();
    } else {
        nextSong();
    }
};

// --- LOGIKA TAMBAHAN UNTUK FITUR NEXT, PREV, SHUFFLE, REPEAT ---

function nextSong() {
    if (songs.length === 0) return;
    
    if (isShuffle) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * songs.length);
        } while (randomIndex === currentIndex && songs.length > 1);
        currentIndex = randomIndex;
    } else {
        currentIndex = (currentIndex + 1) % songs.length;
    }
    loadSong(currentIndex);
    audio.play();
}

function prevSong() {
    if (songs.length === 0) return;
    currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    loadSong(currentIndex);
    audio.play();
}

// Event Listeners Tombol Kontrol
if (nextBtn) nextBtn.addEventListener('click', nextSong);
if (prevBtn) prevBtn.addEventListener('click', prevSong);

if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
        showToast(isShuffle ? "Mode Acak Aktif" : "Mode Berurutan Aktif");
    });
}

if (repeatBtn) {
    repeatBtn.addEventListener('click', () => {
        isRepeat = !isRepeat;
        repeatBtn.classList.toggle('active', isRepeat);
        showToast(isRepeat ? "Ulangi Lagu Aktif" : "Ulangi Matikan");
    });
}

// Jalankan saat startup
createPlaylist();
if (songs.length > 0) loadSong(0);