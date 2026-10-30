# Arasaka — Security Terminal

A quiet, interactive wallpaper collection based on your Arasaka references and white/red Corsair hardware. All designs are original vector recreations with live text, including a technical Mantis blade drawing inspired by your desk mat.

## New in version 2

Open **Customize Wallpaper…** and select a card in **Wallpaper collection**:

| Wallpaper | Look |
| --- | --- |
| Arasaka / Classic | The original dark red security terminal, preserved as the default |
| Arasaka / Ceramic | Pearl white, graphite, and red, matching the keyboard and mouse |
| Militech / Field Ops | Tactical gold, shield insignia, and an industrial grid |
| Kang Tao / Precision | Orange smart-link terminal and Chinese typography |
| Mantis / Blueprint | Graphite cyberware schematic with interactive numbered callouts, matching the desk mat |

Brand marks and engineering artwork are fan-made interpretations. Select a preset to load its matching signal color, then customize the color or other controls. Existing saved settings migrate to Classic. Emblem-only mode is available for every preset.

To update the Mac app, quit the previous version, unzip the new package, replace your old app, and open it. The app uses the same preferences and keeps your original live wallpaper option.

## Lock-screen companion

Use the menu-bar emblem → **Lock-screen Companion…**, or scroll to **Lock screen** in Configuration. Each preset generates a matching 4K still with space for the system clock and sign-in controls. The image contains no frozen clock, operator ID, or login form. Preview the image before saving or applying it.

On **macOS**, **Set desktop & lock screen** uses Apple's [documented desktop-image API](https://developer.apple.com/documentation/appkit/nsworkspace/setdesktopimageurl(_:for:options:)). It sets the underlying **system desktop picture**, which macOS uses for its normal lock-screen background. Your live wallpaper continues above that picture. This is not an independently animated lock screen or a replacement for macOS authentication. The pre-login / FileVault screen is separate and remains managed by macOS. Lock-screen behavior can vary by macOS version, display, Space, or screen-saver selection. Check [macOS Wallpaper settings](https://support.apple.com/en-gb/guide/mac-help/mchlp3013/26/mac/26) if a Space still shows another image; use **Show on all Spaces** when appropriate.

The app saves the companion PNG in `~/Library/Application Support/Arasaka Wallpaper/Lock Screens/`. It remembers the preceding system image and its display options before applying a change. Use **Restore Previous System Picture** in the menu, or the restore control under Configuration → Lock screen. Disconnected displays retain their recovery record until reconnected. Restoration can recover the image exposed by macOS; Apple animated wallpaper / screen-saver configurations may need to be reselected in System Settings. Quitting the app keeps any system picture you explicitly applied; it only removes the live desktop layer.

On **Windows**, save the companion PNG and select it in Settings → Personalization → Lock screen → Picture, as described in [Microsoft's lock-screen guide](https://support.microsoft.com/en-us/windows/experience/personalization/customize-the-lock-screen-in-windows). Browser and Windows wallpaper hosts cannot set the Windows lock screen through this web page.

## Use it on your Mac

1. Open `downloads/Arasaka-macOS.zip` and launch **Arasaka Wallpaper.app**. You can move the app to Applications if you like.
2. The wallpaper appears behind your desktop icons. Click the Arasaka emblem in the menu bar → **Customize Wallpaper…** to change its appearance. Changes sync to all displays.
3. Choose **Main Display Only** or **All Displays** in the menu. **Quit Arasaka Wallpaper** immediately removes the live layer and reveals your usual wallpaper.

The app is a universal binary for Apple Silicon and Intel, requires macOS 12.3 or later, and has a local ad-hoc signature. It is not Apple-notarized; macOS may require approval in System Settings → Privacy & Security when copied to another computer. It requires no accessibility or screen-recording permissions. It changes your system wallpaper only when you choose **Set desktop & lock screen**, and does not add itself to login items. Add it to your Login Items manually if you want it at startup.

Desktop windows let clicks pass through to your icons. Use **Customize Wallpaper…** for the interactive terminal and configuration panel. By default, ambient motion pauses on battery power and during display sleep. The clock stays live on battery. The app does not appear over full-screen apps; window behavior across Spaces can depend on macOS desktop settings.

## Use it on Windows

Extract `downloads/Arasaka-Web-Wallpaper.zip` into a dedicated folder.

- **Lively Wallpaper:** Add Wallpaper → choose the extracted `index.html`. Use **Customize Wallpaper** for its native controls. See [Lively's web player documentation](https://github.com/lively-community/lively/wiki/Web-Player).
- **Wallpaper Engine:** Open its wallpaper editor and drag the extracted `index.html` onto **Create Wallpaper**. Keep its assets together. See the official [web wallpaper import guide](https://docs.wallpaperengine.io/en/web/first/gettingstarted.html). The package includes `project.json` and a [user property adapter](https://docs.wallpaperengine.io/en/web/customization/properties.html).

Both integrations provide theme, size, glow, operator ID, motion, and clean wallpaper controls. They have been prepared against the documented APIs; validate them in your Windows host, since the development machine is macOS. No purchase or installation of either host is performed by this project.

## Browser preview

Double-click `index.html`, or run `npm run dev` and open <http://localhost:4173>. No dependency installation or account is required. Browser fullscreen is a preview; it needs a wallpaper host to run behind desktop applications.

| Shortcut | Action |
| --- | --- |
| `S` | Open or close configuration |
| `H` | Hide or show controls |
| `F` | Toggle fullscreen |
| `Space` | Pause or resume ambient motion |
| `Escape` | Close configuration or reveal controls |

Enter an operator ID and press Enter to play the local connection sequence. Click the emblem to run diagnostics. These are visual simulations; no login, network connection, system scan, or real security operation occurs. A status label explicitly identifies the simulated telemetry.

Configuration includes Crimson, Ice, and Amber signals; terminal or emblem composition; size and glow; CRT scanlines; cursor depth; ambient particles; peripheral details; power saver; 12/24-hour time; and local/Tokyo/New York/London/UTC clocks. **Export 4K wallpaper** saves a static PNG at the current display ratio, with a longest side of 3840 pixels. A still export does not contain animation or a live clock.

Preferences are saved locally, where browser storage is available. Wallpaper Engine and Lively can override them with their own host controls. Reduced-motion preferences disable ambient motion. Animation stops when the page is hidden, the host pauses it, or power saver is enabled. There is no audio, analytics, external API, or runtime network request.

## Build

```sh
npm run check
npm run build
npm run build:mac
```

The web build produces `dist/Arasaka-Web-Wallpaper` and `downloads/Arasaka-Web-Wallpaper.zip`. The macOS build uses the Xcode Command Line Tools to compile a universal app into `dist/Collection/Arasaka Wallpaper.app` and package `downloads/Arasaka-macOS.zip`. The version-1 build remains separate. Run the macOS build again after changing the web assets. There are no npm dependencies. `assets/mantis-art.js` is a generated inline copy of `assets/mantis-blueprint.svg` so still exports work safely offline, including in WebKit file views.

Original fan-made implementation for personal use. Arasaka/Cyberpunk branding belongs to its respective owners; this project is not affiliated with CD PROJEKT RED. Rajdhani SemiBold is bundled under the SIL Open Font License; see `assets/OFL-Rajdhani.txt`.
