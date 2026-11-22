@echo off
rem Збірка debug-APK: веб-збірка -> Capacitor sync -> Gradle.
rem Результат: android\app\build\outputs\apk\debug\app-debug.apk
setlocal
if not defined JAVA_HOME set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.13.102-hotspot"
if not defined ANDROID_HOME set "ANDROID_HOME=F:\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0.."
call npm run build || exit /b 1
call npx cap sync android || exit /b 1
cd /d "%~dp0..\android"
call "%CD%\gradlew.bat" assembleDebug || exit /b 1
copy /y app\build\outputs\apk\debug\app-debug.apk ..\dist-apk\ash-and-fog-debug.apk >nul 2>&1 || (mkdir ..\dist-apk & copy /y app\build\outputs\apk\debug\app-debug.apk ..\dist-apk\ash-and-fog-debug.apk >nul)
echo APK: dist-apk\ash-and-fog-debug.apk
