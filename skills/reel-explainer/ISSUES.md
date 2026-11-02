# Open issues

## 3D models still aren't used properly

The template has moved to real models (a scanned head, Apple's iPhone 17 AR model, three.js, one continuous camera), but it still doesn't look like the reference reels (#06, #12, #19 in `~/Documents/projects/reel-explainers/LEARNINGS.md` §6). What's wrong in the proximity-sensor demo:

- **No hand, no body.** The phone floats against the cheek with nothing holding it, and the head is a bust that ends at the shoulders. The references use rigged people and photoreal hands, and that's most of why they read as real.
- **The head is a static scan.** Eyes closed, no expression, no motion. It never turns, blinks or reacts, so in wide shots it looks like a mannequin.
- **The cutaway is a flat colour.** The cut through the cheek is filled with one dark-brown colour, with no skin, fat or muscle layers. During the dive (about 4.3–4.6 s) it fills half the frame as a flat slab.
- **The sensor isn't modelled.** The emitter and receiver are glowing dots stuck on the glass, spread further apart than the real ones so they can be seen. The real module (emitter window, detector window) only shows up as a photo card. It should be geometry inside the phone, visible when the camera goes in.
- **No environment.** It's a radial gradient backdrop, not a set. #06 has a whole lit hallway; ours has nothing to give scale or place.
- **Materials and lighting.** The skin has no subsurface scattering, the phone frame blows out to white in a few frames (about 12.0 s), and the lit screen washes out to flat grey.
- **Camera paths are hand-tuned numbers.** The keys are phone-local offsets found by trial and error (`lcam=` renders). Nothing frames the shot automatically (keeping the subject in the safe zone, clearing the caption), so every new topic means re-tuning by eye.
- **Screen-on is a hard snap** (the one jump `motion_stats` flags, 10.23 s). That's true to the real phone, but it reads like a cut.

What would fix most of it: a rigged human with hands from Mixamo or Blender, holding the phone and posed per beat; a layered anatomy section mesh for the cut; the sensor module modelled as part of the phone; a real environment (Poly Haven HDRI plus a simple room); and SSS skin. That's a bigger rebuild of the set, not tweaks to `set.js`.
