// render.swift: renders PondScene to PNG frames (macOS 14+). From the skill's folder:
//
//   swiftc -parse-as-library -target arm64-apple-macos14 \
//     templates/swiftui/Motion.swift templates/swiftui/LiveFace.swift \
//     demo/Color+Hex.swift demo/PhoneMockup.swift examples/pond/*.swift -o /tmp/render-pond
//   /tmp/render-pond /tmp/pond phone fps=60        # all 600 frames, inside an iPhone
//   /tmp/render-pond /tmp/pond phone fps=60 0 213  # only these frames (to check before a full render)
//   ffmpeg -framerate 60 -i /tmp/pond/%04d.png -vf "scale=1080:1080:flags=lanczos,format=yuv420p" \
//     -c:v libx264 -crf 20 examples/pond/pond.mp4
import Foundation
import ImageIO
import SwiftUI
import UniformTypeIdentifiers

@MainActor
func pond(_ t: Double, phone: Bool) -> AnyView {
    guard phone else { return AnyView(PondScene(t: t)) }
    // 400 stage units across the screen, with the pad's surface at 72% of its height. The
    // firefly enters and leaves well beyond those edges (x 160 and 560).
    let screen = PhoneMockup<EmptyView>.screen
    let k = screen.width / 720 * 1.8
    return AnyView(PhoneMockup(darkStatus: false) {
        PondScene(t: t, height: screen.height / k, stageTop: screen.height * 0.72 / k - 608)
            .scaleEffect(k, anchor: .topLeading)
            .offset(x: -(720 * k - screen.width) / 2)
    })
}

@main
struct RenderPond {
    @MainActor
    static func main() throws {
        var args = Array(CommandLine.arguments.dropFirst())
        let out = URL(fileURLWithPath: args.isEmpty ? "frames" : args.removeFirst())
        let phone = args.first == "phone"
        if phone { args.removeFirst() }
        var fps = 30.0
        if let i = args.firstIndex(where: { $0.hasPrefix("fps=") }) {
            fps = Double(args.remove(at: i).dropFirst(4)) ?? 30
        }
        try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
        let picks = args.compactMap { Int($0) }
        let frames = picks.isEmpty ? Array(0..<Int(PondScene.loopMs / 1000 * fps)) : picks
        for f in frames {
            let renderer = ImageRenderer(content: pond(Double(f) / fps * 1000, phone: phone))
            renderer.scale = 2
            guard let image = renderer.cgImage else { throw CocoaError(.fileWriteUnknown) }
            let url = out.appendingPathComponent(String(format: "%04d.png", f))
            guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
                throw CocoaError(.fileWriteUnknown)
            }
            CGImageDestinationAddImage(dest, image, nil)
            CGImageDestinationFinalize(dest)
        }
        print("rendered \(frames.count) frames of pond to \(out.path)")
    }
}
