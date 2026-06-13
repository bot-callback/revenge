'use strict';

var plugin = require('@vendetta/plugin');
var ui = require('@vendetta/ui');
var common = require('@vendetta/metro/common');

const GuildStore = vendetta.metro.findByProps("getGuilds", "getGuild");
const GuildNotificationSettings = vendetta.metro.findByProps("updateGuildNotificationSettings");

// 初期設定の初期化
plugin.storage.startTime ??= "23:00";
plugin.storage.endTime ??= "07:00";
plugin.storage.isEnabled ??= true;
plugin.storage.mutedGuilds ??= {}; // 常に通知しないサーバーを保存する場所

let checkInterval;

// 指定された時間内（夜間）かどうかを判定する関数
function isQuietHours(start, end) {
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    
    const [sHour, sMin] = start.split(":").map(Number);
    const [eHour, eMin] = end.split(":").map(Number);
    
    const startMin = sHour * 60 + sMin;
    const endMin = eHour * 60 + eMin;

    if (startMin < endMin) {
        return currentMin >= startMin && currentMin < endMin;
    } else {
        return currentMin >= startMin || currentMin < endMin;
    }
}

// 通知とステータスの制御メイン処理
function updateStatusAndNotifications() {
    if (!plugin.storage.isEnabled) return;

    const userSettings = vendetta.metro.findByProps("updateRemoteSettings");
    if (!userSettings || !GuildNotificationSettings) return;

    const shouldBeQuiet = isQuietHours(plugin.storage.startTime, plugin.storage.endTime);
    const currentUser = common.getCurrentUser();
    if (!currentUser) return;

    // --- 1. 夜間の全体通知オフ（おやすみモード化） ---
    const currentStatus = currentUser.status; 
    if (shouldBeQuiet && currentStatus !== "dnd") {
        // 夜間なら「おやすみモード（dnd）」にして全部の通知の音・ポップアップを切る
        userSettings.updateRemoteSettings({ status: "dnd" });
    } else if (!shouldBeQuiet && currentStatus === "dnd") {
        // 朝になったら自動で「オンライン」に戻す
        userSettings.updateRemoteSettings({ status: "online" });
    }

    // --- 2. サーバーごとの通知コントロール（昼でも朝でも適用） ---
    const guilds = GuildStore.getGuilds();
    Object.keys(guilds).forEach((guildId) => {
        const isTargetGuild = plugin.storage.mutedGuilds[guildId];

        // 「夜間」である、または「昼間だけど通知しないサーバーに選ばれている」場合
        if (shouldBeQuiet || isTargetGuild) {
            // 通知を完全にオフ（Nothing）にする
            GuildNotificationSettings.updateGuildNotificationSettings(guildId, {
                suppress_everyone: true,
                suppress_roles: true,
                message_notifications: 2 // 2 = 通知なし
            });
        } else {
            // 夜間でもなく、個別設定もされていないサーバーは通常通知（All）に戻す
            GuildNotificationSettings.updateGuildNotificationSettings(guildId, {
                suppress_everyone: false,
                suppress_roles: false,
                message_notifications: 0 // 0 = すべてのメッセージ
            });
        }
    });
}

const onLoad = () => {
    updateStatusAndNotifications();
    checkInterval = setInterval(updateStatusAndNotifications, 60000); // 1分ごとにチェック
};

const onUnload = () => {
    clearInterval(checkInterval);
};

// Revengeの設定画面の見た目
const settingsView = () => {
    const [start, setStart] = common.React.useState(plugin.storage.startTime);
    const [end, setEnd] = common.React.useState(plugin.storage.endTime);
    const [, forceUpdate] = common.React.useReducer((x) => x + 1, 0);

    const guilds = GuildStore.getGuilds();
    const guildList = Object.values(guilds);

    return common.React.createElement(
        ui.settings.FormScrollContainer,
        {},
        common.React.createElement(ui.settings.FormSwitchRow, {
            label: "プラグインを有効にする",
            value: plugin.storage.isEnabled,
            onValueChange: (v) => {
                plugin.storage.isEnabled = v;
                updateStatusAndNotifications();
                forceUpdate();
            }
        }),
        common.React.createElement(ui.settings.FormInput, {
            label: "夜間の開始時間 (例: 23:00)",
            value: start,
            onChange: (v) => {
                plugin.storage.startTime = v;
                setStart(v);
                updateStatusAndNotifications();
            }
        }),
        common.React.createElement(ui.settings.FormInput, {
            label: "夜間の終了時間 (例: 07:00)",
            value: end,
            onChange: (v) => {
                plugin.storage.endTime = v;
                setEnd(v);
                updateStatusAndNotifications();
            }
        }),
        common.React.createElement(ui.settings.FormSection, { label: "朝や昼でも常に通知しないサーバーを選択" }),
        
        guildList.map((guild) => {
            return common.React.createElement(ui.settings.FormSwitchRow, {
                key: guild.id,
                label: guild.name,
                value: !!plugin.storage.mutedGuilds[guild.id],
                onValueChange: (v) => {
                    plugin.storage.mutedGuilds[guild.id] = v;
                    updateStatusAndNotifications();
                    forceUpdate();
                }
            });
        })
    );
};

exports.onLoad = onLoad;
exports.onUnload = onUnload;
exports.settingsView = settingsView;
