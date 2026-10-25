# Photoreal stills

Every video shot starts from a still. The still fixes the look (backdrop, light, product,
framing) so the video model only has to move it.

## Prompt structure

One shared look block, then one `Primary request` per shot. Keep the block identical across
shots so the cut holds together. The labelled spec format of the `image` skill works well:

```text
Use case: photorealistic-natural
Asset type: film plate for a premium <product> commercial, cropped to 4:5 portrait
Input images: Image 1 is only a reference for the <product>'s look (<material, colour, marks>); match it, ignore its background.
Scene: floating in a seamless studio void with a smooth horizontal gradient backdrop: almost-black deep navy on the left, royal blue in the middle, bright periwinkle on the far right. No floor, no crowd.
Lighting: low-key product lighting, one soft top key and one hard cool-white rim light from behind; undersides fall into deep shadow.
Style: high-end commercial photography, shallow depth of field, subtle film grain, high contrast, rich saturated blues.
Avoid: any extra text, watermark, people, hands, cartoon look.
Primary request: <the shot: subject, pose or arrangement, camera angle, what is sharp>.
Composition: <where things sit in the 4:5 frame; leave room for the move>.
```

For people: an anonymous athlete as a near-black silhouette, face fully in shadow, one thin
rim light, slow-shutter blur on hands and product, and no numbers, names or logos on clothing.

## Rules

- Make the still in the frame you will use (4:5 portrait, or crop a landscape still to 4:5
  before sending it to the video model). The model keeps the framing it is given.
- Attach a real product photo as a look reference when the product must match (shape,
  panels, wordmark); say it is only a look reference.
- Compose for the move: room in front of a truck or push, the product where a box will go.
- Read every still before spending video credits: product shape and marks, hands and
  anatomy, nothing extra in frame, backdrop clean, no generated text.
- One still per shot, named after the shot (`hero.png`, `detail.png`), with its prompt next
  to it as `.txt`.

## The example's prompts

`examples/adidas-nba/stills/` has every prompt: `player_base.txt` (the shared player block),
`player_cross.txt` and `player_gather.txt` (the two clips' start frames), `hoop_common.txt`,
`hoop_h1.txt`, `hoop_h2.txt` and `rack.txt` (product setting shots with a ball photo as the
look reference), and small JPGs of the start stills.
