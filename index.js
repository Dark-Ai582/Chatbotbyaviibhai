import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100082811408144", "100005122337500", "100012859802560"];
let activeSpam = null;
let stopRequested = false;
const lockedGroupNames = {};
let mediaLoopInterval = null;
let lastMedia = null;
let targetUIDs = [];
const blockedUIDs = new Set();

const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running</h2>"));
app.listen(20782, () => console.log("🌐 Log server: http://localhost:20782"));

process.on("uncaughtException", (err) => console.error("❗ Uncaught Exception:", err.message));
process.on("unhandledRejection", (reason) => console.error("❗ Unhandled Rejection:", reason));

login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
  if (err) return console.error("❌ Login failed:", err);
  api.setOptions({ listenEvents: true });
  console.log("✅ Bot logged in and running...");

  api.listenMqtt(async (err, event) => {
    try {
      if (err || !event) return;
      const { threadID, senderID, body, messageID } = event;
      
// Global abuse tracker setup
let abuseIndex = 0;
let abuseLines = [];

// Load abuse.txt lines at startup
try {
  abuseLines = fs.readFileSync("abuse.txt", "utf-8").split("\n").filter(Boolean);
} catch (err) {
  console.error("⚠️ 'abuse.txt' not found or is empty.");
}

// Leetspeak-normalize helper function
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[4@]/g, "a")
    .replace(/[|!1]/g, "i")
    .replace(/0/g, "o")
    .replace(/3/g, "e")
    .replace(/7/g, "t")
    .replace(/9/g, "g")
    .replace(/\$/g, "s");
}

// Fetch next abuse line (looping)
function getNextAbuseLine() {
  if (abuseLines.length === 0) return "⚠️ abuse.txt file is empty!";
  const line = abuseLines[abuseIndex];
  abuseIndex = (abuseIndex + 1) % abuseLines.length;
  return line;
}

// Main abuse checker function
function checkAbuse({ body, senderID, messageID, threadID, api }) {
  if (!body) return;

  const normalizedBody = normalize(body);
  const badNames = ["avi", "avii", "aavi", "syco", "hannu", "satya", "anox"];
  const abuseWords = [
    "bhen", "maa", "madarchod", "mc", "bc", "randi", "rndi", "chut", "gand",
    "lund", "behnchod", "chutiya", "gandu", "lowda", "bhosda"
  ];

  const nameDetected = badNames.some(name => normalizedBody.includes(name));
  const abuseDetected = abuseWords.some(word => normalizedBody.includes(word));

  const isAdmin = OWNER_UIDS.includes(senderID);
  if (!isAdmin && nameDetected && abuseDetected) {
    const abuseMsg = getNextAbuseLine();
    api.sendMessage(abuseMsg, threadID, messageID);
  }
}

      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const currentName = event.logMessageData.name;
        const lockedName = lockedGroupNames[threadID];
        if (lockedName && currentName !== lockedName) {
          try {
            await api.setTitle(lockedName, threadID);
            api.sendMessage(`  "${lockedName}"`, threadID);
          } catch (e) {
            console.error("❌ Error reverting group name:", e.message);
          }
        }
        return;
      }

      if (!body) return;

      const args = body.trim().split(" ");
      const cmd = args[0].toLowerCase().startsWith("!") ? args[0].toLowerCase() : null;
