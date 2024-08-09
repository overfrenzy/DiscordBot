const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const { PermissionsBitField } = require("discord.js");

const MODERATOR_ROLE_ID = process.env.MODERATOR_ROLE_ID; // Moderator role ID from environment variables

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Purge messages based on different criteria")
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription('Time in minutes or "all" to delete all messages')
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User whose messages will be deleted")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("start_message_id")
        .setDescription("Message ID to start deleting from")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("end_message_id")
        .setDescription("Message ID to stop deleting at")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // Check if the user has the moderator role
      if (!interaction.member.roles.cache.has(MODERATOR_ROLE_ID)) {
        return interaction.reply({
          content: "You do not have the required role to use this command.",
          ephemeral: true,
        });
      }

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.ManageMessages
        )
      ) {
        return interaction.reply({
          content: "You do not have permission to use this command.",
          ephemeral: true,
        });
      }

      // Defer the initial reply to show that the bot is processing
      await interaction.deferReply({ ephemeral: true });

      const time = interaction.options.getString("time");
      const user = interaction.options.getUser("user");
      const startMessageId = interaction.options.getString("start_message_id");
      const endMessageId = interaction.options.getString("end_message_id");

      let messagesToDelete;

      if (user && !startMessageId && !endMessageId) {
        if (time === "all") {
          await askGlobalOrLocal(interaction, user, time); // Ask if the deletion should be global or local
          return;
        }
        messagesToDelete = await fetchMessagesByUserAndTime(
          interaction,
          user,
          time
        );
      } else if (startMessageId && !endMessageId && !user) {
        messagesToDelete = await fetchMessagesByRange(
          interaction,
          startMessageId
        );
      } else if (startMessageId && endMessageId) {
        messagesToDelete = await fetchMessagesByRange(
          interaction,
          startMessageId,
          endMessageId
        );
      } else if (user && startMessageId) {
        messagesToDelete = await fetchMessagesByUserAndRange(
          interaction,
          user,
          startMessageId
        );
      } else if (user && endMessageId) {
        messagesToDelete = await fetchMessagesByUserAndRange(
          interaction,
          user,
          startMessageId,
          endMessageId
        );
      } else if (time) {
        messagesToDelete = await fetchMessagesByTime(interaction, time);
      } else {
        return interaction.editReply({
          content: "Invalid command usage. Please provide valid options.",
        });
      }

      if (!messagesToDelete || messagesToDelete.length === 0) {
        return interaction.editReply({
          content: "No messages found to delete.",
          components: [],
        });
      }

      await confirmPurge(interaction, messagesToDelete);
    } catch (error) {
      await interaction.editReply({
        content: "An error occurred while trying to execute the purge command.",
      });
    }
  },
};

// This function prompts the user to choose between local and global deletion
async function askGlobalOrLocal(interaction, user, time) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("purge_local")
      .setLabel("Local")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("purge_global")
      .setLabel("Global")
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.editReply({
    content:
      "Do you want to delete the user's messages locally (in this channel) or globally (in all channels)?",
    components: [row],
  });

  const filter = (i) => i.user.id === interaction.user.id;
  const response = await interaction.channel
    .awaitMessageComponent({
      filter,
      componentType: ComponentType.Button,
      time: 15000,
    })
    .catch(() => {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.editReply({
          content: "Purge choice canceled due to no response.",
          components: [],
        });
      }
      return null;
    });

  if (!response) {
    return;
  }

  await response.deferUpdate();

  let messagesToDelete;
  if (response.customId === "purge_local") {
    messagesToDelete = await fetchMessagesByUserAndTime(
      interaction,
      user,
      time,
      false
    );
  } else if (response.customId === "purge_global") {
    messagesToDelete = await fetchMessagesByUserAndTime(
      interaction,
      user,
      time,
      true
    );
  }

  if (messagesToDelete && messagesToDelete.length > 0) {
    await confirmPurge(interaction, messagesToDelete);
  } else {
    await interaction.editReply({
      content: "No messages found to delete.",
      components: [],
    });
  }
}

// This function prompts the user to confirm the deletion
async function confirmPurge(interaction, messagesToDelete) {
  const totalMessagesToDelete = messagesToDelete.length;

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm_purge")
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("cancel_purge")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({
    content: `Are you sure you want to delete ${totalMessagesToDelete} messages?`,
    components: [confirmRow],
  });

  const filter = (i) => i.user.id === interaction.user.id;
  const finalResponse = await interaction.channel
    .awaitMessageComponent({
      filter,
      componentType: ComponentType.Button,
      time: 15000,
    })
    .catch(() => {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.editReply({
          content: "Purge canceled due to no response.",
          components: [],
        });
      }
      return null;
    });

  if (!finalResponse) {
    return;
  }

  await finalResponse.deferUpdate();

  if (finalResponse.customId === "confirm_purge") {
    await interaction.editReply({
      content: `Deleting ${totalMessagesToDelete} messages, please wait...`,
      components: [],
    });

    await bulkDeleteMessages(messagesToDelete);

    await interaction.editReply({
      content: `Successfully deleted ${totalMessagesToDelete} messages.`,
      components: [],
    });
  } else {
    await interaction.editReply({
      content: "Purge canceled.",
      components: [],
    });
  }
}

