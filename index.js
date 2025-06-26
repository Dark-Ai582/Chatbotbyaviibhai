import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100069692356853", "100005122337500"];
const friendUIDs = fs.existsSync("Friend.txt") ? fs.readFileSync("Friend.txt", "utf8").split("\n").map(x => x.trim()) : [];
const lockedGroupNames = {};

let rkbInterval = null, stopRequested = false;
let mediaLoopInterval = null, lastMedia = null;
let targetUID = null;

// ✅ Express server
const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running</h2>"));
app.listen(20782, () => console.log("🌐 Log server: http://localhost:20782"));

// ✅ Handle uncaught errors
process.on("uncaughtException", (err) => console.error("❗ Uncaught Exception:", err.message));
process.on("unhandledRejection", (reason) => console.error("❗ Unhandled Rejection:", reason));

// ✅ Load and login all valid appstate files
const appstateFiles = ["appstate.json", "appstate2.json", "appstate3.json"];
appstateFiles.forEach((file, i) => {
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
    console.log(`✅ Bot ${i + 1} logged in from ${file}`);

    api.listenMqtt(async (err, event) => {
      try {
        if (err || !event) return;
        const { threadID, senderID, body, messageID } = event;

        // Lock group name
        if (event.type === "event" && event.logMessageType === "log:thread-name") {
          const currentName = event.logMessageData.name;
          const lockedName = lockedGroupNames[threadID];
          if (lockedName && currentName !== lockedName) {
            await api.setTitle(lockedName, threadID);
            api.sendMessage(`oi Randike yehan sumi malkin ji 🙇 ne name rakha gc ke ab tere baap ka bhi aukat nhi badal sake 🤨 samjha lode chal nikal`, threadID);
          }
          return;
        }

        // Emoji replies for owner
        if (OWNER_UIDS.includes(senderID)) {
          const emoji = body.trim();
          const emojiReplies = {
            "🙁": "Kya hua... mood halka sa down lag raha hai 🙁 bol na, yahan sunne wale hain 🫂",
            "😒": "Iss look ke peechhe zaroor koi 'uff' moment hai 😒 chill, ignore kar de 😌",
            "😎": "Full swag on 🔥😎 baat hi kuch aur hai attitude me ✨"
            // ... add more as needed
          };
          if (emojiReplies[emoji]) {
            return api.sendMessage(emojiReplies[emoji], threadID, messageID);
          }
        }

        if (!body) return;
        const normalize = (text) =>
          text.toLowerCase()
            .replace(/[4@]/g, "a")
            .replace(/[1|!]/g, "i")
            .replace(/[0]/g, "o")
            .replace(/[3]/g, "e")
            .replace(/[5$]/g, "s")
            .replace(/[7]/g, "t");

        const normalized = normalize(body.toLowerCase());
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

        // *id reply
        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          body.trim().toLowerCase() === "*id"
        ) {
          const repliedUserID = event.messageReply.senderID;
          api.sendMessage(`😒😒😒🙂💔majduri kam karwao UID: ${repliedUserID}`, threadID, messageID);
          return;
        }

        // Hidden target
        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          body.trim().toLowerCase() === "?"
        ) {
          const repliedUserID = event.messageReply.senderID;
          targetUID = repliedUserID;
          api.sendMessage("Achha Achha badmoshi kroge ab aap😒", threadID, messageID);
          return;
        }

        // Admin reply to bot
        if (
          event.messageReply &&
          event.messageReply.senderID === api.getCurrentUserID() &&
          OWNER_UIDS.includes(senderID)
        ) {
          api.sendMessage("😒😒 jaao mujhe nhi karni tumse koi baat bade aaye", threadID, messageID);
          return;
        }

        if (targetUID && fs.existsSync("np.txt") && senderID === targetUID) {
          const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
          if (lines.length > 0) {
            const randomLine = lines[Math.floor(Math.random() * lines.length)];
            api.sendMessage(randomLine, threadID, messageID);
          }
        }

        if (!OWNER_UIDS.includes(senderID)) return;

        const trimmed = body.trim().toLowerCase();
        const args = trimmed.split(" ");
        const cmd = args[0];
        const input = args.slice(1).join(" ");

        if (cmd === "*exit") {
          api.sendMessage(`sumi malkin ji 🙇 chalta hun sabki ma chod diya...`, threadID, () => {
            api.removeUserFromGroup(api.getCurrentUserID(), threadID);
          });
        }

        // Add more admin commands here...

      } catch (e) {
        console.error("❗ Bot error:", e.message);
      }
    });
  });
});
