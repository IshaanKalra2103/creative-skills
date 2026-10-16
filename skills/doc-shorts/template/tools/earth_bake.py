"""Bake a plate for the `earth` shot: a cyan "network" Earth at night seen from orbit, with
glowing dotted coastlines, city lights, orange great-circle arcs between hubs, ring icons, a
dotted graticule, the atmosphere limb and a faint network in the sky. Everything is drawn
from Natural Earth (public domain) through a perspective camera.

The plate covers ref px x -90..810, y -160..1440 at 2 px per ref px (the shot rolls it up to
~9 degrees, so it overscans the 720x1280 frame). That is the `earth` kind's default
`plate_rect`.

usage (from the template folder):
  uv run --with numpy --with scipy --with pillow python tools/earth_bake.py \
      --lon 10 --lat 50 --out path/to/spec/assets/earth_europe.png
  ... --preset google-na   reproduces the reference reel's plate (camera fitted to its
                           stock footage over North America, its limb, hubs and rings)
  ... --cam <8 values>     a camera fitted to other footage with tools/earth_landmarks.py

Camera: it looks at (--lon, --lat) from a point offset by (--cam-dlon, --cam-dlat) degrees,
--dist Earth radii from the centre, rolled by --roll degrees. The defaults sit the camera
24.7 degrees south of the target with a 5 degree roll, which puts the true limb across the top
of the frame like the reference (y ~250 / 205 / 278 ref px at the left / centre / right edge;
the reel's arc was 250 / 200 / 300) and fills the lower two thirds with the region. Works
at any latitude short of the poles.

Natural Earth layers download on first use into --data (default ~/.cache/doc-shorts/natural-earth).
"""
import argparse
import json
import pathlib
import urllib.request

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SS = 2.0                      # output px per ref px
X0, Y0, X1, Y1 = -90, -160, 810, 1440
W, H = int((X1 - X0) * SS), int((Y1 - Y0) * SS)
NE_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/{}.geojson"
LAYERS = ["ne_50m_land", "ne_50m_lakes", "ne_50m_coastline", "ne_10m_populated_places_simple"]

# The reference reel's camera, fitted to 12 landmarks of its stock footage (tools/earth_landmarks.py):
# camera lon/lat, distance, target lon/lat, roll, focal (ref px), vertical aspect.
NA_CAM = [-131.8195, 27.2140, 8.3314, -98.8153, 46.5299, 17.7062, 8000.0, 0.8443]
NA_HUBS = [(-122.4, 37.8), (-118.2, 34.0), (-87.6, 41.9), (-74.0, 40.7), (-95.4, 29.8), (-104.9, 39.7),
           (-123.1, 49.3), (-79.4, 43.7), (-99.1, 19.4), (-80.2, 25.8), (-112.1, 33.4), (-97.5, 35.5),
           (-114.1, 51.0), (-113.5, 53.5), (-149.9, 61.2)]
NA_PAIRS = [(0, 3), (1, 7), (6, 2), (4, 3), (5, 8), (12, 9), (14, 4), (10, 7), (13, 1), (6, 9), (2, 8), (11, 0)]
NA_RINGS = [(-118.2, 34.0, 26), (-104.9, 39.7, 20), (-87.6, 41.9, 22), (-95.4, 29.8, 26), (-99.1, 19.4, 30),
            (-122.3, 47.6, 22), (-114.1, 51.0, 30), (-84.4, 33.7, 18), (-90.2, 38.6, 16)]
# The reel's atmosphere arc isn't where a true projection puts the horizon (the stock globe
# isn't a real camera), so the preset uses a screen circle through these ref px points.
NA_LIMB = [(0, 250), (330, 200), (720, 300)]


def xyz(lon, lat):
    lo, la = np.radians(lon), np.radians(lat)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], -1)


