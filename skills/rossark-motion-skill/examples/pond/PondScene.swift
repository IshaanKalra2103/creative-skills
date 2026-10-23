// PondScene.swift: an original example made with the skill's SwiftUI engine (not one of the
// upstream demos). A frog sits on a lily pad at dusk. A firefly wanders in from beyond the screen
// edge: the frog's eyes find it first and its head follows a beat later. It crouches, narrows its
// eyes and snaps its tongue, but the firefly rises just in time, circles and lands on the frog's
// nose. The frog goes cross-eyed, blinks slowly, puffs its throat twice and squints with joy. When
// the firefly leaves, the frog hops (the pad dips and rings spread across the water), watches it go,
// then licks its lips. One clock, a 10-second loop. Render it at 60 fps.
//
// The pupils are aimed at the firefly every frame from each eye's own position, so the gaze leads,
// follows and crosses by itself. The firefly on the nose and the tongue's target are solved through
// the frog's real transform (pad bob and rock, hop, lean, squash, head tilt), so contact stays exact.
// Every loop that is on screen at the seam has a period that divides 10 s.
import SwiftUI

struct PondScene: View {
    let t: Double
    /// Taller than the scene (a phone screen): the stage stays put, the sky and the water fill the rest.
    var height = 720.0
    /// Where the 720-tall stage starts inside that height; centred when nil.
    var stageTop: Double? = nil
    private var top: Double { stageTop ?? (height - Self.size.height) / 2 }
    static let size = CGSize(width: 720, height: 720)
    static let loopMs = 10000.0

    private enum Ink {
        static let skyTop = Color(hex: 0x1B1D44)
        static let skyMid = Color(hex: 0x473A77)
        static let skyLow = Color(hex: 0xE59A88)
        static let moon = Color(hex: 0xFFF1C8)
        static let moonGlow = Color(hex: 0xFFE7A8)
        static let star = Color(hex: 0xFFF6DA)
        static let bankFar = Color(hex: 0x3A3A70)
        static let bankNear = Color(hex: 0x282A57)
        static let waterTop = Color(hex: 0x3C3E78)
        static let waterLow = Color(hex: 0x181B3E)
        static let padWake = Color(hex: 0x1F2350)
        static let shimmer = Color(hex: 0x6A6FAD)
        static let moonPath = Color(hex: 0xF3DDA4)
        static let ripple = Color(hex: 0x8D92D6)
        static let reed = Color(hex: 0x2D5752)
        static let reedLight = Color(hex: 0x3B6E64)
        static let cattail = Color(hex: 0x5C3B35)
        static let pad = Color(hex: 0x3F9460)
        static let padEdge = Color(hex: 0x2B6A47)
        static let padVein = Color(hex: 0x58AA73)
        static let padShadow = Color(hex: 0x337A52)
        static let padFar = Color(hex: 0x2F6D58)
        static let padFarEdge = Color(hex: 0x235445)
        static let lotus = Color(hex: 0xF29BB8)
        static let lotusShade = Color(hex: 0xD77A9C)
        static let body = Color(hex: 0x7CCB6C)
        static let bodyShade = Color(hex: 0x62B058)
        static let limb = Color(hex: 0x98DC86)
        static let belly = Color(hex: 0xE5F1AE)
        static let sac = Color(hex: 0xF7FADC)
        static let sacRim = Color(hex: 0xC4D88A)
        static let blush = Color(hex: 0xF2A39C)
        static let line = Color(hex: 0x2E5B33)
        static let pupil = Color(hex: 0x1D2621)
        static let mouth = Color(hex: 0x5B1F2E)
        static let tongue = Color(hex: 0xF07D8E)
        static let flyBody = Color(hex: 0x3A2E2C)
        static let flyWing = Color(hex: 0xE9EEFF)
        static let glow = Color(hex: 0xE6FF6E)
        static let glowCore: UInt32 = 0xF8FF9C
        static let glowDim: UInt32 = 0x9AA653
    }

    // MARK: - Tokens

    /// The water line on the stage; the far bank sits on it.
    private let horizon = 372.0
    /// The main pad: centre and radii on the water (seen from a little above), and its notch angle.
    private let pad = (x: 360.0, y: 612.0, rx: 165.0, ry: 44.0, notch: 62.0)
    /// Frog units (body centre at (0, 0), feet on the pad at y = 78) to stage points.
    private let frogScale = 1.15
    private let feetY = 78.0
    /// The eyes sit on two bumps on top of the head.
    private let eye = (x: 50.0, y: -70.0, w: 36.0, h: 42.0, bump: 32.0)
    /// Front legs: shoulder, width, the two segments and the finger length.
    private let arm = (x: 46.0, y: 26.0, w: 17.0, upper: 28.0, fore: 26.0, finger: 9.0)
    /// Where the firefly sits on the face, between the eyes.
    private let perch = CGPoint(x: 0, y: -44)
    /// Pupil travel inside the white, and the hop's height (stage units).
    private let look = (x: 8.0, y: 9.0)
    private let jump = 44.0
    /// The beats of the loop, in ms.
    private let beat = (snap: 3560.0, reach: 3680.0, retract: 3780.0, back: 3940.0, approach: 4250.0, land: 4650.0,
                        takeoff: 6450.0, gone: 6750.0, push: 6640.0, up: 6690.0, down: 7070.0)
    /// The firefly's size on stage.
    private let fly = 1.5
    /// Far fireflies over the bank: where they drift and when each one flashes (twice a loop).
    private let swarm: [(x: Double, y: Double, at: Double)] = [
        (232, 318, 350), (512, 296, 2600), (300, 262, 4100), (470, 340, 1500), (196, 352, 3300), (420, 248, 700),
    ]
    private let reeds: [(x: Double, h: Double, lean: Double, cat: Bool)] = [
        (170, 170, -5, true), (186, 128, 3, false), (204, 196, -1, true), (222, 116, 7, false),
        (520, 146, -7, false), (536, 200, 2, true), (553, 138, 8, false), (568, 176, -2, true),
    ]
    private let lilies: [(x: Double, y: Double, rx: Double, ry: Double, notch: Double, bud: Bool)] = [
        (214, 452, 46, 11, 300, true), (550, 436, 34, 9, 210, false), (606, 712, 82, 21, 150, false), (140, 744, 72, 18, 20, false),
    ]

