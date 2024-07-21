const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const Warning = require("../../schemas/warningSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pardon")
    .setDescription("Resets the warning count for a member.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The member whose warnings to reset.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const target = interaction.options.getUser("target");
    const MODERATOR_ROLE_ID = process.env.MODERATOR_ROLE_ID;

    if (!interaction.member.roles.cache.has(MODERATOR_ROLE_ID)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    if (!target) {
      return interaction.reply({ content: "User not found.", ephemeral: true });
    }

    try {
      const targetMember = await interaction.guild.members.fetch(target.id);
      const botMember = await interaction.guild.members.fetch(
        interaction.client.user.id
      );

      // Check if the bot has the required permissions
      if (!botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({
          content: "I do not have permission to un-timeout members.",
          ephemeral: true,
        });
      }

      const warningRecord = await Warning.findOne({
        userId: target.id,
        guildId: interaction.guild.id,
      });

      if (!warningRecord) {
        return interaction.reply({
          content: `${target.tag} has no warnings to reset.`,
          ephemeral: true,
        });
      }

      // Reset the warning count
      await Warning.deleteOne({
        userId: target.id,
        guildId: interaction.guild.id,
      });

      // Create an embed message for the pardon
      const pardonEmbed = new EmbedBuilder()
        .setColor(0x00ff00) // Green
        .setTitle("Pardon Notice")
        .setDescription(
          `**Dear ${target.username},**\n\nWe are pleased to inform you that your recent transgressions have been pardoned by **FrenzyCorp™**. Please continue to adhere to our community guidelines.\n\n**Thank you for your cooperation.**\n\n**Sincerely,**\n**The FrenzyCorp™ Team**`
        );

      // Send the pardon embed to the target member
      await targetMember.send({ embeds: [pardonEmbed] });

      // Remove the timeout
      await targetMember.timeout(null);

      // Send a confirmation message in the channel
      await interaction.reply({
        content: `${target.tag}'s warnings have been reset, their timeout has been lifted, and they have been notified of their pardon.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error resetting warnings:", error);
      await interaction.reply({
        content: "An error occurred while trying to reset the warnings.",
        ephemeral: true,
      });
    }
  },
};
