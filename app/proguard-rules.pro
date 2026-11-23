# JNI: tên hàm native phải giữ nguyên để libnative-lib tìm thấy
-keepclasseswithmembernames class * { native <methods>; }
-keep class com.secretaf.app.NodeService { *; }
-keep class com.secretaf.app.NodeState { *; }
# cầu nối JS <-> Kotlin (lưu tài khoản): không đổi tên hàm
-keepattributes JavascriptInterface
-keepclassmembers class com.secretaf.app.MainActivity$Bridge { @android.webkit.JavascriptInterface <methods>; }
