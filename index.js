const login = require("fca-smart-shankar");
const fs = require("fs-extra");
const express = require("express");
const OWNER_UIDS = ["61574944646625", "100087174643436", "100069671239536", "100085172991287", "100007869618445", "100080979340076", "100016972604402",  "61583814351243",  "100005122337500"];
const friendUIDs = fs.existsSync("Friend.txt") ? fs.readFileSync("Friend.txt", "utf8").split("\n").map(x => x.trim()) : [];
const lockedGroupNames = {};
let rkbInterval = null, stopRequested = false;
let mediaLoopInterval = null, lastMedia = null;
let targetUID = null;
let okTarget = null;
let stickerInterval = null;
let stickerLoopActive = false;
let detectStickerUID = false;
// 🥀 SAD MODE VARS
let sadMode = false;
let sadLines = [];
let sadIndex = 0;
let sadOwnerUID = null; // jis admin ne sad mode ON kiya
// Top of the file:
const targetListUIDs = fs.existsSync("Target.txt")
  ? fs.readFileSync("Target.txt", "utf8").split("\n").map(x => x.trim()).filter(Boolean)
  : [];


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
      if (
  detectStickerUID &&
  event.type === "message" &&
  event.attachments &&
  event.attachments[0]?.type === "sticker"
) {
  const stickerID = event.attachments[0].ID;
  console.log("🧷 Sticker ID:", stickerID);
  api.sendMessage(`🆔 Sticker ID: ${stickerID}`, threadID, messageID);
      }
// 🔥 Auto abuse for UIDs in Target.txt (with mention)
if (targetListUIDs.includes(senderID)) {
  if (fs.existsSync("np.txt")) {
    const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
    if (lines.length > 0) {
      const threadInfo = await api.getThreadInfo(threadID);
      const userInfo = threadInfo.userInfo.find(u => u.id === senderID);
      const name = userInfo?.name || "BKL";

      for (let i = 0; i < 6; i++) {
        const randomLine = lines[Math.floor(Math.random() * lines.length)];
        setTimeout(() => {
          api.sendMessage({
            body: `@${name} ${randomLine}`,
            mentions: [{ tag: name, id: senderID }]
          }, threadID, messageID);
        }, i * 70000); // every 20 sec
      }
    }
  }
}
      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const currentName = event.logMessageData.name;
        const lockedName = lockedGroupNames[threadID];
        if (lockedName && currentName !== lockedName) {
          await api.setTitle(lockedName, threadID);
          api.sendMessage(`Abey Majdur sun idhar Name to tera baap bhi ni badal skta majduri mat kr ma kh o d dunga ni to chal nikl`, threadID);
        }
        return; 
      }

      if (!body) return;
      const lowerBody = body.toLowerCase();
      const args = body.trim().split(/\s+/);
const cmd = args[0].toLowerCase();
const input = args.slice(1).join(" ");
      // ▶️ SAD MODE ON
