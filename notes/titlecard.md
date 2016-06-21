
The following ffmpeg adds an overlay to the first 5 seconds of the video from `titlecard/titlecard.png`

    ffmpeg -i lesson1.1.mp4 -i titlecard/titlecard.png -filter_complex "[0:v][1:v] overlay=0:0:enable='between(t,0,5)'" -c:a copy lesson1.1-title.mp4



The following command extracts a png of the frame at the closest seek point before 5s.

    ffmpeg -ss 5 -i source.mp4 -vframes 1 target.png
