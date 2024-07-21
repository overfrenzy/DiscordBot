const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const Warning = require("../../schemas/warningSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Issues a warning to a member.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The member to warn.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("The reason for the warning.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const target = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason");
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

      // Find or create the warning record for the user
      let warningRecord = await Warning.findOne({
        userId: target.id,
        guildId: interaction.guild.id,
      });
      if (!warningRecord) {
        warningRecord = new Warning({
          userId: target.id,
          guildId: interaction.guild.id,
          warnings: 0,
        });
      }

      // Increment the warning count
      warningRecord.warnings += 1;
      await warningRecord.save();

      // Determine the warning message based on the number of warnings
      let warningEmbed;
      if (warningRecord.warnings === 1) {
        warningEmbed = new EmbedBuilder()
          .setColor(0xFFFF00) // Yellow
          .setTitle("Formal Warning")
          .setDescription(`Dear ${target.username},\n\n**Reason**: ${reason}\n\nThis is your first warning. Please adhere to the community guidelines to avoid further actions.\n\nThank you for your cooperation.\n\n**Sincerely**, \n**FrenzyCorp™**`);
      } else if (warningRecord.warnings === 2) {
        warningEmbed = new EmbedBuilder()
          .setColor(0xFFA500) // Orange
          .setTitle("Formal Warning")
          .setDescription(`Dear ${target.username},\n\n**Reason**: ${reason}\n\nThis is your second warning. This is the last warning before more severe actions are taken. Please adhere to the community guidelines immediately.\n\nThank you for your cooperation.\n\n**Sincerely**, \n**FrenzyCorp™**`);
      } else if (warningRecord.warnings === 3) {
        warningEmbed = new EmbedBuilder()
          .setColor(0xFF0000) // Red
          .setTitle("Final Warning")
          .setDescription(`Dear ${target.username},\n\n**Reason**: ${reason}\n\nYou have reached three warnings and are testing FrenzyCorp™'s patience to the limits. You might get banned at any moment if further infractions occur.\n\n**Sincerely**, \n**FrenzyCorp™**`);
      } else if (warningRecord.warnings > 3) {
        warningEmbed = new EmbedBuilder()
          .setColor(0x8B0000) // Dark Red
          .setTitle("Severe Notice")
          .setDescription(`Dear ${target.username},\n\n**Reason**: ${reason}\n\nYour conduct has exceeded all acceptable limits. Despite multiple warnings, you continue to violate our guidelines. This behavior is intolerable and you are now testing the very limits of FrenzyCorp™'s patience. Continued infractions will not be met with further warnings but with immediate and severe consequences, up to and including a permanent ban from this community. This is your final notice.\n\n**Sincerely**, \n**FrenzyCorp™**`);
      }

      // Send the warning embed to the target member
      await targetMember.send({ embeds: [warningEmbed] });

      // Send a confirmation message in the channel
      await interaction.reply({
        content: `${target.tag} has been warned.\nReason: ${reason}\nTotal warnings: ${warningRecord.warnings}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error warning user:", error);
      await interaction.reply({
        content: "An error occurred while trying to warn the user.",
        ephemeral: true,
      });
    }
  },
};
