# SPDX-FileCopyrightText: Copyright (c) 2026 Alexey Sedoykin
# SPDX-License-Identifier: MIT

import argparse
import json
import subprocess
import time
from pathlib import Path

import requests

# === SETTINGS ===
CHECK_INTERVAL = 30  # Track check interval (seconds)
STATUS_EMOJI = ":musical_note:"  # Status emoji
# =================

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

# Read the current track only while Music is playing.
getCurrentAppleMusicTrack = '''
tell application "System Events"
    set isRunning to exists (processes where name is "Music")
end tell

if isRunning then
    tell application "Music"
        if player state is playing then
            return (get artist of current track) & " — " & (get name of current track)
        else
            return "NOT_PLAYING"
        end if
    end tell
else
    return "NOT_PLAYING"
end if
'''

def get_apple_music_track():
    try:
        result = subprocess.run(
            ['osascript', '-e', getCurrentAppleMusicTrack],
            capture_output=True, text=True, check=True, timeout=10,
        )
        return result.stdout.strip() or "NOT_PLAYING"
    except subprocess.CalledProcessError as e:
        print(f"AppleScript error: {e.stderr.strip()}")
        return "NOT_PLAYING"
    except (OSError, subprocess.TimeoutExpired) as e:
        print(f"AppleScript error: {e}")
        return "NOT_PLAYING"

def change_github_status(message, emoji, github_token):
    query = """
    mutation ($message: String, $emoji: String) {
      changeUserStatus(input: {message: $message, emoji: $emoji}) {
        status {
          message
          emoji
        }
      }
    }
    """
    variables = {"message": message, "emoji": emoji}
    try:
        response = requests.post(
            GITHUB_GRAPHQL_URL,
            json={'query': query, 'variables': variables},
            headers={"Authorization": f"Bearer {github_token}"},
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
        result = (payload.get('data') or {}).get('changeUserStatus') or {}
        if payload.get('errors') or not result.get('status'):
            error = payload.get('errors') or 'No status returned'
            print(f"GitHub API error: {error}")
            return False
    except (requests.RequestException, ValueError) as e:
        print(f"GitHub request failed: {e}")
        return False
    print(f"GitHub status updated: {emoji} {message}")
    return True

def main():
    parser = argparse.ArgumentParser(description="Sync Apple Music playback with your GitHub status.")
    parser.add_argument(
        '--interval', type=int, default=CHECK_INTERVAL, metavar='SECONDS',
        help='Playback check interval in seconds (default: %(default)s)',
    )
    args = parser.parse_args()
    if args.interval <= 0:
        parser.error('--interval must be greater than 0')

    with Path(__file__).resolve().with_name('config.json').open(encoding='utf-8') as config_file:
        github_token = json.load(config_file)['github_classic_token']

    last_status = None
    print("Beat2Git - Share what you're listening to on Apple Music with the GitHub community.")
    print("Copyright (c) 2026 Alexey Sedoykin. MIT License.")

    while True:
        current_track = get_apple_music_track()
        
        # Update the status only when a track is playing and has changed.
        if current_track != "NOT_PLAYING" and current_track != last_status:
            # GitHub limits status
            short_status = (current_track[:77] + '...') if len(current_track) > 80 else current_track
            if change_github_status(message=short_status, emoji=STATUS_EMOJI, github_token=github_token):
                last_status = current_track
                
        time.sleep(args.interval)

if __name__ == "__main__":
    main()
