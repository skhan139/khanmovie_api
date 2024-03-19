const express = require("express");
const app = express();
const bodyParser = require("body-parser");
uuid = require("uuid");
const mongoose = require("mongoose");
const Models = require("./models");
const Movies = Models.Movie;
const Users = Models.User;
const { check, validationResult } = require('express-validator');
mongoose.connect("mongodb://127.0.0.1:27017/movieapi", {
  useNewUrlParser: true, useUnifiedTopology: true,
});
// Middleware for parsing requests
app.use(bodyParser.urlencoded({ extended: true }));
const cors = require('cors');
app.use(cors());
let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');
app.use(bodyParser.json());
//update
// Update a user's info, by username
app.put('/users/:Username', passport.authenticate('jwt', { session: false }), async (req, res) => {
  // CONDITION TO CHECK ADDED HERE
  if(req.user.Username !== req.params.Username){
      return res.status(400).send('Permission denied');
  }
  // CONDITION ENDS
  await Users.findOneAndUpdate({ Username: req.params.Username }, {
      $set:
      {
          Username: req.body.Username,
          Password: req.body.Password,
          Email: req.body.Email,
          Birthday: req.body.Birthday
      }
  },
      { new: true }) // This line makes sure that the updated document is returned
      .then((updatedUser) => {
          res.json(updatedUser);
      })
      .catch((err) => {
          console.log(err);
          res.status(500).send('Error: ' + err);
      })
});
//CREATE
//Add a user
app.post("/users",   [
  check('Username', 'Username is required').isLength({min: 5}),
  check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
  check('Password', 'Password is required').not().isEmpty(),
  check('Email', 'Email does not appear to be valid').isEmail()
], async (req, res) => {
  let hashedPassword = Users.hashPassword(req.body.Password);
  await Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + "already exists");
      } else {
        Users.create({
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        })
          .then((user) => {
            res.status(201).json(user);
          })
          .catch((error) => {
            console.error(error);
            res.status(500).send("Error: " + error);
          });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error: " + error);
    });
});
// Add a movie to a user's list of favorites
app.post("/users/:Username/movies/:MovieID", passport.authenticate("jwt", { session: false }), async (req, res) => {
  await Users.findOneAndUpdate(
    { Username: req.params.Username },
    {
      $push: { FavoriteMovies: req.params.MovieID },
    },
    { new: true }
  ) // This line makes sure that the updated document is returned
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});
//delete
app.delete("/users/:Username/movies/:MovieID", passport.authenticate("jwt", { session: false }),async (req, res) => { 
  await Users.findOneAndUpdate( { Username: req.params.Username }, 
    { $pull: { FavoriteMovies: req.params.MovieID }, }, { new: true } ) // This line makes sure that the updated document is returned .
    then((updatedUser) => { res.json(updatedUser); })
     .catch((err) => 
    { console.error(err); 
      res.status(500).send("Error: " + err); }); 
    });
//delete
app.delete("/users/:Username", passport.authenticate("jwt", { session: false }), (req, res) => {
  Users.findOneAndDelete({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + " was not found");
      } else {
        res.status(200).send(req.params.Username + " was deleted");
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});
//READ
app.get("/", passport.authenticate("jwt", { session: false }), (req, res) => {
  res.send("Welcome to my Top 10 Movies!");
});
// Get all users
app.get("/users", passport.authenticate("jwt", { session: false }), async (req, res) => {
  await Users.find()
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});
// Get a user by username
app.get("/users/:Username", passport.authenticate("jwt", { session: false }), async (req, res) => {
  await Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});
app.get('/movies',  async (req, res) => {
  await Movies.find()
    .then((movies) => {
      res.status(201).json(movies);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});
app.get("/movies/:Title", passport.authenticate("jwt", { session: false }), async (req, res) => {
  await Movies.findOne({ Title: req.params.Title })
    .then((movie) => {
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});
app.get("/movies/genres/:genreName", passport.authenticate("jwt", { session: false }), async (req, res) => {
  await Movies.findOne({ "Genre.Name": req.params.genreName })
    .then((movies) => {
      res.json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});
app.get("/movies/directors/:directorName", passport.authenticate("jwt", { session: false }), async (req, res) => {
  await Movies.findOne({ "Director.Name": req.params.directorName })
    .then((movies) => {
      res.json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});
app.get("/documentation", passport.authenticate("jwt", { session: false }), (req, res) => {
  res.sendFile("public/documentation.html", { root: __dirname });
});
app.get("/secreturl", passport.authenticate("jwt", { session: false }), (req, res) => {
  res.send("This is a secret URL with super top-secret content.");
});
// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send('Something broke!');
 // });

 // Listen for requests
 const port = process.env.PORT || 8080;
 app.listen(port, '0.0.0.0',() => {
  console.log('Listening on Port ' + port);
 }); 