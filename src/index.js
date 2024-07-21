require("dotenv").config();
const { Client, IntentsBitField } = require("discord.js");
const mongoose = require("mongoose");
const eventHandler = require("./handlers/eventHandler");
const { DateTime } = require("luxon");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Function to update status based on current time in GMT+2
  const updateStatus = () => {
    const currentTime = DateTime.now().setZone("GMT+2");
    const currentHour = currentTime.hour;

    if (currentHour >= 20 || currentHour < 0) {
      // 20:00 (8 PM) to 00:00 (12 AM) GMT+2
      client.user.setPresence({
        activities: [{ name: "Vedal987", type: "WATCHING" }],
        status: "online",
      });
    } else {
      // All other times
      client.user.setPresence({
        activities: [{ name: "Rachie", type: "LISTENING" }],
        status: "online",
      });
    }
  };

  // Update status immediately on bot start
  updateStatus();

  // Update status every hour
  setInterval(updateStatus, 60 * 60 * 1000);

  console.log("Custom status set based on time.");
});

(async () => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB.");

    eventHandler(client);
  } catch (error) {
    console.log(`Error: ${error}`);
  }
})();

client.login(process.env.TOKEN);
