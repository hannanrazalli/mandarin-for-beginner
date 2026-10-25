# BelajarMandarin — Taman Bunyi

Aplikasi peribadi untuk belajar Mandarin terus melalui Bahasa Melayu, bermula dari kosong.
PWA responsif untuk PC dan telefon, dengan pilihan UI English, tema cerah/gelap dan Pipit.

## Guna aplikasi

**Buka aplikasi: https://belajarmandarin.vercel.app/**

Status production READY; butiran semakan ada dalam [panduan deployment](docs/DEPLOYMENT.md).
Untuk menggunakan laman yang diterbitkan, awak hanya perlu pelayar; Node.js/Git/pnpm tidak
perlu dipasang. Log masuk dengan **akaun belajar** yang sama pada telefon dan PC untuk sync.
Akaun belajar berbeza daripada akaun ChatGPT/GitHub/Vercel.

Baca [panduan ringkas pengguna](docs/USER_GUIDE.md) untuk login, ikon aplikasi, audio dan
bantuan simpanan. Jangan hantar password, token atau secret key dalam chat.

## Kandungan dan ciri

- Unit 0 dahulu: awalan, akhiran, empat nada + neutral, pasangan nada, 不 dan 一.
- 95 pelajaran pendek: 70 item sebutan dan 300 perkataan; 20 perkataan awal mengikut
  HSK 2.0 lama. Perkataan tambahan tidak dilabel tahap HSK yang belum disahkan.
- Kad imbas dengan maksud terus di bawah pinyin, pilihan jawapan, audio peranti, pinyin/nada,
  padanan, susun ayat dan urutan strok.
- Taman latihan `/interaktif`: 5 dialog, 10 cabaran bunyi, imlak pinyin, ingat semula dan
  rakaman sendiri pilihan. Bahan baharu belum disahkan; latihan tambahan tidak memberi XP.
- Ulang kaji SM-2, sasaran 3/5/10 minit, XP, streak/perlindungan, tahap dan lencana sebenar.
- Statistik dan eksport data akaun sendiri dalam JSON/CSV. Latihan setempat dipisahkan.
- PWA menyimpan aset sendiri; aturan simpanan offline/sync dan had sesi diterangkan dalam
  [kontrak offline](docs/OFFLINE_SYNC.md). Rekod akaun tidak disimpan dalam cache service worker.

Suara Mandarin bergantung pada peranti dan mungkin memerlukan internet. Audio belum disahkan
melalui semakan pendengaran penutur natif; aplikasi tidak menilai sebutan pengguna.

## Ubah kod di komputer sendiri — pilihan

1. Ikut [senarai persediaan](docs/SETUP.md). Gunakan Node **24 LTS**, sekurang-kurangnya 24.15,
   Git dan pnpm **11.25.0**. Buka Command Prompt (Windows) atau Terminal (Mac/Linux).
2. Jalankan satu arahan pada satu masa:

```sh
git clone https://github.com/hannanrazalli/mandarin-for-beginner.git
cd mandarin-for-beginner
pnpm install --frozen-lockfile
```

3. Salin `.env.example` dan namakan salinan itu `.env.local`, dalam folder projek yang sama.
   Di Supabase projek sendiri, salin **Project URL** dan **publishable key** ke
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` di fail itu. Jangan guna secret key,
   service-role key atau password database. Jangan commit `.env.local`.
4. Jalankan `pnpm dev`, kemudian buka alamat localhost yang terminal tunjukkan.
   Tekan **Ctrl+C** untuk berhenti. Tanpa kedua-dua nilai env, latihan setempat tersedia;
   login/sync memerlukan projek Supabase yang telah disediakan.
5. Setup projek baru, migration, akaun pemilik dan penutupan signup diterangkan dalam
   [supabase/README.md](supabase/README.md). Projek peribadi yang disambungkan sudah disediakan;
   jangan jalankan fixture ujian pada database sebenar.

## Semak perubahan

```sh
pnpm typecheck
pnpm lint
pnpm test
node scripts/validate-content.mjs
node scripts/validate-localization.mjs
node scripts/validate-practice.mjs
node scripts/audit-content.mjs --check
node --test scripts/audit-content.test.mjs
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm secrets:check
```

`pnpm preview` membuka production build dan service worker selepas build. Cloud ini boleh
menggunakan `CHROMIUM_PATH=/usr/bin/chromium`; komputer biasa menggunakan Chromium Playwright.
Ujian SQL terasing: `bash supabase/tests/run.sh` memerlukan Docker. Pengguna aplikasi tidak
memerlukan Docker. Fixture mencipta database sementara dan tidak menggunakan akaun sebenar.

Git hook mengimbas fail yang hendak dicommit; Semakan types, lint, kandungan, ujian, RLS, audit dependency dan binaan boleh dijalankan
secara setempat. Mengikut permintaan pemilik, tiada workflow CI/CD disediakan.
Versi dependency dipin dalam lockfile.

Lihat [rekod fasa](docs/PHASE_6.md), [keputusan keselamatan](docs/adr),
[sumber dependency](docs/DEPENDENCIES.md), [had/tindakan susulan](NEXT_STEPS.md) dan
[cadangan penambahbaikan](docs/IMPROVEMENTS.md).

Audit bacaan dan audio: [CONTENT_AUDIT.md](docs/CONTENT_AUDIT.md), [panduan audio](docs/AUDIO.md)
dan [rekod kemaskini interaktif](docs/INTERACTIVE_UPDATE.md). `pnpm content:audit` menjana
semula laporan/metadata sahaja; ia tidak menukar jawapan pelajaran asal.
