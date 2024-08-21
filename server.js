const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
// const session = require("express-session");
// const mongodbSession = require("connect-mongodb-session")(session);
const cors = require('cors');
const jwt = require("jsonwebtoken");


//file import
const userModel = require("./modals/userModel");
// const sessionModel = require("./modals/sessionModel");
const { registrationValidation, loginValidation, isEmailValidate } = require("./utils/authUtils");
const isAuthMiddleware = require("./middleware/isAuthaMiddleware");
const todoValidation = require("./utils/todoUtlis");
const todoModel = require("./modals/todoModel");
const rateLimitingMiddleware = require("./middleware/rateLimitingMiddleware");





//constant
const app = express();
const PORT = 8000;
const MONGO_URI = process.env.MONGO_URI;
// const store = new mongodbSession({
//     uri: MONGO_URI,
//     collection: "sessions",
// })



// middleware
app.use(cors({
    origin: 'http://localhost:8000',
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// app.use(session({
//     secret: process.env.SECRET_KEY,
//     store: store,
//     saveUninitialized: false,
//     resave: false,
// }));



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

        // req.session.isAuth = true;
        // req.session.user = {
        //     userId: userDb._id,
        //     username: userDb.username,
        //     email: userDb.email,
        // }
        let details = {
            userId: userDb._id,
            username: userDb.username,
            email: userDb.email,
        }
        let token = jwt.sign(details, process.env.SECRET_KEY, { expiresIn: "2d" });

        return res.status(200).json({ message: "Login Successfull", token: token });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})



app.get("/logout", isAuthMiddleware, rateLimitingMiddleware, (req, res) => {
    return res.status(200).json({ message: "Logout Successfull" });
})



// app.get("/logout-from-all-devices", isAuthMiddleware, rateLimitingMiddleware, async (req, res) => {
//     try {
//         const deleteDb = await sessionModel.deleteMany({ "session.user.username": req.session.user.username });

//         console.log(deleteDb);

//         return res.status(200).json({ message: `Logout from ${deleteDb.deletedCount} devices successfull` });
//     }
//     catch (err) {
//         return res.status(500).json({ message: "Internal Server Error", error: err });
//     }
// })

app.post("/create-todo", isAuthMiddleware, rateLimitingMiddleware, async (req, res) => {
    const { todo } = req.body;

    console.log(todo);
    try {
        await todoValidation(todo);
    }
    catch (err) {
        return res.status(400).json({ message: err });
    }

    try {
        const todoObj = new todoModel({
            title: todo,
            username: req.userInfo.username,
        })

        await todoObj.save();
        return res.status(201).json({ message: "Todo Create Successfully" });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})

app.get("/read-all-todos", isAuthMiddleware,async (req, res) => {
    const skip = req.query.skip || 0;
    console.log(skip);
    try {

        const todoLength = await todoModel.countDocuments({ username: req.userInfo.username });


        const allTodos = await todoModel.aggregate([{
            $match: { username: req.userInfo.username },
        }, {
            $skip: Number(skip),
        }, {
            $limit: 5,
        }])
        return res.status(200).json({ message: "Read Success", data: allTodos, totalTodos: todoLength });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }


})

app.post("/edit-todo", isAuthMiddleware, rateLimitingMiddleware, async (req, res) => {
    const { editId, newTodo } = req.body;

    try {
        await todoValidation(newTodo);
    }
    catch (err) {
        return res.status(400).json({ message: err });
    }

    try {
        const todoDb = await todoModel.findOne({ _id: editId });
        if (!todoDb) {
            return res.status(404).json({ message: "Todo Not Found" });
        }

        if (todoDb.username !== req.userInfo.username) {
            return res.status(403).json({ message: "Not allow to edit someone todo" });
        }

        const todoDbPrev = await todoModel.findOneAndUpdate({ _id: editId }, { title: newTodo });

        return res.status(200).json({ message: "Todo Updated Successfull", data: todoDbPrev });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})

app.post("/delete-todo", isAuthMiddleware, rateLimitingMiddleware, async (req, res) => {
    const { deleteId } = req.body;

    try {
        const todoDb = await todoModel.findOne({ _id: deleteId });
        if (!todoDb) {
            return res.status(404).json({ message: "Todo Not Found" });
        }

        if (todoDb.username !== req.userInfo.username) {
            return res.status(403).json({ message: "Not allow to delete someone todo" });
        }

        if (todoDb.status === "Ongoing") {
            return res.status(400).json({ message: "Cannot Delete Ongoing Todo" });
        }
        const todoDbPrev = await todoModel.findOneAndDelete({ _id: deleteId });

        return res.status(200).json({ message: "Todo Deleted Successfull", data: todoDbPrev });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})

app.post("/todo-start", isAuthMiddleware, rateLimitingMiddleware, async (req, res) => {
    const { id } = req.body;
    try {
        const task = await todoModel.findOne({ _id: id });

        if (!task) {
            return res.status(404).json({ message: "Todo Not Found" });
        }

        if (task.status !== "Pending") {
            return res.status(400).json({ message: "Task already started" });
        }

        task.startTime = Date.now();
        task.status = "Ongoing";
        await task.save();
        return res.status(200).json({ message: "Task is started", data: task });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})

app.post("/todo-pause", isAuthMiddleware, rateLimitingMiddleware, async (req, res) => {
    const { id } = req.body;
    try {
        const task = await todoModel.findOne({ _id: id });
        console.log(task);
        if (!task) {
            return res.status(404).json({ message: "Todo Not Found" });
        }
        if (task.status !== 'Ongoing') return res.status(400).json({ message: 'Task is not ongoing' });

        const elapsedTime = Date.now() - new Date(task.startTime);
        task.elapsedTime += elapsedTime;
        task.pauseTime = Date.now();
        task.status = 'Paused';
        await task.save();
        return res.status(200).json({ message: "Task is Paused", data: task });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})

app.post("/todo-resume", isAuthMiddleware, rateLimitingMiddleware, async (req, res) => {
    const { id } = req.body;
    try {
        const task = await todoModel.findOne({ _id: id });
        if (!task) {
            return res.status(404).json({ message: "Todo Not Found" });
        }
        if (task.status !== 'Paused') return res.status(400).json({ message: 'Task is not paused' });

        task.startTime = Date.now() - task.elapsedTime;
        task.status = 'Ongoing';
        await task.save();
        return res.status(200).json({ message: "Task is resumed", data: task });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})

app.post("/todo-end", isAuthMiddleware, rateLimitingMiddleware, async (req, res) => {

    const { id } = req.body;
    try {
        const task = await todoModel.findOne({ _id: id });
        if (!task) {
            return res.status(404).json({ message: "Todo Not Found" });
        }
        if (task.status === 'Completed') return res.status(400).json({ message: 'Task is already completed' });

        const elapsedTime = Date.now() - new Date(task.startTime) || 0;
        task.elapsedTime += elapsedTime;
        task.status = 'Complete';
        await task.save();
        return res.status(200).json({ message: "Task is completed", data: task });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error", error: err });
    }
})


app.listen(PORT, () => {
    console.log("server start running on PORT:8000");
})