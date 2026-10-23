# BelajarMandarin — Taman Bunyi

Belajar Mandarin terus melalui Bahasa Melayu, bermula daripada asas bunyi dan nada.
English UI toggle turut tersedia. Fasa 1 menyediakan rangka responsif dan pratonton
Unit 0; login, pelajaran lengkap, XP dan kemajuan bersinkron belum tersedia.

## Mula di komputer sendiri

1. Lengkapkan [senarai akaun dan pemasangan](docs/SETUP.md). Fail dalam chat cloud ini
   tidak memasang apa-apa pada komputer awak.
2. Selepas repositori ini tersedia di GitHub, buka terminal (Command Prompt di Windows),
   pergi ke folder yang sesuai, kemudian jalankan arahan ini satu demi satu:

```sh
git clone https://github.com/hannanrazalli/mandarin-for-beginner.git
cd mandarin-for-beginner
pnpm install
pnpm dev
```

3. Buka alamat `localhost` yang terminal tunjukkan dalam pelayar. Untuk berhenti, tekan
   **Ctrl+C** di terminal. Jika akses repo ditolak, log masuk GitHub di komputer sendiri;
   jangan salin kata laluan/token ke chat.
4. Guna Node **24 LTS**, sekurang-kurangnya 24.15. pnpm projek dipin dalam package.json;
   jika versi komputer berbeza, ikut mesej pnpm atau hantar ralat tanpa maklumat rahsia.
5. Tiada fail `.env` diperlukan untuk pratonton Fasa 1. Apabila Supabase ditambah nanti,
   salin `.env.example` kepada `.env.local` dan masukkan URL serta publishable key di sana.
   Jangan letak kata laluan atau service-role key dalam aplikasi/browser.

## Semak binaan

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm secrets:check
```

`pnpm preview` membuka hasil production build selepas `pnpm build`; sokongan PWA diuji
di situ, bukan melalui dev server sahaja. Di cloud ini, Playwright boleh menggunakan
`CHROMIUM_PATH=/usr/bin/chromium`; komputer biasa/CI menggunakan Chromium Playwright.
`pnpm install` memasang Git hook untuk mengimbas fail staged sebelum commit jika tiada
hook lain. Imbasan secret juga diwajibkan dalam CI. Jangan bypass semakan untuk menerbitkan.

## Apa yang tersedia

- Reka bentuk jade/krim dengan Pipit, navigasi telefon/desktop, tema cerah/gelap/sistem.
- Bahasa Melayu/English, pratonton Unit 0, halaman kosong ulang kaji/statistik yang jujur.
- Asas pemasangan PWA dan cache shell statik; ini bukan sync kemajuan offline.
- Audio pelajaran belum tersedia; pratonton ini tidak menilai sebutan.

Lihat [spesifikasi reka bentuk](design/SYSTEM.md), [cadangan data](docs/SCHEMA_PROPOSAL.md),
[versi/sumber dependency](docs/DEPENDENCIES.md) dan [langkah deployment](docs/DEPLOYMENT.md).
Status ujian sebenar dan batas fasa direkodkan dalam [checkpoint](docs/PHASE_1.md).