class Camera:
    def __init__(self, cam):
        lon_c, lat_c, D, lon_t, lat_t, roll, f, asp = cam
        self.C = D * xyz(lon_c, lat_c)
        T = xyz(lon_t, lat_t)
        fwd = T - self.C
        fwd /= np.linalg.norm(fwd)
        right = np.cross(fwd, [0, 0, 1.0])
        right /= np.linalg.norm(right)
        up = np.cross(right, fwd)
        r = np.radians(roll)
        self.right, self.up = right * np.cos(r) + up * np.sin(r), -right * np.sin(r) + up * np.cos(r)
        self.fwd, self.f, self.asp, self.D = fwd, f, asp, D

    def to_px(self, lon, lat):
        """lon/lat (deg arrays) -> output pixel coords and visibility (front hemisphere)."""
        P = xyz(np.asarray(lon), np.asarray(lat))
        return self.project(P) + ((P @ self.C) > 1.0,)

    def project(self, P):
        v = P - self.C
        z = v @ self.fwd
        x = 360 + self.f * (v @ self.right) / z
        y = 640 - self.asp * self.f * (v @ self.up) / z
        return (x - X0) * SS, (y - Y0) * SS

    def rays(self):
        """Per output pixel: hit mask, signed limb distance (ref px, >0 in space), n.v."""
        xs = (np.arange(W) + 0.5) / SS + X0
        ys = (np.arange(H) + 0.5) / SS + Y0
        X, Y = np.meshgrid(xs, ys)
        dx = (X - 360) / self.f
        dy = -(Y - 640) / (self.f * self.asp)
        d = self.fwd[None, None, :] + dx[..., None] * self.right + dy[..., None] * self.up
        d /= np.linalg.norm(d, axis=-1, keepdims=True)
        b = d @ self.C
        c = self.C @ self.C - 1.0
        disc = b * b - c
        hit = disc > 0
        t = -b - np.sqrt(np.maximum(disc, 0))
        P = self.C + t[..., None] * d
        ndotv = np.abs((P * -d).sum(-1))
        # miss distance of the ray from the sphere (radii), converted to ref px at the limb
        miss = np.sqrt(np.maximum(c - b * b + 1.0, 0)) - 1.0
        miss_px = np.where(hit, -np.sqrt(np.maximum(disc, 0)), miss) * self.f / np.sqrt(self.D ** 2 - 1)
        return hit, miss_px, ndotv


def fetch(data):
    data.mkdir(parents=True, exist_ok=True)
    for name in LAYERS:
        p = data / f"{name}.geojson"
        if not p.exists():
            print("downloading", name)
            urllib.request.urlretrieve(NE_URL.format(name), p)


def polys(data, name):
    g = json.load(open(data / f"{name}.geojson"))
    out = []
    for f in g["features"]:
        geom = f["geometry"]
        cs = geom["coordinates"]
        if geom["type"] == "Polygon":
            out += [cs[0]]
        elif geom["type"] == "MultiPolygon":
            out += [p[0] for p in cs]
        elif geom["type"] == "LineString":
            out += [cs]
        elif geom["type"] == "MultiLineString":
            out += cs
    return [np.array(p, float) for p in out]


def in_region(r, region):
    if region is None:
        return True
    lo0, lo1, la0 = region
    return not (r[:, 0].max() < lo0 or r[:, 0].min() > lo1 or r[:, 1].max() < la0)


def screen_mask(cam, rings, region):
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    for r in rings:
        if not in_region(r, region):
            continue
        x, y, vis = cam.to_px(r[:, 0], r[:, 1])
        if vis.mean() < 0.5:
            continue
        d.polygon(list(zip(x, y)), fill=255)
    return np.asarray(im).astype(float) / 255


def lines_layer(cam, rings, width, region, dotted=0):
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    for r in rings:
        if not in_region(r, region):
            continue
        # resample densely so the dotted pattern is even
        seg = np.hypot(*np.diff(r, axis=0).T)
        n = np.maximum(1, (seg / 0.05).astype(int))
        pts = np.vstack([p + (q - p) * np.linspace(0, 1, k, endpoint=False)[:, None] for p, q, k in zip(r[:-1], r[1:], n)])
        x, y, vis = cam.to_px(pts[:, 0], pts[:, 1])
        if not vis.any():
            continue
        if dotted:
            for i in range(0, len(x), dotted):
                if vis[i]:
                    d.ellipse((x[i] - width, y[i] - width, x[i] + width, y[i] + width), fill=255)
        else:
            run = []
            for xi, yi, vi in zip(x, y, vis):
                if vi:
                    run.append((xi, yi))
                elif len(run) > 1:
                    d.line(run, fill=255, width=int(width)); run = []
            if len(run) > 1:
                d.line(run, fill=255, width=int(width))
    return np.asarray(im).astype(float) / 255


