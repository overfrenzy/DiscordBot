require("dotenv").config();
const { Client, IntentsBitField } = require("discord.js");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.on("ready", (c) => {
  console.log(`${c.user.username} is online ✅`);
});

/*client.on('messageCreate', (message) => {
    console.log(message.content); //log message
}) */

/*client.on("messageCreate", (message) => {
  if (message.author.bot) {
    //makes it so bot doesn't reply to bots
    return;
  }
  if (message.content === "hey") {
    message.reply("hey"); //if it finds a it replies b
  }
}); */

client.on("interactionCreate", (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  //console.log(interaction.commandName);
  if (interaction.commandName === "hey") {
    interaction.reply("hey");
  }
  if (interaction.commandName === "marko") {
    interaction.reply("polo");
  }
});

client.login(process.env.TOKEN);
