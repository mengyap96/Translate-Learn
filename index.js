const express = require('express')
const path = require('path')
const axios = require('axios')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const unirest = require('unirest')
const session = require('express-session')
const router = express.Router()

const PORT = process.env.PORT || 5000

var dbURL = "mongodb+srv://admin:admin@yap-yetry.mongodb.net/API?retryWrites=true&w=majority";

mongoose.connect(dbURL,{useUnifiedTopology: true,useNewUrlParser: true}).then(() => { 
  console.log('Database Connected Successful!');
})

const translateKey="trnsl.1.1.20191123T135156Z.86a73b41a5a49f69.712d6f1e64e0878b25a522e330bb23c85179d762"

const translateAPI=
'https://translate.yandex.net/api/v1.5/tr.json/translate?key='+translateKey+'&text=%s&lang=en'


express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(session({secret: 'sshhh', saveUninitialized: true, resave: true}))
  .use(bodyParser())
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')

  //Homepage
  .get('/', (req, res) => res.render('pages/index',{
    id: req.session.email,
    name: req.session.name,
    result: 1,
    key: ""
  }))


  //Translate Result 
  .post('/',(req,res)=>{
    console.log("Translating "+req.body.key+"\n")

    //Get result from translate api
    axios
      .get(translateAPI.replace('%s',encodeURIComponent(req.body.key)))
      .then((response)=>{
        console.log("Translate from '"+req.body.key+"' to '"+response.data.text+"'\n")
        
        //Pass the result into words api
        unirest.get("https://wordsapiv1.p.mashape.com/words/"+encodeURIComponent(response.data.text))
        .header("X-Mashape-Key", "bd889dc4e9msh08490d7b1bf93a9p14ea1bjsn5580b2931329")
        .header("Accept", "application/json")
        .end(function (response2) {
          console.log("Dictionary result:")
          console.log(response2.body.results);

          //Pass both the result into pages
          res.render('pages/index',{
            id: req.session.email,
            name: req.session.name,
            result:response.data,
            result2: response2.body.results,
            key: req.body.key
          })
        });
        
      })
  })

  //Login Page
  .get('/login',(req,res)=>{
    res.render('pages/login',{
      id: req.session.email,
      name: req.session.name,
      error:null
    })
  })

  //Login submit
  .post('/login',(req,res)=>{
    var user = require('./userDB');
    var email = req.body.email;
    var password = req.body.password;

    user.find({
      "email": email,
      "password": password
    })
    .then((response) => {
        req.session.email = response[0].email;
        req.session.name = response[0].name;

        res.render('pages/index',{
          id : req.session.email,
          name : req.session.name,
          key: "",      
          error: null,
          result:1
        })
        console.log(req.session.email+" logged in!")
    })
    .catch((error) => {
        
      console.log('User not found!');
        
      res.render('pages/login',{
        id : req.session.email,
        name : req.session.name,      
        error:3
      })
    })
  })

  //Register page
  .get('/register',(req,res)=>{
    res.render('pages/register',{
      id: req.session.email,
      name: req.session.name,
      error:null
    })
  })

  //Register submit
  .post('/register',existUser,(req,res)=>{
    var user = require('./userDB.js')

    newUser = new user({
      email: req.body.email,
      name: req.body.name,
      password: req.body.password,
      gender: req.body.gender,
      DOB: req.body.DOB,
      phone: req.body.phone,
    })

        newUser.save()
        .then(response=>{
          console.log("User registered")
          res.render('pages/login',{
            id:req.session.email,
            name:req.session.name,
            error:1
          })
      
    })
  })

  //View word in dictionary
  .get('/dictionary',(req,res)=>{

    if(req.session.email!=null){

      var word=require('./wordDB')

      word.find({
        "user": req.session.email
      })
      .then(response=>{
        
        res.render('pages/dictionary',{
          id:req.session.email,
          name:req.session.name,
          key:"",
          words: response
        })
      })

      
    }else{
      res.redirect('/login')
    }
   
  })

  //search word in dictionary
  .post('/search',(req,res)=>{

    if(req.session.email!=null){

      var word=require('./wordDB')

      word.find({ 
        $or: [
          {"source":{'$regex' : req.body.key, '$options' : 'i'}},
          {"result":{'$regex' : req.body.key, '$options' : 'i'} }],
        user:req.session.email
      })
      .then(response=>{
        console.log(response)
        res.render('pages/dictionary',{
          id:req.session.email,
          name:req.session.name,
          key:req.body.key,
          words: response
        })
      })

      
    }else{
      res.redirect('/login')
    }
   
  })


  //Add word to dictionary
  .post('/add',(req,res)=>{
    
    var word = require('./wordDB')

    

    //Find if the word existed
    word.find({
      "source": req.body.source,
      "definition": req.body.definition
    })
    .then(response=>{
      
      //If word existed
      if(response[0]!=null){
        word.findOneAndUpdate({
          "source": req.body.source,
          "definition": req.body.definition
        },{
          $addToSet:{
            "user": req.session.email
          }
        }).then(response2=>{
          console.log("Word found! Added to user dictionary!")
        })

      //If word not existed create a new word
      }else{

        newWord = new word({
          source:(req.body.source),
          result:(req.body.result),
          partOfSpeech:(req.body.partOfSpeech),
          definition:(req.body.definition)
        })

        newWord.save()
        .then(response=>{
          console.log("New word saved! Adding to user dictionary!")
          word.findOneAndUpdate({
            "source": req.body.source,
            "definition": req.body.definition
          },{
            $addToSet:{
              "user": req.session.email
            }
          }).then(response2=>{
            console.log("Added to user dictionary!")
          })
        })
        
      }
    })

  })

  //Delete word from dictionary
  .post('/remove',(req,res)=>{
    // console.log(req.body.source)
    // console.log(req.body.definition)

    var word = require("./wordDB")

    word.findOneAndUpdate({
      source: (req.body.source),
      definition: (req.body.definition)
    },{
      $pull:{
        user: req.session.email
      }
    }).then(response=>{
      console.log("Word removed!")
      res.redirect('/dictionary')
    })
  })
  
  //Logout Link       
  .get('/logout',(req,res) => {
    req.session.destroy()
    res.render('pages/index', { 
      id : null,
      name : null,     
      error: false,
      key:"",
      result:1
      })
    
    console.log("User logged out!")
  })

  .listen(PORT, () => console.log(`Listening on ${ PORT }`))


//Check if email registered
function existUser(req,res,next){
  var user = require('./userDB')

  user.find({
    "email":req.body.email
  })
  .then(response=>{
    if(response[0]!=null){
      console.log("Email existed!")
      res.render('pages/register',{
        id : req.session.email,
        name : req.session.name,      
        userType : req.session.userType,
        error: 1
      })
    }
    else{
      next();
    }
  })
}




