## site

The call to action. A dark, out-of-focus landing page slides in from the right and settles: brand bar, two-line headline, kicker, body copy, two pill buttons, a phone mockup playing a screen recording, a feature panel and round buttons. A sharp, translucent search pill glides in with it and types the query, then the caret blinks. Page offset, pill edge and caret are measured per tick. The page is blurred, so text only has to read as text: each line can be squeezed to a measured width.

| param | type | default | meaning |
|---|---|---|---|
| `query` | string | `"yourbrand.com"` | typed into the sharp pill (long queries shrink to fit) |
| `reveal` | per-tick list | — | characters per tick (else `rate`, 1.45 a tick from tick 1) |
| `caret` | per-tick 1/0 list | on while typing, then 2 on / 3 off | caret visibility |
| `query_size` | px | 35 | |
| `brand` | string | `"YOURBRAND"` | top-left wordmark |
| `headline` | 2 strings | placeholder | big bold title lines |
| `kicker` | string | `""` | small accent line under the title |
| `body` | up to 6 strings | none | grey body copy |
| `buttons` | 2 strings | `"Get started", "Learn more"` | pill buttons |
| `features` | up to 3 strings | none | rows in the dark panel |
| `brand_w`, `headline_w`, `kicker_w`, `body_w`, `buttons_w`, `features_w` | px (lists) | natural width (capped) | squeeze lines to measured widths |
| `accent`, `accent2` | hex | `#2e8b3a`, `#a85e22` | primary (buttons, panel dots, round buttons, kicker) and secondary button |
| `accent_ink`, `accent2_ink` | hex | `#a6d8ab`, `#e8b080` | text on the buttons |
| `chip` | hex | `#8a5a6a` | a nav chip in the brand bar |
| `phone` | `"tiles"` \| `"google"` | `"tiles"` | the phone recording: neutral app tiles, or the reference's Drive/Gmail icons |
| `tile_colors` | hex list | blue, yellow, red, green | `tiles` colours |
| `blur` | px | 4.8 | page defocus |

```toml
[[shot]]
cue = "github"
kind = "site"
brand = "MOONARCHIVE"
headline = ["Every Apollo transcript,", "searchable"]
kicker = "FREE  ·  OPEN DATA"
body = ["Mission audio, flight plans and onboard logs from every crewed", "Apollo flight, aligned to the second and free to download."]
buttons = ["Start reading", "API docs"]
features = ["Full-text search", "Synced audio", "CSV exports"]
query = "moonarchive.org"
accent = "#3b6fd8"
accent2 = "#c8553d"
```

Timing: 18 ticks (1.8 s) on the reference: the page settles by tick 14 and typing ends near tick 9. It's the last shot, so let it run to the end of the voiceover. Longer shots hold the settled page with the caret blinking.
