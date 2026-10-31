package com.linus2002.serenity;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Lets the web layer say when a session or sound is under way, so the app can
 * stay alive with the screen off. See {@link BackgroundSoundService}.
 */
@CapacitorPlugin(name = "BackgroundSound")
public class BackgroundSoundPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        try {
            ContextCompat.startForegroundService(getContext(), serviceIntent());
            call.resolve();
        } catch (RuntimeException error) {
            // Android refuses this from the background. The app then simply has
            // no protection from being killed, as it had none before.
            call.reject("Could not start the background service", error);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(serviceIntent());
        call.resolve();
    }

    private Intent serviceIntent() {
        return new Intent(getContext(), BackgroundSoundService.class);
    }
}
