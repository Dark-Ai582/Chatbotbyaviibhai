import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["61577620543563", "61561711904186",  "100069246310878", "100005122337500"];
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

login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
  if (err) return console.error("❌ Login failed:", err);
  api.setOptions({ listenEvents: true, selfListen: true });
  const botUID = api.getCurrentUserID();
if (!OWNER_UIDS.includes(botUID)) OWNER_UIDS.push(botUID);
  console.log("✅ Bot logged in and running...");

  api.listenMqtt(async (err, event) => {
    try {
      if (err || !event) return;
      const { threadID, senderID, body, messageID } = event;

      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const currentName = event.logMessageData.name;
        const lockedName = lockedGroupNames[threadID];
        if (lockedName && currentName !== lockedName) {
          await api.setTitle(lockedName, threadID);
          api.sendMessage(`Abey Majdur sun idhar Name to tera baap bhi ni badal skta majduri mat kr ma chod dunga ni to chal nikl`, threadID);
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
      const badNames = ["Sumi", "avii", "saina", "sumi3:)", "s4ina", "sumii"];
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

      // !bhai gali kyun? with delay
      if (
        OWNER_UIDS.includes(senderID) &&
        event.messageReply &&
        body.trim().toLowerCase() === "?"
      ) {
        const repliedUserID = event.messageReply.senderID;
        targetUID = repliedUserID;
        setTimeout(() => {
          api.sendMessage("Aur kya hall hain apke 😊", threadID, messageID);
        }, 4000);
        return;
      }

      // auto abuse on targetUID from np.txt
      if (targetUID && fs.existsSync("np.txt") && senderID === targetUID) {
        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        if (lines.length > 0) {
          const randomLine = lines[Math.floor(Math.random() * lines.length)];
          api.sendMessage(randomLine, threadID, messageID);
        }
      }

      // .id command (reply)
      if (
        OWNER_UIDS.includes(senderID) &&
        event.messageReply &&
        body.trim().toLowerCase() === ".id"
      ) {
        const repliedUserID = event.messageReply.senderID;
        api.sendMessage(`lo is chutiye ka uid 😴${repliedUserID}`, threadID, messageID);
        return;
      }

    // .unsent command: unsend the replied message
        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          lowerBody.startsWith(".unsent")
        ) {
          return api.unsendMessage(event.messageReply.messageID);
        }

// 💢 RESPECT ADMIN SHIELD: Reply with heavy gali if someone abuses an admin
if (
  event.messageReply &&
  OWNER_UIDS.includes(event.messageReply.senderID) &&
  !OWNER_UIDS.includes(senderID)
) {
  const normalize = (text) =>
    text
      .toLowerCase()
      .replace(/[4@]/g, "a")
      .replace(/[1|!]/g, "i")
      .replace(/[0]/g, "o")
      .replace(/[3]/g, "e")
      .replace(/[5$]/g, "s")
      .replace(/[7]/g, "t");

  const galiWords = [
    "randi", "chut", "gand", "gandu", "chutiya", "madarchod", "bhosda", "behnchod",
    "mc", "bc", "lowda", "lund", "ma chudane", "maa ka", "teri maa"
  ];

  const normalized = normalize(body);
  const isAbusive = galiWords.some((word) => normalized.includes(word));

  if (isAbusive) {
    const gali =
      "Sun Randike mere Admin ke Reply me izzat se baat kar vrna Teri ma ki chut me land deke fad kr darzi se silwa dunga ok next time dhyan rakhna target hojyega?♥️ok ";

    return api.sendMessage(gali, threadID, messageID);
  }
}        


      if (cmd === ".allname") {
        const info = await api.getThreadInfo(threadID);
        for (const uid of info.participantIDs) {
          await api.changeNickname(input, threadID, uid).catch(() => {});
          await new Promise(res => setTimeout(res, 20000));
        }
        api.sendMessage("Sb rkb ka nickname badal diya jo na badla uspe zuku ma chudwa liya", threadID);
      }

      else if (cmd === ".groupname") {
        await api.setTitle(input, threadID);
        api.sendMessage("Tera baap hun madrchod.", threadID);
      }

      else if (cmd === ".lockgroupname") {
        await api.setTitle(input, threadID);
        lockedGroupNames[threadID] = input;
        api.sendMessage(`Mera loda ab koi chnage kar payega group name karke dikha himmat he to Locked: ${input}`, threadID);
      }

      else if (cmd === ".unlockgroupname") {
        delete lockedGroupNames[threadID];
        api.sendMessage("Ab name change kar sakte ❤️‍🩹 admin ne rok diya mujhe", threadID);
      }

      else if (cmd === ".uid") {
        api.sendMessage(`Pakdo ji Group ID: ${threadID}`, threadID);
      }

      else if (cmd === "*exit") {
        api.sendMessage(`Thik hai 💔 chalta hun dhyan rakhna apna`, threadID, () => {
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
        api.sendMessage(`Areh iski ma ki chut ruko tum ${name}`, threadID);
      }

      else if (cmd === ".stop") {
        stopRequested = true;
        if (rkbInterval) {
          clearInterval(rkbInterval);
          rkbInterval = null;
          api.sendMessage("Thik hai  Jata hun maii ", threadID);
        } else {
          api.sendMessage("kuchh nhi tha admin ji", threadID);
        }
      }

     
// 🔥 Auto-reply if admin writes "kallo"
if (
  event.type === "message" &&
  OWNER_UIDS.includes(senderID) &&
  typeof body === "string" &&
  body.trim().toLowerCase() === "kallo"
) {
  api.sendMessage("bolo ji 💔 cutiie kya preshani hui", threadID, messageID);
}
           

else if (cmd === "!t") {
        if (!args[1]) return api.sendMessage("👤 UID de bhai", threadID);
        targetUID = args[1];
        api.sendMessage(`😜: ${targetUID} (🫠)`, threadID);
}
  
      else if (cmd === ".c") {
        targetUID = null;
        api.sendMessage("😭", threadID);
      }

      else if (cmd === ".help") {
        const help = `📌 Commands:
.allname <name>
.groupname <name>
.lockgroupname <name>
.unlockgroupname
.uid
.exit
.rkb <name>, !rkb2, !rkb3
.stop
.t <uid>
!c
.id (jiska uid cahiye)
? (target wale ka reply kro)
.help`;
        api.sendMessage(help, threadID);
      }

    } catch (e) {
      console.error("❗ Bot error:", e.message);
    }
  });
});
