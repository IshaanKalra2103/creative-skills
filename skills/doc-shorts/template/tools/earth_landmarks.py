"""Fit the `earth` plate camera to stock footage you want to match: pick a few landmarks on a
reference frame (lon/lat -> pixel in the 720x1280 frame), fit a perspective camera, and get
the `--cam` arguments for tools/earth_bake.py.

usage: uv run --with numpy --with scipy --with pillow python tools/earth_landmarks.py \
           [landmarks.json] [--frame ref.png --overlay out.png]
landmarks.json: [[lon, lat, x, y], ...]  (6+ points spread over the frame; coast features
such as capes, bay corners and river deltas are easy to read). Without a file it fits the
reference reel's 12 North America landmarks (the camera behind --preset google-na).
--overlay draws the fitted coastlines (red) and the landmarks (yellow) over --frame.
"""
import argparse
import json
import pathlib

import numpy as np
from scipy import optimize

# The reel's landmarks, read off its tick-77 frame with a 60 px grid.
REEL = [
    (-79.5, 51.2, 505, 545),   # James Bay, south tip
    (-94.2, 58.8, 365, 470),   # Churchill, Hudson Bay west shore
    (-89.2, 29.1, 500, 885),   # Mississippi delta
    (-97.2, 25.9, 400, 960),   # Brownsville (Texas/Mexico coast)
    (-87.0, 21.5, 540, 1030),  # Yucatan, north tip
    (-94.5, 18.5, 420, 1060),  # Bay of Campeche, SW corner
    (-81.0, 25.2, 605, 960),   # Florida, south tip
    (-122.5, 47.5, 60, 565),   # Puget Sound
    (-122.5, 37.8, 75, 790),   # San Francisco
    (-109.9, 22.9, 200, 990),  # Baja, south tip
    (-75.5, 35.2, 640, 800),   # Cape Hatteras
    (-63.5, 44.6, 650, 620),   # Nova Scotia
]


def xyz(lon, lat):
    lo, la = np.radians(lon), np.radians(lat)
    return np.array([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)])


def camera(p):
    lon_c, lat_c, D, lon_t, lat_t, roll, f, asp = p
    C = D * xyz(lon_c, lat_c)
    fwd = xyz(lon_t, lat_t) - C
    fwd /= np.linalg.norm(fwd)
    right = np.cross(fwd, [0, 0, 1.0])
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    r = np.radians(roll)
    return C, fwd, right * np.cos(r) + up * np.sin(r), -right * np.sin(r) + up * np.cos(r), f, asp


def proj(p, P):
    C, fwd, right, up, f, asp = camera(p)
    v = P - C
    z = v @ fwd
    return 360 + f * (v @ right) / z, 640 - asp * f * (v @ up) / z


def fit(lm):
    lon0 = float(np.mean([m[0] for m in lm]))
    lat0 = float(np.mean([m[1] for m in lm]))

    def resid(p):
        out = []
        for lon, lat, x, y in lm:
            X, Y = proj(p, xyz(lon, lat))
            out += [X - x, Y - y]
        return np.array(out)

    best = None
    for dlon in (-30, 0, 30):
        for dlat in (-30, -15, 0):
            for D in (1.6, 2.5, 4.0, 8.0):
                p0 = [lon0 + dlon, lat0 + dlat, D, lon0, lat0, 0, 900, 1.0]
                lo = [lon0 - 90, -89, 1.05, lon0 - 60, -89, -60, 100, 0.5]
                hi = [lon0 + 90, 89, 20, lon0 + 60, 89, 60, 8000, 3.0]
                r = optimize.least_squares(resid, p0, bounds=(lo, hi))
                if best is None or r.cost < best.cost:
                    best = r
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("landmarks", nargs="?")
    ap.add_argument("--frame")
    ap.add_argument("--overlay")
    ap.add_argument("--data", default="~/.cache/doc-shorts/natural-earth")
    a = ap.parse_args()
    lm = [tuple(r) for r in json.load(open(a.landmarks))] if a.landmarks else REEL
    best = fit(lm)
    p = best.x
    print("rms px %.1f" % np.sqrt(np.mean(best.fun ** 2)))
    for i, (lon, lat, x, y) in enumerate(lm):
        print("  %-7.1f %-6.1f at (%d,%d)  err (%.0f,%.0f)" % (lon, lat, x, y, best.fun[2 * i], best.fun[2 * i + 1]))
    print("--cam " + " ".join("%.4f" % v for v in p))
    if a.frame and a.overlay:
        from PIL import Image, ImageDraw
        g = json.load(open(pathlib.Path(a.data).expanduser() / "ne_50m_coastline.geojson"))
        im = Image.open(a.frame).convert("RGB").resize((720, 1280))
        d = ImageDraw.Draw(im)
        C = camera(p)[0]
        for f in g["features"]:
            cs = f["geometry"]["coordinates"]
            lines = cs if f["geometry"]["type"] == "MultiLineString" else [cs]
            for line in lines:
                for lon, lat in line:
                    P = xyz(lon, lat)
                    if P @ C < 1.0:
                        continue
                    X, Y = proj(p, P)
                    if 0 <= X < 720 and 0 <= Y < 1280:
                        d.point((X, Y), fill=(255, 40, 40))
        for lon, lat, x, y in lm:
            d.ellipse((x - 5, y - 5, x + 5, y + 5), outline=(255, 255, 0))
        im.save(a.overlay)
        print("wrote", a.overlay)


if __name__ == "__main__":
    main()
