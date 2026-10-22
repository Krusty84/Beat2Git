# SPDX-FileCopyrightText: Copyright (c) 2026 Alexey Sedoykin
# SPDX-License-Identifier: MIT

import argparse
import json
import os
import random
import subprocess
import time
import warnings
from getpass import GetPassWarning, getpass
from pathlib import Path

import requests

# === SETTINGS ===
CHECK_INTERVAL = 30  # Track check interval (seconds)
# =================

DEFAULT_STATUS_EMOJI = ":musical_note:"
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

def load_config(config_path):
    try:
        with config_path.open(encoding='utf-8') as config_file:
            config = json.load(config_file)
    except FileNotFoundError:
        print("No config.json found. Enter your GitHub personal access token (classic).")
        while True:
            with warnings.catch_warnings():
                warnings.simplefilter('error', GetPassWarning)
                github_token = getpass("GitHub token: ").strip()
            if github_token:
                break
            print("Token must not be empty.")

        config = {'github_classic_token': github_token, 'status_emoji': DEFAULT_STATUS_EMOJI}
        config_fd = os.open(config_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            with os.fdopen(config_fd, 'w', encoding='utf-8') as config_file:
                json.dump(config, config_file, indent=2)
                config_file.write('\n')
        except BaseException:
            config_path.unlink()
            raise
        print(f"Configuration saved to {config_path}.")

    github_token = config.get('github_classic_token') if isinstance(config, dict) else None
    if not isinstance(github_token, str) or not github_token.strip():
        raise ValueError("config.json must contain a non-empty github_classic_token string.")
    status_emoji = config.get('status_emoji', DEFAULT_STATUS_EMOJI)
    if not isinstance(status_emoji, str) or not status_emoji.strip():
        raise ValueError("config.json status_emoji must be a non-empty string.")
    return github_token.strip(), status_emoji.strip()

def load_github_emojis():
    try:
        response = requests.get('https://api.github.com/emojis', timeout=10)
        response.raise_for_status()
        emojis = response.json()
        if not isinstance(emojis, dict) or not emojis:
            raise ValueError("GitHub returned an empty or invalid emoji list.")
        return [f":{name}:" for name in emojis]
    except (requests.RequestException, ValueError) as e:
        print(f"Warning: Could not load GitHub emojis: {e}. Using {DEFAULT_STATUS_EMOJI} until restart.")
        return [DEFAULT_STATUS_EMOJI]

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

    try:
        github_token, status_emoji = load_config(Path(__file__).resolve().with_name('config.json'))
    except (KeyboardInterrupt, EOFError):
        parser.exit(1, "Configuration cancelled.\n")
    except GetPassWarning:
        parser.exit(1, "Cannot hide token input. Run Beat2Git in a terminal.\n")
    except (OSError, ValueError) as e:
        parser.exit(1, f"Configuration error: {e}\n")

    random_emojis = load_github_emojis() if status_emoji == 'random' else None
    last_status = None
    print("Beat2Git - Share what you're listening to on Apple Music with the GitHub community.")
    print("Copyright (c) 2026 Alexey Sedoykin. MIT License.")

    while True:
        current_track = get_apple_music_track()
        
        # Update the status only when a track is playing and has changed.
        if current_track != "NOT_PLAYING" and current_track != last_status:
            # GitHub limits status
            short_status = (current_track[:77] + '...') if len(current_track) > 80 else current_track
            emoji = random.choice(random_emojis) if random_emojis else status_emoji
            if change_github_status(message=short_status, emoji=emoji, github_token=github_token):
                last_status = current_track
                
        time.sleep(args.interval)

if __name__ == "__main__":
    main()
