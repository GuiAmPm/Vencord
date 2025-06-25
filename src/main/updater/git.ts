/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { IpcEvents } from "@shared/IpcEvents";
import { execFile as cpExecFile } from "child_process";
import { ipcMain } from "electron";
import { join } from "path";
import { promisify } from "util";

import { serializeErrors } from "./common";

const VENCORD_SRC_DIR = join(__dirname, "..");

const execFile = promisify(cpExecFile);

const isFlatpak = process.platform === "linux" && !!process.env.FLATPAK_ID;

if (process.platform === "darwin")
    process.env.PATH = `/usr/local/bin:${process.env.PATH}`;

function git(...args: string[]) {
    const opts = { cwd: VENCORD_SRC_DIR };

    if (isFlatpak)
        return execFile("flatpak-spawn", ["--host", "git", ...args], opts);
    else return execFile("git", args, opts);
}

async function getRepo() {
    const res = await git("remote", "get-url", "origin");
    return res.stdout
        .trim()
        .replace(/git@(.+):/, "https://$1/")
        .replace(/\.git$/, "");
}

async function calculateGitChanges() {
    console.log("Fetching", await getRepo());
    await git("fetch");

    console.log("Branch");
    const branch = (await git("branch", "--show-current")).stdout.trim();

    console.log("Check origin");
    const existsOnOrigin =
        (await git("ls-remote", "origin", branch)).stdout.length > 0;

    console.log("Exists on origin?", existsOnOrigin);
    if (!existsOnOrigin) return [];

    console.log("get_res");
    const res = await git(
        "log",
        `HEAD...origin/${branch}`,
        "--pretty=format:%an/%h/%s",
    );

    console.log("get commits");
    const commits = res.stdout.trim();

    console.log("commits gotten");

    const result = commits
        ? commits.split("\n").map((line) => {
              const [author, hash, ...rest] = line.split("/");
              return {
                  hash,
                  author,
                  message: rest.join("/").split("\n")[0],
              };
          })
        : [];

    console.log(result);

    return result;
}

async function pull() {
    console.log("Pull");
    const res = await git("pull");
    return res.stdout.includes("Fast-forward");
}

async function build() {
    console.log("Building");
    const opts = { cwd: VENCORD_SRC_DIR };

    console.log("Node");
    const command = isFlatpak ? "flatpak-spawn" : "node";
    const args = isFlatpak
        ? ["--host", "node", "scripts/build/build.mjs"]
        : ["scripts/build/build.mjs"];

    console.log("Is Dev");
    if (IS_DEV) args.push("--dev");

    console.log("Res");
    const res = await execFile(command, args, opts);

    console.log("Build finished", !res.stderr.includes("Build failed"));
    return !res.stderr.includes("Build failed");
}

ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(getRepo));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(pull));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(build));
