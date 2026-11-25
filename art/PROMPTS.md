# The prompts behind the art

The figure and the tree in the scene were drawn by OpenAI's GPT Image from the prompts below (each a first
render plus one edit). The tree was then traced to vector by `trace.py`; the figure was redrawn as vector by GPT
from the picture (an SVG in the picture's own pixels) and fitted to the scene by `figure_svg.py`. They are kept here as a record of how the art was
made, and for anyone who wants to make a variant.

Each prompt was given with a few reference images attached. Those images are **not** in this repository, because
they are other people's work: the character design sheet published by ZipZipPipe, a frame of the short film by
凛雪_Yuki (for the pose, the camera angle and the flat style), and a close-up of the design sheet's bangs. The
tree's layout guide was a rough block-in drawn for the purpose. Where a prompt says "image 1", it means these.

The character is ZipZipPipe's design, which carries no commercial licence: anything made with these prompts is
for non-commercial use, with credit.

## Background

- **GPT Image**: ask for a transparent background, as the prompts do. Download the PNG itself
  (not a screenshot), so the transparency is kept.
- **Nano Banana**: it has no real transparency and may paint a grey checkerboard instead. Swap
  the last line of the prompt for:
  `Background: one flat solid pure green, #00FF00, edge to edge. No shadow, no gradient, no floor.`

## 1. Claude

Attached, in this order:

1. the character design sheet (who she is: outfit, colours, hair)
2. the film frame (the pose, the camera angle and the flat style)
3. a close-up of the design sheet's head (the bangs and the hair ornament)

Size: portrait 2:3 (1024 x 1536).

```text
Draw the character from image 1 in the pose, camera angle and flat cut-paper style of image 2. Image 3 is a close-up of her bangs and hair ornament.

STYLE: a lineless flat-colour silhouette illustration, like cut paper. No outlines, no line art, no gradients, no texture, no soft shading, no highlights, no glow. Every shape is one solid flat colour with a crisp edge. Use only these colours:
- hair: orange #F0762A, with a few large darker-orange #C9541C shadow shapes
- skin and all white cloth: cream #F8F1E4, with a few pale lilac-grey #D6CCD6 fold shadows
- black cloth: near-black #1F1B2A
- book: dark red #7A2420
- trim, tassels, buttons, flower centres: gold #E9B852

FACE: completely blank, as in image 2. No eyes, no eyebrows, no nose, no mouth. Face and neck are one smooth cream shape.

BANGS (the most important feature): her bangs make a clear letter M. There is a parting at the crown, one section of hair sweeps down to each side of the face, and one single long pointed lock hangs down the middle of the face, between where the eyes would be. The two cream triangles of forehead on either side of that centre lock must be clearly visible. Not a straight fringe, not a side sweep.

HAIR: very long orange hair, down to her knees, streaming out wide to both sides as if lifted by wind, drawn as a moderate number of broad, smooth, tapered locks with curled ends. No hair-thin loose strands.

HAIR ORNAMENT: on the left side of her head (the right side of the picture), one small orange daisy with a gold centre, a black ribbon bow under it, and two short cream ribbon tails with a small gold tassel. Keep the flower small, about the size of her ear.

OUTFIT, as in image 1: high ruffled collar with an orange daisy brooch and a black neck ribbon; short cream capelet with a thin gold edge and a small orange sunburst on the shoulder; puffy cream sleeves with frilled cuffs; wide black corset belt with gold buttons and an orange tassel; long cream pleated skirt; an orange tabard panel with gold trim; black overskirt panels with gold trim; a black bow with an orange daisy rosette and gold tassels at each hip; cream lace-up heeled boots.

POSE AND CAMERA: full body, standing tall, seen slightly from below (a low camera, so the skirt looks large and wide and the head a little smaller). Her right arm (on the left of the picture) is raised high above her head, the elbow a little bent, the index finger pointing straight up. Her head is tilted back a little and her face is lifted toward her fingertip. Her left hand holds a dark red book with a gold sunburst on the cover at her hip. Her raised hand is empty: no light, no pearl, no beam, no sparkles.

FRAMING: the whole figure inside the picture, from the fingertip to the skirt hem and boots, all of the hair included, with a small empty margin on every side. No ground, no cast shadow, no text, no watermark, no border.

Transparent background.
```

If the bangs come out wrong, follow up with: `Keep everything, but redraw the bangs as in image 3: parting at the crown, a swept section on each side, and one long pointed lock down the middle of the blank face, with a clear cream gap on each side of it.`

### Fixing the hand

The film crop holds the book from underneath with a bent wrist, and the model copies that. Edit the first
generated PNG with nothing else attached (leave the film reference out). If the editor has a selection brush,
select only the hand, so nothing else is redrawn. Ask for a small, simple shape: a prompt that lists fingers
gets an anatomical hand that no longer matches the cut-paper style.

```text
Edit only the small area just below her left frilled cuff (her hand). Keep every other part of the image exactly as it is: do not redraw or move the arm, the sleeve, the cuff or the book.

Redraw only the hand, so that it really carries the book from underneath: the hand is cupped under the bottom edge of the book, the back of the hand facing us, the four fingers curled under the book's bottom edge and hidden behind it, and the thumb lying on the front cover near its bottom corner. The wrist continues straight out of the cuff, in line with the forearm.

Flat cut-paper style, like her raised hand: one simple rounded cream shape for the hand plus a short thumb. No separate finger lines, no outlines, no shading.
```

## 2. The tree (a frame along the top and the right)

Attached:

1. a layout guide (where things go; a rough block-in, not the style)
2. the film frame (optional, for the flat cut-paper style only)

Size: landscape 3:2 (1536 x 1024).

```text
A flat cut-paper illustration of one golden tree that frames a wide picture along its top edge and its right edge. Image 1 is a rough layout guide: follow where things are placed, not how it is drawn.

LAYOUT: the trunk stands at the far right. Its roots are in the bottom right corner and it rises up along the right edge. Near the top it bends over into one long main bough that reaches left across the whole top of the picture, all the way to the top left corner, sagging slightly in the middle. Smaller branches and leafy twigs grow from the bough and the trunk, so that foliage fills a band along the top (about the top quarter of the picture) and a band down the right side (about the right fifth). Leafy twigs hang down from the bough like a curtain edge. The centre and the whole lower left of the picture are completely empty.

FRUIT: ten to twelve round orange fruits hang below the bough and the side branches on short thin stems, at different heights, each one clearly separate from the leaves, like small lanterns.

STYLE: lineless flat-colour silhouette, like cut paper. No outlines, no gradients, no texture, no shading, no glow. Solid flat shapes with crisp edges. The leaves are simple pointed almond shapes, fairly large, in loose clusters with gaps between the clusters: a few hundred leaves, not a dense solid mass. Use only these colours:
- trunk and branches: ochre gold #D9A032
- leaves: light gold #F4C443 and darker ochre #C9952E
- fruit: orange #F0762A

FRAMING: the tree may touch and run off the top edge and the right edge. No ground line, no grass, no sky, no sun, no moon, no text, no border.

Transparent background.
```

### A slimmer tree

For a small Claude the first tree is heavy. Attach the first tree picture and edit it. This gave
the tree in use:

```text
Redraw this tree in the same flat cut-paper style, the same colours and the same layout, but more slender and delicate:

- Trunk: about half as thick as now (roughly 4% of the picture's width), still rising up the right edge with its roots in the bottom right corner.
- Main bough and branches: thin and elegant, about half as thick as now. The bough still reaches across the top to the top left corner, climbing slightly as it goes.
- Leaves: smaller and narrower, about two thirds of their present size, each one a separate simple almond shape. More of them, in light airy sprays with background showing between them, not overlapping into solid masses.
- Fruit: about half their present diameter, still round, still hanging on thin stems at different heights, 12 to 14 of them.

Keep everything else: the empty centre and lower left, the two leaf tones (light gold and ochre), orange fruit, no outlines, no gradients, no shading, transparent background, landscape 3:2.
```