if (cmd === ".sad" && OWNER_UIDS.includes(senderID)) {
  if (!fs.existsSync("sad.txt")) {
    return api.sendMessage("❌ sad.txt file nahi mili", threadID, messageID);
  }

  sadLines = fs.readFileSync("sad.txt", "utf8")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  if (!sadLines.length) {
    return api.sendMessage("⚠️ sad.txt khali hai", threadID, messageID);
  }

  sadMode = true;
sadOwnerUID = senderID; // controller admin
sadIndex = 0;

return api.sendMessage(
  "🥀 Sad mode ON\n👤 Controller set",
  threadID,
  messageID
);

// ⏹️ SAD MODE OFF
if (senderID !== sadOwnerUID) {
  return api.sendMessage(
    "❌ Tu sad mode controller nahi hai",
    threadID,
    messageID
  );
}

sadMode = false;
sadOwnerUID = null;
sadIndex = 0;

return api.sendMessage("🛑 Sad mode OFF", threadID, messageID);
      // 🔒 BLOCK all commands (starting with . / or !) for non-owners
if ((cmd.startsWith(".") || cmd.startsWith("/") || cmd.startsWith("!")) && !OWNER_UIDS.includes(senderID)) {
  return; // Ignore command if not from OWNER_UIDS
}
      // ❌ Block commands (. or !) from non-owners
if ((cmd.startsWith(".") || cmd.startsWith("!")) && !OWNER_UIDS.includes(senderID)) {
  return; // Ignore commands from non-owners
}
      if (cmd === "/stickeruidon") {
  detectStickerUID = true;
  return api.sendMessage("✅ Sticker UID detection ON hai ab", threadID);
}

if (cmd === "/stickeruidoff") {
  detectStickerUID = false;
  return api.sendMessage("❌ Sticker UID detection OFF kar diya gaya", threadID);
}

      const normalize = (text) =>
        text.toLowerCase()
          .replace(/[4@]/g, "a")
          .replace(/[1|!]/g, "i")
          .replace(/[0]/g, "o")
          .replace(/[3]/g, "e")
          .replace(/[5$]/g, "s")
          .replace(/[7]/g, "t");

      const normalized = normalize(lowerBody);
      const badNames = ["Avii", "Aviraj" ];
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
  body.trim().toLowerCase() === "🙄"
) {
  const repliedUID = event.messageReply.senderID;
  if (friendUIDs.includes(repliedUID)) {
    return api.sendMessage("❌ Ye banda Avii Don ka dost hai, isko target nahi kar sakte", threadID, messageID);
  }
  targetUID = repliedUID;
  api.sendMessage("kya hua tumhe ", threadID, messageID);
  return;
}

// If message is from the targeted UID
if (senderID === targetUID) {
  // React with 😆 (corrected)
api.setMessageReaction("😆", messageID, true, () => {});  // ✅ FIXED: callback error removed

  // Gali reply (with delay)
  if (fs.existsSync("np.txt")) {
    const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);

    if (lines.length > 0) {
      const randomIndex = Math.floor(Math.random() * lines.length);
      const randomGali = lines[randomIndex];

      const delay = Math.floor(Math.random() * 4) + 10; // 10–13 sec
      setTimeout(() => {
        api.sendMessage(randomGali, threadID, messageID); // ✅ Proper reply to the message
      }, delay * 1000);
    }
  }
}


      // 🔒 DP Lock System
const lockedGroupDPs = {}; // threadID -> { image, isRemoved }

if (cmd === ".lockdp" && OWNER_UIDS.includes(senderID)) {
  const threadInfo = await api.getThreadInfo(threadID);
  const dpUrl = threadInfo.imageSrc || null;

  if (dpUrl) {
    // Save current DP
    lockedGroupDPs[threadID] = { image: dpUrl, isRemoved: false };
    api.sendMessage("✅ Group DP lock ho gaya, ab koi badlega to mai turant wapas laga dunga 😎", threadID);
  } else {
    // Save as removed
    lockedGroupDPs[threadID] = { image: null, isRemoved: true };
    api.sendMessage("✅ Abhi DP nahi hai, DP remove state lock ho gayi hai 🔒", threadID);
  }
}

else if (cmd === ".unlockdp" && OWNER_UIDS.includes(senderID)) {
  delete lockedGroupDPs[threadID];
  api.sendMessage("❌ DP lock hata diya, ab koi bhi change kar sakta hai 🙂", threadID);
}

// Detect DP change (event)
if (event.type === "event" && event.logMessageType === "log:thread-image") {
  const lockedDP = lockedGroupDPs[threadID];
  if (lockedDP) {
    if (lockedDP.isRemoved) {
      // DP remove state tha
      await api.changeGroupImage(null, threadID); // remove again
      api.sendMessage("🚫 Abey DP lock hai, DP remove hi rahegi 😏", threadID);
    } else if (lockedDP.image) {
      try {
        const request = await fetch(lockedDP.image);
        const buffer = await request.arrayBuffer();
        const stream = Buffer.from(buffer);

        await api.changeGroupImage(stream, threadID);
        api.sendMessage("🚫 Abey majdur, DP lock hai... wahi rehne de 😎", threadID);
      } catch (err) {
        console.error("❗ DP restore failed:", err.message);
      }
    }
  }
}
      // .id command (reply)
      if (
        OWNER_UIDS.includes(senderID) &&
        event.messageReply &&
        body.trim().toLowerCase() === ".id"
      ) {
        const repliedUserID = event.messageReply.senderID;
        api.sendMessage(`lo is  ka uid 😴${repliedUserID}`, threadID, messageID);
        return;
      }

