const QUERY = `query($login: String!) {
  user(login: $login) {
    status { message organization { login } }
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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="104" viewBox="0 0 640 104" role="img">
    <rect width="640" height="104" rx="14" fill="#101827"/>
    <rect x="18" y="20" width="64" height="64" rx="12" fill="#25354d"/>
    <text x="50" y="63" text-anchor="middle" fill="#70e6c3" font-family="Arial,sans-serif" font-size="36">♫</text>
    <text x="100" y="34" fill="#70e6c3" font-family="Arial,sans-serif" font-size="11">BEAT2GIT · LAST TRACK</text>
    <text x="100" y="61" fill="#ffffff" font-family="Arial,sans-serif" font-size="19" font-weight="bold">${clip(title, 42)}</text>
    <text x="100" y="83" fill="#a6b3c8" font-family="Arial,sans-serif" font-size="13">${clip(subtitle, 57)}</text>
  </svg>`;
}

export async function GET() {
  const login = process.env.GITHUB_LOGIN?.trim();
  const token = process.env.GITHUB_TOKEN;
  if (!token || !login) {
    return new Response("GITHUB_TOKEN or LOGIN is missing", { status: 503 });
  }

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Beat2Git-Vercel-SVG",
      },
      body: JSON.stringify({ query: QUERY, variables: { login } }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);

    const result = await response.json();
    if (result.errors?.length || !result.data?.user) {
      throw new Error("GitHub GraphQL response error");
    }

    const status = result.data.user.status;
    const message =
      status?.organization == null && typeof status?.message === "string"
        ? status.message.trim()
        : "";

    return new Response(makeSvg(message), { status: 200, headers: HEADERS });
  } catch (error) {
    console.error("Beat2Git SVG error:", error);
    return new Response("Unable to load GitHub status", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
