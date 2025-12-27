require("dotenv").config();
const express = require("express");
const server = express();
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const crypto = require("crypto");
const JwtStrategy = require("passport-jwt").Strategy;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const productsRouter = require("./routes/Products");
const brandsRouter = require("./routes/Brands");
const categoriesRouter = require("./routes/Categories");
const usersRouter = require("./routes/Users");
const authRouter = require("./routes/Auths");
const cartRouter = require("./routes/Carts");
const orderRouter = require("./routes/Order");
const couponRouter = require("./routes/Coupon");

const User = require("./model/User");
const { isAuth, sanitizeUser, cookieExtractor } = require("./services/common");
const Order = require("./model/Order");

const jwtSecretKey = process.env.JWT_SECRET_KEY;

//Email

// jwt options
const opts = {};
opts.jwtFromRequest = cookieExtractor;
opts.secretOrKey = process.env.JWT_SECRET_KEY;
console.log(opts)

// For webhooks, we need raw body
server.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const secret = process.env.WEBHOOK_SECRET;

      //  Razorpay signature
      // console.log('req.heders',req.headers)
      const signature = req.headers["x-razorpay-signature"];

      //  Calculate HMAC on raw body string
      const shasum = crypto.createHmac("sha256", secret);
      shasum.update(req.body.toString());
      const digest = shasum.digest("hex");

      if (digest !== signature) {
        return res.status(400).send("Invalid signature");
      }

      // Parse event
      const event = JSON.parse(req.body.toString());
      console.log(" Webhook Event:", event.event);
      switch (event.event) {
        case "payment.captured": {
          const payment = event.payload.payment.entity;
          console.log("Payment captured:", payment);

          if (payment.notes && payment.notes.orderId) {
            await Order.findByIdAndUpdate(payment.notes.orderId, {
              paymentStatus: "received",
              razorpayPaymentId: payment.id,
            });
          }
          break;
        }
        case "payment.failed": {
          const failedPayment = event.payload.payment.entity;
          console.log("Payment failed:", failedPayment);
          break;
        }
        default:
          console.log(`Unhandled event type: ${event.event}`);
      }

      res.json({ status: "ok" });
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).send("Webhook processing failed");
    }
  }
);

//middlewares

server.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
  })
);
server.use(passport.authenticate("session"));
server.use(cookieParser());

server.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://mern-ecommerce-frontend-8h76.vercel.app",
    ],
    credentials: true,
    exposedHeaders: ["X-Total-Count"],
  })
);
server.use(express.json()); //to parse req.body
server.use("/products", isAuth(), productsRouter.router);
server.use("/brands", isAuth(), brandsRouter.router);
server.use("/categories", isAuth(), categoriesRouter.router);
server.use("/users", isAuth(), usersRouter.router);
server.use("/auth", authRouter.router);
server.use("/cart", isAuth(), cartRouter.router);
server.use("/orders", isAuth(), orderRouter.router);
server.use("/coupons", isAuth(), couponRouter.router);

// passport stratigies
passport.use(
  "local",
  new LocalStrategy(
    { usernameField: "email" }, //  important
    async function (email, password, done) {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        crypto.pbkdf2(
          password,
          user.salt,
          310000,
          32,
          "sha256",
            function (err, hashedPassword) {
            if (err) return done(err);

            if (!crypto.timingSafeEqual(user.password, hashedPassword)) {
              return done(null, false, { message: "invalid credentilas" });
            }

            const token = jwt.sign(sanitizeUser(user), jwtSecretKey);
            return done(null, { id: user.id, role: user.role, token }); // this lines sends to serializer
          }
        );
      } catch (err) {
        return done(err);
      }
    }
  )
);
passport.use(
  "jwt",
  new JwtStrategy(opts, async function (jwt_payload, done) {
    // console.log({ jwt_payload });
    try {
      const user = await User.findById(jwt_payload.id);
      if (user) {
        return done(null, sanitizeUser(user));
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(err, false);
    }
  })
);

// this creates session variable of req.user on being called from callback
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, role: user.role });
  });
});


// this changes session variable of req.user   called from authorized request
passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

//payments create order

const Razorpay = require("razorpay");

server.post("/create-order", async (req, res) => {
  try {
    const instance = new Razorpay({
      key_id: process.env.RAZORAY_KEY_ID,
      key_secret: process.env.RAZORAY_KEY_SECRET,
    });
    const { totalAmount } = req.body;

    if (!totalAmount) {
      return res.status(400).json({ error: "Total amount required" });
    }

    const options = {
      amount: totalAmount * 100, // amount in smallest currency unit
      currency: "INR",
      receipt: "receipt_order_74394",
    };

    const order = await instance.orders.create(options);

    if (!order) return res.status(500).send("Some error occured");

    res.json(order);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Payment Verification (for later)
server.post("/verify-payment", (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      orderCreationId,
    } = req.body;
    const sign = orderCreationId + "|" + razorpayPaymentId;

    const expectedSign = crypto
      .createHmac("sha256", "A9r2F683YQjWHytjKjlchKpi")
      .update(sign.toString())
      .digest("hex");

    if (razorpaySignature === expectedSign) {
      return res.json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("database connected");
}

server.listen(process.env.PORT, () => {
  console.log("server started at port 8080");
});
