#!/bin/bash
set -euo pipefail
TASK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TASK_APP="$TASK_ROOT/dist/Collection/Arasaka Wallpaper.app"
TASK_CONTENTS="$TASK_APP/Contents"
mkdir -p "$TASK_CONTENTS/MacOS" "$TASK_CONTENTS/Resources/Wallpaper/assets" "$TASK_ROOT/.build/module-cache" "$TASK_ROOT/downloads"
cp "$TASK_ROOT/native/macos/Info.plist" "$TASK_CONTENTS/Info.plist"
for TASK_FILE in index.html styles.css collection.css collection.js app.js; do cp "$TASK_ROOT/$TASK_FILE" "$TASK_CONTENTS/Resources/Wallpaper/"; done
cp "$TASK_ROOT/assets/"* "$TASK_CONTENTS/Resources/Wallpaper/assets/"
if [ -f "$TASK_ROOT/assets/AppIcon.icns" ]; then cp "$TASK_ROOT/assets/AppIcon.icns" "$TASK_CONTENTS/Resources/AppIcon.icns"; fi
echo "Compiling Apple Silicon and Intel versions…"
xcrun swiftc -O -target arm64-apple-macos12.0 -module-cache-path "$TASK_ROOT/.build/module-cache" -framework AppKit -framework WebKit -framework IOKit "$TASK_ROOT/native/macos/ArasakaWallpaper.swift" -o "$TASK_ROOT/.build/ArasakaWallpaper-arm64"
xcrun swiftc -O -target x86_64-apple-macos12.0 -module-cache-path "$TASK_ROOT/.build/module-cache" -framework AppKit -framework WebKit -framework IOKit "$TASK_ROOT/native/macos/ArasakaWallpaper.swift" -o "$TASK_ROOT/.build/ArasakaWallpaper-x86_64"
lipo -create "$TASK_ROOT/.build/ArasakaWallpaper-arm64" "$TASK_ROOT/.build/ArasakaWallpaper-x86_64" -output "$TASK_CONTENTS/MacOS/ArasakaWallpaper"
codesign --force --deep --sign - "$TASK_APP"
ditto -c -k --sequesterRsrc --keepParent "$TASK_APP" "$TASK_ROOT/downloads/Arasaka-macOS.zip"
echo "macOS app: $TASK_APP"
echo "macOS archive: $TASK_ROOT/downloads/Arasaka-macOS.zip"
