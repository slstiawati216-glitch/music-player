// 1. Daftar lagu awal (pastikan file ini ada di folder assets)
let songs = [
    { 
        title: "In the Stars", 
        artist: "Benson Boone", 
        src: "assets/song1.mp3", 
        cover: "assets/cover1.jpg" 
    },
    { 
        title: "Angels Like You", 
        artist: "Miley Cyrus", 
        src: "assets/song2.mp3", 
        cover: "assets/cover2.jpg"
    },
    { 
        title: "Dangerously", 
        artist: "Charlie Puth", 
        src: "assets/song3.mp3", 
        cover: "assets/cover3.jpg" 
    }
];

const audio = document.getElementById('audio');
const title = document.getElementById('title');
const artist = document.getElementById('artist');
const cover = document.getElementById('cover');
const playlistDiv = document.getElementById('playlist');
const fileUpload = document.getElementById('file-upload'); // Pastikan ID ini ada di HTML

let currentIndex = 0;

// 2. Fungsi memuat lagu ke player
function loadSong(index) {
    const song = songs[index];
    title.innerText = song.title;
    artist.innerText = song.artist;
    cover.src = song.cover;
    
    console.log("Memuat: " + song.src);
    
    audio.src = song.src;
    audio.load(); 

    updatePlaylistUI(index);
}

// 3. Fungsi membuat elemen playlist di layar
function createPlaylist() {
    playlistDiv.innerHTML = ''; 
    songs.forEach((song, index) => {
        const div = document.createElement('div');
        div.classList.add('playlist-item');
        div.innerHTML = `<strong>${song.title}</strong><br><small>${song.artist}</small>`;
        
        div.onclick = () => {
            currentIndex = index;
            loadSong(index);
            audio.play().catch(e => console.log("Klik manual diperlukan"));
        };
        playlistDiv.appendChild(div);
    });
    updatePlaylistUI(currentIndex);
}

// 4. Fungsi update warna aktif pada playlist
function updatePlaylistUI(index) {
    const items = document.querySelectorAll('.playlist-item');
    items.forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
}

// 5. Fitur Tambah Lagu Baru via Input File
if (fileUpload) {
    fileUpload.addEventListener('change', function(e) {
        const files = e.target.files;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const blobUrl = URL.createObjectURL(file);
            const fileName = file.name.replace(/\.[^/.]+$/, "");

            // Tambahkan lagu baru ke array
            songs.push({
                title: fileName,
                artist: "Local File",
                src: blobUrl,
                cover: "https://via.placeholder.com/200?text=New+Music"
            });
        }
        createPlaylist(); // Gambar ulang playlist
    });
}

// 6. Otomatis lanjut lagu
audio.onended = () => {
    currentIndex = (currentIndex + 1) % songs.length;
    loadSong(currentIndex);
    audio.play();
};

// Eksekusi awal
createPlaylist();
loadSong(0);