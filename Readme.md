okay so this works on linux systems (not a clue on windows installs, currently im not running or trying to run jellyfin on windows someone else can port this if they like and submit a pull request im open to that infact that would really help me out, 3 kids one being a new born means i dont get as much time doing this as i would like) 

# install instructions

download crontab folder to your server BUT NOT INSIDE WEBROOT this is important

now you simply need to edit the obvious parts in jsonmaker.sh (api key can be generated in the admin pannel > api keys inside of jellyfin) save and run

`sudo crontab -e` 

add the following but alter the path to where it is saved on your system

`*/2 * * * * /path/to/jsonmaker.sh` 

now you have to inject a script to index.html in jellyfins webroot

add `<script defer src="nowplaying.js"></script>` before the </body> tag

now download the nowplaying.js and save it in your jellyfin webroot 

reload your client and clear cache if needed 

## configuration
you can disable usernames on the jsonmaker.sh and the nowplaying.js just look for the config option in them for usernames.. this gives you anonymous ones

## final notes
this is a beta proof of concept that doesnt require a plugin, this would be better as a plugin but tbh it was a challenge posed to me on discord so naturally its not that hard to do in specific use cases

im not a css wizard and this was hammed together so wont look great on every single platform feel free to submit pull requests or comments with your css that makes this better or even add suggestion ideas for how to make it look less shit 

![Screenshot 2025-06-19 001452](https://github.com/user-attachments/assets/9677d592-341d-45ef-bf4d-ccd63a37c1d5)
![Screenshot 2025-06-19 001440](https://github.com/user-attachments/assets/21fd8731-67d3-4ccc-aaec-0c89df9aa8c4)