async function fetchMessagesByUserAndTime(
  interaction,
  user,
  time,
  global = false
) {
  try {
    const channels = global
      ? interaction.guild.channels.cache.filter(
          (channel) => channel.isText() && channel.viewable
        )
      : [interaction.channel];

    let allMessages = [];
    const timeLimit = time !== "all" ? Date.now() - parseInt(time) * 60000 : 0;

    for (const channel of channels) {
      let lastMessageId = null;

      while (true) {
        const options = { limit: 100 };
        if (lastMessageId) options.before = lastMessageId;

        const fetchedMessages = await channel.messages.fetch(options);
        if (!fetchedMessages.size) break;

        const filteredMessages = fetchedMessages.filter(
          (msg) =>
            msg.author.id === user.id &&
            (time === "all" || msg.createdTimestamp >= timeLimit)
        );

        allMessages = allMessages.concat(Array.from(filteredMessages.values()));
        lastMessageId = fetchedMessages.last()?.id;

        if (filteredMessages.size < 100) break;
      }
    }

    return allMessages;
  } catch (error) {
    throw error;
  }
}

async function fetchMessagesByTime(interaction, time) {
  try {
    const channel = interaction.channel;
    const timeLimit = Date.now() - parseInt(time) * 60000;

    let allMessages = [];
    let lastMessageId = null;

    while (true) {
      const options = { limit: 100 };
      if (lastMessageId) options.before = lastMessageId;

      const fetchedMessages = await channel.messages.fetch(options);
      if (!fetchedMessages.size) break;

      const filteredMessages = fetchedMessages.filter(
        (msg) => msg.createdTimestamp >= timeLimit
      );

      allMessages = allMessages.concat(Array.from(filteredMessages.values()));
      lastMessageId = fetchedMessages.last()?.id;

      if (filteredMessages.size < 100) break;
    }

    return allMessages;
  } catch (error) {
    throw error;
  }
}

async function fetchMessagesByRange(interaction, startMessageId, endMessageId) {
  try {
    const channel = interaction.channel;
    const messages = [];

    let lastMessageId = startMessageId;

    while (true) {
      const options = { limit: 100 };
      if (lastMessageId) options.after = lastMessageId;

      const fetchedMessages = await channel.messages.fetch(options);
      if (!fetchedMessages.size) break;

      messages.push(...fetchedMessages.values());
      lastMessageId = fetchedMessages.last()?.id;

      if (
        endMessageId &&
        fetchedMessages.some((msg) => msg.id === endMessageId)
      ) {
        break;
      }
      if (fetchedMessages.size < 100) break;
    }

    const filteredMessages = messages.filter(
      (msg) =>
        (!endMessageId || msg.id <= endMessageId) && msg.id >= startMessageId
    );

    // Include the startMessageId message in the deletion
    const startMessage = await channel.messages.fetch(startMessageId);
    filteredMessages.unshift(startMessage);

    return filteredMessages;
  } catch (error) {
    throw error;
  }
}

async function fetchMessagesByUserAndRange(
  interaction,
  user,
  startMessageId,
  endMessageId = null
) {
  try {
    const channel = interaction.channel;
    const messages = [];

    let lastMessageId = startMessageId;

    while (true) {
      const options = { limit: 100 };
      if (lastMessageId) options.after = lastMessageId;

      const fetchedMessages = await channel.messages.fetch(options);
      if (!fetchedMessages.size) break;

      messages.push(...fetchedMessages.values());
      lastMessageId = fetchedMessages.last()?.id;

      if (
        endMessageId &&
        fetchedMessages.some((msg) => msg.id === endMessageId)
      ) {
        break;
      }
      if (fetchedMessages.size < 100) break;
    }

    const filteredMessages = messages.filter(
      (msg) =>
        msg.author.id === user.id &&
        (!endMessageId || msg.id <= endMessageId) &&
        msg.id >= startMessageId
    );

    // Include the startMessageId message in the deletion
    const startMessage = await channel.messages.fetch(startMessageId);
    if (startMessage.author.id === user.id) {
      filteredMessages.unshift(startMessage);
    }

    return filteredMessages;
  } catch (error) {
    throw error;
  }
}

async function bulkDeleteMessages(messagesToDelete) {
  const messagesByChannel = messagesToDelete.reduce((acc, msg) => {
    if (!msg || !msg.createdTimestamp) {
      return acc;
    }
    if (!acc[msg.channel.id]) acc[msg.channel.id] = [];
    acc[msg.channel.id].push(msg);
    return acc;
  }, {});

  for (const channelId in messagesByChannel) {
    const channel = messagesToDelete.find(
      (msg) => msg.channel.id === channelId
    ).channel;
    const messages = messagesByChannel[channelId];

    const oldMessages = messages.filter(
      (msg) => Date.now() - msg.createdTimestamp > 14 * 24 * 60 * 60 * 1000
    );
    const recentMessages = messages.filter(
      (msg) => Date.now() - msg.createdTimestamp <= 14 * 24 * 60 * 60 * 1000
    );

    if (recentMessages.length > 0) {
      try {
        await channel.bulkDelete(recentMessages, true);
      } catch (error) {
        console.error(
          `Failed to bulk delete messages in channel ${channel.name}:`,
          error
        );
      }
    }

    for (const msg of oldMessages) {
      try {
        await msg.delete();
      } catch (error) {
        console.error(
          `Failed to delete message with ID ${msg.id} in channel ${channel.name}:`,
          error
        );
      }
    }
  }
}
