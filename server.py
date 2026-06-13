#!/usr/bin/env python3
import base64
import hashlib
import hmac
import json
import os
import re
import socket
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HOST = os.environ.get("HOST", "0.0.0.0")
REQUESTED_PORT = int(os.environ.get("PORT", "8081"))
DATA_FILE = Path(os.environ.get("DATA_FILE", Path(__file__).with_name("masseng-dev-db.json")))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_database():
    if not DATA_FILE.exists():
        return {"users": [], "credentials": [], "threads": [], "messages": []}
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


DB = load_database()


def save_database():
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(DB, ensure_ascii=False, indent=2), encoding="utf-8")


def allowed_origin(request_origin):
    if "*" in CORS_ORIGINS:
        return "*"
    if request_origin and request_origin in CORS_ORIGINS:
        return request_origin
    return CORS_ORIGINS[0] if CORS_ORIGINS else "*"


def public_user(user):
    return {
        "id": user["id"],
        "email": user["email"],
        "fullName": user["fullName"],
        "username": user["username"],
        "publicKeyBase64": user["publicKeyBase64"],
        "avatarData": user.get("avatarData"),
        "createdAt": user["createdAt"],
    }


def thread_id(first, second):
    return ":".join(sorted([first, second]))


def validate_email(email):
    value = str(email or "").strip().lower()
    if "@" not in value or "." not in value:
        raise ValueError("invalidEmail")
    return value


def validate_name(full_name):
    value = str(full_name or "").strip()
    if not value:
        raise ValueError("invalidName")
    return value


def validate_username(username):
    value = str(username or "").strip().lower()
    if not re.fullmatch(r"[a-z0-9._]{3,24}", value):
        raise ValueError("invalidUsername")
    return value


def validate_password(password):
    if len(str(password or "")) < 8:
        raise ValueError("invalidPassword")


def hash_password(password, salt=None):
    if salt is None:
        salt = os.urandom(16)
    elif isinstance(salt, str):
        salt = base64.b64decode(salt)
    digest = hashlib.scrypt(str(password).encode("utf-8"), salt=salt, n=16384, r=8, p=1, dklen=64)
    return {
        "salt": base64.b64encode(salt).decode("ascii"),
        "hash": base64.b64encode(digest).decode("ascii"),
    }


def verify_password(password, credential):
    candidate = hash_password(password, credential["salt"])
    return hmac.compare_digest(candidate["hash"], credential["passwordHash"])


