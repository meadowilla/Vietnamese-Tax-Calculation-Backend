const express = require("express");
const authRouter = require("./routes/AuthRoutes");
const TaxRoutes = require("./routes/TaxRoutes");
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const cors = require('cors')

const app = express();
dotenv.config();
const port = process.env.PORT || 3000;
const fePort = process.env.FE_PORT || 5173;

app.use(cors({ origin: `http://localhost:${fePort}`, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/tax", TaxRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;

const mongoose = require("mongoose");
const queryURI = process.env.MONGODB_URI;

//configure mongoose
mongoose.connect(queryURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected!'))
    .catch(err => console.log('MongoDB connection error:', err.message));
