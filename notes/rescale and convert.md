
The following will transcode the video to mp4 while at the same time scaling it down to 1280 maximum width.

    ffmpeg -i Three-Trees-Intro.mov -vf scale=1280:-1 three-trees-intro.mp4