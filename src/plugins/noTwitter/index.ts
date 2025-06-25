/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

export default definePlugin({
    name: "No Twitter / No Stickers / No YTShorts / No Instagram",
    gui: true,
    description:
        "Completely remove Twitter/Stickers/Shorts/Instagram/Tiktok/Twitch trash and replace with the poop emoji.",
    dependencies: ["MessageUpdaterAPI"],
    authors: [],

    patches: [
        {
            find: "this.renderAttachments(",
            replacement: {
                match: /(?<=\i=)this\.render(?:Attachments|Embeds|StickersAccessories)\((\i)\)/g,
                replace: "$self.shouldHide($1)?null:$&",
            },
        },
    ],

    shouldHide(item) {
        const mask =
            /💩|(https:\/\/(www\.)?)?(((fixv)?x.com(\/(\w|\d)+\/status\/\d+)?)|((dd)?instagram.com(\/reel\/(\w|\d)+\/igsh=(\w|\d|=)+)?)|(youtube.com|youtu\.be)\/shorts\/(\w|\d)+)|(vx)?twitter\.com|twitch\.com|tiktok\.com(\/[@](\w|\d)+\/video\/\d+)?/gim;

        const originalTextMatches = mask.test(item.content);

        if (originalTextMatches) {
            item.content = item.content.replaceAll(mask, "💩");
            return true;
        }

        if (
            (item.stickers && item.stickers.length > 0) ||
            (item.stickerItems && item.stickerItems.length > 0)
        ) {
            return true;
        }

        if (item.embeds && item.embeds.some((e) => mask.test(e.url))) {
            return true;
        }

        return false;
    },
});
