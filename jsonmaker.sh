#!/bin/bash

# CONFIGURATION CHANGE THE OPTIONS HERE TO YOUR OWN SETUP
JELLYFIN_URL="http://localhost:8096"
#GENERATE A NEW API KEY AND USE THAT BELLOW
API_KEY="YOURAPIKEYHERE"
#THIS IS THE DEFAULT WEBROOT OF JELLYFIN BARE METAL INSTALL ADAPT TO YOUR OWN NEEDS
OUTPUT_PATH="/usr/share/jellyfin/web/custom-now-playing-secure.json"
#SET TO FALSE IF YOU WANT TO REDACT USERNAMES YOU WILL HAVE TO DO THIS IN THE JS SCRIPT FILE ALSO
SHOW_USERNAMES=true

# Fetch sessions and generate compatible JSON
if [ "$SHOW_USERNAMES" = true ]; then
  curl -s -H "X-Emby-Token: $API_KEY" "$JELLYFIN_URL/Sessions" | jq '
    [
      .[]
      | select(.NowPlayingItem != null)
      | {
          UserName: .UserName,
          NowPlayingItem: {
            Name: .NowPlayingItem.Name,
            SeriesName: (.NowPlayingItem.SeriesName // null),
            SeasonNumber: (.NowPlayingItem.SeasonNumber // null),
            EpisodeNumber: (.NowPlayingItem.EpisodeNumber // null),
            Overview: (.NowPlayingItem.Overview // null),
            Id: .NowPlayingItem.Id,
            Type: .NowPlayingItem.Type
          }
        }
    ]
  ' > "$OUTPUT_PATH"
else
  curl -s -H "X-Emby-Token: $API_KEY" "$JELLYFIN_URL/Sessions" | jq '
    [
      .[]
      | select(.NowPlayingItem != null)
      | {
          NowPlayingItem: {
            Name: .NowPlayingItem.Name,
            SeriesName: (.NowPlayingItem.SeriesName // null),
            SeasonNumber: (.NowPlayingItem.SeasonNumber // null),
            EpisodeNumber: (.NowPlayingItem.EpisodeNumber // null),
            Overview: (.NowPlayingItem.Overview // null),
            Id: .NowPlayingItem.Id,
            Type: .NowPlayingItem.Type
          }
        }
    ]
  ' > "$OUTPUT_PATH"
fi