    private static let ink = FaceInk(white: .white, pupil: Ink.pupil, skin: Ink.body, line: Ink.line, lineWidth: 5)

    /// Blinks land on the turns: toward the firefly, a double blink after the miss, a slow and
    /// contented one with the firefly on the nose, one after the landing, one on the turn back.
    /// In between, the eyes narrow to aim and snap wide on the strike.
    private static let lid: Keys = [Key(0, 0)] + blink(1950)
        + [Key(2900, 0), Key(3150, 0.3), Key(3530, 0.3), Key(3610, 0, out: true)]
        + blink(3960) + blink(4330) + blink(5150, close: 220, hold: 150, open: 380) + blink(7180) + blink(9000)
        + [Key(loopMs, 0)]
    /// A happy squint with the firefly on the nose, and a smug half squint for the lick.
    private static let cheek: Keys = [Key(0, 0), Key(5950, 0), Key(6080, 1, out: true), Key(6330, 1), Key(6500, 0),
                                      Key(9100, 0), Key(9230, 0.6, out: true), Key(9550, 0.6), Key(9800, 0), Key(loopMs, 0)]
    /// The mouth opens wide for the tongue, a small "oh" at the miss, and a little for the lick.
    private static let mouth: Keys = [Key(0, 0), Key(3500, 0), Key(3560, 1, out: true), Key(3800, 1), Key(3950, 0.15),
                                      Key(4060, 0.4, out: true), Key(4350, 0.4), Key(4560, 0), Key(9080, 0),
                                      Key(9160, 0.25, out: true), Key(9500, 0.25), Key(9640, 0), Key(loopMs, 0)]
    /// Two happy ribbits: the throat puffs and empties.
    private static let ribbit: Keys = [Key(0, 0), Key(5450, 0), Key(5630, 1, out: true), Key(5700, 1), Key(5880, 0), Key(5920, 0),
                                       Key(6100, 1, out: true), Key(6170, 1), Key(6360, 0), Key(loopMs, 0)]

    private static func blink(_ at: Double, close: Double = 110, hold: Double = 40, open: Double = 190) -> Keys {
        [Key(at, 0), Key(at + close, 1), Key(at + close + hold, 1), Key(at + close + hold + open, 0, out: true)]
    }

    var body: some View {
        Canvas { ctx, _ in
            drawSky(ctx)
            var stage = ctx
            stage.translateBy(x: 0, y: top)
            drawBank(stage)
            drawWater(stage)
            drawSwarm(stage)
            drawReeds(stage)
            drawLilies(stage)
            let p = pose(t)
            let bug = firefly(t, p)
            drawRipples(stage, p)
            drawPad(stage, p)
            drawFrog(stage, p, bug: bug)
            drawHeroFly(stage, at: bug)
        }
        .frame(width: Self.size.width, height: height)
    }

    // MARK: - Acting: smooth channels through key poses, plus idle life and follow-through

    /// One front leg: `a` the upper arm's outward angle (0 hangs down), `e` the elbow bend.
    private struct Arm { var a = 8.0, e = -12.0 }

    private struct Pose {
        var lift = 0.0, hang = 0.0, sx = 1.0, sy = 1.0, lean = 0.0, head = 0.0, yaw = 0.0
        var armL = Arm(), armR = Arm()
        /// The pad under the frog: its bob (stage units) and rock (degrees).
        var bob = 0.0, rock = 0.0
    }

    /// The key poses: a glance at a far firefly, watching the hero come in, the crouch and the
    /// strike, "whoa" at the miss, a puzzled tilt with the firefly on the nose, the hop, watching it go.
    private enum Act {
        static let sy: FlowKeys = [(0, 1), (2900, 1), (3300, 0.93), (3540, 0.92), (3620, 1.06), (3800, 1.03), (3980, 0.97),
                                   (4080, 1.05), (4300, 1), (6480, 1), (6620, 0.9), (6690, 1.08), (6900, 1.04), (7040, 1.02),
                                   (7090, 0.84), (7220, 1.03), (7360, 1), (10000, 1)]
        static let lean: FlowKeys = [(0, 0), (2300, 0), (3000, 3), (3540, 5), (3640, 9), (3800, 7), (4080, -3), (4500, 0),
                                     (6450, 0), (6620, 2), (6900, 0), (7400, 0), (7750, -5), (8500, -4), (9000, 0), (10000, 0)]
        static let head: FlowKeys = [(0, 0), (400, 0), (700, -4), (1200, -3), (1500, 0), (3000, 0), (4080, -4), (4500, 0),
                                     (4900, 6), (6200, 5), (6600, 0), (7400, 0), (7800, -4), (8500, -3), (9100, 0), (10000, 0)]
        /// The leg on the viewer's right braces for the strike, flings out at the miss and lifts in the hop.
        static let armRa: FlowKeys = [(0, 8), (3300, 8), (3600, 14), (3800, 12), (4000, 38), (4250, 34), (4650, 8), (6500, 8),
                                      (6620, 4), (6750, 40), (7000, 46), (7090, 58), (7250, 12), (7450, 8), (10000, 8)]
        static let armRe: FlowKeys = [(0, -12), (3300, -12), (3600, -20), (3800, -16), (4000, 70), (4250, 62), (4650, -12),
                                      (6500, -12), (6620, -16), (6750, 26), (7000, 30), (7090, 6), (7250, -14), (7450, -12),
                                      (10000, -12)]
        /// The other leg does the same a little differently.
        static let armLa: FlowKeys = [(0, 8), (3300, 8), (3600, 4), (3800, 6), (4000, 34), (4250, 30), (4650, 8), (6500, 8),
                                      (6620, 6), (6750, 36), (7000, 42), (7090, 54), (7250, 12), (7420, 8), (10000, 8)]
        static let armLe: FlowKeys = [(0, -12), (3300, -12), (3600, -6), (3800, -8), (4000, 78), (4250, 70), (4650, -12),
                                      (6500, -12), (6620, -14), (6750, 34), (7000, 38), (7090, 10), (7250, -12), (7420, -12),
                                      (10000, -12)]
        /// How much the eyes follow the firefly (vs. resting on the viewer).
        static let attend: FlowKeys = [(0, 0), (1650, 0), (2000, 1), (8500, 1), (9000, 0), (10000, 0)]
        /// The resting gaze: at the viewer, with a glance up at a far firefly as it flashes.
        static let restX: FlowKeys = [(0, 0), (400, 0), (700, -5), (1200, -5), (1500, 0), (10000, 0)]
        static let restY: FlowKeys = [(0, 2), (400, 2), (700, -4), (1200, -4), (1500, 2), (10000, 2)]
        /// The firefly's free flight (stage units): in from beyond the right edge, a hover by the
        /// frog, the dodge, a circle down to the nose, and out past the left edge.
        static let flyX: FlowKeys = [(0, 800), (1300, 800), (2200, 560), (3000, 528), (3460, 522), (3700, 530), (4060, 482),
                                     (4350, 420), (4650, 362), (6450, 362), (6900, 330), (7500, 250), (8300, 150), (9000, 40),
                                     (10000, -60)]
        static let flyY: FlowKeys = [(0, 360), (1300, 360), (2200, 436), (3000, 488), (3460, 494), (3700, 418), (4060, 372),
                                     (4350, 398), (4650, 470), (6450, 470), (6900, 420), (7500, 346), (8300, 300), (9000, 282),
                                     (10000, 282)]
    }

