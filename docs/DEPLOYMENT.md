# Penerbitan BelajarMandarin

## Status semasa

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

Workflow Quality mempunyai trigger push/PR/manual. Jika tiada run automatik, buka repositori
→ Actions → Quality → Run workflow → pilih work. Tiada token tambahan perlu dihantar ke chat.

Lookup connector untuk commit release tidak memulangkan workflow run. Local quality gates
lulus; status GitHub Actions hosted tidak didakwa lulus. Deployment ini dibina terus daripada
commit yang telah disemak melalui Vercel API. Auto-deploy push Git tidak disahkan aktif.

## Akses dan cache

- CSP membenarkan domain Supabase projek ini sahaja, skrip/fon/aset sendiri dan tiada eval.
  Atribut gaya Motion dibenarkan; tiada iframe, mikrofon, kamera atau geolokasi.
- HSTS, nosniff, no-referrer dan frame-ancestors none ditetapkan dalam vercel.json.
- PWA precache aset statik sendiri sahaja: kod, kurikulum, fon dan data strok berlesen.
  Tiada respons API/Auth, token, snapshot akaun atau POST dimasukkan ke CacheStorage.
- Sesi tab maksimum 12 jam. Kontrak offline, had simpanan dan pemadaman ada dalam
  [OFFLINE_SYNC.md](OFFLINE_SYNC.md); ADR menerangkan JWT boleh kekal sah sehingga expiry
  selepas logout walaupun data UI setempat telah dipadamkan.
