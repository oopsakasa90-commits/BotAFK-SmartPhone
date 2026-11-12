package com.secretaf.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.webkit.*
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var status: TextView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        status = TextView(this).apply { text = "Đang khởi động lõi..."; setTextColor(0xFFCCD3F0.toInt()); textSize = 16f; gravity = android.view.Gravity.CENTER; setBackgroundColor(0xFF0D1220.toInt()) }
        web = WebView(this).apply {
            setBackgroundColor(0xFF0D1220.toInt())
            settings.javaScriptEnabled = true; settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false; settings.textZoom = 100
            webViewClient = object : WebViewClient() { override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                if (r.url.host == "127.0.0.1") return false
                startActivity(Intent(Intent.ACTION_VIEW, r.url)); return true } }
            visibility = android.view.View.INVISIBLE
        }
        setContentView(android.widget.FrameLayout(this).apply { addView(web); addView(status) })
        ContextCompat.startForegroundService(this, Intent(this, NodeService::class.java))
        askBattery()
        Thread { waitAndLoad() }.start()
    }

    private fun waitAndLoad() {
        val t0 = System.currentTimeMillis()
        while (System.currentTimeMillis() - t0 < 180_000) {
            NodeState.error?.let { runOnUiThread { status.text = "Lỗi khởi động lõi:\n$it" }; return }
            if (NodeState.key.isNotEmpty()) try {
                val c = URL("http://127.0.0.1:${NodeState.port}/manifest.json").openConnection() as HttpURLConnection
                c.connectTimeout = 800; c.readTimeout = 800
                if (c.responseCode == 200) { runOnUiThread { web.loadUrl("http://127.0.0.1:${NodeState.port}/?k=${NodeState.key}"); web.visibility = android.view.View.VISIBLE; status.visibility = android.view.View.GONE }; return }
            } catch (_: Exception) {}
            Thread.sleep(500)
        }
        runOnUiThread { status.text = "Lõi không khởi động được (quá 3 phút)." }
    }

    private fun askBattery() {
        val pm = getSystemService(PowerManager::class.java)
        if (!pm.isIgnoringBatteryOptimizations(packageName)) try {
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        } catch (_: Exception) {}
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() { moveTaskToBack(true) } // giữ bot chạy nền, không thoát
}
