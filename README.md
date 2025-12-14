# FFmpeg Comparator (prototype)

Minimal Next.js prototype demonstrating deterministic video fingerprinting and quick estimates for encoding variants. Includes:
- UI: upload, codec/setting options, result cards
- API: `/api/analyze` (fingerprint + estimator), `/api/upload` (stores uploaded file)
- Sample FFmpeg script (disabled in UI) demonstrating how real encodes would be implemented

To run locally:

```bash
npm install
npm run dev
```

Run the analyzer demo (requires a locally-available `ffmpeg` or `ffmpeg-static`) :

```bash
node -r ts-node/register scripts/demo-analyze.ts ./path/to/sample.mp4
```

Notes:
- The project includes sample encoding code but the app uses a deterministic estimator by default.
- For real encodes you must have `ffmpeg` available or use the sample server-side scripts. `ffmpeg-static` is included for convenience in Node.
- The upload only accepts MP4 files (<= 200MB). The UI validates client-side and server returns clear errors for invalid files.

Quick tips to make workflow easier:
- Use `npm run dev` to start the app locally.
- Use the demo analyzer for scripted checks: `npm run demo-analyze ./sample.mp4` (requires local `ffmpeg` or `ffmpeg-static`).
- To run automated checks, add your favorite CI and use the `scripts/demo-analyze.ts` to validate analyzer determinism.
