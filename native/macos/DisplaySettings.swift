import Foundation

/// Keeps each display's full configuration separate from the legacy shared default.
struct DisplaySettings {
    var shared: [String: Any]
    var overrides: [String: [String: Any]]

    func effective(for id: String) -> [String: Any] { overrides[id] ?? shared }

    mutating func set(_ value: [String: Any], target: String) {
        if target == "all" { shared = value; overrides.removeAll() }
        else { overrides[target] = value }
    }

    mutating func pairEditor(primary: String, secondaries: [String]) {
        var editor = effective(for: primary)
        editor["preset"] = "editor"
        editor["theme"] = "crimson"
        editor["layout"] = "terminal"
        for id in secondaries where id != primary { overrides[id] = editor }
    }
}
