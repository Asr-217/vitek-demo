# Masseng

Masseng is a native SwiftUI messenger prototype for iOS and macOS.
It now also includes a browser version in `Web/` for local testing and later hosting.

Implemented:

- email registration and login;
- required full name and unique username during registration;
- user search by username;
- encrypted text and image messages with CryptoKit;
- delivered date and time in chat history;
- editable profile email, username, full name, and avatar;
- shared SwiftUI codebase for iPhone, iPad, and Mac.
- local Python dev server for testing real two-device messaging on one Wi‑Fi network.
- browser SPA version with chats, user search, profile, settings, images, and responsive layout.

The default backend is `ServerMessengerService`, which talks to the local dev server in `Server/server.py`. `LocalSecureMessengerService` is still kept as an offline prototype implementation behind the same `MessengerServicing` protocol.

## Open

Open `Masseng.xcodeproj` in Xcode and choose either the `Masseng iOS` or `Masseng Mac` target. The shared source targets iOS 17+ and macOS 14+.

`Package.swift` is also included so the source tree can be opened as a Swift package for inspection and lightweight iteration.

## Two-Device Local Test

1. Start the server on the Mac:

   ```sh
   python3 Server/server.py
   ```

2. Find the Mac Wi‑Fi IP address:

   ```sh
   ipconfig getifaddr en0
   ```

3. Build and run `Masseng iOS` on both iPhones from Xcode.

4. On the app login/register screen, set the server address to:

   ```text
   http://YOUR_MAC_IP:8080
   ```

   Example:

   ```text
   http://192.168.1.10:8080
   ```

5. Register a different account on each iPhone.

6. Search for the other user's username and send a message.

The iPhones and Mac must be on the same Wi‑Fi network. macOS may ask whether Python can accept incoming network connections; allow it for the test.

## Browser Version

Fast local start:

```sh
./Start\ Vitek\ Browser\ Test.command
```

Manual start:

```sh
HOST=0.0.0.0 PORT=8081 python3 Server/server.py
cd Web
python3 -m http.server 5173
```

Open:

```text
http://localhost:5173
```

For a phone in the same Wi-Fi network, open the Mac address instead, for example:

```text
http://192.168.1.10:5173
```

In the web app settings, set the API server to the backend address, for example:

```text
http://192.168.1.10:8081
```

## Web Deployment

Deployment preparation is in [DEPLOY.md](/Users/artyom/Documents/Masseng/DEPLOY.md).

Production pieces:

- `Web/` is the static frontend.
- `Server/server.py` is the API backend.
- `Web/config.js` stores the public API URL.
- `Dockerfile`, `docker-compose.yml`, `Procfile`, and `render.yaml` are included for common hosting paths.

Recommended demo setup:

- frontend: Cloudflare Pages, Vercel, or Netlify;
- backend: Render, Railway, Fly.io, Google Cloud Run, or VPS;
- domains: `vitek.example.com` and `api.vitek.example.com`.

## Security Notes

- Message bodies are encrypted with CryptoKit using Curve25519 key agreement and ChaChaPoly.
- Private keys are stored in Keychain.
- The dev server stores public profile data, public keys, and encrypted message payloads. It does not store private keys.
- The dev server is only for local testing. Production authentication should use HTTPS, auth tokens, email verification, rate limiting, session revocation, backups, and hardened media storage.
