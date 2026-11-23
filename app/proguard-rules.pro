# JNI: tên hàm native phải giữ nguyên để libnative-lib tìm thấy
-keepclasseswithmembernames class * { native <methods>; }
-keep class com.secretaf.app.NodeService { *; }
-keep class com.secretaf.app.NodeState { *; }
