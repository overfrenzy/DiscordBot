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
        .setPlaceholder('Feel free to leave this blank.\nYou can include screenshots after filling this form.')
        .setLabel('Additional Information')
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

        const channelName = `ticket-${user.username}`;
        const existingChannel = interaction.guild.channels.cache.find(channel => channel.name === channelName);
        if (existingChannel) {
          return await interaction.reply({
            content: `You already have an open ticket: ${existingChannel} <:nonono:1264702387004772483> Please close it before creating a new one \n<:ok:1264702580630487041>`,
            ephemeral: true,
          });
        }

        try {
          const channel = await interaction.guild.channels.create({
            name: channelName,
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
                id: client.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ManageChannels,
                  PermissionsBitField.Flags.EmbedLinks,
                  PermissionsBitField.Flags.AttachFiles,
                ],
              },
              {
                id: process.env.MODERATOR_ROLE_ID,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                ],
              },
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

          await channel.send(`<@&${process.env.MODERATOR_ROLE_ID}>`);
          await channel.send({ embeds: [embed], components: [button] });

          await interaction.reply({
            content: `💼 Your ticket has been opened in ${channel} <:LETHIMCOOK:1264702588922757210>`,
            ephemeral: true,
          });
        } catch (error) {
          console.error('Error creating ticket channel:', error);
          await interaction.reply({
            content: 'An error occurred while creating the ticket channel. Please try again later <a:NOOOO:1264703017752723539>',
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
      console.log('Closing ticket for:', name); // Debugging line

      const member = interaction.guild.members.cache.find(member => member.user.username === name);

      if (!member) {
        console.error(`Member not found for name: ${name}`);
        return await interaction.reply({
          content: 'An error occurred while closing the ticket. Member not found.',
          ephemeral: true,
        });
      }

      const reason = interaction.fields.getTextInputValue('closeReasonTicket');

      const messages = [
        `Dear ${member.user.username},\n\nYour ticket in ${interaction.guild.name} has been closed for the following reason: \`${reason}\`. \nWe appreciate your cooperation.\n\nSincerely,\nFrenzyCorp™\n<:Corpa:1264694947370631219> <a:Clap:1264695669239578636>`,
        `Hello ${member.user.username},\n\nYour ticket in ${interaction.guild.name} has been closed due to: \`${reason}\`. \nThank you for your understanding.\n\nBest regards,\nFrenzyCorp™\n<:Corpa:1264694947370631219> <a:Clap:1264695669239578636>`,
        `Hi ${member.user.username},\n\nThis is to inform you that your ticket in ${interaction.guild.name} has been closed for: \`${reason}\`. \nWe thank you for adhering to our guidelines.\n\nSincerely,\nFrenzyCorp™\n<:Corpa:1264694947370631219> <a:Clap:1264695669239578636>`,
        `Greetings ${member.user.username},\n\nYour ticket in ${interaction.guild.name} has been closed with the reason: \`${reason}\`. \nWe appreciate your patience and understanding.\n\nRegards,\nFrenzyCorp™\n<:Corpa:1264694947370631219> <a:Clap:1264695669239578636>`,
        `Dear ${member.user.username},\n\nPlease be informed that your ticket in ${interaction.guild.name} has been closed for: \`${reason}\`. \nThank you for your cooperation.\n\nBest,\nFrenzyCorp™\n<:Corpa:1264694947370631219> <a:Clap:1264695669239578636>`,
        `Hello ${member.user.username},\n\nYour ticket in ${interaction.guild.name} has been closed due to: \`${reason}\`. \nWe appreciate your compliance.\n\nBest,\nFrenzyCorp™\n<:Corpa:1264694947370631219> <a:Clap:1264695669239578636>`
      ];

      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      await interaction.reply({ content: '🔒 Closing this ticket...' });

      setTimeout(async () => {
        await channel.delete().catch((err) => {});
        const closeEmbed = new EmbedBuilder()
          .setColor('Blue')
          .setTitle('Ticket Closed')
          .setDescription(randomMessage)
          .setTimestamp();
        await member.send({ embeds: [closeEmbed] }).catch((err) => {});
      }, 5000);
    }
  },
};
