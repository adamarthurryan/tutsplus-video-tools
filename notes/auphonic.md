

# interfacing with the Auphonic API


Upload a local file and start a production with the following.

    curl -X POST https://auphonic.com/api/simple/productions.json \
        -u "auphonic_username:auphonic_password" \
        -F "input_file=@/folder/filename.wav" \
        -F "denoise=true" \
        -F "loudnesstarget=-23" \
        -F "action=start"


The above will upload the file to Auphonic and start a new production. It will return the production uuid. Next retrieve the production status.

    curl -X GET https://auphonic.com/api/production/production_uuid.json \
        -u "auphonic_username:auphonic_password" 


When the status is "Done", a `download_url` will be available for the production's output file. Download the output file with the as follows.

     curl -O -X GET https://auphonic.com/api/download/audio-result/rest_of_download_url_to/file.mp3 \
        -u "auphonic_username:auphonic_password" 