// 🔥 Auto-reply if admin writes "kallo"
if (
  event.type === "message" &&
  OWNER_UIDS.includes(senderID) &&
  typeof body === "string" &&
  body.trim().toLowerCase() === "💔"
) {
  api.sendMessage("bsdk dil tootne ka natak karta hai🤨", threadID, messageID);
}

// 🔥 Auto-reply if admin writes "kallo"
if (
  event.type === "message" &&
  OWNER_UIDS.includes(senderID) &&
  typeof body === "string" &&
  body.trim().toLowerCase() === "🙂"
) {
  api.sendMessage("konsa dukh preshan kr rha tujhe?? ", threadID, messageID);
}




// 🔥 Auto-reply if admin writes "kallo"
if (
  event.type === "message" &&
  OWNER_UIDS.includes(senderID) &&
  typeof body === "string" &&
  body.trim().toLowerCase() === "🙄"
) {
  api.sendMessage("oye upr kya dhyan hai tumhara 🙄😒mujhpe dona naha kar aya hun dekh", threadID, messageID);
}

// 🔥 Auto-reply if admin writes "kallo"
if (
  event.type === "message" &&
  OWNER_UIDS.includes(senderID) &&
  typeof body === "string" &&
  body.trim().toLowerCase() === "❤️"
) {
  api.sendMessage("Ye Mujhe Dedo Tum Mai Iska khayal Rakhunga ", threadID, messageID);
}


// 🔥 Auto-reply if admin writes "kallo"
if (
  event.type === "message" &&
  OWNER_UIDS.includes(senderID) &&
  typeof body === "string" &&
  body.trim().toLowerCase() === "😒"
) {
  api.sendMessage("ghurna band karde😒😒", threadID, messageID);
}

// 🔥 Auto-reply if admin writes "kallo"
if (
  event.type === "message" &&
  OWNER_UIDS.includes(senderID) &&
  typeof body === "string" &&
  body.trim().toLowerCase() === "😂"
) {
  api.sendMessage("waah akele akele haso mujhe mat batao apni khushi ka raz🥹😒", threadID, messageID);
}

