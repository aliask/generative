import os
import sys
import shutil
from PIL import Image
import argparse
from typing import Tuple, List, Union
from collections import defaultdict
from random import randrange
from itertools import chain

# This code adapted from https://github.com/python-pillow/Pillow/issues/4644 to resolve an issue
# described in https://github.com/python-pillow/Pillow/issues/4640
#
# There is a long-standing issue with the Pillow library that messes up GIF transparency by replacing the
# transparent pixels with black pixels (among other issues) when the GIF is saved using PIL.Image.save().
# This code works around the issue and allows us to properly generate transparent GIFs.

class TransparentAnimatedGifConverter(object):
    _PALETTE_SLOTSET = set(range(256))

    def __init__(self, img_rgba: Image.Image, alpha_threshold: int = 0):
        self._img_rgba = img_rgba
        self._alpha_threshold = alpha_threshold

    def _process_pixels(self):
        """Set the transparent pixels to the color 0."""
        self._transparent_pixels = set(
            idx for idx, alpha in enumerate(
                self._img_rgba.getchannel(channel='A').getdata())
            if alpha <= self._alpha_threshold)

    def _set_parsed_palette(self):
        """Parse the RGB palette color `tuple`s from the palette."""
        palette = self._img_p.getpalette()
        self._img_p_used_palette_idxs = set(
            idx for pal_idx, idx in enumerate(self._img_p_data)
            if pal_idx not in self._transparent_pixels)
        self._img_p_parsedpalette = dict(
            (idx, tuple(palette[idx * 3:idx * 3 + 3]))
            for idx in self._img_p_used_palette_idxs)

    def _get_similar_color_idx(self):
        """Return a palette index with the closest similar color."""
        old_color = self._img_p_parsedpalette[0]
        dict_distance = defaultdict(list)
        for idx in range(1, 256):
            color_item = self._img_p_parsedpalette[idx]
            if color_item == old_color:
                return idx
            distance = sum((
                abs(old_color[0] - color_item[0]),  # Red
                abs(old_color[1] - color_item[1]),  # Green
                abs(old_color[2] - color_item[2])))  # Blue
            dict_distance[distance].append(idx)
        return dict_distance[sorted(dict_distance)[0]][0]

    def _remap_palette_idx_zero(self):
        """Since the first color is used in the palette, remap it."""
        free_slots = self._PALETTE_SLOTSET - self._img_p_used_palette_idxs
        new_idx = free_slots.pop() if free_slots else \
            self._get_similar_color_idx()
        self._img_p_used_palette_idxs.add(new_idx)
        self._palette_replaces['idx_from'].append(0)
        self._palette_replaces['idx_to'].append(new_idx)
        self._img_p_parsedpalette[new_idx] = self._img_p_parsedpalette[0]
        del(self._img_p_parsedpalette[0])

    def _get_unused_color(self) -> tuple:
        """ Return a color for the palette that does not collide with any other already in the palette."""
        used_colors = set(self._img_p_parsedpalette.values())
        while True:
            new_color = (randrange(256), randrange(256), randrange(256))
            if new_color not in used_colors:
                return new_color

    def _process_palette(self):
        """Adjust palette to have the zeroth color set as transparent. Basically, get another palette
        index for the zeroth color."""
        self._set_parsed_palette()
        if 0 in self._img_p_used_palette_idxs:
            self._remap_palette_idx_zero()
        self._img_p_parsedpalette[0] = self._get_unused_color()

    def _adjust_pixels(self):
        """Convert the pixels into their new values."""
        if self._palette_replaces['idx_from']:
            trans_table = bytearray.maketrans(
                bytes(self._palette_replaces['idx_from']),
                bytes(self._palette_replaces['idx_to']))
            self._img_p_data = self._img_p_data.translate(trans_table)
        for idx_pixel in self._transparent_pixels:
            self._img_p_data[idx_pixel] = 0
        self._img_p.frombytes(data=bytes(self._img_p_data))

    def _adjust_palette(self):
        """Modify the palette in the new `Image`."""
        unused_color = self._get_unused_color()
        final_palette = chain.from_iterable(
            self._img_p_parsedpalette.get(x, unused_color) for x in range(256))
        self._img_p.putpalette(data=final_palette)

    def process(self) -> Image.Image:
        """Return the processed mode `P` `Image`."""
        self._img_p = self._img_rgba.convert(mode='P')
        self._img_p_data = bytearray(self._img_p.tobytes())
        self._palette_replaces = dict(idx_from=list(), idx_to=list())
        self._process_pixels()
        self._process_palette()
        self._adjust_pixels()
        self._adjust_palette()
        self._img_p.info['transparency'] = 0
        self._img_p.info['background'] = 0
        return self._img_p


