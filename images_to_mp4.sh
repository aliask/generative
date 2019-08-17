#!/bin/bash

function usage {
    echo "Usage: $0 <width> <height> <image prefix> [outfile]"
    echo ""
    echo "  Example: $0 800 600 throughthemist/output/20190817_130817_throughthemist_1139_ mist.mp4"
    exit 1
}

if [ $# == 3 ]; then
	./ffmpeg -r 20 -f image2 -s $1x$2 -i $3_%04d.png -vcodec libx264 -crf 25  -pix_fmt yuv420p output.mp4
elif [ $# == 4 ]; then
	./ffmpeg -r 20 -f image2 -s $1x$2 -i $3_%04d.png -vcodec libx264 -crf 25  -pix_fmt yuv420p $4
else
	usage
fi
