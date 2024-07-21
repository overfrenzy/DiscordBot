const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const ticket = require("../../schemas/ticketSchema");
require("dotenv").config();

const ALLOWED_USER_IDS = process.env.ALLOWED_USER_IDS.split(",");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manage the ticket system")
    .addSubcommand((command) =>
      command
        .setName("send")
        .setDescription("Send the ticket message")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name for the open select menu content")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("A custom message to add to the embed")
            .setRequired(false)
        )
    )
    .addSubcommand((command) =>
      command
        .setName("setup")
        .setDescription("Setup the ticket category")
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category to send tickets in")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand((command) =>
      command.setName("remove").setDescription("Disable the ticket system")
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction) {
    if (!ALLOWED_USER_IDS.includes(interaction.user.id)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    const { options } = interaction;
    const sub = options.getSubcommand();
    const data = await ticket.findOne({ Guild: interaction.guild.id });

    switch (sub) {
      case "send":
        if (!data) {
          return await interaction.reply({
            content:
              "You have to do /ticket setup before you can send a ticket message!",
            ephemeral: true,
          });
        }

        const name = options.getString("name");
        const message =
          options.getString("message") ||
          "Submit your query by clicking the button below.\nA FrenzyCorp™ representative will assist you shortly.\n\nPlease keep tickets related to RinaSunSun server";

        const button = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticketCreateButton")
            .setLabel("Create Ticket")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji({ id: "1238463950501449728", name: "jail" })
        );

        const embed = new EmbedBuilder()
          .setColor("Red")
          .setTitle("💀 Create a ticket!")
          .setDescription(message)
          .setFooter({
            text: `${interaction.guild.name}`,
            iconURL: `${interaction.guild.iconURL()}`,
          });

        await interaction.reply({
          content: "💼 I have sent your ticket message below.",
          ephemeral: true,
        });
        await interaction.channel.send({
          embeds: [embed],
          components: [button],
        });

        break;
      case "remove":
        if (!data) {
          return await interaction.reply({
            content: "✋🏻 Looks like you don't have a ticket system set",
            ephemeral: true,
          });
        } else {
          await ticket.deleteOne({ Guild: interaction.guild.id });
          await interaction.reply({
            content: "💼 Ticket category deleted.",
            ephemeral: true,
          });
        }
        break;
      case "setup":
        if (data) {
          return await interaction.reply({
            content: `✋🏻 Looks like you already have a ticket category set to <#${data.Category}>`,
            ephemeral: true,
          });
        } else {
          const category = options.getChannel("category");
          await ticket.create({
            Guild: interaction.guild.id,
            Category: category.id,
          });
          await interaction.reply({
            content: `I have set the category to **${category}**! Use /ticket send to send a ticket create message`,
            ephemeral: true,
          });
        }
    }
  },
};
