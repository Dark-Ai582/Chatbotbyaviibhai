import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["61578026332802", "100005122337500"];
const friendUIDs = fs.existsSync("Friend.txt") ? fs.readFileSync("Friend.txt", "utf8").split("\n").map(x => x.trim()) : [];
const lockedGroupNames = {};

let rkbInterval = null, stopRequested = false;
let mediaLoopInterval = null, lastMedia = null;
let targetUID = null;

const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running</h2>"));
app.listen(20782, () => console.log("🌐 Log server: http://localhost:20782"));

process.on("uncaughtException", (err) => console.error("❗ Uncaught Exception:", err.message));
process.on("unhandledRejection", (reason) => console.error("❗ Unhandled Rejection:", reason));

login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
  if (err) return console.error("❌ Login failed:", err);
  api.setOptions({ listenEvents: true });
  console.log("✅ Bot logged in and running...");

  // ✅ Add bot UID to OWNER_UIDS
  const botUID = api.getCurrentUserID();
  if (!OWNER_UIDS.includes(botUID)) OWNER_UIDS.push(botUID);
  console.log("🤖 Bot UID:", botUID);
  console.log("👑 OWNER_UIDS:", OWNER_UIDS);

  api.listenMqtt(async (err, event) => {
    try {
      if (err || !event) return;

      // ✅ Ensure it's a message event
      if (event.type !== "message" || !event.body) return;

      const { threadID, senderID, body, messageID } = event;

      // Group name lock
      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const currentName = event.logMessageData.name;
        const lockedName = lockedGroupNames[threadID];
        if (lockedName && currentName !== lockedName) {
          await api.setTitle(lockedName, threadID);
          api.sendMessage("⛔ Group name is locked. Changing not allowed.", threadID);
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

      // 🔞 Abuse Detection
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

      // 🎯 Set Target
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

      // 🎯 Abuse reply from np.txt to target
      if (targetUID && senderID === targetUID && fs.existsSync("np.txt")) {
        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        if (lines.length) {
          const randomLine = lines[Math.floor(Math.random() * lines.length)];
          api.sendMessage(randomLine, threadID, messageID);
        }
      }

      // 🔍 UID from reply
      if (OWNER_UIDS.includes(senderID) && event.messageReply && lowerBody === "!id") {
        const repliedUserID = event.messageReply.senderID;
        api.sendMessage(`🆔 UID: ${repliedUserID}`, threadID, messageID);
        return;
      }

      // 🔐 Admin-only commands
      if (!OWNER_UIDS.includes(senderID)) return;

      const trimmed = body.trim().toLowerCase();
      const args = trimmed.split(" ");
      const cmd = args[0];
      const input = args.slice(1).join(" ");

      if (cmd === "!help") {
        const help = `📌 Commands:
!allname <name> – Change nicknames
!groupname <name> – Set GC name
!lockgroupname <name> – Lock GC name
!unlockgroupname – Unlock GC name
!uid – Show group ID
!id (reply) – Get UID of user
!exit – Bot leave group
!rkb <name>, !rkb2, !rkb3 – Start abusing
!stop – Stop rkb
!photo – Start media loop
!stopphoto – Stop media
!forward (reply) – Forward message
!t <uid> – Set abuse target
!c – Clear target
!bhai gali kyun? (reply) – Set target from reply`;
        api.sendMessage(help, threadID);
      }

      else if (cmd === "!allname") {
        const info = await api.getThreadInfo(threadID);
        for (const uid of info.participantIDs) {
          await api.changeNickname(input, threadID, uid).catch(() => {});
          await new Promise(res => setTimeout(res, 1000));
        }
        api.sendMessage("👥 Nicknames updated", threadID);
      }

      else if (cmd === "!groupname") {
        await api.setTitle(input, threadID);
        api.sendMessage("✅ Group name updated.", threadID);
      }

      else if (cmd === "!lockgroupname") {
        await api.setTitle(input, threadID);
        lockedGroupNames[threadID] = input;
        api.sendMessage(`🔒 Group name locked: ${input}`, threadID);
      }

      else if (cmd === "!unlockgroupname") {
        delete lockedGroupNames[threadID];
        api.sendMessage("🔓 Group name unlocked.", threadID);
      }

      else if (cmd === "!uid") {
        api.sendMessage(`🆔 Group ID: ${threadID}`, threadID);
      }

      else if (cmd === "!exit") {
        api.sendMessage(`👋 Bot leaving...`, threadID, () => {
          api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        });
      }

      else if (["!rkb", "!rkb2", "!rkb3"].includes(cmd)) {
        const file = cmd === "!rkb" ? "np.txt" : cmd === "!rkb2" ? "np2.txt" : "np3.txt";
        if (!fs.existsSync(file)) return api.sendMessage(`❌ File missing: ${file}`, threadID);
        const name = input.trim();
        const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
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
        api.sendMessage(`🔥 Abusing started: ${name}`, threadID);
      }

      else if (cmd === "!stop") {
        stopRequested = true;
        if (rkbInterval) {
          clearInterval(rkbInterval);
          rkbInterval = null;
          api.sendMessage("⏹️ RKB stopped", threadID);
        } else {
          api.sendMessage("Nothing running", threadID);
        }
      }

      else if (cmd === "!photo") {
        api.sendMessage("📸 Send media within 1 minute...", threadID);
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
          api.sendMessage("🛑 Media loop stopped", threadID);
        }
      }

      else if (cmd === "!forward") {
        if (!event.messageReply) return api.sendMessage("❌ Reply to a message to forward", threadID);
        const info = await api.getThreadInfo(threadID);
        for (const uid of info.participantIDs) {
          if (uid !== api.getCurrentUserID()) {
            await api.sendMessage({ body: event.messageReply.body || "", attachment: event.messageReply.attachments || [] }, uid);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
        api.sendMessage("✅ Forwarded", threadID);
      }

      else if (cmd === "!t") {
        if (!args[1]) return api.sendMessage("❗ Provide a UID", threadID);
        targetUID = args[1];
        api.sendMessage(`🎯 Target set: ${targetUID}`, threadID);
      }

      else if (cmd === "!c") {
        targetUID = null;
        api.sendMessage("❌ Target cleared", threadID);
      }

    } catch (e) {
      console.error("❗ Bot error:", e.message);
    }
  });
});
