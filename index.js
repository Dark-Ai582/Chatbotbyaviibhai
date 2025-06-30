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
const activeTargets = {};
const handledMessages = new Set();

const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running</h2>"));
app.listen(20782, () =>
  console.log("Server running at http://localhost:20782")
);

process.on("uncaughtException", (err) =>
  console.error("Uncaught Exception:", err.message)
);
process.on("unhandledRejection", (reason) =>
  console.error("Unhandled Rejection:", reason)
);

login(
  { appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) },
  (err, api) => {
    if (err) return console.error(" Login failed:", err);
    api.setOptions({ listenEvents: true, selfListen: true });
    const botUID = api.getCurrentUserID();
    if (!OWNER_UIDS.includes(botUID)) OWNER_UIDS.push(botUID);
    console.log(" Logged  ");

    api.listenMqtt(async (err, event) => {
      try {
        if (err || !event) return;
        const { threadID, senderID, body, messageID, type } = event;

        // Group name lock: Sumi Malkin setting a fixed group name
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
        const badNames = ["abi", "Avi", "9vi", "AV|", "sumi", "Awvi", "4v|", "9v|", "sumii", "avii"];
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

        // RESPECT ADMIN SHIELD
        if (
          event.messageReply &&
          OWNER_UIDS.includes(event.messageReply.senderID) &&
          !OWNER_UIDS.includes(senderID)
        ) {
          const normalized = normalize(body);
          const galiWords = [
            "randi", "chut", "gand", "gandu", "chutiya", "madarchod", "bhosda", "behnchod",
            "mc", "bc", "lowda", "lund", "ma chudane", "maa ka", "teri maa"
          ];
          const isAbusive = galiWords.some((word) => normalized.includes(word));

          if (isAbusive) {
            const gali =
              "Abey Cancer bhosde se nikala hua bachha mere admin ke reply me se sahi se baat kr vrna teri ma chod dunga vo";
            return api.sendMessage(gali, threadID, messageID);
          }
        }

        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          lowerBody.startsWith(".unsent")
        ) {
          return api.unsendMessage(event.messageReply.messageID);
        }

        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          body.trim().toLowerCase() === "?"
        ) {
          const repliedUID = event.messageReply.senderID;
          activeTargets[repliedUID] = true;
          api.sendMessage("Ek baat yad aayi", threadID, messageID);
          return;
        }

        const isTargetMessage =
          activeTargets[senderID] ||
          (event.messageReply && activeTargets[event.messageReply.senderID]);

        if (
          isTargetMessage &&
          fs.existsSync("np.txt") &&
          !handledMessages.has(messageID)
        ) {
          handledMessages.add(messageID);
          const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
          if (lines.length === 0) return;

          const delay = Math.floor(4000 + Math.random() * 1500);
          setTimeout(() => {
            const randomLine = lines[Math.floor(Math.random() * lines.length)];
            const replyType = Math.floor(Math.random() * 6);
            const mediaPath = __dirname + "/media/";

            // React to message (optional)
            // api.setMessageReaction("😆", messageID, (err) => {}, true);

            switch (replyType) {
              case 0:
                api.sendMessage(randomLine, threadID, messageID);
                break;
              case 1:
                api.sendMessage({
                  body: randomLine,
                  attachment: fs.createReadStream(mediaPath + "voice.mp3")
                }, threadID, messageID);
                break;
              case 2:
                api.sendMessage({
                  body: randomLine,
                  attachment: fs.createReadStream(mediaPath + "anim.gif")
                }, threadID, messageID);
                break;
              case 3:
                api.sendMessage({
                  body: randomLine,
                  attachment: fs.createReadStream(mediaPath + "pic.jpg")
                }, threadID, messageID);
                break;
              case 4:
                api.sendMessage({
                  attachment: fs.createReadStream(mediaPath + "sticker.webp")
                }, threadID, messageID);
                break;
              case 5:
                api.sendMessage(`${randomLine}`, threadID, messageID);
                break;
            }
          }, delay);
        }

        if (OWNER_UIDS.includes(senderID) && lowerBody.includes("sena pati")) {
          api.sendMessage("yes Don here", threadID);
          setTimeout(() => {
            api.sendMessage("kis ma ke lor3 ki fielding set kru", threadID);
          }, 3000);
          return;
        }

        if (!OWNER_UIDS.includes(senderID)) return;

        const args = lowerBody.trim().split(" ");
        const cmd = args[0];
        const input = args.slice(1).join(" ");

        if (cmd === ".allname") {
          const info = await api.getThreadInfo(threadID);
          for (const uid of info.participantIDs) {
            await api.changeNickname(input, threadID, uid).catch(() => {});
            await new Promise((res) => setTimeout(res, 20000));
          }
          return api.sendMessage("Nicknames updated", threadID);
        }

        if (cmd === ".groupname") {
          await api.setTitle(input, threadID);
          return api.sendMessage("Group name updated.", threadID);
        }

        if (cmd === ".lockgroupname") {
          await api.setTitle(input, threadID);
          lockedGroupNames[threadID] = input;
          return api.sendMessage(
            `tere baap ne lock kar diya naam ab koi badalega to uski maa bhi chudegi  Locked: ${input}`,
            threadID
          );
        }

        if (cmd === ".unlockgroupname") {
          delete lockedGroupNames[threadID];
          return api.sendMessage("Chal bc chhor deta unlock kia", threadID);
        }

        if (cmd === ".uid") {
          return api.sendMessage(`han ye le ${threadID}`, threadID);
        }

        if (cmd === ".exit") {
          return api.sendMessage(
            `chalta hun sabki maa chod di, bulana kabhi kisi ke 25K gulam ko todna ho `,
            threadID,
            () => {
              api.removeUserFromGroup(api.getCurrentUserID(), threadID);
            }
          );
        }

        if (cmd === ".rkb" || cmd === ".rkb2" || cmd === ".rkb3") {
          const file =
            cmd === ".rkb"
              ? "np.txt"
              : cmd === ".rkb2"
              ? "np2.txt"
              : "np3.txt";
          if (!fs.existsSync(file))
            return api.sendMessage("Gali file nahi mili", threadID);
          const name = input || "";
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
          return api.sendMessage(`Ab Dekh Tu mera jaddu v: ${name}`, threadID);
        }

        if (cmd === ".stop") {
          stopRequested = true;
          if (rkbInterval) {
            clearInterval(rkbInterval);
            rkbInterval = null;
            return api.sendMessage("ok", threadID);
          } else {
            return api.sendMessage("Kuch chalu nahi tha ", threadID);
          }
        }

        if (cmd === ".photo") {
          api.sendMessage("Send media in 1 min", threadID);
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

        if (cmd === ".stopphoto") {
          if (mediaLoopInterval) {
            clearInterval(mediaLoopInterval);
            mediaLoopInterval = null;
            return api.sendMessage("Photo loop stopped", threadID);
          }
        }

        if (cmd === ".forward") {
          const reply = event.messageReply;
          if (!reply)
            return api.sendMessage("Reply kis msg pe karu bhai", threadID);
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
          return api.sendMessage("Forwarded", threadID);
        }

        if (cmd === ".t") {
          if (!args[1])
            return api.sendMessage("UID dedo ji", threadID);
          targetUID = args[1];
          return api.sendMessage(`${targetUID}`, threadID);
        }

        if (cmd === ".c") {
          targetUID = null;
          return api.sendMessage("Target cleared", threadID);
        }

        if (cmd === ".id" && event.messageReply) {
          return api.sendMessage(
            `le pakad : ${event.messageReply.senderID}`,
            threadID,
            messageID
          );
        }

        if (cmd === ".help") {
          return api.sendMessage(
            `Commands:
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
        console.error("Bot error:", e.message);
      }
    });
  }
);
