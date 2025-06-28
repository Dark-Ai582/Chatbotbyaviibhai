import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100069692356853", "100005122337500"];
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

  const botUID = api.getCurrentUserID();
  if (!OWNER_UIDS.includes(botUID)) OWNER_UIDS.push(botUID);
  console.log("✅ Bot logged in as:", botUID);

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
          return api.sendMessage(`oi Randike yehan sumi malkin ji 🙇 ne name rakha gc ke ab tere baap ka bhi aukat nhi badal sake 🤨`, threadID);
        }
        return;
      }

      if (!body) return;
      const trimmed = body.trim().toLowerCase();

      // 🎯 Normalize for abuse detection
      const normalize = (text) =>
        text.toLowerCase()
          .replace(/[4@]/g, "a").replace(/[1|!]/g, "i")
          .replace(/[0]/g, "o").replace(/[3]/g, "e")
          .replace(/[5$]/g, "s").replace(/[7]/g, "t");

      const normalized = normalize(trimmed);
      const badNames = ["sumi", "avi", "avii", "saina", "4vi"];
      const abuseWords = ["randi", "chut", "gand", "tbkc", "bsdk", "land", "gandu", "lodu", "lamd", "tmkc", "laude", "bhosda", "madarchod", "mc", "bc", "behnchod", "chutiya", "boor", "lowda", "maa", "didi"];

      if (
        badNames.some(n => normalized.includes(n)) &&
        abuseWords.some(w => normalized.includes(w)) &&
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

      // 🔁 Auto abuse to targeted UID
      if (fs.existsSync("np.txt") && senderID === targetUID) {
        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        if (lines.length > 0) {
          const line = lines[Math.floor(Math.random() * lines.length)];
          return api.sendMessage(line, threadID, messageID);
        }
      }

      // ❌ Non-owners can't run commands
      if (!OWNER_UIDS.includes(senderID)) return;

      // ✅ Emoji reply system (OWNER only)
      const emojiReplies = {
        "🙂": "Aisi shaant muskaan ke peeche kya chhupa hai? 🙂",
        "💔": "Dil toot gaya lagta hai 💔",
        "❤️": "Itna pyaar? ❤️",
        "😎": "Full swag on 🔥😎",
        "😂": "Yeh hasi... sach me contagious hai 😂",
        "😒": "Iss look ke peechhe zaroor kuch uff moment hai 😒",
        "😭": "Itna bhi mat ro 😭",
        "😘": "Ye pyaar bhara emoji 😘 kisi special ke liye toh nahi tha?",
      };
      if (emojiReplies[body]) return api.sendMessage(emojiReplies[body], threadID, messageID);

      // ✨ Command system
      const args = trimmed.split(" ");
      const cmd = args[0];
      const input = args.slice(1).join(" ");

      if (cmd === "*help") {
        return api.sendMessage(`
📌 Commands:
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
*target <uid>
*cleartarget
        `.trim(), threadID);
      }

      if (cmd === "*allname") {
        const info = await api.getThreadInfo(threadID);
        for (const uid of info.participantIDs) {
          await api.changeNickname(input, threadID, uid).catch(() => {});
          await new Promise(res => setTimeout(res, 10000));
        }
        return api.sendMessage("👥 Nicknames updated", threadID);
      }

      if (cmd === "*groupname") {
        await api.setTitle(input, threadID);
        return api.sendMessage("✅ Group name updated.", threadID);
      }

      if (cmd === "*lockgroupname") {
        await api.setTitle(input, threadID);
        lockedGroupNames[threadID] = input;
        return api.sendMessage(`🔒 Name locked: ${input}`, threadID);
      }

      if (cmd === "*unlockgroupname") {
        delete lockedGroupNames[threadID];
        return api.sendMessage("🔓 Group name unlocked.", threadID);
      }

      if (cmd === "*uid") {
        return api.sendMessage(`🆔 Group ID: ${threadID}`, threadID);
      }

      if (cmd === "*exit") {
        return api.sendMessage(`Bot jaa rha, kisi aur ki maa chodne ho to bula lena 😎🖕`, threadID, () => {
          api.removeUserFromGroup(botUID, threadID);
        });
      }

      if (cmd === "*rkb" || cmd === "*rkb2" || cmd === "*rkb3") {
        const fileMap = { "*rkb": "np.txt", "*rkb2": "np2.txt", "*rkb3": "np3.txt" };
        const file = fileMap[cmd];
        if (!fs.existsSync(file)) return api.sendMessage("❌ Gali file nahi mili", threadID);

        const name = input.trim();
        const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
        stopRequested = false;
        if (rkbInterval) clearInterval(rkbInterval);
        let i = 0;

        rkbInterval = setInterval(() => {
          if (i >= lines.length || stopRequested) {
            clearInterval(rkbInterval);
            rkbInterval = null;
            return;
          }
          api.sendMessage(`${name} ${lines[i++]}`, threadID);
        }, 40000);

        return api.sendMessage(`Chalu kar diya rkb on ${name}`, threadID);
      }

      if (cmd === "*stop") {
        stopRequested = true;
        if (rkbInterval) {
          clearInterval(rkbInterval);
          rkbInterval = null;
          return api.sendMessage("✅ RKB stopped", threadID);
        } else {
          return api.sendMessage("😴 Kuch chal hi nahi raha tha", threadID);
        }
      }

      if (cmd === "*photo") {
        api.sendMessage("📸 Send media in 1 min", threadID);
        const handleMedia = async (mediaEvent) => {
          if (mediaEvent.type === "message" && mediaEvent.threadID === threadID && mediaEvent.attachments?.length > 0) {
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
          return api.sendMessage("✅ Media loop stopped", threadID);
        }
      }

      if (cmd === "*forward") {
        const info = await api.getThreadInfo(threadID);
        const replyMsg = event.messageReply;
        if (!replyMsg) return api.sendMessage("❌ Reply kisi msg pe karo", threadID);
        for (const uid of info.participantIDs) {
          if (uid !== botUID) {
            await api.sendMessage({ body: replyMsg.body || "", attachment: replyMsg.attachments || [] }, uid);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
        return api.sendMessage("✅ Forwarded", threadID);
      }

      if (cmd === "*target") {
        if (!args[1]) return api.sendMessage("👤 UID de", threadID);
        targetUID = args[1];
        return api.sendMessage(`🎯 Targeting: ${targetUID}`, threadID);
      }

      if (cmd === "*cleartarget") {
        targetUID = null;
        return api.sendMessage("🎯 Cleared target UID", threadID);
      }

    } catch (e) {
      console.error("❗ Bot error:", e.message);
    }
  });
});
