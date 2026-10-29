# Beat2Git

Share what you're listening to on Apple Music with the GitHub community.

## What Is This?

Beat2Git is a Python script for macOS. It updates your GitHub profile status
with the track playing in Apple Music.

## Features

- Show the artist and track title (no more than 80 symbols, GitHub constraints) with a custom or random emoji.
- Set a custom playback check interval (default: 30 seconds).
- Update the status only when the track changes.
- Keep the last status when playback stops.

<img width="1904" height="1061" alt="image" src="https://github.com/user-attachments/assets/74457b05-8b46-4f8e-afc6-12d804baf4f1" />

## Who is it for?

For anyone who wants to share their vibe with the crowd.

## How to install and use

Requires macOS, Python 3, and the Music app.

1. Download this project and open its folder in Terminal.
2. Install the dependency: `python3 -m pip install requests`.
3. Create a [personal access token (classic)](https://github.com/settings/tokens/new)
   with the `user` scope.
4. Run: `python3 Beat2Git.py`.
5. On the first run, enter your GitHub classic token when prompted. 
   The script creates `config.json` next to `Beat2Git.py` and starts syncing.
   Later runs use the saved token without prompting.

Set `status_emoji` in `config.json` to choose the status emoji:

```json
{
  "github_classic_token": "YOUR_GITHUB_TOKEN",
  "status_emoji": ":musical_note:"
}
```

Use a fixed emoji such as `":headphones:"`, or set `"status_emoji": "random"`
to select a random GitHub emoji when the track changes.

Use `--interval` to set the check interval in seconds. Enter a positive integer:

```sh
python3 Beat2Git.py --interval 60
```

## How to start Music.app with Beat2Git

Use **Automator.app**

```sh
open -a Music
cd P_A_T_H_T_O/Beat2Git || exit 1
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 \
    Beat2Git.py > /dev/null 2>&1 &
```

<img width="1282" height="450" alt="image" src="https://github.com/user-attachments/assets/3e78ee59-ed8e-411f-b1f9-042d0a2719e1" />

When macOS asks, allow access to Music and System Events.
Play a track in Music and keep the script running. Press `Ctrl+C` to stop.
