const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("message")
    .setDescription("Send a direct message to a member of the server.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The member to message.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to send. Use \\n for new lines.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription(
          "The color of the embed (red, blue, green, yellow, or a hexadecimal value)."
        )
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName("image")
        .setDescription("Upload an image to include in the embed.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("image_url")
        .setDescription(
          "A direct URL to an image or GIF to include in the embed. (Has to end in .gif or .png etc)"
        )
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages.toString()),

  async execute(interaction) {
    const target = interaction.options.getUser("target");
    let message = interaction.options.getString("message");
    const colorInput = interaction.options.getString("color") || "default";
    const image = interaction.options.getAttachment("image");
    const imageUrl = interaction.options.getString("image_url");
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

    // Convert \n to actual new lines
    message = message.replace(/\\n/g, "\n");

    // Define the default and allowed colors
    const colors = {
      red: "#FF6961",
      blue: "#89CFF0",
      green: "#77DD77",
      yellow: "#FDFD96",
      default: "#5865F2",
    };

    // Determine the color to use
    let color = colors[colorInput.toLowerCase()] || colors.default;

    // Check if the input is a valid hexadecimal color
    const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
    if (
      !colors[colorInput.toLowerCase()] &&
      colorInput !== "default" &&
      hexColorRegex.test(colorInput)
    ) {
      color = colorInput;
    }

    try {
      const targetMember = await interaction.guild.members.fetch(target.id);

      // Create an embed with the provided message and color
      const embed = new EmbedBuilder()
        .setDescription(message)
        .setColor(color)
        .setTimestamp();

      if (image) {
        embed.setImage(`attachment://${image.name}`);
      } else if (
        imageUrl &&
        (imageUrl.endsWith(".png") ||
          imageUrl.endsWith(".jpg") ||
          imageUrl.endsWith(".gif"))
      ) {
        embed.setImage(imageUrl);
      }

      // Send the embed to the target member's DM with the image attachment if available
      await targetMember.send({
        embeds: [embed],
        files: image ? [new AttachmentBuilder(image.url)] : [],
      });

      // Confirm the action in the interaction response
      await interaction.reply({
        content: `Message sent to ${target.tag} <a:Chatting:1264703650392051813>`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("<a:NOOOO:1264703017752723539> Error sending DM:", error);

      let errorMessage = "An error occurred while trying to send the message.";
      if (error.code === 50007) {
        // Discord API error code for "Cannot send messages to this user"
        errorMessage =
          "Cannot send messages to this user. They may have DMs disabled or are not accepting messages from bots.";
      }

      await interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  },
};