def _create_animated_gif(images: List[Image.Image], durations: Union[int, List[int]]) -> Tuple[Image.Image, dict]:
    """If the image is a GIF, create an its thumbnail here."""
    save_kwargs = dict()
    new_images: List[Image.Image] = []

    for frame in images:
        thumbnail = frame.copy()  # type: Image
        thumbnail_rgba = thumbnail.convert(mode='RGBA')
        thumbnail_rgba.thumbnail(size=frame.size, reducing_gap=3.0)
        converter = TransparentAnimatedGifConverter(img_rgba=thumbnail_rgba)
        thumbnail_p = converter.process()  # type: Image
        new_images.append(thumbnail_p)

    output_image = new_images[0]
    save_kwargs.update(
        format='GIF',
        save_all=True,
        optimize=False,
        append_images=new_images[1:],
        duration=durations,
        disposal=2,  # Other disposals don't work
        loop=0)
    return output_image, save_kwargs


def save_transparent_gif(images: List[Image.Image], durations: Union[int, List[int]], save_file):
    """Creates a transparent GIF, adjusting to avoid transparency issues that are present in the PIL library

    Note that this does NOT work for partial alpha. The partial alpha gets discarded and replaced by solid colors.

    Parameters:
        images: a list of PIL Image objects that compose the GIF frames
        durations: an int or List[int] that describes the animation durations for the frames of this GIF
        save_file: A filename (string), pathlib.Path object or file object. (This parameter corresponds
                   and is passed to the PIL.Image.save() method.)
    Returns:
        Image - The PIL Image object (after first saving the image to the specified target)
    """
    root_frame, save_args = _create_animated_gif(images, durations)
    root_frame.save(save_file, **save_args)


def sizeof_fmt(num, suffix='B'):
    for unit in ['','Ki','Mi','Gi','Ti','Pi','Ei','Zi']:
        if abs(num) < 1024.0:
            return "%3.1f%s%s" % (num, unit, suffix)
        num /= 1024.0
    return "%.1f%s%s" % (num, 'Yi', suffix)

parser = argparse.ArgumentParser(formatter_class=argparse.RawDescriptionHelpFormatter,
                                 description='Convert images in a directory to gif.\nDefaults to png files in current directory.')
parser.add_argument('-d', '--dir', help='directory containing image files')
parser.add_argument('-f', '--format', help='image format to be converted to gif')
parser.add_argument('-s', '--size', type=int, help='max size in pixels')
parser.add_argument('-t', '--time', type=int, help='number of milliseconds to display single image')
args = parser.parse_args()

if not args.dir:
    print(f'No directory specified')
    sys.exit(1)

imagedir = './' + args.dir + '/output'

if not args.format:
    args.format = 'png'

if not args.time:
    args.time = 50 # 20 FPS

image_files = os.listdir(imagedir)
image_files = [x for x in image_files if x.lower().endswith(args.format.lower())]
image_files = sorted(image_files)

if not image_files:
    print(f'No {args.format.lower()} files found')
    sys.exit(1)

images = []
image_shape = 0

print('Reading and resizing images', end = '')

for filename in image_files:
    image = Image.open(os.path.join(imagedir, filename))

    if args.size:
        image.thumbnail((args.size, args.size))

    images.append(image)

    print('.', end = '')
    sys.stdout.flush()
    if (image_shape != image.size) and (image_shape != 0):
        print('ERROR: image shapes are not consistent')
        sys.exit(1)
    image_shape = image.size

print('\nCreating gif...')

if not os.path.exists(f'{args.dir}/export/'):
    os.makedirs(f'{args.dir}/export/')

# Copy a thumbnail image
shutil.copy(os.path.join(imagedir, filename), f'{args.dir}/export/{args.dir}.{args.format}')

output_file = f'{args.dir}/export/{args.dir}.gif'
save_transparent_gif(images, args.time, output_file)

file_size = sizeof_fmt(os.path.getsize(output_file))
print(f'Wrote {output_file} ({images[0].size[0]}x{images[0].size[1]}) - {file_size}')