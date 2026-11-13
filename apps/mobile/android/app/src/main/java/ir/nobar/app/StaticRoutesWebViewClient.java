package ir.nobar.app;

import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Capacitor answers every extension-less path with the root index.html (single-page apps). The store is a Next.js
 * static export with its own HTML per route, so a full load of /search/ or /l/l701/ would show the home page.
 * This client rewrites such a request to the route's index.html when the app bundle has one, then lets Capacitor's
 * local server answer it as usual (including the bridge script it adds to HTML files).
 */
public class StaticRoutesWebViewClient extends BridgeWebViewClient {

    private final Bridge bridge;
    private final AssetManager assets;
    private final Map<String, Boolean> exists = new ConcurrentHashMap<>();

    public StaticRoutesWebViewClient(Bridge bridge, AssetManager assets) {
        super(bridge);
        this.bridge = bridge;
        this.assets = assets;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri rewritten = routePage(request.getUrl());
        if (rewritten != null) {
            return super.shouldInterceptRequest(view, new RewrittenRequest(request, rewritten));
        }
        return super.shouldInterceptRequest(view, request);
    }

    /** The URL of the route's own index.html, or null when the request is for a file, another host or an unknown route. */
    Uri routePage(Uri url) {
        String path = url.getPath();
        String last = url.getLastPathSegment();
        if (path == null || path.equals("/") || last == null || last.contains(".")) return null;
        if (url.getHost() == null || !url.getHost().equalsIgnoreCase(bridge.getHost())) return null;
        String dir = path.endsWith("/") ? path : path + "/";
        if (!assetExists("public" + dir + "index.html")) return null;
        return url.buildUpon().path(dir + "index.html").build();
    }

    private boolean assetExists(String name) {
        return exists.computeIfAbsent(name, key -> {
            try (InputStream in = assets.open(key)) {
                return true;
            } catch (IOException e) {
                return false;
            }
        });
    }

    /** The original request with another URL. */
    private static final class RewrittenRequest implements WebResourceRequest {

        private final WebResourceRequest original;
        private final Uri url;

        RewrittenRequest(WebResourceRequest original, Uri url) {
            this.original = original;
            this.url = url;
        }

        @Override
        public Uri getUrl() {
            return url;
        }

        @Override
        public boolean isForMainFrame() {
            return original.isForMainFrame();
        }

        @Override
        public boolean isRedirect() {
            return original.isRedirect();
        }

        @Override
        public boolean hasGesture() {
            return original.hasGesture();
        }

        @Override
        public String getMethod() {
            return original.getMethod();
        }

        @Override
        public Map<String, String> getRequestHeaders() {
            return original.getRequestHeaders();
        }
    }
}
