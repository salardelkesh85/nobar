package ir.nobar.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // serve /search/ as /search/index.html (the store is a static export with one page per route)
        bridge.setWebViewClient(new StaticRoutesWebViewClient(bridge, getAssets()));
    }
}