    private func lift(_ t: Double) -> Double {
        guard t > beat.up, t < beat.down else { return 0 }
        let k = (t - beat.up) / (beat.down - beat.up)
        return jump * 4 * k * (1 - k)
    }

    /// A damped swing after a jolt at `at`: one quick back-and-forth that dies out.
    private func swing(_ t: Double, at: Double, amp: Double, period: Double) -> Double {
        guard t > at else { return 0 }
        let s = t - at
        return amp * sin(2 * .pi * s / period) * exp(-s / (period * 0.5))
    }

    private func pose(_ t: Double) -> Pose {
        var p = Pose()
        p.lift = lift(t)
        p.hang = p.lift / jump
        // Squash and stretch keep the volume; breathing on top.
        let s = flow(t, Act.sy)
        p.sx = 1 / pow(s, 0.6)
        p.sy = s * (1 + 0.012 * wave(t, period: 2500))
        p.lean = flow(t, Act.lean) + 1.2 * wave(t, period: 5000, phase: 0.3)
        // The head turns toward the firefly a beat after the eyes find it, and rights itself a
        // beat after the body leans.
        let lag = t - 150
        let sit = landed(lag)
        let fx = flyFree(lag).x * (1 - sit) + pad.x * sit
        let toward = max(-1, min(1, (fx - pad.x) / 220))
        p.yaw = 0.55 * flow(lag, Act.attend) * toward + 0.05 * wave(t, period: 2500, phase: 0.1)
        let own = flow(t, Act.head) + 5 * p.yaw
        p.head = own - 0.45 * flow(t - 110, Act.lean) + 2 * wave(t, period: 5000, phase: 0.6)
        // Front legs: the key poses, a small sway that never stops, and a forearm that trails.
        func limb(_ ka: FlowKeys, _ ke: FlowKeys, phase: Double) -> Arm {
            let sway = 1.5 * wave(t, period: 2500, phase: phase) + wave(t, period: 1250, phase: phase + 0.3)
            let trail = 0.45 * (flow(t - 90, ka) - flow(t, ka))
            let bend = flow(t, ke) + 2 * wave(t, period: 2500, phase: phase + 0.6) + trail
            return Arm(a: flow(t, ka) + sway, e: bend)
        }
        p.armR = limb(Act.armRa, Act.armRe, phase: 0)
        p.armL = limb(Act.armLa, Act.armLe, phase: 0.45)
        // The pad carries the frog: it bobs and rocks, and dips under the push-off and the landing.
        let dips = swing(t, at: beat.push, amp: 3, period: 400) + swing(t, at: beat.down, amp: 8, period: 900)
        p.bob = 1.5 * wave(t, period: 2500, phase: 0.2) + dips
        p.rock = 1.6 * wave(t, period: 5000, phase: 0.7) + swing(t, at: beat.down, amp: 2.5, period: 1100)
        return p
    }

    // MARK: - Frames: pad, then the planted legs, then the body, then the face

    private func padFrame(_ p: Pose) -> CGAffineTransform {
        CGAffineTransform(translationX: pad.x, y: pad.y + p.bob).rotated(by: p.rock * .pi / 180)
    }

    /// Haunches and feet: on the pad, lifted by the hop; frog units with the body centre at (0, 0).
    private func planted(_ p: Pose) -> CGAffineTransform {
        padFrame(p).translatedBy(x: 0, y: -4 - p.lift).scaledBy(x: frogScale, y: frogScale).translatedBy(x: 0, y: -feetY)
    }

    /// The body leans and squashes around the feet.
    private func bodyFrame(_ p: Pose) -> CGAffineTransform {
        planted(p).translatedBy(x: 0, y: feetY).rotated(by: p.lean * .pi / 180)
            .scaledBy(x: p.sx, y: p.sy).translatedBy(x: 0, y: -feetY)
    }

    /// The face tilts around the middle of the body.
    private func faceFrame(_ p: Pose) -> CGAffineTransform {
        bodyFrame(p).translatedBy(x: 0, y: -10).rotated(by: p.head * .pi / 180).translatedBy(x: 0, y: 10)
    }

