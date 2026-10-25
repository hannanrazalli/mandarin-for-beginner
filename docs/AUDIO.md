# Audio sources and optional recordings

The app works with device Mandarin speech where available. No generated or native-speaker
recording has been added by this update. Device voices can differ or need internet, and
are not pronunciation assessment. The UI identifies device voice versus local recording.

## Add a local recording

1. Record a short sample that exactly matches the Chinese text, or obtain a file you may
   legally use. Ask a capable Mandarin speaker to review the sound if possible.
2. Put the MP3, OGG or WAV in `public/audio/`, e.g. `intro-hello.mp3` (flat filename using
   letters/numbers/hyphen/underscore). Maximum 2 MiB per file and 20 MiB total.
3. Add an entry to `public/audio/manifest.json`:

```json
{
  "schema_version": 1,
  "clips": [{
    "text": "你好",
    "src": "/audio/intro-hello.mp3",
    "reviewStatus": "unverified",
    "license": "Personal recording; permission to use in this app",
    "source": "Personal recording"
  }]
}
```

Use `machine-checked` at most for a machine-generated sample. Set `human-verified` only
after an actual human listening review; the app cannot establish that from a flag.
Do not add personal identifiers or private material to filenames/metadata: these are
public bundled assets. One exact Chinese text maps to one preferred recording. A replacement
at the same path is content-hashed so the next deployment updates the PWA recording.
Run `node scripts/validate-practice.mjs` then `pnpm build`. Playback prefers that exact text
recording, falling back to the device on load/play failure with a visible source note.
Only manifest-listed local files are precached; no audio provider/API response is cached.

## Future synthesis options — not activated

| Option | Cost and access | Suitability and usage terms |
| --- | --- | --- |
| Device Web Speech (current) | No app API bill/account | Variable device voice; no reliable reusable/exportable audio files or offline guarantee |
| Microsoft Azure Speech | Separate account; current free allowance/paid rates must be checked | Mandarin neural voices; review generated output and current Azure terms before redistribution |
| Google Cloud Text-to-Speech | Separate account; current free allowance/paid rates must be checked | Mandarin voices; review generated output and current Google terms before redistribution |

Official references: https://azure.microsoft.com/products/ai-services/ai-speech and
https://cloud.google.com/text-to-speech/docs/voices and
https://cloud.google.com/text-to-speech/pricing . No current price/free-tier guarantee,
license clearance or provider output quality is claimed from this comparison.
A synthesis generator/provider integration is deferred because none is configured; do not
pretend generated clips exist. Existing static-manifest support is provider independent.
Any future generator must run outside the browser with credentials in ignored
`.env.server.local` or provider secret settings, never in chat, source control or `VITE_*`.
