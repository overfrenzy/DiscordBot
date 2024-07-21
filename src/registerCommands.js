const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { CLIENT_ID, GUILD_ID, TOKEN, MODERATOR_ROLE_ID, ALLOWED_USER_IDS } =
  process.env;

const commands = [];
const commandFolders = fs.readdirSync(path.join(__dirname, "commands"));

for (const folder of commandFolders) {
  const commandFiles = fs
    .readdirSync(path.join(__dirname, "commands", folder))
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const command = require(`./commands/${folder}/${file}`);
    if (!command.data) {
      console.error(`Command data is missing in file: ${folder}/${file}`);
      continue;
    }
    const commandData = command.data.toJSON();

    // Check if the command is restricted to certain users
    if (["warn", "pardon"].includes(commandData.name)) {
      commandData.default_member_permissions = `0`;
      commandData.dm_permission = false;
    }

    // ticket commands restricted to specific users
    if (commandData.name === "ticket") {
      commandData.default_member_permissions = `0`;
      commandData.dm_permission = false;
    }

    commands.push(commandData);
  }
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
