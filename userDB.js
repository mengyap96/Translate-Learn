var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    gender: String,
    DOB: Date,
    phone: String,
    words:[]
})


module.exports = mongoose.model('user', userSchema, 'User');