/*
 * SPDX-FileCopyrightText: Copyright (c) 2026 Alexey Sedoykin
 * SPDX-License-Identifier: MIT
 */

const QUERY = `query($login: String!) {
  user(login: $login) {
    status {
      message
    }
  }
}`;

const HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": "no-cache, max-age=0, must-revalidate",
  "Vercel-CDN-Cache-Control": "public, s-maxage=60",
  "X-Content-Type-Options": "nosniff",
};

function xml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char],
  );
}

function clip(value, max) {
  const chars = [...String(value)];
  return xml(
    chars.length > max
      ? chars.slice(0, max - 1).join("") + "…"
      : chars.join(""),
  );
}

function makeSvg(message) {
  const separator = message?.indexOf(" — ") ?? -1;
  const artist = separator >= 0 ? message.slice(0, separator) : "";
  const title = message
    ? separator >= 0
      ? message.slice(separator + 3)
      : message
    : "No music status";
  const subtitle =
    artist || (message ? "GitHub status" : "Beat2Git · Apple Music");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="120" viewBox="0 0 640 120" role="img" aria-label="Current track">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.16"/>
      </filter>
    </defs>

    <!-- Background SVG -->
    <rect width="640" height="120" fill="transparent"/>

    <!-- Card -->
    <rect x="8" y="8" width="624" height="104" rx="18"
      fill="#0b1220"
      stroke="#d0d7de"
      stroke-opacity="0.18"
      filter="url(#shadow)"/>

    <!-- Icon -->
    <rect x="28" y="28" width="64" height="64" rx="14" fill="#23324d"/>
    <text x="60" y="71" text-anchor="middle"
      fill="#6ee7c8" font-family="Arial,sans-serif" font-size="36">♫</text>

    <!-- Text -->
    <text x="110" y="42"
      fill="#5eead4" font-family="Arial,sans-serif" font-size="11" font-weight="bold">
      BEAT2GIT · LAST TRACK
    </text>

    <text x="110" y="72"
      fill="#ffffff" font-family="Arial,sans-serif" font-size="19" font-weight="bold">
      ${clip(title, 42)}
    </text>

    <text x="110" y="95"
      fill="#a9b7cc" font-family="Arial,sans-serif" font-size="13">
      ${clip(subtitle, 57)}
    </text>
  </svg>`;
}

export async function GET() {
  const login = process.env.GITHUB_LOGIN?.trim();
  const token = process.env.GITHUB_TOKEN;

  if (!token || !login) {
    return new Response("GITHUB_TOKEN or GITHUB_LOGIN is missing", {
      status: 503,
    });
  }

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Beat2Git-Vercel-SVG",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { login },
      }),
      signal: AbortSignal.timeout(5000),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("GitHub HTTP error:", response.status, result);
      throw new Error(`GitHub HTTP ${response.status}`);
    }

    if (result.errors?.length) {
      console.error(
        "GitHub GraphQL errors:",
        JSON.stringify(result.errors, null, 2),
      );
      throw new Error("GitHub GraphQL response error");
    }

    const message =
      typeof result.data?.user?.status?.message === "string"
        ? result.data.user.status.message.trim()
        : "";

    return new Response(makeSvg(message), {
      status: 200,
      headers: HEADERS,
    });
  } catch (error) {
    console.error("Beat2Git SVG error:", error);
    return new Response("Unable to load GitHub status", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
