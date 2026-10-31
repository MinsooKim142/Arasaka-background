import Foundation

@main struct DisplaySettingsTests {
    static func main() {
        let original: [String: Any] = ["preset":"classic","theme":"ice","operator":"V","scale":110]
        var store = DisplaySettings(shared: original, overrides: [:])
        assert(NSDictionary(dictionary:store.effective(for:"main")).isEqual(to:original), "Legacy main preferences must migrate intact")
        store.set(["preset":"mantis","scale":95], target:"main")
        let mainBefore = store.effective(for:"main")
        store.pairEditor(primary:"main",secondaries:["second","third"])
        assert(NSDictionary(dictionary:store.effective(for:"main")).isEqual(to:mainBefore), "Pairing must not change the main display")
        assert(store.effective(for:"second")["preset"] as? String == "editor")
        store.set(["preset":"kangtao","theme":"orange"],target:"second")
        assert(store.effective(for:"main")["preset"] as? String == "mantis", "Editing a secondary must not leak into main")
        assert(store.effective(for:"third")["preset"] as? String == "editor", "Other secondary assignments must stay independent")
        let saved = store.overrides
        var relaunched = DisplaySettings(shared:store.shared,overrides:saved)
        assert(relaunched.effective(for:"second")["preset"] as? String == "kangtao", "A reconnected display must recover its saved choice")
        assert(relaunched.effective(for:"new")["preset"] as? String == "classic", "New displays inherit the shared default")
        relaunched.set(["preset":"ceramic"],target:"all")
        assert(relaunched.overrides.isEmpty && relaunched.effective(for:"second")["preset"] as? String == "ceramic", "Only an explicit All displays edit resets individual assignments")
        print("Display routing passed: legacy migration, isolated editing, pairing, reconnection, and explicit shared reset.")
    }
}
