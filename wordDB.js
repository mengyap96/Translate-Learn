var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    source:String,
    result:String,
    definition:String,
    partOfSpeech:String,
    user:[]
})


module.exports = mongoose.model('word', userSchema, 'Word');