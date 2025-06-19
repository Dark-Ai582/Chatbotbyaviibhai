// IMPORTS
import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100082811408144", "100005122337500", "100012859802560"];
let activeSpam = null;
let stopRequested = false;
const lockedGroupNames = {};
let mediaLoopInterval = null;
let lastMedia = null;
const blockedUIDs = new Set();
let pkTargets = {};
let np18Index = 0;
let abuseIndex = 0;

const ABUSE_NAMES = ["AVI", "AVII", "AAVI", "4VI", "9VI", "ABHI", "4V|", "9V|", "A V I"];
const ABUSE_WORDS = ["MC", "BC", "MADRCHOD", "TERI", "MA", "KI", "CHOOT", "CHUT", "RANDI", "KA", "BEHEN", "BHOSDIKE", "GAND", "CHUCH", "LAND", "BOOR", "GANDU", "LOWDA", "BHOSDA", "CHUTIYA", "BEHNCHOD", "RANDIKE"];

function leetNormalize(text) {
  return text.replace(/[401]/gi, char => {
    if (char === '4') return 'A';
    if (char === '0') return 'O';
    if (char === '1') return 'I';
    return char;
  });
}

function containsAbuse(text) {
  const norm = leetNormalize(text.toUpperCase());
  const nameMatch = ABUSE_NAMES.some(name => norm.includes(name));
  const abuseMatch = ABUSE_WORDS.some(word => norm.includes(word));
  return nameMatch && abuseMatch;
}

function getNextAbuseLine() {
  const lines = fs.readFileSync("np18.txt", "utf8").split("\n").filter(Boolean);
  const line = lines[abuseIndex % lines.length];
  abuseIndex++;
  return line;
}

function getNextTargetLine(uid) {
  const lines = fs.readFileSync("target.txt", "utf8").split("\n").filter(Boolean);
  const index = pkTargets[uid] || 0;
  const line = lines[index % lines.length];
  pkTargets[uid] = index + 1;
  return line;
}

// SERVER
const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running</h2>"));
app.listen(20782, () => console.log("🌐 Log server running..."));

process.on("uncaughtException", err => console.error("❗ Uncaught:", err.message));
process.on("unhandledRejection", err => console.error("❗ Unhandled:", err));