    // MARK: - The firefly's flight, and where the eyes point

    /// The free flight, with a wobble on uneven periods (it is off screen at the loop's seam).
    private func flyFree(_ t: Double) -> CGPoint {
        let wx = 7 * wave(t, period: 830) + 4 * wave(t, period: 1270, phase: 0.3)
        let wy = 6 * wave(t, period: 1010, phase: 0.6)
        return CGPoint(x: flow(t, Act.flyX) + wx, y: flow(t, Act.flyY) + wy)
    }

    /// How much the firefly sits on the nose: it settles in with ease-out and lifts off.
    private func landed(_ t: Double) -> Double {
        seg(t, beat.approach, beat.land) * (1 - seg(t, beat.takeoff, beat.gone, easeOut: false))
    }

    private func perchOnStage(_ p: Pose) -> CGPoint {
        CGPoint(x: perch.x + 16 * p.yaw, y: perch.y).applying(faceFrame(p))
    }

    private func firefly(_ t: Double, _ p: Pose) -> CGPoint {
        let w = landed(t)
        let free = flyFree(t), sit = perchOnStage(p)
        return CGPoint(x: free.x + (sit.x - free.x) * w, y: free.y + (sit.y - free.y) * w)
    }

    /// Each pupil aims at the firefly from its own eye, so close up the eyes cross.
    private func gaze(_ p: Pose, bug: CGPoint) -> (l: CGPoint, r: CGPoint) {
        let att = flow(t, Act.attend)
        let rest = CGPoint(x: flow(t, Act.restX), y: flow(t, Act.restY))
        let local = bug.applying(faceFrame(p).inverted())
        func aim(_ side: Double) -> CGPoint {
            let dx = local.x - (side * eye.x + 14 * p.yaw)
            let dy = local.y - eye.y
            let d = (dx * dx + dy * dy + 900).squareRoot()
            let x = look.x * dx / d, y = look.y * dy / d
            return CGPoint(x: rest.x + (x - rest.x) * att, y: rest.y + (y - rest.y) * att)
        }
        return (aim(-1), aim(1))
    }

    // MARK: - Sky, bank and water

    private func drawSky(_ ctx: GraphicsContext) {
        let line = top + horizon
        let stops = [Gradient.Stop(color: Ink.skyTop, location: 0), .init(color: Ink.skyMid, location: 0.62),
                     .init(color: Ink.skyLow, location: 1)]
        ctx.fill(Path(CGRect(x: 0, y: 0, width: Self.size.width, height: line)),
                 with: .linearGradient(Gradient(stops: stops), startPoint: .zero, endPoint: CGPoint(x: 0, y: line)))
        // Stars: each dims once a loop at its own seeded moment.
        for i in 0..<16 {
            let x = 150 + seeded(i, salt: 1) * 420
            let y = top - 10 + seeded(i, salt: 2) * 250
            let r = 1.4 + 2.2 * seeded(i, salt: 3)
            let p = loop(t - seeded(i, salt: 4) * 5000, period: 5000) / (700 / 5000)
            let k = r * (p < 1 ? 1 - 0.6 * bell(p) : 1)
            var g = ctx
            g.translateBy(x: x, y: y)
            if r > 3 {
                g.fill(fourPointStar(r: k * 1.6), with: .color(Ink.star))
            } else {
                g.fill(Path(ellipseIn: CGRect(x: -k / 2, y: -k / 2, width: k, height: k)), with: .color(Ink.star))
            }
        }
        // The moon, its halo breathing a few percent.
        let moon = CGPoint(x: 478, y: top + 118)
        let breathe = 1 + 0.03 * wave(t, period: 5000)
        for (r, a) in [(84.0, 0.05), (62.0, 0.07), (46.0, 0.1)] {
            let rr = r * breathe
            ctx.fill(Path(ellipseIn: CGRect(x: moon.x - rr, y: moon.y - rr, width: rr * 2, height: rr * 2)), with: .color(Ink.moonGlow.opacity(a)))
        }
        ctx.fill(Path(ellipseIn: CGRect(x: moon.x - 30, y: moon.y - 30, width: 60, height: 60)), with: .color(Ink.moon))
    }

