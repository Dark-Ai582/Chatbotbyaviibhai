import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100082811408144", "100005122337500"];
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

  api.listenMqtt(async (err, event) => {
    try {
      if (err || !event) return;
      const { threadID, senderID, body, messageID } = event;

      // Group name change detector
      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const currentName = event.logMessageData.name;
        const lockedName = lockedGroupNames[threadID];
        if (lockedName && currentName !== lockedName) {
          await api.setTitle(lockedName, threadID);
          api.sendMessage(`oi Randike yehan avii bos ne name rakha gc ke ab tere baap ka bhi aukat nhi badal sake 🤨 samjha lode chal nikal`, threadID);
        }
        return;
      }

      if (!body) return;
      const lowerBody = body.toLowerCase();

      // Leetspeak normalize function
      const normalize = (text) =>
        text.toLowerCase()
          .replace(/[4@]/g, "a")
          .replace(/[1|!]/g, "i")
          .replace(/[0]/g, "o")
          .replace(/[3]/g, "e")
          .replace(/[5$]/g, "s")
          .replace(/[7]/g, "t");

      const normalized = normalize(lowerBody);
      const badNames = ["avi", "avii", "aavi", "anox", "4VI", "@VI", "4N0X"];
      const abuseWords = ["randi", "chut", "gand", "bhosda", "madarchod", "mc", "bc", "behnchod", "chutiya", "gandu", "boor", "lowda", "maa", "didi"];

      // Abuse detection
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

      // UID targeting response
      if (targetUID && senderID === targetUID && fs.existsSync("np.txt")) {
        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        if (lines.length > 0) {
          const randomLine = lines[Math.floor(Math.random() * lines.length)];
          api.sendMessage(randomLine, threadID, messageID);
        }
      }

      // OWNER-only commands
      if (!OWNER_UIDS.includes(senderID)) return;
      const args = body.trim().split(" ");
      const cmd = args[0].toLowerCase();
      const input = args.slice(1).join(" ");

      // Nickname all
      if (cmd === "!allname") {
        const info = await api.getThreadInfo(threadID);
        for (const uid of info.participantIDs) {
          await api.changeNickname(input, threadID, uid).catch(() => {});
          await new Promise(res => setTimeout(res, 20000));
        }
        api.sendMessage("👥 Nicknames updated", threadID);
      }

      else if (cmd === "!groupname") {
        await api.setTitle(input, threadID);
        api.sendMessage("Group name updated.", threadID);
      }

      else if (cmd === "!lockgroupname") {
        await api.setTitle(input, threadID);
        lockedGroupNames[threadID] = input;
        api.sendMessage(` Avii sir lock hogya name ab koi badalega to uski ma bhi chod dunga ap bolo to 😎Locked: ${input}`, threadID);
      }

      else if (cmd === "!unlockgroupname") {
        delete lockedGroupNames[threadID];
        api.sendMessage("🔓ok avii sir kr diya unblock ma chudane do naam par rkb ko Unlocked group name.", threadID);
      }

      else if (cmd === "!uid") {
        api.sendMessage(`🆔 kya hua ji avi ka nokar ankit  gulam  pakdya kya 😆 jo uid mang rahe Group ID: ${threadID}`, threadID);
      }

      else if (cmd === "!exit") {
        api.sendMessage(`avii bhaiya chalta hun sabki ma chod diya kabhi ankit lohar ya parth nishant jaise 23K gulam ko chodna ho to bula lena inki ma ki bur me sui dhaga dal kr see dunga 🙏🖕😎`, threadID, () => {
          api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        });
      }

if (cmd === "!rkb") {
  if (!fs.existsSync("np.txt")) return api.sendMessage("konsa gaLi du rkb ko", threadID);
  const name = input.trim();
  const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
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

  api.sendMessage(`iski maa chhodta hun avi bhai rukja ${name}`, threadID);
}

if (cmd === "!rkb2") {
  if (!fs.existsSync("np2.txt")) return api.sendMessage("konsa gaLi du rkb2 ko", threadID);
  const name = input.trim();
  const lines = fs.readFileSync("np2.txt", "utf8").split("\n").filter(Boolean);
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

  api.sendMessage(`ruka ja randike bachhe teri ma ki chut ${name}`, threadID);
}

if (cmd === "!rkb3") {
  if (!fs.existsSync("np3.txt")) return api.sendMessage("konsa gaLi du rkb3 ko", threadID);
  const name = input.trim();
  const lines = fs.readFileSync("np3.txt", "utf8").split("\n").filter(Boolean);
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

  api.sendMessage(`😗 rukja avii bhaiya kr rha ${name}`, threadID);
}

if (cmd === "!stop") {
  stopRequested = true;
  if (rkbInterval) {
    clearInterval(rkbInterval);
    rkbInterval = null;
    api.sendMessage("chud gaye bche🤣 avii bhai maii ata hun ankit ki ma bula rahi jara sa ", threadID);
  } else {
    api.sendMessage("konsa gaLi du i is  sale ko🤣 rkb tha", threadID);
  }
}

rkbCommand("", "np.txt");
rkbCommand("2", "np2.txt");
rkbCommand("3", "np3.txt");

if (cmd === "!stop") {
  stopRequested = true;
  if (rkbInterval) {
    clearInterval(rkbInterval);
    rkbInterval = null;
    api.sendMessage("Stopped.", threadID);
  } else {
    api.sendMessage("Kuch chal hi nahi raha tha bhai", threadID);
  }
}

      rkbCommand("", "np.txt");
      rkbCommand("2", "np2.txt");
      rkbCommand("3", "np3.txt");

      else if (cmd === "!stop") {
        stopRequested = true;
        if (rkbInterval) {
          clearInterval(rkbInterval);
          rkbInterval = null;
          api.sendMessage("Stopped.", threadID);
        } else {
          api.sendMessage("rkb ko bekar me dara diya 😂😜 kuchh na chal raha lode", threadID);
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

      else if (cmd === "!target") {
        if (!args[1]) return api.sendMessage("👤 UID de", threadID);
        targetUID = args[1];
        api.sendMessage(`Targeting UID: ${targetUID}`, threadID);
      }

      else if (cmd === "!cleartarget") {
        targetUID = null;
        api.sendMessage("🎯 Cleared target", threadID);
      }

      else if (cmd === "!help") {
        const help = `
📌 Commands:
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
!target <uid>
!cleartarget
BAKI <ANKIT> <NISHANT> <PARTH> SATSE GULAM KI MA KI CHOOT
!help
`;
        api.sendMessage(help.trim(), threadID);
      }

    } catch (e) {
      console.error("❗ Bot error:", e.message);
    }
  });
});
