import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100040844743102",  "100005122337500"];
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
  api.setOptions({ listenEvents: true });
  console.log("✅ Bot logged in and running...");

  api.listenMqtt(async (err, event) => {
    try {
      if (err || !event || !event.body) return;
      const { threadID, senderID, body, messageID } = event;

      const normalize = (text) =>
        text.toLowerCase()
          .replace(/[4@]/g, "a")
          .replace(/[1|!]/g, "i")
          .replace(/[0]/g, "o")
          .replace(/[3]/g, "e")
          .replace(/[5$]/g, "s")
          .replace(/[7]/g, "t");

      const lowerBody = body.toLowerCase();
      const normalized = normalize(lowerBody);

      const abuseWords = ["randi", "chut", "gand", "tbkc", "bsdk", "land", "gandu", "lodu", "lamd", "chumt", "tmkc", "laude", "bhosda", "madarchod", "mc", "bc", "behnchod", "chutiya", "boor", "lowda", "maa", "didi"];
      const targetNames = ["Aryan", "4ryan", "9ry4n", "9ryan", "Aryan", "aryn", "4ry4n", "9ry9n"];

      if (
        targetNames.some(n => normalized.includes(n)) &&
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

      if (
        OWNER_UIDS.includes(senderID) &&
        event.messageReply &&
        body.trim().toLowerCase() === "?"
      ) {
        const repliedUserID = event.messageReply.senderID;
        targetUID = repliedUserID;
        api.sendMessage(":P", threadID, messageID);
        return;
      }

      if (targetUID && fs.existsSync("np.txt") && senderID === targetUID) {
        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        if (lines.length > 0) {
          const line = lines[Math.floor(Math.random() * lines.length)];
          api.sendMessage(line, threadID, messageID);
        }
        return;
      }

      //  RESPECT ADMIN SHIELD: Reply with heavy gali if someone abuses an admin
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
      "Abey Cancer bhosde se nikala hua bachha mere admin ke reply me se sahi se baat kr vrna teri ma chod dunga vo";

    return api.sendMessage(gali, threadID, messageID);
  }
}     




// 🔥 Auto-reply if admin writes "kallo"
if (
  event.type === "message" &&
  OWNER_UIDS.includes(senderID) &&
  typeof body === "string" &&
  body.trim().toLowerCase() === "Janu"
) {
  api.sendMessage("Ji Aryan Malik Hukim kijiye kya kand karna hai 😋", threadID, messageID);
}
      
      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const newName = event.logMessageData.name;
        const locked = lockedGroupNames[threadID];
        if (locked && newName !== locked) {
          await api.setTitle(locked, threadID);
          api.sendMessage("oi Randike, Aryan ne naam lock kar diya hai, ab tere baap ka bhi aukat nahi badal sakta 🤨", threadID);
        }
        return;
      }

      if (!OWNER_UIDS.includes(senderID)) return;
      const args = body.trim().split(" ");
      const cmd = args[0].toLowerCase();
      const input = args.slice(1).join(" ");

      switch (cmd) {
        case "-allname": {
          const info = await api.getThreadInfo(threadID);
          for (let uid of info.participantIDs) {
            await api.changeNickname(input, threadID, uid).catch(() => {});
            await new Promise(res => setTimeout(res, 20000));
          }
          return api.sendMessage("👥 Nicknames updated", threadID);
        }

        case "-groupname":
          await api.setTitle(input, threadID);
          return api.sendMessage("Group name updated.", threadID);

        case "-lockgroupname":
          await api.setTitle(input, threadID);
          lockedGroupNames[threadID] = input;
          return api.sendMessage(`Aryan sir lock hogya name. Ab koi badalega to uski ma bhi chod dunga 😎 Locked: ${input}`, threadID);

        case "-unlockgroupname":
          delete lockedGroupNames[threadID];
          return api.sendMessage("🔓 Unlock kar diya.", threadID);

        case "-uid":
          return api.sendMessage(`😏 Group ID: ${threadID}`, threadID);

        case "-exit":
          return api.sendMessage("Aryan bhaiya chalta hun... sabki maa chod diya 🖕", threadID, () => {
            api.removeUserFromGroup(api.getCurrentUserID(), threadID);
          });

        case "-rkb":
        case "-rkb2":
        case "-rkb3": {
          const fileMap = { "-rkb": "np.txt", "-rkb2": "np2.txt", "-rkb3": "np3.txt" };
          const file = fileMap[cmd];
          if (!fs.existsSync(file)) return api.sendMessage("File nahi mila", threadID);
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
          return api.sendMessage(`😗 RKB started: ${name}`, threadID);
        }

      // !id command on reply
      if (
        OWNER_UIDS.includes(senderID) &&
        event.messageReply &&
        body.trim().toLowerCase() === "-id"
      ) {
        const repliedUserID = event.messageReply.senderID;
        api.sendMessage(`🆔 UID: ${repliedUserID}`, threadID, messageID);
        return;
      }

          
        case "-stop":
          stopRequested = true;
          if (rkbInterval) {
            clearInterval(rkbInterval);
            rkbInterval = null;
            return api.sendMessage("rkb ko bekar me dara diya 😂😜", threadID);
          }
          return api.sendMessage("Kuch chal hi nahi raha tha bhai", threadID);

        case "-photo":
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
          break;

        case "-stopphoto":
          if (mediaLoopInterval) {
            clearInterval(mediaLoopInterval);
            lastMedia = null;
            return api.sendMessage("Stopped media loop.", threadID);
          }
          break;

        case "-forward": {
          const replyMsg = event.messageReply;
          if (!replyMsg) return api.sendMessage("❌ Reply kisi msg pe karo", threadID);
          const info = await api.getThreadInfo(threadID);
          for (let uid of info.participantIDs) {
            if (uid !== api.getCurrentUserID()) {
              await api.sendMessage({ body: replyMsg.body || "", attachment: replyMsg.attachments || [] }, uid);
              await new Promise(r => setTimeout(r, 2000));
            }
          }
          return api.sendMessage("✅ Forwarded", threadID);
        }

        case "-t":
          if (!args[1]) return api.sendMessage("👤 UID de bhai", threadID);
          targetUID = args[1];
          return api.sendMessage(`😜: ${targetUID} (Piyush bhai)`, threadID);

        case "-c":
          targetUID = null;
          return api.sendMessage("😒", threadID);

        case "-help":
          return api.sendMessage(`
📌 Commands:
-target <uid>
-cleartarget
-allname <name>
-groupname <name>
-lockgroupname <name>
-unlockgroupname
-uid
-exit
-rkb <name>
-rkb2 <name>
-rkb3 <name>
-stop
-photo
-stopphoto
-forward (reply required)
-help
`, threadID);
      }
    } catch (e) {
      console.error("❌ Error:", e);
    }
  });
});
