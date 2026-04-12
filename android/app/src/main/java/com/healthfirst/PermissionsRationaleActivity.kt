package com.healthfirst

import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * Shown when the user opens the Health Connect privacy / permissions rationale link.
 * Required for the Health Connect permission flow on Android 13+ (see project AndroidManifest).
 */
class PermissionsRationaleActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val webView = WebView(this)
    webView.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(
        view: WebView?,
        request: WebResourceRequest?,
      ): Boolean {
        return false
      }
    }
    webView.loadUrl(
      "https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started",
    )
    setContentView(webView)
  }
}