def rng(seed):
    return np.random.default_rng(seed)


def circle_limb(pts):
    (x1, y1), (x2, y2), (x3, y3) = pts
    A = np.array([[x2 - x1, y2 - y1], [x3 - x1, y3 - y1]], float)
    b = 0.5 * np.array([x2**2 - x1**2 + y2**2 - y1**2, x3**2 - x1**2 + y3**2 - y1**2])
    cx, cy = np.linalg.solve(A, b)
    xs_ = (np.arange(W) + 0.5) / SS + X0
    ys_ = (np.arange(H) + 0.5) / SS + Y0
    LX, LY = np.meshgrid(xs_, ys_)
    return np.hypot(LX - cx, LY - cy) - np.hypot(x1 - cx, y1 - cy)


def on_screen(x, y, vis, margin=40):
    return vis & (x > -margin) & (x < W + margin) & (y > -margin) & (y < H + margin)


def auto_hubs(cam, places, n_hubs, n_rings, seed):
    """The biggest cities on screen become hubs (arcs) and ring icons."""
    x, y, vis = cam.to_px(places[:, 0], places[:, 1])
    ok = on_screen(x, y, vis, -60) & (y > H * 0.12)
    cand = places[ok]
    order = np.argsort(-cand[:, 2])
    picked = []
    for i in order:
        lo, la = cand[i, 0], cand[i, 1]
        if all(np.hypot(lo - a, la - b) > 4.0 for a, b in picked):
            picked.append((lo, la))
        if len(picked) >= n_hubs + n_rings:
            break
    hubs = picked[:n_hubs]
    r = rng(seed)
    pairs = []
    while len(pairs) < min(12, len(hubs) * (len(hubs) - 1) // 2) and len(hubs) > 1:
        a, b = r.choice(len(hubs), 2, replace=False)
        if (a, b) not in pairs and (b, a) not in pairs:
            pairs.append((int(a), int(b)))
    rings = [(lo, la, float(r.uniform(16, 30))) for lo, la in picked[:min(len(picked), n_rings)]]
    return hubs, pairs, rings


def bake(args):
    data = pathlib.Path(args.data).expanduser()
    fetch(data)
    preset = args.preset == "google-na"
    if preset:
        cam = Camera(NA_CAM)
        region = (-175, -20, 0)
    elif args.cam:
        cam = Camera(args.cam)
        region = None
    else:
        cam = Camera([args.lon + args.cam_dlon, args.lat + args.cam_dlat, args.dist, args.lon, args.lat, args.roll, args.focal, args.aspect])
        region = None

    hit, miss, ndotv = cam.rays()
    if preset:
        miss = circle_limb(NA_LIMB)
        hit = hit & (miss < 0)
    inside = np.clip(-miss / 30.0, 0, 1)
    img = np.zeros((H, W, 3))

    # space: dark navy, a little lighter at the top
    yy = np.linspace(0, 1, H)[:, None]
    img[:] = np.array([0.02, 0.06, 0.09]) + np.array([0.02, 0.05, 0.07]) * (1 - yy)[..., None]

    # sky network: scattered bokeh nodes joined by faint lines, above the limb
    r = rng(7)
    sky = Image.new("L", (W, H), 0); sd = ImageDraw.Draw(sky)
    nodes = np.column_stack([r.uniform(0, W, 70), r.uniform(0, H * 0.32, 70)])
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            if np.hypot(*(nodes[i] - nodes[j])) < 260 and r.random() < 0.35:
                sd.line([tuple(nodes[i]), tuple(nodes[j])], fill=90, width=2)
    for x, y in nodes:
        rr = r.uniform(3, 14)
        sd.ellipse((x - rr, y - rr, x + rr, y + rr), fill=int(r.uniform(120, 255)))
    skyf = ndimage.gaussian_filter(np.asarray(sky).astype(float) / 255, 7.0) * 1.8
    img += skyf[..., None] * np.array([0.25, 0.75, 0.85]) * (~hit)[..., None]

    # globe surface: ocean deep teal, land slate blue with a fine relief noise
    land = screen_mask(cam, polys(data, "ne_50m_land"), region)
    lakes = screen_mask(cam, polys(data, "ne_50m_lakes"), region)
    land = np.clip(land - lakes, 0, 1)
    noise = ndimage.gaussian_filter(rng(3).normal(0, 1, (H, W)), 1.2)
    noise2 = ndimage.gaussian_filter(rng(4).normal(0, 1, (H, W)), 9)
    ocean = np.array([0.03, 0.11, 0.16])
    landc = np.array([0.09, 0.19, 0.26])
    surf = ocean[None, None] * (1 + 0.15 * noise2[..., None]) * (1 - land[..., None]) \
        + landc[None, None] * (1 + 0.18 * noise[..., None] + 0.2 * noise2[..., None]) * land[..., None]
    shade = (np.clip(0.55 + 0.6 * ndotv, 0, 1.1) * (0.35 + 0.65 * inside))[..., None]
    img = np.where(hit[..., None], surf * shade, img)

    # city lights: populated places, dense dots + soft glows, cyan
    g = json.load(open(data / "ne_10m_populated_places_simple.geojson"))
    pl = np.array([(f["properties"]["longitude"], f["properties"]["latitude"], f["properties"]["pop_max"]) for f in g["features"]])
    if preset:
        m = (pl[:, 0] > -170) & (pl[:, 0] < -50) & (pl[:, 1] > 5) & (pl[:, 1] < 75)
    else:
        x, y, vis = cam.to_px(pl[:, 0], pl[:, 1])
        m = on_screen(x, y, vis, 200)
    pl = pl[m]
    r = rng(11)
    extra = []
    for lo, la, pop in pl:
        k = int(np.clip(np.log10(max(pop, 1000)) * 3 - 9, 1, 14))
        sp = 0.4 + 0.25 * np.log10(max(pop, 1000)) / 7
        extra.append(np.column_stack([lo + r.normal(0, sp, k), la + r.normal(0, sp * 0.8, k), np.full(k, 2000.0)]))
    allp = np.vstack([pl] + extra) if len(pl) else np.zeros((0, 3))
    x, y, vis = cam.to_px(allp[:, 0], allp[:, 1])
    dots = np.zeros((H, W)); glow = np.zeros((H, W))
    for xi, yi, vi, pop in zip(x, y, vis, allp[:, 2]):
        if not vi or not (0 <= xi < W and 0 <= yi < H):
            continue
        a = np.clip((np.log10(max(pop, 1000)) - 3.0) / 4.0, 0.15, 1.0)
        dots[int(yi), int(xi)] += 0.6 + a
        if pop > 4e5:
            glow[int(yi), int(xi)] += a * 3
    lights = ndimage.gaussian_filter(dots, 1.4) * 9 + ndimage.gaussian_filter(dots, 6) * 30 + ndimage.gaussian_filter(glow, 14) * 260
    lights *= (land + 0.25) * inside * 0.55
    img += np.clip(lights, 0, 1.6)[..., None] * np.array([0.35, 0.85, 1.0])

    # coastlines and lake shores: dotted glowing cyan
    coast = lines_layer(cam, polys(data, "ne_50m_coastline"), 1.1, region, dotted=4) \
        + lines_layer(cam, polys(data, "ne_50m_lakes"), 1.0, region, dotted=4)
    coast = np.clip(coast, 0, 1)
    cg = ndimage.gaussian_filter(coast, 1.0) * 1.1 + ndimage.gaussian_filter(coast, 6) * 1.4
    img += (np.clip(cg, 0, 1.5) * inside)[..., None] * np.array([0.40, 0.88, 1.0])

    # graticule: faint dotted lines every 15 degrees
    grat = []
    if preset:
        for lo in range(-180, 0, 15):
            grat.append(np.column_stack([np.full(200, lo), np.linspace(-10, 85, 200)]))
        for la in range(0, 90, 15):
            grat.append(np.column_stack([np.linspace(-175, -20, 400), np.full(400, la)]))
    else:
        for lo in range(-180, 180, 15):
            grat.append(np.column_stack([np.full(400, lo), np.linspace(-85, 85, 400)]))
        for la in range(-75, 90, 15):
            grat.append(np.column_stack([np.linspace(-180, 180, 900), np.full(900, la)]))
    gl = lines_layer(cam, grat, 1.0, region, dotted=9)
    img += ndimage.gaussian_filter(gl, 0.8)[..., None] * np.array([0.2, 0.5, 0.6]) * 0.9

    # orange arcs (great circles) between hubs, with glowing nodes
    if preset:
        hubs, pairs, rings = NA_HUBS, NA_PAIRS, NA_RINGS
    else:
        allpl = np.array([(f["properties"]["longitude"], f["properties"]["latitude"], f["properties"]["pop_max"]) for f in g["features"]])
        hubs, pairs, rings = auto_hubs(cam, allpl, args.hubs, args.rings, args.seed)
    arcs = Image.new("L", (W, H), 0); ad = ImageDraw.Draw(arcs)
    nodes = Image.new("L", (W, H), 0); nd = ImageDraw.Draw(nodes)
    for a, b in pairs:
        pa, pb = xyz(*hubs[a]), xyz(*hubs[b])
        om = np.arccos(np.clip(pa @ pb, -1, 1))
        if om < 1e-4:
            continue
        t = np.linspace(-1.2, 2.2, 600)
        pts = (np.sin((1 - t) * om)[:, None] * pa + np.sin(t * om)[:, None] * pb) / np.sin(om)
        pts *= (1 + 0.06 * np.sin(np.clip(t, 0, 1) * np.pi))[:, None]  # lift the arc off the surface
        v = pts - cam.C
        z = v @ cam.fwd
        px = (360 + cam.f * (v @ cam.right) / z - X0) * SS
        py = (640 - cam.asp * cam.f * (v @ cam.up) / z - Y0) * SS
        ok = z > 0
        ad.line(list(zip(px[ok], py[ok])), fill=170, width=2)
    for lo, la in hubs:
        x, y, vis = cam.to_px(np.array([lo]), np.array([la]))
        if vis[0]:
            nd.ellipse((x[0] - 7, y[0] - 7, x[0] + 7, y[0] + 7), fill=255)
            nd.ellipse((x[0] - 16, y[0] - 16, x[0] + 16, y[0] + 16), outline=150, width=2)
            nd.rectangle((x[0] + 22, y[0] - 4, x[0] + 70, y[0] + 4), fill=110)  # tiny label
    arcf = np.asarray(arcs).astype(float) / 255
    nodef = np.asarray(nodes).astype(float) / 255
    orange = np.array([1.0, 0.55, 0.25])
    img += (ndimage.gaussian_filter(arcf, 0.8) * 0.9 + ndimage.gaussian_filter(arcf, 4) * 0.8)[..., None] * orange
    img += (ndimage.gaussian_filter(nodef, 1.0) + ndimage.gaussian_filter(nodef, 7) * 1.5)[..., None] * orange

    # atmosphere: bright cyan rim just outside the limb plus a soft halo; warm on the left
    rim = np.exp(-((miss + 18.0) / 22.0) ** 2)
    halo = np.exp(-np.maximum(miss, 0) / 45.0) * (miss > -10)
    inner = np.exp(-np.maximum(-miss, 0) / 220.0) * (miss < 0)
    xs = (np.arange(W)[None, :] / SS + X0) / 720.0
    warm = np.clip(1.2 - xs * 2.2, 0, 1)
    atm = np.array([0.35, 0.85, 1.0])[None, None] * (1 - warm[..., None] * 0.7) + np.array([1.0, 0.62, 0.40])[None, None] * warm[..., None] * 0.7
    img += atm * (rim * 0.75 + halo * 0.45 + inner * 0.28)[..., None]
    # peach glow above the limb on the left
    peach = np.exp(-((miss - 25.0) / 30.0) ** 2) * np.clip(1.0 - xs * 1.6, 0, 1)
    img += peach[..., None] * np.array([1.0, 0.62, 0.42]) * 0.55

    # cyan ring icons over a few cities
    ring = Image.new("L", (W, H), 0); rd = ImageDraw.Draw(ring)
    for lo, la, rr in rings:
        x, y, vis = cam.to_px(np.array([lo]), np.array([la]))
        if vis[0]:
            x, y = x[0], y[0]
            rd.ellipse((x - rr * SS, y - rr * SS, x + rr * SS, y + rr * SS), outline=150, width=3)
            rd.ellipse((x - rr * 0.45 * SS, y - rr * 0.45 * SS, x + rr * 0.45 * SS, y + rr * 0.45 * SS), fill=230)
    ringf = np.asarray(ring).astype(float) / 255
    img += (ndimage.gaussian_filter(ringf, 1.2) * 0.8 + ndimage.gaussian_filter(ringf, 8) * 0.9)[..., None] * np.array([0.4, 0.85, 1.0])

    # grade toward the reference: dimmer globe, teal haze in the sky, dark bottom-left corner
    img *= 0.72
    sky_haze = np.clip(miss / 60.0, 0, 1) * np.exp(-np.maximum(miss - 60, 0) / 500.0)
    img += sky_haze[..., None] * np.array([0.02, 0.17, 0.23])
    cx_ = np.clip((xs - 0.05) / 0.45, 0, 1)
    cy_ = np.clip(((np.arange(H)[:, None] / SS + Y0) / 1280.0 - 0.72) / 0.25, 0, 1)
    img *= (1 - 0.75 * (1 - cx_) * cy_)[..., None]

    # overall: soft, a little bloom
    bloom = np.stack([ndimage.gaussian_filter(np.clip(img[..., c] - 0.5, 0, None), 10) for c in range(3)], -1)
    img = img + bloom * 0.6
    img = np.stack([ndimage.gaussian_filter(img[..., c], 1.3) for c in range(3)], -1)
    out = np.clip(img, 0, 1) ** (1 / 1.05)
    pathlib.Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(args.out)
    print("wrote", args.out, W, H)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", default="assets/earth_plate.png")
    ap.add_argument("--data", default="~/.cache/doc-shorts/natural-earth")
    ap.add_argument("--preset", choices=["google-na"], help="the reference reel's exact plate")
    ap.add_argument("--lon", type=float, default=NA_CAM[3], help="target longitude (frame centre region)")
    ap.add_argument("--lat", type=float, default=NA_CAM[4], help="target latitude")
    ap.add_argument("--cam-dlon", type=float, default=0.0, help="camera offset from the target, degrees")
    ap.add_argument("--cam-dlat", type=float, default=-24.7, help="negative = camera south of the target (limb at the top)")
    ap.add_argument("--dist", type=float, default=NA_CAM[2], help="camera distance from the centre, Earth radii")
    ap.add_argument("--roll", type=float, default=5.0, help="camera roll, degrees (+ = right side of the limb lower)")
    ap.add_argument("--focal", type=float, default=NA_CAM[6], help="focal length, ref px")
    ap.add_argument("--aspect", type=float, default=NA_CAM[7], help="vertical squash of the reference footage")
    ap.add_argument("--cam", type=float, nargs=8, metavar="V",
                    help="a fitted camera from tools/earth_landmarks.py: lon_c lat_c dist lon_t lat_t roll focal aspect")
    ap.add_argument("--hubs", type=int, default=15, help="biggest on-screen cities joined by arcs")
    ap.add_argument("--rings", type=int, default=9, help="cities marked with ring icons")
    ap.add_argument("--seed", type=int, default=5, help="arc pairing")
    bake(ap.parse_args())


if __name__ == "__main__":
    main()
