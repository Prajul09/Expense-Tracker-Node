var express = require("express");
var router = express.Router();
const User = require("../models/userModel");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const upload = require('./multer');

passport.use(new LocalStrategy(User.authenticate()));

const { sendmail } = require("../utils/sendmail");
const Expense = require("../models/expenseModel");

router.get("/", function (req, res, next) {
    res.render("index", { admin: req.user });
});

router.get("/signup", function (req, res, next) {
    res.render("signup", { admin: req.user });
});

router.post("/signup", async function (req, res, next) {
    try {
        await User.register(
            { username: req.body.username, email: req.body.email },
            req.body.password
        );
        res.redirect("/signin");
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

router.get("/signin", function (req, res, next) {
    res.render("signin", { admin: req.user });
});

router.get("/forget", function (req, res, next) {
    res.render("forget", { admin: req.user });
});

router.post("/send-mail", async function (req, res, next) {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user)
            return res.send("User Not Found! <a href='/forget'>Try Again</a>");

        sendmail(user.email, user, res, req);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

router.post("/forget/:id", async function (req, res, next) {
    try {
        const user = await User.findById(req.params.id);
        if (!user)
            return res.send("User not found! <a href='/forget'>Try Again</a>.");

        if (user.token == req.body.token) {
            user.token = -1;
            await user.setPassword(req.body.newpassword);
            await user.save();
            res.redirect("/signin");
        } else {
            user.token = -1;
            await user.save();
            res.send("Invalid Token! <a href='/forget'>Try Again<a/>");
        }
    } catch (error) {
        res.send(error);
    }
});

router.post(
    "/signin",
    passport.authenticate("local", {
        successRedirect: "/profile",
        failureRedirect: "/signin",
    }),
    function (req, res, next) {}
);

router.get("/profile", isLoggedIn, async function (req, res, next) {
    try {
        const { expenses } = await req.user.populate("expenses");
        console.log(req.user, expenses);
        res.render("profile", { admin: req.user, expenses });
    } catch (error) {
        res.send(error);
    }
});

router.get("/reset", isLoggedIn, function (req, res, next) {
    res.render("reset", { admin: req.user });
});

router.post("/reset", isLoggedIn, async function (req, res, next) {
    try {
        await req.user.changePassword(
            req.body.oldpassword,
            req.body.newpassword
        );
        await req.user.save();
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});

router.get("/signout", isLoggedIn, function (req, res, next) {
    req.logout(() => {
        res.redirect("/signin");
    });
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect("/signin");
    }
}
// -----------------------------------------------------------------
router.get("/createexpense", isLoggedIn, function (req, res, next) {
    res.render("createexpense", { admin: req.user });
});

router.post("/createexpense", isLoggedIn, async function (req, res, next) {
    try {
        const expense = new Expense(req.body);
        req.user.expenses.push(expense._id);
        expense.user = req.user._id;
        await expense.save();
        await req.user.save();
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});

router.get("/filter", isLoggedIn,async function (req, res, next) {
    try {
        let { expenses } = await req.user.populate("expenses");
        expenses = expenses.filter((e) => e[req.query.key] == req.query.value);
        res.render("profile", { admin: req.user, expenses });
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

// -----------------------------------------------------------------
router.get("/update-user", isLoggedIn, function (req, res, next) {
    res.render("update-user", { admin: req.user });
});

// POST route to handle the username update
router.post("/update-user", isLoggedIn, async function (req, res, next) {
    try {
        // Update the username
        req.user.username = req.body.newUsername;
        req.user.email = req.body.newEmail;
        await req.user.save();
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});



router.get("/delete-user", isLoggedIn, function (req, res, next) {
    res.render("delete-user", { admin: req.user });
});

router.post("/delete-user", isLoggedIn, async function (req, res, next) {
    try {
         await User.deleteOne({ _id: req.user._id });
         await Expense.deleteMany({ user: req.user._id });

        req.logout(() => {
            res.redirect("/signin");
        });
    } catch (error) {
        res.send(error);
    }
});


// Render the update expense form
router.get("/update-expense/:id", isLoggedIn, async function (req, res, next) {
    try {
        const expense = await Expense.findById(req.params.id);
        res.render("update-expense", { admin: req.user, expense });
    } catch (error) {
        res.send(error);
    }
});

// Handle the update expense form submission
router.post("/update-expense/:id", isLoggedIn, async function (req, res, next) {
    try {
        const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});

// Handle the delete expense request
router.post("/delete-expense/:id", isLoggedIn, async function (req, res, next) {
    try {
        // Delete the expense
        await Expense.findByIdAndDelete(req.params.id);

        // Remove the expense ID from the user's expenses array
        req.user.expenses = req.user.expenses.filter(expenseId => expenseId.toString() !== req.params.id);

        // Save the updated user
        await req.user.save();

        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});

router.post("/update-profile-picture", isLoggedIn, upload.single("profilePicture"), async function (req, res, next) {
    try {
        req.user.profilePicture = req.file.filename;
        await req.user.save();

        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
});






module.exports = router;
