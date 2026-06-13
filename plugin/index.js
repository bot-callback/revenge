import { React, metro } from "@vendetta/metro/common";
import { ui } from "@vendetta";
import { storage } from "@vendetta/plugin";

// --- 必要なコンポーネントや関数をDiscordの内部から引っ張る ---
const { ScrollView, Text, View, TextInput, Switch } = ui.components;
const { getGuilds } = metro.findByProps("getGuilds");

// --- プラグインの初期設定（保存用ストレージの準備） ---
storage.startTime = storage.startTime ?? "22:00"; // デフォルト開始：夜10時
storage.endTime = storage.endTime ?? "07:00";     // デフォルト終了：朝7時
storage.ignoredGuilds = storage.ignoredGuilds ?? {}; // ミュートしないサーバー一覧

// --- 🛠️ 設定画面の見た目と処理 ---
function Settings() {
  // 画面を再描画するためのフック
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  
  // スマホに入っているサーバー（ギルド）一覧を取得
  const guilds = Object.values(getGuilds());

  // サーバーの除外切り替え
  const toggleGuild = (guildId) => {
    storage.ignoredGuilds[guildId] = !storage.ignoredGuilds[guildId];
    forceUpdate();
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: "#2f3136" }}>
      {/* 時間設定セクション */}
      <View style={{ marginBottom: 24, padding: 16, backgroundColor: "#36393f", borderRadius: 8 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
          ⏰ ミュート時間の設定
        </Text>
        
        <Text style={{ color: "#b9bbbe", marginBottom: 4 }}>開始時間 (例: 22:00)</Text>
        <TextInput
          value={storage.startTime}
          onChange={(v) => { storage.startTime = v; forceUpdate(); }}
          style={{ backgroundColor: "#202225", color: "#fff", padding: 8, borderRadius: 4, marginBottom: 12 }}
        />

        <Text style={{ color: "#b9bbbe", marginBottom: 4 }}>終了時間 (例: 07:00)</Text>
        <TextInput
          value={storage.endTime}
          onChange={(v) => { storage.endTime = v; forceUpdate(); }}
          style={{ backgroundColor: "#202225", color: "#fff", padding: 8, borderRadius: 4 }}
        />
      </View>

      {/* サーバー選択セクション */}
      <View style={{ padding: 16, backgroundColor: "#36393f", borderRadius: 8, marginBottom: 40 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 4 }}>
          🛡️ 対象外にするサーバー
        </Text>
        <Text style={{ color: "#b9bbbe", fontSize: 12, marginBottom: 16 }}>
          ONにしたサーバーは、指定時間内であってもずっと通知が届きます。
        </Text>

        {guilds.map((guild) => (
          <View 
            key={guild.id} 
            style={{ 
              flexDirection: "row", 
              justifyContent: "space-between", 
              alignItems: "center", 
              paddingVertical: 12, 
              borderBottomWidth: 1, 
              borderBottomColor: "#202225" 
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, flex: 1, marginRight: 8 }} numberOfLines={1}>
              {guild.name}
            </Text>
            <Switch
              value={!!storage.ignoredGuilds[guild.id]}
              onValueChange={() => toggleGuild(guild.id)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// --- ⚙️ プラグインのメイン処理（バックグラウンドで動く部分） ---
export default {
  onLoad: () => {
    console.log("[Death notification] プラグインが正常に読み込まれました");
    
    // ※ ここに実際の通知を止める（インターセプトする）処理が入ります。
    // 今回はまず「しっかり設定画面を作って保存できるようにする」ところを完璧にしました！
  },
  onUnload: () => {
    console.log("[Death notification] プラグインが停止しました");
  },
  settingsView: Settings
};
