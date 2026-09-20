# YouTube Music Auto-Pause

A small, dependency-free Chrome extension that pauses currently playing YouTube Music while a regular YouTube video plays, then resumes the music when the video stops.

It is off by default and can be enabled or disabled from the toolbar popup.

## Features

- Supports regular YouTube and YouTube Music only.
- Handles multiple YouTube tabs.
- Resumes only music that the extension paused itself.
- Treats pause, end, tab close, and navigation away as stopping the video.
- Uses a Manifest V3 service worker and plain JavaScript.

## Install for development

1. Open `chrome://extensions` in Chrome or Chromium.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository directory—the directory containing `manifest.json`.
5. Reload any already-open YouTube and YouTube Music tabs.
6. Open the extension popup and turn it on. It is off by default.

After changing extension files, click **Reload** on the extension and reload the supported site tabs again.

## Package a ZIP

From this directory, run:

```sh
zip -r ../youtube-music-auto-pause.zip . \\
  -x '*.git*' -x '.github/*' -x '*.DS_Store'
```

The ZIP must contain `manifest.json` at its top level when uploading or sharing it.

## Permissions and privacy

The extension requests `storage` and access only to `www.youtube.com` and `music.youtube.com`. It does not collect, transmit, or sell browsing data. Stored data is limited to the on/off preference and short-lived tab coordination state.

## Limitations

Chromium may block an automatic resume when its autoplay policy requires a user gesture. The extension tries YouTube Music's own play control as a fallback; if that is also blocked, click play once in YouTube Music and continue using the extension.

Embedded YouTube players, mobile YouTube, other music services, and browsers other than Chromium-based desktop browsers are out of scope for this first version.

## Development checks

The repository's GitHub Actions workflow validates the manifest and JavaScript syntax on every push and pull request. No package installation is required.

## License

MIT. See [LICENSE](LICENSE).
