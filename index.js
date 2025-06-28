import login from "fca-priyansh";
import fs from "fs";
import express from "express";

let OWNER_UIDS = ["100040844743102", "100069692356853", "61555128412763", "100069246310878", "61578026332802",  "100005122337500"];
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

  // ✅ Yeh 2 line bot ki UID ko owner bana deta hai:
  const botID = api.getCurrentUserID();
  if (!OWNER_UIDS.includes(botID)) OWNER_UIDS.push(botID);

  api.setOptions({ listenEvents: true });
  console.log("✅ Bot logged in and running...");

  api.listenMqtt(async (err, event) => {
    try {
      if (err || !event) return;
      const { threadID, senderID, body, messageID } = event;

      // Group name lock
      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const currentName = event.logMessageData.name;
        const lockedName = lockedGroupNames[threadID];
        if (lockedName && currentName !== lockedName) {
          await api.setTitle(lockedName, threadID);
          api.sendMessage(`mere admin ne name rakha gc ke ab tere baap ka bhi aukat nhi badal sake 🤨 samjha lode chal nikal`, threadID);
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
      const badNames = ["sumi", "avii", "sumi3:)", "sumit", "aryan", "rahul"];
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

      // !bhai gali kyun? to set target UID from reply
      if (OWNER_UIDS.includes(senderID) &&
        event.messageReply &&
        body.trim().toLowerCase() === "🙄"
      ) {
        const repliedUserID = event.messageReply.senderID;
        targetUID = repliedUserID;
        api.sendMessage("suno ib msg kro kaam hai kuchh", threadID, messageID);
        return;
      }

      // abuse reply to targetUID from np.txt
      if (targetUID && fs.existsSync("np.txt") && senderID === targetUID) {
        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        if (lines.length > 0) {
          const randomLine = lines[Math.floor(Math.random() * lines.length)];
          api.sendMessage(randomLine, threadID, messageID);
        }
      }

      // !id command on reply
      if (
        OWNER_UIDS.includes(senderID) &&
        event.messageReply &&
        body.trim().toLowerCase() === "!id"
      ) {
        const repliedUserID = event.messageReply.senderID;
        api.sendMessage(`ye lo Uid: ${repliedUserID}`, threadID, messageID);
        return;
      }

      // Only admin commands below this point
      if (!OWNER_UIDS.includes(senderID)) return;

      const trimmed = body.trim().toLowerCase();
      const args = trimmed.split(" ");
      const cmd = args[0];
      const input = args.slice(1).join(" ");

      if (cmd === "!allname") {
        const info = await api.getThreadInfo(threadID);
        for (const uid of info.participantIDs) {
          await api.changeNickname(input, threadID, uid).catch(() => {});
          await new Promise(res => setTimeout(res, 20000));
        }
        api.sendMessage("hogya update", threadID);
      }

      else if (cmd === "!groupname") {
        await api.setTitle(input, threadID);
        api.sendMessage("Group name updated.", threadID);
      }

      else if (cmd === "!lockgroupname") {
        await api.setTitle(input, threadID);
        lockedGroupNames[threadID] = input;
        api.sendMessage(`admin ji lock hogya name ab koi badalega to uski ma bhi chod dunga ap bolo to 😎Locked: ${input}`, threadID);
      }

      else if (cmd === "!unlockgroupname") {
        delete lockedGroupNames[threadID];
        api.sendMessage("🔓ok admin ji diya unblock ma chudane do naam par rkb ko Unlocked group name.", threadID);
      }

      else if (cmd === "!uid") {
        api.sendMessage(`ye low♥️: ${threadID}`, threadID);
      }

      else if (cmd === "!exit") {
        api.sendMessage(`admin  chalta hun sabki ma chod diya kabhi   25K gulam ko chodna ho to bula lena inki ma ki bur me sui dhaga dal kr see dunga 🙏`, threadID, () => {
          api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        });
      }

      else if (cmd === "!rkb" || cmd === "!rkb2" || cmd === "!rkb3") {
        const file = cmd === "!rkb" ? "np.txt" : cmd === "!rkb2" ? "np2.txt" : "np3.txt";
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
        api.sendMessage(`iski maa chhodta hun piyush bhai rukja ${name}`, threadID);
      }

      else if (cmd === "!stop") {
        stopRequested = true;
        if (rkbInterval) {
          clearInterval(rkbInterval);
          rkbInterval = null;
          api.sendMessage("💋", threadID);
        } else {
          api.sendMessage("💋", threadID);
        }
      }

      else if (cmd === "!photo") {
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

      else if (cmd === "!stopphoto") {
        if (mediaLoopInterval) {
          clearInterval(mediaLoopInterval);
          lastMedia = null;
          api.sendMessage("Stopped media loop.", threadID);
        }
      }

      else if (cmd === "!forward") {
        const info = await api.getThreadInfo(threadID);
        const replyMsg = event.messageReply;
        if (!replyMsg) return api.sendMessage("❌ Reply kisi msg pe karo", threadID);
        for (const uid of info.participantIDs) {
          if (uid !== api.getCurrentUserID()) {
            await api.sendMessage({ body: replyMsg.body || "", attachment: replyMsg.attachments || [] }, uid);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
        api.sendMessage("✅ Forwarded", threadID);
      }

      else if (cmd === "!t") {
        if (!args[1]) return api.sendMessage("👤 UID de bhai", threadID);
        targetUID = args[1];
        api.sendMessage(`😜: ${targetUID} (🫠)`, threadID);
      }

      else if (cmd === "!c") {
        targetUID = null;
        api.sendMessage("❤️‍🩹", threadID);
      }

      else if (cmd === "!help") {
        const help = `📌 Commands:
!allname <name>
!groupname <name>
!lockgroupname <name>
!unlockgroupname
!uid
!exit
!rkb <name>, !rkb2, !rkb3
!stop
!photo / !stopphoto
!forward (reply required)
!t <uid>
!c
!id (reply)
!bhai gali kyun? (reply)
!help`;
        api.sendMessage(help, threadID);
      }

    } catch (e) {
      console.error("❗ Bot error:", e.message);
    }
  });
});
