# Images for the lessons

The PNG files in this folder are image files that lesson examples, challenges and the Playground give to programs to read (MOOC part 14: an image read with `new Image("file:landscape.png")`, its pixels read and written). They are made by [`scripts/assets/make-images.mjs`](../../scripts/assets/make-images.mjs) for Java Arena: each picture is drawn there pixel by pixel from rectangles and gradients. There are no third-party images here, nothing is copied from the MOOC, and like everything in `content/` they are shared under CC BY-NC-SA 4.0 (see [../LICENSE](../LICENSE)).

`assets.json` lists each image with its size and a description, which the page uses as the image's alt text. Don't edit the PNGs or `assets.json` by hand: change the script and run it.

```sh
node scripts/assets/make-images.mjs           # writes the PNGs and assets.json
node scripts/assets/make-images.mjs --check   # only checks that they're up to date
```

The script makes the same bytes on every computer and Node version (its own PNG encoder and exact arithmetic), and a unit test (`scripts/assets/make-images.test.mjs`) checks that it makes exactly the committed files. Every file is 8-bit RGB, or RGBA when the picture has transparent pixels, with no gamma, color profile or text chunks, and every pixel is either opaque or fully transparent (stored as `0x00000000`), so Java Arena's JavaFX and real JavaFX read exactly the same colors from it.

## The images

| File | Size | Kind | What it shows |
|---|---|---|---|
| `landscape.png` | 32 x 24 | RGB | A blue sky that gets lighter toward the horizon, a yellow sun, blue-green hills, a green slope, a small blue lake and a striped brown field. |
| `checker.png` | 16 x 16 | RGB | A checkerboard of 4 x 4 squares: dark gray `0x282828` and light gray `0xe6e6e6`, dark at the top left. |
| `icon.png` | 8 x 8 | RGBA | A pixel-art red heart (`0xe6283c`, outline `0x800020`, one white pixel of shine at (2, 2)) on a transparent background. |
| `blocks.png` | 48 x 32 | RGB | Squares of 8 x 8 pixels, 6 across and 4 down (colors below). |
| `photo.png` | 64 x 48 | RGB | A soft sunset: a sky from purple to orange, a glowing low sun, dark hills and rippled water. Almost every pixel differs from its neighbors, as in a photo. |
| `tiny.png` | 6 x 4 | RGB | Every pixel a known color (below), for challenges whose answer is exact. |

The colors as `0xRRGGBB`; `getArgb` gives each with `ff` in front (`0xffff0000` for `0xff0000`), since every pixel is opaque. x goes across from 0, y down from 0.

`tiny.png`, row by row (y = 0 to 3), each row from x = 0 to 5:

| y | x = 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 0 | `0xff0000` | `0x00ff00` | `0x0000ff` | `0xffffff` | `0x000000` | `0x808080` |
| 1 | `0xffff00` | `0x00ffff` | `0xff00ff` | `0xc0c0c0` | `0x404040` | `0x800000` |
| 2 | `0x102030` | `0x405060` | `0x708090` | `0xa0b0c0` | `0xd0e0f0` | `0x0a141e` |
| 3 | `0x010203` | `0x7f7f7f` | `0xfefefe` | `0x336699` | `0x996633` | `0x2e8b57` |

`blocks.png`, the block at column c and row r covering x = 8c to 8c + 7 and y = 8r to 8r + 7:

| r | c = 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 0 | `0xff0000` | `0xff8000` | `0xffff00` | `0x00c000` | `0x0040ff` | `0x8000c0` |
| 1 | `0xff8080` | `0xffc080` | `0xffff80` | `0x80e080` | `0x80a0ff` | `0xc080e0` |
| 2 | `0x800000` | `0x804000` | `0x808000` | `0x006000` | `0x002080` | `0x400060` |
| 3 | `0x000000` | `0x333333` | `0x666666` | `0x999999` | `0xcccccc` | `0xffffff` |

## Using them

See "Images (assets)" in [../README.md](../README.md): a test gives one to the program with `files: { landscape.png: { asset: landscape.png } }`, and a lesson shows one (and gives it to the next example) with an ` ```asset landscape.png ` block.

## Adding an image

Add an entry to `IMAGES` in the script (its name, size, description and a function that gives each pixel's color), run the script, and commit the new PNG with `assets.json`. Keep images small (the page draws them several times larger) and their pixels opaque or fully transparent.
