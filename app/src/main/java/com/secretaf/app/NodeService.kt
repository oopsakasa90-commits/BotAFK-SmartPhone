package com.secretaf.app

import android.app.*
import android.content.Context
import android.content.Intent
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import java.io.File
import java.security.SecureRandom
import java.util.zip.ZipInputStream

object NodeState {
    @Volatile var port = 17653
    @Volatile var key = ""
    @Volatile var started = false
    @Volatile var error: String? = null
}

/**
 * Dịch vụ nền (foreground) chạy lõi Node.js. Chạy tiếp khi vuốt app khỏi đa nhiệm; chỉ dừng khi bấm "Dừng hẳn".
 * Giữ CPU + Wi-Fi thức để Android không "đóng băng" bot khi tắt màn hình.
 */
class NodeService : Service() {
    private var wake: PowerManager.WakeLock? = null
    private var wifi: WifiManager.WifiLock? = null

    external fun startNodeWithArguments(args: Array<String>): Int

    override fun onBind(i: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            Keepalive.setWanted(this, false)
            Keepalive.cancelWatchdog(this)
            stopForeground(STOP_FOREGROUND_REMOVE); stopSelf()
            android.os.Process.killProcess(android.os.Process.myPid())
            return START_NOT_STICKY
        }
        Keepalive.setWanted(this, true)
        startForeground(NOTI_ID, notification())
        acquireLocks()
        Keepalive.scheduleWatchdog(this)
        if (!NodeState.started) {
            NodeState.started = true
            val b = ByteArray(12); SecureRandom().nextBytes(b)
            NodeState.key = b.joinToString("") { "%02x".format(it) }
            Thread(null, { runNode() }, "node-main", 8L * 1024 * 1024).start()
        }
        return START_STICKY
    }

    /** Vuốt app khỏi đa nhiệm: dịch vụ vẫn sống; hẹn lại để hồi sinh nếu hãng máy giết. */
    override fun onTaskRemoved(rootIntent: Intent?) {
        Keepalive.scheduleWatchdog(this, soon = true)
        super.onTaskRemoved(rootIntent)
    }

    private fun acquireLocks() {
        if (wake == null) wake = (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SecretAF:bot").apply { setReferenceCounted(false) }
        if (wake?.isHeld != true) wake?.acquire()
        if (wifi == null) wifi = (applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager)
            .createWifiLock(if (Build.VERSION.SDK_INT >= 29) WifiManager.WIFI_MODE_FULL_LOW_LATENCY else WifiManager.WIFI_MODE_FULL_HIGH_PERF, "SecretAF:wifi").apply { setReferenceCounted(false) }
        if (wifi?.isHeld != true) wifi?.acquire()
    }

    private fun runNode() {
        try {
            val root = File(filesDir, "nodejs-project")
            val stamp = File(filesDir, "nodejs-project.ver")
            val ver = packageManager.getPackageInfo(packageName, 0).let { it.versionName + "-" + it.lastUpdateTime }
            if (!root.exists() || !stamp.exists() || stamp.readText() != ver) {
                root.deleteRecursively()
                ZipInputStream(assets.open("nodejs-project.zip").buffered(1 shl 16)).use { z ->
                    var e = z.nextEntry
                    while (e != null) {
                        val f = File(root, e.name)
                        if (!f.canonicalPath.startsWith(root.canonicalPath)) throw SecurityException("zip")
                        if (e.isDirectory) f.mkdirs() else { f.parentFile?.mkdirs(); f.outputStream().buffered(1 shl 16).use { o -> z.copyTo(o) } }
                        e = z.nextEntry
                    }
                }
                stamp.writeText(ver)
            }
            val data = File(getExternalFilesDir(null) ?: filesDir, "data").apply { mkdirs() }
            System.loadLibrary("node"); System.loadLibrary("native-lib")
            startNodeWithArguments(arrayOf("node", File(root, "server.js").absolutePath, "--data", data.absolutePath, "--port", NodeState.port.toString(), "--key", NodeState.key))
        } catch (t: Throwable) { NodeState.error = t.toString() }
    }

    private fun notification(): Notification {
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(NotificationChannel(CHANNEL, "Bot đang chạy nền", NotificationManager.IMPORTANCE_LOW).apply { setShowBadge(false) })
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(this, 1, Intent(this, NodeService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CHANNEL).setSmallIcon(android.R.drawable.ic_menu_manage).setContentTitle("Secret-AF đang chạy nền")
            .setContentText("Bot vẫn hoạt động khi tắt màn hình. Bấm để mở.").setContentIntent(open).setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE).setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(0, "Dừng hẳn", stop).build()
    }

    override fun onDestroy() {
        wake?.let { if (it.isHeld) it.release() }
        wifi?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }

    companion object {
        const val ACTION_STOP = "com.secretaf.app.STOP"
        const val CHANNEL = "bot"
        const val NOTI_ID = 1
    }
}
