const { Events, ChannelType } = require("discord.js");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check if the message is a DM
    if (message.channel.type === ChannelType.DM) {
      try {
        // Replace with your channel ID where DMs should be forwarded
        const LOG_CHANNEL_ID = '1266800253563047967';
        
        // Fetch the channel where DMs should be forwarded
        const logChannel = await message.client.channels.fetch(LOG_CHANNEL_ID);

        // Construct the message to send to the log channel
        const forwardedMessage = {
          content: `**DM from ${message.author.tag}**\n${message.content}`,
          // Optionally include attachments
          files: message.attachments.map(attachment => attachment.url)
        };

        // Send the message to the specified channel
        await logChannel.send(forwardedMessage);
      } catch (error) {
        console.error('Error forwarding DM to the log channel:', error);
      }
    }
  },
};
