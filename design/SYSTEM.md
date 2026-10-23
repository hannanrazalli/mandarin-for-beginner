# Taman Bunyi — sistem visual Fasa 1

Arah A dipilih pengguna. PWA peribadi untuk pemula berbahasa Melayu; bahasa Inggeris pilihan.
Skop semasa ialah shell dan pratonton: tiada login sebenar, akaun, XP, streak, rekod pembelajaran atau kurikulum lengkap.

## Token visual

| Peranan | Cerah | Gelap |
| --- | --- | --- |
| Latar halaman / permukaan | `#F6F3E8` / `#FFFFFF` | `#142A24` / `#1C352C` |
| Teks utama / sekunder | `#173D35` / `#52675D` | `#F6F3E8` / `#B8C9BF` |
| Butang utama / teksnya | `#246B55` / `#FFFFFF` | `#8ED9B5` / `#142A24` |
| Pautan dan ikon aktif | `#246B55` | `#8ED9B5` |
| Garis kawalan / pemisah hiasan | `#7B8D81` / `#E0E6DB` | `#7B8D81` / `#345044` |
| Aksen madu / teks atasnya | `#E9B85A` / `#173D35` | `#E9B85A` / `#142A24` |
| Ralat / latar mesej | `#9D3038` / `#FFF1F0` | `#FFB4B8` / `#3B2529` |
| Berjaya / latar mesej | `#246B55` / `#EAF4ED` | `#8ED9B5` / `#1C352C` |

Pasangan warna dikira secara matematik, bukan audit UI: utama/latar 10.77:1 cerah dan 13.64:1 gelap; sekunder/latar 5.47:1 dan 8.76:1; teks/butang utama 6.35:1 dan 9.19:1.
Sasarkan WCAG AA; sahkan semua keadaan sebenar termasuk hover, fokus, ralat dan disabled selepas binaan. Madu bukan warna teks pada putih; warna tidak membawa makna sendirian.

- Jarak: 4, 8, 12, 16, 24, 32, 48, 64 px; ruang utama 24–32 px, jarak label/kawalan 8 px.
- Jejari: kawalan 12 px, kad 20 px, hero 28 px, pil 999 px; bentuk daun hanya hiasan.
- Elevasi: kad biasa tanpa bayang; kad hero `0 8px 24px rgba(23,61,53,.08)`; gelap utamakan garis halus. Tiada kad terapung berlebihan.
- Latin: Nunito Sans, system-ui, sans-serif; badan 16/26 px, label 14/20, tajuk kad 20/28, H1 32/40 (desktop 40/48); berat 400/600/800.
- Hanzi: Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif; pratonton 56/76 px, pelajaran 72/96 (360 px: 64/88); berat 500, tanpa jarak huruf paksa.
- Pinyin 20/30 px, tanda nada penuh; teks Cina `lang="zh-CN"`. Jangan potong hanzi atau diakritik. Font fallback mesti berfungsi semasa font dimuatkan.

## Shell responsif

| Lebar | Susunan |
| --- | --- |
| 360 px | Satu lajur, padding 20 px, ruang kandungan bersih 320 px. Navigasi bawah tetap: Utama, Belajar, Ulang kaji, Tetapan; ikon + label. Statistik dipautkan dari Utama. |
| 768 px | Navigasi bawah kekal; kandungan maksimum 720 px, padding 32 px; hero penuh, kad sokongan dua lajur jika muat tanpa mengecilkan teks. |
| 1280 px | Sidebar 224 px dengan lima pautan termasuk Statistik; kandungan maksimum 1040 px, padding 40 px, hero dan panel “Langkah pertama” pada nisbah 2:1. |

Breakpoint sidebar 1024 px; di bawahnya gunakan navigasi bawah. Tambah safe-area inset dan ruang bawah agar kandungan/fokus tidak terlindung.
Header memuatkan nama BelajarMandarin dan label “Pratonton”; tiada avatar akaun. Tab aktif guna ikon, teks dan latar jade lembut serta `aria-current`.
Urutan baca sama pada semua lebar: tajuk, hero, tindakan utama, pratonton, sokongan. Tiada skrol mendatar pada 360 px atau teks dibesarkan.

## Skrin dan kandungan

- **Utama:** sapaan “Sedikit demi sedikit, kita belajar.”; hero kertas hangat, Pipit jade hinggap pada garis daun, tajuk “Kenali bunyi Mandarin”, kapsyen “Unit 0 · sesi sasaran 1–3 minit”. Pipit ilustrasi statik, hiasan `aria-hidden` jika teks sudah menerangkan konteks.
- **Tindakan pertama:** “Cuba Unit 0” membuka pratonton dengan satu ketikan. Hanya selepas pratonton dibuka, boleh simpan lokasi demo setempat dan tukar kepada “Sambung pratonton”; terangkan “Lokasi pratonton disimpan pada peranti ini”. Ini bukan rekod tamat atau kemajuan belajar.
- **Pratonton Unit 0:** tajuk “Dengar dahulu”, hanzi contoh `你好`, pinyin `nǐ hǎo`, glos “Helo”. Label kekal “Contoh paparan · kandungan dan audio belum disahkan”. Urutan pedagogi penuh akan bermula dengan asas bunyi; contoh ini bukan pelajaran lengkap.
- **Kawalan pratonton:** butang “Dengar contoh”, “Ulang”, “Perlahan” dan “Henti” berlabel. Jangan reka bentuk gelombang sebagai bukti audio tersedia. Paparkan nota “Audio pelajaran belum tersedia atau disahkan” apabila tiada sumber yang sah.
- **Belajar:** laluan menegak berbentuk buku: Unit 0 “Asas bunyi dan nada” berstatus “Pratonton”; senaraikan skop dirancang (initial/final, empat + nada neutral, pasangan nada, perubahan 不/一) sebagai rancangan, bukan modul siap. HSK 1 berkunci dengan teks “Akan datang selepas asas Unit 0 disiapkan”; tiada peratus atau tanda selesai rekaan.
- **Ulang kaji:** keadaan kosong “Belum ada bahan untuk diulang kaji.” + “Kandungan ulang kaji akan tersedia apabila pelajaran sebenar ditambah.” Tindakan “Lihat Unit 0”; jangan cipta kad atau angka sifar sebagai rekod sebenar.
- **Statistik:** “Belum ada data pembelajaran” dan penjelasan bahawa pratonton tidak mengukur pencapaian. Tiada graf, masa belajar, XP atau streak palsu. Pautan “Teroka pratonton”.
- **Tetapan:** Bahasa antara muka Bahasa Melayu / English; tema Sistem / Cerah / Gelap; suis “Kesan bunyi” lalai mati, nota “Tidak mengawal audio pelajaran”. Simpan pilihan setempat, label kejayaan ringkas; tiada akaun atau sinkronisasi. Semua label, mesej dan nama navigasi mempunyai padanan en; pilihan bahasa kekal bernama asal.

