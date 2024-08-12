const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const todoSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    username: {
       type: String,
       required: true,
    }
});

module.exports = mongoose.model("todo", todoSchema);