STATUS_BY_ERROR = {
    "badCredentials": 401,
    "emailTaken": 409,
    "invalidEmail": 400,
    "invalidName": 400,
    "invalidPassword": 400,
    "invalidUsername": 400,
    "missingField": 400,
    "notFound": 404,
    "payloadTooLarge": 413,
    "threadNotFound": 404,
    "userNotFound": 404,
    "usernameTaken": 409,
}


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_json(200, {})

    def do_GET(self):
        self.route()

    def do_POST(self):
        self.route()

    def do_PATCH(self):
        self.route()

    def log_message(self, format, *args):
        print("%s - %s" % (self.address_string(), format % args))

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        origin = self.headers.get("Origin")
        cors_origin = allowed_origin(origin)
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", cors_origin)
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS")
        self.send_header("Access-Control-Max-Age", "86400")
        if cors_origin != "*":
            self.send_header("Vary", "Origin")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length > 25 * 1024 * 1024:
            raise ValueError("payloadTooLarge")
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def fail(self, error):
        code = str(error)
        self.send_json(STATUS_BY_ERROR.get(code, 500), {"error": code})

    def route(self):
        parsed = urlparse(self.path)
        parts = [part for part in parsed.path.split("/") if part]
        query = parse_qs(parsed.query)

        try:
            if self.command == "GET" and parsed.path == "/health":
                self.send_json(200, {"ok": True, "users": len(DB["users"]), "messages": len(DB["messages"])})
                return

            if self.command == "POST" and parsed.path == "/auth/register":
                body = self.read_body()
                email = validate_email(body.get("email"))
                full_name = validate_name(body.get("fullName"))
                username = validate_username(body.get("username"))
                validate_password(body.get("password"))
                public_key = body.get("publicKeyBase64")
                if not public_key:
                    raise ValueError("missingField")
                if any(item["email"] == email for item in DB["credentials"]):
                    raise ValueError("emailTaken")
                if any(item["username"] == username for item in DB["users"]):
                    raise ValueError("usernameTaken")

                user = {
                    "id": str(uuid.uuid4()).upper(),
                    "email": email,
                    "fullName": full_name,
                    "username": username,
                    "publicKeyBase64": public_key,
                    "avatarData": None,
                    "createdAt": now_iso(),
                }
                password = hash_password(body.get("password"))
                DB["users"].append(user)
                DB["credentials"].append({
                    "userID": user["id"],
                    "email": email,
                    "salt": password["salt"],
                    "passwordHash": password["hash"],
                })
                save_database()
                self.send_json(201, public_user(user))
                return

            if self.command == "POST" and parsed.path == "/auth/login":
                body = self.read_body()
                email = validate_email(body.get("email"))
                credential = next((item for item in DB["credentials"] if item["email"] == email), None)
                if credential is None or not verify_password(body.get("password"), credential):
                    raise ValueError("badCredentials")
                user = next((item for item in DB["users"] if item["id"] == credential["userID"]), None)
                if user is None:
                    raise ValueError("userNotFound")
                self.send_json(200, public_user(user))
                return

            if self.command == "GET" and parsed.path == "/users/search":
                search = query.get("q", [""])[0].strip().lower().lstrip("@")
                excluding = query.get("excluding", [""])[0]
                users = []
                if search:
                    users = [
                        public_user(user)
                        for user in sorted(DB["users"], key=lambda item: item["username"])
                        if user["id"] != excluding and search in user["username"]
                    ]
                self.send_json(200, users)
                return

            if self.command == "GET" and len(parts) == 2 and parts[0] == "users":
                user = next((item for item in DB["users"] if item["id"] == parts[1]), None)
                if user is None:
                    raise ValueError("userNotFound")
                self.send_json(200, public_user(user))
                return

            if self.command == "PATCH" and len(parts) == 2 and parts[0] == "users":
                body = self.read_body()
                user = next((item for item in DB["users"] if item["id"] == parts[1]), None)
                credential = next((item for item in DB["credentials"] if item["userID"] == parts[1]), None)
                if user is None or credential is None:
                    raise ValueError("userNotFound")

                email = validate_email(body.get("email"))
                full_name = validate_name(body.get("fullName"))
                username = validate_username(body.get("username"))
                if any(item["userID"] != user["id"] and item["email"] == email for item in DB["credentials"]):
                    raise ValueError("emailTaken")
                if any(item["id"] != user["id"] and item["username"] == username for item in DB["users"]):
                    raise ValueError("usernameTaken")

                user["email"] = email
                user["fullName"] = full_name
                user["username"] = username
                user["avatarData"] = body.get("avatarData")
                credential["email"] = email
                save_database()
                self.send_json(200, public_user(user))
                return

            if self.command == "GET" and len(parts) == 3 and parts[0] == "users" and parts[2] == "conversations":
                user_id = parts[1]
                conversations = []
                for thread in DB["threads"]:
                    if user_id not in thread["participantIDs"]:
                        continue
                    participant_id = next(item for item in thread["participantIDs"] if item != user_id)
                    participant = next((user for user in DB["users"] if user["id"] == participant_id), None)
                    if participant is None:
                        continue
                    last_message = next((message for message in DB["messages"] if message["id"] == thread.get("lastMessageID")), None)
                    conversations.append({
                        "id": thread["id"],
                        "participant": public_user(participant),
                        "updatedAt": thread["updatedAt"],
                        "lastPreview": "Изображение" if last_message and last_message["kind"] == "image" else "Зашифрованное сообщение",
                    })
                conversations.sort(key=lambda item: item["updatedAt"], reverse=True)
                self.send_json(200, conversations)
                return

            if self.command == "GET" and len(parts) == 3 and parts[0] == "threads" and parts[2] == "messages":
                messages = [message for message in DB["messages"] if message["threadID"] == parts[1]]
                messages.sort(key=lambda item: item["createdAt"])
                self.send_json(200, messages)
                return

            if self.command == "POST" and parsed.path == "/messages":
                body = self.read_body()
                sender = next((user for user in DB["users"] if user["id"] == body.get("senderID")), None)
                recipient = next((user for user in DB["users"] if user["id"] == body.get("recipientID")), None)
                if sender is None or recipient is None:
                    raise ValueError("userNotFound")

                thread = thread_id(sender["id"], recipient["id"])
                timestamp = now_iso()
                message = {
                    "id": str(uuid.uuid4()).upper(),
                    "threadID": thread,
                    "senderID": sender["id"],
                    "recipientID": recipient["id"],
                    "kind": "image" if body.get("kind") == "image" else "text",
                    "encryptedBody": body.get("encryptedBody"),
                    "createdAt": timestamp,
                    "deliveredAt": timestamp,
                }
                DB["messages"].append(message)

                existing_thread = next((item for item in DB["threads"] if item["id"] == thread), None)
                if existing_thread:
                    existing_thread["lastMessageID"] = message["id"]
                    existing_thread["updatedAt"] = timestamp
                else:
                    DB["threads"].append({
                        "id": thread,
                        "participantIDs": [sender["id"], recipient["id"]],
                        "lastMessageID": message["id"],
                        "updatedAt": timestamp,
                    })

                save_database()
                self.send_json(201, message)
                return

            raise ValueError("notFound")
        except ValueError as error:
            self.fail(error)
        except Exception as error:
            print("Server error:", error)
            self.fail("serverError")


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


def candidate_ports():
    ports = [REQUESTED_PORT, 8081, 8082, 8080]
    unique_ports = []
    for port in ports:
        if port not in unique_ports:
            unique_ports.append(port)
    return unique_ports


def local_network_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("8.8.8.8", 80))
            return probe.getsockname()[0]
    except OSError:
        return None


if __name__ == "__main__":
    last_error = None
    for port in candidate_ports():
        try:
            server = ReusableThreadingHTTPServer((HOST, port), Handler)
        except OSError as error:
            last_error = error
            print(f"Port {port} is unavailable: {error}")
            continue

        lan_ip = local_network_ip()
        print(f"Vitëk dev server: http://{HOST}:{port}")
        print(f"Data file: {DATA_FILE}")
        print(f"CORS origins: {', '.join(CORS_ORIGINS)}")
        print(f"Mac address: http://localhost:{port}")
        print(f"iPhone address: http://MacBook-Air-Artem-2.local:{port}")
        if lan_ip:
            print(f"iPhone fallback: http://{lan_ip}:{port}")
        print("Keep this window open while testing Vitëk.")
        server.serve_forever()

    raise SystemExit(f"Could not start Masseng dev server: {last_error}")