login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
  if (err) return console.error("❌ Login failed:", err);
  api.setOptions({ listenEvents: true });
  console.log("✅ Bot logged in.");

  api.listenMqtt(async (err, event) => {
    try {
      if (err || !event) return;
      const { threadID, senderID, body, messageID } = event;

      const isAdmin = OWNER_UIDS.includes(senderID);
      if (!isAdmin && event.type === "message_reply") return;

      // Blocked users
      if (blockedUIDs.has(senderID)) return;

      // Abuse detection
      if (!isAdmin && event.type === "message" && containsAbuse(body)) {
        if (fs.existsSync("np18.txt")) {
          api.sendMessage(getNextAbuseLine(), threadID);
        }
        return;
      }

      // PK Target replies
      if (pkTargets[senderID] !== undefined && event.type === "message") {
        if (fs.existsSync("target.txt")) {
          const line = getNextTargetLine(senderID);
          api.sendMessage({ body: line, replyToMessage: messageID }, threadID);
        }
        return;
      }

      // Group name lock
      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const locked = lockedGroupNames[threadID];
        const newName = event.logMessageData.name;
        if (locked && locked !== newName) {
          await api.setTitle(locked, threadID);
          api.sendMessage("Avii ke lode ke niche dabi he grp name himmat he to hata kar dikha 😎🖕", threadID);
        }
        return;
      }

      if (!body || !body.startsWith("!")) return;
      if (!isAdmin) return; // silent for non-admins

      const args = body.trim().split(" ");
      const cmd = args[0].toLowerCase();
      const input = args.slice(1).join(" ");

      const stopActiveSpam = () => {
        stopRequested = true;
        if (activeSpam) clearInterval(activeSpam);
        activeSpam = null;
      };

      if (["!rkb", "!rkb2", "!rkb3"].includes(cmd)) {
        const file = cmd === "!rkb" ? "np.txt" : cmd === "!rkb2" ? "np2.txt" : "np3.txt";
        const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
        if (!input || lines.length === 0) return api.sendMessage("⚠️ Naam de bhai", threadID);
        stopActiveSpam();
        let i = 0;
        activeSpam = setInterval(() => {
          if (i >= lines.length || stopRequested) return clearInterval(activeSpam);
          api.sendMessage(`${input} ${lines[i++]}`, threadID);
        }, 40000);
        api.sendMessage(`RUKO AVII ISKI MA MAI CHODTA HUN 😗💔${input}`, threadID);
      }

      else if (cmd === "!stop") {
        stopActiveSpam();
        api.sendMessage("avii maii khana khake ata hun 🥱 chud gaye bche🤣 bye", threadID);
      }

      else if (cmd === "!pk") {
        const uid = args[1];
        if (!uid) return api.sendMessage("⚠️ Avii bhaiya Target uid do fir uski ma ki chudai dekho aap bas", threadID);
        pkTargets[uid] = 0;
        api.sendMessage(`✅ Targeting started: ${uid}`, threadID);
      }

      else if (cmd === "!unpk") {
        const uid = args[1];
        if (!uid) return api.sendMessage("⚠️ UID de bhai", threadID);
        delete pkTargets[uid];
        api.sendMessage(`❌ Target stopped: ${uid}`, threadID);
      }

      else if (cmd === "!useblock") {
        const uid = args[1];
        if (!uid) return api.sendMessage("⚠️ UID de bhai", threadID);
        blockedUIDs.add(uid);
        api.sendMessage(`Blocked: ${uid}`, threadID);
      }

      else if (cmd === "!useunblock") {
        const uid = args[1];
        blockedUIDs.delete(uid);
        api.sendMessage(`Unblocked: ${uid}`, threadID);
      }

      else if (cmd === "!lockgroupname") {
        if (!input) return api.sendMessage("❌ Name de bhai", threadID);
        await api.setTitle(input, threadID);
        lockedGroupNames[threadID] = input;
        api.sendMessage(`Locked: "${input}"`, threadID);
      }

      else if (cmd === "!unlockgroupname") {
        delete lockedGroupNames[threadID];
        api.sendMessage("🔓 Unlock ho gaya group name", threadID);
      }

      else if (cmd === "!exit") {
        api.sendMessage("bye bye avii bhai ja raha hun kabhi kam pare to yad kar lena 🙏", threadID, () => {
          api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        });
      }

      else if (cmd === "!photo") {
        api.sendMessage("📸 Send photo within 1 min", threadID);
        const handler = (e) => {
          if (e.type === "message" && e.threadID === threadID && e.attachments.length) {
            lastMedia = { threadID, attachments: e.attachments };
            clearInterval(mediaLoopInterval);
            mediaLoopInterval = setInterval(() => {
              api.sendMessage({ attachment: lastMedia.attachments }, threadID);
            }, 30000);
            api.removeListener("message", handler);
            api.sendMessage("✅ Loop started.", threadID);
          }
        };
        api.on("message", handler);
      }

      else if (cmd === "!stopphoto") {
        clearInterval(mediaLoopInterval);
        mediaLoopInterval = null;
        lastMedia = null;
        api.sendMessage("⛔ Photo loop stopped", threadID);
      }

      else if (cmd === "!help") {
        api.sendMessage(`
📌 Commands:
!rkb/!rkb2/!rkb3 <name> – Start spam
!stop – Stop spam
!pk <uid> – Target UID (line-by-line)
!unpk <uid> – Stop target
!useblock <uid> – Block UID
!useunblock <uid> – Unblock UID
!lockgroupname <name> – Lock group name
!unlockgroupname – Unlock group name
!photo – Start media loop
!stopphoto – Stop media loop
!exit – Leave group
        `.trim(), threadID);
      }

    } catch (e) {
      console.error("⚠️ Error:", e.message);
    }
  });
});
