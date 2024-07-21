const { SlashCommandBuilder, PermissionFlagsBits, ApplicationCommandOptionType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member!')
    .addMentionableOption(option =>
      option
        .setName('target-user')
        .setDescription('The user to ban.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('The reason for banning.')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const targetUser = interaction.options.getMentionable('target-user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!targetUser) {
      await interaction.reply({ content: 'User not found.', ephemeral: true });
      return;
    }

    try {
      await targetUser.ban({ reason });
      await interaction.reply({ content: `${targetUser.user.tag} has been banned.\nReason: ${reason}` });
    } catch (error) {
      console.error('Error banning user:', error);
      await interaction.reply({ content: 'An error occurred while trying to ban the user.', ephemeral: true });
    }
  },
};
