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
npm run demo-analyze ./path/to/sample.mp4
# or a faster direct runner (no ESM issues):
npm run sample-analyze "C:\\path\\to\\video.mp4"
```

Example run (I tested this file):

```
> npm run sample-analyze "C:\Users\The SR infotech\Pictures\Camera Roll\WIN_20251214_09_10_11_Pro.mp4"
{
  "sizeBytes": 10275617,
  "duration": 0,
  "fingerprint": "fda118b5aa7edba03aca90807a5fa1a74c14047471be3c8c3604388939ad63d9",
  "complexity": 1,
  "meta": null
}
prediction { sizeEstimate: 2568904, vmaf: 86 }
```

Notes:
- The project includes sample encoding code but the app uses a deterministic estimator by default.
- For real encodes you must have `ffmpeg` available or use the sample server-side scripts. `ffmpeg-static` is included for convenience in Node.
- The upload only accepts MP4 files (<= 200MB). The UI validates client-side and server returns clear errors for invalid files.
 - The upload only accepts MP4 files (<= 20MB). The UI validates client-side and server returns clear errors for invalid files.

Deployment notes:
- This project runs `ffmpeg` and writes temporary files; serverless platforms (like Vercel serverless functions) may not provide the required binary environment, ephemeral filesystem characteristics, or time budget for real encodes. The app uses `ffmpeg-static` which provides a binary, but compatibility is not guaranteed on Vercel.
- For production-ready encoding or heavy processing, consider deploying a dedicated server (Docker or VM) that runs the analyzer and encoder, or use an external encoding service. Alternatively, disable real processing and rely on the deterministic estimator if you must host on Vercel.
- To demo server load and latency locally, the API supports simulated delays and overload responses controlled by the `SIMULATE_LOAD` environment variable. In development, simulation runs by default when `SIMULATE_LOAD` is not set so `npm run dev` shows the delayed/503 behavior; set `SIMULATE_LOAD=false` to turn it off locally. Be careful enabling simulation on serverless platforms (like Vercel) — long artificial delays can cause platform timeouts and result in HTML error pages instead of JSON. Only enable `SIMULATE_LOAD` in production if you understand the platform limits; prefer enabling it in staging or local testing.

  Quick local run with simulated delays/errors:

  ```bash
  npm run dev:sim
  # opens http://localhost:3000 with SIMULATE_LOAD=true and NEXT_PUBLIC_SIMULATE_LOAD=true
  ```

Deploying to Vercel
-------------------

1. Install and login with the Vercel CLI (or use the dashboard):

```bash
npm i -g vercel
vercel login
```

2. Add recommended environment variables in the Vercel dashboard (Project Settings -> Environment Variables) or via CLI for `production` (recommended for demo):

```bash
# If you want to demo simulated server load in a non-production environment, set these
# in your staging project or .env.local. Avoid enabling simulated delays in production
# unless you have adjusted platform limits or host it somewhere with longer timeouts.
vercel env add SIMULATE_LOAD production
vercel env add NEXT_PUBLIC_SIMULATE_LOAD production
```

When prompted, set the variables to `true` only for staging/demo projects. For production use `SIMULATE_LOAD=false` (or leave unset) and ensure your host supports `ffmpeg-static` and longer execution times.

3. Deploy:

```bash
vercel --prod
# or for first-time: vercel --confirm
```

4. After deployment, test uploads with small MP4s (<= 20MB). If you want real `ffmpeg` runs on your deployment, set `SIMULATE_LOAD=false` and make sure the platform supports `ffmpeg-static` and longer execution times (Vercel serverless functions have time limits).

Note: I previously tried adding function resource hints in `vercel.json`, but Vercel reported unmatched pattern errors during build for some configurations. These hints were removed to ensure the project builds reliably. To increase function memory/time, use the Vercel dashboard or select an appropriate plan for heavier workloads.

Copy-paste env variables
------------------------

Use one of these methods to set the two demo variables. For demo deployments set both to `true`.

- Vercel dashboard (quick):

  * Key: `SIMULATE_LOAD`  Value: `true`  Environment: `Staging (recommended)`
  * Key: `NEXT_PUBLIC_SIMULATE_LOAD`  Value: `true`  Environment: `Staging (recommended)`

- Vercel CLI (interactive): run these and enter the values when prompted:

```bash
vercel env add SIMULATE_LOAD production
vercel env add NEXT_PUBLIC_SIMULATE_LOAD production
```

- Local development (`.env.local` copy/paste):

```env
# Only use these locally or in a staging/demo environment.
SIMULATE_LOAD=true
NEXT_PUBLIC_SIMULATE_LOAD=true
```

To disable simulated/demo behavior in production, set the values to `false`.

Quick tips to make workflow easier:
- Use `npm run dev` to start the app locally.
- Use the demo analyzer for scripted checks: `npm run demo-analyze ./sample.mp4` (requires local `ffmpeg` or `ffmpeg-static`).
- To run automated checks, add your favorite CI and use the `scripts/demo-analyze.ts` to validate analyzer determinism.
