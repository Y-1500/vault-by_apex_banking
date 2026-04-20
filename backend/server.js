require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

app.use(cors({ origin: "*" }));

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("DB connected"));

const User = mongoose.model("User", {
  email: String,
  password: String,
  role: { type: String, default: "user" }
});

const Account = mongoose.model("Account", {
  userId: String,
  balance: { type: Number, default: 1000 }
});

const Transaction = mongoose.model("Transaction", {
  type: String,
  amount: Number,
  senderId: String,
  receiverId: String,
  createdAt: { type: Date, default: Date.now }
});

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.sendStatus(401);
  req.user = jwt.verify(token, process.env.JWT_SECRET);
  next();
};

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.post("/signup", async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({ email: req.body.email, password: hash });
  await Account.create({ userId: user._id });
  res.json({ message: "User created" });
});

app.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  const ok = await bcrypt.compare(req.body.password, user.password);
  if (!ok) return res.sendStatus(400);

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
  res.json({ token });
});

app.get("/balance", auth, async (req, res) => {
  const acc = await Account.findOne({ userId: req.user.id });
  res.json(acc);
});

app.post("/deposit", auth, async (req, res) => {
  const acc = await Account.findOne({ userId: req.user.id });
  acc.balance += req.body.amount;
  await acc.save();

  await Transaction.create({
    type: "deposit",
    amount: req.body.amount,
    receiverId: req.user.id
  });

  res.json({ message: "Deposited" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT);
