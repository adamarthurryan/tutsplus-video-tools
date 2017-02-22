# VST Workflow


The following script processes a lesson with the command-line VST host MrsWatson.

    # split video file
    tvt-split lesson.mp4
    
    # transcode audio to wav, but use a .pcm extension
    ffmpeg -i split/lesson.m4a -f wav split/lesson.pcm

    # use mrswatson VST host to process audio
    #   eg. in this instance with the deverberate plugin 
    #   and preset (aka "program") number 2 (hall reverb)
    mrswatson64 -p deverberate,2 -i split/lesson.pcm -o lesson.deverb.wav

    # recombine video file
    tvt-combine --extension .deverb.mp4 --audio-extension .deverb.wav split/lesson.m4v

    # combined video will be in "split" folder!




Or for a whole folder of lessons:

    # split the videos
    tvt-split *.mp4

    # transcode audio to wav and change the extension to .pcm
    tvt-filter --output-folder . --output-suffix "" --output-extension .wav split/*.m4a
    mmv \*.wav \#1.pcm
    
    # This can also be done with ffmpeg and for:
    # for x in split/*.m4a; do ffmpeg -i "$x" -f wav "${x:r}.pcm"; done

    # use mrswatson VST host to process audio
    #   eg. in this instance with the deverberate plugin 
    #   and preset (aka "program") number 2 (hall reverb)
    for x in split/*.pcm; do mrswatson64 -p deverberate,2 -i "$x" -o "${x:r}.deverb.wav"; done

    # ... further processing

    # recombine the video with the new audio
    tvt-combine --output-suffix -deverb --audio-extension .deverb.wav split/*.m4v
