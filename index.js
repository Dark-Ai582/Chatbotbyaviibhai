import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100069692356853", "100005122337500", "16"];
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

function getValidAppState() {
  const files = ["appstate.json", "appstate2.json", "appstate3.json"];
  for (const file of files) {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, "utf8");
      if (data.includes("session_cookies")) return JSON.parse(data);
    }
  }
  return null;
}

const appState = getValidAppState();
if (!appState) {
  console.error("❌ No valid appstate.json found");
  process.exit(1);
}

login({ appState }, (err, api) => {
  if (err) return console.error("❌ Login failed:", err);
  api.setOptions({ listenEvents: true });
  console.log("✅ Bot logged in and running...");

  api.listen(async (err, event) => {
    try {
      if (err || !event) return;
      const { threadID, senderID, body, messageID } = event;

      // Group name lock protection
      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const currentName = event.logMessageData.name;
        const lockedName = lockedGroupNames[threadID];
        if (lockedName && currentName !== lockedName) {
          await api.setTitle(lockedName, threadID);
          api.sendMessage(`oi Randike yehan sumi malkin ji 🙇 ne name rakha gc ke ab tere baap ka bhi aukat nhi badal sake 🤨 samjha lode chal nikal`, threadID);
        }
        return;
      }

      // Emoji Replies by Owner
      if (OWNER_UIDS.includes(senderID)) {
        const emoji = body?.trim();
        const emojiReplies = {
          "🙁": "Kya hua... mood halka sa down lag raha hai 🙁 bol na, yahan sunne wale hain 🫂",
          "🙄": "Yeh expression toh keh raha... 'phir wahi bakwas' 🙄",
          "🙂": "Aisi shaant muskaan ke peeche kya chhupa hai? 🙂 sab theek hai na? 💭",
          "💔": "Dil toot gaya lagta hai 💔 par yaad rakh, jo chhod jaaye... wo tera tha hi nahi 🧠",
          "❤️": "Itna pyaar? ❤️ koi toh dil se yaad kar raha hoga 😌",
          "🙏": "Arre nahi yaar 🙏 itna formal mat ho... apne hi toh log hain 🤗",
          "🫂": "Zarurat ho toh ek jadoo ki jhappi le lo 🫂 sab sambhal jaayega 🌸",
          "😂": "Yeh hasi... sach me contagious hai 😂 sabko haansa diya 😄",
          "😒": "Iss look ke peechhe zaroor koi 'uff' moment hai 😒 chill, ignore kar de 😌",
          "😎": "Full swag on 🔥😎 baat hi kuch aur hai attitude me ✨",
        };
        if (emojiReplies[emoji]) return api.sendMessage(emojiReplies[emoji], threadID, messageID);
      }

      if (!body) return;

      // Abuse Detection
      const normalize = (text) =>
        text.toLowerCase()
          .replace(/[4@]/g, "a")
          .replace(/[1|!]/g, "i")
          .replace(/[0]/g, "o")
          .replace(/[3]/g, "e")
          .replace(/[5$]/g, "s")
          .replace(/[7]/g, "t");
      const normalized = normalize(body);

      const badNames = ["9vii", "4vii", "avii", "sumi", "summii", "saina", "avi", "4v||", "sumi3:)", "avii"];
      const abuseWords = ["randi", "chut", "gand", "tbkc", "bsdk", "land", "gandu", "lodu", "lamd", "chumt", "tmkc", "laude", "bhosda", "madarchod", "mc", "bc", "behnchod", "chutiya", "gandu", "boor", "lowda", "maa", "didi"];

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

      // Commands & Features
      if (!OWNER_UIDS.includes(senderID)) return;
      const trimmed = body.trim().toLowerCase();
      const args = trimmed.split(" ");
      const cmd = args[0];
      const input = args.slice(1).join(" ");

      if (cmd === "*id" && event.messageReply) {
        return api.sendMessage(`UID: ${event.messageReply.senderID}`, threadID, messageID);
      }

      if (cmd === "?") {
        targetUID = event.messageReply?.senderID;
        return api.sendMessage("Achha Achha badmoshi kroge ab aap😒", threadID);
      }

      if (event.messageReply && event.messageReply.senderID === api.getCurrentUserID()) {
        return api.sendMessage("😒😒 jaao mujhe nhi karni tumse koi baat bade aaye", threadID, messageID);
      }

      if (targetUID && fs.existsSync("np.txt") && senderID === targetUID) {
        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        if (lines.length > 0) {
          const line = lines[Math.floor(Math.random() * lines.length)];
          api.sendMessage(line, threadID, messageID);
        }
      }

      if (cmd === "*allname") {
        const info = await api.getThreadInfo(threadID);
        for (const uid of info.participantIDs) {
          await api.changeNickname(input, threadID, uid).catch(() => {});
          await new Promise(res => setTimeout(res, 20000));
        }
        return api.sendMessage("👥 Nicknames updated", threadID);
      }

      if (cmd === "*groupname") {
        await api.setTitle(input, threadID);
        return api.sendMessage("Group name updated.", threadID);
      }

      if (cmd === "*lockgroupname") {
        await api.setTitle(input, threadID);
        lockedGroupNames[threadID] = input;
        return api.sendMessage(`sumi malkin ji 🙇 ne lock lagaya name ab koi badalega to uski ma bhi chod dunga 😎 Locked: ${input}`, threadID);
      }

      if (cmd === "*unlockgroupname") {
        delete lockedGroupNames[threadID];
        return api.sendMessage("🔓 ok sumi malkin ji 🙇 ne khola naam, rkb ko Unlocked group name.", threadID);
      }

      if (cmd === "*uid") {
        return api.sendMessage(`🆔 Group ID: ${threadID}`, threadID);
      }

      if (cmd === "*exit") {
        return api.sendMessage(`sumi malkin ji 🙇 chalta hun sabki ma chod diya kabhi krishna jaise 25K gulam ko chodna ho to bula lena`, threadID, () => {
          api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        });
      }

      if (["*rkb", "*rkb2", "*rkb3"].includes(cmd)) {
        const fileMap = { "*rkb": "np.txt", "*rkb2": "np2.txt", "*rkb3": "np3.txt" };
        const file = fileMap[cmd];
        if (!fs.existsSync(file)) return api.sendMessage(`File not found: ${file}`, threadID);
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
          api.sendMessage(`${name} ${lines[index++]}`, threadID);
        }, 40000);
        return api.sendMessage(`sumi malkin ji 🙇 kr rahi ${name} ki maa chodai`, threadID);
      }

      if (cmd === "*stop") {
        stopRequested = true;
        if (rkbInterval) {
          clearInterval(rkbInterval);
          rkbInterval = null;
          return api.sendMessage("Stopped!", threadID);
        } else {
          return api.sendMessage("Kuch chal hi nahi raha tha bhai", threadID);
        }
      }

      if (cmd === "*photo") {
        api.sendMessage("📸 Send media in 1 min", threadID);
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

      if (cmd === "*stopphoto") {
        if (mediaLoopInterval) {
          clearInterval(mediaLoopInterval);
          lastMedia = null;
          return api.sendMessage("Stopped media loop.", threadID);
        }
      }

      if (cmd === "*forward") {
        const info = await api.getThreadInfo(threadID);
        const replyMsg = event.messageReply;
        if (!replyMsg) return api.sendMessage("❌ Reply kisi msg pe karo", threadID);
        for (const uid of info.participantIDs) {
          if (uid !== api.getCurrentUserID()) {
            await api.sendMessage({ body: replyMsg.body || "", attachment: replyMsg.attachments || [] }, uid);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
        return api.sendMessage("✅ Forwarded", threadID);
      }

      if (cmd === "*t") {
        if (!args[1]) return api.sendMessage("👤 UID de", threadID);
        targetUID = args[1];
        return api.sendMessage(`🎯 Targeting UID: ${targetUID}`, threadID);
      }

      if (cmd === "*c") {
        targetUID = null;
        return api.sendMessage("ok kar diya 😒 apka kam jii", threadID);
      }

      if (cmd === "*help") {
        const help = `📌 Commands:
*allname <name>
*groupname <name>
*lockgroupname <name>
*unlockgroupname
*uid
*exit
*rkb <name>, *rkb2, *rkb3
*stop
*photo / *stopphoto
*forward (reply required)
*t <uid> / *c
*id (on reply)
? (target on reply)
*help`;
        return api.sendMessage(help, threadID);
      }

    } catch (e) {
      console.error("❗ Bot error:", e.message);
    }
  });
});