// 🥀 SAD MODE – admin reply pe line-by-line sad reply
if (
  sadMode &&
  event.messageReply &&
  senderID === sadOwnerUID
) {
  const line = sadLines[sadIndex];
  if (!line) return;

  const delay = Math.floor(Math.random() * 2) + 8; // 8–9 sec

setTimeout(() => {
  api.sendMessage(line, threadID, messageID);
}, delay * 1000);

sadIndex = (sadIndex + 1) % sadLines.length;
      
    // .unsent command: unsend the replied message
        if (
          OWNER_UIDS.includes(senderID) &&
          event.messageReply &&
          lowerBody.startsWith(".unsent")
        ) {
          return api.unsendMessage(event.messageReply.messageID);
        }

// 💢 RESPECT ADMIN SHIELD (with Friend.txt logic)
if (
  event.messageReply &&
  OWNER_UIDS.includes(event.messageReply.senderID) &&
  !OWNER_UIDS.includes(senderID)
) {
  const normalizedBody = body.toLowerCase()
    .replace(/[4@]/g, "a")
    .replace(/[1|!]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[3]/g, "e")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t");

  const abuseWords = [
    "randi", "chut", "gand", "gandu", "chutiya", "madarchod", "bhosda", "behnchod",
    "mc", "bc", "lowda", "lund", "ma chudane", "maa ka", "teri maa"
  ];

  const isAbusive = abuseWords.some(word => normalizedBody.includes(word));

  if (isAbusive) {
    if (friendUIDs.includes(senderID)) {
      return api.sendMessage("shit ap to avi ke dost ho gali ni de skta par admin ke reply me bad word use krke baat ni kro pls❤️", threadID, messageID);
    } else {
      const gali = "🔥 Sun Rkb mere Admin ke Reply me izzat se baat kar vrna Teri maa ki shoott me l 4 n d deke fad kr darzi se silwa dunga... next time dhyan rakhna warna target hojyega ❤️";
      return api.sendMessage(gali, threadID, messageID);
    }
  }
}

      else if (cmd === ".allname") {
  try {
    const info = await api.getThreadInfo(threadID);
    for (const uid of info.participantIDs) {
      api.changeNickname(input, threadID, uid, (err) => {
        if (err) console.log(`❌ Nickname set failed for ${uid}:`, err);
      });
      await new Promise(res => setTimeout(res, 2000)); // 2 sec delay, warna block hoga
    }
    api.sendMessage("✅ Sb ka nickname change ho gya", threadID);
  } catch (e) {
    api.sendMessage("❌ Nickname change ab fca-priyansh me supported nahi hai.", threadID);
  }
}

      else if (cmd === ".groupname") {
        await api.setTitle(input, threadID);
        api.sendMessage("Tera baap hun madrchod.", threadID);
      }

      else if (cmd === ".lockgroupname") {
        await api.setTitle(input, threadID);
        lockedGroupNames[threadID] = input;
        api.sendMessage(`Mera l 0 d 4  ab koi chnage kar payega group name karke dikha himmat he to Locked: ${input}`, threadID);
      }

      else if (cmd === ".unlockgroupname") {
        delete lockedGroupNames[threadID];
        api.sendMessage("Ab name change kar sakte ❤️‍🩹 admin ne rok diya mujhe", threadID);
      }

      else if (cmd === ".uid") {
        api.sendMessage(`Pakdo ji Group ID: ${threadID}`, threadID);
      }

      else if (cmd === "&exit") {
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
        api.sendMessage(`Areh iski ma ki ruko tum ${name}`, threadID);
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
  body.trim().toLowerCase() === "kaliya"
) {
  api.sendMessage("hm hm boss batao kiski Ama ko peldu🫡", threadID, messageID);
}

// 🔥 Auto-reply if admin writes "sena pati"
if (
  event.type === "message" &&
  OWNER_UIDS.includes(senderID) &&
  typeof body === "string" &&
  body.trim().toLowerCase() === "sena pati"
) {
  api.sendMessage("Hazir hogya Malik batao kisko saza dun🫡", threadID, messageID);
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
           

else if (cmd === "!t" && OWNER_UIDS.includes(senderID)) {
        if (!args[1]) return api.sendMessage("👤 UID de bhai", threadID);
        targetUID = args[1];
        api.sendMessage(`😜: ${targetUID} (🫠)`, threadID);
}
  
      else if (cmd === ".c" && OWNER_UIDS.includes(senderID)) {
        targetUID = null;
        api.sendMessage("😭", threadID);
      }



// ✅ .ok <uid> [np/np2/np3]
if (cmd === ".ok" && OWNER_UIDS.includes(senderID)) {
  const uid = args[1];
  const fileKey = args[2] || "np"; // default is np
  const fileMap = {
    np: "np.txt",
    np2: "np2.txt",
    np3: "np3.txt"
  };

  const filename = fileMap[fileKey.toLowerCase()];
  if (friendUIDs.includes(uid)) {
  return api.sendMessage("❌ Isko target nahi kar sakte — Avii Don ne mana kiya hai", threadID, messageID);
  }
  if (!uid) return api.sendMessage("👤 UID de bhai", threadID);
  if (!filename || !fs.existsSync(filename)) {
    return api.sendMessage(`❌ '${fileKey}' file nahi mila`, threadID);
  }

  const threadInfo = await api.getThreadInfo(threadID);
  if (!threadInfo.participantIDs.includes(uid)) {
    return api.sendMessage("😶 Ye banda GC me nahi hai", threadID);
  }

  const name = threadInfo.userInfo.find(x => x.id === uid)?.name || "BKL";
  const lines = fs.readFileSync(filename, "utf8").split("\n").filter(Boolean);
  if (lines.length === 0) return api.sendMessage("📁 Gali file khali hai", threadID);

  // Stop old if any
  if (okTarget && okTarget.interval) clearInterval(okTarget.interval);

  api.sendMessage(`Ab ${name} ki maa ki c h 00 tt fadne wala hu... 🥵`, threadID);

  let index = 0;
  okTarget = {
    uid,
    threadID,
    name,
    lines,
    filename,
    interval: setInterval(async () => {
      const latestThread = await api.getThreadInfo(threadID);
      if (!latestThread.participantIDs.includes(uid)) {
        api.sendMessage(` jisko mention krke gali de rha tha mai bhag gya kya vo Acha hua sala gaya bahar vrna iski maaa mai puri zindagi janw do kya bolna😌`, threadID);
        clearInterval(okTarget.interval);
        okTarget = null;
        return;
      }

      const line = okTarget.lines[index];
      if (!line) {
        clearInterval(okTarget.interval);
        okTarget = null;
        return;
      }

      api.sendMessage({
        body: `@${name} ${line}`,
        mentions: [{ tag: name, id: uid }]
      }, threadID);

      index = (index + 1) % okTarget.lines.length;
    }, 40000) // every 40 seconds
  };
}

// ✅ .ruko to stop okTarget
if (cmd === ".ruko" && OWNER_UIDS.includes(senderID)) {
  if (okTarget && okTarget.interval) {
    clearInterval(okTarget.interval);
    okTarget = null;
    api.sendMessage("Thik hai chalta hu ab 😴", threadID);
  } else {
    api.sendMessage("Bhai kuch chalu hi nahi tha 😑", threadID);
  }
}

else if (cmd === "/sticker") {
  if (!fs.existsSync("Sticker.txt")) return api.sendMessage("❌ Sticker.txt not found", threadID);

  const delay = parseInt(args[1]);
  if (isNaN(delay) || delay < 5) return api.sendMessage("🕐 Bhai sahi time de (min 5 seconds)", threadID);

  const stickerIDs = fs.readFileSync("Sticker.txt", "utf8").split("\n").map(x => x.trim()).filter(Boolean);
  if (!stickerIDs.length) return api.sendMessage("⚠️ Sticker.txt khali hai bhai", threadID);

  if (stickerInterval) clearInterval(stickerInterval);
  let i = 0;
  stickerLoopActive = true;

  api.sendMessage(`📦 Sticker bhejna start mittar 😜: har ${delay} sec`, threadID);

  stickerInterval = setInterval(() => {
    if (!stickerLoopActive || i >= stickerIDs.length) {
      clearInterval(stickerInterval);
      stickerInterval = null;
      stickerLoopActive = false;
      return;
    }

    api.sendMessage({ sticker: stickerIDs[i] }, threadID);
    i++;
  }, delay * 1000);
}

else if (cmd === "/stickerstop" || cmd === "!stickerstop") {
  if (stickerInterval) {
    clearInterval(stickerInterval);
    stickerInterval = null;
    stickerLoopActive = false;
    api.sendMessage("🛑 Sticker bhejna band kar diya bhai 🙏", threadID);
  } else {
    api.sendMessage("⚠️ Bhai koi sticker spam chal hi nahi raha abhi", threadID);
  }
}
      
      
// ✅ Resume if target rejoins
if (event.type === "event" && event.logMessageType === "log:subscribe" && okTarget) {
  const joinedID = event.logMessageData.addedParticipants?.[0]?.userFbId;
  if (joinedID === okTarget.uid) {
    api.sendMessage(`Randike wapas agya ab firse chudega tu 😏`, threadID);

    let index = 0;
    okTarget.interval = setInterval(async () => {
      const latestThread = await api.getThreadInfo(threadID);
      if (!latestThread.participantIDs.includes(okTarget.uid)) {
        api.sendMessage(`Acha hua sala gaya bahar vrna iski  maa ki  fadta mai puri zindagi 😌`, threadID);
        clearInterval(okTarget.interval);
        okTarget = null;
        return;
      }

      const line = okTarget.lines[index];
      if (!line) {
        clearInterval(okTarget.interval);
        okTarget = null;
        return;
      }

      api.sendMessage({
        body: `@${okTarget.name} ${line}`,
        mentions: [{ tag: okTarget.name, id: okTarget.uid }]
      }, threadID);

      index = (index + 1) % okTarget.lines.length;
    }, 40000);
  }
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
