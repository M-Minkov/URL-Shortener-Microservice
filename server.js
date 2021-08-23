require('dotenv').config();
const express = require('express');
const dns = require('dns');
const cors = require('cors');
const app = express();
const mongoose = require("mongoose")

const { Schema } = mongoose;



// Basic Configuration
const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// required middle-ware for body parsing
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());

// allows public folder as URL for accessing stlye.css from main index.html file
app.use('/public', express.static(`${process.cwd()}/public`));

// returns static index.html file when accessing MAIN-URL/
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


// Default test
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});


// URL Shortener Schema and Model (for saving URLs into the database)

const urlSchema = new Schema({
  original_url: String,
  short_url: Number
})

let urlModel = mongoose.model('urlModel', urlSchema);


function isValidHttpUrl(string) {
  let url;
  
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }

  return url.protocol === "http:" || url.protocol === "https:";
}


// Function checks if URL already exists, if not, checks how many are saved and autoincrements short_url for unique url
async function createAndSaveUrl(url_to_shorten) {
  try {
    // finds if url exists
    let urlDoc = await urlModel.findOne({original_url: url_to_shorten});

    // if it doesn't, it's null, creates unique id, and saves to database
    if(urlDoc == null) {
      let short_id = await urlModel.countDocuments();
      short_id += 1;
      const newUrl = new urlModel({
        original_url: url_to_shorten,
        short_url: short_id
      })
      await newUrl.save();
      // return id
      return short_id;
    }
    // already exists, return gotten id
    else {
      return urlDoc.short_url;
    }
  }
  // error catching
  catch {
    console.log("database is not working");
    return null;
  }
};


async function retrieve_url(req, res) {
  let url_to_shorten = req.body.url;
  if(!isValidHttpUrl(url_to_shorten)) {
    res.json({ error: 'invalid url' })
    return;
  }
  else{
    let shortened = await createAndSaveUrl(url_to_shorten);
    // console.log(shortened);
    res.json({"original_url": url_to_shorten, "short_url":shortened});
  }
}


async function redirect(req, res) {
  let short = req.params.short_url;
  let urlDoc = null;
  try {
  urlDoc = await urlModel.findOne({short_url: short});
  }
  catch {
    console.log("database not conncting potentially, otherwise standard error")
  }

  if(urlDoc == null) {
    res.json({"error":"error"});
  }
  else {
    const original_url = urlDoc.original_url;
    res.redirect(original_url);
  }
}



app.post("/api/shorturl", retrieve_url);

app.get("/api/shorturl/:short_url", redirect);



// Start Server
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
