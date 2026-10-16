# Shot kinds

Every `[[shot]]` has a `kind`. Each one has a page in `kinds/` listing its params, with an example. The keys every
shot shares (`at`, `cue`, `dots`, `vignette`) are in `spec.md`.

| kind | register | what it draws |
|---|---|---|
| [`note`](kinds/note.md) | card | a dot-grid background, a glowing dot, a handwritten note and an arrow drawn to the dot |
| [`card`](kinds/card.md) | card | a text card: words typed, popped, slid or zoomed in, on black, grey, paper or any colour |
| [`photo`](kinds/photo.md) | photo | a photo plate with a camera move (whip, push, zoom-blur, keyframes) and a caption; flipbook frames for video |
| [`frame_card`](kinds/frame_card.md) | photo | a framed photo on a flat field that slides in and keeps growing, with a big caption |
| [`faces`](kinds/faces.md) | photo | cut-out portrait cards with name labels on a colour field, zooming out from huge |
| [`browser`](kinds/browser.md) | graphic | a background image, a retro browser window with a spinning wireframe globe, a condensed caps title |
| [`magnifier`](kinds/magnifier.md) | graphic | a magnifying glass that reveals a red word inside the lens |
| [`search`](kinds/search.md) | graphic | a search pill that slides in while a query is typed |
| [`hypno`](kinds/hypno.md) | graphic | hypnotic concentric rings, a zoom burst and a cut-out collage head, with a caption |
| [`chart`](kinds/chart.md) | graphic | a node graph and a bar chart that zoom out under a title |
| [`globe_grid`](kinds/globe_grid.md) | graphic | a wireframe globe rises, multiplies into a grid and zooms out to a dot field |
| [`earth`](kinds/earth.md) | graphic | a night Earth with glowing coastlines, city lights and network arcs, with a typed caption |
| [`tunnel`](kinds/tunnel.md) | graphic | a tunnel of thumbnails rushing at the camera |
| [`file_icon`](kinds/file_icon.md) | graphic | flowing ribbons, a file icon and a hand cursor that reaches it |
| [`site`](kinds/site.md) | graphic | a blurred website slides in while a sharp search pill types a URL (the call to action) |

An unknown kind renders a labelled grey placeholder, so a timeline can be blocked out before every kind exists.
`spec.md` → Adding a kind covers writing a new one.
