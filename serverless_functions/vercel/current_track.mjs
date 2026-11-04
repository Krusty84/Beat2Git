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

export function makeSvg(message) {
  const separator = message?.indexOf(" — ") ?? -1;

  const artist = separator >= 0 ? message.slice(0, separator).trim() : "";

  const title = message
    ? separator >= 0
      ? message.slice(separator + 3).trim()
      : message.trim()
    : "No music status";

  const subtitle = artist || "Beat2Git · Apple Music";
  const label = message ? "BEAT2GIT - LAST TRACK" : "NO TRACK";

  const safeTitle = xml(title);
  const safeSubtitle = clip(subtitle, 44);
  const safeLabel = xml(label);

  const longTitle = [...title].length > 26;

  const titleBlock = longTitle
    ? `
      <clipPath id="titleClip">
        <rect x="92" y="30" width="250" height="22" rx="2" />
      </clipPath>

      <g clip-path="url(#titleClip)">
        <g>
          <text
            x="92"
            y="46"
            font-family="Arial, sans-serif"
            font-size="18"
            font-weight="700"
            fill="#24292f"
          >${safeTitle}   •   ${safeTitle}</text>
          <animateTransform
            attributeName="transform"
            type="translate"
            from="0 0"
            to="-220 0"
            dur="10s"
            repeatCount="indefinite"
          />
        </g>
      </g>
    `
    : `
      <text
        x="92"
        y="46"
        font-family="Arial, sans-serif"
        font-size="18"
        font-weight="700"
        fill="#24292f"
      >${clip(title, 26)}</text>
    `;

  return `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="380"
    height="84"
    viewBox="0 0 380 84"
    role="img"
    aria-label="Current or last track"
  >
    <defs>
      <linearGradient id="accent" x1="0" x2="1">
        <stop offset="0%" stop-color="#2da44e" />
        <stop offset="100%" stop-color="#1f883d" />
      </linearGradient>
    </defs>

    <rect
      x="0.5"
      y="0.5"
      width="379"
      height="83"
      rx="12"
      fill="#ffffff"
      stroke="#d0d7de"
    />

    <!-- icon tile -->
    <rect
      x="16"
      y="16"
      width="60"
      height="52"
      rx="10"
      fill="#f6f8fa"
      stroke="#d8dee4"
    />

    <text
      x="38"
      y="49"
      text-anchor="middle"
      font-family="Arial, sans-serif"
      font-size="24"
      fill="#1f883d"
    >♫</text>

    <!-- animated equalizer -->
    <g transform="translate(48, 27)">
      <rect x="0"  y="12" width="3" height="10" rx="1.5" fill="url(#accent)">
        <animate attributeName="y" values="12;7;12" dur="1s" repeatCount="indefinite" />
        <animate attributeName="height" values="10;15;10" dur="1s" repeatCount="indefinite" />
      </rect>
      <rect x="6"  y="9" width="3" height="13" rx="1.5" fill="url(#accent)">
        <animate attributeName="y" values="9;4;9" dur="0.9s" repeatCount="indefinite" />
        <animate attributeName="height" values="13;18;13" dur="0.9s" repeatCount="indefinite" />
      </rect>
      <rect x="12" y="6" width="3" height="16" rx="1.5" fill="url(#accent)">
        <animate attributeName="y" values="6;12;6" dur="1.1s" repeatCount="indefinite" />
        <animate attributeName="height" values="16;10;16" dur="1.1s" repeatCount="indefinite" />
      </rect>
      <rect x="18" y="10" width="3" height="12" rx="1.5" fill="url(#accent)">
        <animate attributeName="y" values="10;5;10" dur="0.85s" repeatCount="indefinite" />
        <animate attributeName="height" values="12;17;12" dur="0.85s" repeatCount="indefinite" />
      </rect>
    </g>

    <!-- label -->
    <text
      x="92"
      y="20"
      font-family="Arial, sans-serif"
      font-size="10"
      font-weight="700"
      letter-spacing="0.5px"
      fill="#57606a"
    >${safeLabel}</text>

    <!-- title -->
    ${titleBlock}

    <!-- subtitle -->
    <text
      x="92"
      y="64"
      font-family="Arial, sans-serif"
      font-size="12"
      fill="#57606a"
    >${safeSubtitle}</text>

    <!-- accent line -->
    <rect
      x="92"
      y="70"
      width="70"
      height="3"
      rx="1.5"
      fill="url(#accent)"
    >
      <animate
        attributeName="width"
        values="48;120;48"
        dur="2.2s"
        repeatCount="indefinite"
      />
    </rect>
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
