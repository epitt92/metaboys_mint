const express = require("express");
// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const recordRoutes = express.Router();

var mongoose = require('mongoose')
const Db = "mongodb+srv://yamane:r3XzaTIrj0W1BXwA@meta3oys-cluster1.sfdgf.mongodb.net/meta3oys?retryWrites=true&w=majority" ;



// This section will help you create a new record.
recordRoutes.route("/user/add").post(function (req, response) {
  mongoose.connect(Db, {useNewUrlParser: true, useUnifiedTopology: true})
  const db_connect = mongoose.connection

  // let db_connect = dbo.getDb();
  console.log(db_connect)
  let myobj = {
    email: req.body.email,
    wallet: req.body.wallet,
    balance: req.body.balance,
    phone: req.body.phone,
    vip: req.body.vip, 
    timestamp: new Date()
  };
  let success = true;
  console.log(myobj)
  db_connect.collection("users").findOne({email: myobj["email"], wallet: myobj["wallet"], vip: myobj["vip"]}, (err, res) => {
    if (err) throw err;
    if (res !== null){
      return response.status(400).send({message: 0})
    } 
    db_connect.collection("users").insertOne(myobj, function (err, res) {
      if (err) throw err;
      return response.json(res);
    });
  })
});

module.exports = recordRoutes;