## Keadaan dan interaksi

| Komponen | Keadaan dan tingkah laku |
| --- | --- |
| Butang / pautan | Default jelas; hover tambah garis/latar, pressed sedikit lebih gelap tanpa anjakan; fokus cincin 3 px + offset 3 px. Disabled berlabel sebab berdekatan, bukan opacity sahaja. |
| Navigasi / laluan | Hover/fokus sama jelas; aktif dengan teks dan penanda bentuk. HSK 1 kekal kad maklumat bukan pautan palsu; ikon kunci + sebab kelihatan. |
| Kad / hero | Kad maklumat tidak boleh diklik; tindakan diberi butang/pautan sebenar. Kejayaan membuka pratonton dipaparkan sebagai “Pratonton dibuka”, tanpa lencana pencapaian. |
| Pemuatan | Skeleton statik pada ruang yang diketahui, teks “Sedang memuatkan…” dan `aria-busy`; jika kerja singkat jangan beri kelewatan tiruan. Kawalan yang sedang memproses elak kiriman berganda. |
| Kosong / ralat | Mesej khusus dengan tindakan relevan; ralat “Pratonton tidak dapat dibuka. Cuba lagi.” mengekalkan pilihan. Jangan spinner tanpa penghujung atau dakwa offline tersedia. |
| Tetapan | Radio bahasa/tema, switch bunyi; label boleh ditekan. “Pilihan disimpan pada peranti ini” melalui status sopan; jika storan gagal, “Pilihan digunakan untuk sesi ini sahaja”. |
| Audio | Sedia → memuatkan → dimainkan → dihentikan/tamat; ralat membolehkan cuba lagi. Main semula hanya selepas tindakan. Henti audio pada navigasi, jangan tindih dua klip. |
| Maklum balas demo | Kejayaan hanya untuk tindakan sebenar seperti simpan tetapan; tiada skor sebutan, penilaian suara atau jawapan “betul” tanpa latihan disahkan. |

Semua sasaran sentuh sekurang-kurangnya 44 × 44 px, dengan sela 8 px; ikon audio sentiasa ada nama boleh akses dan label kelihatan.
Tab mengikut urutan visual; Enter/Space untuk butang, anak panah untuk kumpulan radio asli. Pautan langkau ke kandungan; selepas pertukaran halaman fokus tajuk utama, status ringkas `aria-live="polite"`.
Fokus cerah menggunakan jade, fokus gelap menggunakan jade cerah; jangan hilangkan outline. Teks status/ralat sertakan perkataan dan ikon, bukan warna sahaja.
Gerakan biasa maksimum 120–180 ms untuk opacity/warna; tiada animasi berulang Pipit, parallax atau ganjaran konfeti. `prefers-reduced-motion` membuang peralihan gerak.

## Audio dan batas pratonton

Audio hanya selepas ketikan pengguna; tiada autoplay termasuk kesan bunyi. Suis kesan bunyi tidak mematikan butang dengar yang sengaja ditekan.
Jika audio rakaman disahkan belum ada, jangan pasang audio pelajaran palsu. Tunjukkan keadaan tidak tersedia secara jujur dan kekalkan teks/pinyin yang dilabel pratonton.
Jika demo sintesis suara ditawarkan, asingkan sebagai “Cuba suara peranti · sebutan belum disahkan”; hanya aktif selepas suara `zh-CN` dikenal pasti dan pengguna menekan butang.
Tiada suara sesuai: “Suara Mandarin tidak tersedia pada peranti ini.”; jangan tukar senyap kepada suara bahasa lain. Kegagalan/offline diberi mesej dan tindakan cuba lagi; TTS bukan penilai sebutan.
Butang perlahan hanya aktif apabila sumber menyokong kadar perlahan; jika tidak, jelaskan sebab. Jangan mendakwa cache/offline lengkap sebelum diuji.

## Semakan penerimaan binaan

Semak 360/768/1280, tema cerah/gelap, ms/en, zoom, papan kekunci, sasaran 44 px, kontras keadaan sebenar dan gerakan dikurangkan.
Semak penggunaan pertama tanpa data, lokasi demo tersimpan, storan gagal, audio tiada/ralat/berhenti dan tiada dakwaan akaun atau pencapaian sebenar.
