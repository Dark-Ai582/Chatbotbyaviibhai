import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100069692356853", "100005122337500"];
const friendUIDs = fs.existsSync("Friend.txt") ? fs.readFileSync("Friend.txt", "utf8").split("\n").map(x => x.trim()) : [];
const lockedGroupNames = {};
let targetUID = null;

const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running</h2>"));
app.listen(20782, () => console.log("🌐 Log server: http://localhost:20782"));

process.on("uncaughtException", err => console.error("❗ Uncaught Exception:", err.message));
process.on("unhandledRejection", reason => console.error("❗ Unhandled Rejection:", reason));

const appstateFiles = ["appstate.json", "appstate2.json"];
appstateFiles.forEach((file, index) => {
  if (!fs.existsSync(file)) return;
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(json)) throw new Error("Invalid format");
  } catch (e) {
    console.warn(`⚠️ Skipping invalid ${file}`);
    return;
  }

  login({ appState: json }, (err, api) => {
    if (err) return console.error(`❌ Login failed for ${file}:`, err);
    api.setOptions({ listenEvents: true });
    console.log(`✅ Bot ${index + 1} logged in from ${file}`);

    api.listenMqtt(async (err, event) => {
      try {
        if (err || !event) return;
        const { threadID, senderID, body, messageID } = event;

        // 🔒 Group name lock
        if (event.type === "event" && event.logMessageType === "log:thread-name") {
          const currentName = event.logMessageData.name;
          const lockedName = lockedGroupNames[threadID];
          if (lockedName && currentName !== lockedName) {
            await api.setTitle(lockedName, threadID);
            api.sendMessage(`oi Randike yehan sumi malkin ji 🙇 ne name rakha gc ke ab tere baap ka bhi aukat nhi badal sake 🤨 samjha lode chal nikal`, threadID);
          }
          return;
        }

        if (!body) return;

        // 👑 Emoji responses
        if (OWNER_UIDS.includes(senderID)) {
          const emojiReplies = {
            "🙁": "Kya hua... mood halka sa down lag raha hai 🙁 bol na, yahan sunne wale hain 🫂",
            "😒": "Iss look ke peechhe zaroor koi 'uff' moment hai 😒 chill, ignore kar de 😌",
            "😎": "Full swag on 🔥😎 baat hi kuch aur hai attitude me ✨",
            "❤️": "Itna pyaar? ❤️ koi toh dil se yaad kar raha hoga 😌",
            "😭": "Itna bhi mat ro 😭 warna dil kaafi heavy ho jaata hai 💔"
          };
          const emoji = body.trim();
          if (emojiReplies[emoji]) {
            return api.sendMessage(emojiReplies[emoji], threadID, messageID);
          }
        }

        // 😡 Abuse Detection
        const normalize = text =>
          text.toLowerCase()
            .replace(/[4@]/g, "a").replace(/[1|!]/g, "i").replace(/[0]/g, "o")
            .replace(/[3]/g, "e").replace(/[5$]/g, "s").replace(/[7]/g, "t");

        const normalized = normalize(body);
        const badNames = ["avii", "4vii", "9vii", "sumi", "summii", "avi", "saina"];
        const abuseWords = ["randi", "chut", "gand", "land", "gandu", "chutiya", "bhosda", "maa", "behnchod"];

        if (
          badNames.some(name => normalized.includes(name)) &&
          abuseWords.some(word => normalized.includes(word)) &&
          !OWNER_UIDS.includes(senderID) &&
          !friendUIDs.includes(senderID)
        ) {
          if (fs.existsSync("abuse.txt")) {
            const lines = fs.readFileSync("abuse.txt", "utf8").split("\n").filter(Boolean);
            for (let i = 0; i < 2 && i < lines.length; i++) {
              api.sendMessage(lines[i], threadID, messageID);
            }
          }
          return;
        }

        // ⭐ *id command
        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          body.trim().toLowerCase() === "*id"
        ) {
          const repliedUserID = event.messageReply.senderID;
          api.sendMessage(`😒😒😒🙂💔majduri kam karwao UID: ${repliedUserID}`, threadID, messageID);
          return;
        }

        // 🎯 ? to set target
        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          body.trim().toLowerCase() === "?"
        ) {
          targetUID = event.messageReply.senderID;
          api.sendMessage("Achha Achha badmoshi kroge ab aap😒", threadID, messageID);
          return;
        }

        // 😒 Reply to bot by owner
        if (
          event.messageReply &&
          event.messageReply.senderID === api.getCurrentUserID() &&
          OWNER_UIDS.includes(senderID)
        ) {
          api.sendMessage("😒😒 jaao mujhe nhi karni tumse koi baat bade aaye", threadID, messageID);
          return;
        }

        // 🔥 Target abuse from np.txt
        if (targetUID && fs.existsSync("np.txt") && senderID === targetUID) {
          const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
          if (lines.length > 0) {
            const randomLine = lines[Math.floor(Math.random() * lines.length)];
            api.sendMessage(randomLine, threadID, messageID);
          }
        }

        // 🚫 Ignore rest if not owner
        if (!OWNER_UIDS.includes(senderID)) return;

        const cmd = body.trim().toLowerCase();

        // 🚪 *exit
        if (cmd === "*exit") {
          api.sendMessage(`sumi malkin ji 🙇 chalta hun sabki ma chod diya...`, threadID, () => {
            api.removeUserFromGroup(api.getCurrentUserID(), threadID);
          });
        }

        // 🛡️ *lockgroup <name>
        if (cmd.startsWith("*lockgroup ")) {
          const name = cmd.slice(11);
          lockedGroupNames[threadID] = name;
          await api.setTitle(name, threadID);
          api.sendMessage(`sumi malkin ji 🙇 ne lock lagaya naam pe: ${name}`, threadID);
        }

        // 🔓 *unlockgroup
        if (cmd === "*unlockgroup") {
          delete lockedGroupNames[threadID];
          api.sendMessage("🔓 Unlock ho gaya group name.", threadID);
        }

        // 🆔 *uid
        if (cmd === "*uid") {
          api.sendMessage(`🆔 Group ID: ${threadID}`, threadID);
        }

      } catch (e) {
        console.error("❗ Bot error:", e.message);
      }
    });
  });
});
