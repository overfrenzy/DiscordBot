const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
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
      const botMember = await interaction.guild.members.fetch(
        interaction.client.user.id
      );

      // Check if the bot has the required permissions
      if (!botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({
          content: "I do not have permission to timeout members.",
          ephemeral: true,
        });
      }

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

      // Determine the warning message and timeout duration based on the number of warnings
      let warningEmbed;
      let timeoutDuration;
      if (warningRecord.warnings === 1) {
        warningEmbed = new EmbedBuilder()
          .setColor(0xffff00) // Yellow
          .setTitle("**Formal Warning**")
          .setDescription(
            `**Dear ${target.username},**\n\n**Reason**: ${reason}\n\nThis is your first warning. Please adhere to the community guidelines to avoid further actions.\n\n**Thank you for your cooperation.**\n\n**Sincerely,** \n**FrenzyCorp™**`
          );
        timeoutDuration = 1 * 60 * 1000; // 1 minute
      } else if (warningRecord.warnings === 2) {
        warningEmbed = new EmbedBuilder()
          .setColor(0xffa500) // Orange
          .setTitle("**Formal Warning**")
          .setDescription(
            `**Dear ${target.username},**\n\n**Reason**: ${reason}\n\nThis is your second warning. This is the last warning before more severe actions are taken. Please adhere to the community guidelines immediately.\n\n**Thank you for your cooperation.**\n\n**Sincerely,** \n**FrenzyCorp™**`
          );
        timeoutDuration = 10 * 60 * 1000; // 10 minutes
      } else if (warningRecord.warnings === 3) {
        warningEmbed = new EmbedBuilder()
          .setColor(0xff0000) // Red
          .setTitle("**Final Warning**")
          .setDescription(
            `**Dear ${target.username},**\n\n**Reason**: ${reason}\n\nYou have reached three warnings and are testing FrenzyCorp™'s patience to the limits. You might get banned at any moment if further infractions occur.\n\n**Sincerely,** \n**FrenzyCorp™**`
          );
        timeoutDuration = 30 * 60 * 1000; // 30 minutes
      } else if (warningRecord.warnings > 3) {
        warningEmbed = new EmbedBuilder()
          .setColor(0x8b0000) // Dark Red
          .setTitle("**Severe Notice**")
          .setDescription(
            `**Dear ${target.username},**\n\n**Reason**: ${reason}\n\nYour conduct has exceeded all acceptable limits. Despite multiple warnings, you continue to violate our guidelines. This behavior is intolerable and you are now testing the very limits of FrenzyCorp™'s patience. Continued infractions will not be met with further warnings but with immediate and severe consequences, up to and including a permanent ban from this community. This is your final notice.\n\n**Sincerely,** \n**FrenzyCorp™**`
          );
        timeoutDuration = 60 * 60 * 1000; // 1 hour
      }

      // Send the warning embed to the target member
      await targetMember.send({ embeds: [warningEmbed] });

      // Apply the timeout
      await targetMember.timeout(timeoutDuration, reason);

      // Send a confirmation message in the channel
      await interaction.reply({
        content: `${target.tag} has been warned and timed out for ${
          timeoutDuration / 60000
        } minutes.\nReason: ${reason}\nTotal warnings: ${
          warningRecord.warnings
        }`,
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
