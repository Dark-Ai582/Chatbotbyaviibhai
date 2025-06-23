import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["61555128412763", "100069692356853", "100087881326581", "100001808342073", "100005122337500"];
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
  api.setOptions({
  listenEvents: true,
  selfListen: true,        // 👈 Apne message bhi sune
  forceLogin: true         // 👈 Kuch cases me helpful
});
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
          api.sendMessage(`oi Randike yehan bina naam wale  bos ne name rakha gc ke ab tere baap ka bhi aukat nhi badal sake 🤨 samjha lode chal nikal`, threadID);
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
      const badNames = ["4vi", "avi", "avii", "sumi", "AAVVI", "AVVII", "4VII", "abhi"];
      const abuseWords = ["randi", "rndi", "bsdk", "chut", "gand", "tbkc", "bsdk", "land", "gandu", "lodu", "lamd", "chumt", "tmkc", "laude", "bhosda", "madarchod", "mc", "bc", "behnchod", "chutiya", "gandu", "boor", "lowda", "maa", "didi"];

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

      if (fs.existsSync("np.txt") && senderID === targetUID) {
        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        if (lines.length > 0) {
          const randomLine = lines[Math.floor(Math.random() * lines.length)];
          api.sendMessage(randomLine, threadID, messageID);
        }
      }

