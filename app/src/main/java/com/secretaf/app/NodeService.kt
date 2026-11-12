package com.secretaf.app

import android.app.*
import android.content.Context
import android.content.Intent
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

class NodeService : Service() {
    private var wake: PowerManager.WakeLock? = null

    external fun startNodeWithArguments(args: Array<String>): Int

    override fun onBind(i: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") { stopForeground(true); stopSelf(); android.os.Process.killProcess(android.os.Process.myPid()); return START_NOT_STICKY }
        startForeground(1, notification())
        wake = (getSystemService(Context.POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SecretAF:bot").apply { setReferenceCounted(false); acquire() }
        if (!NodeState.started) {
            NodeState.started = true
            val b = ByteArray(12); SecureRandom().nextBytes(b)
            NodeState.key = b.joinToString("") { "%02x".format(it) }
            Thread(null, { runNode() }, "node-main", 8L * 1024 * 1024).start()
        }
        return START_STICKY
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
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(NotificationChannel("bot", "Bot đang chạy", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(this, 1, Intent(this, NodeService::class.java).setAction("STOP"), PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, "bot").setSmallIcon(android.R.drawable.ic_menu_manage).setContentTitle("Secret-AF đang chạy")
            .setContentText("Bot chạy nền. Bấm để mở.").setContentIntent(open).setOngoing(true).addAction(0, "Dừng hẳn", stop).build()
    }

    override fun onDestroy() { wake?.let { if (it.isHeld) it.release() }; super.onDestroy() }
}
