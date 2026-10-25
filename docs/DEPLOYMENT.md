# Penerbitan BelajarMandarin

## Status semasa

Update interaktif 2026-10-25: **READY**, deployment `dpl_9PR9nVGYHECPPKQrGCbXDyfnrjFD`,
kod `df14e3d380834e29edd56230fcb625da5dbecc79`.
**Latihan: https://belajarmandarin.vercel.app/interaktif**. GitHub branch `work` sudah dipush.
Pemeriksaan melalui akses Vercel pemilik: route interaktif dan `/sw.js` HTTP200; service
worker mengandungi chunk latihan terkini dan fallback route offline. CSP media menambah
`blob:` untuk main balik rakaman; microphone hanya `(self)`, diminta selepas tekan Rakam.
SSO/perlindungan deployment asal dikekalkan; tiada CI/CD. 87 unit dan 10 browser flows
lulus; selepas satu pembaikan fokus UX, 87 unit dan flow interaktif/axe diuji semula lulus.
Tiada fail audio penutur sebenar ditambah; fallback suara peranti dilabel.

Update 2026-10-25: kad dengan maksud terus, Next tanpa gate penerangan dan kandungan BM/English
diterbitkan sebagai dpl_56wRhFBM8GUc6y8ckUWWpErhjgwd, status READY, kod
6cdd2e261e68b786f8629bdfd96e5c20132c8f43. Tiada CI/CD ditambah.

Projek Vercel `belajarmandarin` disediakan dalam pasukan **Hannan** (`hannan24`), ID
`prj_qdmR95ivhfAmuHS4HL0VBPLXSLSE`. Node 24.x, Vite, `pnpm build`, output `dist`.
**Laman: https://belajarmandarin.vercel.app/** — production **READY**, disahkan 2026-10-24.

Deployment `dpl_3JVUSx96ySvwqbPkzZJLfKtgHpSJ`, kod commit
`821334554e5f76433de381683b62f141ca349541`. Build Vercel selesai dalam kira-kira 30 saat.
Alias alternatif: https://belajarmandarin-hannan24.vercel.app/.

Repositori: https://github.com/hannanrazalli/mandarin-for-beginner, branch `work`.
Supabase: projek `belajarmandarin`, `gvnfckgishsjwslurmuj`.
Environment Vercel mengandungi hanya `VITE_SUPABASE_URL` dan public publishable key untuk
production/preview/development. Tiada password database atau service-role key diperlukan.

Perlindungan Vercel asal dikekalkan. Perubahan kepada perlindungan preview sahaja ditolak
oleh semakan kelulusan automatik kerana kebenaran bagi skop akses production belum jelas.
Penerbitan dan pemeriksaan seterusnya tidak boleh memintas sekatan ini.

Deployment biasa menggunakan tetapan asal tersebut. Pemeriksaan melalui akses Vercel yang
disambungkan mendapat HTTP200 bagi laman utama, route pelajaran terus, akaun, manifest,
service worker dan data strok. CSP/HSTS/nosniff/no-referrer/Permissions-Policy hadir;
service worker no-store, manifest no-cache, dan tiada URL Supabase dalam senarai precache.
Pemeriksaan ini menggunakan akses Vercel pemilik, bukan bukti akses tanpa autentikasi.
Jika laman meminta login Vercel, gunakan akaun pemilik yang sama. Tiada perubahan perlindungan
tambahan dibuat. Browser password login akaun belajar masih perlu dicuba sendiri.

## Cara guna apabila diterbitkan

Buka pautan laman yang disahkan pada telefon dan PC. Jika Vercel meminta login perlindungan,
gunakan akaun Vercel pemilik projek. Kemudian pilih Akaun dalam aplikasi dan gunakan akaun
belajar Supabase yang sama pada kedua-dua peranti. Jangan kongsi password dalam chat.
Chrome/Edge: menu → Install. iPhone Safari: Share → Add to Home Screen.
Panduan lanjut: [USER_GUIDE.md](USER_GUIDE.md).

## Setup semula atau perubahan kod

1. Import repo yang sama dalam Vercel jika menyediakan projek baru; preset Vite, Node24,
   root projek, `pnpm install --frozen-lockfile`, `pnpm build`, output `dist`.
2. Masukkan Project URL dan publishable key ke Environment Variables Vercel. Untuk komputer
   sendiri, gunakan `.env.local` berdasarkan `.env.example`. Jangan masukkan secret key.
3. Gunakan migration dan seed yang telah disemak dalam `supabase/README.md`. Jangan sekali-kali
   menjalankan `supabase/tests/fixture.sql` pada projek sebenar.
4. Deploy hanya checkpoint yang lulus quality checks. Semak URL, route terus, login,
   security headers dan pemasangan PWA. Perubahan nilai VITE memerlukan build baru.
5. Git integration, apabila disambungkan, boleh deploy sebelum CI selesai. Wajibkan quality
   status pada branch production jika akaun menyokongnya; jangan mendakwa gate ini aktif
   selagi tetapan provider belum disahkan.

Pemilik tidak memerlukan CI/CD. Workflow Quality telah dibuang; kod disimpan dalam GitHub
dan semakan dijalankan secara setempat. Deployment sedia ada kekal; tiada integrasi
auto-deploy baru disediakan.

## Akses dan cache

- CSP membenarkan domain Supabase projek ini sahaja, skrip/fon/aset sendiri dan tiada eval.
  Atribut gaya Motion dibenarkan; tiada iframe, mikrofon, kamera atau geolokasi.
- HSTS, nosniff, no-referrer dan frame-ancestors none ditetapkan dalam vercel.json.
- PWA precache aset statik sendiri sahaja: kod, kurikulum, fon dan data strok berlesen.
  Tiada respons API/Auth, token, snapshot akaun atau POST dimasukkan ke CacheStorage.
- Sesi tab maksimum 12 jam. Kontrak offline, had simpanan dan pemadaman ada dalam
  [OFFLINE_SYNC.md](OFFLINE_SYNC.md); ADR menerangkan JWT boleh kekal sah sehingga expiry
  selepas logout walaupun data UI setempat telah dipadamkan.
