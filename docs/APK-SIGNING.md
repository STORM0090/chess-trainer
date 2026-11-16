# The APK signing key: what the owner does, step by step

The release APK is signed with a key that only the owner creates and keeps. The key never
enters the repository, the chat or any log. This page is for Windows; every command is typed
by the owner in their own terminal. Nobody else needs to see any password.

Why it matters: Android installs an update only when it is signed with the same key as the
installed app. **A lost key means the app has to be uninstalled and installed again, and its
progress is lost** (unless a progress file was saved first: "Ещё", "Данные").

## 0. What is needed

- A JDK with `keytool`. Android Studio brings one: `C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe`.
  Any JDK 17 or later works too. Check in PowerShell:

  ```powershell
  & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -help
  ```

  If the file is elsewhere, use that path in the commands below.
- The GitHub CLI `gh`, signed in by the owner (`gh auth status` shows the account).
- A password manager (for the two passwords) and a second offline medium (a USB stick) for a
  copy of the key file.

## 1. Create the key (once)

Pick a folder **outside the project**, for example `D:\keys` or a folder in the user profile
that is not synced anywhere public. In PowerShell:

```powershell
New-Item -ItemType Directory -Force D:\keys
Set-Location D:\keys
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore chess-trainer-release.jks -alias chess-trainer -keyalg RSA -keysize 4096 -validity 10000
```

`keytool` asks for a keystore password (twice), then for a name and other fields (any values,
they are visible in the certificate; a first name is enough), and at the end for the key
password: press Enter to use the same password, or type a second one. Store both passwords in
the password manager right away, with the alias `chess-trainer`.

Then copy `chess-trainer-release.jks` to the offline medium.

## 2. Put the key into GitHub secrets

The workflow needs four secrets. They are set from the owner's terminal; the values never
appear on the screen or in the chat.

```powershell
Set-Location D:\keys
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\keys\chess-trainer-release.jks")) | gh secret set ANDROID_KEYSTORE_BASE64 --repo STORM0090/chess-trainer
gh secret set ANDROID_KEYSTORE_PASSWORD --repo STORM0090/chess-trainer
gh secret set ANDROID_KEY_PASSWORD --repo STORM0090/chess-trainer
gh secret set ANDROID_KEY_ALIAS --repo STORM0090/chess-trainer --body chess-trainer
```

The second and third commands ask for the value interactively (type or paste the password,
then Enter). `gh secret list --repo STORM0090/chess-trainer` shows the four names and dates,
never the values.

## 3. Make a release

After `m7` is merged into `main`, a tag starts the release workflow:

```powershell
git tag v0.8.0
git push origin v0.8.0
```

The workflow `Android release` builds the signed APK, publishes it on the Releases page of
the repository and writes the SHA-256 fingerprint of the certificate into the release notes.
Without the four secrets it only says that they are missing and builds nothing.

## 4. Install on the phone

1. Before the first install of the APK, save a progress file in the web app ("Ещё", "Данные",
   "Сохранить файл"). The APK has its own storage and starts empty.
2. Download the APK from the Releases page on the phone and open it; Android asks to allow
   installs from this source (the browser or the Files app) once.
3. Open the app, "Ещё", "Данные", "Выбрать файл": load the progress file.
4. Optional check: the fingerprint shown in the release notes should match the one Android
   shows for the installed app (Settings, Apps, Chess Trainer, "App details" on some
   versions; not every Samsung version shows it).

## Debug builds

Every push of a stage branch from `m7` on builds a debug APK (workflow `Android debug APK`,
artifact `chess-trainer-debug-<branch>`, kept 30 days). It is signed with a throwaway debug
key made on the runner, so it cannot update a release build or the other way round:
uninstall one before installing the other (and save a progress file first).

## If something goes wrong

- **The key file is lost but the secrets are still in GitHub:** the workflow can still sign.
  Secrets cannot be read back, so make a new offline copy only from a backup.
- **A password is lost:** the key is unusable. Make a new key (step 1), replace the secrets
  (step 2); users have to reinstall.
- **A secret was shown somewhere public:** make a new key and replace the secrets; delete the
  old key file.
