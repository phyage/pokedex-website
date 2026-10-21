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
    if not session.get("user_id"):
        flash("Please log in to access your Pokédex.", "error")
        return redirect(url_for("login"))

    return render_template("profile.html")


@app.route("/team")
def team():
    if not session.get("user_id"):
        flash("Please log in to view your team.", "error")
        return redirect(url_for("login"))

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT pokemon_id FROM user_team "
                "WHERE user_id = %s ORDER BY added_at, id",
                (session["user_id"],),
            )
            team_pokemon = cur.fetchall()
    finally:
        conn.close()

    return render_template("team.html", team=team_pokemon)


@app.route("/team/add", methods=["POST"])
def add_to_team():
    if not session.get("user_id"):
        flash("Please log in to build your team.", "error")
        return redirect(url_for("login"))

    try:
        pokemon_id = int(request.form.get("pokemon_id", ""))
    except ValueError:
        flash("Invalid Pokémon.", "error")
        return redirect(url_for("profile"))

    if not 1 <= pokemon_id <= 1025:
        flash("Invalid Pokémon.", "error")
        return redirect(url_for("profile"))

    user_id = session["user_id"]
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM user_team "
                "WHERE user_id = %s AND pokemon_id = %s",
                (user_id, pokemon_id),
            )
            if cur.fetchone():
                flash("That Pokémon is already on your team.", "error")
                return redirect(url_for("profile"))

            cur.execute(
                "SELECT COUNT(*) AS total FROM user_team WHERE user_id = %s",
                (user_id,),
            )
            if cur.fetchone()["total"] >= 6:
                flash("Your team is full! Remove a Pokémon first.", "error")
                return redirect(url_for("team"))

            cur.execute(
                "INSERT INTO user_team (user_id, pokemon_id) VALUES (%s, %s)",
                (user_id, pokemon_id),
            )

        conn.commit()
        flash("Pokémon added to your team!", "success")
    finally:
        conn.close()

    return redirect(url_for("profile"))


@app.route("/team/remove", methods=["POST"])
def remove_from_team():
    if not session.get("user_id"):
        flash("Please log in to manage your team.", "error")
        return redirect(url_for("login"))

    try:
        pokemon_id = int(request.form.get("pokemon_id", ""))
    except ValueError:
        flash("Invalid Pokémon.", "error")
        return redirect(url_for("team"))

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM user_team WHERE user_id = %s AND pokemon_id = %s",
                (session["user_id"], pokemon_id),
            )

        conn.commit()
        flash("Pokémon removed from your team.", "success")
    finally:
        conn.close()

    return redirect(url_for("team"))


@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "success")
    return redirect(url_for("index"))