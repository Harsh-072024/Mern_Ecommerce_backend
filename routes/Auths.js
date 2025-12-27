const express = require("express");
const {
  createUser,
  loginUser,
  checkAuth,
  resetPasswordRequest,
  resetPassword,
  logout,
} = require("../controller/Auth");

const passport = require("passport");

const router = express.Router();

router
  .post("/signup", createUser)
  .post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: info?.message || "Invalid credentials",
        });
      }

      req.logIn(user, (err) => {
        if (err) return next(err);
        return loginUser(req, res); // your controller
      });
    })(req, res, next);
  })
  .get("/check", passport.authenticate("jwt"), checkAuth)
  .post("/reset-password-request", resetPasswordRequest)
  .post("/reset-password", resetPassword)
  .get("/logout", logout);

exports.router = router;
