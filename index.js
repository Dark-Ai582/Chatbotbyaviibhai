import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100069692356853", "61577620543563", "100053326246767", "61578026332802", "100040844743102", "61555128412763", "100069246310878", "100005122337500"];
const friendUIDs = fs.existsSync("Friend.txt")
  ? fs.readFileSync("Friend.txt", "utf8").split("\n").map(x => x.trim())
  : [];
const lockedGroupNames = {};

let rkbInterval = null,
  stopRequested = false;
let mediaLoopInterval = null,
  lastMedia = null;
let targetUID = null;

const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running</h2>"));
app.listen(20782, () =>
  console.log("🌐 Server running at http://localhost:20782")
);

process.on("uncaughtException", (err) =>
  console.error("❗ Uncaught Exception:", err.message)
);
process.on("unhandledRejection", (reason) =>
  console.error("❗ Unhandled Rejection:", reason)
);

login(
  { appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) },
  (err, api) => {
    if (err) return console.error("❌ Login failed:", err);
   api.setOptions({ listenEvents: true, selfListen: true });
   const botUID = api.getCurrentUserID();
if (!OWNER_UIDS.includes(botUID)) OWNER_UIDS.push(botUID);
    console.log("✅ Logged  ");

    api.listenMqtt(async (err, event) => {
      try {
        if (err || !event) return;
        const { threadID, senderID, body, messageID, type } = event;

        // Group name lock: Sumi Malkin 🙇 setting a fixed group name
        if (type === "event" && event.logMessageType === "log:thread-name") {
          const newName = event.logMessageData.name;
          const lockedName = lockedGroupNames[threadID];
          if (lockedName && newName !== lockedName) {
            await api.setTitle(lockedName, threadID);
            api.sendMessage(
              `randike name par majduri mat kr kuchh nhi hone wala`,
              threadID
            );
          }
          return;
        }

        
        if (!body) return;
        const lowerBody = body.toLowerCase();

        // Normalize text for abuse detection
        const normalize = (text) =>
          text
            .toLowerCase()
            .replace(/[4@]/g, "a")
            .replace(/[1|!]/g, "i")
            .replace(/[0]/g, "o")
            .replace(/[3]/g, "e")
            .replace(/[5$]/g, "s")
            .replace(/[7]/g, "t");

        const normalized = normalize(lowerBody);
        const badNames = ["abi", "Avi", "9vi", "AV|", "sumi", "Awvi", "4v|", "9v|", "sumii", "सुमित पंडित ", "avii"];
        const abuseWords = ["randi", "chut", "gand", "tbkc", "bsdk", "land", "gandu", "lodu", "lamd", "chumt", "tmkc", "laude", "bhosda", "madarchod", "mc", "bc", "behnchod", "chutiya", "boor", "lowda", "maa", "didi"];

        if (
          badNames.some((name) => normalized.includes(name)) &&
          abuseWords.some((word) => normalized.includes(word)) &&
          !OWNER_UIDS.includes(senderID) &&
          !friendUIDs.includes(senderID)
        ) {
          if (fs.existsSync("abuse.txt")) {
            const lines = fs
              .readFileSync("abuse.txt", "utf8")
              .split("\n")
              .filter(Boolean);
            for (let i = 0; i < 2 && i < lines.length; i++) {
              api.sendMessage(lines[i], threadID, messageID);
            }
          }
          return;
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
      "Abey Cancer bhosde se nikala hua bachha mere admin ke reply me se sahi se baat kr vrna teri ma chod dunga vo";

    return api.sendMessage(gali, threadID, messageID);
  }
}        
        // .unsent command: unsend the replied message
        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          lowerBody.startsWith(".unsent")
        ) {
          return api.unsendMessage(event.messageReply.messageID);
        }

            

// Queue system for each message from target
const targetQueue = [];

// !bhai gali kyun? to set target UID from reply
if (
  OWNER_UIDS.includes(senderID) &&
  event.messageReply &&
  body.trim().toLowerCase() === "?"
) {
  const repliedUserID = event.messageReply.senderID;
  targetUID = repliedUserID;
  api.sendMessage(" khana kha liye ?", threadID, messageID);
  return;
}

// If message from targetUID, queue it for reply
if (
  targetUID &&
  fs.existsSync("np.txt") &&
  senderID === targetUID
) {
  const lineList = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
  if (lineList.length === 0) return;

  // React immediately
  api.setMessageReaction("😆", messageID, (err) => {
    if (err) console.error("Reaction error:", err);
  }, true);

  // Add to queue with 9s delay
  targetQueue.push({ messageID, threadID });

  setTimeout(() => {
    const item = targetQueue.shift();
    if (item) {
      const randomLine = lineList[Math.floor(Math.random() * lineList.length)];
      api.sendMessage(randomLine, item.threadID, item.messageID);
    }
  }, 9000);
}
        
        // .senapati command: royal reply with maharani + fielding
if (OWNER_UIDS.includes(senderID) && lowerBody.includes("sena pati")) {
  api.sendMessage(
    " yes Don here",
    threadID
  );

  setTimeout(() => {
    api.sendMessage(
      "kis ma ke lor3 ki fielding set kru",
      threadID
    );
  }, 3000);

  return;
}
        // Admin-only commands below this point
        if (!OWNER_UIDS.includes(senderID)) return;

        const args = lowerBody.trim().split(" ");
        const cmd = args[0];
        const input = args.slice(1).join(" ");

        // .allname command: change nickname for all participants
        if (cmd === ".allname") {
          const info = await api.getThreadInfo(threadID);
          for (const uid of info.participantIDs) {
            await api.changeNickname(input, threadID, uid).catch(() => {});
            await new Promise((res) => setTimeout(res, 20000));
          }
          return api.sendMessage("👥 Nicknames updated", threadID);
        }

        // .groupname command: set group name
        if (cmd === ".groupname") {
          await api.setTitle(input, threadID);
          return api.sendMessage("Group name updated.", threadID);
        }

        // .lockgroupname command: lock the group name to prevent changes
        if (cmd === ".lockgroupname") {
          await api.setTitle(input, threadID);
          lockedGroupNames[threadID] = input;
          return api.sendMessage(
            `tere baap ne lock kar diya naam ab koi badalega to uski maa bhi chudegi 😎 Locked: ${input}`,
            threadID
          );
        }

        // .unlockgroupname command: remove the lock on group name
        if (cmd === ".unlockgroupname") {
          delete lockedGroupNames[threadID];
          return api.sendMessage(
            "Chal bc chhor deta unlock kia",
            threadID
          );
        }

        // .uid command: display group ID
        if (cmd === ".uid") {
          return api.sendMessage(` han ye le ${threadID}`, threadID);
        }

        // .exit command: exit from group with farewell message
        if (cmd === ".exit") {
          return api.sendMessage(
            `chalta hun sabki maa chod di, bulana kabhi kisi ke 25K gulam ko todna ho 🙏`,
            threadID,
            () => {
              api.removeUserFromGroup(api.getCurrentUserID(), threadID);
            }
          );
        }

        // .rkb, .rkb2, .rkb3 commands: send looping abusive messages from file
        if (cmd === ".rkb" || cmd === ".rkb2" || cmd === ".rkb3") {
          const file =
            cmd === ".rkb"
              ? "np.txt"
              : cmd === ".rkb2"
              ? "np2.txt"
              : "np3.txt";
          if (!fs.existsSync(file))
            return api.sendMessage("❌ Gali file nahi mili", threadID);
          const name = input || "🥰";
          const lines = fs
            .readFileSync(file, "utf8")
            .split("\n")
            .filter(Boolean);
          stopRequested = false;
          if (rkbInterval) clearInterval(rkbInterval);
          let index = 0;
          rkbInterval = setInterval(() => {
            if (stopRequested || index >= lines.length) {
              clearInterval(rkbInterval);
              rkbInterval = null;
              return;
            }
            api.sendMessage(`${name} ${lines[index++]}`, threadID);
          }, 10000);
          return api.sendMessage(
            `Ab Dekh Tu mera jaddu v:  ${name}`,
            threadID
          );
        }

        // .stop command: stop the ongoing abusive loop
        if (cmd === ".stop") {
          stopRequested = true;
          if (rkbInterval) {
            clearInterval(rkbInterval);
            rkbInterval = null;
            return api.sendMessage("ok 😎", threadID);
          } else {
            return api.sendMessage("Kuch chalu nahi tha ", threadID);
          }
        }

        // .photo command: start media loop; wait for media within 1 min
        if (cmd === ".photo") {
          api.sendMessage("📸 Send media in 1 min", threadID);
          const handler = async (ev) => {
            if (
              ev.type === "message" &&
              ev.threadID === threadID &&
              ev.attachments.length > 0
            ) {
              lastMedia = { attachments: ev.attachments };
              if (mediaLoopInterval) clearInterval(mediaLoopInterval);
              mediaLoopInterval = setInterval(() => {
                api.sendMessage({ attachment: lastMedia.attachments }, threadID);
              }, 30000);
              api.removeListener("message", handler);
            }
          };
          api.on("message", handler);
        }

        // .stopphoto command: stop media loop
        if (cmd === ".stopphoto") {
          if (mediaLoopInterval) {
            clearInterval(mediaLoopInterval);
            mediaLoopInterval = null;
            return api.sendMessage("❌ Photo loop stopped", threadID);
          }
        }

        // .forward command: forward a replied message to all group members
        if (cmd === ".forward") {
          const reply = event.messageReply;
          if (!reply)
            return api.sendMessage("❌ Reply kis msg pe karu bhai", threadID);
          const info = await api.getThreadInfo(threadID);
          for (const uid of info.participantIDs) {
            if (uid !== api.getCurrentUserID()) {
              await api.sendMessage(
                { body: reply.body || "", attachment: reply.attachments || [] },
                uid
              );
              await new Promise((r) => setTimeout(r, 2000));
            }
          }
          return api.sendMessage("✅ Forwarded", threadID);
        }

        let targetLoop = null;
let targetInfo = null;
let groupMonitor = {};

if (cmd === ".t") {
  const target = args[1];
  if (!target) return api.sendMessage("👤 UID de bhai", threadID);

  const threadInfo = await api.getThreadInfo(threadID);
  const targetParticipant = threadInfo.userInfo.find(user => user.id === target);

  const name = targetParticipant ? targetParticipant.name : "randike";
  const mentionTag = [{ tag: name, id: target }];

  const np1 = fs.existsSync("np.txt") ? fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean) : [];
  const np2 = fs.existsSync("np2.txt") ? fs.readFileSync("np2.txt", "utf8").split("\n").filter(Boolean) : [];
  const np3 = fs.existsSync("np3.txt") ? fs.readFileSync("np3.txt", "utf8").split("\n").filter(Boolean) : [];

  if (np1.length === 0 && np2.length === 0 && np3.length === 0)
    return api.sendMessage("😒 Gali dene ke liye teenon file khaali hai", threadID);

  // Stop any previous loop
  if (targetLoop) clearInterval(targetLoop);

  targetInfo = { id: target, name, threadID };
  groupMonitor[threadID] = targetInfo;

  if (targetParticipant) {
    api.sendMessage({ body: `Ab ${name} ki maa chudegi 😈🔥`, mentions: mentionTag }, threadID);
    startGaliLoop(api);
  } else {
    api.sendMessage("abe sale yah to group se bhag gaya hai 😤", threadID);
  }
}

// Rejoin detection: if target rejoined, resume gali
if (event.logMessageType === "log:subscribe" && groupMonitor[event.threadID]) {
  const addedIDs = event.logMessageData.addedParticipants.map(p => p.userFbId);
  const target = groupMonitor[event.threadID];

  if (addedIDs.includes(target.id)) {
    api.sendMessage(`😈 randi ke bacche Tu wapas a Gaya to Fir chudega`, event.threadID, () => {
      startGaliLoop(api);
    });
  }
}
        
// ➕ Loop starter
function startGaliLoop(api) {
  if (!targetInfo) return;

  const np1 = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
  const np2 = fs.readFileSync("np2.txt", "utf8").split("\n").filter(Boolean);
  const np3 = fs.readFileSync("np3.txt", "utf8").split("\n").filter(Boolean);
  const files = [np1, np2, np3];

  let index = 0;

  targetLoop = setInterval(async () => {
    const threadInfo = await api.getThreadInfo(targetInfo.threadID);
    const inGroup = threadInfo.participantIDs.includes(targetInfo.id);

    if (!inGroup) {
      clearInterval(targetLoop);
      targetLoop = null;
      api.sendMessage("😒 Target group se nikal gaya... gali band kar diya", targetInfo.threadID);
      return;
    }

    const fileIndex = index % 3;
    const lineIndex = Math.floor(index / 3) % files[fileIndex].length;
    const line = files[fileIndex][lineIndex];

    if (line) {
      api.sendMessage({
        body: `@${targetInfo.name} ${line}`,
        mentions: [{ tag: targetInfo.name, id: targetInfo.id }]
      }, targetInfo.threadID);
    }

    index++;
  }, 22000);
}

// Rejoin detection: if target rejoined, resume gali
if (event.logMessageType === "log:subscribe" && groupMonitor[event.threadID]) {
  const addedIDs = event.logMessageData.addedParticipants.map(p => p.userFbId);
  const target = groupMonitor[event.threadID];

  if (addedIDs.includes(target.id)) {
    api.sendMessage(`😈 ${target.name} wapas aaya... ab firse maa chudegi`, event.threadID);
    startGaliLoop(api);
  }
}
     
        // .c command: clear targetUID and stop mention loop
if (cmd === ".c") {
  targetUID = null;
  if (targetLoop) {
    clearInterval(targetLoop);
    targetLoop = null;
  }
  targetInfo = null;
  return api.sendMessage("chal mai aya khake 😴 ", threadID);
}
        // .id command: show UID of the replied message sender
        if (cmd === ".id" && event.messageReply) {
          return api.sendMessage(
            `le pakad 🫤: ${event.messageReply.senderID}`,
            threadID,
            messageID
          );
        }

        // .help command: list all available commands
        if (cmd === "-help") {
          return api.sendMessage(
            `🆘 Commands:
.allname <name>
.groupname <name>
.lockgroupname <name>
.unlockgroupname
.uid / .id (on reply)
.exit
.rkb <name>, .rkb2, .rkb3
.stop
.photo / .stopphoto
.forward (on reply)
.t <uid> / .c
.bhai gali kyun? (on reply)
.senapati
.unsent (on reply)
.help`,
            threadID
          );
        }
      } catch (e) {
        console.error("❗ Bot error:", e.message);
      }
    });
  }
);
