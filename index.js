import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100069692356853",  "100005122337500"];
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
    api.setOptions({ listenEvents: true });
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
              `oi Randike yehan Sumi Malkin 🙇 ne name rakha gc ke ab tere baap ka bhi aukat nhi badal sake 🤨 samjha lode chal nikal`,
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
        const badNames = ["sumi", "4vi", "9vi", "AV|", "saina", "Awvi", "4v|", "9v|", "sumii", "sumi malkin", "avii"];
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

        // .unsent command: unsend the replied message
        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          lowerBody.startsWith(".unsent")
        ) {
          return api.unsendMessage(event.messageReply.messageID);
        }

        // .bhai gali kyun? command via reply: set targetUID
        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          lowerBody === "?"
        ) {
          targetUID = event.messageReply.senderID;
          return api.sendMessage("tumko 😒or koi kam nhi hai din bhar on hi ", threadID, messageID);
        }

        // Delay reply to targetUID with np.txt content (gali loop for individual target)
        if (targetUID && senderID === targetUID && fs.existsSync("np.txt")) {
          const lines = fs
            .readFileSync("np.txt", "utf8")
            .split("\n")
            .filter(Boolean);
          const line = lines[Math.floor(Math.random() * lines.length)];
          // Delay between 4 to 6 seconds
          setTimeout(() => api.sendMessage(line, threadID, messageID), 4000 + Math.random() * 2000);
          return;
        }

        // If owner replies on a bot message, send a funny attitude reply
        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          event.messageReply.senderID === api.getCurrentUserID()
        ) {
          return api.sendMessage(
            "😒😒 jao na bade aaye mujhse baat krne\nnhi krni tumse koi baat\nattitude owner ja yeha se",
            threadID,
            messageID
          );
        }

        // .senapati command: royal reply with maharani + fielding
if (OWNER_UIDS.includes(senderID) && lowerBody.includes("sena pati")) {
  api.sendMessage(
    "🤴 Maharani ji, aapka sipahi hazir hai... bataiye kis haramkhor ki fielding set karni hai 🫡",
    threadID
  );

  setTimeout(() => {
    api.sendMessage(
      "💥 Ek baar aapka ishaara mil jaaye Maharani ji, uski maa ki choot kii chatni bana dengey 😈",
      threadID
    );
  }, 2000);

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
            `Sumi Malkin 🙇 ne lock kar diya naam ab koi badalega to uski maa bhi chudegi 😎 Locked: ${input}`,
            threadID
          );
        }

        // .unlockgroupname command: remove the lock on group name
        if (cmd === ".unlockgroupname") {
          delete lockedGroupNames[threadID];
          return api.sendMessage(
            "🔓  Sumi Malkin 🙇 kar diya ma chudane do inko ab name par",
            threadID
          );
        }

        // .uid command: display group ID
        if (cmd === ".uid") {
          return api.sendMessage(`lo cutiie apke liye to dil bhi hazir he uid kya chiz hai❤️‍🩹🥰 ${threadID}`, threadID);
        }

        // .exit command: exit from group with farewell message
        if (cmd === ".exit") {
          return api.sendMessage(
            `Sumi Malkin 🙇 chalta hun sabki maa chod di, bulana kabhi kisi ke 25K gulam ko todna ho 🙏🖕😎`,
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
          const name = input || "madarchod";
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
          }, 40000);
          return api.sendMessage(
            `iski maa chhodta hun Sumi Malkin 🙇 rukjaiye ${name}`,
            threadID
          );
        }

        // .stop command: stop the ongoing abusive loop
        if (cmd === ".stop") {
          stopRequested = true;
          if (rkbInterval) {
            clearInterval(rkbInterval);
            rkbInterval = null;
            return api.sendMessage("ok cutiie jo hukum rukjata hu😤", threadID);
          } else {
            return api.sendMessage("Kuch chalu nahi tha cutiie 😒", threadID);
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

        // .t command: set targetUID manually
        if (cmd === ".t") {
          if (!args[1])
            return api.sendMessage("👤 UID dedo ji", threadID);
          targetUID = args[1];
          return api.sendMessage(`😎 ${targetUID}`, threadID);
        }

        // .c command: clear targetUID
        if (cmd === ".c") {
          targetUID = null;
          return api.sendMessage("😭", threadID);
        }

        // .id command: show UID of the replied message sender
        if (cmd === ".id" && event.messageReply) {
          return api.sendMessage(
            `le pakad 😒: ${event.messageReply.senderID}`,
            threadID,
            messageID
          );
        }

        // .help command: list all available commands
        if (cmd === ".help") {
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
