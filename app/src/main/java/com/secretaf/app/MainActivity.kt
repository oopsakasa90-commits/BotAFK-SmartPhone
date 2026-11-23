package com.secretaf.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.ComponentCallbacks2
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.net.HttpURLConnection
import java.net.URL

/**
 * Giao diện chỉ là WebView mỏng. Khi app ra nền (tắt màn hình / về home / vuốt khỏi đa nhiệm) WebView bị HỦY hoàn toàn
 * (giải phóng RAM + 0% CPU giao diện); bot vẫn chạy trong NodeService. Mở lại thì dựng lại giao diện.
 */
class MainActivity : AppCompatActivity() {
    private var web: WebView? = null
    private lateinit var root: FrameLayout
    private lateinit var status: TextView
    private lateinit var vault: Vault
    @Volatile private var loading = false

    inner class Bridge {
        @JavascriptInterface fun saveCred(u: String, p: String) = vault.save(u, p)
        @JavascriptInterface fun loadCred(): String = vault.load()
        @JavascriptInterface fun clearCred() = vault.clear()
    }

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        vault = Vault(this)
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        status = TextView(this).apply {
            text = "Đang khởi động lõi…\n(lần đầu mất 10–60 giây)"; setTextColor(0xFFCCD3F0.toInt()); textSize = 15f
            gravity = Gravity.CENTER; setPadding(48, 48, 48, 48)
        }
        root = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#0D1220")); addView(status) }
        setContentView(root)
        Keepalive.start(this)
        window.decorView.post { setupBackground() }
    }

    override fun onStart() {
        super.onStart()
        if (web == null) { status.visibility = View.VISIBLE; Thread { waitAndLoad() }.start() }
    }

    /** Ra nền: hủy WebView để thật sự "đóng băng" giao diện, nhả RAM của renderer. */
    override fun onStop() {
        destroyWeb()
        super.onStop()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createWeb(): WebView = WebView(this).apply {
        setBackgroundColor(Color.parseColor("#0D1220"))
        settings.javaScriptEnabled = true; settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false; settings.textZoom = 100
        settings.cacheMode = WebSettings.LOAD_NO_CACHE; settings.setGeolocationEnabled(false)
        settings.allowFileAccess = false; settings.allowContentAccess = false
        overScrollMode = View.OVER_SCROLL_NEVER
        addJavascriptInterface(Bridge(), "AndroidApp")
        webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                if (r.url.host == "127.0.0.1") return false
                try { startActivity(Intent(Intent.ACTION_VIEW, r.url)) } catch (_: Exception) {}
                return true
            }
        }
    }

    private fun destroyWeb() {
        val w = web ?: return
        web = null
        try { root.removeView(w); w.stopLoading(); w.loadUrl("about:blank"); w.clearHistory(); w.removeAllViews(); w.destroy() } catch (_: Exception) {}
    }

    private fun waitAndLoad() {
        if (loading) return
        loading = true
        val t0 = System.currentTimeMillis()
        try {
            while (System.currentTimeMillis() - t0 < 180_000) {
                NodeState.error?.let { runOnUiThread { status.text = "Lỗi khởi động lõi:\n$it" }; return }
                if (NodeState.key.isNotEmpty()) try {
                    val c = URL("http://127.0.0.1:${NodeState.port}/manifest.json").openConnection() as HttpURLConnection
                    c.connectTimeout = 800; c.readTimeout = 800
                    if (c.responseCode == 200) {
                        runOnUiThread {
                            if (web == null && !isFinishing && !isDestroyed) {
                                val w = createWeb(); web = w
                                root.addView(w, 0, FrameLayout.LayoutParams(-1, -1))
                                w.loadUrl("http://127.0.0.1:${NodeState.port}/?k=${NodeState.key}")
                                status.visibility = View.GONE
                            }
                        }
                        return
                    }
                } catch (_: Exception) {}
                Thread.sleep(500)
            }
            runOnUiThread { status.text = "Lõi không khởi động được (quá 3 phút)." }
        } finally { loading = false }
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

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (level >= ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN) destroyWeb()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() { moveTaskToBack(true) } // chạy nền, không thoát
}
