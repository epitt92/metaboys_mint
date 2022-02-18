const express = require("express");
const app = express();
const bodyParser = require('body-parser')
const serverless = require('serverless-http')

app.use(bodyParser.urlencoded({ extended: false }))
const router = express.Router();
const cors = require("cors");
require("dotenv").config({ path: "./config.env" });
const port =  5000;
app.use(cors());
app.use(express.json());
router.use(require("./routes/user"));
app.use('/.netlify/functions/server', router);  // path must route to lambda


app.listen(5000, () => {
	 // perform a database connection when server starts
	// dbo.connectToServer(function (err) {
    //     console.log("mongodb error")
	// 	if (err) console.error(err);
	// });
	console.log('Local app listening on port 5000!')
});

module.exports = app;
module.exports.handler = serverless(app);