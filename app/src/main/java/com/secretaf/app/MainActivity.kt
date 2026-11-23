package com.secretaf.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var status: TextView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        status = TextView(this).apply {
            text = "Đang khởi động lõi…\n(lần đầu mất 10–60 giây)"; setTextColor(0xFFCCD3F0.toInt()); textSize = 15f
            gravity = Gravity.CENTER; setPadding(48, 48, 48, 48)
        }
        web = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0D1220"))
            settings.javaScriptEnabled = true; settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false; settings.textZoom = 100
            overScrollMode = View.OVER_SCROLL_NEVER
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                    if (r.url.host == "127.0.0.1") return false
                    try { startActivity(Intent(Intent.ACTION_VIEW, r.url)) } catch (_: Exception) {}
                    return true
                }
            }
            visibility = View.INVISIBLE
        }
        setContentView(FrameLayout(this).apply { addView(web); addView(status) })
        Keepalive.start(this)
        Thread { waitAndLoad() }.start()
        window.decorView.post { setupBackground() }
    }

    private fun waitAndLoad() {
        val t0 = System.currentTimeMillis()
        while (System.currentTimeMillis() - t0 < 180_000) {
            NodeState.error?.let { runOnUiThread { status.text = "Lỗi khởi động lõi:\n$it" }; return }
            if (NodeState.key.isNotEmpty()) try {
                val c = URL("http://127.0.0.1:${NodeState.port}/manifest.json").openConnection() as HttpURLConnection
                c.connectTimeout = 800; c.readTimeout = 800
                if (c.responseCode == 200) {
                    runOnUiThread { web.loadUrl("http://127.0.0.1:${NodeState.port}/?k=${NodeState.key}"); web.visibility = View.VISIBLE; status.visibility = View.GONE }
                    return
                }
            } catch (_: Exception) {}
            Thread.sleep(500)
        }
        runOnUiThread { status.text = "Lõi không khởi động được (quá 3 phút)." }
    }

    /** Hướng dẫn một lần: bỏ tối ưu pin + bật "tự khởi động" của hãng máy để Android không đóng băng bot. */
    private fun setupBackground() {
        val prefs = getSharedPreferences("ui", 0)
        if (!Keepalive.ignoringBattery(this)) {
            AlertDialog.Builder(this).setTitle("Cho phép chạy nền")
                .setMessage("Để bot không bị Android đóng băng khi tắt màn hình hoặc xóa app khỏi đa nhiệm, hãy chọn \"Cho phép\" ở bước tiếp theo.")
                .setPositiveButton("Tiếp tục") { _, _ -> try { startActivity(Keepalive.batteryIntent(this)) } catch (_: Exception) {} }
                .setNegativeButton("Để sau", null).show()
        } else if (!prefs.getBoolean("oemAsked", false)) {
            prefs.edit().putBoolean("oemAsked", true).apply()
            Keepalive.oemIntent(this)?.let { oem ->
                AlertDialog.Builder(this).setTitle("Bật tự khởi động")
                    .setMessage("Máy ${Build.MANUFACTURER} có thêm mục \"tự khởi động / chạy nền\" riêng. Hãy bật cho Secret-AF.")
                    .setPositiveButton("Mở cài đặt") { _, _ -> try { startActivity(oem) } catch (_: Exception) {} }
                    .setNegativeButton("Bỏ qua", null).show()
            }
        }
    }

    override fun onResume() { super.onResume(); Keepalive.scheduleWatchdog(this) }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() { moveTaskToBack(true) } // chạy nền, không thoát
}
