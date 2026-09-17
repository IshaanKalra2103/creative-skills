# Pen API

All point arrays are screen-space `[[x,y],...]` already offset for the room. Inks: `'blue' | 'coral' | 'yellow' | 'teal' | 'paper'`. Tones 0–1.

## Globals
| | |
|---|---|
| `iso(i,j,z)` | raw projection (no room offset) |
| `stream(...keys)` | seeded RNG function; same keys → same sequence |
| `rand(R,a,b)`, `randi(R,a,b)`, `pick(R,arr)` | helpers over an RNG |
| `noise(x,y,seed)` | smooth value noise in [-1,1] |
| `smooth(P,closed,iters)` | Chaikin rounding |
| `room(def)` | register a room: `{id,col,row,w,d,h,style,shell,draw(pen,t,R)}`; `shell:false` skips floor/walls |
| `INKS`, `ANGLE`, `MISREG`, `CELL` | swap palette / screen angles / misregistration / dot pitch |

## Marks
| | |
|---|---|
| `pen.p(i,j,z)` | room coords → point |
| `pen.knock(P, alpha=1)` | paint paper (erase ink below); alpha<1 lightens |
| `pen.tint(P, ink, tone)` | overprint halftone (multiply) |
| `pen.fill(P, ink, tone)` | knock + tint (opaque object) |
| `pen.line(P, ink, w, {closed, amp, tone, dash, cap})` | wobbly stroke; `amp:0` = straight |
| `pen.shape(P, [ink,tone]|null, {line, w, amp, lineTone})` | fill + outline |
| `pen.dot(x,y,r,ink,tone)` | small solid dot |
| `pen.light(P, strength)` | light pool (lift paper + yellow) |
| `pen.glow(i,j,z,r,ink,strength)` | concentric floor glow |

## Geometry (return points)
| | |
|---|---|
| `pen.floorQuad(i,j,w,d,z)` | horizontal rectangle |
| `pen.wallQuad('i'|'j', u, z, w, h, off)` | rectangle on a back wall; `off` pushes it out from the wall |
| `pen.ellipse(ci,cj,z,ri,rj,n)` | circle lying flat in iso |
| `pen.circle(x,y,r,n)` | screen circle (heads, dots) |
| `pen.blob(x,y,rx,ry,key,lump,n)` | organic shape (foliage, clouds, puddles) |
| `pen.leaf(a,b,width)` | pointed leaf between two points |

## Solids & props
| | |
|---|---|
| `pen.box(i,j,z,w,d,h,{ink,tone,top,left,right,topInk,leftInk,rightInk,shadow,line,w})` | returns `{top,faceI,faceJ}` |
| `pen.shell(room)` | floor slab, planks, back walls (called automatically) |
| `pen.table(i,j,w,d,h,{ink,tone})` | returns centre-top point |
| `pen.chair(i,j,{back:'i'|'j',ink,tone})` | 0.5×0.5 chair |
| `pen.rug(i,j,w,d,{ink,tone,border})` | |
| `pen.bookcase('i'|'j', u, width, height, {rows,depth,ink})` | against a back wall, random books |
| `pen.window('i'|'j', u, z, w, h, {sky, patch, reach, shear, light})` | adds a sun patch unless `patch:false` |
| `pen.sunPatch(wall,u,z,w,h,o)` | the patch alone (draw after rugs to light them) |
| `pen.lamp(i,j,{h,t,on,ink})` | floor lamp with flicker + cone |
| `pen.plant(i,j,z,{t,size,ink,pot,leaves})` | potted plant with sway |
| `pen.books(i,j,z,n)` | stacked books |
| `pen.steam(x,y,t,{n,h,ink})` | rising wisps |
| `pen.sparkle(x,y,r,ink,t)` | twinkling star |
| `pen.person(i,j,z,{pose,t,shirt,pants,hair,skin,facing,scale,speed,phase})` | poses: `stand walk sit read reach wave`; returns `{head,hand}` |

## Runtime
- URL: `?room=<id>` start framed on a room, `&zoom=N`, `?frame=N` freeze time, `?still` disable idle tour.
- Keys: drag / wheel / pinch, WASD/arrows, `+`/`-`, `0` fit all, `P` save PNG, double-click a room to fly in.
- Idle 20s → auto-tour between rooms.
