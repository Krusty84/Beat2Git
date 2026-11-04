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

  const subtitle = artist || "Beat2Git";

  return `<svg xmlns="http://www.w3.org/2000/svg"
    width="400" height="64" viewBox="0 0 400 64"
    role="img" aria-label="Current/Last Track">

    <rect x="0.5" y="0.5"
      width="399" height="63" rx="10"
      fill="#f6f8fa" stroke="#d0d7de"/>

    <text x="16" y="41"
      font-family="Arial,sans-serif"
      font-size="24" fill="#57606a">♫</text>

    <rect x="48" y="10" width="118" height="16" rx="8"
      fill="#ddf4ff" stroke="#b6e3ff"/>
    <text x="107" y="21"
      text-anchor="middle"
      font-family="Arial,sans-serif"
      font-size="9" font-weight="700"
      fill="#0969da">Current/Last Track</text>

    <text x="48" y="41"
      font-family="Arial,sans-serif"
      font-size="14" font-weight="600"
      fill="#24292f">${clip(title, 34)}</text>

    <text x="48" y="56"
      font-family="Arial,sans-serif"
      font-size="12"
      fill="#57606a">${clip(subtitle, 42)}</text>

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
