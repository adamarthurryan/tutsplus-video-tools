## Workflow


    split ----> auphonic --\ 
           \-----------------> combine


    auphonic-workflow --output-folder auphonic *.mp4


    rm -r temp
    split --output-folder temp *.mp4
    auphonic --output-folder temp split/*.m4a
    combine --output-folder auphonic --audio-extension .mp3 split/*.m4v
    rm -r temp