    /// A tree line on the far bank, and a row of bushes in front of it. The background stays still.
    private func drawBank(_ ctx: GraphicsContext) {
        for (layer, color) in [(0, Ink.bankFar), (1, Ink.bankNear)] {
            var x = -20.0
            var i = 0
            while x < 760 {
                let r = layer == 0 ? 26 + 20 * seeded(i, salt: 11) : 15 + 12 * seeded(i, salt: 12)
                let y = horizon - (layer == 0 ? 10 + r * 0.55 : r * 0.2)
                ctx.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2)), with: .color(color))
                x += r * 1.3
                i += 1
            }
            ctx.fill(Path(CGRect(x: 0, y: horizon - (layer == 0 ? 16 : 6), width: Self.size.width, height: 24)), with: .color(color))
        }
    }

    private func drawWater(_ ctx: GraphicsContext) {
        let bottom = height - top
        ctx.fill(Path(CGRect(x: 0, y: horizon, width: Self.size.width, height: bottom - horizon)),
                 with: .linearGradient(Gradient(colors: [Ink.waterTop, Ink.waterLow]), startPoint: CGPoint(x: 0, y: horizon),
                                       endPoint: CGPoint(x: 0, y: bottom)))
        // The moon's path: short dashes that widen and narrow with a travelling phase.
        for i in 0..<6 {
            let n = Double(i)
            let w = (56 - n * 6) * (0.55 + 0.45 * seeded(i, salt: 21)) * (0.75 + 0.25 * wave(t, period: 2500, phase: n * 0.13))
            let x = 478 + 14 * (seeded(i, salt: 22) - 0.5) + 4 * wave(t, period: 1250, phase: n * 0.21)
            let y = horizon + 10 + n * 12 + n * n * 2.2
            ctx.fill(pill(cx: x, cy: y, w: w, h: 3.5), with: .color(Ink.moonPath.opacity(0.55 - n * 0.07)))
        }
        // Shimmer on the surface: each dash drifts and breathes on its own phase.
        for i in 0..<14 {
            let x = 160 + seeded(i, salt: 31) * 400 + 6 * wave(t, period: 5000, phase: seeded(i, salt: 32))
            let y = horizon + 30 + seeded(i, salt: 33) * (bottom - horizon - 40)
            let w = (16 + 28 * seeded(i, salt: 34)) * (0.8 + 0.2 * wave(t, period: 2500, phase: seeded(i, salt: 35)))
            ctx.fill(pill(cx: x, cy: y, w: w, h: 3), with: .color(Ink.shimmer))
        }
    }

    /// Far fireflies blink on and off over the bank, twice a loop each, never together.
    private func drawSwarm(_ ctx: GraphicsContext) {
        for (i, f) in swarm.enumerated() {
            let p = loop(t - f.at, period: 5000) / (1100 / 5000)
            guard p < 1 else { continue }
            let x = f.x + 16 * wave(t, period: 10000, phase: seeded(i, salt: 41)) + 6 * wave(t, period: 2500, phase: seeded(i, salt: 42))
            let y = f.y + 8 * wave(t, period: 5000, phase: seeded(i, salt: 43))
            let k = bell(p)
            let c = CGPoint(x: x, y: y)
            ctx.fill(Path(ellipseIn: CGRect(x: x - 14, y: y - 14, width: 28, height: 28)),
                     with: .radialGradient(Gradient(colors: [Ink.glow.opacity(0.5 * k), Ink.glow.opacity(0)]), center: c, startRadius: 0, endRadius: 14))
            ctx.fill(Path(ellipseIn: CGRect(x: x - 2.4, y: y - 2.4, width: 4.8, height: 4.8)), with: .color(mix(Ink.glowDim, Ink.glowCore, k).opacity(k)))
        }
    }

    /// Reeds and cattails sway around their roots; the tips bend a little later than the stems.
    private func drawReeds(_ ctx: GraphicsContext) {
        for (i, r) in reeds.enumerated() {
            let sway = 2.5 * wave(t, period: 5000, phase: seeded(i, salt: 51)) + wave(t, period: 2500, phase: seeded(i, salt: 52))
            let bend = r.h * 0.05 * wave(t, period: 5000, phase: seeded(i, salt: 51) - 0.12)
            var g = ctx
            g.translateBy(x: r.x, y: horizon + 22)
            g.rotate(by: .degrees(r.lean + sway))
            let tip = CGPoint(x: bend, y: -r.h)
            let mid = CGPoint(x: bend * 0.2, y: -r.h * 0.55)
            var blade = Path()
            blade.move(to: CGPoint(x: -3.5, y: 0))
            blade.addQuadCurve(to: tip, control: CGPoint(x: mid.x - 2.5, y: mid.y))
            blade.addQuadCurve(to: CGPoint(x: 3.5, y: 0), control: CGPoint(x: mid.x + 2.5, y: mid.y))
            blade.closeSubpath()
            g.fill(blade, with: .color(i % 2 == 0 ? Ink.reed : Ink.reedLight))
            guard r.cat else { continue }
            // The cattail's head rides the curve at 80% of its height, along its tangent.
            let s = 0.8
            let at = CGPoint(x: 2 * s * (1 - s) * mid.x + s * s * tip.x, y: 2 * s * (1 - s) * mid.y + s * s * tip.y)
            let tan = CGPoint(x: 2 * (1 - s) * mid.x + 2 * s * (tip.x - mid.x), y: 2 * (1 - s) * mid.y + 2 * s * (tip.y - mid.y))
            var head = g
            head.translateBy(x: at.x, y: at.y)
            head.rotate(by: .radians(atan2(tan.y, tan.x) + .pi / 2))
            head.fill(Path(roundedRect: CGRect(x: -5, y: -17, width: 10, height: 34), cornerRadius: 5), with: .color(Ink.cattail))
        }
    }

    private func drawLilies(_ ctx: GraphicsContext) {
        for (i, l) in lilies.enumerated() {
            var g = ctx
            g.translateBy(x: l.x, y: l.y + wave(t, period: 2500, phase: seeded(i, salt: 61)))
            g.rotate(by: .degrees(1.5 * wave(t, period: 5000, phase: seeded(i, salt: 62))))
            g.fill(padShape(rx: l.rx, ry: l.ry, notch: l.notch).offsetBy(dx: 0, dy: 3), with: .color(Ink.padFarEdge))
            g.fill(padShape(rx: l.rx, ry: l.ry, notch: l.notch), with: .color(Ink.padFar))
            guard l.bud else { continue }
            // A lotus bud, swaying around its base.
            var b = g
            b.translateBy(x: 6, y: -2)
            b.rotate(by: .degrees(3 * wave(t, period: 2500, phase: 0.35)))
            for (dx, a, c) in [(-6.0, -22.0, Ink.lotusShade), (6.0, 22.0, Ink.lotusShade), (0.0, 0.0, Ink.lotus)] {
                var petal = b
                petal.translateBy(x: dx * 0.5, y: 0)
                petal.rotate(by: .degrees(a))
                petal.fill(Path(ellipseIn: CGRect(x: -7, y: -26, width: 14, height: 28)), with: .color(c))
            }
        }
    }

    /// A pad with its notch, as ONE outline (a polygon fine enough to read as a curve).
    private func padShape(rx: Double, ry: Double, notch: Double) -> Path {
        var pts = [CGPoint.zero]
        let n = 96
        for i in 0...n {
            let a = (notch + 14 + 332 * Double(i) / Double(n)) * .pi / 180
            pts.append(CGPoint(x: rx * cos(a), y: ry * sin(a)))
        }
        var p = Path()
        p.addLines(pts)
        p.closeSubpath()
        return p
    }

    // MARK: - The main pad and its ripples

    /// Rings leave the pad as it bobs; the hop sends out stronger ones.
    private func drawRipples(_ ctx: GraphicsContext, _ p: Pose) {
        var g = ctx
        g.translateBy(x: pad.x, y: pad.y + p.bob * 0.5)
        func ring(_ k: Double, _ alpha: Double, _ width: Double) {
            let rect = CGRect(x: -pad.rx * k, y: -pad.ry * k + 4, width: pad.rx * 2 * k, height: pad.ry * 2 * k)
            g.stroke(Path(ellipseIn: rect), with: .color(Ink.ripple.opacity(alpha)), lineWidth: width)
        }
        for i in 0..<2 {
            let q = loop(t, period: 2500, phase: Double(i) * 0.5)
            ring(1.04 + 0.5 * q, 0.35 * bell(q), 2)
        }
        for (at, strength) in [(beat.push, 0.5), (beat.down, 1.0), (beat.down + 240, 0.7)] {
            let q = (t - at) / 1800
            guard q > 0, q < 1 else { continue }
            ring(1.0 + 0.9 * seg(t, at, at + 1800), strength * 0.7 * (1 - q) * min(1, q * 10), 2.5)
        }
    }

    private func drawPad(_ ctx: GraphicsContext, _ p: Pose) {
        var g = ctx
        g.concatenate(padFrame(p))
        g.fill(Path(ellipseIn: CGRect(x: -pad.rx - 8, y: -pad.ry + 4, width: pad.rx * 2 + 16, height: pad.ry * 2 + 8)), with: .color(Ink.padWake))
        let shape = padShape(rx: pad.rx, ry: pad.ry, notch: pad.notch)
        g.fill(shape.offsetBy(dx: 0, dy: 6), with: .color(Ink.padEdge))
        g.fill(shape, with: .color(Ink.pad))
        var veins = g
        veins.clip(to: shape)
        var v = Path()
        for i in 0..<8 {
            let a = (pad.notch + 40 + 40 * Double(i)) * .pi / 180
            v.move(to: .zero)
            v.addLine(to: CGPoint(x: pad.rx * 0.92 * cos(a), y: pad.ry * 0.92 * sin(a)))
        }
        veins.stroke(v, with: .color(Ink.padVein), style: StrokeStyle(lineWidth: 2, lineCap: .round))
        // The frog's shadow on the pad shrinks as it rises.
        let sw = 260 * (1 - min(1, p.lift / 160))
        g.fill(Path(ellipseIn: CGRect(x: -sw / 2, y: -6 - sw * 0.11, width: sw, height: sw * 0.22)), with: .color(Ink.padShadow))
    }

    // MARK: - The frog

    private func drawFrog(_ ctx: GraphicsContext, _ p: Pose, bug: CGPoint) {
        var low = ctx
        low.concatenate(planted(p))
        drawLegs(low, p)

        var up = ctx
        up.concatenate(bodyFrame(p))
        let shape = bodyPath()
        up.fill(shape, with: .color(Ink.body))
        up.fill(Path(ellipseIn: CGRect(x: -62 + 8 * p.yaw, y: 10, width: 124, height: 58)), with: .color(Ink.belly))
        for (side, limb) in [(-1.0, p.armL), (1.0, p.armR)] {
            drawArm(up, side: side, limb)
        }

        var face = ctx
        face.concatenate(faceFrame(p))
        drawFace(face, p, bug: bug)

        // The firefly lights the face it sits on. The light is masked by the whole silhouette
        // (body and eye bumps, drawn separately into the mask), so it never stops at the seam.
        let on = landed(t)
        if on > 0 {
            var lit = up
            lit.clipToLayer { mask in
                mask.fill(shape, with: .color(.black))
                var head = mask
                head.translateBy(x: 0, y: -10)
                head.rotate(by: .degrees(p.head))
                head.translateBy(x: 0, y: 10)
                for side in [-1.0, 1.0] {
                    head.fill(bump(side, yaw: p.yaw), with: .color(.black))
                }
            }
            let c = bug.applying(bodyFrame(p).inverted())
            let glow = Gradient(colors: [Ink.glow.opacity(0.3 * on * heroGlow()), Ink.glow.opacity(0)])
            lit.fill(Path(ellipseIn: CGRect(x: c.x - 72, y: c.y - 72, width: 144, height: 144)),
                     with: .radialGradient(glow, center: c, startRadius: 0, endRadius: 72))
        }
    }

    /// Haunches fold at the sides and webbed feet rest on the pad. In the air the legs drop and
    /// the toes turn down: anything held up by nothing hangs.
    private func drawLegs(_ g: GraphicsContext, _ p: Pose) {
        for side in [-1.0, 1.0] {
            var h = g
            h.translateBy(x: side * 80, y: 50 + 10 * p.hang)
            h.rotate(by: .degrees(side * (24 - 18 * p.hang)))
            h.fill(Path(ellipseIn: CGRect(x: -38, y: -28, width: 76, height: 56)), with: .color(Ink.bodyShade))
        }
        for side in [-1.0, 1.0] {
            var shin = Path()
            shin.move(to: CGPoint(x: side * (86 - 6 * p.hang), y: 64 + 12 * p.hang))
            shin.addLine(to: CGPoint(x: side * (106 - 16 * p.hang), y: 72 + 26 * p.hang))
            g.stroke(shin, with: .color(Ink.bodyShade), style: StrokeStyle(lineWidth: 15, lineCap: .round))
        }
        for side in [-1.0, 1.0] {
            var f = g
            f.translateBy(x: side * (106 - 16 * p.hang), y: 72 + 26 * p.hang)
            var toes = Path()
            for spread in [-30.0, 0.0, 30.0] {
                let flat = side * (50 + spread)
                let hung = side * spread * 0.35
                let a = (flat + (hung - flat) * p.hang) * .pi / 180
                toes.move(to: .zero)
                toes.addLine(to: CGPoint(x: 19 * sin(a), y: 19 * cos(a)))
            }
            f.stroke(toes, with: .color(Ink.limb), style: StrokeStyle(lineWidth: 7, lineCap: .round))
            f.fill(Path(ellipseIn: CGRect(x: -9, y: -7, width: 18, height: 14)), with: .color(Ink.limb))
        }
    }

    private func drawArm(_ g: GraphicsContext, side: Double, _ limb: Arm) {
        let a = limb.a * .pi / 180, f = (limb.a + limb.e) * .pi / 180
        let from = CGPoint(x: side * arm.x, y: arm.y)
        let elbow = CGPoint(x: from.x + side * sin(a) * arm.upper, y: from.y + cos(a) * arm.upper)
        let hand = CGPoint(x: elbow.x + side * sin(f) * arm.fore, y: elbow.y + cos(f) * arm.fore)
        var bone = Path()
        bone.addLines([from, elbow, hand])
        g.stroke(bone, with: .color(Ink.limb), style: StrokeStyle(lineWidth: arm.w, lineCap: .round, lineJoin: .round))
        // Three fingers fan around the forearm's direction.
        var fingers = Path()
        for spread in [-0.55, 0.0, 0.55] {
            let d = f + spread
            fingers.move(to: hand)
            fingers.addLine(to: CGPoint(x: hand.x + side * sin(d) * arm.finger, y: hand.y + cos(d) * arm.finger))
        }
        g.stroke(fingers, with: .color(Ink.limb), style: StrokeStyle(lineWidth: 6, lineCap: .round))
    }

    private func drawFace(_ g: GraphicsContext, _ p: Pose, bug: CGPoint) {
        let ex = 14 * p.yaw
        for side in [-1.0, 1.0] {
            g.fill(bump(side, yaw: p.yaw), with: .color(Ink.body))
        }
        for side in [-1.0, 1.0] {
            g.fill(pill(cx: side * 72 + ex * 0.8, cy: -14, w: 26, h: 13), with: .color(Ink.blush))
        }
        // Live eyes: one Choreo per eye, because each pupil aims from its own place.
        let aim = gaze(p, bug: bug)
        let lid = track(t, Self.lid)
        let cheek = max(track(t, Self.cheek), 0.15 * lid)
        for side in [-1.0, 1.0] {
            let l = side < 0 ? aim.l : aim.r
            let choreo = Choreo(period: Self.loopMs, lookX: [Key(0, l.x)], lookY: [Key(0, l.y)], lid: [Key(0, lid)], cheek: [Key(0, cheek)])
            let geo = EyeGeometry(cx: side * eye.x + ex, cy: eye.y, w: eye.w, h: eye.h, pupilW: 14, pupilH: 18, pupilTop: 12, shine: 3)
            g.fill(pill(cx: geo.cx, cy: geo.cy, w: geo.w, h: geo.h), with: .color(.white))
            drawLiveEye(g, side: side, eye: geo, ink: Self.ink, choreo: choreo, t: t)
        }
        // The throat pumps all the time, as frogs' throats do, and puffs up for the ribbits.
        let puff = 0.16 + 0.05 * wave(t, period: 1250) + 0.84 * track(t, Self.ribbit)
        let sw = 70 * puff, sh = 50 * puff
        let sac = Path(ellipseIn: CGRect(x: 10 * p.yaw - sw / 2, y: 22 + 8 * puff - sh / 2, width: sw, height: sh))
        g.fill(sac, with: .color(Ink.sac))
        g.stroke(sac, with: .color(Ink.sacRim), lineWidth: 1 + 2.5 * puff)
        let nx = 20 * p.yaw
        for side in [-1.0, 1.0] {
            g.fill(Path(ellipseIn: CGRect(x: side * 9 + nx - 2.6, y: -21.5, width: 5.2, height: 3.6)), with: .color(Ink.line))
        }
        drawMouth(g, p)
    }

    /// A wide smile; it opens downward for the tongue, which shoots at where the firefly WAS.
    private func drawMouth(_ g: GraphicsContext, _ p: Pose) {
        let mx = 12 * p.yaw
        let m = track(t, Self.mouth)
        if m > 0.01 {
            var open = Path()
            open.move(to: CGPoint(x: mx - 40, y: 7.9))
            open.addQuadCurve(to: CGPoint(x: mx + 40, y: 7.9), control: CGPoint(x: mx, y: 16))
            open.addQuadCurve(to: CGPoint(x: mx - 40, y: 7.9), control: CGPoint(x: mx, y: 16 + 50 * m))
            open.closeSubpath()
            g.fill(open, with: .color(Ink.mouth))
            let depth = 12 + 25 * m
            g.fill(Path(ellipseIn: CGRect(x: mx - 16, y: depth - 9 * m, width: 32, height: 12 * m)), with: .color(Ink.tongue))
        }
        let e = tongue(t)
        if e > 0 {
            let from = CGPoint(x: mx, y: 18)
            let target = flyFree(beat.snap).applying(faceFrame(p).inverted())
            let tip = CGPoint(x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e)
            var lash = Path()
            lash.move(to: from)
            lash.addLine(to: tip)
            g.stroke(lash, with: .color(Ink.tongue), style: StrokeStyle(lineWidth: 11, lineCap: .round))
            g.fill(Path(ellipseIn: CGRect(x: tip.x - 9, y: tip.y - 9, width: 18, height: 18)), with: .color(Ink.tongue))
        }
        // The lick: the tip pokes out at one corner, sweeps to the other and goes back in.
        let lick = seg(t, 9150, 9230) * (1 - seg(t, 9470, 9560, easeOut: false))
        if lick > 0 {
            let x = mx - 28 + 56 * seg(t, 9200, 9470, easeOut: false)
            g.fill(Path(ellipseIn: CGRect(x: x - 13, y: 10, width: 26, height: 8 + 14 * lick)), with: .color(Ink.tongue))
        }
        var smile = Path()
        smile.move(to: CGPoint(x: mx - 56, y: 4))
        smile.addQuadCurve(to: CGPoint(x: mx + 56, y: 4), control: CGPoint(x: mx, y: 20))
        g.stroke(smile, with: .color(Ink.line), style: StrokeStyle(lineWidth: 5, lineCap: .round))
    }

    /// The tongue: out fast with ease-out, held at full reach so the miss reads, back with ease-in-out.
    private func tongue(_ t: Double) -> Double {
        guard t > beat.snap, t < beat.back else { return 0 }
        if t < beat.reach { return seg(t, beat.snap, beat.reach) }
        if t < beat.retract { return 1 }
        return 1 - seg(t, beat.retract, beat.back, easeOut: false)
    }

    /// An eye bump, in the face's frame; it slides with the turn like the eye on it.
    private func bump(_ side: Double, yaw: Double) -> Path {
        let c = CGPoint(x: side * eye.x + 14 * yaw, y: eye.y + 4)
        return Path(ellipseIn: CGRect(x: c.x - eye.bump, y: c.y - eye.bump, width: eye.bump * 2, height: eye.bump * 2))
    }

    private func bodyPath() -> Path {
        var p = Path()
        p.move(to: CGPoint(x: 0, y: -64))
        p.addCurve(to: CGPoint(x: 104, y: 34), control1: CGPoint(x: 62, y: -64), control2: CGPoint(x: 104, y: -18))
        p.addCurve(to: CGPoint(x: 58, y: 76), control1: CGPoint(x: 104, y: 62), control2: CGPoint(x: 86, y: 76))
        p.addLine(to: CGPoint(x: -58, y: 76))
        p.addCurve(to: CGPoint(x: -104, y: 34), control1: CGPoint(x: -86, y: 76), control2: CGPoint(x: -104, y: 62))
        p.addCurve(to: CGPoint(x: 0, y: -64), control1: CGPoint(x: -104, y: -18), control2: CGPoint(x: -62, y: -64))
        p.closeSubpath()
        return p
    }

    // MARK: - The firefly

    /// Its light: steady while it flies, slow pulses while it sits.
    private func heroGlow() -> Double {
        let flying = 0.85 + 0.15 * wave(t, period: 1250)
        let sitting = 0.55 + 0.45 * (0.5 + 0.5 * wave(t, period: 1250, phase: 0.25))
        let w = landed(t)
        return flying + (sitting - flying) * w
    }

    private func drawHeroFly(_ ctx: GraphicsContext, at c: CGPoint) {
        let w = landed(t)
        let ahead = flyFree(t + 16), behind = flyFree(t - 16)
        let tilt = max(-30, min(30, (ahead.x - behind.x) * 1.5)) * (1 - w)
        let glow = heroGlow()
        let r = 22 * fly
        ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)),
                 with: .radialGradient(Gradient(colors: [Ink.glow.opacity(0.55 * glow), Ink.glow.opacity(0)]), center: c, startRadius: 0, endRadius: r))
        var g = ctx
        g.translateBy(x: c.x, y: c.y)
        g.rotate(by: .degrees(tilt))
        g.scaleBy(x: fly, y: fly)
        // Wings beat fast in flight and fold down along the body when it sits.
        for side in [-1.0, 1.0] {
            let flapping = -side * (20 + 35 * wave(t, period: 120, phase: side > 0 ? 0 : 0.05))
            let folded = side * 65
            var wing = g
            wing.translateBy(x: side * 1.5, y: -3)
            wing.rotate(by: .degrees(flapping + (folded - flapping) * w))
            wing.fill(Path(ellipseIn: CGRect(x: side > 0 ? 0 : -13, y: -4, width: 13, height: 8)), with: .color(Ink.flyWing.opacity(0.75)))
        }
        g.fill(Path(ellipseIn: CGRect(x: -4.5, y: -1, width: 9, height: 11)), with: .color(mix(Ink.glowDim, Ink.glowCore, glow)))
        g.fill(Path(ellipseIn: CGRect(x: -3.5, y: -7, width: 7, height: 7)), with: .color(Ink.flyBody))
        var feelers = Path()
        feelers.move(to: CGPoint(x: -1.5, y: -6))
        feelers.addQuadCurve(to: CGPoint(x: -5, y: -12), control: CGPoint(x: -2, y: -11))
        feelers.move(to: CGPoint(x: 1.5, y: -6))
        feelers.addQuadCurve(to: CGPoint(x: 5, y: -12), control: CGPoint(x: 2, y: -11))
        g.stroke(feelers, with: .color(Ink.flyBody), style: StrokeStyle(lineWidth: 1.2, lineCap: .round))
    }

    // MARK: - Shapes and colours

    private func fourPointStar(r: Double) -> Path {
        var p = Path()
        let k = r * 0.28
        p.move(to: CGPoint(x: 0, y: -r))
        p.addQuadCurve(to: CGPoint(x: r, y: 0), control: CGPoint(x: k, y: -k))
        p.addQuadCurve(to: CGPoint(x: 0, y: r), control: CGPoint(x: k, y: k))
        p.addQuadCurve(to: CGPoint(x: -r, y: 0), control: CGPoint(x: -k, y: k))
        p.addQuadCurve(to: CGPoint(x: 0, y: -r), control: CGPoint(x: -k, y: -k))
        p.closeSubpath()
        return p
    }

    private func mix(_ a: UInt32, _ b: UInt32, _ k: Double) -> Color {
        func c(_ v: UInt32, _ s: UInt32) -> Double { Double((v >> s) & 0xFF) / 255 }
        let k = min(1, max(0, k))
        return Color(red: c(a, 16) + (c(b, 16) - c(a, 16)) * k, green: c(a, 8) + (c(b, 8) - c(a, 8)) * k,
                     blue: c(a, 0) + (c(b, 0) - c(a, 0)) * k)
    }
}
