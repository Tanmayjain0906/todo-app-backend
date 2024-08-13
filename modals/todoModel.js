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
    },
    status: {
        type: String,
        enum: ['Pending', 'Ongoing', 'Paused', 'Complete'],
        default: 'Pending'
    },
    startTime: { type: Date },
    pauseTime: { type: Date },
    elapsedTime: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("todo", todoSchema);