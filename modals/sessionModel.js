const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const sessionSchema = new Schema({
    id: {
        type: String,
    }
}, {strict: false}); // strict:flase allow database to add another feilds


module.exports = mongoose.model("session", sessionSchema);