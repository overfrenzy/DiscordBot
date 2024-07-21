const { Schema, model } = require("mongoose");

const warningSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  warnings: { type: Number, default: 0 },
});

module.exports = model("Warning", warningSchema);
