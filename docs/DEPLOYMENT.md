# Deploy apabila akaun sedia

Rangka aplikasi disediakan untuk Vercel. Fail konfigurasi tidak bermaksud laman sudah
diterbitkan. Sambungan akaun/hosting dan status CI sebenar mesti disahkan dahulu.

1. Pastikan projek berada dalam repositori GitHub awak. Jangan masukkan `.env.local`.
2. Di [Vercel](https://vercel.com/new), pilih **Import Git Repository**, kemudian repositori
   `mandarin-for-beginner`. Benarkan akses kepada repositori ini sahaja jika boleh.
3. Pilih preset **Vite**, folder akar projek, Node **24.x**, arahan binaan `pnpm build`
   dan folder output `dist`. Konfigurasi `vercel.json` sudah menyediakan arahan tersebut.
4. Fasa 1 tidak memerlukan pemboleh ubah Supabase. Jangan tambah secret/service-role key.
5. Klik **Deploy** apabila bersedia menerbitkan pratonton. Salin balik URL laman sahaja.
6. Buka URL pada telefon dan PC; semak `/unit-0` melalui pautan terus dan tema/bahasa.
   Chrome/Edge mungkin menawarkan **Install**; Safari iPhone: **Share → Add to Home Screen**.
7. Di GitHub, tunggu workflow **Quality** lulus. Dalam tetapan perlindungan branch/ruleset,
   wajibkan status **quality** sebelum merge jika pelan repositori awak menyokongnya.
   Vercel Git integration boleh membina sebelum CI selesai; gunakan branch production yang
   dilindungi dan merge hanya selepas semakan lulus. Ini bukan gate automatik tanpa tetapan.

Push seterusnya mencetuskan binaan melalui Vercel Git integration apabila disambungkan.
Tiada token Vercel disimpan dalam repo atau diperlukan di chat. CI menggunakan token
GitHub lalai dengan `contents: read`; dependency actions dipin kepada commit penuh.

## Batas keselamatan/cache Fasa 1

- CSP mengehadkan skrip, fon, sambungan dan media kepada asal sendiri; tiada skrip inline.
  `style-src-attr 'unsafe-inline'` membenarkan gaya atribut Motion sahaja; style elements
  kekal `self`. Sambungan Supabase akan ditambah secara khusus dalam Fasa 2.
- HSTS, nosniff, no-referrer, frame-ancestors none dan sekatan kamera/mikrofon disediakan
  dalam vercel.json. Preview Vite tempatan tidak membuktikan header Vercel telah berkuat kuasa.
- PWA hanya menyimpan shell/aset statik binaan. Tiada cache API/sesi autentikasi, sync
  kemajuan atau audio offline disahkan dalam Fasa 1. Suara peranti mungkin perlu Internet.
- Pilihan bahasa/tema/bunyi dan lokasi pratonton ialah tetapan setempat, bukan kemajuan
  akaun. Auth, logout dan pemadaman data pengguna akan direka dalam Fasa 2.