if (cmd && !OWNER_UIDS.includes(senderID)) {
  return; // ❌ Ye command non-admins ke liye silent karega
}
      const input = args.slice(1).join(" ");

      const stopActiveSpam = () => {
        stopRequested = true;
        if (activeSpam) clearInterval(activeSpam);
        activeSpam = null;
      };

      const startSpam = (filename, name) => {
        if (!fs.existsSync(filename)) return api.sendMessage("⛔ File not found", threadID);
        stopActiveSpam();
        const lines = fs.readFileSync(filename, "utf8").split("\n").filter(Boolean);
        let index = 0;
        stopRequested = false;

        activeSpam = setInterval(() => {
          if (index >= lines.length || stopRequested) {
            clearInterval(activeSpam);
            activeSpam = null;
            return;
          }
          api.sendMessage(`${name} ${lines[index++]}`, threadID);
        }, 40000);
        api.sendMessage(`RUKO AVII ISKI MA MAI CHODTA HUN 😗💔${name}`, threadID);
      };

      // All commands start here
      if (cmd === "!rkb" || cmd === "!rkb2" || cmd === "!rkb3") {
        const name = input.trim();
        if (!name) return api.sendMessage("⚠️ Naam to de bhai kiski bajani hai bata 😎", threadID);
        const filename = cmd === "!rkb" ? "np.txt" : cmd === "!rkb2" ? "np2.txt" : "np3.txt";
        startSpam(filename, name);
      }

      else if (cmd === "!stop") {
        stopActiveSpam();
        api.sendMessage("avii maii khana khake ata hun 🥱 chud gaye bche🤣 bye", threadID);
      }

      else if (cmd === "!useblock") {
        const uid = args[1];
        if (!uid) {
          api.sendMessage("⚠️ UID to de bhai, kise block karu 😅", threadID);
        } else if (OWNER_UIDS.includes(uid)) {
          api.sendMessage("😤 Avii bhaiya ko block karne ki soch bhi kaise li be chutye 😭💀", threadID);
        } else {
          blockedUIDs.add(uid);
          api.sendMessage(`Avii bhaiya is madrchod ko sex full block kr diya hun 💀\nab msg krega to nhi sununga iska 😎`, threadID);
        }
      }

      else if (cmd === "!useunblock") {
        const uid = args[1];
        if (!uid) {
          api.sendMessage("⚠️ UID to de bhai, kise unblock karu 😅", threadID);
        } else if (blockedUIDs.has(uid)) {
          blockedUIDs.delete(uid);
          api.sendMessage(`Avii bhaiya ne daya kar diya 😎 unblock ho gaya: ${uid}`, threadID);
        } else {
          api.sendMessage(`Ye to blocked hi nahi tha baby 😘`, threadID);
        }
      }

      else if (cmd === "!exit") {
        api.sendMessage("bye bye avii bhai ja raha hun kabhi kam pare to yad kar lena 🙏", threadID, () => {
          api.removeUserFromGroup(api.getCurrentUserID(), threadID).catch(() => {
            api.sendMessage("❌ Can't leave group.", threadID);
          });
        });
      }

      else if (cmd === "!allname") {
        const info = await api.getThreadInfo(threadID);
        const members = info.participantIDs;
        api.sendMessage(`🛠 ${members.length} ' nicknames...`, threadID);
        for (const uid of members) {
          try {
            await api.changeNickname(input, threadID, uid);
            await new Promise(r => setTimeout(r, 30000));
          } catch (e) {
            console.log(`⚠️ Nick fail ${uid}:`, e.message);
          }
        }
        api.sendMessage("ye gribh ka bcha to Rone Lga bkL", threadID);
      }

      else if (cmd === "!groupname") {
        await api.setTitle(input, threadID).catch(() =>
          api.sendMessage(" kya hua rkb chud gyen kya sab ", threadID)
        );
      }

      else if (cmd === "!lockgroupname") {
        if (!input) return api.sendMessage("name doge tab na 😅", threadID);
        await api.setTitle(input, threadID).catch(() =>
          api.sendMessage("❌ Locking failed.", threadID)
        );
        lockedGroupNames[threadID] = input;
        api.sendMessage(`[[ AVII KA LODE SE DABA HAI GRP NAME ]]  "${input}"`, threadID);
      }

      else if (cmd === "!unlockgroupname") {
        delete lockedGroupNames[threadID];
        api.sendMessage("🔓 Avii Raj Ka kabja hat gya Groups se name badal lo rkb.", threadID);
      }

      else if (cmd === "!uid") {
        api.sendMessage(`🆔 Avii sir ye lo uid aur chudai kardo sabki 🙏🖕 Group ID: ${threadID}`, threadID);
      }

      else if (cmd === "!photo") {
        api.sendMessage("📸 Send a photo or video within 1 minute...", threadID);
        const handleMedia = async (mediaEvent) => {
          if (
            mediaEvent.type === "message" &&
            mediaEvent.threadID === threadID &&
            mediaEvent.attachments?.length > 0
          ) {
            lastMedia = { attachments: mediaEvent.attachments, threadID };
            api.sendMessage("✅ Media received. Loop started.", threadID);
            if (mediaLoopInterval) clearInterval(mediaLoopInterval);
            mediaLoopInterval = setInterval(() => {
              if (lastMedia)
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
          mediaLoopInterval = null;
          lastMedia = null;
          api.sendMessage("chud gaye sb.", threadID);
        } else api.sendMessage("🤣ro sale chnar", threadID);
      }

      else if (cmd === "!forward") {
        const info = await api.getThreadInfo(threadID);
        const members = info.participantIDs;
        const msgInfo = event.messageReply;
        if (!msgInfo) return api.sendMessage("❌ Kisi message ko reply karo bhai", threadID);
        for (const uid of members) {
          if (uid !== api.getCurrentUserID()) {
            try {
              await api.sendMessage({ body: msgInfo.body || "", attachment: msgInfo.attachments || [] }, uid);
            } catch (e) {
              console.log(`⚠️ Can't send to ${uid}:`, e.message);
            }
            await new Promise(res => setTimeout(res, 2000));
          }
        }
        api.sendMessage("📨 Forwarding complete.", threadID);
      }

      else if (cmd === "!target") {
        const uid = args[1];
        if (uid && !targetUIDs.includes(uid)) {
          targetUIDs.push(uid);
          api.sendMessage(`dont worry Avi bhai chudega aane de sale ko: ${uid}`, threadID);
        } else api.sendMessage("⚠️ avii bhai jiska uid diyen aap ye pehle se chud rha🙂", threadID);
      }

      else if (cmd === "!cleartarget") {
        targetUIDs = [];
        api.sendMessage("🙂 kya hua avii bhaiie haters rogyen ro gya", threadID);
      }

      else if (cmd === "!help") {
        const help = `
📌 Available Commands:
!allname <name> – Change all nicknames
!groupname <name> – Change group name
!lockgroupname <name> – Lock group name
!unlockgroupname – Unlock group name
!uid – Show group ID
!exit – Group chodne se pehle msg deke leave
!rkb, !rkb2, !rkb3 <name> – Spam from respective files
!stop – Stop any running spam
!photo – Send and repeat photo/video
!stopphoto – Stop photo/video
!forward – Reply msg sabko bhejega
!target <uid> – Add target UID
!cleartarget – Remove all targets
!useblock <uid> – Block UID from responding
!useunblock <uid> – Unblock UID
!help – Show help message
        `;
        api.sendMessage(help.trim(), threadID);
      }
    } catch (e) {
      console.error("⚠️ Handler error:", e.message);
    }
  });
});
