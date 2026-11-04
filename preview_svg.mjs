/*
 * SPDX-FileCopyrightText: Copyright (c) 2026 Alexey Sedoykin
 * SPDX-License-Identifier: MIT
 */

import { writeFile } from "node:fs/promises";
import { makeSvg } from "./serverless_functions/vercel/current_track.mjs";

const message = "Marlene Dietrich — Lili Marlene";

await writeFile("preview.svg", makeSvg(message), "utf8");
console.log("SVG generated: preview.svg");
