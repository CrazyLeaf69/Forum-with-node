const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mysql = require("mysql");
const crypto = require('crypto');
const validator = require("email-validator");

app.use(express.static('public'))

app.post('/change',function(req,res){
  // the message being sent back will be saved in a localSession variable
  // send back a couple list items to be added to the DOM
  get_all_posts(res);
});

// final catch-all route to '/' 
app.get('/*', (req, res) => {
  res.redirect('/');
})
server.listen(3000, () => {
  console.log('listening on *:3000');
});

app.use(express.urlencoded({extended: true})); 
app.post("/register", function(req, res) {
  let body = req.body;
  CreateUser(res, body.name, body.email, body.username, body.password)
});

app.post("/login_user", function(req, res) {
  let body = req.body;
  LoginUser(req, res, body.username, body.password)
});
app.post("/create_post", function(req, res) {
  let body = req.body;
  create_post(body.creator, body.title, body.subject, body.content, res)
});
app.post("/searchUsers", function(req,res) {
  let search = req.body.search
  // console.log(search);
  searchUsers(res, search)
})

function CreateUser(res, usersName, usersEmail, usersUid, usersPwd) {
  let con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "chatingV2"
  });

  con.connect(function(err) {
    if (err) throw err;

    // Felhantering
    let errors = false;
    // check mail
    if (validator.validate(usersEmail) == false) {
      errors = true;
      res.redirect("register.html?invalidemail")
    }
    // check passwords
    if (usersPwd[0] != usersPwd[1]) {
      errors = true;
      res.redirect("register.html?passwordsdontmatch")
    }
    // check user exists
    con.query(`SELECT * FROM users WHERE usersUid = '${usersUid}' OR usersEmail = '${usersEmail}';`, function (err, result) {
      if (err) throw err;
      
      if (result.length > 0) {
        errors = true;
        res.redirect("register.html?usernametaken");
      } else {
        // Create user
        if (!errors) {
          var hashedPwd = crypto.createHash('md5').update(usersPwd[0]).digest('hex');
          con.query(`INSERT INTO users (usersName, usersEmail, usersUid, usersPwd) VALUES ('${usersName}', '${usersEmail}', '${usersUid}', '${hashedPwd}');`, function(err, result, fields) {
            if (err) throw err;
            con.end(function(err) {
              if (err) throw err;
            });
            return res.redirect("login.html?success");
          }); 
        }
      }
    });
  }); 
}
let loggingIn = false
function LoginUser(req, res, username, password) {
  loggingIn = true
  let con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "chatingV2"
  });
  con.connect(function(err) {
    if (err) throw err;

    var hashedPwd = crypto.createHash('md5').update(password).digest('hex');
    con.query(`SELECT * FROM users WHERE (usersUid = '${username}' AND usersPwd = '${hashedPwd}') OR (usersEmail = '${username}' AND usersPwd = '${hashedPwd}');`, function (err, result) {
      if (err) throw err;
      console.log(result);
      
      if (result.length === 1) {
        // login success
        var username = result[0].usersUid
        var usersName = result[0].usersName
        var id = result[0].usersId
        console.log(`user: ${username} logged in`);
        io.on('connection', (socket) => {
          socket.on('logout',function (data) {
            loggingIn = false
            console.log(`user with id: '${data}' logged out`)
          });
          if (loggingIn) {
            socket.emit('login', username, id, usersName);
          }
        });
        return res.redirect("login.html");
      }
      else {
        // login failed
        return res.redirect("login.html?wronglogin");
      }
    });
  }); 
}

function create_post(usersName, title, subject, content, res) {
  let con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "chatingV2"
  });

  con.connect(function(err) {
    if (err) throw err;
    // $id, $title, $subject, $content
    sql = `INSERT INTO forums (publisher, title, subject, content) VALUES ('${usersName}', '${title}', '${subject}', '${content}');`
    con.query(sql, function (err, result) {
      if (err) throw err;
      console.log(result);
      return res.redirect("/")
    });
  }); 
}
function get_all_posts(res) {
  let con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "chatingV2"
  });

  // console.log("getting all posts");
  con.connect(function(err) {
    if (err) throw err;
    // $id, $title, $subject, $content
    sql = "SELECT * FROM `forums`";
    con.query(sql, function (err, result) {
      if (err) throw err;
      // console.log(result);
      let html = "";
      result.forEach(element => {
        html += `
        <div class="post">
          <div class="post-title">Title: ${element.title}</div>
          <div class="post-subject">Subject: ${element.subject}</div>
          <div class="post-content">Content: ${element.content}</div>
          <div class="post-creator">Creator: ${element.publisher}</div>
        </div><br>`
      });
      res.send({success: true, message: html});
    });
  }); 
}

function searchUsers(res, search) {
  let con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "chatingV2"
  });

  // console.log("getting all posts");
  con.connect(function(err) {
    if (err) throw err;
    // $id, $title, $subject, $content
    sql = `SELECT * FROM users WHERE (usersUid = '${search}');`;
    con.query(sql, function (err, result) {
      if (err) throw err;
      // console.log(result);
      let html = "";
      if (result.length > 0) {
        result.forEach(element => {
          html += `
          <div>${element.usersUid}</div><br>`
        });
      }
      else {
        html="no user found"
      }
      res.send({success: true, message: html});
    });
  }); 
}