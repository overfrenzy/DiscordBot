require("dotenv").config();
const {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ChannelType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require('discord.js');
const ticket = require('../../schemas/ticketSchema');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.customId === 'ticketCreateButton') {
      const modal = new ModalBuilder()
        .setTitle('Create your ticket')
        .setCustomId('ticketModal');

      const why = new TextInputBuilder()
        .setCustomId('whyTicket')
        .setRequired(true)
        .setPlaceholder('What is the reason for creating this ticket')
        .setLabel('Why are you creating this ticket?')
        .setStyle(TextInputStyle.Paragraph);

      const info = new TextInputBuilder()
        .setCustomId('infoTicket')
        .setRequired(false)
        .setPlaceholder('Feel free to leave this blank')
        .setLabel('Provide us with any additional information')
        .setStyle(TextInputStyle.Paragraph);

      const one = new ActionRowBuilder().addComponents(why);
      const two = new ActionRowBuilder().addComponents(info);

      modal.addComponents(one, two);
      await interaction.showModal(modal);
    } else if (interaction.customId === 'ticketModal') {
      const user = interaction.user;
      const data = await ticket.findOne({ Guild: interaction.guild.id });
      if (!data) {
        return await interaction.reply({
          content: 'Sorry! Looks like you found this message but the ticket system is not yet setup here',
          ephemeral: true,
        });
      } else {
        const why = interaction.fields.getTextInputValue('whyTicket');
        const info = interaction.fields.getTextInputValue('infoTicket');
        const category = await interaction.guild.channels.cache.get(data.Category);

        if (!category) {
          return await interaction.reply({
            content: 'Sorry! The ticket category is not found. Please set it up again.',
            ephemeral: true,
          });
        }

        const existingChannel = interaction.guild.channels.cache.find(channel => channel.name === `ticket-${user.id}`);
        if (existingChannel) {
          return await interaction.reply({
            content: `You already have an open ticket: ${existingChannel}. Please close it before creating a new one.`,
            ephemeral: true,
          });
        }

        try {
          const channel = await interaction.guild.channels.create({
            name: `ticket-${user.id}`,
            type: ChannelType.GuildText,
            topic: `Ticket User: ${user.username}; Ticket reason: ${why}`,
            parent: category.id,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                ],
              },
              {
                id: process.env.CLIENT_ID,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ManageChannels,
                  PermissionsBitField.Flags.EmbedLinks,
                  PermissionsBitField.Flags.AttachFiles,
                ],
              }
            ],
          });

          const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`Ticket from ${user.username} 🎫`)
            .setDescription(`Opening Reason: ${why}\n\nExtra Information: ${info}`)
            .setTimestamp();

          const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('closeTicket')
              .setLabel('🔒 Close Ticket')
              .setStyle(ButtonStyle.Danger)
          );

          await channel.send({ embeds: [embed], components: [button] });
          await interaction.reply({
            content: `💼 Your ticket has been opened in ${channel}`,
            ephemeral: true,
          });
        } catch (error) {
          console.error('Error creating ticket channel:', error);
          await interaction.reply({
            content: 'An error occurred while creating the ticket channel. Please try again later.',
            ephemeral: true,
          });
        }
      }
    } else if (interaction.customId === 'closeTicket') {
      const closeModal = new ModalBuilder()
        .setTitle('Ticket Closing')
        .setCustomId('closeTicketModal');

      const reason = new TextInputBuilder()
        .setCustomId('closeReasonTicket')
        .setRequired(true)
        .setPlaceholder('What is the reason for closing the ticket?')
        .setLabel('Provide a closing reason')
        .setStyle(TextInputStyle.Paragraph);

      const one = new ActionRowBuilder().addComponents(reason);

      closeModal.addComponents(one);
      await interaction.showModal(closeModal);
    } else if (interaction.customId === 'closeTicketModal') {
      const channel = interaction.channel;
      const name = channel.name.replace('ticket-', '');
      const member = await interaction.guild.members.cache.get(name);

      const reason = interaction.fields.getTextInputValue('closeReasonTicket');
      await interaction.reply({ content: '🔒 Closing this ticket...' });

      setTimeout(async () => {
        await channel.delete().catch((err) => {});
        await member
          .send(`oh hi! your ticket in ${interaction.guild.name} has been closed for: \`${reason}\``)
          .catch((err) => {});
      }, 5000);
    }
  },
};
