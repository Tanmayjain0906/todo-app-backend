const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const mongodbSession = require("connect-mongodb-session")(session);
const cors = require('cors');


//file import
const userModel = require("./modals/userModel");
const sessionModel = require("./modals/sessionModel");
const { registrationValidation, loginValidation, isEmailValidate } = require("./utils/authUtils");
const isAuthMiddleware = require("./middleware/isAuthaMiddleware");
const todoValidation = require("./utils/todoUtlis");
const todoModel = require("./modals/todoModel");


//constant
const app = express();
const PORT = 8000;
const MONGO_URI = process.env.MONGO_URI;
const store = new mongodbSession({
    uri: MONGO_URI,
    collection: "sessions",
})


//middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SECRET_KEY,
    store: store,
    saveUninitialized: false,
    resave: false,
    cookie: {
        sameSite: 'None', // Add this line
        secure: true, // This is required if you're using 'SameSite=None'
    }
}))
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from this origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    credentials: true // Allow cookies to be sent with requests
}));



//db connection
mongoose.connect(MONGO_URI).then(() => console.log("mongodb conected")).catch((err) => console.log(err));


app.get("/", (req, res) => {
    return res.send("Hello World!");
})


app.post("/register", async (req, res) => {
    console.log(req.body);
    const { name, email, password, username } = req.body;

    try {
        await registrationValidation({ email, password, username });
    }
    catch (err) {
        return res.status(400).json({ message: err });
    }

    try {
        const emailExists = await userModel.findOne({ email });

        if (emailExists) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const usernameExists = await userModel.findOne({ username });

        if (usernameExists) {
            return res.status(400).json({ message: "Username already exists" });
        }

        //encrypt the password
        const hashPassword = await bcrypt.hash(password, Number(process.env.SALT));

        const userObj = new userModel({ email, name, username, password: hashPassword });

        const userDb = await userObj.save();

        return res.status(201).json({ message: "User created successfully", data: userDb })
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }


})

// app.get("/login", (req, res) => {
//     console.log(req.session.isAuth);
//     return res.send(`<form action="/login" method="POST">
//         <label for="loginId">Email or Username</label>
//         <input type="text" name="loginId" />
//         <label for="password">Password</label>
//         <input type="password" name="password" />
//         <button type="submit">Submit</button>
//     </form>`)
// })

app.post("/login", async (req, res) => {

    const { loginId, password } = req.body;

    try {
        await loginValidation({ loginId, password });
    }
    catch (err) {
        return res.status(400).json({ message: err });
    }


    try {
        let userDb = {};
        if (isEmailValidate({ key: loginId })) {
            userDb = await userModel.findOne({ email: loginId });
        }
        else {
            userDb = await userModel.findOne({ username: loginId });
        }

        if (!userDb) {
            return res.status(400).json({ message: "User not found, please register first" });
        }

        const isPasswordMatch = await bcrypt.compare(password, userDb.password);
        console.log(isPasswordMatch);

        if (!isPasswordMatch) {
            return res.status(400).json({ message: "Incorrect Paaword" });
        }

        req.session.isAuth = true;
        req.session.user = {
            userId: userDb._id,
            username: userDb.username,
            email: userDb.email,
        }
        return res.status(200).json({ message: "Login Successfull" });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})

// app.get("/dashboard", isAuthMiddleware, (req, res) => {
//     return res.send(`<form action="/logout" method="POST">
//         <button type="submit">logout</button>
//     </form>

//     <form action="/logout-from-all-devices" method="POST">
//         <button type="submit">LOGOUT FROM ALL DEVICES</button>
//     </form>`);
// })

app.get("/logout", isAuthMiddleware, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: "Internal Server Error", error: err });
        }
        else {
            return res.status(200).json({ message: "Logout Successfull" });
        }
    })
})



app.post("/logout-from-all-devices", isAuthMiddleware, async (req, res) => {
    try {
        const deleteDb = await sessionModel.deleteMany({ "session.user.username": req.session.user.username });

        console.log(deleteDb);

        return res.status(200).json({ message: `Logout from ${deleteDb.deletedCount} devices successfull` });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})

app.post("/create-todo", isAuthMiddleware, async (req, res) => {
    const { todo } = req.body;
    try {
        await todoValidation(todo);
    }
    catch (err) {
        return res.status(400).json({ message: err });
    }

    try {
        const todoObj = new todoModel({
            title: todo,
            username: req.session.user.username,
        })

        const todoDb = await todoObj.save();
        console.log(todoDb);
        return res.status(201).json({ message: "Todo Create Successfully" });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})

app.get("/read-all-todos", isAuthMiddleware, async (req, res) => {
    try {
        const allTodos = await todoModel.find({ username: req.session.user.username });
        return res.status(200).json({ message: "Read Success", data: allTodos });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})

app.post("/edit-todo", isAuthMiddleware, async (req, res) => {
    const { editId, newTodo } = req.body;

    try {
        await todoValidation(newTodo);
    }
    catch (err) {
        return res.status(400).json({ message: err });
    }

    try {
        const todoDb = await todoModel.findOne({ _id: editId });
        console.log(todoDb);
        if (!todoDb) {
            return res.status(404).json({ message: "Todo Not Found" });
        }

        if (todoDb.username !== req.session.user.username) {
            return res.status(403).json({ message: "Not allow to edit someone todo" });
        }

        const todoDbPrev = await todoModel.findOneAndUpdate({ _id: editId }, { title: newTodo });

        return res.status(200).json({ message: "Todo Updated Successfull", data: todoDbPrev });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})

app.post("/delete-todo", isAuthMiddleware, async (req, res) => {
    const { deleteId } = req.body;

    try {
        const todoDb = await todoModel.findOne({ _id: deleteId });
        if (!todoDb) {
            return res.status(404).json({ message: "Todo Not Found" });
        }

        if (todoDb.username !== req.session.user.username) {
            return res.status(403).json({ message: "Not allow to delete someone todo" });
        }

        const todoDbPrev = await todoModel.findOneAndDelete({ _id: deleteId });

        return res.status(200).json({ message: "Todo Deleted Successfull", data: todoDbPrev });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})


app.listen(PORT, () => {
    console.log("server start running on PORT:8000");
})