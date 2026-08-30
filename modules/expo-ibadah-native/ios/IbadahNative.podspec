Pod::Spec.new do |s|
  s.name           = 'IbadahNative'
  s.version        = '0.1.0'
  s.summary        = 'Native bridge for Ibadah Lock app-blocking and wake-verified alarms.'
  s.description    = 'Native bridge for Ibadah Lock app-blocking (Screen Time / Family Controls on iOS, an AccessibilityService + foreground service on Android) and wake-verified prayer alarms.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.license        = 'MIT'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  # DeviceActivityMonitorExtension/ is scaffolding for a SEPARATE app-extension
  # Xcode target (see that folder's own doc comments) — it must not be
  # compiled into this pod's main framework target, so exclude it here. The
  # human wires that folder into its own target manually in Xcode; see
  # docs/ios-family-controls-entitlement.md.
  s.exclude_files = "DeviceActivityMonitorExtension/**/*"
end
