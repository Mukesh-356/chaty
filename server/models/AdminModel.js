const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  allowedIPs: [
    {
      type: String,
    },
  ],
});

module.exports = mongoose.model("Admin", adminSchema);
