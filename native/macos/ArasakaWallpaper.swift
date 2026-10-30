import AppKit
import WebKit
import UniformTypeIdentifiers
import IOKit.ps

final class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate, NSWindowDelegate {
    private var statusItem: NSStatusItem!
    private var desktopWindows: [NSWindow] = []
    private var desktopViews: [WKWebView] = []
    private var previewWindow: NSWindow?
    private var previewView: WKWebView?
    private var pauseItem: NSMenuItem!
    private var batteryItem: NSMenuItem!
    private var allDisplaysItem: NSMenuItem!
    private var mainDisplayItem: NSMenuItem!
    private var restorePictureItem: NSMenuItem!
    private var wantsLockPreview = false
    private var paused = false
    private var sleeping = false
    private var batteryTimer: Timer?
    private var mouseMonitor: Any?
    private var lastPointerUpdate = Date.distantPast
    private var settings: [String: Any] {
        get { UserDefaults.standard.dictionary(forKey: "wallpaperSettings") ?? [:] }
        set { UserDefaults.standard.set(newValue, forKey: "wallpaperSettings") }
    }
    private var webRoot: URL { Bundle.main.resourceURL!.appendingPathComponent("Wallpaper", isDirectory: true) }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        UserDefaults.standard.register(defaults: ["allDisplays": true, "pauseOnBattery": true])
        makeMenu()
        rebuildDesktops()
        NotificationCenter.default.addObserver(self, selector: #selector(displaysChanged), name: NSApplication.didChangeScreenParametersNotification, object: nil)
        let center = NSWorkspace.shared.notificationCenter
        center.addObserver(self, selector: #selector(willSleep), name: NSWorkspace.willSleepNotification, object: nil)
        center.addObserver(self, selector: #selector(didWake), name: NSWorkspace.didWakeNotification, object: nil)
        center.addObserver(self, selector: #selector(willSleep), name: NSWorkspace.screensDidSleepNotification, object: nil)
        center.addObserver(self, selector: #selector(didWake), name: NSWorkspace.screensDidWakeNotification, object: nil)
        batteryTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in self?.syncPause() }
        mouseMonitor = NSEvent.addGlobalMonitorForEvents(matching: .mouseMoved) { [weak self] _ in self?.trackPointer() }
        if !UserDefaults.standard.bool(forKey: "hasLaunched") || !UserDefaults.standard.bool(forKey: "hasSeenCollection") {
            UserDefaults.standard.set(true, forKey: "hasLaunched")
            UserDefaults.standard.set(true, forKey: "hasSeenCollection")
            showPreview()
        }
    }

    private func makeMenu() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        let icon = NSImage(size: NSSize(width: 20, height: 20), flipped: false) { _ in
            NSColor.black.setStroke(); NSColor.black.setFill()
            let ring = NSBezierPath(ovalIn: NSRect(x: 1, y: 1, width: 18, height: 18)); ring.lineWidth = 1.5; ring.stroke()
            let branches = NSBezierPath(); branches.lineWidth = 1.4
            branches.move(to: NSPoint(x: 10, y: 2)); branches.line(to: NSPoint(x: 10, y: 13))
            branches.move(to: NSPoint(x: 10, y: 7)); branches.line(to: NSPoint(x: 5.3, y: 11))
            branches.move(to: NSPoint(x: 10, y: 7)); branches.line(to: NSPoint(x: 14.7, y: 11)); branches.stroke()
            for rect in [NSRect(x: 7.5, y: 11.5, width: 5, height: 5), NSRect(x: 2.8, y: 8.7, width: 5, height: 5), NSRect(x: 12.2, y: 8.7, width: 5, height: 5)] { NSBezierPath(ovalIn: rect).fill() }
            return true
        }
        icon.isTemplate = true
        statusItem.button?.image = icon
        statusItem.button?.toolTip = "Arasaka Wallpaper"
        let menu = NSMenu()
        let title = NSMenuItem(title: "ARASAKA / SECURITY TERMINAL", action: nil, keyEquivalent: ""); title.isEnabled = false; menu.addItem(title)
        add(menu, "Customize Wallpaper…", #selector(showPreview), ",")
        add(menu, "Lock-screen Companion…", #selector(showLockPreview), "l")
        restorePictureItem = add(menu, "Restore Previous System Picture", #selector(restoreSystemPicture), "")
        restorePictureItem.isEnabled = !desktopBackups.isEmpty
        pauseItem = add(menu, "Pause Motion", #selector(togglePaused), "p")
        batteryItem = add(menu, "Power Saver on Battery", #selector(toggleBattery), "")
        batteryItem.state = UserDefaults.standard.bool(forKey: "pauseOnBattery") ? .on : .off
        menu.addItem(.separator())
        allDisplaysItem = add(menu, "All Displays", #selector(selectAllDisplays), "")
        mainDisplayItem = add(menu, "Main Display Only", #selector(selectMainDisplay), "")
        updateDisplayMenu()
        menu.addItem(.separator())
        add(menu, "About Arasaka Wallpaper…", #selector(showAbout), "")
        add(menu, "Quit Arasaka Wallpaper", #selector(quit), "q")
        statusItem.menu = menu
        // Standard menu actions make keyboard editing and Command-Q work in the preview.
        let menuBar = NSMenu()
        let appMenuItem = NSMenuItem(); let appMenu = NSMenu(title: "Arasaka Wallpaper")
        add(appMenu, "About Arasaka Wallpaper…", #selector(showAbout), "")
        add(appMenu, "Customize Wallpaper…", #selector(showPreview), ",")
        add(appMenu, "Lock-screen Companion…", #selector(showLockPreview), "l")
        appMenu.addItem(.separator()); add(appMenu, "Quit Arasaka Wallpaper", #selector(quit), "q")
        appMenuItem.submenu = appMenu; menuBar.addItem(appMenuItem)
        let editItem = NSMenuItem(); let editMenu = NSMenu(title: "Edit")
        for (title, action, key) in [("Undo", "undo:", "z"), ("Cut", "cut:", "x"), ("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select All", "selectAll:", "a")] {
            editMenu.addItem(NSMenuItem(title: title, action: Selector(action), keyEquivalent: key))
        }
        editItem.submenu = editMenu; menuBar.addItem(editItem); NSApp.mainMenu = menuBar
    }

    @discardableResult private func add(_ menu: NSMenu, _ title: String, _ action: Selector, _ key: String) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: key); item.target = self; menu.addItem(item); return item
    }

    private func makeWebView(wallpaper: Bool) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(self, name: "arasaka")
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = self
        view.setValue(false, forKey: "drawsBackground")
        view.autoresizingMask = [.width, .height]
        // WKWebView's file loader rejects query-bearing file URLs on some macOS versions.
        // Select desktop/configuration mode after the local document finishes loading.
        view.loadFileURL(webRoot.appendingPathComponent("index.html"), allowingReadAccessTo: webRoot)
        return view
    }

    private func rebuildDesktops() {
        for view in desktopViews { view.configuration.userContentController.removeScriptMessageHandler(forName: "arasaka"); view.stopLoading() }
        for window in desktopWindows { window.close() }
        desktopViews.removeAll(); desktopWindows.removeAll()
        let screens = UserDefaults.standard.bool(forKey: "allDisplays") ? NSScreen.screens : Array(NSScreen.screens.prefix(1))
        for screen in screens {
            let window = NSWindow(contentRect: screen.frame, styleMask: .borderless, backing: .buffered, defer: false, screen: screen)
            window.setFrame(screen.frame, display: true)
            window.level = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopWindow)) + 1)
            window.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
            window.isOpaque = true; window.backgroundColor = NSColor(calibratedRed: 0.035, green: 0.039, blue: 0.051, alpha: 1)
            window.hasShadow = false; window.ignoresMouseEvents = true; window.isReleasedWhenClosed = false
            let view = makeWebView(wallpaper: true)
            window.contentView = view
            desktopWindows.append(window); desktopViews.append(view)
            window.orderFrontRegardless()
        }
        syncPause()
    }

    @objc private func showPreview() {
        if let window = previewWindow { window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true); return }
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1180, height: 760), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Arasaka — Customize Your Wallpaper"
        window.minSize = NSSize(width: 600, height: 480)
        window.isReleasedWhenClosed = false; window.delegate = self
        window.backgroundColor = NSColor.black
        let view = makeWebView(wallpaper: false)
        window.contentView = view; previewView = view; previewWindow = window
        window.center(); window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    }

    @objc private func showLockPreview() {
        let needsLoad = previewView == nil
        wantsLockPreview = needsLoad
        showPreview()
        if !needsLoad { previewView?.evaluateJavaScript("window.Arasaka?.openLockPreview()") }
    }

    func windowWillClose(_ notification: Notification) {
        if notification.object as? NSWindow === previewWindow {
            previewView?.configuration.userContentController.removeScriptMessageHandler(forName: "arasaka")
            previewView?.stopLoading(); previewView = nil; previewWindow = nil
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool { showPreview(); return true }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        sendSettings(to: webView)
        sendHostContext(to: webView)
        if desktopViews.contains(where: { $0 === webView }) {
            webView.evaluateJavaScript("window.Arasaka?.setClean(true); window.Arasaka?.setPaused(\(effectivePause ? "true" : "false"))")
        } else if wantsLockPreview { wantsLockPreview = false; webView.evaluateJavaScript("window.Arasaka?.openLockPreview()") }
        else { webView.evaluateJavaScript("window.Arasaka?.openSettings()") }
    }

    private func sendHostContext(to webView: WKWebView) {
        let frame = (previewWindow?.screen ?? NSScreen.screens.first)?.frame ?? NSRect(x:0,y:0,width:1440,height:900)
        let context: [String:Any] = ["width":frame.width,"height":frame.height,"canRestore":!desktopBackups.isEmpty]
        guard let data = try? JSONSerialization.data(withJSONObject: context), let json = String(data:data,encoding:.utf8) else { return }
        webView.evaluateJavaScript("window.Arasaka?.setHostContext(\(json))")
    }

    private func sendSettings(to webView: WKWebView) {
        guard let data = try? JSONSerialization.data(withJSONObject: settings), let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.Arasaka?.applySettings(\(json))")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true, let body = message.body as? [String: Any], let action = body["action"] as? String else { return }
        switch action {
        case "settings":
            guard let incoming = body["settings"] as? [String: Any], JSONSerialization.isValidJSONObject(incoming) else { return }
            settings = incoming
            for view in desktopViews + [previewView].compactMap({ $0 }) where view !== message.webView { sendSettings(to: view) }
        case "fullscreen": previewWindow?.toggleFullScreen(nil)
        case "export":
            guard let raw = body["data"] as? String, raw.hasPrefix("data:image/png;base64,"), let data = Data(base64Encoded: String(raw.dropFirst(22))), data.count < 50_000_000 else { return }
            let panel = NSSavePanel(); panel.allowedContentTypes = [.png]
            let proposed = body["filename"] as? String ?? "Arasaka-Wallpaper.png"
            panel.nameFieldStringValue = String(proposed.filter { $0.isLetter || $0.isNumber || "-_.".contains($0) }.prefix(120))
            panel.begin { result in
                guard result == .OK, let url = panel.url else { return }
                do { try data.write(to: url, options: .atomic); self.previewView?.evaluateJavaScript("window.Arasaka?.notify('Wallpaper image saved.')") }
                catch { self.previewView?.evaluateJavaScript("window.Arasaka?.notify('The image could not be saved. Try another location.')") }
            }
        case "setLockScreen":
            guard let raw = body["data"] as? String, let data = pngData(raw), let preset = body["preset"] as? String, ["classic","ceramic","militech","kangtao","mantis"].contains(preset) else { return }
            setSystemPicture(data, preset: preset)
        case "restoreSystemWallpaper": restoreSystemPicture()
        default: break
        }
    }

    private var desktopBackups: [String: [String: Any]] {
        get { UserDefaults.standard.dictionary(forKey:"systemPictureBackups") as? [String:[String:Any]] ?? [:] }
        set { UserDefaults.standard.set(newValue,forKey:"systemPictureBackups") }
    }
    private func displayID(_ screen: NSScreen) -> String { (screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.stringValue ?? "main" }
    private func pngData(_ raw: String) -> Data? {
        guard raw.hasPrefix("data:image/png;base64,"), let data = Data(base64Encoded:String(raw.dropFirst(22))), data.count < 50_000_000, data.starts(with:[137,80,78,71,13,10,26,10]), NSImage(data:data) != nil else { return nil }
        return data
    }
    private func pictureOptions(_ entry: [String:Any]) -> [NSWorkspace.DesktopImageOptionKey:Any] {
        guard let data = entry["options"] as? Data, let restored = try? NSKeyedUnarchiver.unarchivedObject(ofClasses:[NSDictionary.self,NSString.self,NSNumber.self,NSColor.self,NSArray.self,NSValue.self],from:data) as? [String:Any] else { return [:] }
        return Dictionary(uniqueKeysWithValues: restored.map { (NSWorkspace.DesktopImageOptionKey(rawValue:$0.key),$0.value) })
    }
    private func reportLockResult(_ text: String) {
        restorePictureItem?.isEnabled = !desktopBackups.isEmpty
        let args:[Any] = [text,!desktopBackups.isEmpty]
        guard let data = try? JSONSerialization.data(withJSONObject:args), let json = String(data:data,encoding:.utf8) else { return }
        previewView?.evaluateJavaScript("window.Arasaka?.lockResult(...\(json))")
    }
    private func setSystemPicture(_ data: Data, preset: String) {
        // This is the documented system desktop-image API. No lock-screen cache,
        // security setting, authentication UI, or FileVault asset is modified.
        let workspace = NSWorkspace.shared
        let screens = UserDefaults.standard.bool(forKey:"allDisplays") ? NSScreen.screens : Array(NSScreen.screens.prefix(1))
        guard !screens.isEmpty else { reportLockResult("No display is available. Please try again."); return }
        do {
            let folder = FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0].appendingPathComponent("Arasaka Wallpaper/Lock Screens",isDirectory:true)
            try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
            let imageURL = folder.appendingPathComponent("\(preset)-\(UUID().uuidString).png")
            try data.write(to:imageURL,options:.atomic)
            var backups = desktopBackups
            var successes = 0
            for screen in screens {
                let id = displayID(screen)
                if backups[id] == nil, let old = workspace.desktopImageURL(for:screen) {
                    let oldOptions = workspace.desktopImageOptions(for:screen) ?? [:]
                    let options = Dictionary(uniqueKeysWithValues: oldOptions.map { ($0.key.rawValue,$0.value) })
                    var entry:[String:Any] = ["url":old.absoluteString]
                    if let archived = try? NSKeyedArchiver.archivedData(withRootObject:options,requiringSecureCoding:true) { entry["options"] = archived }
                    backups[id] = entry
                }
                // Save the recovery record before requesting a system change.
                desktopBackups = backups
                do {
                    try workspace.setDesktopImageURL(imageURL,for:screen,options:[.imageScaling:NSImageScaling.scaleProportionallyUpOrDown.rawValue,.allowClipping:true])
                    successes += 1
                } catch { NSLog("Could not set system picture for display %@: %@",id,error.localizedDescription) }
            }
            if successes == screens.count { reportLockResult("System picture applied. macOS uses it for the lock-screen background; the live desktop stays active.") }
            else { reportLockResult("Applied to \(successes) of \(screens.count) displays. Check macOS Wallpaper settings for the remaining displays or Spaces.") }
        } catch { reportLockResult("Could not save the companion image. Your system picture was not changed.") }
    }
    @objc private func restoreSystemPicture() {
        var backups = desktopBackups
        var restored = 0
        var failed = 0
        for screen in NSScreen.screens {
            let id = displayID(screen)
            guard let entry = backups[id], let value = entry["url"] as? String, let url = URL(string:value) else { continue }
            do { try NSWorkspace.shared.setDesktopImageURL(url,for:screen,options:pictureOptions(entry)); backups.removeValue(forKey:id); restored += 1 }
            catch { failed += 1 }
        }
        desktopBackups = backups
        reportLockResult(failed > 0 ? "Restored \(restored) displays. Choose your previous wallpaper in macOS Wallpaper settings for any remaining display." : restored > 0 ? "Previous system picture restored. Your live wallpaper is unchanged." : "No connected display has a saved system picture to restore.")
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.isFileURL && url.standardizedFileURL.path.hasPrefix(webRoot.standardizedFileURL.path + "/") { decisionHandler(.allow) }
        else if url.absoluteString == "about:blank" { decisionHandler(.allow) }
        else { decisionHandler(.cancel) }
    }

    private var onBattery: Bool {
        guard let info = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(), let source = IOPSGetProvidingPowerSourceType(info)?.takeUnretainedValue() else { return false }
        return source as String == kIOPSBatteryPowerValue
    }
    private var effectivePause: Bool { paused || sleeping || (UserDefaults.standard.bool(forKey: "pauseOnBattery") && onBattery) }
    private func syncPause() { for view in desktopViews { view.evaluateJavaScript("window.Arasaka?.setPaused(\(effectivePause ? "true" : "false"))") } }
    private func trackPointer() {
        guard !effectivePause, settings["powerSaver"] as? Bool != true, settings["parallax"] as? Bool != false, Date().timeIntervalSince(lastPointerUpdate) > 0.05 else { return }
        lastPointerUpdate = Date()
        let location = NSEvent.mouseLocation
        for (index, window) in desktopWindows.enumerated() {
            let frame = window.frame
            let x = frame.contains(location) ? (location.x - frame.minX) / frame.width - 0.5 : 0
            let y = frame.contains(location) ? 0.5 - (location.y - frame.minY) / frame.height : 0
            desktopViews[index].evaluateJavaScript("window.Arasaka?.setPointer(\(x), \(y))")
        }
    }
    @objc private func togglePaused() { paused.toggle(); pauseItem.state = paused ? .on : .off; syncPause() }
    @objc private func toggleBattery() { let enabled = !UserDefaults.standard.bool(forKey: "pauseOnBattery"); UserDefaults.standard.set(enabled, forKey: "pauseOnBattery"); batteryItem.state = enabled ? .on : .off; syncPause() }
    private func updateDisplayMenu() { let all = UserDefaults.standard.bool(forKey: "allDisplays"); allDisplaysItem?.state = all ? .on : .off; mainDisplayItem?.state = all ? .off : .on }
    @objc private func selectAllDisplays() { UserDefaults.standard.set(true, forKey: "allDisplays"); updateDisplayMenu(); rebuildDesktops() }
    @objc private func selectMainDisplay() { UserDefaults.standard.set(false, forKey: "allDisplays"); updateDisplayMenu(); rebuildDesktops() }
    @objc private func displaysChanged() { rebuildDesktops() }
    @objc private func willSleep() { sleeping = true; syncPause() }
    @objc private func didWake() { sleeping = false; syncPause(); for window in desktopWindows { window.orderFrontRegardless() } }
    @objc private func showAbout() {
        let alert = NSAlert(); alert.messageText = "Arasaka Wallpaper Collection"; alert.informativeText = "Five offline wallpapers: Arasaka Classic, Arasaka Ceramic, Militech, Kang Tao, and Mantis Blueprint.\n\nCustomize Wallpaper changes your live desktop. Lock-screen Companion prepares a matching still and optionally sets the underlying macOS system picture.\n\nOriginal fan-made artwork based on your references. Not affiliated with CD PROJEKT RED or Corsair.\n\nVersion 2.0.0"; alert.runModal()
    }
    @objc private func quit() { NSApp.terminate(nil) }
    func applicationWillTerminate(_ notification: Notification) { batteryTimer?.invalidate(); if let monitor = mouseMonitor { NSEvent.removeMonitor(monitor) }; for window in desktopWindows { window.close() } }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
