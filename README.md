# Tuts+ Video Tools

A collection of command-line tools for efficient processing of video.

## Setup

Install with NPM:

    npm install -g tutsplus-video-tools


[Install ffmpeg](https://ffmpeg.org/download.html).

Configure your Auphonic account credentials (optional) and the location of ffmpeg binaries. Create a file named `.tutsplus-video-tools.json` in your user folder (eg. `C:\Users\<username>` for Windows or `/Users/<username>` on Mac. Add the following contents:

    {
      "ffmpegBinPath": "<path-where-ffmpeg-binaries-are-found>",
      "auphonicUsername": "<your-auphonic-username>",
      "auphonicPassword": "<your-auphonic-password>"
    }

## Tools

The following tools are currently provided. More can be added, on request:

 - `tvt-auphonic`:  each file with the auphonic API. Works with video files, but for faster upload it is better to split videos and only run this command on the audio channel.
 - `tvt-combine`: Combines each video files with a cooresponding audio files (which should be in the same folder and differ only in extension).
 - `tvt-fadeinout`: Adds a fade from or to black to the beginning and end of each video.
 - `tvt-metadata`: Prints metadata informat for each video.
 - `tvt-split`: Splits the videos files into separate video and audio channels.
 - `tvt-titlecard`: Overwrites the start of each video with a titlecard. If no titlecard image is given, the card will be extracted from the next frame of the video after the title card duration.

## Usage

Run any of these commands with `-h` or `--help` for more detailed information about flags and usage.

Most of these tools write their output to a subfolder of the folder the command was run from. They also add suffixes to the output filenames. For example, `tvt-fadeinout lesson1.mp4` will save a new video file to `fadeinout/lesson1-fadeinout.mp4`. This behaviour can be changed with the `--output-folder` and `--output-suffix` flags.

By default, these tools will use MP4 with H.264 for video and AAC for audio. Some commands have the option to write to different file formats with the `--output-extension` flag.

The commands are quiet by default, but for more detail about what is happening, use the `-v` flag.

### Example: Processing With Auphonic

The following will split videos into separate video and audio channels, process with Auphonic (noise reduction enabled, target loudness -18dB), and then recombine:

    tvt-split *.mp4
    tvt-auphonic -v -n split/*.m4a
    tvt-combine --audio-folder auphonic --audio-suffix auphonic split/*.m4v
    rm -r split auphonic

The output files will be in the `combine` folder.

### Example: Erase a Titlecard

The following will erase a five second titlecard at the beginning of a lesson, by replacing the start of the video with the first frame after the titlecard. Then a fade will be applied to the titlecard. Audio will be unchanged.

    tvt-titlecard -d 5 lesson.mp4
    tvt-fadeinout --no-fade-out titlecard/lesson-titlecard.mp4

The output file will be in the `fadeinout` folder and will have a `-titlecard-fadeinout` suffix.


### Example: Add a Titlecard

Similarly, you could add a titlecard from a `.png` file with the following.

    tvt-titlecard -d 5 --card-image titlecard.png *.mp4
    tvt-fadeinout --no-fade-out titlecard/*-titlecard.mp4
