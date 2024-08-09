const { REST, Routes, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { CLIENT_ID, GUILD_ID, TOKEN } = process.env;

const commands = [];
const commandFolders = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((file) => !file.startsWith("."));

// Function to get all command files from directories
function getCommandFiles(dir) {
  let commandFiles = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      commandFiles = commandFiles.concat(getCommandFiles(filePath));
    } else if (file.endsWith(".js")) {
      commandFiles.push(filePath);
    }
  }

  return commandFiles;
}

// Get all command files from the commands directory
const commandFiles = getCommandFiles(path.join(__dirname, "commands"));

// Load command data from files
for (const file of commandFiles) {
  const command = require(file);
  if (command.data) {
    const commandData = command.data.toJSON();

    // Set default permissions for commands
    if (["warn", "pardon", "purge", "message"].includes(commandData.name)) {
      commandData.default_member_permissions =
        PermissionFlagsBits.ManageMessages.toString();
      commandData.dm_permission = false;
    }

    if (["send", "setup", "remove"].includes(commandData.name)) {
      commandData.default_member_permissions =
        PermissionFlagsBits.ManageGuild.toString();
      commandData.dm_permission = false;
    }

    commands.push(commandData);
  } else {
    console.error(`Command data is missing in file: ${file}`);
  }
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    // Register commands
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
