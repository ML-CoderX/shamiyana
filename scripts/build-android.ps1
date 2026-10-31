param(
  [string]$Architectures = 'arm64-v8a,x86_64'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
try {
  if (-not $env:JAVA_HOME) {
    $studioJava = 'C:\Program Files\Android\Android Studio\jbr'
    if (Test-Path -LiteralPath $studioJava) { $env:JAVA_HOME = $studioJava }
  }
  if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath 'C:\Android\Sdk')) {
    $env:ANDROID_HOME = 'C:\Android\Sdk'
  }
  if (-not $env:JAVA_HOME -or -not $env:ANDROID_HOME) {
    throw 'Set JAVA_HOME and ANDROID_HOME to your installed JDK and Android SDK.'
  }
  New-Item -ItemType Directory -Force .tmp | Out-Null
  $env:TEMP = Join-Path $projectRoot '.tmp'
  $env:TMP = $env:TEMP
  $env:NODE_ENV = 'production'
  if (-not (Test-Path -LiteralPath 'android\gradlew.bat')) {
    & npx.cmd expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed.' }
  }
  Push-Location android
  try {
    & .\gradlew.bat assembleRelease --no-daemon --max-workers=2 "-PreactNativeArchitectures=$Architectures"
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
  } finally { Pop-Location }
  New-Item -ItemType Directory -Force artifacts | Out-Null
  Copy-Item -LiteralPath 'android\app\build\outputs\apk\release\app-release.apk' -Destination 'artifacts\shamiyana-preview.apk'
  Get-FileHash -LiteralPath 'artifacts\shamiyana-preview.apk' -Algorithm SHA256
  Write-Host 'Preview APK: artifacts\shamiyana-preview.apk (test key; not a store release).'
} finally { Pop-Location }
