package com.secretaf.app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Lưu tài khoản đã đăng nhập, mã hóa AES-GCM bằng khóa trong Android Keystore (không thể đọc ra khỏi máy). */
class Vault(private val ctx: Context) {
    private val prefs = ctx.getSharedPreferences("vault", 0)

    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val g = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        g.init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build())
        return g.generateKey()
    }

    fun save(u: String, p: String) {
        try {
            val c = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
            val enc = c.doFinal("$u\n$p".toByteArray(Charsets.UTF_8))
            prefs.edit().putString("d", Base64.encodeToString(c.iv + enc, Base64.NO_WRAP)).apply()
        } catch (_: Exception) {}
    }

    /** JSON {"u":..,"p":..} hoặc "" nếu chưa lưu. */
    fun load(): String {
        return try {
            val raw = Base64.decode(prefs.getString("d", null) ?: return "", Base64.NO_WRAP)
            val c = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, raw.copyOfRange(0, 12))) }
            val s = String(c.doFinal(raw, 12, raw.size - 12), Charsets.UTF_8)
            val i = s.indexOf('\n')
            org.json.JSONObject().put("u", s.substring(0, i)).put("p", s.substring(i + 1)).toString()
        } catch (_: Exception) { "" }
    }

    fun clear() { prefs.edit().remove("d").apply() }

    companion object { private const val ALIAS = "secretaf_cred" }
}
