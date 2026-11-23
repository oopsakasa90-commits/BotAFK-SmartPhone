package com.secretaf.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat

/** Giữ bot sống: hẹn giờ canh gác, khởi động lại sau reboot/cập nhật, mở cài đặt "tự khởi động" của hãng máy. */
object Keepalive {
    private const val PREF = "keepalive"

    fun wanted(c: Context) = c.getSharedPreferences(PREF, 0).getBoolean("wanted", true)
    fun setWanted(c: Context, v: Boolean) { c.getSharedPreferences(PREF, 0).edit().putBoolean("wanted", v).apply() }

    fun start(c: Context) {
        try { ContextCompat.startForegroundService(c, Intent(c, NodeService::class.java)) } catch (_: Exception) {}
    }

    private fun pi(c: Context) = PendingIntent.getBroadcast(c, 7, Intent(c, WatchdogReceiver::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

    /** Hẹn báo thức không cần quyền đặc biệt (chịu Doze: chạy trong cửa sổ bảo trì). */
    fun scheduleWatchdog(c: Context, soon: Boolean = false) {
        val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val at = System.currentTimeMillis() + if (soon) 5_000L else 10 * 60_000L
        try { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi(c)) } catch (_: Exception) {}
    }

    fun cancelWatchdog(c: Context) {
        try { (c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pi(c)) } catch (_: Exception) {}
    }

    fun ignoringBattery(c: Context) = (c.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(c.packageName)

    fun batteryIntent(c: Context): Intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${c.packageName}"))

    /** Màn hình "tự khởi động / chạy nền" riêng của từng hãng; null nếu không biết hãng. */
    fun oemIntent(c: Context): Intent? {
        val m = Build.MANUFACTURER.lowercase()
        val list = when {
            m.contains("xiaomi") || m.contains("redmi") || m.contains("poco") -> listOf("com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity")
            m.contains("oppo") || m.contains("realme") || m.contains("oneplus") -> listOf(
                "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
                "com.oplus.battery" to "com.oplus.powermanager.fuelgaue.PowerUsageModelActivity",
                "com.oppo.safe" to "com.oppo.safe.permission.startup.StartupAppListActivity")
            m.contains("vivo") || m.contains("iqoo") -> listOf(
                "com.vivo.permissionmanager" to "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
                "com.iqoo.secure" to "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")
            m.contains("huawei") || m.contains("honor") -> listOf("com.huawei.systemmanager" to "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")
            m.contains("samsung") -> listOf("com.samsung.android.lool" to "com.samsung.android.sm.battery.ui.BatteryActivity")
            else -> emptyList()
        }
        for ((p, cls) in list) {
            val i = Intent().setClassName(p, cls).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (i.resolveActivity(c.packageManager) != null) return i
        }
        return null
    }
}

/** Báo thức canh gác: nếu dịch vụ đã chết (bị hãng máy giết) thì dựng lại, rồi hẹn lượt kế. */
class WatchdogReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent?) {
        if (!Keepalive.wanted(c)) return
        if (!NodeState.started) Keepalive.start(c)
        Keepalive.scheduleWatchdog(c)
    }
}

/** Mở máy / cập nhật app xong: tự bật lại dịch vụ nền. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent?) {
        if (Keepalive.wanted(c)) Keepalive.start(c)
    }
}
