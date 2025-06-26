import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100001668542035", "100005122337500"];
const friendUIDs = fs.existsSync("Friend.txt") ? fs.readFileSync("Friend.txt", "utf8").split("\n").map(x => x.trim()) : [];
const lockedGroupNames = {};
let rkbInterval = null, stopRequested = false;
let mediaLoopInterval = null, lastMedia = null;
let targetUID = null;

const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running</h2>"));
app.listen(20782, () => console.log("🌐 Log server: http://localhost:20782"));

process.on("uncaughtException", err => console.error("❗ Uncaught Exception:", err.message));
process.on("unhandledRejection", reason => console.error("❗ Unhandled Rejection:", reason));

// ✅ Load both appstates
["appstate.json", "appstate2.json"].forEach((file, index) => {
  if (!fs.existsSync(file)) return;
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(json) || json.length === 0) throw new Error("Empty/invalid appstate");
  } catch (e) {
    console.warn(`⚠️ Skipping ${file}:`, e.message);
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

        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          body.trim().toLowerCase() === ".bhai gali kyun?"
        ) {
          targetUID = event.messageReply.senderID;
          api.sendMessage(":P", threadID, messageID);
          return;
        }

        if (targetUID && fs.existsSync("np.txt") && senderID === targetUID) {
          const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
          if (lines.length > 0) {
            const randomLine = lines[Math.floor(Math.random() * lines.length)];
            api.sendMessage(randomLine, threadID, messageID);
          }
        }

        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          body.trim().toLowerCase() === ".id"
        ) {
          const repliedUserID = event.messageReply.senderID;
          api.sendMessage(`🆔 UID: ${repliedUserID}`, threadID, messageID);
          return;
        }

        if (!OWNER_UIDS.includes(senderID)) return;

        const trimmed = body.trim().toLowerCase();
        const args = trimmed.split(" ");
        const cmd = args[0];
        const input = args.slice(1).join(" ");

        if (cmd === ".allname") {
          const info = await api.getThreadInfo(threadID);
          for (const uid of info.participantIDs) {
            await api.changeNickname(input, threadID, uid).catch(() => {});
            await new Promise(res => setTimeout(res, 20000));
          }
          api.sendMessage("👥 Nicknames updated", threadID);
        }

        else if (cmd === ".groupname") {
          await api.setTitle(input, threadID);
          api.sendMessage("Group name updated.", threadID);
        }

        else if (cmd === ".lockgroupname") {
          await api.setTitle(input, threadID);
          lockedGroupNames[threadID] = input;
          api.sendMessage(`sumi malkin ji 🙇 name lock kr diya ab koi badalega to rkb uski maa bhi chodega 🤨 Locked: ${input}`, threadID);
        }

        else if (cmd === ".unlockgroupname") {
          delete lockedGroupNames[threadID];
          api.sendMessage("🔓 kr diya unlock sumi malkin ji", threadID);
        }

        else if (cmd === ".uid") {
          api.sendMessage(`🆔 Group ID: ${threadID}`, threadID);
        }

        else if (cmd === ".exit") {
          api.sendMessage(`sumi malkin ji 🙇 chalta hun sabki ma chod diya kabhi gulam ko chodna ho to bula lena 🙏🖕😎`, threadID, () => {
            api.removeUserFromGroup(api.getCurrentUserID(), threadID);
          });
        }

        else if (cmd === ".rkb" || cmd === ".rkb2" || cmd === ".rkb3") {
          const file = cmd === ".rkb" ? "np.txt" : cmd === ".rkb2" ? "np2.txt" : "np3.txt";
          if (!fs.existsSync(file)) return api.sendMessage(`konsa gaLi du ${cmd} ko`, threadID);
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
          api.sendMessage(`iski maa chhodta hun sumi malkin rukja ${name}`, threadID);
        }

        else if (cmd === ".stop") {
          stopRequested = true;
          if (rkbInterval) {
            clearInterval(rkbInterval);
            rkbInterval = null;
            api.sendMessage("rkb ko bekar me dara diya 😂😜 kuchh na chal raha lode", threadID);
          } else {
            api.sendMessage("Kuch chal hi nahi raha tha bhai", threadID);
          }
        }

        else if (cmd === ".help") {
          const help = `📌 Commands (. prefix):
.allname <name>
.groupname <name>
.lockgroupname <name>
.unlockgroupname
.uid
.exit
.rkb <name>, .rkb2, .rkb3
.stop
.id (reply)
.bhai gali kyun? (reply)
.help`;
          api.sendMessage(help, threadID);
        }

      } catch (e) {
        console.error("❗ Bot error:", e.message);
      }
    });
  });
});