// ✅ EMOJI RESPONSE FOR ADMINS
if (OWNER_UIDS.includes(senderID)) {
  const emoji = body.trim();

  switch (emoji) {
    case "🙁":
      return api.sendMessage("Kya hua... mood halka sa down lag raha hai 🙁 bol na, yahan sunne wale hain 🫂", threadID, messageID);
    case "🙄":
      return api.sendMessage("Yeh expression toh keh raha... 'phir wahi bakwas' 🙄", threadID, messageID);
    case "🙂":
      return api.sendMessage("Aisi shaant muskaan ke peeche kya chhupa hai? 🙂 sab theek hai na? 💭", threadID, messageID);
    case "💔":
      return api.sendMessage("Dil toot gaya lagta hai 💔 par yaad rakh, jo chhod jaaye... wo tera tha hi nahi 🧠", threadID, messageID);
    case "❤️":
      return api.sendMessage("Itna pyaar? ❤️ koi toh dil se yaad kar raha hoga 😌", threadID, messageID);
    case "🙏":
      return api.sendMessage("Arre nahi yaar 🙏 itna formal mat ho... apne hi toh log hain 🤗", threadID, messageID);
    case "🫂":
      return api.sendMessage("Zarurat ho toh ek jadoo ki jhappi le lo 🫂 sab sambhal jaayega 🌸", threadID, messageID);
    case "😜":
      return api.sendMessage("Acha toh fir se masti mood me ho 😜 vibe on hai 😂", threadID, messageID);
    case "😂":
      return api.sendMessage("Yeh hasi... sach me contagious hai 😂 sabko haansa diya 😄", threadID, messageID);
    case "😕":
      return api.sendMessage("Confused sa lag raha sab kuch 😕... chinta mat kar, clarity aayegi 💡", threadID, messageID);
    case "😒":
      return api.sendMessage("Iss look ke peechhe zaroor koi 'uff' moment hai 😒 chill, ignore kar de 😌", threadID, messageID);
    case "😎":
      return api.sendMessage("Full swag on 🔥😎 baat hi kuch aur hai attitude me ✨", threadID, messageID);
    case "😭":
      return api.sendMessage("Itna bhi mat ro 😭 warna dil kaafi heavy ho jaata hai 💔", threadID, messageID);
    case "😑":
      return api.sendMessage("Expression full blank 😑 lagta hai dimaag shutdown mode me hai 💭", threadID, messageID);
    case "💋":
      return api.sendMessage("Oye hoye 💋 kis ke liye bheja? Kya scene chal raha? 😏", threadID, messageID);
    case "💀":
      return api.sendMessage("Mar gaye kya hans hans ke? 💀 ya koi joke tha itna khatarnak? 😂", threadID, messageID);
    case "🤣":
      return api.sendMessage("Yeh toh full pagalpan wali hansi hai 🤣 lungs nikal jaayenge 😂", threadID, messageID);
    case "😘":
      return api.sendMessage("Aww... ye pyaar bhara emoji 😘 kisi special ke liye toh nahi tha na? 👀", threadID, messageID);
    case "😍":
      return api.sendMessage("Eyes full of love 😍 lagta hai kuch ya kisi ne dil jeet liya hai 💫", threadID, messageID);
    case "😗":
      return api.sendMessage("Hmm... soft wala kiss 😗, kuch toh romantic chal raha 😏", threadID, messageID);
    case "🤨":
      return api.sendMessage("Yeh kya expression tha? 🤨 kuch toh gadbad hai… bata bhi do!", threadID, messageID);
    case "🥲":
      return api.sendMessage("Smile ke peeche chhupi dard wali story 🥲 tu bas strong reh ✊", threadID, messageID);
    case "🥺":
      return api.sendMessage("Iss look ko dekh ke toh koi bhi pighal jaaye 🥺 kya hua... bol bhi do na 💬", threadID, messageID);
    case "😮":
      return api.sendMessage("Aree waah 😮 yeh shock kaisa? Kya dekh liya aisa? 👀", threadID, messageID);
    case "😁":
      return api.sendMessage("Full teeth wala smile 😁 lagta hai dil se khush ho today 😇", threadID, messageID);
    case "😐":
      return api.sendMessage("Neutral face 😐 matlab kuch khaas feel nahi aa raha... coffee pilaun? ☕", threadID, messageID);
    case "🥹":
      return api.sendMessage("Tears ready to drop 🥹 kabhi kabhi sab kuch kehne ki zarurat nahi padti 💖", threadID, messageID);
    case "😆":
      return api.sendMessage("Arey yeh hasi toh direct dil se aayi 😆 mazze me ho tum 💥", threadID, messageID);
    case "😛":
      return api.sendMessage("Ayeee tongue out wala mood 😛 lagta hai tease mode on hai 😂", threadID, messageID);
    case "😋":
      return api.sendMessage("Kya khaaya? 😋 emoji dekh ke bhukh lag gayi mujhe bhi 🍕", threadID, messageID);
    case "🙈":
      return api.sendMessage("Sharam se chhupne ka mann ho raha? 🙈 safe space hai yeh 😌", threadID, messageID);
    case "😉":
      return api.sendMessage("Wink ke saath kuch naughty toh nahi soch rahe ho? 😉", threadID, messageID);
  }
}

      
      if (!OWNER_UIDS.includes(senderID)) return;
      const args = body.trim().split(" ");
      const cmd = args[0].toLowerCase();
      const input = args.slice(1).join(" ");

      if (cmd === "*allname") {
        const info = await api.getThreadInfo(threadID);
        for (const uid of info.participantIDs) {
          await api.changeNickname(input, threadID, uid).catch(() => {});
          await new Promise(res => setTimeout(res, 20000));
        }
        api.sendMessage("👥 Nicknames updated", threadID);
      }

      else if (cmd === "*groupname") {
        await api.setTitle(input, threadID);
        api.sendMessage("Group name updated.", threadID);
      }

      else if (cmd === "*lockgroupname") {
        await api.setTitle(input, threadID);
        lockedGroupNames[threadID] = input;
        api.sendMessage(`bina naam wale bhaiya lock hogya name ab koi badalega to uski ma bhi chod dunga ap bolo to 😎Locked: ${input}`, threadID);
      }

      else if (cmd === "*unlockgroupname") {
        delete lockedGroupNames[threadID];
        api.sendMessage("🔓ok bina naam wale bhaiya kr diya unblock ma chudane do naam par rkb ko Unlocked group name.", threadID);
      }

      else if (cmd === "*uid") {
        api.sendMessage(`🆔 kya hua ji 😘 nokar 😘 kiss  gulam  pakdya kya 😆 jo uid mang rahe Group ID: ${threadID}`, threadID);
      }

      else if (cmd === "*exit") {
        api.sendMessage(`😘 kiss bhaiya chalta hun sabki ma chod diya kabhi 😘 kiss jaise 25K gulam ko chodna ho to bula lena inki ma ki bur me sui dhaga dal kr see dunga 🙏🖕😎`, threadID, () => {
          api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        });
      }

      else if (cmd === "*rkb") {
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

        api.sendMessage(`iski maa chhodta hun  rukja ${name}`, threadID);
      }

      else if (cmd === "*rkb2") {
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

      else if (cmd === "*rkb3") {
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

        api.sendMessage(`😗 kiss bhaiya kr rha ${name}`, threadID);
      }

      else if (cmd === "*stop") {
        stopRequested = true;
        if (rkbInterval) {
          clearInterval(rkbInterval);
          rkbInterval = null;
          api.sendMessage("rkb ko bekar me dara diya 😂😜 kuchh na chal raha lode", threadID);
        } else {
          api.sendMessage("Kuch chal hi nahi raha tha bhai", threadID);
        }
      }

      else if (cmd === "*photo") {
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

      else if (cmd === "*stopphoto") {
        if (mediaLoopInterval) {
          clearInterval(mediaLoopInterval);
          lastMedia = null;
          api.sendMessage("Stopped media loop.", threadID);
        }
      }

      else if (cmd === "*forward") {
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
      else if (cmd === "*target") {
  if (!args[1]) return api.sendMessage("👤 UID de baby", threadID);

  const uidToTarget = args[1];

  if (OWNER_UIDS.includes(uidToTarget)) {
    return api.sendMessage("❌ Yeh UID owner hai, isko target nahi kar sakte 😎", threadID);
  }

  targetUID = uidToTarget;
  api.sendMessage(`🎯 Targeting UID: ${targetUID}`, threadID);
      }

      else if (cmd === "*help") {
        const help = `
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
*help
`;
        api.sendMessage(help.trim(), threadID);
      }

else if (cmd === "*myid") {
  api.sendMessage(`🆔 Your UID is: ${senderID}`, threadID);
}
      
    } catch (e) {
      console.error("❗ Bot error:", e.message);
    }
  });
});
