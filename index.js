import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100069692356853", "100005122337500"];
const friendUIDs = fs.existsSync("Friend.txt")
  ? fs.readFileSync("Friend.txt", "utf8").split("\n").map(x => x.trim())
  : [];

const lockedGroupNames = {};
let rkbInterval = null, stopRequested = false;
let mediaLoopInterval = null, lastMedia = null;
let targetUID = null;

const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running</h2>"));
app.listen(20782, () => console.log("🌐 Log server running on port 20782"));

process.on("uncaughtException", err => console.error("❗ Uncaught Exception:", err));
process.on("unhandledRejection", reason => console.error("❗ Unhandled Rejection:", reason));

login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
  if (err) return console.error("❌ Login failed:", err);
  api.setOptions({ listenEvents: true });
  console.log("✅ Bot logged in and running...");

  const botUID = api.getCurrentUserID();
  if (!OWNER_UIDS.includes(botUID)) OWNER_UIDS.push(botUID);

  api.listenMqtt(async (err, event) => {
    try {
      if (err || !event || !event.body) return;
      const { threadID, senderID, body, messageID } = event;

      const lowerBody = body.trim().toLowerCase();

      // 📌 Self-emoji replies for OWNER
      if (OWNER_UIDS.includes(senderID)) {
        const emojiReplies = {
          "😂": "Hansi rok nahi rahi bhai 😂",
          "😎": "Full swag me ho lagta 😎",
          "🥺": "Aree pighla diya 🥺 kya hua bol",
          "🙏": "Are bhai itna formal kyun 🙏 apne hi hain",
          "😢": "Kya hua bhai 😢 dil halka kar",
          "😍": "Kya dekh liya aisa 😍"
        };
        if (emojiReplies[body.trim()]) {
          return api.sendMessage(emojiReplies[body.trim()], threadID, messageID);
        }
      }

      // 📛 Group name lock detector
      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const locked = lockedGroupNames[threadID];
        const current = event.logMessageData.name;
        if (locked && current !== locked) {
          await api.setTitle(locked, threadID);
          return api.sendMessage("Group name lock tha, change nahi kar sakte randike 🖕", threadID);
        }
        return;
      }

      // 🧠 Abuse protection
      const normalize = txt => txt
        .toLowerCase()
        .replace(/[4@]/g, "a")
        .replace(/[1|!]/g, "i")
        .replace(/[0]/g, "o")
        .replace(/[3]/g, "e")
        .replace(/[5$]/g, "s")
        .replace(/[7]/g, "t");

      const badNames = ["avi", "avii", "sumi", "sumi malkin", "hanu", "h4nu", "4vi"];
      const abuseWords = ["randi", "gandu", "bhosda", "madarchod", "mc", "bc", "behnchod", "chutiya", "lowda", "maa", "didi"];

      const normalized = normalize(lowerBody);
      if (
        badNames.some(name => normalized.includes(name)) &&
        abuseWords.some(word => normalized.includes(word)) &&
        !OWNER_UIDS.includes(senderID) &&
        !friendUIDs.includes(senderID)
      ) {
        if (fs.existsSync("abuse.txt")) {
          const lines = fs.readFileSync("abuse.txt", "utf8").split("\n").filter(Boolean);
          for (let i = 0; i < Math.min(2, lines.length); i++) {
            api.sendMessage(lines[i], threadID, messageID);
          }
        }
        return;
      }

      // 🎯 Auto-abuse on target
      if (fs.existsSync("np.txt") && senderID === targetUID) {
        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        if (lines.length) {
          const line = lines[Math.floor(Math.random() * lines.length)];
          api.sendMessage(line, threadID, messageID);
        }
      }

      // 🔐 Commands only for OWNER
      if (!OWNER_UIDS.includes(senderID)) return;
      const args = lowerBody.split(" ");
      const cmd = args[0];
      const input = args.slice(1).join(" ");

      if (cmd === "*uid") {
        return api.sendMessage(`🆔 Group ID: ${threadID}`, threadID);
      }

      if (cmd === "*help") {
        return api.sendMessage(`
📌 Commands:
*uid
*help
*exit
*rkb <name> | *rkb2 | *rkb3
*stop
*photo / *stopphoto
*lockgroupname <name>
*unlockgroupname
*groupname <name>
*target <uid>
*cleartarget
*allname <name>
        `.trim(), threadID);
      }

      if (cmd === "*exit") {
        return api.sendMessage("👋 Chalta hu sabki maa chodh ke 😎🖕", threadID, () => {
          api.removeUserFromGroup(botUID, threadID);
        });
      }

      if (cmd === "*groupname") {
        await api.setTitle(input, threadID);
        return api.sendMessage("✅ Group name updated.", threadID);
      }

      if (cmd === "*lockgroupname") {
        await api.setTitle(input, threadID);
        lockedGroupNames[threadID] = input;
        return api.sendMessage(`🔒 Group name locked: ${input}`, threadID);
      }

      if (cmd === "*unlockgroupname") {
        delete lockedGroupNames[threadID];
        return api.sendMessage("🔓 Group name unlocked.", threadID);
      }

      if (cmd === "*allname") {
        const info = await api.getThreadInfo(threadID);
        for (const uid of info.participantIDs) {
          await api.changeNickname(input, threadID, uid).catch(() => {});
          await new Promise(r => setTimeout(r, 20000));
        }
        return api.sendMessage("👥 All nicknames updated.", threadID);
      }

      if (cmd === "*rkb" || cmd === "*rkb2" || cmd === "*rkb3") {
        const file = { "*rkb": "np.txt", "*rkb2": "np2.txt", "*rkb3": "np3.txt" }[cmd];
        if (!fs.existsSync(file)) return api.sendMessage("❌ File missing", threadID);

        const name = input.trim();
        const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
        if (rkbInterval) clearInterval(rkbInterval);
        stopRequested = false;
        let index = 0;

        rkbInterval = setInterval(() => {
          if (index >= lines.length || stopRequested) {
            clearInterval(rkbInterval);
            rkbInterval = null;
            return;
          }
          api.sendMessage(`${name} ${lines[index]}`, threadID);
          index++;
        }, 40000);

        return api.sendMessage(`🚨 Ab chalu hua rkb ${cmd}`, threadID);
      }

      if (cmd === "*stop") {
        stopRequested = true;
        if (rkbInterval) {
          clearInterval(rkbInterval);
          rkbInterval = null;
          return api.sendMessage("⛔ rkb stopped", threadID);
        }
        return api.sendMessage("Kuchh bhi nahi chal raha tha.", threadID);
      }

      if (cmd === "*photo") {
        api.sendMessage("📸 Send media in 1 min...", threadID);
        const handleMedia = async mediaEvent => {
          if (
            mediaEvent.type === "message" &&
            mediaEvent.threadID === threadID &&
            mediaEvent.attachments.length > 0
          ) {
            lastMedia = { attachments: mediaEvent.attachments, threadID };
            if (mediaLoopInterval) clearInterval(mediaLoopInterval);
            mediaLoopInterval = setInterval(() => {
              api.sendMessage({ attachment: lastMedia.attachments }, threadID);
            }, 30000);
            api.removeListener("message", handleMedia);
          }
        };
        api.on("message", handleMedia);
      }

      if (cmd === "*stopphoto") {
        if (mediaLoopInterval) {
          clearInterval(mediaLoopInterval);
          lastMedia = null;
          return api.sendMessage("⛔ Stopped media loop.", threadID);
        }
      }

      if (cmd === "*target") {
        if (!args[1]) return api.sendMessage("🎯 Provide UID", threadID);
        targetUID = args[1];
        return api.sendMessage(`Targeting UID: ${targetUID}`, threadID);
      }

      if (cmd === "*cleartarget") {
        targetUID = null;
        return api.sendMessage("🎯 Cleared target UID.", threadID);
      }
    } catch (e) {
      console.error("❗ Error:", e.message);
    }
  });
});
