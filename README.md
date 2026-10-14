<h1 align="center">Vira Engine</h1>
<p align="center">A game engine that is one HTML file. Open it in a browser and build.</p>

![A night scene made in Vira Engine: rain falling through a street lamp's beam onto wet paving]<img width="880" height="560" alt="hero" src="https://github.com/user-attachments/assets/ba46f30c-12c8-4b68-9082-61aa101169f7" />


Vira is a no-code game engine that runs entirely in a browser tab. There is no install, no build step and no account. You get a level editor, a room builder, terrain, logic, cutscenes, lighting and a game to play, all from a single `vira.html` you can double-click.

- **Download:** grab `vira.html` from [Releases](https://github.com/USERNAME/vira-engine/releases/latest)
- **Try it online:** https://USERNAME.github.io/vira-engine/

---

## What you get

| Workspace | What you do there |
| --- | --- |
| **Level** | Place objects, drag the gizmos, build with the cube grid, play straight from the editor |
| **Rooms** | Draw rooms as shapes, cut doors and windows, push walls around on a live 2D plan |
| **Terrain** | Sculpt and paint ground, plant grass and trees, with physics that follows the surface |
| **Logic** | Write behaviour as sentences, or watch it as a 3D reaction chain |
| **Model** | Build simple props out of shapes without leaving the engine |
| **Cutscenes** | Set camera shots, cut between them on a timeline, shape speed with a curve |
| **HUD / Sound** | Lay out the interface and wire up audio |

## Building levels

![The Vira Engine level editor](docs/editor.jpg)

The room builder works like a drawing tool. Pick a shape, drag it out, and walls, floors and ceilings appear with the right thickness. Rooms that touch lose the wall between them while you drag, so corridors join buildings without leftover pillars.

- Rectangles, squares, hexagons, circles, triangles, free polygons and single angled walls
- Real doors that drop into a wall and slide along it, with keys, remotes and their own logic
- A live 2D plan that stays in step with the 3D as you draw, move or push a wall
- Terrain with nine brushes, four paint layers, grass and five kinds of tree

![Hexagon, circle and rectangle rooms](docs/rooms.jpg)

## Logic without code

![The Reactor view of one behaviour](docs/reactor.jpg)

Behaviour reads as a sentence: when this happens, check that, then do these things. Every highlighted word is a dropdown, and steps can be dragged to reorder them. The Reactor view draws the same behaviour as a reaction chain, so you can press Trace and watch it run.

## Cutscenes

![The cutscene timeline](docs/timeline.jpg)

- Camera bodies with their own sensor sizes and frame shapes, from Super 16 to a 1.43 giant format
- Lenses in millimetres that zoom between shots, plus roll and handheld shake
- Transitions you drag between two shots: cut, fade, flash or whip pan
- A speed graph with keyframes, bezier handles, easing and freeze frames, for slow motion and speed ramps

## Lighting

Lights are set in kelvin rather than hex codes, from 1000 K candlelight to 12000 K sky. Twelve animations cover candle, fire, fluorescent, broken neon, strobe, pulse, lightning, television, beacon, sputter and dying bulb. Spotlights have shafts, and dust drifts inside the beam and takes its colour. Rain wets surfaces, fog thickens beams, and lightning throws the level into relief.

## Getting started

```bash
git clone https://github.com/USERNAME/vira-engine.git
cd vira-engine
```

Then double-click `vira.html`. Any recent Chrome, Edge, Firefox or Safari will do, on a laptop or desktop. There is no server to start.

Pick a starting point when the engine opens: first person, third person over the shoulder, or a fixed camera. You land in a small level you can play right away.

## Saving and sharing

- **File &rsaquo; Save** keeps the project in your browser
- **File &rsaquo; Save project file** writes a `.json` you can back up or hand to someone else
- **File &rsaquo; Export game** writes a single `.html` that plays on its own, so you can send it to anyone or host it on GitHub Pages

## Keys worth knowing

| Keys | Does |
| --- | --- |
| Right mouse + `W` `A` `S` `D` | Fly the view. `Space` rises, `C` drops, `Shift` speeds up |
| `Q` `W` `E` `R` | Select, move, rotate, size |
| `B` · `V` · `L` | Cube grid, rooms, asset library |
| `F` · `End` · `G` | Focus the selection, drop it to the floor, see the game camera |
| `Ctrl`+`K` · `Ctrl`+`S` | Search everything, save |
| `Alt`+`P` | Play, and `Esc` comes back |

## Hosting this page

The landing page in `index.html` is self-contained, images included. To put it online, open the repository's **Settings &rsaquo; Pages**, set the source to your default branch, and the site appears at `https://USERNAME.github.io/vira-engine/`.

## Built with

[Three.js](https://threejs.org) for rendering and [Cannon](https://github.com/schteppe/cannon.js) for physics, both bundled into the single file so the engine works offline.

## License

Add your license here before publishing the repository.
