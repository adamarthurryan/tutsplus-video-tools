# Tuts+ Video Tools

This is a suite of command line tools for bulk processing of videos. Tools are included for bulk splitting and recombining audio/video tracks, for adding or replacing titlecards, for adding fade ins and outs, for rescaling and speeding, and for processing audio with Auphonic.

## Setup

### 1. Install Node.js

First, you'll need [Node.js](https://nodejs.org/en/). _Be sure to install the latest version (currently 6.2)! The video tools will not work properly with the 4.x version of Node.js._

### 2. Install the Video Tools

Run the following command from your terminal, command prompt or what have you.

    npm install -g tutsplus-video-tools

### 3. Install ffmpeg

[Download ffmpeg here](https://ffmpeg.org/download.html) and install. Take note of the folder where you installed ffmpeg.

### 4. Configure the Video Tools

A configuration file is used to store your Auphonic account credentials (optional) and the location of ffmpeg binaries. 

Create a file named `.tutsplus-video-tools.json` in your user folder (eg. `C:\Users\<username>` for Windows or `/Users/<username>` on Mac. Add the following contents:

    {
      "ffmpegBinPath": "<path-where-ffmpeg-binaries-are-found>",
      "auphonicUsername": "<your-auphonic-username>",
      "auphonicPassword": "<your-auphonic-password>"
    }

For example, my config file is located in `C:\Users\Adam\.tutsplus-video-tools.json` and has the following contents:

    {
      "ffmpegBinPath": "C:\\Users\\Adam\\bin\\ffmpeg-20150913-git-d13a2df-win64-static\\bin",
      "auphonicUsername": "adam.brown@envato.com",
      "auphonicPassword": "-------"
    }

A tricky detail: Windows paths have backslashes instead of forwardslashes to separate each folder in the path, and in JSON these need to be "escaped". So each backslash - each `\` - should be doubled as in the example above. Also note the final `bin` in the path. This is the actual folder where the `ffmpeg` and `ffprobe` binaries are found - usually a subfolder of the installation folder.

If you don't want to use the Auphonic tool, you can leave the `auphonicUsername` and `auphonicPassword` out.



## Tools

The following tools are currently provided. More can be added, on request:

 - `tvt-auphonic`: Process each file with the auphonic API. Applies automatic leveling and optional noise reduction. Works with video files, but for faster upload it is better to split videos and only run this command on the audio channel.
 - `tvt-combine`: Combines each video files with a cooresponding audio files (which should be in the same folder and differ only in extension).
 - `tvt-fadeinout`: Adds a fade from or to black to the beginning and end of each video.
 - `tvt-filter`: Apply an ffmpeg filter to each file. A video filter and audio filter can be specified. Also has some preconfigured filters (--speed).
 - `tvt-metadata`: Prints metadata informat for each video.
 - `tvt-split`: Splits the videos files into separate video and audio channels.
 - `tvt-titlecard`: Overwrites the start of each video with a titlecard. If no titlecard image is given, the card will be extracted from the next frame of the video after the title card duration.


## Usage

Run any of these commands with `-h` or `--help` for more detailed information about flags and usage.

Most of these tools write their output to a subfolder of the folder the command was run from. They also add suffixes to the output filenames. For example, `tvt-fadeinout lesson1.mp4` will save a new video file to `fadeinout/lesson1-fadeinout.mp4`. This behaviour can be changed with the `--output-folder` and `--output-suffix` flags.

By default, these tools will use MP4 with H.264 for video and AAC for audio. Some commands have the option to write to different file formats with the `--output-extension` flag.

The commands are quiet by default, but for more detail about what is happening, use the `-v` flag.


### Example: Add Fades

The following will add fade in to the beginning of each video, and a fade out to the end.

    tvt-fadeinout *.mp4

The output files will be in the `fadeinout` folder and will have `-fadeinout` suffixes.

### Example: Processing With Auphonic

The following will split videos into separate video and audio channels, process with Auphonic (noise reduction enabled, target loudness -18dB), and then recombine:

    tvt-split *.mp4
    tvt-auphonic -v -n split/*.m4a
    tvt-combine --audio-folder auphonic --audio-suffix auphonic split/*.m4v
    rm -r split auphonic

The output files will be in the `combine` folder.

### Example: Erase a Titlecard

The following will erase a five second titlecard at the beginning of each lesson, by replacing the start of the video with the first frame after the titlecard. Then a fade will be applied to the titlecard. Audio will be unchanged.

    tvt-titlecard -d 5 lesson.mp4
    tvt-fadeinout --no-fade-out titlecard/lesson-titlecard.mp4

The output file will be in the `fadeinout` folder and will have a `-titlecard-fadeinout` suffix.


### Example: Add a Titlecard

Similarly, you could add a titlecard from a `.png` file with the following.

    tvt-titlecard -d 5 --card-image titlecard.png *.mp4
    tvt-fadeinout --no-fade-out titlecard/*-titlecard.mp4

The output fileS will be in the `fadeinout` folder and will have `-titlecard-fadeinout` suffixes.
