import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["61578026332802", "100005122337500"];
const friendUIDs = fs.existsSync("Friend.txt")
  ? fs.readFileSync("Friend.txt", "utf8").split("\n").map(x => x.trim())
  : [];

const lockedGroupNames = {};
let rkbInterval = null, stopRequested = false;
let mediaLoopInterval = null, lastMedia = null;
let targetUID = null;

const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running ✅</h2>"));
app.listen(20782, () => console.log("🌐 Log server: http://localhost:20782"));

process.on("uncaughtException", (err) => console.error("❗ Uncaught Exception:", err.message));
process.on("unhandledRejection", (reason) => console.error("❗ Unhandled Rejection:", reason));

login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
  if (err) return console.error("❌ Login failed:", err);

  api.setOptions({ listenEvents: true });
  const botUID = api.getCurrentUserID();
  if (!OWNER_UIDS.includes(botUID)) OWNER_UIDS.push(botUID);
  console.log("✅ Bot logged in and running...");
  console.log("🤖 Bot UID:", botUID);
  console.log("👑 OWNER_UIDS:", OWNER_UIDS);

  api.listenMqtt(async (err, event) => {
    try {
      if (err) return console.error("🔴 MQTT Error:", err);
      if (!event) return;

      const { threadID, senderID, body = "", messageID } = event;

      // Group Name Lock Check
      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const currentName = event.logMessageData.name;
        const lockedName = lockedGroupNames[threadID];
        if (lockedName && currentName !== lockedName) {
          await api.setTitle(lockedName, threadID);
          api.sendMessage(`oi Randike yehan Piyush bos ne name rakha gc ke ab tere baap ka bhi aukat nhi badal sake 🤨 samjha lode chal nikal`, threadID);
        }
        return;
      }

      const lowerBody = body.toLowerCase();

      const normalize = (text) =>
        text.toLowerCase()
          .replace(/[4@]/g, "a")
          .replace(/[1|!]/g, "i")
          .replace(/[0]/g, "o")
          .replace(/[3]/g, "e")
          .replace(/[5$]/g, "s")
          .replace(/[7]/g, "t");

      const normalized = normalize(lowerBody);
      const badNames = ["piyush", "avii", "p1yush", "piiyush", "ppiyush", "piyus"];
      const abuseWords = ["randi", "chut", "gand", "tbkc", "bsdk", "land", "gandu", "lodu", "lamd", "chumt", "tmkc", "laude", "bhosda", "madarchod", "mc", "bc", "behnchod", "chutiya", "boor", "lowda", "maa", "didi"];

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

      // Bot target system via reply
      if (
        OWNER_UIDS.includes(senderID) &&
        event.messageReply &&
        lowerBody === "!bhai gali kyun?"
      ) {
        const repliedUserID = event.messageReply.senderID;
        targetUID = repliedUserID;
        api.sendMessage(":P", threadID, messageID);
        return;
      }

      // Abuse reply to targetUID
      if (targetUID && senderID === targetUID && fs.existsSync("np.txt")) {
        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        if (lines.length > 0) {
          const randomLine = lines[Math.floor(Math.random() * lines.length)];
          api.sendMessage(randomLine, threadID, messageID);
        }
        return;
      }

      // !id reply
      if (OWNER_UIDS.includes(senderID) && event.messageReply && lowerBody === "!id") {
        const repliedUserID = event.messageReply.senderID;
        return api.sendMessage(`🆔 UID: ${repliedUserID}`, threadID, messageID);
      }

      // ✅ Below this line: Only OWNER_UIDS access
      if (!OWNER_UIDS.includes(senderID)) return;

      const args = lowerBody.trim().split(" ");
      const cmd = args[0];
      const input = args.slice(1).join(" ");

      if (cmd === "!uid") {
        api.sendMessage(`🆔 Group ID: ${threadID}`, threadID);
      }

      else if (cmd === "!exit") {
        api.sendMessage(`Bot chalta hun sabki ma chod diya 😎🙏`, threadID, () => {
          api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        });
      }

      else if (cmd === "!groupname") {
        await api.setTitle(input, threadID);
        api.sendMessage("✅ Group name updated.", threadID);
      }

      else if (cmd === "!lockgroupname") {
        lockedGroupNames[threadID] = input;
        await api.setTitle(input, threadID);
        api.sendMessage(`🔒 Locked group name: ${input}`, threadID);
      }

      else if (cmd === "!unlockgroupname") {
        delete lockedGroupNames[threadID];
        api.sendMessage("🔓 Group name unlocked.", threadID);
      }

      else if (cmd === "!rkb" || cmd === "!rkb2" || cmd === "!rkb3") {
        const file = cmd === "!rkb" ? "np.txt" : cmd === "!rkb2" ? "np2.txt" : "np3.txt";
        if (!fs.existsSync(file)) return api.sendMessage(`❌ File missing: ${file}`, threadID);

        const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
        const name = input.trim();
        stopRequested = false;
        if (rkbInterval) clearInterval(rkbInterval);
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
        api.sendMessage(`🗣️ Abuse started for: ${name}`, threadID);
      }

      else if (cmd === "!stop") {
        stopRequested = true;
        if (rkbInterval) {
          clearInterval(rkbInterval);
          rkbInterval = null;
          api.sendMessage("⛔ Stopped abuse.", threadID);
        } else {
          api.sendMessage("❌ No abuse was running.", threadID);
        }
      }

      else if (cmd === "!photo") {
        api.sendMessage("📸 Send photo now...", threadID);
        const handleMedia = async (mediaEvent) => {
          if (mediaEvent.type === "message" && mediaEvent.threadID === threadID && mediaEvent.attachments.length > 0) {
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

      else if (cmd === "!stopphoto") {
        if (mediaLoopInterval) {
          clearInterval(mediaLoopInterval);
          lastMedia = null;
          api.sendMessage("🛑 Stopped media loop.", threadID);
        }
      }

      else if (cmd === "!help") {
        api.sendMessage(`📌 Commands:
!groupname <name> – Change GC name
!lockgroupname <name>
!unlockgroupname
!uid – Get group UID
!id (reply) – Get user UID
!exit – Bot leave GC
!rkb, !rkb2, !rkb3 <name>
!stop – Stop abuse
!photo / !stopphoto
!bhai gali kyun? (reply) – Start abuse
!help`, threadID);
      }

    } catch (e) {
      console.error("❗ Error:", e.message);
    }
  });
});
