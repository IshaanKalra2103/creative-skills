# SwiftUI implementation

The direction becomes code as a small theme layer, then native components
styled by it. Do not rebuild system components to look custom; restyle them.

Target iOS 26 (Liquid Glass). Check the current SDK's docs for anything newer
before writing code: APIs below are iOS 26 unless noted.

## 1. Tokens

Colours live in the Asset Catalog with Any/Dark appearances, named by role
(`Ground`, `Raised`, `Ink`, `Ink2`, `Ink3`, `Rule`, `Accent`, `OnAccent`).
Then:

```swift
extension ShapeStyle where Self == Color {
    static var ground: Color { Color("Ground") }
    static var ink: Color { Color("Ink") }
    static var ink2: Color { Color("Ink2") }
    static var accentInk: Color { Color("Accent") }
}

enum Space { static let xs = 4.0, s = 8.0, m = 16.0, l = 24.0, xl = 40.0, xxl = 64.0 }
```

Set the accent once at the root: `.tint(.accentInk)`.

## 2. Type

Map every style to a Dynamic Type text style so it scales:

```swift
extension Font {
    // System, with character
    static let display = Font.system(size: 56, weight: .heavy).width(.expanded)
    static let screenTitle = Font.system(.largeTitle, design: .serif, weight: .semibold)
    static let metric = Font.system(.title, design: .default, weight: .bold).width(.compressed).monospacedDigit()

    // Custom face, still scaling with Dynamic Type
    static let headline = Font.custom("Newsreader-SemiBold", size: 28, relativeTo: .title)
}
```

For fixed-size display numerals that should still scale, use
`@ScaledMetric(relativeTo: .largeTitle) var size = 56`.

Tracking: `.tracking(-1.2)` on display, `.textCase(.uppercase).tracking(0.8)`
on small labels.

## 3. Liquid Glass

- Navigation layer only: tab bars, toolbars, floating controls. System
  `TabView`, `NavigationStack` toolbars and sheets adopt it automatically.
- Custom floating controls: `.glassEffect()` /
  `.glassEffect(.regular.tint(.accentInk).interactive())`.
- Buttons: `.buttonStyle(.glass)` and `.buttonStyle(.glassProminent)`.
- Group glass that morphs: `GlassEffectContainer { ... }` with
  `.glassEffectID(_:in:)`.
- Tab bar: `TabView { Tab(...) ... Tab(role: .search) { ... } }`,
  `.tabBarMinimizeBehavior(.onScrollDown)`, `.tabViewBottomAccessory { }`.
- Toolbars: `ToolbarSpacer` to split groups.
- Concentric shapes: `ConcentricRectangle()`, `.containerShape(...)`.
- Remove custom backgrounds behind bars that fight the glass; let content
  scroll under, and use `.scrollEdgeEffectStyle(.soft, for: .top)`.
- Never put glass on content cards or stack glass on glass.

## 4. Motion and haptics

```swift
.animation(.smooth, value: state)
.contentTransition(.numericText())
.sensoryFeedback(.success, trigger: completedCount)
.navigationTransition(.zoom(sourceID: item.id, in: ns))   // on the destination
.matchedTransitionSource(id: item.id, in: ns)             // on the source
.symbolEffect(.bounce, value: isDone)
```

Press state for custom tappables:

```swift
struct PressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.snappy(duration: 0.18), value: configuration.isPressed)
    }
}
```

## 5. Quality bar before calling it done

- Dynamic Type at the largest accessibility size: nothing truncates
  illegibly, layouts reflow.
- Dark mode designed, not inverted.
- VoiceOver labels on every icon-only control; grouping on composite rows.
- Reduce Motion and Reduce Transparency respected.
- 44pt hit targets.
- Run in the simulator, screenshot every key screen in both appearances, and
  compare against the mockups. The build is judged against the design, not
  against "it compiles".
