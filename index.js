import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100001668542035", "100005122337500"];
const friendUIDs = fs.existsSync("Friend.txt") ? fs.readFileSync("Friend.txt", "utf8").split("\n").map(x => x.trim()) : [];
const lockedGroupNames = {};
let targetUID = null;

// ✅ Web log
const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running</h2>"));
app.listen(20782, () => console.log("🌐 Bot server: http://localhost:20782"));

// ✅ Errors
process.on("uncaughtException", err => console.error("❗ Error:", err.message));
process.on("unhandledRejection", reason => console.error("❗ Promise Error:", reason));

// ✅ Files to check
const appstateFiles = ["appstate.json", "appstate2.json"];

for (const file of appstateFiles) {
  if (!fs.existsSync(file)) {
    console.log(`⚠️ Skipping missing file: ${file}`);
    continue;
  }

  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(json)) throw new Error("Invalid format");
  } catch (e) {
    console.log(`❌ Invalid appstate in ${file}, skipping.`);
    continue;
  }

  login({ appState: json }, (err, api) => {
    if (err) return console.error(`❌ Login failed for ${file}:`, err);
    api.setOptions({ listenEvents: true });
    console.log(`✅ Bot logged in from ${file}`);

    api.listenMqtt(async (err, event) => {
      try {
        if (err || !event) return;
        const { threadID, senderID, body, messageID } = event;

        // 🔒 Group Name Lock
        if (event.type === "event" && event.logMessageType === "log:thread-name") {
          const current = event.logMessageData.name;
          const locked = lockedGroupNames[threadID];
          if (locked && current !== locked) {
            await api.setTitle(locked, threadID);
            api.sendMessage("👿 koi Randike yehan sumi malkin ji 🙇 ne name rakha gc ke ab tere baap ka bhi aukat nhi badal sake 🤨 samjha lode chal nikal", threadID);
          }
          return;
        }

        if (!body) return;
        const text = body.toLowerCase().trim();

        // 😒 Admin Reply
        if (event.messageReply && event.messageReply.senderID === api.getCurrentUserID() && OWNER_UIDS.includes(senderID)) {
          return api.sendMessage("😒😒 jaao mujhe nhi karni tumse koi baat bade aaye", threadID, messageID);
        }

        // 😡 Abuse Detection
        const normalize = (t) => t.toLowerCase().replace(/[4@]/g, "a").replace(/[1|!]/g, "i").replace(/[0]/g, "o").replace(/[3]/g, "e").replace(/[5$]/g, "s").replace(/[7]/g, "t");
        const norm = normalize(text);
        const badNames = ["avii", "piyush", "sumi", "summii"];
        const abuses = ["randi", "chut", "gand", "land", "gandu", "bhosda", "madarchod", "mc", "bc", "behnchod", "chutiya"];

        if (
          badNames.some(n => norm.includes(n)) &&
          abuses.some(w => norm.includes(w)) &&
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

        // 🎯 .bhai gali kyun?
        if (text === ".bhai gali kyun?" && event.messageReply && OWNER_UIDS.includes(senderID)) {
          targetUID = event.messageReply.senderID;
          api.sendMessage("😏 ok", threadID, messageID);
          return;
        }

        // 💣 Abuse Target
        if (targetUID && fs.existsSync("np.txt") && senderID === targetUID) {
          const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
          if (lines.length > 0) {
            const line = lines[Math.floor(Math.random() * lines.length)];
            api.sendMessage(line, threadID, messageID);
          }
        }

        // 📛 .id Command
        if (text === ".id" && event.messageReply && OWNER_UIDS.includes(senderID)) {
          api.sendMessage("🆔 " + event.messageReply.senderID, threadID, messageID);
          return;
        }

        // ❌ Ignore others
        if (!OWNER_UIDS.includes(senderID)) return;

        // 📌 Owner Commands
        const args = text.split(" ");
        const cmd = args[0];
        const input = args.slice(1).join(" ");

        if (cmd === ".exit") {
          api.sendMessage("sumi malkin ji 🙇 chalta hun sabki ma chod diya...", threadID, () => {
            api.removeUserFromGroup(api.getCurrentUserID(), threadID);
          });
        }

        if (cmd === ".lockgroupname") {
          await api.setTitle(input, threadID);
          lockedGroupNames[threadID] = input;
          api.sendMessage("🔒 Locked by sumi malkin", threadID);
        }

        if (cmd === ".unlockgroupname") {
          delete lockedGroupNames[threadID];
          api.sendMessage("🔓 Unlocked", threadID);
        }

        if (cmd === ".uid") {
          api.sendMessage("🆔 Group UID: " + threadID, threadID);
        }

        if (cmd === ".help") {
          api.sendMessage(`📜 Commands:
.lockgroupname <name>
.unlockgroupname
.exit
.uid
.id (reply)
.bhai gali kyun? (reply)
.help`, threadID);
        }

      } catch (e) {
        console.error("❗ Bot Error:", e.message);
      }
    });
  });
            }
