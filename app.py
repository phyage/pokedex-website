import os

import pymysql
from flask import Flask, flash, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-secret")


def get_db():
    """Open a new connection to the MariaDB container."""
    return pymysql.connect(
        host=os.environ.get("DB_HOST", "db"),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
        database=os.environ.get("DB_NAME"),
        cursorclass=pymysql.cursors.DictCursor,
    )


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form["username"].strip()
        email = request.form["email"].strip().lower()
        password = request.form["password"]

        if not username or not email or len(password) < 8:
            flash("Fill in every box. Passwords need at least 8 characters.", "error")
            return render_template("register.html")

        conn = get_db()
        try:
            with conn.cursor() as cur:
                # %s placeholders keep user input separate from the SQL
                cur.execute(
                    "INSERT INTO users (username, email, password_hash, display_name) "
                    "VALUES (%s, %s, %s, %s)",
                    (username, email, generate_password_hash(password), username),
                )
            conn.commit()
        except pymysql.err.IntegrityError:
            # UNIQUE columns stop duplicate usernames and emails
            flash("That username or email is already taken.", "error")
            return render_template("register.html")
        finally:
            conn.close()

        flash("Account created. You can log in now.", "success")
        return redirect(url_for("login"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]

        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, username, password_hash FROM users WHERE username = %s",
                (username,),
            )
            user = cur.fetchone()
        conn.close()

        if user and check_password_hash(user["password_hash"], password):
            session.clear()
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            flash(f"Welcome back, {user['username']}!", "success")
            return redirect(url_for("profile"))

        flash("Incorrect username or password.", "error")

    return render_template("login.html")


@app.route("/profile")
def profile():
    # A placeholder: you'll build the real page in Activity 4
    return f"<h1>Logged in as {session.get('username')}</h1><a href='/logout'>Log out</a>"


@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "success")
    return redirect(url_for("index"))
