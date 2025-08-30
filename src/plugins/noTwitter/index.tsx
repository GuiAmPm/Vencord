/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import "./styles.css";

import { get, set } from "@api/DataStore";
import { updateMessage } from "@api/MessageUpdater";
import { ImageInvisible, ImageVisible } from "@components/Icons";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { ChannelStore } from "@webpack/common";
import { MessageSnapshot } from "@webpack/types";

const KEY = "HideAttachments_HiddenIds";

let hiddenMessages = new Set<string>();

async function getHiddenMessages() {
    hiddenMessages = (await get(KEY)) ?? new Set();
    return hiddenMessages;
}

const saveHiddenMessages = (ids: Set<string>) => set(KEY, ids);

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
        const h = hiddenMessages.has(item.id);

        if (h) {
            return true;
        }

        const mask =
            /(?:^| +)(?:https?:\/\/)?(?:www\.)?(?:(?:fixv)?x\.com|twitter\.com|(?:dd|kk)?instagram\.com|twitch\.com|reddit\.com|(?:youtube\.com|youtu\.be)\/shorts|tiktok.com)[^ \n$]*/gim;

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

        if (
            item.embeds &&
            (originalTextMatches || item.embeds.some((e) => mask.test(e.url)))
        ) {
            return true;
        }

        return false;
    },

    renderMessagePopoverButton(msg) {
        // @ts-ignore - discord-types lags behind discord.
        const hasAttachmentsInShapshots = msg.messageSnapshots.some(
            (snapshot: MessageSnapshot) => snapshot?.message.attachments.length,
        );

        if (
            !msg.attachments.length &&
            !msg.embeds.length &&
            !msg.stickerItems.length &&
            !hasAttachmentsInShapshots
        )
            return null;

        const isHidden = hiddenMessages.has(msg.id);

        return {
            label: isHidden ? "Show Media" : "Hide Media",
            icon: isHidden ? ImageVisible : ImageInvisible,
            message: msg,
            channel: ChannelStore.getChannel(msg.channel_id),
            onClick: () => this.toggleHide(msg.channel_id, msg.id),
        };
    },

    renderMessageAccessory({ message }) {
        if (!this.shouldHide(message.id)) return null;

        return (
            <span
                className={classes(
                    "vc-hideAttachments-accessory",
                    !message.content && "vc-hideAttachments-no-content",
                )}
            >
                Media Hidden
            </span>
        );
    },

    async start() {
        await getHiddenMessages();
    },

    stop() {
        hiddenMessages.clear();
    },

    async toggleHide(channelId: string, messageId: string) {
        const ids = await getHiddenMessages();
        if (!ids.delete(messageId)) ids.add(messageId);

        await saveHiddenMessages(ids);
        updateMessage(channelId, messageId);
    },
});
