require("dotenv").config();
const { Client, IntentsBitField, ActivityType, Partials } = require("discord.js");
const mongoose = require("mongoose");
const eventHandler = require("./handlers/eventHandler");
const { DateTime } = require("luxon");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Function to update status based on current time in GMT+2
  const updateStatus = () => {
    const currentTime = DateTime.now().setZone("Europe/Berlin"); // GMT+2 during Daylight Saving Time (DST)
    const currentHour = currentTime.hour;

    console.log(`Current time in GMT+2: ${currentTime.toISO()}`);
    console.log(`Current hour in GMT+2: ${currentHour}`);

    if (currentHour >= 20 && currentHour < 23) {
      // 20:00 (8 PM) to 00:00 (12 AM) GMT+2
      client.user.setPresence({
        activities: [{ name: "Vedal987", type: ActivityType.Watching }],
        status: "online",
      });
      console.log("Set status to WATCHING Vedal987");
    } else {
      // All other times
      client.user.setPresence({
        activities: [{ name: "Rachie", type: ActivityType.Listening }],
        status: "online",
      });
      console.log("Set status to LISTENING Rachie");
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
