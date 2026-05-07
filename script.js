// 1. Daftar lagu (URL assets dihapus & diganti URL gambar keren)
let songs = [
];
const audio = document.getElementById('audio');
const title = document.getElementById('title');
const artist = document.getElementById('artist');
const cover = document.getElementById('cover');
const playlistDiv = document.getElementById('playlist');
const fileUpload = document.getElementById('file-upload');
const searchInput = document.getElementById('search-input');
const toastContainer = document.getElementById('toast-container');

let currentIndex = 0;

// Fungsi Toast (Ganti alert standar)
function showToast(message) {
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// 2. Fungsi memuat lagu ke player
function loadSong(index) {
    const song = songs[index];
    title.innerText = song.title;
    artist.innerText = song.artist;
    cover.src = song.cover;
    
    audio.src = song.src;
    audio.load(); 

    updatePlaylistUI(index);
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
if (fileUpload) {
    fileUpload.addEventListener('change', function(e) {
        const files = e.target.files;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const blobUrl = URL.createObjectURL(file);
            const fileName = file.name.replace(/\.[^/.]+$/, "");

            songs.push({
                title: fileName,
                artist: "File Lokal",
                src: blobUrl,
                // Menggunakan random image dari Unsplash agar tiap lagu baru punya cover beda
                cover: `https://picsum.photos/seed/${Math.random()}/500/500`
            });
        }
        createPlaylist();
        showToast(`${files.length} Lagu ditambahkan`);
    });
}

// 7. Otomatis lanjut lagu
audio.onended = () => {
    currentIndex = (currentIndex + 1) % songs.length;
    loadSong(currentIndex);
    audio.play();
};

// Jalankan saat startup
createPlaylist();
loadSong(0);