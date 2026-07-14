# GoZoon Mobile Deployment Guide: CapacitorJS Blueprint

This guide provides a comprehensive, step-by-step technical blueprint for packaging the **GoZoon Customer, Business, and Road King** React applications into native mobile apps for **iOS (Apple App Store)** and **Android (Google Play Store)** using **CapacitorJS**.

---

## 1. Architectural Overview: How Full-Stack Apps Work on Mobile

Our current application is a **full-stack app**:
1. **Frontend**: React (Vite) client SPA.
2. **Backend**: Node.js/Express server (`server.ts`) connecting to PostgreSQL and Firestore.

### ⚠️ Critical Mobile Constraints
* **Node.js doesn't run inside iOS/Android app bundles**: iOS and Android cannot natively execute a persistent Node.js/Express web server inside the mobile binary. 
* **The Capacitor Wrapper**: Capacitor packages the compiled frontend static files (`dist/`) into a native container WebView.
* **The Solution**: The Express backend must remain hosted in the cloud (e.g., on Google Cloud Run), and the mobile app's React code must make **absolute API requests** to your hosted server instead of relative `/api/orders` endpoints.

---

## 2. Step-by-Step Integration Roadmap

Follow these steps on your development machine (Mac is required for iOS builds due to Xcode; Windows or Mac works for Android).

### Step 2.1: Add Environment Variable support for the API URL
To ensure the app can switch dynamically between **relative routes** (for web development/hosting) and **absolute URLs** (for Capacitor on mobile), update your API fetch configuration.

In a configuration file or directly in your codebase, set your API base URL:

```typescript
// src/config.ts
export const getApiUrl = (): string => {
  // If running inside native Capacitor environment
  if (window.hasOwnProperty('Capacitor') || typeof window !== 'undefined' && window.location.protocol === 'file:') {
    // Replace with your actual deployed production URL
    return 'https://ais-dev-ap557zrj3sovqxnvxsqzsf-651428129387.asia-east1.run.app';
  }
  // Otherwise, fallback to relative path for standard web hosting
  return '';
};
```

Update your `fetch` calls in `src/App.tsx` from `/api/orders` to `${getApiUrl()}/api/orders`.

---

### Step 2.2: Install Capacitor Dependencies
Run the following commands in your project root to add Capacitor to your workspace:

```bash
# 1. Install Capacitor Core and CLI
npm install @capacitor/core @capacitor/cli

# 2. Initialize Capacitor configuration
npx cap init GoZoon com.gozoon.app --web-dir=dist
```

* **App Name**: `GoZoon` (or `GoZoon Road King`, etc.)
* **App ID**: `com.yourname.gozoon` (reverse domain format, e.g., `com.gozoon.customer`)
* **Web Directory**: Set this to `dist` (this matches Vite's production build folder).

---

### Step 2.3: Install Platform SDKs
Install the platforms you want to build for:

```bash
# Install Android and iOS integration packages
npm install @capacitor/android @capacitor/ios

# Add the platforms to your project workspace
npx cap add android
npx cap add ios
```

---

### Step 2.4: Building and Syncing Assets
Whenever you make a frontend change, you must compile the web assets first, then sync them into the native iOS/Android folders:

```bash
# 1. Build the React production distribution
npm run build

# 2. Sync the compiled 'dist' files into Android/iOS directories
npx cap sync
```

---

## 3. Configuring Platform-Specific Projects

### 🤖 Android Setup (Google Play Store)
1. Install [Android Studio](https://developer.android.com/studio).
2. Open the Android project inside Android Studio:
   ```bash
   npx cap open android
   ```
3. Android Studio will open the `/android` folder, index the project, and configure Gradle dependencies.
4. **Internet Permissions**: Open `android/app/src/main/AndroidManifest.xml` and make sure the internet permission is declared under the `<manifest>` tag:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   ```
5. **Testing**: Connect your Android device via USB (enable Developer Options & USB Debugging) and click the **Run** button (green play icon) in Android Studio to install the app.

### 🍎 iOS Setup (Apple App Store)
1. Xcode is required (Mac only). Install Xcode from the Mac App Store.
2. Open the iOS project in Xcode:
   ```bash
   npx cap open ios
   ```
3. **Signing & Capabilities**: Select the project root `App` in the left sidebar, go to the **Signing & Capabilities** tab, select your Developer Team, and configure your Bundle Identifier.
4. **Testing**: Connect your iPhone via USB, select your phone in the active devices dropdown in Xcode, and click **Play/Build** to launch it on your device.

---

## 4. Packaging Standalone Dedicated Apps (Customer vs. Rider vs. Business)

Since you have **three distinct apps** in one codebase, you can package them as separate mobile binaries using one of two clean strategies:

### Option A: The "All-in-One" Portal (Recommended)
Compile the app exactly as it is now. When the user opens the application, they can select whether they are a **Customer, Business, or Rider** (or detect the view mode based on a stored login/role preference).

### Option B: Three Dedicated App Repositories (To Publish Separately)
If you want to compile and publish them as separate apps (e.g. "GoZoon Customer" and "GoZoon Road King") on the app stores:
1. Make three separate directories or configuration targets.
2. In each target's `src/App.tsx`, force the default view using the standalone parameter we implemented.
   * For example, for the **Customer App**, set the default standalone mode to `'customer'`.
   * For the **Rider App**, set the default standalone mode to `'roadking'`.
3. Give each app its own unique bundle identifier during `npx cap init`:
   * `com.gozoon.customer`
   * `com.gozoon.roadking`
   * `com.gozoon.business`

---

## 5. Publishing to the App Stores

### 🍏 Publishing to Apple App Store (iOS)
1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
2. Create your App record in [App Store Connect](https://appstoreconnect.apple.com/).
3. In Xcode, set the build target to **Any iOS Device (arm64)**.
4. Select **Product > Archive**. Once the archive is complete, click **Distribute App** to upload the build to App Store Connect.
5. Set up your app description, privacy policies, screenshots, and submit for TestFlight or App Store review.

### 🤖 Publishing to Google Play Store (Android)
1. Enroll in the [Google Play Console](https://play.google.com/console/signup/) ($25 one-time fee).
2. In Android Studio, select **Build > Generate Signed Bundle / APK**.
3. Choose **Android App Bundle (AAB)** (which is optimized for Play Store delivery).
4. Create or select an existing Keystore file, set your passwords, and compile the release AAB file.
5. Create a new release in Google Play Console, upload the `.aab` file, configure your store listing, and submit for review.
