package com.linus2002.serenity;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugins aren't found by `cap sync`, and must be in before the bridge starts.
        registerPlugin(BackgroundSoundPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
