/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import "./styles.css";

import definePlugin from "@utils/types";

export default definePlugin({
    name: "No Stickers",
    gui: true,
    description: "Completely remove Stickers.",
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
        if (
            (item.stickers && item.stickers.length > 0) ||
            (item.stickerItems && item.stickerItems.length > 0)
        ) {
            return true;
        }

        return false;
    },
});
