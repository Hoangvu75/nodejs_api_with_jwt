import express from "express";
import mongoose from "mongoose";
import jwt, { JwtPayload } from "jsonwebtoken";

import Account from "./model/account";

import * as ACCESS_LINK from "./utils/access_link";
import * as API_LINK from "./utils/api_link";

const app = express();
app.use(express.json());

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET||'secret';

function initate_server() {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Listening to server: ${PORT}\nConnecting to the database...`);
  });
}

function setup_database_connection() {
  mongoose.connect(ACCESS_LINK.DB_CONNECTION_STRINGS, function (err) {
    console.log("Initialization completed.");
    if (err) {
      console.log("Connection error");
      throw err;
    }
  });
}

function setup_get_request() {
  app.get("/", function (_req: any, res: any) {
    res.status(200).send("Hello world!");
  });

  app.get(API_LINK.LINK_ACCOUNT_DATA, function (req: any, res: any) {
    // Get the token from the request header
    const token = req.headers["authorization"];
    var ObjectId = require('mongodb').ObjectID;

    jwt.verify(token, ACCESS_TOKEN_SECRET, { complete: true }, function (err) {
      if (err) return res.sendStatus(401);
      // Find the user in the database using the decoded token
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
      const payload = decoded as JwtPayload;
      Account.findOne({ "_id": new ObjectId(payload.id) }, function (err: any, account: any) {
        if (err) {
          return res.status(500).send({
            success: false,
            message: `${err}`,
          });
        }
        if (!account) {
          return res.status(404).send({
            success: false,
            message: "Invalid account data.",
          });
        }
        // Return the user data in the response
        res.status(200).send({
          success: true,
          account,
        });
      });
    });
  });
}

function setup_post_request() {
  app.post(API_LINK.LINK_AUTHEN_REGISTER, async (req: any, res: any) => {
    var username = req.body.username;
    var password = req.body.password;

    if (username.length < 8 || password.length < 8) {
      res.status(406).send({
        success: false,
        message:
          "Register failed, username and password must be at least 8 characters.",
      });
    } else {
      Account.findOne(
        { username: username },
        async function (err: any, account: any) {
          if (err) {
            return res.status(500).send({
              message: `${err}`,
            });
          }

          if (account) {
            return res.status(406).send({
              success: false,
              message: "Register failed, this  account is already created.",
            });
          }

          if (!account) {
            try {
              const new_account = new Account(req.body);
              await new_account.save();
              return res.status(200).send({
                success: true,
                message: "Register successfully",
                new_account,
              });
            } catch (err) {
              return res.status(500).send({ message: `${err}` });
            }
          }
        }
      );
    }
  });

  app.post(API_LINK.LINK_AUTHEN_LOGIN, (req, res) => {
    // find the user with the given username
    Account.findOne(
      { username: req.body.username },
      (err: any, account: { password: any; _id: any }) => {
        if (err) {
          return res.status(500).send({
            success: false,
            message: "Error on the server.",
          });
        }
        if (!account) {
          return res.status(404).send({
            success: false,
            message: "Wrong username or password.",
          });
        }

        // verify the password
        const passwordIsValid = account.password === req.body.password;
        if (!passwordIsValid) {
          return res.status(401).send({
            success: false,
            message: "Wrong username or password.",
          });
        }

        // if the username and password are correct, create a JWT
        const token = jwt.sign({ id: account._id },  ACCESS_TOKEN_SECRET, {
          expiresIn: 86400, // expires in 24 hours
        });

        // return the token in the response
        return res.status(200).send({
            success: true,
            message: "Login successfully",
            token,
            account,
        });
      }
    );
  });
}

async function main() {
  initate_server();
  setup_database_connection();
  setup_get_request();
  setup_post_request();
}
main();
