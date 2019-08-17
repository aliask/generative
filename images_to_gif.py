import os
import sys
import imageio
import argparse
from skimage import transform,io
import numpy as np
import shutil

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
parser.add_argument('-s', '--scale', help='scaling factor for resizing')
parser.add_argument('-t', '--time', type=float, help='number of seconds to display single image')
args = parser.parse_args()

if not args.dir:
    print(f'No directory specified')
    sys.exit(1)

imagedir = './' + args.dir + '/output'

if not args.scale:
    args.scale = 1.0

if not args.format:
    args.format = 'png'

if not args.time:
    args.time = 0.1

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
    image = imageio.imread(os.path.join(imagedir, filename))

    if args.scale != 1.0:
        imagesmall = transform.resize(image, tuple([np.float64(args.scale)*x for x in image.shape[:2]]), preserve_range=True, anti_aliasing=True)
    else:
        imagesmall = image

    images.append(imagesmall)

    print('.', end = '')
    sys.stdout.flush()
    if (image_shape != image.shape) and (image_shape != 0):
        print('ERROR: image shapes are not consistent')
        sys.exit(1)
    image_shape = image.shape

print('\nCreating gif...')

if not os.path.exists(f'{args.dir}/export/'):
    os.makedirs(f'{args.dir}/export/')

# Copy a thumbnail image
shutil.copy(os.path.join(imagedir, filename), f'{args.dir}/export/{args.dir}.{args.format}')

output_file = f'{args.dir}/export/{args.dir}.gif'
imageio.mimsave(output_file, np.uint8(images), format='GIF', duration=args.time, subrectangles=True)

file_size = sizeof_fmt(os.path.getsize(output_file))
print(f'Wrote {output_file} ({imagesmall.shape[0]}x{imagesmall.shape[1]}) - {file_size}')